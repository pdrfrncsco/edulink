import hashlib
import hmac
import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserProfile
from apps.directory.models import AcademicUser, Enrollment
from apps.erp_sync.models import ERPConnection, ERPSyncEvent
from apps.tenants.models import School


def sign_payload(secret: str, body_bytes: bytes) -> str:
    digest = hmac.new(secret.encode('utf-8'), body_bytes, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


class ERPSyncTests(TestCase):
    def setUp(self):
        self.school_a = School.objects.create(
            name='Colégio Talatona',
            nif='5499991111',
            alvara_med_mescti='Alvará 2026',
            domain='talatona.edu.ao',
            contact_email='sec@talatona.edu.ao',
        )
        self.school_b = School.objects.create(
            name='Colégio Benguela',
            nif='5499992222',
            alvara_med_mescti='Alvará 2027',
            domain='benguela.edu.ao',
            contact_email='sec@benguela.edu.ao',
        )
        self.sec_a = get_user_model().objects.create_user(username='sec_tala', password='Password123!')
        UserProfile.objects.create(user=self.sec_a, role=UserProfile.Role.SCHOOL_SECRETARY, school=self.school_a)

        self.conn_klasse = ERPConnection.objects.create(
            school=self.school_a,
            provider=ERPConnection.Provider.KLASSE,
        )
        self.conn_kacennu = ERPConnection.objects.create(
            school=self.school_a,
            provider=ERPConnection.Provider.KACENNU,
        )

    def test_hmac_verification_and_idempotent_klasse_lifecycle_flow(self):
        anon = APIClient()
        url = f"/api/v1/erp-sync/webhook/klasse/{self.conn_klasse.id}/?sync=true"
        enroll_payload = {
            'event_id': 'evt-klasse-001',
            'evento': 'matricula.criada',
            'aluno': {
                'nome_completo': 'Nzinga Mbandi da Costa',
                'bi': '00778899LA012',
                'turma': '12ª Classe - Informática',
                'ano_letivo': '2026/2027',
                'telemovel': '+244923445566',
            },
        }
        raw_enroll = json.dumps(enroll_payload).encode('utf-8')

        # 1. Assinatura inválida rejeitada com 401
        bad_res = anon.post(
            url,
            data=raw_enroll,
            content_type='application/json',
            HTTP_X_YETUEDU_SIGNATURE='sha256=invalida',
        )
        self.assertEqual(bad_res.status_code, 401)

        # 2. Assinatura válida cria utilizador + matrícula ativa
        secret = self.conn_klasse.get_webhook_secret()
        ok_res = anon.post(
            url,
            data=raw_enroll,
            content_type='application/json',
            HTTP_X_YETUEDU_SIGNATURE=sign_payload(secret, raw_enroll),
        )
        self.assertEqual(ok_res.status_code, 200)
        self.assertEqual(ok_res.json()['processing_status'], ERPSyncEvent.ProcessingStatus.PROCESSED)

        user = AcademicUser.objects.get(school=self.school_a, bi_or_student_id='00778899LA012')
        self.assertEqual(user.institutional_email, 'nzinga.costa@talatona.edu.ao')
        enrollment = Enrollment.objects.get(user=user, school=self.school_a)
        self.assertEqual(enrollment.status, Enrollment.Status.ACTIVE)

        # 3. Replay do mesmo event_id ignorado idempotentemente
        dup_res = anon.post(
            url,
            data=raw_enroll,
            content_type='application/json',
            HTTP_X_YETUEDU_SIGNATURE=sign_payload(secret, raw_enroll),
        )
        self.assertEqual(dup_res.status_code, 200)
        self.assertEqual(dup_res.json()['status'], 'duplicate_ignored')

        # 4. Propina em atraso suspende matrícula e dispara revogação Celery
        overdue_payload = {
            'event_id': 'evt-klasse-002',
            'evento': 'propina.atraso',
            'aluno': {'bi': '00778899LA012', 'ano_letivo': '2026/2027'},
        }
        raw_overdue = json.dumps(overdue_payload).encode('utf-8')
        with patch('apps.provisioning.tasks.revoke_user_cloud_access_task.delay') as mock_revoke:
            ov_res = anon.post(
                url,
                data=raw_overdue,
                content_type='application/json',
                HTTP_X_YETUEDU_SIGNATURE=sign_payload(secret, raw_overdue),
            )
            self.assertEqual(ov_res.status_code, 200)
            enrollment.refresh_from_db()
            self.assertEqual(enrollment.status, Enrollment.Status.SUSPENDED)
            mock_revoke.assert_called_once()

        # 5. Propina liquidada reativa matrícula e dispara re-sincronização Celery
        settled_payload = {
            'event_id': 'evt-klasse-003',
            'evento': 'propina.liquidada',
            'aluno': {'bi': '00778899LA012', 'ano_letivo': '2026/2027'},
        }
        raw_settled = json.dumps(settled_payload).encode('utf-8')
        with patch('apps.provisioning.tasks.sync_user_to_cloud_task.delay') as mock_sync:
            st_res = anon.post(
                url,
                data=raw_settled,
                content_type='application/json',
                HTTP_X_YETUEDU_SIGNATURE=sign_payload(secret, raw_settled),
            )
            self.assertEqual(st_res.status_code, 200)
            enrollment.refresh_from_db()
            self.assertEqual(enrollment.status, Enrollment.Status.ACTIVE)
            mock_sync.assert_called_once()

    def test_kacennu_simulate_and_cross_tenant_isolation(self):
        client = APIClient()
        client.force_authenticate(user=self.sec_a)

        sim_res = client.post(
            f"/api/v1/erp-sync/connections/{self.conn_kacennu.id}/simulate-event/",
            {
                'id_transacao': 'kac-991',
                'tipo_evento': 'INSCRICAO',
                'dados': {
                    'nome': 'Paulo Kiala',
                    'numero_processo': 'KAC-551',
                    'classe': '10ª B',
                    'ano_academico': '2026/2027',
                },
            },
            format='json',
        )
        self.assertEqual(sim_res.status_code, 200)
        self.assertEqual(sim_res.json()['affected_user_email'], 'paulo.kiala@talatona.edu.ao')

        # Segredo só visível para a escola proprietária; outra escola não acede
        conn_b = ERPConnection.objects.create(school=self.school_b, provider=ERPConnection.Provider.SYSPORTAL)
        self.assertEqual(client.post(f"/api/v1/erp-sync/connections/{conn_b.id}/reveal-secret/").status_code, 404)
        self.assertEqual(client.post(f"/api/v1/erp-sync/connections/{self.conn_kacennu.id}/reveal-secret/").status_code, 200)
