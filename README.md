# Citrus - LLM Evaluation Platform

> **Version**: 2.4.0  
> **Last Updated**: March 2026

A professional-grade full-stack platform for evaluating, comparing, and analyzing Large Language Models with privacy-preserving features, real-time tracing, and comprehensive analytics.

---

## Overview

Citrus is a complete LLM evaluation platform that enables:

- **Dual Model Comparison**: Side-by-side response comparison with real-time streaming
- **Privacy-Preserving Evaluation**: PII detection and encryption using HashiCorp Vault
- **Comprehensive Analytics**: Model performance metrics, latency analysis, and tracing
- **User Preference Learning**: Feedback collection and preference tracking

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | FastAPI (Python 3.9+) |
| **Frontend** | React 18 + TypeScript + Vite |
| **Database** | MongoDB |
| **Privacy** | HashiCorp Vault (Transit Engine), Presidio |
| **LLM** | LangChain, LangGraph, Google Gemini |

---

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- MongoDB 6.0+
- Docker (for Vault)
- At least one LLM API key (Gemini recommended)

### Installation

```bash
# 1. Clone and navigate
cd Citrust

# 2. Start Vault (privacy features)
docker network create citrus-network
docker-compose -f docker-compose.vault.yml up -d

# 3. Setup Backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/macOS
pip install -r app/requirements.txt
python -m spacy download en_core_web_lg

# 4. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 5. Start Backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 6. Setup & Start Frontend (new terminal)
cd citrus_frontend
npm install
npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| Vault UI | http://localhost:8200 |

---

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Dual Response Generation** | Compare responses from two LLM models simultaneously |
| **Preference Learning** | Collect and analyze user preferences between responses |
| **Real-time Tracing** | Track every API call, token usage, and latency |
| **Performance Analytics** | Dashboard-ready metrics and insights |
| **Multi-Model Support** | Gemini, GPT-4, Claude, and custom models |

### Privacy Features

| Feature | Description |
|---------|-------------|
| **PII Detection** | Automatic detection using Microsoft Presidio |
| **Vault Encryption** | AES-256-GCM96 encryption via HashiCorp Vault |
| **VaultGemma DP** | Differential privacy for model evaluation |
| **Audit Logging** | Complete operation history for compliance |

### Frontend Pages

| Page | Description |
|------|-------------|
| **Chat Playground** | Interactive model comparison interface |
| **Evaluations Dashboard** | Campaign management and results |
| **Traces Explorer** | Detailed trace inspection with privacy controls |
| **Model Analytics** | Performance metrics and visualizations |
| **Settings** | System configuration and health |

---

## Project Structure

```
Citrust/
├── app/                          # Backend (FastAPI)
│   ├── config.py                 # Configuration
│   ├── main.py                   # Application entry
│   ├── core/                     # Infrastructure
│   │   ├── database.py           # MongoDB client
│   │   ├── vault_client.py       # Vault integration
│   │   ├── pii_redaction.py      # PII detection
│   │   └── tracing.py            # Request tracing
│   ├── models/                   # Pydantic schemas
│   ├── routers/                  # API endpoints
│   └── services/                 # Business logic
│
├── citrus_frontend/              # Frontend (React)
│   ├── src/
│   │   ├── pages/                # Page components
│   │   ├── components/           # UI components
│   │   ├── context/              # React contexts
│   │   └── api*.ts               # API clients
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                         # Documentation
│   ├── FEATURES.md               # Feature documentation
│   ├── TECH_STACK.md             # Technology details
│   ├── ARCHITECTURE.md           # System architecture
│   ├── API_REFERENCE.md          # API documentation
│   ├── PRIVACY_SECURITY.md       # Security guide
│   └── DEVELOPMENT.md            # Developer guide
│
├── .env.example                  # Environment template
├── docker-compose.vault.yml      # Vault configuration
├── DOCUMENTATION.md              # Complete setup guide
└── README.md                     # This file
```

---

## Configuration

### Required Environment Variables

```bash
# Database
MONGODB_URL=mongodb://localhost:27017

# LLM API Key (at least one required)
GEMINI_API_KEY=your_gemini_api_key

# Authentication
JWT_SECRET_KEY=your_32_character_minimum_secret_key

# Vault (for privacy features)
VAULT_ENABLED=true
VAULT_URL=http://127.0.0.1:8200
VAULT_TOKEN=dev-root-token
```

### Optional Configuration

```bash
# Email/OTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Model Settings
DEFAULT_MODEL=gemini-2.5-flash
DEFAULT_TEMPERATURE=0.7

# Privacy
PII_REDACTION_ENABLED=true
VAULTGEMMA_ENABLED=false

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

See [DOCUMENTATION.md](DOCUMENTATION.md) for complete configuration reference.

---

## API Overview

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Request OTP |
| POST | `/api/auth/verify-otp` | Verify OTP, get token |
| GET | `/api/auth/me` | Get current user |

### Chat & Evaluation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/evaluations/dual-responses` | Generate dual responses (SSE) |
| POST | `/api/v1/evaluations/store-preference` | Store user preference |

### Traces & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/traces` | List traces |
| GET | `/api/v1/traces/{id}` | Get trace details |
| GET | `/api/v1/traces/statistics` | Aggregated statistics |
| GET | `/api/v1/models/performance` | Model metrics |
| GET | `/api/v1/analytics/realtime` | Live dashboard data |

See [docs/API_REFERENCE.md](docs/API_REFERENCE.md) for complete API documentation.

---

## Usage Examples

### Generate Dual Responses (Python)

```python
import requests

response = requests.post(
    "http://localhost:8000/api/v1/evaluations/dual-responses",
    json={
        "user_message": "Explain quantum computing",
        "chat_history": [],
        "session_id": "session-123"
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        print(line.decode())
```

### Store Preference

```python
requests.post(
    "http://localhost:8000/api/v1/evaluations/store-preference",
    json={
        "session_id": "session-123",
        "trace_id": "trace-abc",
        "choice": "response_1",
        "reasoning": "More clear and concise"
    }
)
```

### Get Analytics

```python
# Real-time metrics
stats = requests.get("http://localhost:8000/api/v1/analytics/realtime?minutes=60")
print(stats.json())

# Model performance
perf = requests.get("http://localhost:8000/api/v1/models/performance?days=7")
print(perf.json())
```

---

## Testing

### Backend Tests

```bash
cd Citrust
pytest app/tests/ -v
pytest app/tests/ -v --cov=app  # With coverage
```

### Frontend Tests

```bash
cd citrus_frontend
npm run test
npm run test:ui  # With UI
```

---

## Development

### Code Style

```bash
# Backend
black app/           # Format
flake8 app/          # Lint
mypy app/            # Type check

# Frontend
cd citrus_frontend
npm run lint         # Lint
```

### Adding New Features

1. **Backend**: Create schema → service → router → register in main.py
2. **Frontend**: Create API client → component → page → add route

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed development guide.

---

## Production Deployment

### Security Checklist

- [ ] Change `VAULT_TOKEN` to production token
- [ ] Use strong `JWT_SECRET_KEY` (64+ characters)
- [ ] Enable `API_KEY_REQUIRED=true`
- [ ] Restrict `CORS_ORIGINS` to your domain
- [ ] Use MongoDB Atlas or secured instance
- [ ] Enable HTTPS/TLS

### Docker Deployment

```bash
# Backend
docker build -t citrus-backend -f Dockerfile .
docker run -p 8000:8000 --env-file .env --network citrus-network citrus-backend

# Frontend
cd citrus_frontend
npm run build
# Serve dist/ with nginx or similar
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [DOCUMENTATION.md](DOCUMENTATION.md) | Complete setup and configuration guide |
| [docs/FEATURES.md](docs/FEATURES.md) | Detailed feature documentation |
| [docs/TECH_STACK.md](docs/TECH_STACK.md) | Technology stack details |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and design |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | Complete API reference |
| [docs/PRIVACY_SECURITY.md](docs/PRIVACY_SECURITY.md) | Privacy and security guide |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Developer contribution guide |

---

## Roadmap

- [ ] Support for additional LLM providers (Cohere, AI21)
- [ ] Advanced A/B testing framework
- [ ] Custom evaluation metric builder
- [ ] Real-time collaboration features
- [ ] Export to popular formats (CSV, JSON, JSONL)
- [ ] Webhook integrations
- [ ] Multi-tenant support

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pytest app/tests/ -v`)
5. Commit (`git commit -m 'feat: add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Create a Pull Request

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed contribution guidelines.

---

## Support

- **Documentation**: http://localhost:8000/docs
- **Issues**: GitHub Issues
- **Email**: support@citrus.ai

---

## License

MIT License - see LICENSE file for details.

---

*Built with FastAPI, React, LangGraph, MongoDB, and HashiCorp Vault*
