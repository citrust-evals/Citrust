// src/api_evaluations.ts
// API for evaluations dashboard

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface Evaluation {
  _id: string;
  user_id: string;
  session_id: string;
  chat_id: string;
  user_prompt?: string;
  all_responses?: string[];
  selected_response_index?: number;
  selected_response_text?: string;
  thumbs?: "up" | "down";
  feedback_text?: string;
  model_used?: string;
  feedback_created_at?: string;
  [key: string]: any;
}

export interface Stats {
  total_evaluations: number;
  thumbs_up: number;
  thumbs_down: number;
  positive_rate: number;
  unique_users?: number;
  unique_sessions?: number;
}

export async function fetchEvaluations(): Promise<Evaluation[]> {
  const res = await fetch(`${API_BASE}/api/v1/traces`); // fallback to /api/v1/evaluation if needed
  if (!res.ok) throw new Error("Failed to fetch evaluations");
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/api/v1/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}
