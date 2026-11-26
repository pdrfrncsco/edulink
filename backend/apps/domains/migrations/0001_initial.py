import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('tenants', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DomainConfiguration',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('registrar_status', models.CharField(choices=[('PENDING_DNS_AO', 'Aguardando Registo DNS.AO'), ('NAMESERVERS_DELEGATED', 'Nameservers Delegados à Cloudflare'), ('ACTIVE', 'Zona Ativa e Propagada'), ('ERROR', 'Erro de Sincronização DNS')], default='PENDING_DNS_AO', max_length=30, verbose_name='Estado DNS.AO / Cloudflare')),
                ('cloudflare_zone_id', models.CharField(blank=True, max_length=64, verbose_name='Cloudflare Zone ID')),
                ('cloudflare_account_id', models.CharField(blank=True, max_length=64, verbose_name='Cloudflare Account ID')),
                ('encrypted_api_token', models.TextField(blank=True, help_text='Opcional por escola; se vazio utiliza o token da plataforma EduLink', verbose_name='Token API Cloudflare (Encriptado)')),
                ('nameservers', models.JSONField(blank=True, default=list, help_text='Servidores NS atribuídos para submeter ao Registrar DNS.AO', verbose_name='Nameservers Cloudflare')),
                ('google_verification_token', models.CharField(blank=True, help_text='Ex: google-site-verification=...', max_length=255, verbose_name='Token TXT Google Workspace')),
                ('microsoft_verification_token', models.CharField(blank=True, help_text='Ex: MS=ms12345678', max_length=255, verbose_name='Token TXT Microsoft 365')),
                ('dkim_selector', models.CharField(blank=True, default='google', max_length=64, verbose_name='Seletor DKIM')),
                ('dkim_public_key', models.TextField(blank=True, verbose_name='Chave Pública DKIM (TXT)')),
                ('target_web_ip_or_cname', models.CharField(default='sites.edulink.ao', help_text='Endereço IPv4 ou hostname CNAME do proxy reverso Next.js', max_length=255, verbose_name='Destino Web (IPv4 ou CNAME)')),
                ('last_synced_at', models.DateTimeField(blank=True, null=True, verbose_name='Última Sincronização Cloudflare')),
                ('last_error', models.TextField(blank=True, verbose_name='Último Erro DNS')),
                ('school', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='dns_config', to='tenants.school', verbose_name='Escola (Tenant)')),
            ],
            options={
                'verbose_name': 'Configuração DNS (.edu.ao)',
                'verbose_name_plural': 'Configurações DNS (.edu.ao)',
                'ordering': ['school__domain'],
            },
        ),
        migrations.CreateModel(
            name='DNSRecord',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('record_type', models.CharField(choices=[('A', 'A'), ('AAAA', 'AAAA'), ('CNAME', 'CNAME'), ('MX', 'MX'), ('TXT', 'TXT')], max_length=10, verbose_name='Tipo')),
                ('name', models.CharField(help_text='Ex: @, www, google._domainkey, _dmarc', max_length=255, verbose_name='Nome / Host')),
                ('content', models.TextField(verbose_name='Valor / Conteúdo')),
                ('ttl', models.PositiveIntegerField(default=3600, verbose_name='TTL (segundos)')),
                ('priority', models.PositiveIntegerField(blank=True, null=True, verbose_name='Prioridade (MX)')),
                ('proxied', models.BooleanField(default=False, verbose_name='Proxy Cloudflare Ativo')),
                ('purpose', models.CharField(choices=[('WEB', 'Site Institucional (.edu.ao)'), ('GOOGLE_VERIFY', 'Verificação Google Workspace'), ('MICROSOFT_VERIFY', 'Verificação Microsoft 365'), ('MX_GOOGLE', 'Correio MX Google'), ('MX_MICROSOFT', 'Correio MX Microsoft'), ('SPF', 'Autenticação SPF'), ('DKIM', 'Assinatura DKIM'), ('DMARC', 'Política DMARC'), ('CUSTOM', 'Personalizado')], default='CUSTOM', max_length=30, verbose_name='Finalidade')),
                ('cloudflare_record_id', models.CharField(blank=True, max_length=64, verbose_name='Cloudflare Record ID')),
                ('sync_state', models.CharField(choices=[('PENDING', 'Pendente'), ('SYNCED', 'Sincronizado'), ('FAILED', 'Falhou')], default='PENDING', max_length=20, verbose_name='Estado na Cloudflare')),
                ('propagated', models.BooleanField(default=False, verbose_name='Propagado Publicamente')),
                ('last_checked_at', models.DateTimeField(blank=True, null=True, verbose_name='Última Verificação DoH')),
                ('domain_config', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='records', to='domains.domainconfiguration', verbose_name='Configuração DNS')),
            ],
            options={
                'verbose_name': 'Registo DNS',
                'verbose_name_plural': 'Registos DNS',
                'ordering': ['record_type', 'name', 'purpose'],
                'unique_together': {('domain_config', 'record_type', 'name', 'purpose')},
            },
        ),
    ]
