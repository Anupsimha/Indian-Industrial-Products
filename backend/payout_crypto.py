import os
import base64
import hashlib
import logging
from cryptography.fernet import Fernet
from typing import Optional

logger = logging.getLogger("payout_crypto")

# Derive 32-byte key for Fernet from environment key or fallback secret
_RAW_KEY = os.environ.get("PAYOUT_ENCRYPTION_KEY", "IIP_SECRET_BANK_ENCRYPTION_KEY_2026_SECURE")
_HASHED_KEY = base64.urlsafe_b64encode(hashlib.sha256(_RAW_KEY.encode("utf-8")).digest())
_fernet = Fernet(_HASHED_KEY)


def encrypt_bank_field(value: Optional[str]) -> Optional[str]:
    """
    Encrypt sensitive bank string (account number / IFSC) using AES-256 Fernet.
    Returns ciphertext string or None if input is empty.
    """
    if not value or not str(value).strip():
        return None
    try:
        raw_bytes = str(value).strip().encode("utf-8")
        encrypted_bytes = _fernet.encrypt(raw_bytes)
        return encrypted_bytes.decode("utf-8")
    except Exception as e:
        logger.error(f"Failed to encrypt bank field: {str(e)}")
        raise ValueError(f"Encryption error: {str(e)}")


def decrypt_bank_field(ciphertext: Optional[str]) -> Optional[str]:
    """
    Decrypt sensitive bank ciphertext string using AES-256 Fernet.
    Returns decrypted plaintext string or None if input is empty.
    """
    if not ciphertext or not str(ciphertext).strip():
        return None
    try:
        cipher_bytes = str(ciphertext).strip().encode("utf-8")
        decrypted_bytes = _fernet.decrypt(cipher_bytes)
        return decrypted_bytes.decode("utf-8")
    except Exception as e:
        logger.error(f"Failed to decrypt bank field: {str(e)}")
        return None


def mask_account_number(account_number: Optional[str]) -> str:
    """
    Mask bank account number for UI presentation (e.g. 'XXXX-XXXX-5678').
    """
    raw = str(account_number or "").strip()
    if not raw:
        return "Not Configured"
    if len(raw) <= 4:
        return "XXXX-" + raw
    return "XXXX-XXXX-" + raw[-4:]
