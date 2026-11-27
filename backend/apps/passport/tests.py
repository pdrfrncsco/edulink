from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserProfile
from apps.directory.models import AcademicUser
from apps.domains.models import DomainConfiguration
from apps.passport.models import GlobalVerifierApplication
from apps.tenants.models import School


class GlobalVerifiersTests(TestCase):
    def setUp(self):
        self.school = School.objects.create(
            name='Instituto Superior Técnico de Angola',
            nif='5477778888',
            alvara_med_mescti='Decreto MESCTI 45/2025',
            domain='ista.edu.ao',
            contact_email='reitoria@ista.edu.ao',
            apd_notified=True,
            apd_dossier_number='APD-2026-ISTA',
        )
        DomainConfiguration.objects.create(
            school=self.school,
            registrar_status=DomainConfiguration.RegistrarStatus.ACTIVE,
        )
        AcademicUser.objects.create(
            school=self.school,
            full_name='Edson Mateus',
            role=AcademicUser.Role.STUDENT,
            institutional_email='edson.mateus@ista.edu.ao',
            bi_or_student_id='00554433LA01',
        )
        sec = get_user_model().objects.create_user(username='sec_ista', password='Password123!')
        UserProfile.objects.create(user=sec, role=UserProfile.Role.SCHOOL_SECRETARY, school=self.school)
        self.client = APIClient()
        self.client.force_authenticate(user=sec)

    def test_prepare_verifier_packet_and_public_institution_dossier(self):
        create_res = self.client.post(
            '/api/v1/passport/verifiers/',
            {'school': str(self.school.id), 'verifier': GlobalVerifierApplication.Verifier.GITHUB_EDUCATION},
            format='json',
        )
        self.assertEqual(create_res.status_code, 201)
        app_id = create_res.json()['id']

        prep_res = self.client.post(f'/api/v1/passport/verifiers/{app_id}/prepare-packet/')
        self.assertEqual(prep_res.status_code, 200)
        data = prep_res.json()
        self.assertEqual(data['status'], GlobalVerifierApplication.Status.DOSSIER_READY)
        self.assertTrue(data['readiness_snapshot']['ready_for_submission'])
        self.assertTrue(data['readiness_snapshot']['checks']['dns_active'])

        # Endpoint público consultado por SheerID / GitHub Education
        anon = APIClient()
        pub_res = anon.get('/api/v1/passport/institution-dossier/?domain=ista.edu.ao')
        self.assertEqual(pub_res.status_code, 200)
        self.assertEqual(pub_res.json()['email_domain_pattern'], '*@ista.edu.ao')
        self.assertEqual(pub_res.json()['active_students'], 1)


class Sprint2PassportVerifyBrandingDomainNullTests(TestCase):
    """Testes Sprint 2: verificação pública do Passaporte Digital com identidade visual, APD e domain=None."""

    def test_verify_passport_returns_school_branding_and_apd_metadata_for_demo_school(self):
        from apps.directory.models import AcademicUser
        from apps.passport.services.jwt_signer import generate_passport_token
        from apps.tenants.models import School

        school = School.objects.create(
            name='Colégio Esperança K12',
            nif='5407778889',
            alvara_med_mescti='Alvará 777/2026',
            domain=None,
            preview_slug='colegio-esperanca-sp2',
            institution_type=School.InstitutionType.MED_K12,
            primary_color='#0EA5E9',
            logo_url='https://cdn.edulink.ao/logos/esperanca.png',
            apd_notified=True,
            apd_dossier_number='APD-2026-0099',
            contact_email='sec@colegio-esperanca-sp2.edulink.ao',
            is_active=True,
        )
        student = AcademicUser.objects.create(
            school=school,
            full_name='João Pedro Manuel',
            role=AcademicUser.Role.STUDENT,
            institutional_email=f'joao.manuel@{school.effective_site_host}',
            bi_or_student_id='00778899LA042',
            is_active=True,
        )

        token = generate_passport_token(student)
        anon = APIClient()
        res = anon.get(f'/api/v1/passport/verify/?token={token}')
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body['is_valid'])
        info = body['student_info']
        self.assertEqual(info['school_primary_color'], '#0EA5E9')
        self.assertEqual(info['school_logo_url'], 'https://cdn.edulink.ao/logos/esperanca.png')
        self.assertEqual(info['institution_type'], School.InstitutionType.MED_K12)
        self.assertTrue(info['apd_notified'])
        self.assertEqual(info['apd_dossier_number'], 'APD-2026-0099')

