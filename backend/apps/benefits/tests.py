from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserProfile
from apps.benefits.models import BenefitOffer, BenefitPartner, BenefitRedemption
from apps.directory.models import AcademicUser, Enrollment
from apps.passport.services.jwt_signer import generate_passport_token
from apps.tenants.models import School


class BenefitsClubTests(TestCase):
    def setUp(self):
        self.school = School.objects.create(
            name='Instituto Médio Politécnico de Viana',
            nif='5403005566',
            alvara_med_mescti='Alvará 303/2026',
            domain='impviana.edu.ao',
            contact_email='sec@impviana.edu.ao',
        )
        self.student_acc = AcademicUser.objects.create(
            school=self.school,
            full_name='Kiluanji Domingos',
            role=AcademicUser.Role.STUDENT,
            institutional_email='kiluanji.domingos@impviana.edu.ao',
            bi_or_student_id='00112233LA009',
        )
        self.student_enroll = Enrollment.objects.create(
            user=self.student_acc,
            school=self.school,
            academic_year='2026/2027',
            grade_class='11ª Classe - Eletrónica',
            status=Enrollment.Status.ACTIVE,
        )
        self.student_login = get_user_model().objects.create_user(username='kiluanji', password='Password123!')
        UserProfile.objects.create(
            user=self.student_login,
            role=UserProfile.Role.STUDENT,
            school=self.school,
            academic_user=self.student_acc,
        )

        self.teacher_acc = AcademicUser.objects.create(
            school=self.school,
            full_name='Prof. Esperança Mateus',
            role=AcademicUser.Role.TEACHER,
            institutional_email='esperanca.mateus@impviana.edu.ao',
            bi_or_student_id='00998877LA001',
        )
        self.teacher_login = get_user_model().objects.create_user(username='esperanca', password='Password123!')
        UserProfile.objects.create(
            user=self.teacher_login,
            role=UserProfile.Role.TEACHER,
            school=self.school,
            academic_user=self.teacher_acc,
        )

        self.partner_books = BenefitPartner.objects.create(
            name='Livraria Lello Angola',
            category=BenefitPartner.Category.BOOKSTORE,
            discount_label='25% em Manuais Escolares',
            eligible_roles=['STUDENT', 'TEACHER'],
        )
        self.partner_key = self.partner_books.generate_api_key()
        self.partner_books.save()

        self.partner_teacher_bank = BenefitPartner.objects.create(
            name='Banco BAI Docente',
            category=BenefitPartner.Category.BANKING,
            discount_label='Conta Salário Isenta de Taxas',
            eligible_roles=['TEACHER'],
        )

        self.offer_free = BenefitOffer.objects.create(
            partner=self.partner_books,
            title='Desconto 25% Balcão Luanda',
            promo_code='LELLO-YETU25',
            price_aoa=Decimal('0.00'),
        )
        self.offer_teacher = BenefitOffer.objects.create(
            partner=self.partner_teacher_bank,
            title='Crédito Equipamento Docente',
            price_aoa=Decimal('0.00'),
        )

    def test_catalog_filters_by_academic_role(self):
        student_client = APIClient()
        student_client.force_authenticate(user=self.student_login)
        res = student_client.get('/api/v1/benefits/catalog/')
        self.assertEqual(res.status_code, 200)
        titles = [item['title'] for item in res.json()]
        self.assertIn('Desconto 25% Balcão Luanda', titles)
        self.assertNotIn('Crédito Equipamento Docente', titles)

        teacher_client = APIClient()
        teacher_client.force_authenticate(user=self.teacher_login)
        t_res = teacher_client.get('/api/v1/benefits/catalog/')
        self.assertEqual(t_res.status_code, 200)
        t_titles = [item['title'] for item in t_res.json()]
        self.assertIn('Crédito Equipamento Docente', t_titles)

    def test_portal_and_partner_pos_qr_redemption_respects_suspension(self):
        student_client = APIClient()
        student_client.force_authenticate(user=self.student_login)

        # Estudante resgata voucher online
        redeem_res = student_client.post(
            '/api/v1/benefits/redeem/',
            {'offer_id': str(self.offer_free.id)},
            format='json',
        )
        self.assertEqual(redeem_res.status_code, 201)
        self.assertTrue(redeem_res.json()['voucher_code'].startswith('YETU-'))

        # Parceiro valida QR Code via API Key no balcão (POS)
        anon = APIClient()
        token = generate_passport_token(self.student_acc, self.student_enroll)

        bad_key_res = anon.post(
            '/api/v1/benefits/redeem/',
            {'offer_id': str(self.offer_free.id), 'passport_token': token},
            format='json',
            HTTP_X_PARTNER_API_KEY='yetu_partner_invalida',
        )
        self.assertEqual(bad_key_res.status_code, 401)

        pos_res = anon.post(
            '/api/v1/benefits/redeem/',
            {'offer_id': str(self.offer_free.id), 'passport_token': token},
            format='json',
            HTTP_X_PARTNER_API_KEY=self.partner_key,
        )
        self.assertEqual(pos_res.status_code, 201)
        self.assertEqual(pos_res.json()['verification_method'], BenefitRedemption.VerificationMethod.PARTNER_API)

        # Suspensão da matrícula bloqueia tanto resgate online quanto POS
        self.student_enroll.status = Enrollment.Status.SUSPENDED
        self.student_enroll.save(update_fields=['status'])

        blocked_online = student_client.post(
            '/api/v1/benefits/redeem/',
            {'offer_id': str(self.offer_free.id)},
            format='json',
        )
        self.assertEqual(blocked_online.status_code, 403)
