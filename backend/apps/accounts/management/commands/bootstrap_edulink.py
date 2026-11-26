from decimal import Decimal
import os
import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import UserProfile
from apps.benefits.models import BenefitOffer, BenefitPartner
from apps.directory.models import AcademicUser, Enrollment
from apps.tenants.models import School

User = get_user_model()

INITIAL_BENEFIT_PARTNERS = [
    {
        'name': 'Unitel Educação',
        'category': BenefitPartner.Category.TELECOM,
        'description': 'Pacotes educativos em Kwanzas e bónus de dados móveis para portadores do Passaporte EduLink.',
        'discount_label': '50% Bónus Dados & Zero-Rated EduLink',
        'eligible_roles': ['STUDENT', 'TEACHER'],
        'website_url': 'https://www.unitel.ao',
        'offers': [
            {
                'title': 'Pacote Estudante 10GB + EduLink',
                'promo_code': 'UNITEL-EDULINK10',
                'price_aoa': Decimal('2500.00'),
            },
            {
                'title': 'Bónus 50% Recarga Académica',
                'promo_code': 'UNITEL-BONUS50',
                'price_aoa': Decimal('0.00'),
            },
        ],
    },
    {
        'name': 'Africell Jovem & Docente',
        'category': BenefitPartner.Category.TELECOM,
        'description': 'Tarifários de dados móveis com desconto institucional para estudantes e professores angolanos.',
        'discount_label': '30% Desconto Pacotes Campus',
        'eligible_roles': ['STUDENT', 'TEACHER'],
        'website_url': 'https://www.africell.ao',
        'offers': [
            {
                'title': 'Tarifário Campus 15GB',
                'promo_code': 'AFRICELL-CAMPUS15',
                'price_aoa': Decimal('3000.00'),
            },
        ],
    },
    {
        'name': 'Livraria Lello Angola',
        'category': BenefitPartner.Category.BOOKSTORE,
        'description': 'Desconto presencial e online em manuais escolares, livros técnicos e material didático.',
        'discount_label': '25% em Manuais Escolares',
        'eligible_roles': ['STUDENT', 'TEACHER'],
        'website_url': 'https://edulink.ao',
        'offers': [
            {
                'title': 'Voucher 25% Balcão & Papelaria',
                'promo_code': 'LELLO-EDULINK25',
                'price_aoa': Decimal('0.00'),
            },
        ],
    },
    {
        'name': 'GitHub & Microsoft Education Desk',
        'category': BenefitPartner.Category.SOFTWARE,
        'description': 'Apoio à ativação do GitHub Student Developer Pack e Microsoft 365 A1 via domínio .edu.ao.',
        'discount_label': 'Ferramentas Pro 100% Gratuitas',
        'eligible_roles': ['STUDENT', 'TEACHER'],
        'website_url': 'https://education.github.com',
        'offers': [
            {
                'title': 'Ativação Guiada Student Developer Pack',
                'promo_code': 'GH-EDULINK-AO',
                'price_aoa': Decimal('0.00'),
            },
        ],
    },
    {
        'name': 'Banco BAI Jovem & Docente',
        'category': BenefitPartner.Category.BANKING,
        'description': 'Condições preferenciais em conta salário docente e cartão jovem para estudantes universitários.',
        'discount_label': 'Isenção de Comissão Anual',
        'eligible_roles': ['STUDENT', 'TEACHER'],
        'website_url': 'https://www.bancobai.ao',
        'offers': [
            {
                'title': 'Abertura de Conta Académica Isenta',
                'promo_code': 'BAI-EDULINK26',
                'price_aoa': Decimal('0.00'),
            },
        ],
    },
]


class Command(BaseCommand):
    help = 'Inicializa de forma idempotente o Administrador da Plataforma EduLink e o catálogo base de benefícios.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--admin-email',
            default=os.environ.get('EDULINK_ADMIN_EMAIL', 'admin@edulink.ao'),
            help='E-mail do Administrador Global da Plataforma (padrão: EDULINK_ADMIN_EMAIL ou admin@edulink.ao).',
        )
        parser.add_argument(
            '--admin-password',
            default=os.environ.get('EDULINK_ADMIN_PASSWORD', ''),
            help='Palavra-passe do Administrador (obrigatória em produção se ainda não existir).',
        )
        parser.add_argument(
            '--admin-name',
            default=os.environ.get('EDULINK_ADMIN_NAME', 'Operador EduLink'),
            help='Nome completo do Administrador da Plataforma.',
        )
        parser.add_argument(
            '--generate-password',
            action='store_true',
            help='Gera automaticamente uma palavra-passe forte ao criar novo administrador.',
        )
        parser.add_argument(
            '--skip-benefits',
            action='store_true',
            help='Ignora a criação/atualização do catálogo inicial do Clube de Benefícios.',
        )
        parser.add_argument(
            '--with-demo-school',
            action='store_true',
            help='Cria opcionalmente uma escola piloto de demonstração (apenas ambientes dev/demo).',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        admin_email = options['admin_email'].strip().lower()
        admin_password = (options['admin_password'] or '').strip()
        admin_name = options['admin_name'].strip() or 'Operador EduLink'
        generate_password = options['generate_password']

        if not admin_email or '@' not in admin_email:
            raise CommandError('Forneça um --admin-email válido.')

        user = self._ensure_platform_admin(admin_email, admin_password, admin_name, generate_password)

        if not options['skip_benefits']:
            p_count, o_count = self._seed_benefits_catalog()
            self.stdout.write(
                self.style.SUCCESS(f'Clube de Benefícios pronto: {p_count} parceiro(s), {o_count} oferta(s) ativa(s).')
            )

        if options['with_demo_school']:
            self._seed_demo_school()

        self.stdout.write(self.style.SUCCESS(f'Bootstrap EduLink concluído ({user.email}).'))

    def _ensure_platform_admin(self, email: str, password: str, full_name: str, generate_password: bool):
        parts = full_name.split(None, 1)
        first_name = parts[0] if parts else 'Operador'
        last_name = parts[1] if len(parts) > 1 else 'EduLink'

        user = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=email).first()
        generated_secret = None

        if user is None:
            if not password:
                if settings.DEBUG or generate_password:
                    generated_secret = secrets.token_urlsafe(14)
                    password = generated_secret
                else:
                    raise CommandError(
                        'Em produção (DEBUG=False), defina EDULINK_ADMIN_PASSWORD, --admin-password ou --generate-password.'
                    )
            if len(password) < 8:
                raise CommandError('A palavra-passe do administrador deve ter pelo menos 8 caracteres.')

            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_staff=True,
                is_superuser=True,
                is_active=True,
            )
            action_label = 'criado'
        else:
            updated_fields = []
            if not user.is_staff:
                user.is_staff = True
                updated_fields.append('is_staff')
            if not user.is_superuser:
                user.is_superuser = True
                updated_fields.append('is_superuser')
            if not user.is_active:
                user.is_active = True
                updated_fields.append('is_active')
            if password:
                if len(password) < 8:
                    raise CommandError('A palavra-passe do administrador deve ter pelo menos 8 caracteres.')
                user.set_password(password)
                updated_fields.append('password')
            if updated_fields:
                user.save(update_fields=updated_fields)
            action_label = 'verificado/atualizado'

        profile, created_profile = UserProfile.objects.get_or_create(
            user=user,
            defaults={'role': UserProfile.Role.PLATFORM_ADMIN, 'school': None},
        )
        if not created_profile and (profile.role != UserProfile.Role.PLATFORM_ADMIN or profile.school_id is not None):
            profile.role = UserProfile.Role.PLATFORM_ADMIN
            profile.school = None
            profile.save(update_fields=['role', 'school'])

        self.stdout.write(self.style.SUCCESS(f'PLATFORM_ADMIN {action_label}: {user.email}'))
        if generated_secret:
            self.stdout.write(
                self.style.WARNING(
                    f'Palavra-passe temporária gerada para {user.email}: {generated_secret} (guarde e altere após o primeiro login).'
                )
            )
        return user

    def _seed_benefits_catalog(self) -> tuple[int, int]:
        partners_count = 0
        offers_count = 0
        for item in INITIAL_BENEFIT_PARTNERS:
            partner, _ = BenefitPartner.objects.update_or_create(
                name=item['name'],
                defaults={
                    'category': item['category'],
                    'description': item['description'],
                    'discount_label': item['discount_label'],
                    'eligible_roles': item['eligible_roles'],
                    'website_url': item['website_url'],
                    'is_active': True,
                },
            )
            partners_count += 1
            for offer_data in item['offers']:
                BenefitOffer.objects.update_or_create(
                    partner=partner,
                    title=offer_data['title'],
                    defaults={
                        'promo_code': offer_data['promo_code'],
                        'price_aoa': offer_data['price_aoa'],
                        'requires_active_enrollment': True,
                        'is_active': True,
                    },
                )
                offers_count += 1
        return partners_count, offers_count

    def _seed_demo_school(self) -> None:
        school, _ = School.objects.get_or_create(
            domain='colegio-esperanca.edu.ao',
            defaults={
                'name': 'Colégio Esperança de Luanda',
                'nif': '5412345678',
                'alvara_med_mescti': 'Alvará MED n.º 432/2024',
                'contact_email': 'secretaria@colegio-esperanca.edu.ao',
                'phone': '+244 923 000 111',
                'province': 'Luanda',
                'municipality': 'Talatona',
                'address': 'Via AL14, Camama, Talatona',
                'about_text': 'Instituição piloto de ensino primário e secundário integrada na EduLink Angola.',
                'is_active': True,
            },
        )
        student, _ = AcademicUser.objects.get_or_create(
            school=school,
            bi_or_student_id='00991122LA026',
            defaults={
                'full_name': 'Kialanda Mateus Neto',
                'role': AcademicUser.Role.STUDENT,
                'institutional_email': 'kialanda.neto@colegio-esperanca.edu.ao',
                'is_active': True,
            },
        )
        Enrollment.objects.get_or_create(
            user=student,
            school=school,
            academic_year='2026/2027',
            defaults={'grade_class': '11ª Classe - Informática', 'status': Enrollment.Status.ACTIVE},
        )
        self.stdout.write(self.style.SUCCESS(f'Escola demo pronta: {school.name} ({school.domain})'))
