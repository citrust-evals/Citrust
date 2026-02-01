# ⚡ Citrus Backend - 5 Minute Quickstart

Get the Citrus backend running in 5 minutes or less!

## Prerequisites

You need just 3 things:

1. Python 3.9+ installed
2. MongoDB running (local or cloud)
3. Google Gemini API key ([Get one free](https://makersuite.google.com/app/apikey))

## 🚀 Fastest Setup

```bash
# 1. Navigate to backend
cd citrus_backend

# 2. Run the setup script
chmod +x run.sh
./run.sh
```

The script will:

- Create virtual environment
- Install dependencies
- Create .env file
- Start the server

## ⚙️ Configure

Edit `.env` file with your API key:

```bash
# Required: Add your Gemini API key
GEMINI_API_KEY=your_actual_api_key_here

# Optional: MongoDB (defaults to localhost)
MONGODB_URL=mongodb://localhost:27017
```

## ✅ Verify

Open in browser:

- **API**: <http://localhost:8000>
- **Docs**: <http://localhost:8000/docs>
- **Health**: <http://localhost:8000/health>

## 🧪 Test

```bash
# In a new terminal (keep server running)
python test_api.py
```

Expected: All 5 tests pass ✓

## 🎯 Try It Out

### Using the API Docs

1. Go to <http://localhost:8000/docs>
2. Click on `POST /api/dual-responses`
3. Click "Try it out"
4. Use this example:

   ```json
   {
     "user_message": "What is 2+2?",
     "chat_history": [],
     "session_id": "test"
   }
   ```

5. Click "Execute"

You should see two different responses!

### Using curl

```bash
curl -X POST http://localhost:8000/api/dual-responses \
  -H "Content-Type: application/json" \
  -d '{
    "user_message": "Explain quantum computing in simple terms",
    "chat_history": [],
    "session_id": "quickstart-test"
  }'
```

## 🐛 Common Issues

### "Server not running"

```bash
# Make sure MongoDB is running
mongosh  # Should connect

# Start server
./run.sh
```

### "No API key configured"

```bash
# Edit .env file
nano .env

# Add your key
GEMINI_API_KEY=your_key_here

# Restart server (Ctrl+C then ./run.sh)
```

### "Port 8000 in use"

```bash
# Use different port
uvicorn app.main:app --reload --port 8001
```

## 📖 What's Next?

- **Full Documentation**: See [README.md](README.md)
- **Setup Guide**: See [SETUP.md](SETUP.md)
- **API Endpoints**: <http://localhost:8000/docs>
- **Connect Frontend**: Configure CORS in .env

## 🎉 That's It

Your backend is now running and ready to power the Citrus frontend!

**Useful Commands**:

```bash
# Start server
./run.sh

# Run tests
python test_api.py

# Check health
curl http://localhost:8000/health

# View logs
# (They appear in the terminal where server is running)
```

---

Need help? Check [SETUP.md](SETUP.md) for detailed troubleshooting.
