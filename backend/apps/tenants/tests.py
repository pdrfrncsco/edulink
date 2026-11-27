from django.test import TestCase
from rest_framework.test import APIClient

from apps.tenants.models import School


class TLSDomainCheckTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.active_school = School.objects.create(
            name='Colégio Ativo',
            nif='5411111111',
            alvara_med_mescti='Alvará 101',
            domain='ativo.edu.ao',
            contact_email='dir@ativo.edu.ao',
            is_active=True,
        )
        self.inactive_school = School.objects.create(
            name='Colégio Inativo',
            nif='5422222222',
            alvara_med_mescti='Alvará 102',
            domain='inativo.edu.ao',
            contact_email='dir@inativo.edu.ao',
            is_active=False,
        )

    def test_tls_check_allows_active_school_www_and_platform_domains(self):
        self.assertEqual(self.client.get('/api/v1/tenants/tls-check/?domain=ativo.edu.ao').status_code, 200)
        self.assertEqual(self.client.get('/api/v1/tenants/tls-check/?domain=www.ativo.edu.ao').status_code, 200)
        self.assertEqual(self.client.get('/api/v1/tenants/tls-check/?domain=portal.edulink.ao').status_code, 200)

    def test_tls_check_blocks_inactive_unknown_and_empty_domains(self):
        self.assertEqual(self.client.get('/api/v1/tenants/tls-check/?domain=inativo.edu.ao').status_code, 403)
        self.assertEqual(self.client.get('/api/v1/tenants/tls-check/?domain=invasor.com').status_code, 403)
        self.assertEqual(self.client.get('/api/v1/tenants/tls-check/').status_code, 403)
        # Bare slug sem domínio completo continua bloqueado no endpoint de TLS do Caddy
        self.assertEqual(
            self.client.get(f'/api/v1/tenants/tls-check/?domain={self.active_school.preview_slug}').status_code,
            403,
        )

    def test_public_by_domain_resolves_preview_slug_localhost_and_bare_slug(self):
        slug = self.active_school.preview_slug
        for candidate in (
            'ativo.edu.ao',
            f'{slug}.edulink.ao',
            f'{slug}.localhost',
            slug,
        ):
            res = self.client.get(f'/api/v1/tenants/by-domain/?domain={candidate}')
            self.assertEqual(res.status_code, 200, msg=f'Falhou para {candidate}')
            self.assertEqual(res.json()['id'], str(self.active_school.id))


class Sprint2OnboardingPipelineDomainNullTests(TestCase):
    """Testes Sprint 2: revisão documental, feature flags, pipeline, CSV/DNS sem domínio oficial."""

    def setUp(self):
        import shutil
        import tempfile
        from django.contrib.auth import get_user_model
        from apps.accounts.models import UserProfile

        self._media_tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self._media_tmp, True)

        self.school = School.objects.create(
            name='Colégio Demo Piloto',
            nif='5409988776',
            alvara_med_mescti='Alvará 900/2026',
            domain=None,
            preview_slug='colegio-demo-piloto',
            contact_email='sec@colegio-demo-piloto.edulink.ao',
            is_active=True,
        )

        User = get_user_model()
        self.secretary = User.objects.create_user(username='sec_demo_sp2', password='Password123!')
        UserProfile.objects.create(
            user=self.secretary,
            role=UserProfile.Role.SCHOOL_SECRETARY,
            school=self.school,
        )
        self.platform_admin = User.objects.create_user(username='ops_admin_sp2', password='Password123!')
        UserProfile.objects.create(
            user=self.platform_admin,
            role=UserProfile.Role.PLATFORM_ADMIN,
        )

    def test_document_upload_review_rbac_pipeline_and_flags(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.test import override_settings
        from rest_framework.test import APIClient
        from apps.tenants.models import OnboardingDocument

        sec_client = APIClient()
        sec_client.force_authenticate(user=self.secretary)
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.platform_admin)

        with override_settings(MEDIA_ROOT=self._media_tmp):
            pdf = SimpleUploadedFile(
                'alvara.pdf',
                b'%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF',
                content_type='application/pdf',
            )
            up_res = sec_client.post(
                f'/api/v1/tenants/{self.school.id}/documents/',
                {'doc_type': OnboardingDocument.DocumentType.ALVARA_MED_MESCTI, 'file': pdf},
                format='multipart',
            )
        self.assertEqual(up_res.status_code, 201)
        doc_id = up_res.json()['id']

        # Secretaria não pode aprovar o próprio documento (403)
        self.assertEqual(
            sec_client.post(
                f'/api/v1/tenants/{self.school.id}/documents/{doc_id}/review/',
                {'status': OnboardingDocument.ReviewStatus.APPROVED},
                format='json',
            ).status_code,
            403,
        )

        # Secretaria não pode ativar flags nem alterar estados de pipeline manualmente
        sec_patch = sec_client.patch(
            f'/api/v1/tenants/schools/{self.school.id}/',
            {
                'enable_erp_sync': True,
                'dns_status': School.SetupStage.APPROVED,
                'phone': '+244923000111',
            },
            format='json',
        )
        self.assertEqual(sec_patch.status_code, 200)
        self.school.refresh_from_db()
        self.assertFalse(self.school.enable_erp_sync)
        self.assertEqual(self.school.dns_status, School.SetupStage.PENDING_DOCS)
        self.assertEqual(self.school.phone, '+244923000111')

        # PLATFORM_ADMIN pode rejeitar, aprovar e controlar flags/pipeline/domínio
        rej_res = admin_client.post(
            f'/api/v1/tenants/{self.school.id}/documents/{doc_id}/review/',
            {'status': OnboardingDocument.ReviewStatus.REJECTED, 'review_notes': 'Documento ilegível.'},
            format='json',
        )
        self.assertEqual(rej_res.status_code, 200)
        self.assertEqual(rej_res.json()['status'], OnboardingDocument.ReviewStatus.REJECTED)

        app_res = admin_client.post(
            f'/api/v1/tenants/{self.school.id}/documents/{doc_id}/review/',
            {'status': OnboardingDocument.ReviewStatus.APPROVED, 'review_notes': 'Validado com sucesso.'},
            format='json',
        )
        self.assertEqual(app_res.status_code, 200)
        self.assertEqual(app_res.json()['status'], OnboardingDocument.ReviewStatus.APPROVED)

        ops_patch = admin_client.patch(
            f'/api/v1/tenants/schools/{self.school.id}/',
            {
                'domain': 'demo-oficial.edu.ao',
                'dns_status': School.SetupStage.APPROVED,
                'google_status': School.SetupStage.SUBMITTED,
                'enable_erp_sync': True,
                'enable_benefits_club': True,
                'enable_online_payments': True,
            },
            format='json',
        )
        self.assertEqual(ops_patch.status_code, 200)
        self.school.refresh_from_db()
        self.assertEqual(self.school.domain, 'demo-oficial.edu.ao')
        self.assertEqual(self.school.dns_status, School.SetupStage.APPROVED)
        self.assertEqual(self.school.google_status, School.SetupStage.SUBMITTED)
        self.assertTrue(self.school.enable_erp_sync)
        self.assertTrue(self.school.enable_benefits_club)
        self.assertTrue(self.school.enable_online_payments)

    def test_csv_importer_and_dns_blueprint_handle_domain_null(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from rest_framework.test import APIClient
        from apps.directory.models import AcademicUser
        from apps.domains.models import DomainConfiguration

        csv_content = (
            'nome_completo;bi_ou_processo;tipo;classe_turma;ano_lectivo\n'
            'Ana Maria Sousa;00998877LA041;ALUNO;10ª A;2026/2027\n'
        ).encode('utf-8')
        upload = SimpleUploadedFile('turma_demo.csv', csv_content, content_type='text/csv')
        sec_client = APIClient()
        sec_client.force_authenticate(user=self.secretary)
        res = sec_client.post(
            '/api/v1/directory/upload-csv/',
            {'school_id': str(self.school.id), 'file': upload, 'academic_year': '2026/2027'},
            format='multipart',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['stats']['created_users'], 1)
        student = AcademicUser.objects.get(school=self.school, bi_or_student_id='00998877LA041')
        self.assertFalse(student.institutional_email.endswith('@None'))
        self.assertTrue(student.institutional_email.endswith(f'@{self.school.effective_site_host}'))

        # Domínios sem domain oficial devolvem 400 claro ao gerar blueprint DNS
        config = DomainConfiguration.objects.create(school=self.school)
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.platform_admin)
        bp_res = admin_client.post(f'/api/v1/domains/configs/{config.id}/generate-blueprint/')
        self.assertEqual(bp_res.status_code, 400)

