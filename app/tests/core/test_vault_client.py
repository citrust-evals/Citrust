import pytest
from app.core.vault_client import VaultClient

@pytest.fixture
async def vault_client():
    """Fixture providing a vault client"""
    client = VaultClient(
        vault_url="http://127.0.0.1:8200",
        vault_token="dev-root-token"
    )
    await client.initialize()
    return client

@pytest.mark.asyncio
async def test_encrypt_decrypt_roundtrip():
    """Test that encryption and decryption work correctly"""
    client = VaultClient(
        vault_url="http://127.0.0.1:8200",
        vault_token="dev-root-token"
    )
    await client.initialize()
    
    plaintext = "John Doe"
    
    # Encrypt
    ciphertext = await client.encrypt(plaintext)
    assert ciphertext != plaintext
    assert ciphertext.startswith("vault:v1:")
    
    # Decrypt
    decrypted = await client.decrypt(ciphertext)
    assert decrypted == plaintext

@pytest.mark.asyncio
async def test_deterministic_encryption():
    """Test that same input produces same ciphertext (deterministic)"""
    client = VaultClient(
        vault_url="http://127.0.0.1:8200",
        vault_token="dev-root-token"
    )
    await client.initialize()
    
    plaintext = "sensitive@email.com"
    
    ciphertext1 = await client.encrypt(plaintext)
    ciphertext2 = await client.encrypt(plaintext)
    
    assert ciphertext1 == ciphertext2

@pytest.mark.asyncio
async def test_decrypt_with_wrong_context():
    """Test that decryption with wrong context fails"""
    client = VaultClient(
        vault_url="http://127.0.0.1:8200",
        vault_token="dev-root-token"
    )
    await client.initialize()
    
    plaintext = "secret data"
    ciphertext = await client.encrypt(plaintext, context="context1")
    
    with pytest.raises(Exception):  # Should fail with wrong context
        await client.decrypt(ciphertext, context="wrong_context")

@pytest.mark.asyncio
async def test_uninitialized_client_encrypt():
    """Test that uninitialized client raises error"""
    client = VaultClient(
        vault_url="http://127.0.0.1:8200",
        vault_token="dev-root-token"
    )
    # Don't call initialize()
    
    with pytest.raises(RuntimeError, match="not initialized"):
        await client.encrypt("test")

@pytest.mark.asyncio
async def test_empty_plaintext():
    """Test that empty plaintext raises ValueError"""
    client = VaultClient(
        vault_url="http://127.0.0.1:8200",
        vault_token="dev-root-token"
    )
    await client.initialize()
    
    with pytest.raises(ValueError, match="cannot be empty"):
        await client.encrypt("")

