from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.domains.models import DNSRecord, DomainConfiguration
from apps.domains.services.blueprint import generate_dns_blueprint
from apps.domains.services.cloudflare_service import CloudflareDNSService, CloudflareError
from apps.domains.services.dns_checker import check_domain_propagation
from apps.domains.tasks import provision_school_dns_task
from apps.tenants.models import CloudIntegration, School


class DNSBlueprintTests(TestCase):
    def setUp(self):
        self.school = School.objects.create(
            name='Instituto Médio Politécnico de Luanda',
            nif='5412345699',
            alvara_med_mescti='Alvará MED 888/2025',
            domain='impl.edu.ao',
            contact_email='ti@impl.edu.ao',
        )
        self.config = DomainConfiguration.objects.create(
            school=self.school,
            google_verification_token='abc123verify',
            microsoft_verification_token='MS=ms998877',
            dkim_selector='google',
            dkim_public_key='MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg',
            target_web_ip_or_cname='sites.edulink.ao',
        )

    def test_dual_provider_blueprint_merges_spf_and_creates_all_records(self):
        records = generate_dns_blueprint(self.config, providers=['GOOGLE', 'MICROSOFT'])
        by_purpose = {r.purpose: r for r in records}

        self.assertIn(DNSRecord.Purpose.GOOGLE_VERIFY, by_purpose)
        self.assertEqual(by_purpose[DNSRecord.Purpose.GOOGLE_VERIFY].content, 'google-site-verification=abc123verify')
        self.assertEqual(by_purpose[DNSRecord.Purpose.MICROSOFT_VERIFY].content, 'MS=ms998877')

        # SPF único combinando Google e Microsoft (RFC 7208)
        spf_records = [r for r in records if r.purpose == DNSRecord.Purpose.SPF]
        self.assertEqual(len(spf_records), 1)
        self.assertIn('include:_spf.google.com', spf_records[0].content)
        self.assertIn('include:spf.protection.outlook.com', spf_records[0].content)

        self.assertEqual(by_purpose[DNSRecord.Purpose.MX_GOOGLE].content, 'smtp.google.com')
        self.assertEqual(by_purpose[DNSRecord.Purpose.MX_GOOGLE].priority, 1)
        self.assertEqual(by_purpose[DNSRecord.Purpose.MX_MICROSOFT].content, 'impl-edu-ao.mail.protection.outlook.com')
        self.assertEqual(by_purpose[DNSRecord.Purpose.MX_MICROSOFT].priority, 10)
        self.assertEqual(by_purpose[DNSRecord.Purpose.DKIM].name, 'google._domainkey')
        self.assertTrue(by_purpose[DNSRecord.Purpose.DMARC].content.startswith('v=DMARC1;'))

    def test_ipv4_web_target_creates_a_record(self):
        self.config.target_web_ip_or_cname = '197.149.10.20'
        self.config.save()
        records = generate_dns_blueprint(self.config, providers=['GOOGLE'])
        root_web = [r for r in records if r.purpose == DNSRecord.Purpose.WEB and r.name == '@'][0]
        self.assertEqual(root_web.record_type, DNSRecord.RecordType.A)
        self.assertEqual(root_web.content, '197.149.10.20')
        self.assertTrue(root_web.proxied)


class CloudflareServiceTests(TestCase):
    def setUp(self):
        self.school = School.objects.create(
            name='Colégio Camama',
            nif='5400001122',
            alvara_med_mescti='Alvará 901',
            domain='camama.edu.ao',
            contact_email='dir@camama.edu.ao',
        )
        self.config = DomainConfiguration.objects.create(
            school=self.school,
            cloudflare_account_id='acc-123',
            google_verification_token='google-site-verification=xyz999',
        )
        self.config.set_api_token('cf-real-token')
        self.config.save()
        generate_dns_blueprint(self.config, providers=['GOOGLE'])

    @patch('apps.domains.services.cloudflare_service.requests.request')
    def test_sync_creates_zone_and_upserts_without_txt_collision(self, mock_req):
        # 1. GET /zones (empty) -> 2. POST /zones -> 3. GET /dns_records (existing SPF only) -> 6x POST/PUT
        existing_spf = {
            'id': 'cf-existing-spf',
            'type': 'TXT',
            'name': 'camama.edu.ao',
            'content': 'v=spf1 include:_spf.google.com ~all',
        }
        responses = [
            SimpleNamespace(status_code=200, json=lambda: {'success': True, 'result': []}),
            SimpleNamespace(
                status_code=200,
                json=lambda: {
                    'success': True,
                    'result': {
                        'id': 'zone-abc',
                        'status': 'pending',
                        'name_servers': ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
                    },
                },
            ),
            SimpleNamespace(status_code=200, json=lambda: {'success': True, 'result': [existing_spf]}),
        ]
        # Respostas para os 6 registos gerados (2 WEB + GOOGLE_VERIFY + MX_GOOGLE + SPF + DMARC)
        for idx in range(6):
            responses.append(
                SimpleNamespace(status_code=200, json=lambda i=idx: {'success': True, 'result': {'id': f'rec-{i}'}})
            )
        mock_req.side_effect = responses

        service = CloudflareDNSService.for_domain_config(self.config)
        summary = service.sync_domain_configuration(self.config)

        self.assertEqual(summary['zone_id'], 'zone-abc')
        self.assertEqual(summary['synced_records'], 6)
        self.config.refresh_from_db()
        self.assertEqual(self.config.registrar_status, DomainConfiguration.RegistrarStatus.NAMESERVERS_DELEGATED)
        self.assertEqual(self.config.nameservers, ['ns1.cloudflare.com', 'ns2.cloudflare.com'])

        spf_record = self.config.records.get(purpose=DNSRecord.Purpose.SPF)
        verify_record = self.config.records.get(purpose=DNSRecord.Purpose.GOOGLE_VERIFY)
        # SPF foi atualizado (PUT) no registo existente, enquanto GOOGLE_VERIFY criou novo (POST)
        self.assertEqual(spf_record.sync_state, DNSRecord.SyncState.SYNCED)
        self.assertEqual(verify_record.sync_state, DNSRecord.SyncState.SYNCED)
        self.assertNotEqual(spf_record.cloudflare_record_id, verify_record.cloudflare_record_id)

    @patch('apps.domains.services.cloudflare_service.requests.request')
    def test_rate_limit_429_raises_retryable_error(self, mock_req):
        mock_req.return_value = SimpleNamespace(status_code=429, text='Rate limited')
        service = CloudflareDNSService.for_domain_config(self.config)
        with self.assertRaises(CloudflareError) as ctx:
            service.ensure_zone('camama.edu.ao')
        self.assertTrue(ctx.exception.retryable)


class DomainsAPITests(TestCase):
    def setUp(self):
        self.school = School.objects.create(
            name='Colégio Kilamba',
            nif='5411223344',
            alvara_med_mescti='Alvará 777/MED',
            domain='kilamba.edu.ao',
            contact_email='secretaria@kilamba.edu.ao',
        )
        CloudIntegration.objects.create(
            school=self.school,
            provider=CloudIntegration.Provider.GOOGLE,
            encrypted_credentials='sandbox',
            sync_enabled=True,
        )

    @patch('apps.domains.services.dns_checker.query_doh')
    def test_api_blueprint_sandbox_sync_propagation_and_dossier(self, mock_doh):
        from django.contrib.auth import get_user_model
        from apps.accounts.models import UserProfile

        sec = get_user_model().objects.create_user(username='sec_dom', password='Password123!')
        UserProfile.objects.create(user=sec, role=UserProfile.Role.SCHOOL_SECRETARY, school=self.school)

        client = APIClient()
        client.force_authenticate(user=sec)
        create_res = client.post(
            '/api/v1/domains/configs/',
            {
                'school': str(self.school.id),
                'google_verification_token': 'google-site-verification=kilamba-verify',
            },
            format='json',
        )
        self.assertEqual(create_res.status_code, 201)
        config_id = create_res.json()['id']

        bp_res = client.post(f'/api/v1/domains/configs/{config_id}/generate-blueprint/')
        self.assertEqual(bp_res.status_code, 200)
        self.assertGreaterEqual(bp_res.json()['records_count'], 6)

        sync_res = client.post(f'/api/v1/domains/configs/{config_id}/sync-cloudflare/')
        self.assertEqual(sync_res.status_code, 200)
        self.assertTrue(sync_res.json()['ok'])
        self.assertTrue(sync_res.json()['sandbox'])

        # Simula propagação pública DoH completa
        def doh_side_effect(fqdn, rtype):
            if rtype == 'NS':
                return ['arya.ns.cloudflare.com.', 'zeus.ns.cloudflare.com.']
            if rtype in ('A', 'CNAME'):
                return ['104.21.10.10']
            if rtype == 'MX':
                return ['1 smtp.google.com.']
            if rtype == 'TXT' and fqdn == 'kilamba.edu.ao':
                return ['google-site-verification=kilamba-verify', 'v=spf1 include:_spf.google.com ~all']
            if rtype == 'TXT' and fqdn == '_dmarc.kilamba.edu.ao':
                return ['v=DMARC1; p=quarantine; rua=mailto:dmarc@kilamba.edu.ao; pct=100; adkim=r; aspf=r']
            return []

        mock_doh.side_effect = doh_side_effect
        prop_res = client.post(f'/api/v1/domains/configs/{config_id}/verify-propagation/')
        self.assertEqual(prop_res.status_code, 200)
        self.assertTrue(prop_res.json()['ns_delegated'])
        self.assertTrue(prop_res.json()['all_records_propagated'])
        self.assertEqual(prop_res.json()['registrar_status'], DomainConfiguration.RegistrarStatus.ACTIVE)

        dossier_res = client.get(f'/api/v1/domains/configs/{config_id}/dns-ao-dossier/')
        self.assertEqual(dossier_res.status_code, 200)
        self.assertEqual(dossier_res.json()['domain'], 'kilamba.edu.ao')
        self.assertEqual(len(dossier_res.json()['nameservers_to_configure']), 2)

    def test_celery_task_provisions_dns_in_sandbox(self):
        config = DomainConfiguration.objects.create(school=self.school)
        result = provision_school_dns_task(str(config.id))
        self.assertTrue(result['sandbox'])
        self.assertGreaterEqual(result['synced_records'], 5)
