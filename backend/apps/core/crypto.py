import base64
import hashlib
from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken


def get_fernet_instance() -> Fernet:
    """
    Retorna uma instância Fernet válida baseada na chave definida em settings.
    Garante que a chave tenha exatamente 32 bytes em Base64 URL-safe.
    """
    raw_key = getattr(settings, 'EDULINK_FERNET_KEY', 'default-edulink-dev-key')
    if isinstance(raw_key, str):
        raw_key = raw_key.encode('utf-8')

    try:
        # Testa se já é uma chave válida de 32 bytes base64
        return Fernet(raw_key)
    except Exception:
        # Deriva uma chave URL-safe base64 de 32 bytes usando SHA-256
        derived_key = base64.urlsafe_b64encode(hashlib.sha256(raw_key).digest())
        return Fernet(derived_key)


def encrypt_text(plain_text: str) -> str:
    """Encripta texto puro e devolve a string segura codificada."""
    if not plain_text:
        return ""
    f = get_fernet_instance()
    encrypted_bytes = f.encrypt(plain_text.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')


def decrypt_text(cipher_text: str) -> str:
    """Decripta a string segura e devolve o texto puro."""
    if not cipher_text:
        return ""
    f = get_fernet_instance()
    try:
        decrypted_bytes = f.decrypt(cipher_text.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except InvalidToken:
        raise ValueError("Chave de encriptação inválida ou dados corrompidos.")
