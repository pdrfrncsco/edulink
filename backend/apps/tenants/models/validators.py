from django.core.validators import RegexValidator

nif_validator = RegexValidator(
    regex=r'^\d{9,10}[A-Za-z0-9]?$',
    message='O NIF de Angola deve conter entre 9 a 10 dígitos numéricos (com possível sufixo).'
)

# Aceita .edu.ao (preferencial), .ed.ao, domínios próprios já existentes (.co.ao, .ao, .com, .org, .net) e .localhost
domain_validator = RegexValidator(
    regex=r'^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:edu\.ao|ed\.ao|co\.ao|ao|com|org|net|localhost)$',
    message=(
        'Introduza um domínio válido em minúsculas (ex.: colegio-esperanca.edu.ao, '
        'escola.co.ao, escola.com ou colegio.localhost para testes).'
    )
)

hex_color_validator = RegexValidator(
    regex=r'^#[0-9A-Fa-f]{6}$',
    message='A cor primária deve estar em formato hexadecimal (ex.: #0D9488).'
)

RESERVED_PREVIEW_SLUGS = {
    'www', 'admin', 'ops', 'portal', 'api', 'auth', 'sso',
    'mail', 'webmail', 'docs', 'status', 'cdn', 'static', 'app',
}
