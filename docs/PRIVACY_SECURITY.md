# Citrus LLM Evaluation Platform - Privacy & Security

> **Version**: 2.4.0  
> **Last Updated**: March 2026

Complete privacy and security documentation for the Citrus LLM Evaluation Platform.

---

## Table of Contents

1. [Overview](#overview)
2. [PII Detection (Presidio)](#pii-detection-presidio)
3. [HashiCorp Vault Integration](#hashicorp-vault-integration)
4. [VaultGemma Differential Privacy](#vaultgemma-differential-privacy)
5. [Authentication & Authorization](#authentication--authorization)
6. [Data Protection](#data-protection)
7. [Security Best Practices](#security-best-practices)
8. [Compliance Considerations](#compliance-considerations)

---

## Overview

Citrus implements a multi-layered privacy and security architecture designed for enterprise-grade protection of sensitive data in LLM evaluation workflows.

### Privacy Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRIVACY PROTECTION LAYERS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: PII Detection (Presidio)                              │
│  ────────────────────────────────────────────                   │
│  • Identifies sensitive data in real-time                       │
│  • Supports 15+ PII entity types                                │
│  • SpaCy NLP for accuracy                                       │
│                                                                  │
│  Layer 2: Encryption at Rest (Vault Transit)                    │
│  ────────────────────────────────────────────                   │
│  • AES-256-GCM96 encryption                                     │
│  • Automatic key rotation                                       │
│  • Convergent encryption for deduplication                      │
│                                                                  │
│  Layer 3: Access Control (JWT + Vault ACL)                      │
│  ────────────────────────────────────────────                   │
│  • Role-based permissions                                       │
│  • Field-level decryption authorization                         │
│  • Session-based access                                         │
│                                                                  │
│  Layer 4: Differential Privacy (VaultGemma)                     │
│  ────────────────────────────────────────────                   │
│  • ε-bounded privacy guarantees                                 │
│  • Noise injection for evaluation                               │
│  • Training data protection                                     │
│                                                                  │
│  Layer 5: Audit Logging                                         │
│  ────────────────────────────────────────────                   │
│  • Complete operation history                                   │
│  • Tamper-evident logs                                          │
│  • Compliance reporting                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Security Principles

1. **Privacy by Design**: PII protection integrated from the ground up
2. **Defense in Depth**: Multiple overlapping security layers
3. **Least Privilege**: Minimal access rights for all operations
4. **Zero Trust**: Verify every request, encrypt everything
5. **Audit Everything**: Complete traceability for compliance

---

## PII Detection (Presidio)

### Overview

Microsoft Presidio provides automated PII detection and anonymization for all text processed by the platform.

### Supported Entity Types

| Entity Type | Description | Examples |
|-------------|-------------|----------|
| `PERSON` | Names | John Smith, Dr. Jane Doe |
| `EMAIL_ADDRESS` | Email addresses | john@example.com |
| `PHONE_NUMBER` | Phone numbers | +1-555-123-4567 |
| `CREDIT_CARD` | Credit card numbers | 4111-1111-1111-1111 |
| `US_SSN` | Social Security Numbers | 123-45-6789 |
| `US_PASSPORT` | US passport numbers | 123456789 |
| `US_DRIVER_LICENSE` | Driver's license numbers | D1234567 |
| `US_BANK_NUMBER` | Bank account numbers | 1234567890 |
| `US_ITIN` | Individual Tax ID | 912-34-5678 |
| `LOCATION` | Addresses, places | 123 Main St, New York |
| `DATE_TIME` | Dates and times | March 23, 2026 |
| `IP_ADDRESS` | IP addresses | 192.168.1.1 |
| `URL` | Web URLs | https://example.com |
| `NRP` | Nationality/Religion/Political | American, Catholic |
| `MEDICAL_LICENSE` | Medical license numbers | MD12345 |

### Configuration

```bash
# Enable PII detection
PII_REDACTION_ENABLED=true
```

### Implementation

```python
# app/core/pii_redaction.py

from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

class PIIRedactor:
    def __init__(self):
        self.analyzer = AnalyzerEngine()
        self.anonymizer = AnonymizerEngine()
    
    def detect_pii(self, text: str) -> list[dict]:
        """Detect PII entities in text."""
        results = self.analyzer.analyze(
            text=text,
            language='en',
            entities=None  # Detect all entity types
        )
        return [
            {
                "entity_type": r.entity_type,
                "start": r.start,
                "end": r.end,
                "score": r.score,
                "value": text[r.start:r.end]
            }
            for r in results
        ]
    
    def redact_pii(self, text: str) -> str:
        """Redact PII from text."""
        results = self.analyzer.analyze(text=text, language='en')
        anonymized = self.anonymizer.anonymize(text=text, analyzer_results=results)
        return anonymized.text
```

### Detection Workflow

```
Input Text: "Contact John at john@example.com or 555-123-4567"
       │
       ▼
┌──────────────────────────────────────────────┐
│           Presidio Analyzer                   │
│                                              │
│  SpaCy NLP Model: en_core_web_lg             │
│  Recognizers: EmailRecognizer,               │
│               PhoneRecognizer,               │
│               PersonRecognizer, etc.         │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│           Detection Results                   │
│                                              │
│  [                                           │
│    {"type": "PERSON", "value": "John"},      │
│    {"type": "EMAIL", "value": "john@..."},   │
│    {"type": "PHONE", "value": "555-..."}     │
│  ]                                           │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│           Output Options                      │
│                                              │
│  Redacted: "Contact <PERSON> at <EMAIL>      │
│            or <PHONE_NUMBER>"                │
│                                              │
│  OR                                          │
│                                              │
│  Encrypted: Each PII value encrypted         │
│             separately via Vault             │
└──────────────────────────────────────────────┘
```

### Customization

Add custom recognizers for domain-specific PII:

```python
from presidio_analyzer import Pattern, PatternRecognizer

# Custom employee ID recognizer
employee_id_pattern = Pattern(
    name="employee_id",
    regex=r"EMP-\d{6}",
    score=0.85
)

employee_recognizer = PatternRecognizer(
    supported_entity="EMPLOYEE_ID",
    patterns=[employee_id_pattern]
)

analyzer.registry.add_recognizer(employee_recognizer)
```

---

## HashiCorp Vault Integration

### Overview

HashiCorp Vault provides enterprise-grade secrets management and encryption-as-a-service via the Transit Secrets Engine.

### Transit Secrets Engine

The Transit engine handles cryptographic operations without exposing keys:

**Capabilities:**
- Encrypt/decrypt data
- Generate data keys
- Sign/verify data
- Generate random bytes

**Algorithm**: AES-256-GCM96 (default)

### Configuration

```bash
# Environment variables
VAULT_ENABLED=true
VAULT_URL=http://127.0.0.1:8200
VAULT_TOKEN=your-vault-token
VAULT_TRANSIT_KEY=trace-encryption-key
```

### Vault Client Implementation

```python
# app/core/vault_client.py

import hvac
import base64
from typing import Optional

class VaultClient:
    def __init__(self, url: str, token: str, transit_key: str):
        self.client = hvac.Client(url=url)
        self.client.token = token
        self.transit_key = transit_key
        self._ensure_transit_enabled()
    
    def _ensure_transit_enabled(self):
        """Enable Transit engine if not already enabled."""
        mounted_secrets = self.client.sys.list_mounted_secrets_engines()
        if 'transit/' not in mounted_secrets:
            self.client.sys.enable_secrets_engine('transit')
            self._create_encryption_key()
    
    def _create_encryption_key(self):
        """Create the encryption key."""
        self.client.secrets.transit.create_key(
            name=self.transit_key,
            convergent_encryption=True,
            derived=True
        )
    
    def encrypt(self, plaintext: str, context: str = None) -> str:
        """Encrypt plaintext using Vault Transit."""
        encoded = base64.b64encode(plaintext.encode()).decode()
        
        result = self.client.secrets.transit.encrypt_data(
            name=self.transit_key,
            plaintext=encoded,
            context=base64.b64encode(context.encode()).decode() if context else None
        )
        
        return result['data']['ciphertext']
    
    def decrypt(self, ciphertext: str, context: str = None) -> str:
        """Decrypt ciphertext using Vault Transit."""
        result = self.client.secrets.transit.decrypt_data(
            name=self.transit_key,
            ciphertext=ciphertext,
            context=base64.b64encode(context.encode()).decode() if context else None
        )
        
        return base64.b64decode(result['data']['plaintext']).decode()
    
    def get_status(self) -> dict:
        """Get Vault status information."""
        return {
            "initialized": self.client.sys.is_initialized(),
            "sealed": self.client.sys.is_sealed(),
            "transit_enabled": 'transit/' in self.client.sys.list_mounted_secrets_engines()
        }
```

### Encryption Workflow

```
                    ┌─────────────────┐
                    │   Application   │
                    │  (Plaintext)    │
                    └────────┬────────┘
                             │
                             │ API Call: encrypt
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     HashiCorp Vault                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                   Transit Engine                          │  │
│   │                                                           │  │
│   │  1. Receive plaintext (base64 encoded)                   │  │
│   │  2. Retrieve encryption key (never leaves Vault)         │  │
│   │  3. Apply AES-256-GCM96 encryption                       │  │
│   │  4. Return ciphertext                                    │  │
│   │                                                           │  │
│   │  Key Features:                                            │  │
│   │  • Keys never exposed to application                      │  │
│   │  • Automatic key versioning                               │  │
│   │  • Audit logging of all operations                        │  │
│   │                                                           │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ Response: ciphertext
                             ▼
                    ┌─────────────────┐
                    │   Application   │
                    │  (Ciphertext)   │
                    │ vault:v1:abc... │
                    └─────────────────┘
```

### Key Rotation

Vault supports automatic key rotation for enhanced security:

```python
# Rotate encryption key
client.secrets.transit.rotate_key(name=transit_key)

# Enable auto-rotation (every 30 days)
client.secrets.transit.update_key_configuration(
    name=transit_key,
    auto_rotate_period="720h"  # 30 days
)
```

### Convergent Encryption

For deterministic encryption (same input always produces same output):

```python
# Create key with convergent encryption
client.secrets.transit.create_key(
    name="pii-encryption-key",
    convergent_encryption=True,
    derived=True
)

# Encrypt with context (required for convergent encryption)
result = client.secrets.transit.encrypt_data(
    name="pii-encryption-key",
    plaintext=base64_encoded_data,
    context=base64_encoded_context  # Required!
)
```

**Use Case**: Same email address always encrypts to same ciphertext, enabling deduplication while maintaining security.

---

## VaultGemma Differential Privacy

### Overview

VaultGemma provides differential privacy guarantees for model evaluation, ensuring individual data points cannot be reverse-engineered from evaluation results.

### Differential Privacy Concepts

**ε (Epsilon)**: Privacy budget - lower values = stronger privacy

| ε Value | Privacy Level | Use Case |
|---------|---------------|----------|
| 0.1 | Very Strong | Highly sensitive data |
| 1.0 | Strong | Recommended default |
| 5.0 | Moderate | Less sensitive analysis |
| 10.0+ | Weak | Non-sensitive aggregations |

**δ (Delta)**: Probability of privacy breach

Typical value: `1e-5` (1 in 100,000)

### Configuration

```bash
VAULTGEMMA_ENABLED=true
VAULTGEMMA_MODEL=google/gemma-1.1-2b-it
```

### Implementation

```python
# app/services/vaultgemma_evaluator.py

from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import numpy as np

class VaultGemmaEvaluator:
    def __init__(self, model_name: str, epsilon: float = 1.0, delta: float = 1e-5):
        self.model = AutoModelForCausalLM.from_pretrained(model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.epsilon = epsilon
        self.delta = delta
    
    def evaluate_with_dp(self, test_cases: list, criteria: list) -> dict:
        """Run DP-protected evaluation."""
        raw_scores = self._compute_raw_scores(test_cases, criteria)
        noisy_scores = self._add_laplace_noise(raw_scores)
        
        return {
            "scores": noisy_scores,
            "privacy": {
                "epsilon": self.epsilon,
                "delta": self.delta,
                "mechanism": "laplace"
            },
            "privacy_score": self._calculate_privacy_score()
        }
    
    def _add_laplace_noise(self, scores: dict) -> dict:
        """Add Laplace noise for differential privacy."""
        sensitivity = 1.0  # Bounded score range
        scale = sensitivity / self.epsilon
        
        return {
            key: float(np.clip(value + np.random.laplace(0, scale), 0, 1))
            for key, value in scores.items()
        }
    
    def _calculate_privacy_score(self) -> int:
        """Calculate privacy score (0-100) based on ε."""
        if self.epsilon <= 0.5:
            return 100
        elif self.epsilon <= 1.0:
            return 95
        elif self.epsilon <= 2.0:
            return 85
        elif self.epsilon <= 5.0:
            return 70
        else:
            return 50
```

### Privacy Score Calculation

```
Privacy Score = f(epsilon, delta, mechanism)

Score Ranges:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Score │ ε Range  │ Meaning              │
│━━━━━━━│━━━━━━━━━━│━━━━━━━━━━━━━━━━━━━━━━│
│ 100   │ ε ≤ 0.5  │ Maximum privacy      │
│ 95    │ ε ≤ 1.0  │ Strong privacy       │
│ 85    │ ε ≤ 2.0  │ Good privacy         │
│ 70    │ ε ≤ 5.0  │ Moderate privacy     │
│ 50    │ ε > 5.0  │ Basic privacy        │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### VaultGemma Badge Display

The frontend displays privacy guarantees:

```tsx
<VaultGemmaBadge 
  privacyScore={95} 
  epsilon={1.0}
  delta={1e-5}
/>
```

Displays:
- Purple gradient badge
- "DP PROTECTED" label
- Privacy score percentage
- Tooltip with ε, δ values

---

## Authentication & Authorization

### JWT Token Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                            │
└──────────────────────────────────────────────────────────────────┘

1. User registers/logs in with email
       │
       ▼
2. System sends OTP via SMTP
       │
       ▼
3. User submits OTP
       │
       ▼
4. System validates OTP
       │
       ▼
5. JWT token issued (30-day expiry)
       │
       ▼
6. Client includes token in requests:
   Authorization: Bearer <token>
       │
       ▼
7. Backend validates token on each request
```

### Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id_123",
    "email": "user@example.com",
    "name": "John Doe",
    "iat": 1679616000,
    "exp": 1682208000
  },
  "signature": "..."
}
```

### Security Configuration

```bash
# JWT Settings
JWT_SECRET_KEY=your-32+-character-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRY_DAYS=30

# SMTP for OTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Permission Levels

| Level | Description | Capabilities |
|-------|-------------|--------------|
| `user` | Standard user | Chat, view own traces |
| `analyst` | Data analyst | View all traces, analytics |
| `admin` | Administrator | Full system access |
| `vault_user` | Vault access | Decrypt PII fields |

---

## Data Protection

### Data at Rest

| Data Type | Storage | Protection |
|-----------|---------|------------|
| User credentials | MongoDB | Hashed (bcrypt) |
| PII fields | MongoDB | Vault-encrypted |
| Chat history | MongoDB | Session-scoped |
| Traces | MongoDB | PII fields encrypted |
| Preferences | MongoDB | User ID linked |

### Data in Transit

All communication encrypted via TLS/HTTPS:

- Frontend ↔ Backend: HTTPS
- Backend ↔ MongoDB: TLS (in production)
- Backend ↔ Vault: HTTPS
- Backend ↔ LLM APIs: HTTPS

### Data Retention

```python
# OTP records: Auto-expire after 10 minutes
db.otp_records.create_index(
    "expires_at",
    expireAfterSeconds=0  # MongoDB TTL
)

# Session data: 30 days default
# Traces: Configurable retention period
# Analytics: Aggregated, indefinite
```

### Data Deletion

```python
# User data deletion (GDPR compliance)
async def delete_user_data(user_id: str):
    # Delete user record
    await db.users.delete_one({"_id": user_id})
    
    # Anonymize traces (keep for analytics)
    await db.traces.update_many(
        {"user_id": user_id},
        {"$set": {"user_id": "DELETED"}}
    )
    
    # Delete preferences
    await db.preferences.delete_many({"user_id": user_id})
```

---

## Security Best Practices

### Production Checklist

#### Vault Security
- [ ] Use production Vault cluster (not dev mode)
- [ ] Enable audit logging
- [ ] Implement key rotation policy
- [ ] Use AppRole or Kubernetes auth (not root token)
- [ ] Enable TLS for Vault communication

#### API Security
- [ ] Enable API key authentication
- [ ] Implement rate limiting
- [ ] Restrict CORS origins
- [ ] Use HTTPS only
- [ ] Validate all input

#### Database Security
- [ ] Enable MongoDB authentication
- [ ] Use TLS for connections
- [ ] Implement field-level encryption
- [ ] Regular backup encryption
- [ ] Network isolation

#### Application Security
- [ ] Strong JWT secret (64+ characters)
- [ ] Short token expiry for sensitive ops
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak internals
- [ ] Dependencies regularly updated

### Environment Configuration

```bash
# PRODUCTION SETTINGS

# Strong JWT secret
JWT_SECRET_KEY=generate-64-char-random-string-here-use-secrets-module

# Secure CORS
CORS_ORIGINS=https://yourdomain.com

# API authentication
API_KEY_REQUIRED=true
API_KEYS=prod-key-1,prod-key-2

# Vault production token (not dev-root-token!)
VAULT_TOKEN=your-production-vault-token

# Secure MongoDB
MONGODB_URL=mongodb+srv://user:securepass@cluster.mongodb.net/citrus?retryWrites=true
```

### Audit Logging

```python
# Comprehensive audit log entry
{
    "timestamp": "2026-03-23T10:00:00Z",
    "event_type": "PII_DECRYPT",
    "user_id": "user_123",
    "resource": "trace/abc123",
    "field": "user_email",
    "result": "success",
    "client_ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "session_id": "session_456"
}
```

---

## Compliance Considerations

### GDPR Compliance

| Requirement | Implementation |
|-------------|----------------|
| Right to access | Export user data endpoint |
| Right to erasure | Delete user data functionality |
| Data minimization | Only collect necessary data |
| Purpose limitation | Clear data usage documentation |
| Consent | Explicit consent at registration |
| Data breach notification | Audit logs for detection |

### HIPAA Considerations

| Safeguard | Implementation |
|-----------|----------------|
| Access controls | JWT authentication |
| Audit controls | Vault audit logging |
| Transmission security | TLS everywhere |
| Integrity controls | Checksums on sensitive data |
| Authentication | MFA via OTP |

### SOC 2 Type II Alignment

| Trust Principle | Controls |
|-----------------|----------|
| Security | Vault encryption, access controls |
| Availability | Health monitoring, redundancy |
| Processing Integrity | Input validation, audit trails |
| Confidentiality | PII detection, encryption |
| Privacy | Data minimization, consent |

---

## Security Incident Response

### Detection

Monitor for:
- Unusual decryption patterns
- Failed authentication spikes
- Anomalous API usage
- Vault audit log alerts

### Response Procedure

1. **Identify**: Determine scope and impact
2. **Contain**: Revoke compromised credentials
3. **Eradicate**: Remove threat vector
4. **Recover**: Restore normal operations
5. **Document**: Update security measures

### Contact

For security concerns:
- Security team: security@citrus.ai
- Bug bounty: security-bounty@citrus.ai

---

*Privacy & Security Documentation for Citrus LLM Evaluation Platform v2.4.0*
