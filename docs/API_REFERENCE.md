# Citrus LLM Evaluation Platform - API Reference

> **Version**: 2.4.0  
> **Base URL**: `http://localhost:8000`  
> **Last Updated**: March 2026

Complete API reference for the Citrus LLM Evaluation Platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Chat & Evaluations](#chat--evaluations)
4. [Traces & Analytics](#traces--analytics)
5. [Health & Info](#health--info)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

---

## Overview

### Base URLs

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:8000` |
| Production | `https://api.yourdomain.com` |

### Content Types

All endpoints accept and return `application/json` unless otherwise specified.

### API Versioning

Current API version: `v1`

Versioned endpoints: `/api/v1/*`
Legacy endpoints: `/api/*` (deprecated, for backward compatibility)

### Interactive Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Spec**: `http://localhost:8000/openapi.json`

---

## Authentication

### Register User

Create a new user account.

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "message": "OTP sent to email",
  "email": "user@example.com"
}
```

---

### Request OTP (Login)

Request a one-time password for authentication.

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "OTP sent to email",
  "email": "user@example.com"
}
```

---

### Verify OTP

Verify OTP and receive JWT token.

```http
POST /api/auth/verify-otp
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 2592000,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

### Get Current User

Get authenticated user information.

```http
GET /api/auth/me
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2026-03-23T10:00:00Z"
}
```

---

## Chat & Evaluations

### Generate Dual Responses (Streaming)

Generate responses from two models simultaneously with Server-Sent Events (SSE).

```http
POST /api/v1/evaluations/dual-responses
```

**Request Body:**
```json
{
  "user_message": "Explain quantum computing",
  "chat_history": [
    {
      "role": "user",
      "content": "Hello"
    },
    {
      "role": "assistant",
      "content": "Hi! How can I help you?"
    }
  ],
  "session_id": "session-123",
  "temperature": 0.7,
  "max_tokens": 2000
}
```

**Response:** `200 OK` (SSE Stream)
```
event: token
data: {"model": "1", "content": "Quantum"}

event: token
data: {"model": "1", "content": " computing"}

event: token
data: {"model": "2", "content": "Quantum"}

event: done
data: {"trace_id": "trace-abc123", "total_tokens": 500}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_message` | string | Yes | User's input message |
| `chat_history` | array | No | Previous conversation messages |
| `session_id` | string | Yes | Unique session identifier |
| `temperature` | float | No | Model temperature (0-2, default: 0.7) |
| `max_tokens` | int | No | Max tokens per response (default: 2000) |

---

### Store Preference

Store user's preference between two responses.

```http
POST /api/v1/evaluations/store-preference
```

**Request Body:**
```json
{
  "session_id": "session-123",
  "trace_id": "trace-abc123",
  "user_message": "Explain quantum computing",
  "response_1": "Quantum computing uses qubits...",
  "response_2": "In quantum computing, we use...",
  "choice": "response_1",
  "reasoning": "More clear and concise explanation",
  "metadata": {
    "response_time_1": 1200,
    "response_time_2": 1500
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "preference-xyz789",
  "message": "Preference stored successfully",
  "timestamp": "2026-03-23T10:00:00Z"
}
```

**Choice Values:**
- `response_1` - User prefers first response
- `response_2` - User prefers second response
- `tie` - Both responses are equally good

---

### Get Evaluation Statistics

Get aggregated statistics for evaluations.

```http
GET /api/v1/evaluations/stats
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | int | 7 | Number of days to include |
| `session_id` | string | - | Filter by session |

**Response:** `200 OK`
```json
{
  "total_evaluations": 1500,
  "total_preferences": 1200,
  "preference_distribution": {
    "response_1": 45.5,
    "response_2": 42.3,
    "tie": 12.2
  },
  "average_response_time_ms": 1350,
  "models_compared": ["gemini-2.5-flash", "gemini-2.5-pro"],
  "period": {
    "start": "2026-03-16T00:00:00Z",
    "end": "2026-03-23T23:59:59Z"
  }
}
```

---

### Legacy: Dual Responses (Non-versioned)

For backward compatibility only. Use versioned endpoint instead.

```http
POST /api/dual-responses
```

---

## Traces & Analytics

### List Traces

Get paginated list of traces with filtering.

```http
GET /api/v1/traces
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `skip` | int | 0 | Number of records to skip |
| `limit` | int | 50 | Maximum records to return |
| `status` | string | - | Filter by status (success, error, running) |
| `session_id` | string | - | Filter by session |
| `user_id` | string | - | Filter by user |
| `start_date` | datetime | - | Filter from date |
| `end_date` | datetime | - | Filter to date |
| `sort_by` | string | timestamp | Sort field |
| `sort_order` | string | desc | Sort order (asc, desc) |

**Response:** `200 OK`
```json
{
  "traces": [
    {
      "trace_id": "trace-abc123",
      "name": "dual-response-generation",
      "session_id": "session-123",
      "user_id": "user-456",
      "status": "success",
      "start_time": "2026-03-23T10:00:00Z",
      "end_time": "2026-03-23T10:00:02Z",
      "total_latency_ms": 2000,
      "total_token_usage": {
        "prompt_tokens": 150,
        "completion_tokens": 500,
        "total_tokens": 650
      },
      "privacy_score": 100,
      "vault_processed": true
    }
  ],
  "total": 1500,
  "skip": 0,
  "limit": 50
}
```

---

### Get Trace by ID

Get detailed trace information including spans.

```http
GET /api/v1/traces/{trace_id}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `trace_id` | string | Unique trace identifier |

**Response:** `200 OK`
```json
{
  "trace_id": "trace-abc123",
  "name": "dual-response-generation",
  "session_id": "session-123",
  "user_id": "user-456",
  "status": "success",
  "start_time": "2026-03-23T10:00:00Z",
  "end_time": "2026-03-23T10:00:02Z",
  "total_latency_ms": 2000,
  "total_token_usage": {
    "prompt_tokens": 150,
    "completion_tokens": 500,
    "total_tokens": 650
  },
  "spans": [
    {
      "span_id": "span-001",
      "name": "llm_call",
      "parent_span_id": null,
      "start_time": "2026-03-23T10:00:00.100Z",
      "end_time": "2026-03-23T10:00:01.500Z",
      "duration_ms": 1400,
      "status": "success",
      "attributes": {
        "model": "gemini-2.5-flash",
        "temperature": 0.7,
        "input_tokens": 75,
        "output_tokens": 250
      },
      "input": "[MASKED:user_message]",
      "output": "Quantum computing is..."
    }
  ],
  "metadata": {
    "client_ip": "[MASKED:ip]",
    "user_agent": "Mozilla/5.0...",
    "api_version": "v1"
  },
  "privacy_score": 100,
  "vault_processed": true,
  "pii_detected": ["EMAIL_ADDRESS"],
  "encryption_map": {
    "user_message": "vault:v1:abc123..."
  }
}
```

---

### Get Trace Statistics

Get aggregated statistics for traces.

```http
GET /api/v1/traces/statistics
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | int | 7 | Number of days to include |
| `model` | string | - | Filter by model |

**Response:** `200 OK`
```json
{
  "total_traces": 5000,
  "success_rate": 98.5,
  "error_rate": 1.5,
  "latency": {
    "p50": 1200,
    "p95": 2500,
    "p99": 3500,
    "avg": 1400
  },
  "token_usage": {
    "total_prompt_tokens": 750000,
    "total_completion_tokens": 2500000,
    "avg_prompt_tokens": 150,
    "avg_completion_tokens": 500
  },
  "by_status": {
    "success": 4925,
    "error": 75,
    "running": 0
  },
  "by_model": {
    "gemini-2.5-flash": 2500,
    "gemini-2.5-pro": 2500
  },
  "period": {
    "start": "2026-03-16T00:00:00Z",
    "end": "2026-03-23T23:59:59Z"
  }
}
```

---

### Get Session Traces

Get all traces for a specific session.

```http
GET /api/v1/traces/session/{session_id}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `session_id` | string | Session identifier |

**Response:** `200 OK`
```json
{
  "session_id": "session-123",
  "traces": [...],
  "total": 15,
  "total_tokens": 9750,
  "total_latency_ms": 18000
}
```

---

### Evaluate Trace (Privacy-Preserving)

Run VaultGemma evaluation on a trace.

```http
POST /api/v1/traces/{trace_id}/evaluate
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `trace_id` | string | Unique trace identifier |

**Request Body:**
```json
{
  "evaluation_type": "quality",
  "criteria": ["accuracy", "relevance", "coherence"]
}
```

**Response:** `200 OK`
```json
{
  "trace_id": "trace-abc123",
  "evaluation": {
    "scores": {
      "accuracy": 0.92,
      "relevance": 0.88,
      "coherence": 0.95
    },
    "overall_score": 0.917
  },
  "privacy": {
    "dp_protected": true,
    "epsilon": 1.0,
    "delta": 1e-5,
    "privacy_score": 100
  },
  "timestamp": "2026-03-23T10:05:00Z"
}
```

---

### Get Model Performance

Get performance metrics for models.

```http
GET /api/v1/models/performance
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | int | 7 | Number of days to include |
| `models` | string | - | Comma-separated model names |

**Response:** `200 OK`
```json
{
  "models": [
    {
      "name": "gemini-2.5-flash",
      "total_requests": 2500,
      "success_rate": 99.2,
      "latency": {
        "p50": 800,
        "p95": 1500,
        "p99": 2000
      },
      "avg_tokens_per_request": 400,
      "preference_win_rate": 45.5
    },
    {
      "name": "gemini-2.5-pro",
      "total_requests": 2500,
      "success_rate": 98.8,
      "latency": {
        "p50": 1200,
        "p95": 2500,
        "p99": 3500
      },
      "avg_tokens_per_request": 600,
      "preference_win_rate": 54.5
    }
  ],
  "period": {
    "start": "2026-03-16T00:00:00Z",
    "end": "2026-03-23T23:59:59Z"
  }
}
```

---

### Get Real-time Analytics

Get live dashboard metrics.

```http
GET /api/v1/analytics/realtime
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `minutes` | int | 60 | Time window in minutes |

**Response:** `200 OK`
```json
{
  "requests_per_minute": 12.5,
  "active_sessions": 45,
  "error_rate": 0.5,
  "avg_latency_ms": 1250,
  "token_rate": 5000,
  "queue_depth": 3,
  "models_in_use": ["gemini-2.5-flash", "gemini-2.5-pro"],
  "recent_errors": [
    {
      "timestamp": "2026-03-23T09:55:00Z",
      "error_type": "rate_limit",
      "message": "Rate limit exceeded for model gemini-2.5-pro"
    }
  ],
  "time_series": {
    "requests": [...],
    "latency": [...],
    "errors": [...]
  },
  "timestamp": "2026-03-23T10:00:00Z"
}
```

---

## Health & Info

### Root Endpoint

Get API information and available endpoints.

```http
GET /
```

**Response:** `200 OK`
```json
{
  "name": "Citrus - LLM Evaluation Platform",
  "version": "2.4.0",
  "status": "operational",
  "message": "Welcome to Citrus - LLM Evaluation Platform",
  "endpoints": {
    "health": "/health",
    "docs": "/docs",
    "redoc": "/redoc",
    "chat": {
      "dual_responses": "/api/v1/dual-responses",
      "store_preference": "/api/v1/store-preference"
    },
    "analytics": {
      "stats": "/api/v1/stats",
      "traces": "/api/v1/traces",
      "trace_statistics": "/api/v1/statistics",
      "model_performance": "/api/v1/models/performance",
      "realtime": "/api/v1/analytics/realtime"
    }
  },
  "timestamp": "2026-03-23T10:00:00Z"
}
```

---

### Health Check

Check platform health status.

```http
GET /health
```

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "2.4.0",
  "uptime_seconds": 86400.5,
  "timestamp": "2026-03-23T10:00:00Z"
}
```

**Status Values:**
- `healthy` - All systems operational
- `degraded` - Some systems impaired
- `unhealthy` - Critical systems down

---

### API Info

Get detailed platform information.

```http
GET /api/info
```

**Response:** `200 OK`
```json
{
  "platform": "Citrus AI",
  "version": "2.4.0",
  "features": [
    "Dual Response Generation",
    "Preference Learning",
    "Model Performance Analytics",
    "Real-time Tracing",
    "Multi-model Support"
  ],
  "supported_models": [
    "Gemini 1.5 Pro",
    "GPT-4",
    "Claude 3",
    "Custom Models"
  ],
  "capabilities": {
    "chat": true,
    "evaluations": true,
    "analytics": true,
    "tracing": true,
    "preferences": true
  },
  "limits": {
    "max_message_length": 10000,
    "max_chat_history": 20,
    "max_concurrent_requests": 100,
    "request_timeout_seconds": 300
  },
  "timestamp": "2026-03-23T10:00:00Z"
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Error Type",
  "detail": "Human-readable error message",
  "code": "ERROR_CODE",
  "timestamp": "2026-03-23T10:00:00Z"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created |
| `400` | Bad Request | Invalid request body |
| `401` | Unauthorized | Missing or invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `422` | Unprocessable Entity | Validation error |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTH_REQUIRED` | Authentication required |
| `TOKEN_EXPIRED` | JWT token has expired |
| `INVALID_OTP` | OTP code is invalid or expired |
| `RATE_LIMITED` | Request rate limit exceeded |
| `MODEL_ERROR` | LLM API error |
| `DATABASE_ERROR` | Database operation failed |
| `VAULT_ERROR` | Vault operation failed |
| `NOT_FOUND` | Resource not found |
| `INTERNAL_ERROR` | Unexpected server error |

### Example Error Response

```json
{
  "error": "Validation Error",
  "detail": "user_message is required",
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-03-23T10:00:00Z"
}
```

---

## Rate Limiting

### Default Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Chat/Evaluations | 60 requests | 1 minute |
| Analytics | 100 requests | 1 minute |
| Health | No limit | - |

### Rate Limit Headers

Responses include rate limit information:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1679616060
```

### Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
```

```json
{
  "error": "Rate Limit Exceeded",
  "detail": "Too many requests. Please retry after 30 seconds.",
  "code": "RATE_LIMITED",
  "retry_after": 30,
  "timestamp": "2026-03-23T10:00:00Z"
}
```

---

## SDKs and Examples

### Python Client

```python
import requests

BASE_URL = "http://localhost:8000"

# Login
response = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "user@example.com"
})

# Verify OTP
response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
    "email": "user@example.com",
    "otp": "123456"
})
token = response.json()["access_token"]

# Generate dual responses
headers = {"Authorization": f"Bearer {token}"}
response = requests.post(
    f"{BASE_URL}/api/v1/evaluations/dual-responses",
    headers=headers,
    json={
        "user_message": "Explain quantum computing",
        "chat_history": [],
        "session_id": "session-123"
    },
    stream=True
)

# Process SSE stream
for line in response.iter_lines():
    if line:
        print(line.decode())
```

### JavaScript/TypeScript Client

```typescript
const BASE_URL = 'http://localhost:8000';

// Login
const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});

// Verify OTP
const verifyResponse = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', otp: '123456' })
});
const { access_token } = await verifyResponse.json();

// Generate dual responses (SSE)
const eventSource = new EventSource(
  `${BASE_URL}/api/v1/evaluations/dual-responses-stream?token=${access_token}`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};
```

### cURL Examples

```bash
# Health check
curl http://localhost:8000/health

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Generate dual responses
curl -X POST http://localhost:8000/api/v1/evaluations/dual-responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "user_message": "Explain quantum computing",
    "chat_history": [],
    "session_id": "test-123"
  }'

# Get traces
curl "http://localhost:8000/api/v1/traces?limit=10&status=success" \
  -H "Authorization: Bearer <token>"
```

---

*API Reference for Citrus LLM Evaluation Platform v2.4.0*
