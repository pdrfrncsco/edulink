from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserProfile
from apps.directory.models import AcademicUser, Enrollment
from apps.tenants.models import School


class MultiTenantAuthAndIsolationTests(TestCase):
    def setUp(self):
        self.school_a = School.objects.create(
            name='Colégio Alpha',
            nif='5400000001',
            alvara_med_mescti='Alvará 001',
            domain='alpha.edu.ao',
            contact_email='sec@alpha.edu.ao',
        )
        self.school_b = School.objects.create(
            name='Colégio Beta',
            nif='5400000002',
            alvara_med_mescti='Alvará 002',
            domain='beta.edu.ao',
            contact_email='sec@beta.edu.ao',
        )
        self.student_b = AcademicUser.objects.create(
            school=self.school_b,
            full_name='Maria Beta',
            role=AcademicUser.Role.STUDENT,
            institutional_email='maria.beta@beta.edu.ao',
            bi_or_student_id='00998877LA001',
        )
        Enrollment.objects.create(
            user=self.student_b,
            school=self.school_b,
            academic_year='2026/2027',
            grade_class='10ª Classe',
            status=Enrollment.Status.ACTIVE,
        )

    def test_unauthenticated_access_is_blocked_with_401(self):
        anon = APIClient()
        self.assertEqual(anon.get('/api/v1/tenants/schools/').status_code, 401)
        self.assertEqual(anon.get('/api/v1/directory/users/').status_code, 401)
        self.assertEqual(anon.post('/api/v1/passport/issue/', {'user_id': str(self.student_b.id)}).status_code, 401)
        # Endpoint público do site institucional continua acessível
        self.assertEqual(anon.get('/api/v1/tenants/by-domain/?domain=alpha.edu.ao').status_code, 200)

    def test_secretary_registration_onboarding_and_cross_tenant_isolation(self):
        client = APIClient()
        reg_res = client.post(
            '/api/v1/auth/register-secretary/',
            {
                'full_name': 'Ana Secretaria',
                'email': 'ana@gamma.edu.ao',
                'password': 'StrongPassword2026!',
            },
            format='json',
        )
        self.assertEqual(reg_res.status_code, 201)
        token = reg_res.json()['access']
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # Onboarding vincula a nova escola ao perfil da secretaria
        onboard_res = client.post(
            '/api/v1/tenants/onboard/',
            {
                'name': 'Colégio Gamma',
                'nif': '5400000003',
                'alvara_med_mescti': 'Alvará 003',
                'domain': 'gamma.edu.ao',
                'contact_email': 'dir@gamma.edu.ao',
            },
            format='json',
        )
        self.assertEqual(onboard_res.status_code, 201)
        gamma_id = onboard_res.json()['school_id']

        # Secretaria Gamma só vê a escola Gamma e nunca os alunos da escola Beta
        schools_res = client.get('/api/v1/tenants/schools/')
        self.assertEqual(schools_res.status_code, 200)
        self.assertEqual([s['id'] for s in schools_res.json()['results']], [gamma_id])

        users_res = client.get('/api/v1/directory/users/')
        self.assertEqual(users_res.status_code, 200)
        self.assertEqual(users_res.json()['count'], 0)

        # Tentativa explícita de aceder/emitir cartão de estudante da escola Beta -> 403
        cross_passport = client.post(
            '/api/v1/passport/issue/',
            {'user_id': str(self.student_b.id)},
            format='json',
        )
        self.assertEqual(cross_passport.status_code, 403)

        # Tentativa de sincronizar escola Beta -> 403
        cross_sync = client.post(f'/api/v1/provisioning/sync-school/{self.school_b.id}/')
        self.assertEqual(cross_sync.status_code, 403)

    def test_academic_activation_login_and_passport_isolation(self):
        client = APIClient()
        act_res = client.post(
            '/api/v1/auth/activate-academic/',
            {
                'institutional_email': 'maria.beta@beta.edu.ao',
                'bi_or_student_id': '00998877LA001',
                'password': 'StudentPass2026!',
            },
            format='json',
        )
        self.assertEqual(act_res.status_code, 201)
        access = act_res.json()['access']
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        me_res = client.get('/api/v1/auth/me/')
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()['role'], UserProfile.Role.STUDENT)
        self.assertEqual(me_res.json()['academic_user']['enrollment_status'], 'ACTIVE')

        # Estudante não pode aceder ao directório administrativo
        self.assertEqual(client.get('/api/v1/directory/users/').status_code, 403)

        # Estudante emite o próprio Passaporte JWT
        issue_res = client.post('/api/v1/passport/issue/', {}, format='json')
        self.assertEqual(issue_res.status_code, 200)
        jwt_token = issue_res.json()['token']

        # Verificação pública do QR Code
        anon = APIClient()
        verify_res = anon.get(f'/api/v1/passport/verify/?token={jwt_token}')
        self.assertEqual(verify_res.status_code, 200)
        self.assertTrue(verify_res.json()['is_valid'])
        self.assertEqual(verify_res.json()['student_info']['school_domain'], 'beta.edu.ao')

        # Quando a matrícula passa para SUSPENDED, o QR Code deixa de ser válido em tempo real
        Enrollment.objects.filter(user=self.student_b).update(status=Enrollment.Status.SUSPENDED)
        verify_suspended = anon.get(f'/api/v1/passport/verify/?token={jwt_token}')
        self.assertEqual(verify_suspended.status_code, 400)
        self.assertFalse(verify_suspended.json()['is_valid'])

    def test_keycloak_sso_metadata_and_sync_isolation(self):
        from types import SimpleNamespace
        from unittest.mock import patch
        from apps.accounts.services.keycloak_service import KeycloakAdminService

        sec_a = get_user_model().objects.create_user(username='sec_alpha_sso', password='Password123!')
        UserProfile.objects.create(user=sec_a, role=UserProfile.Role.SCHOOL_SECRETARY, school=self.school_a)

        client = APIClient()
        client.force_authenticate(user=sec_a)

        # Metadata SSO da própria escola Alpha
        meta_res = client.get(f'/api/v1/auth/sso-metadata/?school_id={self.school_a.id}')
        self.assertEqual(meta_res.status_code, 200)
        meta = meta_res.json()
        self.assertEqual(meta['school_domain'], 'alpha.edu.ao')
        self.assertIn('/realms/edulink/protocol/saml/descriptor', meta['saml_idp_metadata_url'])
        self.assertEqual(meta['canva_education_saml']['sp_entity_id'], 'https://www.canva.com')

        # Tentativa de ler metadados ou sincronizar escola Beta -> 403
        self.assertEqual(client.get(f'/api/v1/auth/sso-metadata/?school_id={self.school_b.id}').status_code, 403)
        self.assertEqual(client.post(f'/api/v1/auth/sync-keycloak/{self.school_b.id}/').status_code, 403)

        # Sync em modo sandbox para escola Alpha
        sync_res = client.post(f'/api/v1/auth/sync-keycloak/{self.school_a.id}/', {'sandbox': True}, format='json')
        self.assertEqual(sync_res.status_code, 200)
        self.assertTrue(sync_res.json()['sandbox'])

        # Teste unitário da Admin API real com mock HTTP
        with patch('apps.accounts.services.keycloak_service.requests.post') as mock_post, patch(
            'apps.accounts.services.keycloak_service.requests.request'
        ) as mock_req:
            mock_post.return_value = SimpleNamespace(status_code=200, json=lambda: {'access_token': 'kc-tok'})
            mock_req.side_effect = [
                SimpleNamespace(status_code=200, content=b'[]', json=lambda: []),
                SimpleNamespace(status_code=201, content=b'', headers={'Location': 'http://keycloak/users/kc-u-1'}),
                SimpleNamespace(status_code=200, content=b'[{}]', json=lambda: [{'id': 'kc-u-1'}]),
                SimpleNamespace(status_code=204, content=b'', headers={}),
                SimpleNamespace(status_code=204, content=b'', headers={}),
            ]
            kc = KeycloakAdminService(admin_password='secret')
            created = kc.sync_academic_user(self.student_b)
            self.assertEqual(created['status'], 'CREATED')
            self.assertEqual(created['keycloak_id'], 'kc-u-1')
            disabled = kc.disable_user(self.student_b.institutional_email)
            self.assertEqual(disabled['status'], 'DISABLED')
