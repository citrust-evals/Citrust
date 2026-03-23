# Citrus LLM Evaluation Platform - Features

> **Version**: 2.4.0  
> **Last Updated**: March 2026

Complete feature documentation for the Citrus LLM Evaluation Platform.

---

## Table of Contents

1. [Core Features](#core-features)
2. [Chat Playground](#chat-playground)
3. [Evaluation System](#evaluation-system)
4. [Tracing & Analytics](#tracing--analytics)
5. [Privacy & Security](#privacy--security)
6. [User Management](#user-management)
7. [Frontend Features](#frontend-features)

---

## Core Features

### Dual Model Comparison

Compare responses from two different LLM models side-by-side in real-time.

**Capabilities:**
- **Real-time Streaming**: Server-Sent Events (SSE) for live response streaming
- **Multiple Model Support**: Gemini, GPT-4, Claude, and custom models
- **Configurable Parameters**: Temperature, max tokens, and model-specific settings
- **Session Management**: Persistent chat sessions with history tracking

**How It Works:**
1. User sends a message
2. System routes to two different models simultaneously
3. Responses stream back in parallel
4. User can compare and select preferred response

### Preference Learning

Collect and analyze user preferences to understand model performance from a human perspective.

**Features:**
- **Binary Choice**: Select preferred response (Response A or Response B)
- **Optional Reasoning**: Users can explain their preference
- **Aggregated Analytics**: View preference trends across sessions
- **Tie Detection**: Handle cases where both responses are equally good

### Real-time Tracing

Track every API call, token usage, and latency at the span level.

**Tracked Metrics:**
- Request/response timestamps
- Token usage (prompt, completion, total)
- Latency measurements (P50, P95, P99)
- Error tracking and categorization
- Model metadata and parameters

### Performance Analytics

Dashboard-ready metrics and insights for model evaluation.

**Analytics Include:**
- Total evaluations count
- Average response latency
- Token usage statistics
- Model comparison metrics
- Preference distribution charts

---

## Chat Playground

The interactive chat interface for model comparison and evaluation.

### Features

| Feature | Description |
|---------|-------------|
| **Dual Response View** | Side-by-side display of two model responses |
| **Streaming Support** | Real-time token streaming with SSE |
| **Code Highlighting** | Syntax highlighting for code blocks |
| **Markdown Rendering** | Full markdown support in responses |
| **Session Persistence** | Chat history maintained across page reloads |
| **Export Capability** | Export conversations for analysis |

### Chat Message Flow

```
User Input
    │
    ▼
┌─────────────────┐
│  Backend API    │
│  /dual-responses│
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Model 1│ │Model 2│
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│   SSE Stream    │
│   to Frontend   │
└─────────────────┘
```

### Model Configuration

Default models can be configured via environment variables:

```bash
MODEL_1=gemini-2.5-flash    # Fast, cost-effective
MODEL_2=gemini-2.5-pro      # Higher quality, comprehensive
```

---

## Evaluation System

### Evaluation Campaigns

Organize and run systematic model evaluations.

**Campaign Features:**
- Create named evaluation campaigns
- Associate with specific test sets
- Track progress and completion status
- Store aggregated metrics

### Test Sets

Define reusable test sets for consistent evaluation.

**Test Set Components:**
- Input prompts/questions
- Expected outputs (optional)
- Evaluation criteria
- Metadata and tags

### Metric Definitions

Customize evaluation metrics for your use case.

**Built-in Metrics:**
- Accuracy
- F1 Score
- Latency (P50, P95, P99)
- Token efficiency
- Privacy score

**Custom Metrics:**
- Define custom evaluation functions
- Weighted scoring systems
- Domain-specific criteria

### Evaluation Results

Detailed results storage and analysis.

**Result Data:**
- Individual response scores
- Aggregated campaign metrics
- Statistical analysis
- Comparison reports

---

## Tracing & Analytics

### Trace Collection

Comprehensive request tracing for debugging and analysis.

**Trace Data Structure:**
```json
{
  "trace_id": "unique-trace-id",
  "session_id": "user-session-id",
  "user_id": "authenticated-user-id",
  "name": "dual-response-generation",
  "status": "success",
  "start_time": "2026-03-23T10:00:00Z",
  "end_time": "2026-03-23T10:00:02Z",
  "total_latency_ms": 2000,
  "total_token_usage": {
    "prompt_tokens": 150,
    "completion_tokens": 500,
    "total_tokens": 650
  },
  "spans": [...],
  "metadata": {...}
}
```

### Span-Level Details

Each trace contains detailed spans for sub-operations.

**Span Types:**
- `llm_call`: LLM API invocations
- `tool_call`: External tool executions
- `database`: Database operations
- `encryption`: Vault operations
- `pii_detection`: PII scanning

### Analytics Dashboard

Real-time and historical analytics.

**Dashboard Widgets:**
- Request volume over time
- Latency percentiles chart
- Token usage breakdown
- Error rate monitoring
- Model performance comparison

### Statistics Endpoints

**Available Statistics:**
- `/api/v1/traces/statistics` - Aggregated trace statistics
- `/api/v1/models/performance` - Model-specific metrics
- `/api/v1/analytics/realtime` - Live dashboard data

---

## Privacy & Security

### PII Detection (Presidio)

Automatic detection of Personally Identifiable Information.

**Detected PII Types:**
| Type | Examples |
|------|----------|
| `EMAIL` | john.doe@company.com |
| `PHONE_NUMBER` | +1-555-123-4567 |
| `CREDIT_CARD` | 4111-1111-1111-1111 |
| `SSN` | 123-45-6789 |
| `PERSON` | John Smith |
| `LOCATION` | 123 Main St, New York |
| `DATE_TIME` | March 23, 2026 |

**Configuration:**
```bash
PII_REDACTION_ENABLED=true
```

### HashiCorp Vault Integration

Enterprise-grade encryption using Vault Transit Engine.

**Vault Features:**
- AES-256-GCM96 encryption
- Automatic key rotation
- Audit logging
- Convergent encryption for deterministic results

**Workflow:**
1. PII detected in request/response
2. Sensitive data sent to Vault for encryption
3. Encrypted ciphertext stored in database
4. Decryption on-demand with authorization

### VaultGemma Privacy-Preserving Evaluation

Differential privacy for model evaluation.

**Features:**
- ε-bounded privacy guarantees
- δ-secure evaluation
- Privacy score calculation (0-100)
- Training data protection

**Configuration:**
```bash
VAULTGEMMA_ENABLED=true
VAULTGEMMA_MODEL=google/gemma-1.1-2b-it
```

### Security Dashboard

Real-time security infrastructure monitoring.

**Monitored Metrics:**
- Vault Transit Engine status
- Key rotation countdown
- Encryption/decryption operations
- Audit event stream
- Average operation latency

---

## User Management

### Authentication

JWT-based authentication with OTP verification.

**Auth Flow:**
1. User registers with email
2. OTP sent via SMTP
3. User verifies OTP
4. JWT token issued (30-day expiry)

### User Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Request OTP |
| `/api/auth/verify-otp` | POST | Verify OTP, get token |
| `/api/auth/me` | GET | Get current user info |

### Session Management

- Session ID tracking across requests
- Chat history per session
- Preference data linked to sessions
- Trace data associated with users

---

## Frontend Features

### Pages

| Page | Route | Description |
|------|-------|-------------|
| **Landing Page** | `/` | Platform introduction |
| **Login** | `/login` | Authentication |
| **Chat Playground** | `/chat` | Model comparison interface |
| **Evaluations Dashboard** | `/evaluations` | Evaluation campaigns |
| **Traces** | `/traces` | Trace explorer |
| **Privacy Traces** | `/privacy` | Privacy-focused trace view |
| **Model Analytics** | `/analytics` | Performance metrics |
| **Settings** | `/settings` | Configuration |

### UI Components

**Core Components:**
- `Header` - Navigation and user controls
- `Sidebar` - Page navigation
- `ChatMessage` - Message display with markdown
- `MetricCard` - Statistics display
- `StatusBadge` - Status indicators

**Privacy Components:**
- `MaskedField` - PII masking with click-to-reveal
- `VaultGemmaBadge` - DP protection indicator
- `PrivacyBadge` - Privacy status display
- `SecurityDashboard` - Vault monitoring
- `PrivacyAuditView` - Leakage comparison

### Design System

**Color Palette:**
- Primary: `#caff61` (Citrus Green)
- Vault Gold: `#FFD700`
- DP Purple: `#7C3AED` - `#A855F7`
- Background: `#0A0E12`

**Typography:**
- Display: Space Grotesk
- Monospace: JetBrains Mono

**Effects:**
- Glass-morphism panels
- Animated gradient borders
- Vault glow effects
- Particle reveal animations

### Responsive Design

Fully responsive across devices:
- Desktop (1920px+)
- Laptop (1280px)
- Tablet (768px)
- Mobile (375px+)

---

## Feature Comparison

### Standard vs. Privacy-Enhanced Mode

| Feature | Standard | Privacy-Enhanced |
|---------|----------|------------------|
| Response Generation | Yes | Yes |
| Preference Collection | Yes | Yes |
| PII Detection | No | Yes |
| Vault Encryption | No | Yes |
| VaultGemma DP | No | Yes |
| Audit Trail | Basic | Comprehensive |
| Privacy Score | N/A | 0-100 |

---

## Roadmap

Planned features for future releases:

- [ ] Support for additional LLM providers (Cohere, AI21)
- [ ] Advanced A/B testing framework
- [ ] Custom evaluation metric builder
- [ ] Real-time collaboration features
- [ ] Export to popular formats (CSV, JSON, JSONL)
- [ ] Webhook integrations
- [ ] Multi-tenant support
- [ ] RBAC (Role-Based Access Control)

---

*Documentation for Citrus LLM Evaluation Platform v2.4.0*
