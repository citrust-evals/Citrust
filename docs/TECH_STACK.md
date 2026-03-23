# Citrus LLM Evaluation Platform - Tech Stack

> **Version**: 2.4.0  
> **Last Updated**: March 2026

Complete technology stack documentation for the Citrus LLM Evaluation Platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Backend Stack](#backend-stack)
3. [Frontend Stack](#frontend-stack)
4. [Database Layer](#database-layer)
5. [Privacy & Security Stack](#privacy--security-stack)
6. [LLM Integration](#llm-integration)
7. [DevOps & Infrastructure](#devops--infrastructure)
8. [Dependencies Reference](#dependencies-reference)

---

## Overview

Citrus is built on a modern, production-ready technology stack optimized for:
- **Performance**: Async Python backend with streaming support
- **Scalability**: MongoDB for flexible document storage
- **Security**: HashiCorp Vault for enterprise-grade encryption
- **Developer Experience**: TypeScript frontend with hot module replacement

### Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| **Backend Framework** | FastAPI | Latest |
| **Frontend Framework** | React | 18.3+ |
| **Database** | MongoDB | 6.0+ |
| **Privacy Engine** | HashiCorp Vault | 1.15+ |
| **PII Detection** | Presidio | 2.2+ |
| **LLM Orchestration** | LangChain/LangGraph | Latest |

---

## Backend Stack

### Core Framework

#### FastAPI
**Purpose**: High-performance async web framework

**Key Features Used:**
- Automatic OpenAPI documentation
- Pydantic validation
- Dependency injection
- Background tasks
- WebSocket/SSE support

**Configuration Location**: `app/main.py`

```python
# FastAPI initialization
app = FastAPI(
    title="Citrus - LLM Evaluation Platform",
    version="2.4.0",
    docs_url="/docs",
    redoc_url="/redoc"
)
```

#### Uvicorn
**Purpose**: ASGI server for production deployment

**Features:**
- HTTP/1.1 and HTTP/2 support
- WebSocket support
- Hot reload in development
- Multiple worker support

**Usage:**
```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Data Validation

#### Pydantic
**Purpose**: Data validation and settings management

**Usage Patterns:**
- Request/response schemas (`app/models/schemas.py`)
- Settings configuration (`app/config.py`)
- Type coercion and validation

```python
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    name: str
```

#### Pydantic Settings
**Purpose**: Environment-based configuration

**Features:**
- `.env` file support
- Type validation
- Default values
- Case-insensitive keys

### Authentication

#### PyJWT
**Purpose**: JSON Web Token handling

**Configuration:**
```python
jwt_secret_key: str = os.getenv("JWT_SECRET_KEY")
jwt_algorithm: str = "HS256"
jwt_expiry_days: int = 30
```

**Token Structure:**
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "exp": 1679616000
}
```

### Async Support

#### Motor
**Purpose**: Async MongoDB driver

**Features:**
- Native asyncio support
- Connection pooling
- Replica set support

```python
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(mongodb_url)
db = client[database_name]
```

---

## Frontend Stack

### Core Framework

#### React 18
**Purpose**: UI component library

**Features Used:**
- Functional components
- Hooks (useState, useEffect, useContext)
- Concurrent rendering
- Automatic batching

#### TypeScript
**Purpose**: Type-safe JavaScript

**Configuration**: `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "jsx": "react-jsx"
  }
}
```

### Build Tooling

#### Vite
**Purpose**: Fast build tool and dev server

**Features:**
- Hot Module Replacement (HMR)
- ES modules in development
- Optimized production builds
- Proxy configuration

**Configuration**: `vite.config.ts`
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

### Styling

#### Tailwind CSS
**Purpose**: Utility-first CSS framework

**Configuration**: `tailwind.config.js`

**Custom Theme:**
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#caff61',
        'vault-gold': '#FFD700',
        'dp-purple': {
          dark: '#7C3AED',
          light: '#A855F7'
        }
      }
    }
  }
}
```

#### PostCSS
**Purpose**: CSS transformation

**Plugins:**
- Autoprefixer
- Tailwind CSS

### UI Components

#### Radix UI
**Purpose**: Unstyled, accessible components

**Used Components:**
- `@radix-ui/react-slot` - Composable slot component

#### Lucide React
**Purpose**: Icon library

**Usage:**
```tsx
import { Shield, Lock, Eye } from 'lucide-react';
```

#### Recharts
**Purpose**: Data visualization

**Chart Types:**
- Line charts (latency over time)
- Bar charts (model comparison)
- Area charts (token usage)
- Pie charts (preference distribution)

### Routing

#### React Router v6
**Purpose**: Client-side routing

**Routes:**
```tsx
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/chat" element={<ChatPlayground />} />
  <Route path="/evaluations" element={<EvaluationsDashboard />} />
  <Route path="/traces" element={<TracesPage />} />
  <Route path="/analytics" element={<ModelAnalytics />} />
</Routes>
```

### Testing

#### Vitest
**Purpose**: Unit testing framework

**Features:**
- Vite-native testing
- Jest-compatible API
- Fast execution

#### Testing Library
**Purpose**: Component testing

**Packages:**
- `@testing-library/react` - React component testing
- `@testing-library/jest-dom` - Custom matchers
- `@testing-library/user-event` - User interaction simulation

---

## Database Layer

### MongoDB

**Purpose**: Document database for flexible schema storage

**Version**: 6.0+

**Collections:**

| Collection | Purpose | Indexes |
|------------|---------|---------|
| `evaluations` | Evaluation results | `session_id`, `timestamp` |
| `preference_responses` | User preferences | `session_id`, `created_at` |
| `traces` | Request traces | `trace_id`, `session_id`, `timestamp` |
| `analytics` | Aggregated metrics | `date`, `model` |
| `models` | Model configurations | `name` |
| `users` | User accounts | `email` (unique) |
| `otp_records` | OTP verification | `email`, `expires_at` (TTL) |
| `evaluation_campaigns` | Campaigns | `name`, `status` |
| `evaluation_results` | Campaign results | `campaign_id`, `created_at` |
| `test_sets` | Test definitions | `name` |
| `metric_definitions` | Custom metrics | `name` |

**Connection:**
```python
# Async connection with Motor
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=citrus
```

**Driver Stack:**
- **Motor**: Async MongoDB driver (wraps PyMongo)
- **PyMongo**: Synchronous operations when needed

---

## Privacy & Security Stack

### HashiCorp Vault

**Purpose**: Secrets management and encryption

**Engine**: Transit Secrets Engine

**Features:**
- AES-256-GCM96 encryption
- Convergent encryption (deterministic)
- Key rotation
- Audit logging

**Configuration:**
```bash
VAULT_URL=http://127.0.0.1:8200
VAULT_TOKEN=dev-root-token
VAULT_TRANSIT_KEY=trace-encryption-key
```

**Python Client**: `hvac` library

```python
import hvac

client = hvac.Client(url=vault_url)
client.token = vault_token

# Encrypt
encrypted = client.secrets.transit.encrypt_data(
    name=transit_key,
    plaintext=base64_data
)

# Decrypt
decrypted = client.secrets.transit.decrypt_data(
    name=transit_key,
    ciphertext=encrypted['ciphertext']
)
```

### Presidio

**Purpose**: PII detection and anonymization

**Components:**
- `presidio-analyzer`: PII detection
- `presidio-anonymizer`: PII redaction

**Supported Entities:**
- PERSON
- EMAIL_ADDRESS
- PHONE_NUMBER
- CREDIT_CARD
- US_SSN
- LOCATION
- DATE_TIME
- NRP (Nationality/Religion/Political)

**SpaCy Model**: `en_core_web_lg`

```bash
python -m spacy download en_core_web_lg
```

### VaultGemma

**Purpose**: Privacy-preserving model evaluation

**Model**: `google/gemma-1.1-2b-it`

**Libraries:**
- `transformers` - Model loading and inference
- `torch` - PyTorch backend

**Privacy Guarantees:**
- ε (epsilon) - Privacy budget
- δ (delta) - Failure probability

---

## LLM Integration

### LangChain

**Purpose**: LLM application framework

**Components Used:**
- `langchain-core`: Base abstractions
- `langchain-google-genai`: Google/Gemini integration

**Key Concepts:**
- Prompts and templates
- Output parsers
- Memory management

### LangGraph

**Purpose**: Stateful, cyclic LLM workflows

**Features:**
- Graph-based workflows
- State management
- Conditional branching
- Parallel execution

**Workflow Definition:**
```python
from langgraph.graph import StateGraph

graph = StateGraph(ChatState)
graph.add_node("model_1", generate_response_1)
graph.add_node("model_2", generate_response_2)
graph.add_edge(START, "model_1")
graph.add_edge(START, "model_2")
```

### Google Generative AI

**Purpose**: Gemini model access

**Library**: `google-generativeai`

**Supported Models:**
- `gemini-2.5-flash` - Fast, cost-effective
- `gemini-2.5-pro` - High quality, comprehensive
- `gemini-1.5-pro` - Previous generation

### Token Counting

**Library**: `tiktoken`

**Purpose**: Accurate token counting for:
- Usage tracking
- Cost estimation
- Context window management

---

## DevOps & Infrastructure

### Containerization

#### Docker
**Purpose**: Application containerization

**Backend Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_lg

COPY app/ ./app/
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Docker Compose
**Purpose**: Multi-container orchestration

**Services:**
- `vault`: HashiCorp Vault
- `mongodb`: Database (optional)
- `backend`: FastAPI application
- `frontend`: React application

### Development Tools

#### Code Quality

**Python:**
- `black` - Code formatting
- `flake8` - Linting
- `mypy` - Type checking

**JavaScript/TypeScript:**
- `eslint` - Linting
- `prettier` - Formatting (via ESLint)

#### Testing

**Python:**
- `pytest` - Test framework
- `pytest-asyncio` - Async test support
- `httpx` - Async HTTP client for testing

**JavaScript:**
- `vitest` - Test runner
- `@vitest/ui` - Test UI

---

## Dependencies Reference

### Backend Dependencies (`app/requirements.txt`)

```text
# Web Framework
fastapi
uvicorn[standard]
python-multipart

# Database
motor
pymongo

# Configuration
pydantic[email]
pydantic-settings
python-dotenv

# LLM Integration
langgraph
langchain-core
langchain-google-genai
google-generativeai
tiktoken

# Authentication
PyJWT

# Privacy & Security
hvac>=1.2.1
presidio-analyzer>=2.2.0
presidio-anonymizer>=2.2.0
transformers>=4.36.0
torch>=2.1.0
spacy>=3.7.0

# Testing
pytest
pytest-asyncio
httpx

# Development
black
flake8
mypy

# Logging
python-json-logger
```

### Frontend Dependencies (`citrus_frontend/package.json`)

```json
{
  "dependencies": {
    "@radix-ui/react-slot": "^1.2.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.427.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.1",
    "recharts": "^2.12.7",
    "tailwind-merge": "^3.5.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "@vitest/ui": "^4.1.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.9.0",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.9",
    "happy-dom": "^20.8.4",
    "jsdom": "^29.0.1",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.3",
    "vite": "^5.4.1",
    "vitest": "^4.1.0"
  }
}
```

---

## Version Compatibility Matrix

| Component | Minimum Version | Recommended Version |
|-----------|-----------------|---------------------|
| Python | 3.9 | 3.11+ |
| Node.js | 18 | 20 LTS |
| MongoDB | 6.0 | 7.0+ |
| Docker | 20.10 | 24+ |
| Vault | 1.12 | 1.15+ |

---

## System Requirements

### Development Environment

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 10 GB | 20+ GB |
| OS | Windows 10/macOS 12/Ubuntu 20.04 | Latest LTS |

### Production Environment

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Storage | 50 GB SSD | 100+ GB NVMe |
| Network | 100 Mbps | 1 Gbps |

---

*Documentation for Citrus LLM Evaluation Platform v2.4.0*
