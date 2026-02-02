// API client for Citrus LLM Evaluation Platform
// Connects to FastAPI backend

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DualResponseRequest {
  chat_history: ChatMessage[];
  user_message: string;
  user_id?: string;
  session_id?: string;
  chat_id?: string;
}

export interface StreamEvent {
  type: 'trace_info' | 'content' | 'streams_complete' | 'error';
  trace_id?: string;
  response_id?: number;
  content?: string;
  error?: string;
  model?: string;
}

export interface Evaluation {
  _id: string;
  session_id: string;
  user_id?: string;
  chat_id?: string;
  user_prompt: string;
  responses?: string[];
  winner_index?: number;
  selected_response_text?: string;
  feedback?: string;
  timestamp?: string;
  model_used?: string;
}

export interface EvaluationStats {
  total_evaluations: number;
  total_preferences?: number;
  avg_response_length?: number;
  unique_users?: number;
  unique_sessions?: number;
}

export interface Trace {
  trace_id: string;
  name: string;
  user_id?: string;
  session_id?: string;
  status: 'success' | 'error' | 'running';
  start_time: string;
  end_time?: string;
  total_latency_ms?: number;
  total_token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  spans?: TraceSpan[];
  metadata?: Record<string, any>;
}

export interface TraceSpan {
  span_id: string;
  parent_span_id?: string;
  name: string;
  span_type: 'llm' | 'tool' | 'chain' | 'agent' | 'retriever';
  start_time: string;
  end_time?: string;
  latency_ms?: number;
  model_name?: string;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  input?: any;
  output?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TraceStatistics {
  total_traces: number;
  successful_traces: number;
  failed_traces: number;
  latency: {
    avg_ms: number;
    min_ms: number;
    max_ms: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
  };
  tokens: {
    total: number;
    prompt: number;
    completion: number;
    avg_per_trace: number;
  };
  models_used: Array<{
    model: string;
    call_count: number;
    total_tokens: number;
    avg_latency_ms: number;
  }>;
  time_range?: {
    start: string;
    end: string;
  };
}

// ============================================
// CHAT ENDPOINTS
// ============================================

export async function* streamDualResponses(
  request: DualResponseRequest
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE}/api/v1/dual-responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield data as StreamEvent;
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      }
    }
  }
}

// ============================================
// EVALUATION ENDPOINTS
// ============================================

export async function getEvaluations(params?: {
  session_id?: string;
  user_id?: string;
  skip?: number;
  limit?: number;
}): Promise<{ evaluations: Evaluation[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.session_id) query.append('session_id', params.session_id);
  if (params?.user_id) query.append('user_id', params.user_id);
  if (params?.skip) query.append('skip', params.skip.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const response = await fetch(`${API_BASE}/api/v1/traces?${query}`);
  if (!response.ok) throw new Error('Failed to fetch evaluations');
  return response.json();
}

export async function getEvaluation(id: string): Promise<Evaluation> {
  const response = await fetch(`${API_BASE}/api/v1/traces/${id}`);
  if (!response.ok) throw new Error('Failed to fetch evaluation');
  return response.json();
}

export async function getEvaluationStats(): Promise<EvaluationStats> {
  const response = await fetch(`${API_BASE}/api/v1/stats`);
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
}

export async function submitPreference(data: {
  session_id: string;
  winner_index: number;
  responses: string[];
  user_prompt?: string;
  feedback?: string;
}): Promise<any> {
  const response = await fetch(`${API_BASE}/api/v1/store-preference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to submit preference');
  return response.json();
}

// ============================================
// TRACE ENDPOINTS
// ============================================

export async function getTraces(params?: {
  user_id?: string;
  session_id?: string;
  model_name?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  skip?: number;
  limit?: number;
}): Promise<{ traces: Trace[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.user_id) query.append('user_id', params.user_id);
  if (params?.session_id) query.append('session_id', params.session_id);
  if (params?.model_name) query.append('model_name', params.model_name);
  if (params?.status) query.append('status', params.status);
  if (params?.start_time) query.append('start_time', params.start_time);
  if (params?.end_time) query.append('end_time', params.end_time);
  if (params?.skip) query.append('skip', params.skip.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const response = await fetch(`${API_BASE}/api/v1/traces?${query}`);
  if (!response.ok) throw new Error('Failed to fetch traces');
  const data = await response.json();

  // Backend returns array directly with 'id' field, transform to expected format
  const traces = Array.isArray(data) ? data : (data.traces || []);
  const transformedTraces = traces.map((trace: any) => ({
    ...trace,
    trace_id: trace.trace_id || trace.id, // Map 'id' to 'trace_id' if needed
    name: trace.name || 'Unnamed Trace',
    status: trace.status || 'unknown',
    start_time: trace.start_time || trace.start_timestamp,
    end_time: trace.end_time || trace.end_timestamp,
  }));

  return {
    traces: transformedTraces,
    total: Array.isArray(data) ? data.length : (data.total || traces.length)
  };
}

export async function getTrace(
  traceId: string,
  treeView: boolean = false
): Promise<{ success: boolean; trace: Trace }> {
  const query = treeView ? '?tree_view=true' : '';
  const response = await fetch(`${API_BASE}/api/v1/traces/${traceId}${query}`);
  if (!response.ok) throw new Error('Failed to fetch trace');
  const data = await response.json();

  // Transform the trace data to match frontend expected format
  const trace = data.trace || data;
  const transformedTrace = {
    ...trace,
    trace_id: trace.trace_id || trace.id,
    name: trace.name || 'Unnamed Trace',
    status: trace.status || 'unknown',
    start_time: trace.start_time || trace.start_timestamp,
    end_time: trace.end_time || trace.end_timestamp,
    spans: (trace.spans || []).map((span: any) => ({
      ...span,
      span_id: span.span_id || span.id,
      span_type: span.span_type || 'generic',
      latency_ms: span.latency_ms || 0,
    })),
  };

  return { success: true, trace: transformedTrace };
}


export async function getTraceStatistics(params?: {
  start_time?: string;
  end_time?: string;
  user_id?: string;
  model_name?: string;
}): Promise<TraceStatistics> {
  const query = new URLSearchParams();
  if (params?.start_time) query.append('start_time', params.start_time);
  if (params?.end_time) query.append('end_time', params.end_time);
  if (params?.user_id) query.append('user_id', params.user_id);
  if (params?.model_name) query.append('model_name', params.model_name);

  const response = await fetch(`${API_BASE}/api/v1/traces/statistics?${query}`);
  if (!response.ok) throw new Error('Failed to fetch statistics');
  return response.json();
}

export async function getSessionTraces(
  sessionId: string
): Promise<{ traces: Trace[]; total: number }> {
  const response = await fetch(`${API_BASE}/api/v1/traces?session_id=${sessionId}`);
  if (!response.ok) throw new Error('Failed to fetch session traces');
  return response.json();
}

// ============================================
// HEALTH CHECK
// ============================================

export async function healthCheck(): Promise<{
  status: string;
  version: string;
  mongodb_connected: boolean;
}> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error('Health check failed');
  return response.json();
}