import secrets
import string


class ProvisioningError(Exception):
    """Erro padronizado de provisionamento em nuvem (Google/Microsoft)."""

    def __init__(self, message: str, provider: str, status_code: int | None = None, retryable: bool = False):
        super().__init__(message)
        self.provider = provider
        self.status_code = status_code
        self.retryable = retryable


def split_full_name(full_name: str) -> tuple[str, str]:
    """
    Separa o nome completo em (given_name, family_name) para os campos
    obrigatórios da Google Directory API e Microsoft Graph API.
    """
    parts = [p for p in (full_name or '').strip().split() if p]
    if not parts:
        return 'Utilizador', 'EduLink'
    if len(parts) == 1:
        return parts[0], 'EduLink'
    return parts[0], ' '.join(parts[1:])


def generate_temporary_password(length: int = 16) -> str:
    """
    Gera uma palavra-passe temporária criptograficamente segura que cumpre
    os requisitos de complexidade do Google Workspace e Microsoft Entra ID.
    """
    alphabet = string.ascii_letters + string.digits + '!@#$%&*'
    required = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice('!@#$%&*'),
    ]
    rest = [secrets.choice(alphabet) for _ in range(max(length - len(required), 8))]
    chars = required + rest
    secrets.SystemRandom().shuffle(chars)
    return ''.join(chars)
