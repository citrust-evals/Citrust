# 🚀 Citrus Backend Setup Guide

Complete setup instructions for the Citrus LLM Evaluation Platform backend.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Python 3.9 or higher** installed
- **MongoDB** running (local or cloud)
  - Local: Download from [mongodb.com/download](https://www.mongodb.com/try/download/community)
  - Cloud: Create free cluster at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
- **LLM API Key** (at least one):
  - Google Gemini: [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
  - OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - Anthropic: [console.anthropic.com](https://console.anthropic.com/)

## 🛠️ Installation Steps

### 1. Navigate to Backend Directory

```bash
cd citrus_backend
```

### 2. Create Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:

- FastAPI & Uvicorn (web framework)
- Motor & PyMongo (MongoDB)
- LangChain & LangGraph (LLM orchestration)
- Pydantic (data validation)
- And all other dependencies

### 4. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

**Minimum Required Configuration:**

```bash
# MongoDB connection
MONGODB_URL=mongodb://localhost:27017

# At least one LLM API key
GEMINI_API_KEY=your_actual_api_key_here
```

**Full Configuration Example:**

```bash
# Database
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=citrus

# LLM API Keys (add at least one)
GEMINI_API_KEY=AIza...
GOOGLE_API_KEY=AIza...  # Same as GEMINI_API_KEY
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Model Settings
DEFAULT_MODEL=gemini-1.5-pro
DEFAULT_TEMPERATURE=0.7
DEFAULT_MAX_TOKENS=2000

# CORS (adjust for your frontend)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Security (optional)
API_KEY_REQUIRED=false
API_KEYS=

# Performance
MAX_CONCURRENT_REQUESTS=100
REQUEST_TIMEOUT=300

# Tracing
ENABLE_TRACING=true
TRACE_SAMPLING_RATE=1.0
```

### 5. Start MongoDB (if running locally)

```bash
# On macOS
brew services start mongodb-community

# On Linux
sudo systemctl start mongod

# On Windows
net start MongoDB

# Verify MongoDB is running
mongosh --eval "db.version()"
```

### 6. Start the Backend Server

**Option A: Using the run script (recommended)**

```bash
chmod +x run.sh
./run.sh
```

**Option B: Using uvicorn directly**

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Option C: Using Python directly**

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 7. Verify Installation

Open your browser and check:

- **API Root**: <http://localhost:8000>
- **Health Check**: <http://localhost:8000/health>
- **API Docs**: <http://localhost:8000/docs>
- **ReDoc**: <http://localhost:8000/redoc>

### 8. Run Test Suite

```bash
# Make sure server is running, then in a new terminal:
python test_api.py
```

Expected output:

```
🍋 Citrus API Test Suite
✓ Health Check
✓ Root Endpoint
✓ Stats
✓ Analytics
✓ Dual Responses
Results: 5/5 tests passed
```

## 🔧 Troubleshooting

### MongoDB Connection Issues

**Problem**: `Failed to connect to MongoDB`

**Solutions**:

1. Check MongoDB is running: `mongosh`
2. Verify MONGODB_URL in .env
3. For Atlas, check network access and password
4. Try: `mongodb://localhost:27017` or `mongodb://127.0.0.1:27017`

### Import Errors

**Problem**: `ModuleNotFoundError: No module named 'fastapi'`

**Solution**:

```bash
# Make sure virtual environment is activated
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Reinstall dependencies
pip install -r requirements.txt
```

### API Key Issues

**Problem**: `No LLM API keys configured`

**Solution**:

1. Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to .env: `GEMINI_API_KEY=your_key_here`
3. Restart server

### Port Already in Use

**Problem**: `Address already in use: 0.0.0.0:8000`

**Solution**:

```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process or use different port
uvicorn app.main:app --reload --port 8001
```

### CORS Errors (Frontend Connection)

**Problem**: Browser shows CORS errors when connecting from frontend

**Solution**:
Add your frontend URL to CORS_ORIGINS in .env:

```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## 🧪 Testing the API

### Using curl

```bash
# Health check
curl http://localhost:8000/health

# Get platform info
curl http://localhost:8000/

# Generate dual responses
curl -X POST http://localhost:8000/api/dual-responses \
  -H "Content-Type: application/json" \
  -d '{
    "user_message": "What is the capital of France?",
    "chat_history": [],
    "session_id": "test-123"
  }'

# Get stats
curl http://localhost:8000/api/stats
```

### Using Python requests

```python
import requests

# Health check
response = requests.get("http://localhost:8000/health")
print(response.json())

# Generate responses
response = requests.post(
    "http://localhost:8000/api/dual-responses",
    json={
        "user_message": "Explain quantum computing",
        "chat_history": [],
        "session_id": "my-session"
    }
)
print(response.json())
```

### Using the API Docs

1. Open <http://localhost:8000/docs>
2. Click on any endpoint
3. Click "Try it out"
4. Fill in parameters
5. Click "Execute"

## 📊 Database Setup

The backend automatically creates collections and indexes on first run. You can verify in MongoDB:

```bash
mongosh
> use citrus
> show collections
evaluations
preferences
traces
analytics
models

> db.traces.find().limit(1).pretty()
```

## 🚀 Production Deployment

For production deployment:

1. **Use production MongoDB URL**

   ```bash
   MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/
   ```

2. **Set secure CORS origins**

   ```bash
   CORS_ORIGINS=https://yourdomain.com
   ```

3. **Enable API key auth (optional)**

   ```bash
   API_KEY_REQUIRED=true
   API_KEYS=secure_key_1,secure_key_2
   ```

4. **Use production server**

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

5. **Consider using Docker**

   ```bash
   docker build -t citrus-backend .
   docker run -p 8000:8000 --env-file .env citrus-backend
   ```

## 📖 Next Steps

1. **Explore the API**: Visit <http://localhost:8000/docs>
2. **Test endpoints**: Run `python test_api.py`
3. **Connect frontend**: Configure CORS and connect your React app
4. **Monitor performance**: Check traces at `/api/v1/traces`
5. **View analytics**: Access real-time metrics at `/api/v1/analytics/realtime`

## 🆘 Getting Help

- **API Documentation**: <http://localhost:8000/docs>
- **Check logs**: Server logs show detailed error messages
- **MongoDB logs**: Check MongoDB logs for database issues
- **Test script**: Run `python test_api.py` to diagnose issues

## ✅ Verification Checklist

Before connecting the frontend, verify:

- [ ] Server starts without errors
- [ ] Health check returns "healthy"
- [ ] MongoDB connection is "connected"
- [ ] API docs load at /docs
- [ ] Test script passes all tests
- [ ] Can generate dual responses
- [ ] CORS origins include frontend URL

---

🎉 **You're all set!** The Citrus backend is now ready to power your LLM evaluation platform.
