from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserProfile
from apps.compliance.models import APDDossier, ParentalConsent
from apps.directory.models import AcademicUser
from apps.tenants.models import CloudIntegration, School


class ComplianceAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.school = School.objects.create(
            name='Colégio Nova Vida',
            nif='5412349999',
            alvara_med_mescti='Alvará MED n.º 555/2026',
            domain='novavida.edu.ao',
            contact_email='direcao@novavida.edu.ao',
            province='Luanda',
            municipality='Kilamba Kiaxi',
            address='Urbanização Nova Vida, Rua 42',
        )
        sec = get_user_model().objects.create_user(username='sec_comp', password='Password123!')
        UserProfile.objects.create(user=sec, role=UserProfile.Role.SCHOOL_SECRETARY, school=self.school)
        self.client.force_authenticate(user=sec)
        CloudIntegration.objects.create(
            school=self.school,
            provider=CloudIntegration.Provider.GOOGLE,
            encrypted_credentials='sandbox',
            sync_enabled=True,
        )
        self.student = AcademicUser.objects.create(
            school=self.school,
            full_name='Beatriz Lukeni dos Santos',
            role=AcademicUser.Role.STUDENT,
            institutional_email='beatriz.santos@novavida.edu.ao',
            bi_or_student_id='004455667LA011',
        )
        self.teacher = AcademicUser.objects.create(
            school=self.school,
            full_name='Carlos Baptista',
            role=AcademicUser.Role.TEACHER,
            institutional_email='carlos.baptista@novavida.edu.ao',
            bi_or_student_id='001122334LA022',
        )

    def test_apd_dossier_generation_submission_sync_and_html_xss_escape(self):
        create_res = self.client.post(
            '/api/v1/compliance/dossiers/',
            {
                'school': str(self.school.id),
                'director_full_name': 'Dr. Mateus <script>alert(1)</script> Nguvulu',
                'director_bi': '000999888LA001',
                'institution_type': APDDossier.InstitutionType.PRIMARY_SECONDARY,
                'has_minors': True,
            },
            format='json',
        )
        self.assertEqual(create_res.status_code, 201)
        dossier_id = create_res.json()['id']

        gen_res = self.client.post(f'/api/v1/compliance/dossiers/{dossier_id}/generate/')
        self.assertEqual(gen_res.status_code, 200)
        body = gen_res.json()
        self.assertEqual(body['status'], APDDossier.Status.READY_FOR_SUBMISSION)
        self.assertEqual(body['submission_type'], APDDossier.SubmissionType.PRIOR_AUTHORIZATION)
        self.assertEqual(body['dossier']['processing_details']['data_subjects']['students'], 1)
        self.assertEqual(body['dossier']['processing_details']['data_subjects']['teachers'], 1)
        self.assertTrue(any('Google Workspace' in p for p in body['dossier']['processing_details']['international_transfers']))

        # Submeter à APD e validar sincronização com School
        sub_res = self.client.post(
            f'/api/v1/compliance/dossiers/{dossier_id}/mark-submitted/',
            {'apd_reference_number': 'APD-PROC-2026-0412', 'approved': True},
            format='json',
        )
        self.assertEqual(sub_res.status_code, 200)
        self.school.refresh_from_db()
        self.assertTrue(self.school.apd_notified)
        self.assertEqual(self.school.apd_dossier_number, 'APD-PROC-2026-0412')

        # HTML imprimível deve escapar tags XSS
        html_res = self.client.get(f'/api/v1/compliance/dossiers/{dossier_id}/download-html/')
        self.assertEqual(html_res.status_code, 200)
        html_text = html_res.content.decode('utf-8')
        self.assertNotIn('<script>alert(1)</script>', html_text)
        self.assertIn('&lt;script&gt;alert(1)&lt;/script&gt;', html_text)
        self.assertIn('APD-PROC-2026-0412', html_text)

    def test_parental_consent_bulk_sign_and_revoke_flow(self):
        # 1. Gerar termos apenas para estudantes (não docentes)
        bulk_res = self.client.post(
            '/api/v1/compliance/consents/bulk-generate/',
            {'school_id': str(self.school.id)},
            format='json',
        )
        self.assertEqual(bulk_res.status_code, 200)
        self.assertEqual(bulk_res.json()['created'], 1)
        self.assertEqual(ParentalConsent.objects.filter(school=self.school).count(), 1)

        consent = ParentalConsent.objects.get(school=self.school, student=self.student)
        self.assertEqual(consent.status, ParentalConsent.Status.PENDING)

        # 2. Encarregado (anónimo com token) consulta e assina digitalmente
        anon_client = APIClient()
        lookup_res = anon_client.get(f'/api/v1/compliance/consents/by-token/?token={consent.consent_token}')
        self.assertEqual(lookup_res.status_code, 200)
        self.assertEqual(lookup_res.json()['student_name'], self.student.full_name)

        # 3. Encarregado assina digitalmente
        sign_res = anon_client.post(
            '/api/v1/compliance/consents/sign/',
            {
                'token': consent.consent_token,
                'guardian_full_name': 'Joana dos Santos',
                'guardian_bi': '003344556LA099',
                'guardian_relationship': ParentalConsent.Relationship.PAI_MAE,
                'guardian_phone': '+244 923 111 222',
            },
            format='json',
        )
        self.assertEqual(sign_res.status_code, 200)
        consent.refresh_from_db()
        self.assertEqual(consent.status, ParentalConsent.Status.SIGNED)
        self.assertIsNotNone(consent.signed_at)

        # 4. HTML do termo assinado
        html_res = self.client.get(f'/api/v1/compliance/consents/{consent.id}/download-html/')
        self.assertEqual(html_res.status_code, 200)
        self.assertIn('Joana dos Santos', html_res.content.decode('utf-8'))

        # 5. Revogação do consentimento
        rev_res = self.client.post(f'/api/v1/compliance/consents/{consent.id}/revoke/')
        self.assertEqual(rev_res.status_code, 200)
        consent.refresh_from_db()
        self.assertEqual(consent.status, ParentalConsent.Status.REVOKED)
        self.assertIsNotNone(consent.revoked_at)

    def test_send_parental_consent_email_single_and_bulk(self):
        self.client.post('/api/v1/compliance/consents/bulk-generate/', {'school_id': str(self.school.id)}, format='json')
        consent = ParentalConsent.objects.get(school=self.school, student=self.student)

        # Sem e-mail de encarregado nem pessoal -> 400 claro
        no_mail_res = self.client.post(f'/api/v1/compliance/consents/{consent.id}/send-email/', {}, format='json')
        self.assertEqual(no_mail_res.status_code, 400)

        # Com e-mail de encarregado -> envia link com token e persiste guardian_email
        mail.outbox.clear()
        send_res = self.client.post(
            f'/api/v1/compliance/consents/{consent.id}/send-email/',
            {'guardian_email': 'pai.santos@gmail.com'},
            format='json',
        )
        self.assertEqual(send_res.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(consent.consent_token, mail.outbox[0].body)
        consent.refresh_from_db()
        self.assertEqual(consent.guardian_email, 'pai.santos@gmail.com')

        # Envio em lote envia para o termo pendente com guardian_email
        bulk_send = self.client.post(
            '/api/v1/compliance/consents/send-bulk-emails/',
            {'school_id': str(self.school.id)},
            format='json',
        )
        self.assertEqual(bulk_send.status_code, 200)
        self.assertEqual(bulk_send.json()['sent'], 1)
        self.assertEqual(len(mail.outbox), 2)
