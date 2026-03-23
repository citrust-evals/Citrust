"""
PII Redaction using Presidio and Vault Transit Encryption
"""
import logging
import re
import asyncio
from typing import Optional, List, Tuple

logger = logging.getLogger(__name__)

# Try to import presidio, but make it optional for graceful degradation
try:
    from presidio_analyzer import AnalyzerEngine
    from presidio_anonymizer import AnonymizerEngine
    from presidio_anonymizer.entities import OperatorConfig
    PRESIDIO_AVAILABLE = True
except ImportError:
    PRESIDIO_AVAILABLE = False
    logger.warning("Presidio not available. Install with: pip install presidio-analyzer presidio-anonymizer")
    logger.warning("Also requires: python -m spacy download en_core_web_lg")

from .vault_client import VaultClient


class PIIRedactor:
    """Detects and redacts PII using Presidio and Vault encryption"""
    
    def __init__(self, vault_client: VaultClient):
        self.vault_client = vault_client
        self.analyzer: Optional[any] = None
        self.anonymizer: Optional[any] = None
        self._initialized = False
        
        # Track encrypted tokens for decryption
        self._encryption_map: dict[str, str] = {}
    
    async def initialize(self):
        """Initialize Presidio engines"""
        if not PRESIDIO_AVAILABLE:
            raise RuntimeError(
                "Presidio is not installed. Install with: "
                "pip install presidio-analyzer presidio-anonymizer && "
                "python -m spacy download en_core_web_lg"
            )
        
        try:
            # Initialize Presidio Analyzer in thread pool (blocking operation)
            self.analyzer = await asyncio.to_thread(AnalyzerEngine)
            logger.info("✓ Presidio Analyzer initialized")
            
            # Initialize Presidio Anonymizer
            self.anonymizer = AnonymizerEngine()
            logger.info("✓ Presidio Anonymizer initialized")
            
            self._initialized = True
            logger.info("✓ PII Redactor initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize PII Redactor: {e}")
            raise
    
    async def redact(self, text: str, language: str = "en") -> str:
        """
        Detect and redact PII from text using Vault encryption
        
        Args:
            text: The text to redact
            language: Language of the text (default: "en")
            
        Returns:
            Text with PII replaced by Vault-encrypted tokens
        """
        if not self._initialized:
            raise RuntimeError("PIIRedactor not initialized")
        
        try:
            # Analyze text for PII in thread pool (blocking operation)
            analyzer_results = await asyncio.to_thread(
                self.analyzer.analyze,
                text=text,
                language=language,
                entities=[
                    "PERSON",
                    "EMAIL_ADDRESS",
                    "PHONE_NUMBER",
                    "CREDIT_CARD",
                    "IBAN_CODE",
                    "US_SSN",
                    "US_PASSPORT",
                    "MEDICAL_LICENSE",
                    "IP_ADDRESS"
                ]
            )
            
            if not analyzer_results:
                return text  # No PII found
            
            # Sort results by start position (reverse order for replacement)
            analyzer_results.sort(key=lambda x: x.start, reverse=True)
            
            # Replace each PII with encrypted token
            redacted_text = text
            for result in analyzer_results:
                pii_text = text[result.start:result.end]
                
                # Encrypt the PII using Vault
                encrypted_token = await self.vault_client.encrypt(
                    pii_text,
                    context=f"{result.entity_type}_{result.start}"
                )
                
                # Store mapping for potential decryption
                self._encryption_map[encrypted_token] = pii_text
                
                # Create placeholder with entity type
                placeholder = f"[{result.entity_type}:{encrypted_token}]"
                
                # Replace in text
                redacted_text = (
                    redacted_text[:result.start] +
                    placeholder +
                    redacted_text[result.end:]
                )
            
            logger.debug(f"Redacted {len(analyzer_results)} PII entities")
            return redacted_text
            
        except Exception as e:
            logger.error(f"PII redaction failed: {e}")
            # Return original text on error (fail open for availability)
            return text
    
    async def decrypt_redacted(self, redacted_text: str) -> str:
        """
        Decrypt PII tokens back to original text
        
        Args:
            redacted_text: Text with encrypted PII tokens
            
        Returns:
            Original text with PII restored
        """
        if not self._initialized:
            raise RuntimeError("PIIRedactor not initialized")
        
        try:
            # Find all encrypted tokens in format [ENTITY_TYPE:vault:v1:...]
            pattern = r'\[([A-Z_]+):(vault:v1:[^\]]+)\]'
            matches = list(re.finditer(pattern, redacted_text))
            
            decrypted_text = redacted_text
            
            # Process matches in reverse order to maintain positions
            for match in reversed(matches):
                entity_type = match.group(1)
                ciphertext = match.group(2)
                
                # Extract context from the match position
                start_pos = match.start()
                context = f"{entity_type}_{start_pos}"
                
                # Decrypt using Vault
                plaintext = await self.vault_client.decrypt(
                    ciphertext,
                    context=context
                )
                
                # Replace encrypted token with plaintext
                decrypted_text = (
                    decrypted_text[:match.start()] +
                    plaintext +
                    decrypted_text[match.end():]
                )
            
            return decrypted_text
            
        except Exception as e:
            logger.error(f"PII decryption failed: {e}")
            return redacted_text
    
    def get_supported_entities(self) -> List[str]:
        """Get list of supported PII entity types"""
        if not self._initialized or not self.analyzer:
            return []
        
        return self.analyzer.get_supported_entities(language="en")
