# Citrus LLM Evaluation Platform - Architecture

> **Version**: 2.4.0  
> **Last Updated**: March 2026

System architecture, design patterns, and component interactions.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Data Flow](#data-flow)
6. [Privacy Architecture](#privacy-architecture)
7. [Design Patterns](#design-patterns)
8. [Scalability Considerations](#scalability-considerations)

---

## System Overview

Citrus follows a modern three-tier architecture with additional privacy layers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CITRUS PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐           │
│   │   FRONTEND   │     │   BACKEND    │     │   PRIVACY    │           │
│   │   (React)    │────▶│  (FastAPI)   │────▶│   LAYER      │           │
│   │   Port 5173  │     │  Port 8000   │     │   (Vault)    │           │
│   └──────────────┘     └──────┬───────┘     └──────────────┘           │
│                               │                     │                    │
│                               ▼                     ▼                    │
│                        ┌──────────────┐     ┌──────────────┐           │
│                        │   DATABASE   │     │   LLM APIs   │           │
│                        │  (MongoDB)   │     │  (Gemini)    │           │
│                        │  Port 27017  │     │              │           │
│                        └──────────────┘     └──────────────┘           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Separation of Concerns**: Clear boundaries between presentation, business logic, and data
2. **Privacy by Design**: PII protection integrated at every layer
3. **Async-First**: Non-blocking operations for optimal performance
4. **API-First**: Well-defined REST APIs with OpenAPI documentation
5. **Observability**: Comprehensive tracing and monitoring

---

## High-Level Architecture

### Component Diagram

```
                              ┌─────────────────┐
                              │     Browser     │
                              │   (React SPA)   │
                              └────────┬────────┘
                                       │
                                       │ HTTPS
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              API Gateway Layer                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                         FastAPI Application                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │  │
│  │  │   Auth   │  │  Eval    │  │  Traces  │  │    Middleware    │   │  │
│  │  │  Router  │  │  Router  │  │  Router  │  │  (CORS, Timing)  │   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            │                          │                          │
            ▼                          ▼                          ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Service Layer   │     │  Privacy Layer   │     │   Data Layer     │
│                  │     │                  │     │                  │
│  ┌────────────┐  │     │  ┌────────────┐  │     │  ┌────────────┐  │
│  │   Graph    │  │     │  │   Vault    │  │     │  │  MongoDB   │  │
│  │  Service   │  │     │  │   Client   │  │     │  │   Client   │  │
│  └────────────┘  │     │  └────────────┘  │     │  └────────────┘  │
│  ┌────────────┐  │     │  ┌────────────┐  │     │  ┌────────────┐  │
│  │   Model    │  │     │  │    PII     │  │     │  │   Trace    │  │
│  │  Client    │  │     │  │ Redaction  │  │     │  │  Storage   │  │
│  └────────────┘  │     │  └────────────┘  │     │  └────────────┘  │
│  ┌────────────┐  │     │  ┌────────────┐  │     │                  │
│  │ Evaluation │  │     │  │ VaultGemma │  │     │                  │
│  │  Runner    │  │     │  │ Evaluator  │  │     │                  │
│  └────────────┘  │     │  └────────────┘  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
            │                          │
            ▼                          ▼
┌──────────────────┐     ┌──────────────────┐
│   External APIs  │     │   HashiCorp      │
│                  │     │      Vault       │
│  ┌────────────┐  │     │                  │
│  │   Gemini   │  │     │  Transit Engine  │
│  │   API      │  │     │                  │
│  └────────────┘  │     └──────────────────┘
│  ┌────────────┐  │
│  │   OpenAI   │  │
│  │   API      │  │
│  └────────────┘  │
└──────────────────┘
```

---

## Backend Architecture

### Directory Structure

```
app/
├── __init__.py
├── config.py              # Settings and configuration
├── main.py                # FastAPI application entry point
│
├── core/                  # Core infrastructure
│   ├── __init__.py
│   ├── database.py        # MongoDB connection manager
│   ├── vault_client.py    # HashiCorp Vault integration
│   ├── pii_redaction.py   # Presidio PII detection
│   ├── tracing.py         # Request tracing
│   ├── trace_storage.py   # Trace persistence
│   └── model_wrappers.py  # LLM client abstractions
│
├── models/                # Pydantic schemas
│   ├── __init__.py
│   ├── schemas.py         # General schemas
│   ├── user_schemas.py    # User/auth schemas
│   ├── state.py           # LangGraph state
│   ├── evaluation_schemas.py  # Evaluation schemas
│   └── trace_schemas.py   # Trace schemas
│
├── routers/               # API endpoints
│   ├── __init__.py
│   ├── auth.py            # Authentication routes
│   ├── evaluations.py     # Chat/evaluation routes
│   └── traces.py          # Analytics routes
│
├── services/              # Business logic
│   ├── __init__.py
│   ├── graph.py           # LangGraph workflow
│   ├── model_client.py    # LLM API client
│   ├── evaluation_runner.py   # Evaluation orchestration
│   └── vaultgemma_evaluator.py  # DP evaluation
│
└── tests/                 # Test suite
    └── ...
```

### Layer Responsibilities

#### 1. Routers Layer (API Layer)
- Request validation
- Response serialization
- Route handling
- Error responses

```python
# app/routers/evaluations.py
@router.post("/dual-responses")
async def get_dual_responses(
    request: ChatRequest,
    db = Depends(get_database)
) -> StreamingResponse:
    # Delegate to service layer
    return await evaluation_service.generate_dual_responses(request)
```

#### 2. Services Layer (Business Logic)
- Core application logic
- LLM orchestration
- Data transformation
- Cross-cutting concerns

```python
# app/services/graph.py
class ChatGraph:
    def __init__(self):
        self.graph = StateGraph(ChatState)
        self._build_graph()
    
    async def invoke(self, message: str, history: list):
        # Business logic here
        pass
```

#### 3. Core Layer (Infrastructure)
- Database connections
- External service clients
- Shared utilities

```python
# app/core/database.py
class MongoDB:
    client: AsyncIOMotorClient = None
    database: AsyncIOMotorDatabase = None
    
    async def connect(self):
        self.client = AsyncIOMotorClient(settings.mongodb_url)
        self.database = self.client[settings.database_name]
```

#### 4. Models Layer (Data Contracts)
- Request/response schemas
- Database models
- Validation rules

```python
# app/models/schemas.py
class ChatRequest(BaseModel):
    user_message: str
    chat_history: list[ChatMessage] = []
    session_id: str
    temperature: float = 0.7
```

### Request Lifecycle

```
1. Request Received
       │
       ▼
2. Middleware (CORS, Timing)
       │
       ▼
3. Router Handler
       │
       ▼
4. Dependency Injection
       │
       ▼
5. Service Layer
       │
       ├──▶ Privacy Layer (PII Check)
       │
       ├──▶ LLM Service (Generate)
       │
       └──▶ Data Layer (Store)
       │
       ▼
6. Response Serialization
       │
       ▼
7. Response Sent
```

---

## Frontend Architecture

### Directory Structure

```
citrus_frontend/
├── src/
│   ├── main.tsx              # Application entry
│   ├── App.tsx               # Root component & routing
│   ├── index.css             # Global styles
│   ├── utils.ts              # Utility functions
│   │
│   ├── api.ts                # Legacy API client
│   ├── api_auth.ts           # Auth API client
│   ├── api_evaluations.ts    # Evaluations API client
│   ├── api_analytics.ts      # Analytics API client
│   │
│   ├── context/              # React Context providers
│   │   └── PrivacyContext.tsx
│   │
│   ├── components/           # Reusable components
│   │   ├── ui/               # Base UI components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MaskedField.tsx
│   │   ├── VaultGemmaBadge.tsx
│   │   └── ...
│   │
│   ├── pages/                # Page components
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ChatPlayground.tsx
│   │   ├── EvaluationsDashboard.tsx
│   │   ├── TracesPage.tsx
│   │   ├── ModelAnalytics.tsx
│   │   └── SettingsPage.tsx
│   │
│   └── lib/                  # Shared libraries
│       └── utils.ts
│
├── public/                   # Static assets
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### Component Architecture

```
App
├── PrivacyProvider           # Global privacy state
│   └── BrowserRouter         # Routing
│       ├── Header            # Navigation
│       ├── Sidebar           # Side navigation
│       └── Routes
│           ├── LandingPage
│           ├── LoginPage
│           ├── ChatPlayground
│           │   ├── ChatMessage
│           │   └── FeedbackControls
│           ├── EvaluationsDashboard
│           │   ├── EvaluationCard
│           │   └── EvaluationDetailView
│           ├── TracesPage
│           │   ├── TraceDetailView
│           │   └── MaskedField
│           ├── PrivacyTracesPage
│           │   ├── SecurityDashboard
│           │   ├── PrivacyAuditView
│           │   └── VaultGemmaBadge
│           └── ModelAnalytics
│               └── MetricCard
```

### State Management

**Context-based State:**
```tsx
// Privacy Context
const PrivacyContext = createContext<PrivacyContextType>(null);

interface PrivacyContextType {
  isPrivacyModeEnabled: boolean;
  togglePrivacyMode: () => void;
  revealedFields: Set<string>;
  decryptField: (fieldId: string) => Promise<void>;
}
```

**Local Component State:**
```tsx
// Page-level state
const [traces, setTraces] = useState<Trace[]>([]);
const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
const [isLoading, setIsLoading] = useState(true);
```

### API Layer Pattern

```typescript
// api_evaluations.ts
const API_BASE = '/api/v1';

export const evaluationsApi = {
  getDualResponses: async (request: ChatRequest): Promise<Response> => {
    return fetch(`${API_BASE}/evaluations/dual-responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  },
  
  storePreference: async (preference: PreferenceData): Promise<void> => {
    await fetch(`${API_BASE}/evaluations/store-preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preference),
    });
  },
};
```

---

## Data Flow

### Dual Response Generation Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                     DUAL RESPONSE FLOW                                │
└──────────────────────────────────────────────────────────────────────┘

User Input: "Explain quantum computing"
       │
       ▼
┌──────────────────┐
│  ChatPlayground  │
│     (React)      │
└────────┬─────────┘
         │ POST /api/v1/evaluations/dual-responses
         ▼
┌──────────────────┐
│   Evaluations    │
│     Router       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   PII Detection  │ ──── Presidio scans for PII
│   (if enabled)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    LangGraph     │
│    Workflow      │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Model 1│ │Model 2│
│(Flash)│ │ (Pro) │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ▼
┌──────────────────┐
│   SSE Stream     │
│   Generator      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Trace Storage   │ ──── Store trace in MongoDB
│   (async)        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Frontend SSE    │
│    Handler       │
└──────────────────┘
         │
         ▼
Display: Response 1 | Response 2
```

### Preference Storage Flow

```
User selects "Response 1"
       │
       ▼
┌──────────────────┐
│ FeedbackControls │
│    Component     │
└────────┬─────────┘
         │ POST /api/v1/evaluations/store-preference
         ▼
┌──────────────────┐
│   Evaluations    │
│     Router       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Preference     │
│   Validation     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    MongoDB       │
│  (preferences)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Analytics       │
│  Aggregation     │
└──────────────────┘
```

---

## Privacy Architecture

### PII Protection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRIVACY PROTECTION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

Input: "My email is john@example.com and SSN is 123-45-6789"
       │
       ▼
┌──────────────────────────────────────────────┐
│              Presidio Analyzer               │
│                                              │
│  Detected entities:                          │
│  - EMAIL_ADDRESS: john@example.com           │
│  - US_SSN: 123-45-6789                       │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│              Vault Transit Engine            │
│                                              │
│  Encrypt each PII entity:                    │
│  - email → vault:v1:abc123...                │
│  - ssn → vault:v1:def456...                  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│              Data Storage                    │
│                                              │
│  Stored: "My email is [ENCRYPTED:email:1]   │
│           and SSN is [ENCRYPTED:ssn:2]"     │
│                                              │
│  Encryption map stored separately            │
└──────────────────────────────────────────────┘
                       │
                       │ On authorized retrieval
                       ▼
┌──────────────────────────────────────────────┐
│              Vault Decryption                │
│                                              │
│  Authorized user clicks "Reveal"             │
│  → Decrypt via Vault Transit                 │
│  → Display with audit logging                │
└──────────────────────────────────────────────┘
```

### Security Layers

```
                    ┌─────────────────────┐
                    │    Application      │
                    │    (Business Data)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   PII Detection     │
                    │    (Presidio)       │
                    │ Identifies sensitive│
                    │      data           │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Encryption        │
                    │ (Vault Transit)     │
                    │ AES-256-GCM96       │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Access Control    │
                    │  (JWT + Vault ACL)  │
                    │ Who can decrypt?    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Audit Logging     │
                    │ (Vault Audit Log)   │
                    │ Who accessed what?  │
                    └─────────────────────┘
```

---

## Design Patterns

### 1. Repository Pattern (Data Layer)

```python
# Abstraction for data access
class TraceRepository:
    def __init__(self, collection):
        self.collection = collection
    
    async def save(self, trace: Trace) -> str:
        result = await self.collection.insert_one(trace.dict())
        return str(result.inserted_id)
    
    async def find_by_id(self, trace_id: str) -> Optional[Trace]:
        doc = await self.collection.find_one({"trace_id": trace_id})
        return Trace(**doc) if doc else None
```

### 2. Service Layer Pattern

```python
# Business logic encapsulation
class EvaluationService:
    def __init__(self, trace_repo, model_client, privacy_service):
        self.trace_repo = trace_repo
        self.model_client = model_client
        self.privacy_service = privacy_service
    
    async def generate_dual_responses(self, request: ChatRequest):
        # Orchestrate multiple components
        sanitized = await self.privacy_service.scan(request.message)
        responses = await self.model_client.dual_generate(sanitized)
        await self.trace_repo.save(trace)
        return responses
```

### 3. Provider Pattern (React)

```tsx
// Context provider for cross-cutting concerns
export const PrivacyProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [isPrivacyMode, setPrivacyMode] = useState(true);
  const [revealedFields, setRevealedFields] = useState(new Set<string>());
  
  const value = {
    isPrivacyModeEnabled: isPrivacyMode,
    togglePrivacyMode: () => setPrivacyMode(prev => !prev),
    revealedFields,
    decryptField: async (fieldId: string) => { /* ... */ },
  };
  
  return (
    <PrivacyContext.Provider value={value}>
      {children}
    </PrivacyContext.Provider>
  );
};
```

### 4. Factory Pattern (LLM Clients)

```python
# Create appropriate model client based on configuration
class ModelClientFactory:
    @staticmethod
    def create(model_name: str) -> BaseModelClient:
        if model_name.startswith("gemini"):
            return GeminiClient(model_name)
        elif model_name.startswith("gpt"):
            return OpenAIClient(model_name)
        elif model_name.startswith("claude"):
            return AnthropicClient(model_name)
        raise ValueError(f"Unknown model: {model_name}")
```

### 5. Observer Pattern (SSE Streaming)

```python
# Publish-subscribe for streaming responses
async def stream_responses(request: ChatRequest):
    async def event_generator():
        async for chunk in model.astream(request.message):
            yield {
                "event": "token",
                "data": json.dumps({"content": chunk})
            }
        yield {"event": "done", "data": ""}
    
    return EventSourceResponse(event_generator())
```

---

## Scalability Considerations

### Horizontal Scaling

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │    (nginx)      │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │ Backend  │      │ Backend  │      │ Backend  │
    │ Instance │      │ Instance │      │ Instance │
    │    1     │      │    2     │      │    3     │
    └────┬─────┘      └────┬─────┘      └────┬─────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                    ┌──────▼──────┐
                    │   MongoDB   │
                    │  Replica    │
                    │    Set      │
                    └─────────────┘
```

### Caching Strategy

```
Request → Check Cache → Cache Hit? → Return Cached
              │                ↓ No
              │         Generate Response
              │                ↓
              └──────── Cache Response
                              ↓
                       Return Response
```

### Database Indexing

```javascript
// Performance-critical indexes
db.traces.createIndex({ "session_id": 1, "timestamp": -1 });
db.traces.createIndex({ "user_id": 1 });
db.traces.createIndex({ "status": 1, "created_at": -1 });

// TTL index for OTP records
db.otp_records.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });
```

### Connection Pooling

```python
# MongoDB connection pool
client = AsyncIOMotorClient(
    mongodb_url,
    maxPoolSize=100,
    minPoolSize=10,
    maxIdleTimeMS=30000
)
```

---

## Deployment Architecture

### Production Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                        Production Environment                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐                                           │
│   │   CDN (Static)  │ ◀──── Frontend Assets                     │
│   └─────────────────┘                                           │
│            │                                                     │
│            ▼                                                     │
│   ┌─────────────────┐     ┌─────────────────┐                   │
│   │  Load Balancer  │────▶│  API Gateway    │                   │
│   │    (nginx)      │     │  (Rate Limit)   │                   │
│   └─────────────────┘     └────────┬────────┘                   │
│                                    │                             │
│            ┌───────────────────────┼───────────────────────┐    │
│            │                       │                       │    │
│            ▼                       ▼                       ▼    │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────┐  │
│   │  Backend Pod 1  │     │  Backend Pod 2  │     │  Pod N  │  │
│   │  (Kubernetes)   │     │  (Kubernetes)   │     │         │  │
│   └────────┬────────┘     └────────┬────────┘     └────┬────┘  │
│            │                       │                    │       │
│            └───────────────────────┼────────────────────┘       │
│                                    │                             │
│            ┌───────────────────────┼───────────────────────┐    │
│            │                       │                       │    │
│            ▼                       ▼                       ▼    │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────┐  │
│   │  MongoDB Atlas  │     │  Vault Cluster  │     │  Redis  │  │
│   │  (Replica Set)  │     │    (HA Mode)    │     │ (Cache) │  │
│   └─────────────────┘     └─────────────────┘     └─────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

*Documentation for Citrus LLM Evaluation Platform v2.4.0*
