import pytest
from app.core.pii_redaction import PIIRedactor
from app.core.vault_client import VaultClient


async def create_pii_redactor():
    """Helper to create and initialize a PII redactor"""
    client = VaultClient(
        vault_url="http://127.0.0.1:8200",
        vault_token="dev-root-token"
    )
    try:
        await client.initialize()
    except Exception as e:
        pytest.skip(f"Vault not available: {e}")
    
    redactor = PIIRedactor(vault_client=client)
    try:
        await redactor.initialize()
    except Exception as e:
        pytest.skip(f"Presidio not available (may need: pip install presidio-analyzer presidio-anonymizer && python -m spacy download en_core_web_lg): {e}")
    
    return redactor


@pytest.mark.asyncio
async def test_redact_person_name():
    """Test that person names are redacted"""
    pii_redactor = await create_pii_redactor()
    text = "My name is John Doe and I live in California."
    
    redacted = await pii_redactor.redact(text)
    
    assert "John Doe" not in redacted
    assert "vault:v1:" in redacted
    assert "California" in redacted  # Location should remain


@pytest.mark.asyncio
async def test_redact_email():
    """Test that email addresses are redacted"""
    pii_redactor = await create_pii_redactor()
    text = "Contact me at john.doe@example.com for details."
    
    redacted = await pii_redactor.redact(text)
    
    assert "john.doe@example.com" not in redacted
    assert "vault:v1:" in redacted


@pytest.mark.asyncio
async def test_redact_multiple_pii():
    """Test multiple PII entities in one string"""
    pii_redactor = await create_pii_redactor()
    text = "John Smith (john@email.com) called from +1-555-0123"
    
    redacted = await pii_redactor.redact(text)
    
    assert "John Smith" not in redacted
    assert "john@email.com" not in redacted
    assert "+1-555-0123" not in redacted
    assert redacted.count("vault:v1:") >= 2  # At least 2 encrypted tokens


@pytest.mark.asyncio
async def test_decrypt_redacted_text():
    """Test that redacted text can be decrypted back"""
    pii_redactor = await create_pii_redactor()
    text = "My name is Jane Doe"
    
    redacted = await pii_redactor.redact(text)
    decrypted = await pii_redactor.decrypt_redacted(redacted)
    
    assert decrypted == text


@pytest.mark.asyncio
async def test_no_pii_returns_unchanged():
    """Test that text without PII is returned unchanged"""
    pii_redactor = await create_pii_redactor()
    text = "The weather is nice today."
    
    redacted = await pii_redactor.redact(text)
    
    assert redacted == text
