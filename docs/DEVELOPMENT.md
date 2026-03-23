# Citrus LLM Evaluation Platform - Development Guide

> **Version**: 2.4.0  
> **Last Updated**: March 2026

Complete development guide for contributing to and extending the Citrus LLM Evaluation Platform.

---

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Backend Development](#backend-development)
4. [Frontend Development](#frontend-development)
5. [Testing](#testing)
6. [Code Style & Standards](#code-style--standards)
7. [Adding New Features](#adding-new-features)
8. [Debugging](#debugging)
9. [Contributing Guidelines](#contributing-guidelines)

---

## Development Environment Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.9+ | Backend runtime |
| Node.js | 18+ | Frontend runtime |
| MongoDB | 6.0+ | Database |
| Docker | 20.10+ | Vault container |
| Git | 2.30+ | Version control |

### Initial Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd Citrust

# 2. Create Python virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# 3. Install backend dependencies
pip install -r app/requirements.txt

# 4. Install SpaCy model
python -m spacy download en_core_web_lg

# 5. Setup frontend
cd citrus_frontend
npm install
cd ..

# 6. Copy environment template
cp .env.example .env
# Edit .env with your API keys
```

### Start Development Services

```bash
# Terminal 1: Start Vault
docker network create citrus-network
docker-compose -f docker-compose.vault.yml up -d

# Terminal 2: Start Backend
venv\Scripts\activate  # or source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3: Start Frontend
cd citrus_frontend
npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Vault UI | http://localhost:8200 |

---

## Project Structure

### Repository Layout

```
Citrust/
├── app/                          # Backend (FastAPI)
│   ├── __init__.py
│   ├── config.py                 # Configuration
│   ├── main.py                   # Application entry
│   ├── requirements.txt          # Python dependencies
│   ├── core/                     # Core infrastructure
│   │   ├── database.py           # MongoDB client
│   │   ├── vault_client.py       # Vault integration
│   │   ├── pii_redaction.py      # PII detection
│   │   ├── tracing.py            # Request tracing
│   │   ├── trace_storage.py      # Trace persistence
│   │   └── model_wrappers.py     # LLM abstractions
│   ├── models/                   # Pydantic schemas
│   │   ├── schemas.py            # General schemas
│   │   ├── user_schemas.py       # Auth schemas
│   │   ├── evaluation_schemas.py # Evaluation schemas
│   │   ├── trace_schemas.py      # Trace schemas
│   │   └── state.py              # LangGraph state
│   ├── routers/                  # API endpoints
│   │   ├── auth.py               # Authentication
│   │   ├── evaluations.py        # Chat/evaluations
│   │   └── traces.py             # Analytics
│   ├── services/                 # Business logic
│   │   ├── graph.py              # LangGraph workflow
│   │   ├── model_client.py       # LLM client
│   │   ├── evaluation_runner.py  # Evaluation orchestration
│   │   └── vaultgemma_evaluator.py
│   └── tests/                    # Backend tests
│
├── citrus_frontend/              # Frontend (React)
│   ├── src/
│   │   ├── main.tsx              # Entry point
│   │   ├── App.tsx               # Root component
│   │   ├── api*.ts               # API clients
│   │   ├── context/              # React contexts
│   │   ├── components/           # UI components
│   │   │   ├── ui/               # Base components
│   │   │   └── *.tsx             # Feature components
│   │   ├── pages/                # Page components
│   │   ├── lib/                  # Utilities
│   │   └── __tests__/            # Frontend tests
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── docs/                         # Documentation
│   ├── FEATURES.md
│   ├── TECH_STACK.md
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   ├── PRIVACY_SECURITY.md
│   └── DEVELOPMENT.md            # This file
│
├── .env.example                  # Environment template
├── docker-compose.vault.yml      # Vault configuration
├── DOCUMENTATION.md              # Setup guide
├── README.md                     # Project overview
└── SETUP.md                      # Installation guide
```

---

## Backend Development

### Adding a New Endpoint

1. **Create/Update Schema** (`app/models/`)

```python
# app/models/schemas.py
from pydantic import BaseModel

class NewFeatureRequest(BaseModel):
    field1: str
    field2: int = 10

class NewFeatureResponse(BaseModel):
    result: str
    processed_at: datetime
```

2. **Create Service Logic** (`app/services/`)

```python
# app/services/new_feature_service.py
from app.models.schemas import NewFeatureRequest, NewFeatureResponse

class NewFeatureService:
    async def process(self, request: NewFeatureRequest) -> NewFeatureResponse:
        # Business logic here
        result = f"Processed: {request.field1}"
        return NewFeatureResponse(
            result=result,
            processed_at=datetime.now(timezone.utc)
        )
```

3. **Create Router** (`app/routers/`)

```python
# app/routers/new_feature.py
from fastapi import APIRouter, Depends
from app.models.schemas import NewFeatureRequest, NewFeatureResponse
from app.services.new_feature_service import NewFeatureService

router = APIRouter(prefix="/api/v1/new-feature", tags=["New Feature"])

@router.post("/", response_model=NewFeatureResponse)
async def create_new_feature(request: NewFeatureRequest):
    service = NewFeatureService()
    return await service.process(request)
```

4. **Register Router** (`app/main.py`)

```python
from app.routers import new_feature

# In main.py
app.include_router(new_feature.router)
```

### Database Operations

```python
# app/core/database.py

class MongoDB:
    # ... existing code ...
    
    @property
    def new_collection(self):
        return self.database["new_collection"]

# Usage in service
from app.core.database import mongodb

async def save_item(item: dict):
    result = await mongodb.new_collection.insert_one(item)
    return str(result.inserted_id)

async def get_item(item_id: str):
    return await mongodb.new_collection.find_one({"_id": ObjectId(item_id)})
```

### Adding New LLM Models

1. **Update Config** (`app/config.py`)

```python
class Settings(BaseSettings):
    # Add new model API key
    new_model_api_key: str = os.getenv("NEW_MODEL_API_KEY", "")
```

2. **Create Model Wrapper** (`app/core/model_wrappers.py`)

```python
class NewModelClient:
    def __init__(self, api_key: str, model_name: str):
        self.api_key = api_key
        self.model_name = model_name
    
    async def generate(self, prompt: str, **kwargs) -> str:
        # Implementation
        pass
    
    async def astream(self, prompt: str, **kwargs):
        # Streaming implementation
        pass
```

3. **Register in Factory**

```python
def get_model_client(model_name: str):
    if model_name.startswith("new-model"):
        return NewModelClient(settings.new_model_api_key, model_name)
    # ... existing models
```

---

## Frontend Development

### Creating a New Page

1. **Create Page Component** (`src/pages/`)

```tsx
// src/pages/NewFeaturePage.tsx
import { useState, useEffect } from 'react';
import { MetricCard } from '../components/MetricCard';

export function NewFeaturePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/v1/new-feature');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">New Feature</h1>
      {/* Page content */}
    </div>
  );
}
```

2. **Add Route** (`src/App.tsx`)

```tsx
import { NewFeaturePage } from './pages/NewFeaturePage';

// In Routes
<Route path="/new-feature" element={
  <ProtectedRoute>
    <NewFeaturePage />
  </ProtectedRoute>
} />
```

3. **Add Navigation** (`src/components/Sidebar.tsx`)

```tsx
const navItems = [
  // ... existing items
  { path: '/new-feature', label: 'New Feature', icon: Star },
];
```

### Creating a New Component

```tsx
// src/components/FeatureCard.tsx
import { Card, CardHeader, CardContent } from './ui/card';

interface FeatureCardProps {
  title: string;
  description: string;
  onClick?: () => void;
}

export function FeatureCard({ title, description, onClick }: FeatureCardProps) {
  return (
    <Card 
      className="glass-panel cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader>
        <h3 className="text-lg font-semibold">{title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400">{description}</p>
      </CardContent>
    </Card>
  );
}
```

### Adding API Functions

```typescript
// src/api_new_feature.ts
const API_BASE = '/api/v1/new-feature';

export interface NewFeatureData {
  id: string;
  name: string;
  value: number;
}

export const newFeatureApi = {
  getAll: async (): Promise<NewFeatureData[]> => {
    const response = await fetch(API_BASE);
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  getById: async (id: string): Promise<NewFeatureData> => {
    const response = await fetch(`${API_BASE}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  create: async (data: Partial<NewFeatureData>): Promise<NewFeatureData> => {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create');
    return response.json();
  },
};
```

### Using Context

```tsx
// src/context/NewFeatureContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface NewFeatureContextType {
  selectedItem: string | null;
  setSelectedItem: (item: string | null) => void;
}

const NewFeatureContext = createContext<NewFeatureContextType | null>(null);

export function NewFeatureProvider({ children }: { children: ReactNode }) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  return (
    <NewFeatureContext.Provider value={{ selectedItem, setSelectedItem }}>
      {children}
    </NewFeatureContext.Provider>
  );
}

export function useNewFeature() {
  const context = useContext(NewFeatureContext);
  if (!context) {
    throw new Error('useNewFeature must be used within NewFeatureProvider');
  }
  return context;
}
```

---

## Testing

### Backend Tests

```python
# app/tests/test_evaluations.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_dual_responses(client):
    response = await client.post("/api/v1/evaluations/dual-responses", json={
        "user_message": "Test message",
        "chat_history": [],
        "session_id": "test-session"
    })
    assert response.status_code == 200
```

**Run backend tests:**
```bash
pytest app/tests/ -v
pytest app/tests/ -v --cov=app --cov-report=html
```

### Frontend Tests

```tsx
// src/components/__tests__/MetricCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../MetricCard';

describe('MetricCard', () => {
  it('renders title and value', () => {
    render(<MetricCard title="Test Metric" value={42} />);
    
    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('formats large numbers', () => {
    render(<MetricCard title="Large Number" value={1234567} />);
    
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });
});
```

**Run frontend tests:**
```bash
cd citrus_frontend
npm run test           # Run tests
npm run test:ui        # Run with UI
npm run test -- --coverage  # With coverage
```

---

## Code Style & Standards

### Python (Backend)

**Tools:**
- `black` - Code formatting
- `flake8` - Linting
- `mypy` - Type checking

```bash
# Format code
black app/

# Lint
flake8 app/

# Type check
mypy app/
```

**Configuration** (`.flake8`):
```ini
[flake8]
max-line-length = 100
exclude = venv,__pycache__
ignore = E203, W503
```

**Style Guide:**
```python
# Good
async def get_user_by_id(user_id: str) -> Optional[User]:
    """Fetch a user by their ID."""
    return await mongodb.users.find_one({"_id": ObjectId(user_id)})

# Avoid
async def getUser(id):
    return await mongodb.users.find_one({"_id": ObjectId(id)})
```

### TypeScript (Frontend)

**Tools:**
- `eslint` - Linting
- `prettier` - Formatting (via ESLint)

```bash
cd citrus_frontend
npm run lint
npm run lint -- --fix  # Auto-fix
```

**Style Guide:**
```tsx
// Good
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

function UserCard({ user }: { user: UserProfile }) {
  return (
    <div className="p-4">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// Avoid
function userCard(props: any) {
  return <div><h2>{props.user.name}</h2></div>
}
```

### Git Commit Messages

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(auth): add OTP-based authentication

Implement email-based OTP authentication with JWT tokens.
- Add /api/auth/login endpoint
- Add /api/auth/verify-otp endpoint
- Configure SMTP settings

Closes #123
```

---

## Adding New Features

### Feature Checklist

- [ ] Write failing tests first (TDD)
- [ ] Implement feature
- [ ] Add API documentation (docstrings)
- [ ] Update OpenAPI schemas
- [ ] Add frontend components
- [ ] Update user documentation
- [ ] Add to changelog
- [ ] Create PR with description

### Example: Adding a New Metric

1. **Backend Schema**
```python
class NewMetricResponse(BaseModel):
    metric_name: str
    value: float
    unit: str
    timestamp: datetime
```

2. **Backend Service**
```python
async def calculate_new_metric() -> NewMetricResponse:
    # Calculate metric
    value = await aggregate_data()
    return NewMetricResponse(
        metric_name="New Metric",
        value=value,
        unit="requests/sec",
        timestamp=datetime.now(timezone.utc)
    )
```

3. **Backend Endpoint**
```python
@router.get("/new-metric", response_model=NewMetricResponse)
async def get_new_metric():
    """Get the new metric value."""
    return await calculate_new_metric()
```

4. **Frontend API**
```typescript
export const getNewMetric = async () => {
  const response = await fetch('/api/v1/new-metric');
  return response.json();
};
```

5. **Frontend Component**
```tsx
function NewMetricDisplay() {
  const [metric, setMetric] = useState(null);
  
  useEffect(() => {
    getNewMetric().then(setMetric);
  }, []);
  
  return <MetricCard title={metric?.metric_name} value={metric?.value} />;
}
```

---

## Debugging

### Backend Debugging

**Enable Debug Logging:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

**VS Code Launch Config:**
```json
{
  "name": "Debug Backend",
  "type": "python",
  "request": "launch",
  "module": "uvicorn",
  "args": ["app.main:app", "--reload", "--port", "8000"],
  "jinja": true
}
```

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Import errors | Ensure virtual env activated |
| MongoDB connection | Check MONGODB_URL |
| Vault errors | Verify Vault is running |
| API key errors | Check .env configuration |

### Frontend Debugging

**React DevTools:**
- Install React DevTools browser extension
- Use Components tab for component tree
- Use Profiler tab for performance

**Console Logging:**
```tsx
useEffect(() => {
  console.log('Data changed:', data);
}, [data]);
```

**Network Debugging:**
- Open DevTools Network tab
- Filter by XHR/Fetch
- Check request/response payloads

---

## Contributing Guidelines

### Pull Request Process

1. **Fork & Branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make Changes**
- Follow code style guidelines
- Add tests for new features
- Update documentation

3. **Test Locally**
```bash
# Backend
pytest app/tests/ -v

# Frontend
cd citrus_frontend && npm run test
```

4. **Commit**
```bash
git add .
git commit -m "feat(scope): description"
```

5. **Push & Create PR**
```bash
git push origin feature/your-feature-name
# Create PR on GitHub
```

### PR Requirements

- [ ] Tests pass (CI/CD)
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No secrets in code
- [ ] Meaningful commit messages
- [ ] PR description explains changes

### Code Review

**Reviewers check for:**
- Correctness
- Test coverage
- Security implications
- Performance impact
- Code readability
- Documentation

---

## Resources

### Documentation
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [MongoDB Motor](https://motor.readthedocs.io/)
- [HashiCorp Vault](https://developer.hashicorp.com/vault/docs)
- [Presidio](https://microsoft.github.io/presidio/)

### Internal Docs
- [FEATURES.md](./FEATURES.md) - Feature documentation
- [TECH_STACK.md](./TECH_STACK.md) - Technology stack
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [API_REFERENCE.md](./API_REFERENCE.md) - API documentation
- [PRIVACY_SECURITY.md](./PRIVACY_SECURITY.md) - Security guide

---

*Development Guide for Citrus LLM Evaluation Platform v2.4.0*
