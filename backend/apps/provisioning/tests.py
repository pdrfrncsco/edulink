from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import TestCase
from googleapiclient.errors import HttpError
from rest_framework.test import APIClient

from apps.directory.models import AcademicUser, Enrollment
from apps.provisioning.models import ProvisioningLog
from apps.provisioning.services.base import (
    ProvisioningError,
    generate_temporary_password,
    split_full_name,
)
from apps.provisioning.services.google_service import GoogleWorkspaceProvisioner
from apps.provisioning.services.microsoft_service import Microsoft365Provisioner
from apps.provisioning.tasks import revoke_user_cloud_access_task, sync_user_to_cloud_task
from apps.tenants.models import CloudIntegration, School


def make_google_http_error(status_code: int, message: str = 'Google API Error') -> HttpError:
    resp = SimpleNamespace(status=status_code, reason=message)
    return HttpError(resp=resp, content=message.encode('utf-8'))


class ProvisioningHelpersTests(TestCase):
    def test_split_full_name_handles_single_and_multi_part_names(self):
        self.assertEqual(split_full_name('Manuel Domingos de Sousa'), ('Manuel', 'Domingos de Sousa'))
        self.assertEqual(split_full_name('Esperança'), ('Esperança', 'EduLink'))

    def test_generate_temporary_password_meets_complexity(self):
        pwd = generate_temporary_password(16)
        self.assertEqual(len(pwd), 16)
        self.assertTrue(any(c.isupper() for c in pwd))
        self.assertTrue(any(c.islower() for c in pwd))
        self.assertTrue(any(c.isdigit() for c in pwd))


class GoogleWorkspaceProvisionerTests(TestCase):
    def setUp(self):
        self.sa_info = {
            'type': 'service_account',
            'client_email': 'edulink@project.iam.gserviceaccount.com',
            'private_key': '-----BEGIN PRIVATE KEY-----\nFAKE\n-----END PRIVATE KEY-----\n',
            'token_uri': 'https://oauth2.googleapis.com/token',
        }
        self.provisioner = GoogleWorkspaceProvisioner(
            service_account_info=self.sa_info,
            admin_email='admin@colegio.edu.ao',
        )

    @patch('apps.provisioning.services.google_service.build')
    @patch('apps.provisioning.services.google_service.service_account.Credentials.from_service_account_info')
    def test_provision_creates_org_unit_and_user_when_missing(self, mock_creds, mock_build):
        mock_service = MagicMock()
        mock_build.return_value = mock_service

        mock_service.orgunits().get().execute.side_effect = make_google_http_error(404)
        mock_service.users().get().execute.side_effect = make_google_http_error(404)
        mock_service.users().insert().execute.return_value = {
            'id': 'google-uid-123',
            'primaryEmail': 'manuel.sousa@colegio.edu.ao',
        }

        result = self.provisioner.provision_user(
            full_name='Manuel Sousa',
            institutional_email='manuel.sousa@colegio.edu.ao',
            org_unit='/Alunos',
        )

        self.assertEqual(result['status'], 'PROVISIONED')
        self.assertEqual(result['external_id'], 'google-uid-123')
        self.assertFalse(result['sandbox'])
        mock_service.orgunits().insert.assert_called()
        mock_service.users().insert.assert_called()

    @patch('apps.provisioning.services.google_service.build')
    @patch('apps.provisioning.services.google_service.service_account.Credentials.from_service_account_info')
    def test_suspend_user_sets_suspended_true(self, mock_creds, mock_build):
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.users().update().execute.return_value = {
            'id': 'google-uid-123',
            'primaryEmail': 'manuel.sousa@colegio.edu.ao',
            'suspended': True,
        }

        result = self.provisioner.suspend_user('manuel.sousa@colegio.edu.ao', external_id='google-uid-123')
        self.assertEqual(result['status'], 'SUSPENDED')
        mock_service.users().update.assert_called_with(
            userKey='google-uid-123',
            body={'suspended': True},
        )

    @patch('apps.provisioning.services.google_service.build')
    @patch('apps.provisioning.services.google_service.service_account.Credentials.from_service_account_info')
    def test_rate_limit_429_marks_retryable(self, mock_creds, mock_build):
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.users().list().execute.side_effect = make_google_http_error(429, 'Quota exceeded')

        with self.assertRaises(ProvisioningError) as ctx:
            self.provisioner.verify_connection('colegio.edu.ao')
        self.assertTrue(ctx.exception.retryable)
        self.assertEqual(ctx.exception.status_code, 429)


class Microsoft365ProvisionerTests(TestCase):
    def setUp(self):
        self.provisioner = Microsoft365Provisioner(
            tenant_id='tenant-guid',
            client_id='client-guid',
            client_secret='secret-val',
        )

    @patch('apps.provisioning.services.microsoft_service.requests.request')
    @patch('apps.provisioning.services.microsoft_service.requests.post')
    def test_provision_creates_user_and_assigns_student_sku(self, mock_post, mock_request):
        mock_post.return_value = SimpleNamespace(
            status_code=200,
            json=lambda: {'access_token': 'ms-token', 'expires_in': 3600},
        )

        # Sequence: GET /users/{email} (404) -> POST /users (201) -> GET /subscribedSkus (200) -> POST /assignLicense (200)
        mock_request.side_effect = [
            SimpleNamespace(status_code=404, content=b'', text='Not Found'),
            SimpleNamespace(
                status_code=201,
                content=b'{}',
                json=lambda: {'id': 'ms-obj-999', 'userPrincipalName': 'ana.luis@colegio.edu.ao'},
            ),
            SimpleNamespace(
                status_code=200,
                content=b'{}',
                json=lambda: {'value': [{'skuPartNumber': 'STANDARDWOFFPACK_STUDENT', 'skuId': 'sku-a1-student'}]},
            ),
            SimpleNamespace(status_code=200, content=b'{}', json=lambda: {'id': 'ms-obj-999'}),
        ]

        result = self.provisioner.provision_user(
            full_name='Ana Luís',
            institutional_email='ana.luis@colegio.edu.ao',
            is_faculty=False,
        )

        self.assertEqual(result['status'], 'PROVISIONED')
        self.assertEqual(result['external_id'], 'ms-obj-999')
        self.assertEqual(result['sku'], 'sku-a1-student')

    @patch('apps.provisioning.services.microsoft_service.requests.request')
    @patch('apps.provisioning.services.microsoft_service.requests.post')
    def test_suspend_disables_account_and_revokes_sessions(self, mock_post, mock_request):
        mock_post.return_value = SimpleNamespace(
            status_code=200,
            json=lambda: {'access_token': 'ms-token', 'expires_in': 3600},
        )
        mock_request.side_effect = [
            SimpleNamespace(
                status_code=200,
                content=b'{}',
                json=lambda: {'id': 'ms-obj-999', 'userPrincipalName': 'ana.luis@colegio.edu.ao'},
            ),
            SimpleNamespace(status_code=204, content=b''),
            SimpleNamespace(status_code=204, content=b''),
        ]

        result = self.provisioner.suspend_user('ana.luis@colegio.edu.ao', external_id='ms-obj-999')
        self.assertEqual(result['status'], 'SUSPENDED')
        self.assertEqual(mock_request.call_count, 3)


class ProvisioningWorkflowAndSignalsTests(TestCase):
    def setUp(self):
        self.school = School.objects.create(
            name='Colégio Esperança',
            nif='5412345678',
            alvara_med_mescti='Alvará 123',
            domain='esperanca.edu.ao',
            contact_email='dir@esperanca.edu.ao',
        )
        self.google_int = CloudIntegration(school=self.school, provider=CloudIntegration.Provider.GOOGLE)
        self.google_int.set_credentials({'sandbox': True})
        self.google_int.save()

        self.ms_int = CloudIntegration(school=self.school, provider=CloudIntegration.Provider.MICROSOFT)
        self.ms_int.set_credentials({'sandbox': True})
        self.ms_int.save()

        self.user = AcademicUser.objects.create(
            school=self.school,
            full_name='João Sebastião',
            role=AcademicUser.Role.STUDENT,
            institutional_email='joao.sebastiao@esperanca.edu.ao',
            bi_or_student_id='001234LA01',
        )

    def test_sync_and_revoke_tasks_with_encrypted_sandbox_integrations(self):
        ok = sync_user_to_cloud_task(str(self.user.id), str(self.school.id))
        self.assertTrue(ok)
        self.user.refresh_from_db()
        self.assertTrue(self.user.external_google_id.startswith('gsuite-sandbox-'))
        self.assertTrue(self.user.external_ms_id.startswith('ms-sandbox-'))
        self.assertEqual(ProvisioningLog.objects.filter(school=self.school, action='PROVISION').count(), 2)

        revoked = revoke_user_cloud_access_task(str(self.user.id), str(self.school.id), reason='Propina')
        self.assertTrue(revoked)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertEqual(ProvisioningLog.objects.filter(school=self.school, action='SUSPEND').count(), 2)

    @patch('apps.provisioning.tasks.sync_user_to_cloud_task.delay')
    @patch('apps.provisioning.tasks.revoke_user_cloud_access_task.delay')
    def test_enrollment_signals_trigger_revoke_and_reactivate(self, mock_revoke_delay, mock_sync_delay):
        enrollment = Enrollment.objects.create(
            user=self.user,
            school=self.school,
            academic_year='2026/2027',
            grade_class='10ª Classe',
            status=Enrollment.Status.ACTIVE,
        )
        mock_revoke_delay.assert_not_called()

        enrollment.status = Enrollment.Status.SUSPENDED
        enrollment.save()
        mock_revoke_delay.assert_called_once()

        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        enrollment.status = Enrollment.Status.ACTIVE
        enrollment.save()
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
        mock_sync_delay.assert_called_once()

    def test_test_connection_and_logs_endpoints(self):
        from django.contrib.auth import get_user_model
        from apps.accounts.models import UserProfile

        sec = get_user_model().objects.create_user(username='sec_prov', password='Password123!')
        UserProfile.objects.create(user=sec, role=UserProfile.Role.SCHOOL_SECRETARY, school=self.school)

        client = APIClient()
        client.force_authenticate(user=sec)
        res = client.post(f'/api/v1/provisioning/test-connection/{self.google_int.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['ok'])

        logs_res = client.get(f'/api/v1/provisioning/logs/?school={self.school.id}')
        self.assertEqual(logs_res.status_code, 200)
        self.assertEqual(logs_res.json()['count'], 1)
