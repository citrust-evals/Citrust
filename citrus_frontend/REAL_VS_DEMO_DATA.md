# Privacy Components - Real Data vs. Demo Data

## ✅ Updated: Now Using Real Data!

The privacy components have been updated to fetch **real trace data** from your existing API.

---

## What's Using REAL Data

### 1. **Trace List** (/traces page)
- ✅ Fetches from `getTraces()` API
- ✅ Shows all your actual traces
- ✅ Auto-refreshes every 10 seconds
- ✅ Displays real metrics (latency, tokens, status)
- ✅ Real trace IDs, names, timestamps

### 2. **Trace Details Modal**
- ✅ Fetches from `getTrace(traceId, includeSpans: true)`
- ✅ Shows real span data
- ✅ Real input/output data
- ✅ Real token usage
- ✅ Real latency metrics

### 3. **PII Masking** (Currently Simulated)
- ⚠️ **Needs Backend Integration:**
  - Currently assumes all traces have `has_pii: false` (no masking)
  - You need to add PII detection (Presidio) to your backend
  - Set `has_pii: true` on spans that contain PII
  - Set `pii_fields: ['user.email']` array

---

## What's Still Demo Data

### 1. **Evaluations Tab**
- 📊 Shows 3 hardcoded sample evaluations
- **Why:** Your evaluations might not have privacy scores yet
- **To Use Real Data:** Fetch from your evaluations API and add privacy_score field

### 2. **Privacy Audit View**
- 📊 Hardcoded comparison metrics
- 📊 Simulated leakage attacks
- **Why:** Demonstrates the concept without requiring VaultGemma
- **To Use Real Data:** Connect to actual VaultGemma evaluation API

### 3. **Security Dashboard**
- 📊 Simulated Vault metrics
- 📊 Fake audit stream
- **Why:** Demonstrates real-time monitoring without Vault setup
- **To Use Real Data:** Connect to actual HashiCorp Vault API

---

## How to Connect Real Privacy Data

### Step 1: Add PII Detection to Backend

```python
# In your trace ingestion code
from presidio_analyzer import AnalyzerEngine

analyzer = AnalyzerEngine()

def detect_pii(text: str) -> dict:
    results = analyzer.analyze(text=text, language='en')
    return {
        'has_pii': len(results) > 0,
        'pii_fields': [result.entity_type for result in results]
    }

# When creating a span
span_data = {
    ...
    'has_pii': detect_pii(str(span.input)).get('has_pii'),
    'pii_fields': detect_pii(str(span.input)).get('pii_fields'),
}
```

### Step 2: Add Privacy Score to Traces

```python
# When storing traces
trace_data = {
    ...
    'privacy_score': 100 if all_pii_encrypted else calculate_score(),
    'vault_processed': vault_encryption_enabled,
}
```

### Step 3: Connect to Real Vault (Optional)

Update `PrivacyContext.tsx`:

```typescript
const VAULT_API = 'https://your-vault-instance.com';
const VAULT_TOKEN = localStorage.getItem('vault_token');

async function decryptField(ciphertext: string) {
  const response = await fetch(`${VAULT_API}/v1/transit/decrypt/citrus-key`, {
    method: 'POST',
    headers: {
      'X-Vault-Token': VAULT_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ciphertext }),
  });
  const data = await response.json();
  return atob(data.data.plaintext); // Base64 decode
}
```

---

## Current Behavior

### When You Navigate to /traces:

1. **Page loads** → Fetches real traces from your API
2. **Displays trace cards** → Shows YOUR actual trace data
3. **Click a trace** → Opens modal with real span details
4. **PII fields** → Currently shows unmasked (no backend PII detection yet)
5. **Privacy score** → Defaults to 100% for all traces
6. **Click Security Dashboard** → Shows simulated Vault monitoring

### What You'll See Right Now:

```
Your Real Traces:
├── Trace 1: "Your Actual Trace Name"
│   ├── Real latency: XXXms
│   ├── Real tokens: XXX
│   ├── Real spans: X
│   └── Privacy: 100% (default)
│
├── Trace 2: "Another Real Trace"
│   └── ... (real data)
│
└── ... (all your traces)

Evaluations Tab:
├── Demo Evaluation 1 (hardcoded)
├── Demo Evaluation 2 (hardcoded)
└── Demo Evaluation 3 (hardcoded)

Privacy Audit Tab:
└── Comparison demo (hardcoded)
```

---

## To Get Full Privacy Features Working:

### Backend Changes Needed:

1. **Add PII Detection:**
   ```bash
   pip install presidio-analyzer presidio-anonymizer
   ```

2. **Update Trace Model:**
   ```python
   class Trace(BaseModel):
       ...
       privacy_score: Optional[int] = 100
       vault_processed: Optional[bool] = False
   
   class TraceSpan(BaseModel):
       ...
       has_pii: Optional[bool] = False
       pii_fields: Optional[List[str]] = []
   ```

3. **Integrate Vault (Optional):**
   - Install HashiCorp Vault
   - Enable Transit secrets engine
   - Encrypt PII before storage
   - Decrypt on authorized access

### Frontend Changes (Already Done!):

- ✅ Trace fetching from API
- ✅ Privacy score display
- ✅ PII masking components
- ✅ Click-to-decrypt functionality
- ✅ Security dashboard UI
- ✅ All animations and styling

---

## Summary

| Feature | Status | Data Source |
|---------|--------|-------------|
| Trace List | ✅ **REAL** | Your API (`getTraces()`) |
| Trace Details | ✅ **REAL** | Your API (`getTrace()`) |
| Span Data | ✅ **REAL** | Your API (included in trace) |
| PII Masking | ⚠️ **Needs Backend** | Waiting for `has_pii` flag |
| Vault Decryption | ⚠️ **Needs Vault Setup** | Optional enhancement |
| Privacy Scores | ⚠️ **Defaults to 100%** | Needs backend calculation |
| Evaluations | 📊 **DEMO** | Hardcoded samples |
| Privacy Audit | 📊 **DEMO** | Hardcoded comparison |
| Security Dashboard | 📊 **DEMO** | Simulated metrics |

---

## Next Steps

1. **See Your Real Traces:**
   - Navigate to http://localhost:5173/traces
   - Login if needed
   - You'll see all your actual traces!

2. **Add PII Detection:**
   - Follow "Step 1" above to add Presidio
   - Traces with PII will show masked fields

3. **Optional: Setup Vault:**
   - Install HashiCorp Vault locally
   - Configure Transit engine
   - Update PrivacyContext with real endpoints

**Your privacy UI is now displaying real trace data from your API!** 🎉
