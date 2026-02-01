# 🍋 Citrus - LLM Evaluation Platform (Backend)

A professional-grade backend for evaluating, comparing, and analyzing Large Language Models with real-time tracing and analytics.

## ✨ Features

- **Dual Response Generation**: Compare two model responses side-by-side
- **Preference Learning**: Collect and analyze user preferences
- **Real-time Tracing**: Track every API call, token usage, and latency
- **Performance Analytics**: Dashboard-ready metrics and insights
- **Multi-Model Support**: Works with Gemini, GPT-4, Claude, and custom models
- **MongoDB Integration**: Scalable data storage with optimized indexes
- **Production Ready**: Proper error handling, logging, and monitoring

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- MongoDB (local or Atlas)
- At least one LLM API key (Gemini, OpenAI, or Anthropic)

### Installation

1. **Clone the repository**

   ```bash
   cd citrus_backend
   ```

2. **Create virtual environment**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the server**

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

6. **Access the API**
   - API: <http://localhost:8000>
   - Swagger Docs: <http://localhost:8000/docs>
   - ReDoc: <http://localhost:8000/redoc>

## 📁 Project Structure

```
citrus_backend/
├── app/
│   ├── __init__.py
│   ├── config.py                 # Configuration and settings
│   ├── main.py                   # FastAPI application
│   ├── core/
│   │   ├── __init__.py
│   │   ├── database.py           # MongoDB connection
│   │   ├── tracing.py            # Tracing system
│   │   └── trace_storage.py     # Trace persistence
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py            # Pydantic models
│   │   └── state.py              # LangGraph state
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── evaluations.py        # Chat and evaluation endpoints
│   │   └── traces.py             # Analytics endpoints
│   └── services/
│       ├── __init__.py
│       └── graph.py              # LangGraph workflow
├── .env.example                  # Environment template
├── requirements.txt              # Python dependencies
└── README.md                     # This file
```

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Required
MONGODB_URL=mongodb://localhost:27017
GEMINI_API_KEY=your_key_here

# Optional
DEFAULT_MODEL=gemini-1.5-pro
DEFAULT_TEMPERATURE=0.7
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

See `.env.example` for all available options.

## 📡 API Endpoints

### Chat & Evaluation

- `POST /api/dual-responses` - Generate two responses for comparison
- `POST /api/store-preference` - Store user preference
- `POST /api/chat/send` - Send a single chat message
- `GET /api/stats` - Get platform statistics

### Analytics & Traces

- `GET /api/v1/traces` - List traces with filtering
- `GET /api/v1/traces/{trace_id}` - Get specific trace
- `GET /api/v1/traces/statistics` - Aggregated statistics
- `GET /api/v1/models/performance` - Model performance metrics
- `GET /api/v1/analytics/realtime` - Real-time dashboard metrics

### Health & Info

- `GET /health` - Health check
- `GET /` - API information
- `GET /api/info` - Detailed platform info

## 💡 Usage Examples

### Generate Dual Responses

```python
import requests

response = requests.post("http://localhost:8000/api/dual-responses", json={
    "user_message": "Explain quantum computing",
    "chat_history": [],
    "session_id": "test-session-1",
    "temperature": 0.7
})

data = response.json()
print("Response 1:", data["response_1"])
print("Response 2:", data["response_2"])
```

### Store Preference

```python
requests.post("http://localhost:8000/api/store-preference", json={
    "session_id": "test-session-1",
    "user_message": "Explain quantum computing",
    "response_1": "...",
    "response_2": "...",
    "choice": "response_1",
    "reasoning": "More clear and concise"
})
```

### Get Analytics

```python
# Get real-time metrics
stats = requests.get("http://localhost:8000/api/v1/analytics/realtime?minutes=60")
print(stats.json())

# Get model performance
perf = requests.get("http://localhost:8000/api/v1/models/performance?days=7")
print(perf.json())
```

## 🧪 Testing

Run tests with pytest:

```bash
pytest tests/ -v
```

## 🔍 Monitoring & Debugging

### Logs

The application logs to stdout with structured formatting:

```bash
2024-02-01 10:42:00 - app.main - INFO - 🚀 Starting Citrus Platform...
2024-02-01 10:42:01 - app.core.database - INFO - ✓ Database connected
```

### Tracing

Every request is automatically traced with:

- Latency measurements
- Token usage
- Error tracking
- Model metadata

Access traces via `/api/v1/traces` endpoints.

### Health Check

Monitor system health:

```bash
curl http://localhost:8000/health
```

Returns:

```json
{
  "status": "healthy",
  "database": "connected",
  "version": "2.4.0",
  "uptime_seconds": 3600.5,
  "timestamp": "2024-02-01T10:42:00Z"
}
```

## 🚦 Production Deployment

### Docker

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t citrus-backend .
docker run -p 8000:8000 --env-file .env citrus-backend
```

### Production Settings

In production, update these settings:

```bash
# Use production MongoDB
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/

# Restrict CORS
CORS_ORIGINS=https://yourdomain.com

# Enable API keys
API_KEY_REQUIRED=true
API_KEYS=prod_key_1,prod_key_2

# Reduce logging
DEBUG=false
```

## 🛠️ Development

### Code Style

```bash
# Format code
black app/

# Lint
flake8 app/

# Type check
mypy app/
```

### Adding New Models

1. Update `app/config.py` with model configuration
2. Add model wrapper if needed in `app/core/model_wrappers.py`
3. Update `app/services/graph.py` to use the new model

### Adding New Endpoints

1. Create router in `app/routers/`
2. Define Pydantic schemas in `app/models/schemas.py`
3. Include router in `app/main.py`

## 📊 Database Schema

### Collections

- **evaluations**: Evaluation results and metrics
- **preferences**: User preference submissions
- **traces**: Detailed execution traces
- **analytics**: Aggregated analytics data
- **models**: Model configurations

### Indexes

Automatically created on startup for optimal query performance.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

- Documentation: <http://localhost:8000/docs>
- Issues: GitHub Issues
- Email: <support@citrus.ai>

## 🎯 Roadmap

- [ ] Support for more LLM providers
- [ ] Advanced analytics visualizations
- [ ] A/B testing framework
- [ ] Custom evaluation metrics
- [ ] Real-time collaboration
- [ ] Export to popular formats

---

Built with ❤️ using FastAPI, LangGraph, and MongoDB
