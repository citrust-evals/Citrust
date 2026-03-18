"""
HashiCorp Vault Client for Transit Engine encryption
"""
import asyncio
import hvac
import logging
from typing import Optional
import base64

logger = logging.getLogger(__name__)


class VaultClient:
    """Client for HashiCorp Vault Transit Engine operations"""
    
    def __init__(self, vault_url: str, vault_token: str, transit_key: str = "trace-encryption-key"):
        self.vault_url = vault_url
        self.vault_token = vault_token
        self.transit_key = transit_key
        self.client: Optional[hvac.Client] = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize Vault client and ensure transit engine is configured"""
        try:
            # Create Vault client
            self.client = hvac.Client(url=self.vault_url, token=self.vault_token)
            
            # Check if client is authenticated
            is_auth = await asyncio.to_thread(self.client.is_authenticated)
            if not is_auth:
                raise RuntimeError("Vault authentication failed")
            
            logger.info("✓ Vault client authenticated")
            
            # Enable transit engine if not already enabled
            try:
                await asyncio.to_thread(
                    self.client.sys.enable_secrets_engine,
                    backend_type='transit',
                    path='transit'
                )
                logger.info("✓ Transit engine enabled")
            except Exception as e:
                if "path is already in use" in str(e):
                    logger.info("✓ Transit engine already enabled")
                else:
                    raise
            
            # Create encryption key if it doesn't exist
            try:
                await asyncio.to_thread(
                    self.client.secrets.transit.create_key,
                    name=self.transit_key,
                    convergent_encryption=True,
                    derived=False
                )
                logger.info("✓ Created transit key")
            except Exception as e:
                if "already exists" in str(e).lower():
                    logger.info("✓ Transit key already exists")
                else:
                    raise
            
            self._initialized = True
            logger.info("✓ Vault client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Vault client: {e}")
            raise
    
    async def encrypt(self, plaintext: str, context: str = "pii") -> str:
        """
        Encrypt plaintext using Vault Transit Engine
        
        Args:
            plaintext: The text to encrypt
            context: Encryption context for deterministic encryption
            
        Returns:
            Encrypted ciphertext (format: vault:v1:...)
        """
        if not self._initialized or not self.client:
            raise RuntimeError("Vault client not initialized")
        
        if not plaintext or not plaintext.strip():
            raise ValueError("Plaintext cannot be empty")
        
        try:
            # Encode plaintext to base64
            plaintext_b64 = base64.b64encode(plaintext.encode()).decode()
            
            # Encrypt with context for deterministic encryption
            context_b64 = base64.b64encode(context.encode()).decode()
            
            response = await asyncio.to_thread(
                self.client.secrets.transit.encrypt_data,
                name=self.transit_key,
                plaintext=plaintext_b64,
                context=context_b64
            )
            
            return response['data']['ciphertext']
            
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise
    
    async def decrypt(self, ciphertext: str, context: str = "pii") -> str:
        """
        Decrypt ciphertext using Vault Transit Engine
        
        Args:
            ciphertext: The encrypted text (format: vault:v1:...)
            context: Encryption context used during encryption
            
        Returns:
            Decrypted plaintext
        """
        if not self._initialized or not self.client:
            raise RuntimeError("Vault client not initialized")
        
        try:
            # Decrypt with context
            context_b64 = base64.b64encode(context.encode()).decode()
            
            response = await asyncio.to_thread(
                self.client.secrets.transit.decrypt_data,
                name=self.transit_key,
                ciphertext=ciphertext,
                context=context_b64
            )
            
            # Decode base64 plaintext
            plaintext_b64 = response['data']['plaintext']
            plaintext = base64.b64decode(plaintext_b64).decode()
            
            return plaintext
            
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise
    
    def health_check(self) -> dict:
        """Check Vault health status"""
        if not self.client:
            return {"status": "not_initialized"}
        
        try:
            # Note: health_check is sync, so we call is_authenticated directly
            if self.client.is_authenticated():
                return {"status": "healthy", "authenticated": True}
            else:
                return {"status": "unhealthy", "authenticated": False}
        except Exception as e:
            return {"status": "error", "error": str(e)}
