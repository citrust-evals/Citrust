# Citrus LLM Evaluation Platform - Complete Setup Documentation

> **Version**: 2.4.0  
> **Last Updated**: March 2026

A comprehensive guide to setting up and running the Citrus LLM Evaluation Platform, including HashiCorp Vault integration for privacy-preserving operations.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [HashiCorp Vault Setup](#hashicorp-vault-setup)
6. [Backend Setup](#backend-setup)
7. [Frontend Setup](#frontend-setup)
8. [Environment Variables Reference](#environment-variables-reference)
9. [Database Configuration](#database-configuration)
10. [Running the Application](#running-the-application)
11. [Verification & Testing](#verification--testing)
12. [Troubleshooting](#troubleshooting)
13. [Production Deployment](#production-deployment)

---

## Overview

Citrus is a full-stack LLM evaluation platform that enables:

- **Dual Model Comparison**: Side-by-side response comparison with real-time streaming
- **Privacy-Preserving Evaluation**: PII detection and encryption using HashiCorp Vault
- **Comprehensive Analytics**: Model performance metrics, latency analysis, and tracing
- **User Preference Learning**: Feedback collection and preference tracking

### Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python 3.9+) |
| Frontend | React 18 + TypeScript + Vite |
| Database | MongoDB |
| Privacy | HashiCorp Vault (Transit Engine), Presidio |
| LLM | LangChain, LangGraph, Google Gemini |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Citrus Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   Frontend      │    │    Backend      │    │   Vault     │ │
│  │   (React/Vite)  │───▶│   (FastAPI)     │───▶│  (Transit)  │ │
│  │   Port: 5173    │    │   Port: 8000    │    │  Port: 8200 │ │
│  └─────────────────┘    └────────┬────────┘    └─────────────┘ │
│                                  │                              │
│                                  ▼                              │
│                         ┌─────────────────┐                     │
│                         │    MongoDB      │                     │
│                         │   Port: 27017   │                     │
│                         └─────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
Citrust/
├── app/                          # Backend (FastAPI)
│   ├── config.py                 # Application configuration
│   ├── main.py                   # FastAPI entry point
│   ├── requirements.txt          # Python dependencies
│   ├── core/
│   │   ├── database.py           # MongoDB connection
│   │   ├── vault_client.py       # Vault Transit client
│   │   ├── pii_redaction.py      # PII detection (Presidio)
│   │   ├── tracing.py            # Request tracing
│   │   └── trace_storage.py      # Trace persistence
│   ├── models/                   # Pydantic schemas
│   ├── routers/                  # API endpoints
│   └── services/                 # Business logic
├── citrus_frontend/              # Frontend (React)
│   ├── src/
│   │   ├── api.ts               # API client
│   │   ├── pages/               # React pages
│   │   └── components/          # UI components
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.vault.yml      # Vault Docker setup
├── .env.example                  # Environment template
└── DOCUMENTATION.md              # This file
```

---

## Prerequisites

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| Python | 3.9+ | [python.org](https://www.python.org/downloads/) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| MongoDB | 6.0+ | [mongodb.com](https://www.mongodb.com/try/download/community) |
| Docker | 20.10+ | [docker.com](https://www.docker.com/get-started) |
| Git | 2.30+ | [git-scm.com](https://git-scm.com/) |

### Required API Keys

You need **at least one** LLM API key:

| Provider | Get API Key |
|----------|-------------|
| Google Gemini (Recommended) | [makersuite.google.com](https://makersuite.google.com/app/apikey) |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Anthropic | [console.anthropic.com](https://console.anthropic.com/) |

### Gmail App Password (for OTP emails)

If using email-based authentication:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Create a new app password for "Mail"
5. Copy the 16-character password

---

## Quick Start

For experienced developers who want to get started quickly:

```bash
# 1. Clone and navigate
cd Citrust

# 2. Create Docker network and start Vault
docker network create citrus-network
docker-compose -f docker-compose.vault.yml up -d

# 3. Setup Backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/macOS
pip install -r app/requirements.txt
cp .env.example .env
# Edit .env with your API keys

# 4. Start Backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 5. Setup Frontend (new terminal)
cd citrus_frontend
npm install
npm run dev

# 6. Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## HashiCorp Vault Setup

Vault is used for encrypting PII (Personally Identifiable Information) using the Transit secrets engine.

### Step 1: Create Docker Network

```bash
docker network create citrus-network
```

### Step 2: Start Vault Container

```bash
docker-compose -f docker-compose.vault.yml up -d
```

This starts Vault in **dev mode** with:
- **URL**: `http://127.0.0.1:8200`
- **Root Token**: `dev-root-token`

### Step 3: Verify Vault is Running

```bash
# Check container status
docker ps | grep citrus-vault

# Check Vault health
curl http://127.0.0.1:8200/v1/sys/health
```

Expected response:
```json
{
  "initialized": true,
  "sealed": false,
  "standby": false
}
```

### Step 4: Configure Vault (Automatic)

The backend automatically configures Vault on startup:
- Enables Transit secrets engine
- Creates encryption key `trace-encryption-key`

### Manual Vault Configuration (Optional)

If you need to configure Vault manually:

```bash
# Set Vault address
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='dev-root-token'

# Enable Transit engine
vault secrets enable transit

# Create encryption key
vault write -f transit/keys/trace-encryption-key \
  convergent_encryption=true \
  derived=true
```

### Vault Docker Compose Reference

```yaml
# docker-compose.vault.yml
version: '3.8'

services:
  vault:
    image: hashicorp/vault:1.15
    container_name: citrus-vault
    ports:
      - "8200:8200"
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: dev-root-token
      VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
    cap_add:
      - IPC_LOCK
    command: server -dev
    healthcheck:
      test: ["CMD", "vault", "status"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - citrus-network

networks:
  citrus-network:
    external: true
```

---

## Backend Setup

### Step 1: Create Virtual Environment

```bash
# Navigate to project root
cd Citrust

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate
```

### Step 2: Install Dependencies

```bash
pip install -r app/requirements.txt
```

**Installed packages include:**
- FastAPI, Uvicorn (web framework)
- Motor, PyMongo (MongoDB async driver)
- LangChain, LangGraph (LLM orchestration)
- hvac (Vault client)
- Presidio (PII detection)
- PyJWT (authentication)

### Step 3: Install spaCy Model (for PII detection)

```bash
python -m spacy download en_core_web_lg
```

### Step 4: Create Environment File

```bash
# Copy template
cp .env.example .env

# Edit with your settings
# Windows: notepad .env
# Linux/macOS: nano .env
```

### Step 5: Configure Environment Variables

Edit `.env` with your actual values:

```bash
# ===========================================
# CITRUS LLM EVALUATION PLATFORM - CONFIGURATION
# ===========================================

# -------------------------------------------
# MongoDB Configuration (REQUIRED)
# -------------------------------------------
MONGODB_URL=mongodb://localhost:27017

# -------------------------------------------
# LLM API Keys (At least one REQUIRED)
# -------------------------------------------
GEMINI_API_KEY=your_gemini_api_key_here

# Optional additional providers
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# -------------------------------------------
# JWT Authentication (REQUIRED)
# -------------------------------------------
JWT_SECRET_KEY=your_super_secret_jwt_key_here_minimum_32_characters

# -------------------------------------------
# Email/SMTP Configuration (for OTP)
# -------------------------------------------
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_16_char_app_password
SMTP_FROM_EMAIL=your_email@gmail.com

# -------------------------------------------
# HashiCorp Vault Configuration
# -------------------------------------------
VAULT_ENABLED=true
VAULT_URL=http://127.0.0.1:8200
VAULT_TOKEN=dev-root-token
VAULT_TRANSIT_KEY=trace-encryption-key

# -------------------------------------------
# Privacy Configuration
# -------------------------------------------
PII_REDACTION_ENABLED=true
VAULTGEMMA_ENABLED=false
```

### Step 6: Start MongoDB

**Windows:**
```bash
net start MongoDB
```

**macOS (Homebrew):**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

**Verify MongoDB:**
```bash
mongosh --eval "db.version()"
```

### Step 7: Start the Backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected startup output:**
```
INFO:     🚀 Starting Citrus LLM Evaluation Platform...
INFO:     Version: 2.4.0
INFO:     ✓ Database connected successfully
INFO:     ✓ Vault client authenticated
INFO:     ✓ Transit engine already enabled
INFO:     ✓ Transit key already exists
INFO:     ✓ Trace storage initialized
INFO:     ✓ Citrus Platform ready!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory

```bash
cd citrus_frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Frontend Environment File (Optional)

The frontend uses Vite's proxy configuration by default, so a `.env` file is optional for local development.

If you need to override the API URL:

```bash
# Create .env file
echo "VITE_API_URL=http://localhost:8000" > .env
```

### Step 4: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
  VITE v5.4.1  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  press h + enter to show help
```

### Step 5: Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **API Documentation**: http://localhost:8000/docs

---

## Environment Variables Reference

### Complete `.env` Template

```bash
# =============================================================================
# CITRUS LLM EVALUATION PLATFORM - COMPLETE ENVIRONMENT CONFIGURATION
# =============================================================================

# -----------------------------------------------------------------------------
# CORE CONFIGURATION
# -----------------------------------------------------------------------------

# MongoDB Connection String (REQUIRED)
# Local: mongodb://localhost:27017
# Atlas: mongodb+srv://user:password@cluster.mongodb.net/
MONGODB_URL=mongodb://localhost:27017

# -----------------------------------------------------------------------------
# LLM API KEYS (At least one REQUIRED)
# -----------------------------------------------------------------------------

# Google Gemini API Key (Recommended)
# Get from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI API Key (Optional)
# Get from: https://platform.openai.com/api-keys
# OPENAI_API_KEY=sk-...

# Anthropic API Key (Optional)
# Get from: https://console.anthropic.com/
# ANTHROPIC_API_KEY=sk-ant-...

# -----------------------------------------------------------------------------
# AUTHENTICATION
# -----------------------------------------------------------------------------

# JWT Secret Key (REQUIRED)
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
# Must be at least 32 characters for security
JWT_SECRET_KEY=your_super_secret_jwt_key_here_minimum_32_characters

# JWT Token Expiry (Optional, default: 30 days)
# JWT_EXPIRY_DAYS=30

# -----------------------------------------------------------------------------
# EMAIL/SMTP CONFIGURATION (Required for OTP authentication)
# -----------------------------------------------------------------------------

# SMTP Server Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Gmail Credentials
# For Gmail: Use App Password (not regular password)
# Get App Password: https://myaccount.google.com/apppasswords
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_16_character_app_password
SMTP_FROM_EMAIL=your_email@gmail.com

# -----------------------------------------------------------------------------
# HASHICORP VAULT CONFIGURATION (Privacy Features)
# -----------------------------------------------------------------------------

# Enable/Disable Vault Integration
VAULT_ENABLED=true

# Vault Server URL
VAULT_URL=http://127.0.0.1:8200

# Vault Authentication Token
# Development: dev-root-token (NEVER use in production!)
# Production: Use a proper token from Vault authentication
VAULT_TOKEN=dev-root-token

# Transit Engine Encryption Key Name
VAULT_TRANSIT_KEY=trace-encryption-key

# -----------------------------------------------------------------------------
# PRIVACY CONFIGURATION
# -----------------------------------------------------------------------------

# Enable PII Detection and Redaction (using Presidio)
PII_REDACTION_ENABLED=true

# Enable VaultGemma Privacy-Preserving Evaluator
VAULTGEMMA_ENABLED=false

# VaultGemma Model (if enabled)
# VAULTGEMMA_MODEL=google/gemma-1.1-2b-it

# -----------------------------------------------------------------------------
# MODEL CONFIGURATION
# -----------------------------------------------------------------------------

# Default Model for Responses
DEFAULT_MODEL=gemini-2.5-flash

# Models for Dual Comparison
# MODEL_1=gemini-2.5-flash
# MODEL_2=gemini-2.5-pro

# Model Parameters
DEFAULT_TEMPERATURE=0.7
DEFAULT_MAX_TOKENS=2000

# -----------------------------------------------------------------------------
# SECURITY & CORS
# -----------------------------------------------------------------------------

# Allowed CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# API Key Authentication (Optional)
API_KEY_REQUIRED=false
# API_KEYS=key1,key2,key3

# -----------------------------------------------------------------------------
# PERFORMANCE
# -----------------------------------------------------------------------------

# Maximum Concurrent Requests
MAX_CONCURRENT_REQUESTS=100

# Request Timeout (seconds)
REQUEST_TIMEOUT=300

# -----------------------------------------------------------------------------
# TRACING & ANALYTICS
# -----------------------------------------------------------------------------

# Enable Request Tracing
ENABLE_TRACING=true

# Trace Sampling Rate (0.0 to 1.0)
# 1.0 = trace all requests, 0.5 = trace 50% of requests
TRACE_SAMPLING_RATE=1.0

# Maximum Trace Depth
MAX_TRACE_DEPTH=10

# Analytics Batch Size
ANALYTICS_BATCH_SIZE=100

# Analytics Flush Interval (seconds)
ANALYTICS_FLUSH_INTERVAL=60
```

### Environment Variables by Category

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `JWT_SECRET_KEY` | Secret for JWT tokens (32+ chars) | `your_secret_key_here` |

#### Email/SMTP Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USERNAME` | SMTP username/email | `you@gmail.com` |
| `SMTP_PASSWORD` | SMTP password/app password | `abcd efgh ijkl mnop` |
| `SMTP_FROM_EMAIL` | Sender email address | `you@gmail.com` |

#### Vault Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VAULT_ENABLED` | Enable Vault integration | `true` |
| `VAULT_URL` | Vault server URL | `http://127.0.0.1:8200` |
| `VAULT_TOKEN` | Vault authentication token | `dev-root-token` |
| `VAULT_TRANSIT_KEY` | Transit encryption key name | `trace-encryption-key` |

#### Privacy Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PII_REDACTION_ENABLED` | Enable PII detection | `true` |
| `VAULTGEMMA_ENABLED` | Enable VaultGemma evaluator | `false` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEFAULT_MODEL` | Default LLM model | `gemini-2.5-flash` |
| `DEFAULT_TEMPERATURE` | Model temperature | `0.7` |
| `DEFAULT_MAX_TOKENS` | Max tokens per response | `2000` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000,http://localhost:5173` |
| `API_KEY_REQUIRED` | Require API key for requests | `false` |
| `ENABLE_TRACING` | Enable request tracing | `true` |

---

## Database Configuration

### MongoDB Collections

The application automatically creates these collections:

| Collection | Purpose |
|------------|---------|
| `evaluations` | Evaluation results and metrics |
| `preference_responses` | User preference submissions |
| `traces` | Detailed execution traces |
| `analytics` | Aggregated analytics data |
| `models` | Model configurations |
| `users` | User accounts |
| `otp_records` | OTP verification (TTL indexed) |
| `evaluation_campaigns` | Evaluation campaign management |
| `evaluation_results` | Campaign evaluation results |
| `test_sets` | Test set definitions |
| `metric_definitions` | Custom metric definitions |

### Indexes

Indexes are automatically created on startup for optimal query performance:

```javascript
// Example indexes created
traces: { session_id: 1 }
traces: { timestamp: -1 }
traces: { user_id: 1 }
otp_records: { expires_at: 1 } // TTL index
```

### Verify Database Setup

```bash
# Connect to MongoDB
mongosh

# Switch to citrus database
use citrus

# Show collections
show collections

# Check a collection
db.traces.find().limit(1).pretty()
```

---

## Running the Application

### Development Mode

**Terminal 1 - Vault:**
```bash
docker-compose -f docker-compose.vault.yml up -d
```

**Terminal 2 - Backend:**
```bash
cd Citrust
venv\Scripts\activate  # or source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 3 - Frontend:**
```bash
cd Citrust/citrus_frontend
npm run dev
```

### Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | User interface |
| Backend API | http://localhost:8000 | REST API |
| API Docs (Swagger) | http://localhost:8000/docs | Interactive API documentation |
| API Docs (ReDoc) | http://localhost:8000/redoc | Alternative API documentation |
| Health Check | http://localhost:8000/health | Service health status |
| Vault UI | http://localhost:8200 | Vault management (dev mode) |

---

## Verification & Testing

### 1. Check Service Health

```bash
# Backend health
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "2.4.0",
  "uptime_seconds": 123.45
}
```

### 2. Check Vault Connection

```bash
curl http://127.0.0.1:8200/v1/sys/health
```

### 3. Test API Endpoints

```bash
# Root endpoint
curl http://localhost:8000/

# API info
curl http://localhost:8000/api/info

# Dual responses (requires valid session)
curl -X POST http://localhost:8000/api/v1/evaluations/dual-responses \
  -H "Content-Type: application/json" \
  -d '{
    "user_message": "What is machine learning?",
    "chat_history": [],
    "session_id": "test-123"
  }'
```

### 4. Run Backend Tests

```bash
cd Citrust
pytest app/tests/ -v
```

### 5. Run Frontend Tests

```bash
cd citrus_frontend
npm run test
```

### 6. Verification Checklist

- [ ] MongoDB is running and accessible
- [ ] Vault container is running (`docker ps | grep citrus-vault`)
- [ ] Backend starts without errors
- [ ] Health check returns "healthy"
- [ ] API docs load at `/docs`
- [ ] Frontend loads at port 5173
- [ ] Can create user account and login
- [ ] Chat playground shows dual responses

---

## Troubleshooting

### Vault Issues

**Problem**: `Vault authentication failed`

**Solutions**:
1. Ensure Vault container is running: `docker ps | grep citrus-vault`
2. Check Vault URL in `.env`: `VAULT_URL=http://127.0.0.1:8200`
3. Verify token: `VAULT_TOKEN=dev-root-token`
4. Restart Vault: `docker-compose -f docker-compose.vault.yml restart`

**Problem**: `Transit engine not enabled`

**Solution**:
```bash
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='dev-root-token'
vault secrets enable transit
```

### MongoDB Issues

**Problem**: `Failed to connect to MongoDB`

**Solutions**:
1. Check MongoDB is running: `mongosh`
2. Verify connection string in `.env`
3. For Windows, ensure MongoDB service is started: `net start MongoDB`
4. Try explicit IP: `MONGODB_URL=mongodb://127.0.0.1:27017`

### Backend Issues

**Problem**: `ModuleNotFoundError`

**Solution**:
```bash
# Ensure virtual environment is activated
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/macOS

# Reinstall dependencies
pip install -r app/requirements.txt
```

**Problem**: `No LLM API keys configured`

**Solution**:
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `.env`: `GEMINI_API_KEY=your_key_here`
3. Restart the backend

**Problem**: `Port 8000 already in use`

**Solution**:
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :8000
kill -9 <PID>

# Or use different port
uvicorn app.main:app --reload --port 8001
```

### Frontend Issues

**Problem**: `CORS errors`

**Solution**:
Add frontend URL to `CORS_ORIGINS` in `.env`:
```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Problem**: `npm install fails`

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Email/OTP Issues

**Problem**: `OTP email not received`

**Solutions**:
1. Check SMTP settings in `.env`
2. For Gmail, ensure you're using an App Password
3. Check spam folder
4. Verify SMTP credentials are correct

---

## Production Deployment

### Security Checklist

- [ ] Change `VAULT_TOKEN` to a secure production token
- [ ] Use strong `JWT_SECRET_KEY` (64+ characters)
- [ ] Set `API_KEY_REQUIRED=true` and configure API keys
- [ ] Restrict `CORS_ORIGINS` to your domain only
- [ ] Use MongoDB Atlas or secured MongoDB instance
- [ ] Enable HTTPS/TLS
- [ ] Set up proper logging and monitoring

### Production Environment Variables

```bash
# Production MongoDB (Atlas)
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/citrus

# Secure JWT key
JWT_SECRET_KEY=generate_a_very_long_random_string_at_least_64_characters

# Production CORS
CORS_ORIGINS=https://yourdomain.com

# Enable API authentication
API_KEY_REQUIRED=true
API_KEYS=prod_api_key_1,prod_api_key_2

# Secure Vault token (not dev-root-token!)
VAULT_TOKEN=your_production_vault_token
```

### Production Commands

**Backend:**
```bash
# Run with multiple workers
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Or use gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

**Frontend:**
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Serve with nginx, Apache, or other web server
```

### Docker Deployment (Optional)

```dockerfile
# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_lg

COPY app/ ./app/
COPY .env .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build and run
docker build -t citrus-backend .
docker run -p 8000:8000 --env-file .env --network citrus-network citrus-backend
```

---

## API Endpoints Summary

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email |
| POST | `/api/auth/verify-otp` | Verify OTP code |
| GET | `/api/auth/me` | Get current user |

### Chat & Evaluation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/evaluations/dual-responses` | Get dual model responses (SSE) |
| POST | `/api/v1/evaluations/store-preference` | Store user preference |

### Traces & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/traces` | List traces with filtering |
| GET | `/api/v1/traces/{trace_id}` | Get specific trace |
| GET | `/api/v1/traces/statistics` | Get aggregated statistics |
| POST | `/api/v1/traces/{trace_id}/evaluate` | Privacy-preserving evaluation |
| GET | `/api/v1/models/performance` | Model performance metrics |
| GET | `/api/v1/analytics/realtime` | Real-time dashboard metrics |

### Health & Info
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information |
| GET | `/health` | Health check |
| GET | `/api/info` | Detailed platform info |

---

## Support & Resources

- **API Documentation**: http://localhost:8000/docs
- **Health Dashboard**: http://localhost:8000/health
- **MongoDB Docs**: https://www.mongodb.com/docs/
- **Vault Docs**: https://developer.hashicorp.com/vault/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **React Docs**: https://react.dev/

---

*Documentation generated for Citrus LLM Evaluation Platform v2.4.0*
