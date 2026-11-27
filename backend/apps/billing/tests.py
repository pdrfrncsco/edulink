from decimal import Decimal
import hashlib
import hmac
import json

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import UserProfile
from apps.benefits.models import BenefitOffer, BenefitPartner
from apps.billing.models import AGTInvoice, KwanzaPayment, SchoolSubscription
from apps.directory.models import AcademicUser
from apps.tenants.models import School


def sign_kwanza_webhook(body_bytes: bytes) -> str:
    secret = getattr(settings, 'KWANZA_GATEWAY_WEBHOOK_SECRET', 'edulink-kwanza-dev-secret')
    digest = hmac.new(secret.encode('utf-8'), body_bytes, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


@override_settings(KWANZA_SANDBOX_ENABLED=True)
class BillingKwanzasAndAGTTests(TestCase):
    def setUp(self):
        self.school_a = School.objects.create(
            name='Colégio Luanda Sul',
            nif='5401001122',
            alvara_med_mescti='Alvará 101/2026',
            domain='luandasul.edu.ao',
            contact_email='sec@luandasul.edu.ao',
        )
        self.school_b = School.objects.create(
            name='Escola <script>alert(1)</script> Huambo',
            nif='5402003344',
            alvara_med_mescti='Alvará 202/2026',
            domain='huambo.edu.ao',
            contact_email='sec@huambo.edu.ao',
        )
        self.sec_a = get_user_model().objects.create_user(username='sec_ls', password='Password123!')
        UserProfile.objects.create(user=self.sec_a, role=UserProfile.Role.SCHOOL_SECRETARY, school=self.school_a)

        self.sec_b = get_user_model().objects.create_user(username='sec_hb', password='Password123!')
        UserProfile.objects.create(user=self.sec_b, role=UserProfile.Role.SCHOOL_SECRETARY, school=self.school_b)

        self.platform_admin = get_user_model().objects.create_user(username='ops_admin', password='Password123!')
        UserProfile.objects.create(user=self.platform_admin, role=UserProfile.Role.PLATFORM_ADMIN)

        self.student_user = get_user_model().objects.create_user(username='aluno_ls', password='Password123!')
        self.academic_student = AcademicUser.objects.create(
            school=self.school_a,
            full_name='Kialanda Neto',
            role=AcademicUser.Role.STUDENT,
            institutional_email='kialanda.neto@luandasul.edu.ao',
            bi_or_student_id='00445566LA041',
        )
        UserProfile.objects.create(
            user=self.student_user,
            role=UserProfile.Role.STUDENT,
            school=self.school_a,
            academic_user=self.academic_student,
        )

    def test_subscription_kwanza_webhook_and_agt_chained_invoicing(self):
        client_a = APIClient()
        client_a.force_authenticate(user=self.sec_a)

        # 1. Criar subscrição Pro (480.000 Kz)
        sub_res = client_a.post(
            '/api/v1/billing/subscriptions/',
            {'school': str(self.school_a.id), 'plan_code': 'PRO'},
            format='json',
        )
        self.assertEqual(sub_res.status_code, 201)
        sub_id = sub_res.json()['id']
        self.assertEqual(Decimal(sub_res.json()['annual_price_aoa']), Decimal('480000.00'))

        # 2. Iniciar pagamento Multicaixa Express
        pay_res = client_a.post(
            '/api/v1/billing/payments/',
            {
                'subscription': sub_id,
                'payment_method': 'MULTICAIXA_EXPRESS',
                'customer_phone': '+244923112233',
            },
            format='json',
        )
        self.assertEqual(pay_res.status_code, 201)
        pay_data = pay_res.json()
        self.assertTrue(pay_data['reference'].startswith('MCX-'))
        self.assertEqual(pay_data['status'], 'PENDING')

        # 3. Webhook sem assinatura válida -> 401
        anon = APIClient()
        webhook_payload = json.dumps({
            'reference': pay_data['reference'],
            'status': 'CONFIRMED',
            'transaction_id': 'MCX-TX-998877',
        }).encode('utf-8')
        bad_wh = anon.post(
            '/api/v1/billing/webhooks/kwanza/',
            data=webhook_payload,
            content_type='application/json',
            HTTP_X_KWANZA_SIGNATURE='sha256=fake',
        )
        self.assertEqual(bad_wh.status_code, 401)

        # 4. Webhook assinado -> ativa subscrição e emite 1ª Fatura AGT
        ok_wh = anon.post(
            '/api/v1/billing/webhooks/kwanza/',
            data=webhook_payload,
            content_type='application/json',
            HTTP_X_KWANZA_SIGNATURE=sign_kwanza_webhook(webhook_payload),
        )
        self.assertEqual(ok_wh.status_code, 200)
        self.assertEqual(ok_wh.json()['invoice_number'], 'FT EL2026/00001')

        sub = SchoolSubscription.objects.get(id=sub_id)
        self.assertEqual(sub.status, SchoolSubscription.Status.ACTIVE)

        inv1 = AGTInvoice.objects.get(sequence_number=1)
        self.assertEqual(inv1.previous_hash, '')
        self.assertEqual(inv1.subtotal_aoa + inv1.iva_amount_aoa, Decimal('480000.00'))
        self.assertIn('G:FT EL2026/00001', inv1.qr_payload)

        # 5. Segunda escola gera pagamento KWiK; Secretaria NÃO pode auto-confirmar sandbox nem alterar subscrição (403)
        client_b = APIClient()
        client_b.force_authenticate(user=self.sec_b)
        sub_b_res = client_b.post(
            '/api/v1/billing/subscriptions/',
            {'school': str(self.school_b.id), 'plan_code': 'ESSENCIAL'},
            format='json',
        )
        sub_b_id = sub_b_res.json()['id']
        self.assertEqual(
            client_b.patch(f"/api/v1/billing/subscriptions/{sub_b_id}/", {'plan_code': 'CAMPUS'}, format='json').status_code,
            403,
        )

        pay_b_res = client_b.post(
            '/api/v1/billing/payments/',
            {'subscription': sub_b_id, 'payment_method': 'KWIK'},
            format='json',
        )
        self.assertEqual(pay_b_res.status_code, 201)
        pay_b_id = pay_b_res.json()['id']
        self.assertEqual(
            client_b.post(f"/api/v1/billing/payments/{pay_b_id}/sandbox-confirm/").status_code,
            403,
        )

        # Admin da Plataforma confirma manualmente / sandbox -> hash encadeado + XSS escape + isolamento
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.platform_admin)
        confirm_b = admin_client.post(f"/api/v1/billing/payments/{pay_b_id}/sandbox-confirm/")
        self.assertEqual(confirm_b.status_code, 200)

        inv2 = AGTInvoice.objects.get(sequence_number=2)
        self.assertEqual(inv2.invoice_number, 'FT EL2026/00002')
        self.assertEqual(inv2.previous_hash, inv1.agt_hash)

        # Escola A não acede à fatura da Escola B (404 pelo TenantScopedMixin)
        cross_res = client_a.get(f"/api/v1/billing/invoices/{inv2.id}/")
        self.assertEqual(cross_res.status_code, 404)

        # HTML imprimível escapa tags <script> no nome da escola
        html_res = client_b.get(f"/api/v1/billing/invoices/{inv2.id}/html/")
        self.assertEqual(html_res.status_code, 200)
        html_body = html_res.content.decode('utf-8')
        self.assertNotIn('<script>alert(1)</script>', html_body)
        self.assertIn('&lt;script&gt;alert(1)&lt;/script&gt;', html_body)

    def test_student_can_initiate_kwik_for_paid_benefit_but_cannot_sandbox_confirm(self):
        partner = BenefitPartner.objects.create(
            name='Unitel Educação',
            category=BenefitPartner.Category.TELECOM,
            discount_label='50% Bónus Dados',
        )
        offer = BenefitOffer.objects.create(
            partner=partner,
            title='Pacote Estudante 10GB',
            price_aoa=Decimal('2500.00'),
        )
        student_client = APIClient()
        student_client.force_authenticate(user=self.student_user)

        pay_res = student_client.post(
            '/api/v1/billing/payments/',
            {'benefit_offer': str(offer.id), 'payment_method': 'KWIK', 'customer_phone': '+244924000111'},
            format='json',
        )
        self.assertEqual(pay_res.status_code, 201)
        payment_id = pay_res.json()['id']
        self.assertEqual(KwanzaPayment.objects.get(id=payment_id).amount_aoa, Decimal('2500.00'))

        # Estudante não pode auto-confirmar pagamento em sandbox -> 403
        self.assertEqual(
            student_client.post(f"/api/v1/billing/payments/{payment_id}/sandbox-confirm/").status_code,
            403,
        )

    def test_saft_export_restricted_to_platform_admin_and_returns_valid_ao_version(self):
        client_a = APIClient()
        client_a.force_authenticate(user=self.sec_a)
        sub_res = client_a.post(
            '/api/v1/billing/subscriptions/',
            {'school': str(self.school_a.id), 'plan_code': 'ESSENCIAL'},
            format='json',
        )
        pay_res = client_a.post(
            '/api/v1/billing/payments/',
            {'subscription': sub_res.json()['id'], 'payment_method': 'KWIK'},
            format='json',
        )
        pay_id = pay_res.json()['id']

        # Secretaria não pode exportar SAF-T global -> 403
        self.assertEqual(client_a.get('/api/v1/billing/invoices/saft-export/').status_code, 403)

        admin_client = APIClient()
        admin_client.force_authenticate(user=self.platform_admin)
        self.assertEqual(
            admin_client.post(f'/api/v1/billing/payments/{pay_id}/sandbox-confirm/').status_code,
            200,
        )

        json_res = admin_client.get(f'/api/v1/billing/invoices/saft-export/?school={self.school_a.id}')
        self.assertEqual(json_res.status_code, 200)
        data = json_res.json()
        self.assertEqual(data['AuditFileVersion'], '1.01_01')
        self.assertEqual(data['Country'], 'AO')
        self.assertEqual(data['CurrencyCode'], 'AOA')
        self.assertEqual(data['NumberOfEntries'], 1)

        xml_res = admin_client.get(
            f'/api/v1/billing/invoices/saft-export/?export_format=xml&school={self.school_a.id}'
        )
        self.assertEqual(xml_res.status_code, 200)
        xml_body = xml_res.content.decode('utf-8')
        self.assertIn('<AuditFileVersion>1.01_01</AuditFileVersion>', xml_body)

