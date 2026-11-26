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
