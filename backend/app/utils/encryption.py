from cryptography.fernet import Fernet
from app.core.config import settings


class TokenEncryption:
    """Utility class for encrypting and decrypting OAuth tokens"""
    
    def __init__(self):
        self.cipher = Fernet(settings.ENCRYPTION_KEY.encode())
    
    def encrypt(self, token: str) -> str:
        """Encrypt a token"""
        return self.cipher.encrypt(token.encode()).decode()
    
    def decrypt(self, encrypted_token: str) -> str:
        """Decrypt a token"""
        return self.cipher.decrypt(encrypted_token.encode()).decode()


# Global instance
token_encryption = TokenEncryption()
