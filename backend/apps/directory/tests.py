from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserProfile
from apps.directory.models import AcademicUser
from apps.tenants.models import School


class DirectoryCSVImporterTests(TestCase):
    def setUp(self):
        self.school = School.objects.create(
            name='Colégio Luanda Sul',
            nif='5488887777',
            alvara_med_mescti='Alvará 999',
            domain='luandasul.edu.ao',
            contact_email='sec@luandasul.edu.ao',
        )
        sec = get_user_model().objects.create_user(username='sec_dir', password='Password123!')
        UserProfile.objects.create(user=sec, role=UserProfile.Role.SCHOOL_SECRETARY, school=self.school)
        self.client = APIClient()
        self.client.force_authenticate(user=sec)

    def test_csv_import_handles_accents_particles_and_email_collisions(self):
        csv_content = (
            "nome_completo;bi_ou_processo;tipo;classe_turma;ano_lectivo\n"
            "João Conceição da Silva;001LA01;ALUNO;10ª A;2026/2027\n"
            "João da Silva;002LA02;ALUNO;10ª B;2026/2027\n"
            "António Mukinda;003LA03;PROFESSOR;Física;2026/2027\n"
        ).encode('utf-8')
        upload = SimpleUploadedFile('turma.csv', csv_content, content_type='text/csv')

        res = self.client.post(
            '/api/v1/directory/upload-csv/',
            {'school_id': str(self.school.id), 'file': upload, 'academic_year': '2026/2027'},
            format='multipart',
        )
        self.assertEqual(res.status_code, 200)
        stats = res.json()['stats']
        self.assertEqual(stats['created_users'], 3)
        self.assertEqual(stats['created_enrollments'], 3)

        emails = list(
            AcademicUser.objects.filter(school=self.school)
            .order_by('created_at')
            .values_list('institutional_email', flat=True)
        )
        self.assertEqual(emails, [
            'joao.silva@luandasul.edu.ao',
            'joao.silva2@luandasul.edu.ao',
            'antonio.mukinda@luandasul.edu.ao',
        ])
