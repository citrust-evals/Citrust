// src/api_evaluations.ts
// API for evaluations system

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// =============================================================================
// Type Definitions
// =============================================================================

export interface TestCaseInput {
  prompt: string;
  context?: string;
  metadata?: Record<string, any>;
}

export interface TestCaseOutput {
  expected_response?: string;
  acceptable_responses?: string[];
  reference_summary?: string;
  metadata?: Record<string, any>;
}

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  input: TestCaseInput;
  output?: TestCaseOutput;
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface TestSet {
  id: string;
  name: string;
  description?: string;
  test_cases: TestCase[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  tags: string[];
  metadata: Record<string, any>;
}

export interface ModelConfig {
  model_name: string;
  provider: "google" | "openai" | "anthropic" | "custom";
  temperature: number;
  max_tokens: number;
  system_prompt?: string;
  metadata: Record<string, any>;
}

export type EvaluationType = 
  | "side_by_side" 
  | "single_model" 
  | "multi_model" 
  | "preference" 
  | "rubric" 
  | "ground_truth";

export type CampaignStatus = 
  | "draft" 
  | "running" 
  | "completed" 
  | "failed" 
  | "cancelled";

export interface MetricScore {
  metric_name: string;
  metric_type: string;
  score: number;
  details?: Record<string, any>;
}

export interface RubricScore {
  criterion_name: string;
  score: number;
  feedback?: string;
}

export interface TestCaseResult {
  id: string;
  test_case_id: string;
  test_case_name: string;
  model_name: string;
  input_prompt: string;
  model_response: string;
  expected_response?: string;
  metric_scores: MetricScore[];
  rubric_scores: RubricScore[];
  latency_ms?: number;
  token_count?: number;
  error?: string;
  passed: boolean;
  created_at: string;
}

export interface ModelScore {
  model_name: string;
  total_tests: number;
  passed_tests: number;
  pass_rate: number;
  avg_latency_ms: number;
  total_tokens: number;
  avg_score: number;
  metric_averages: Record<string, number>;
  rubric_averages: Record<string, number>;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  evaluation_type: EvaluationType;
  test_set_id: string;
  model_configs: ModelConfig[];
  metric_names: string[];
  rubrics?: any[];
  status: CampaignStatus;
  progress: number;
  total_test_cases: number;
  completed_test_cases: number;
  results: TestCaseResult[];
  model_scores: Record<string, ModelScore>;
  created_by?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  metadata: Record<string, any>;
}

export interface AvailableModel {
  model_name: string;
  provider: string;
  context_window: number;
  max_output_tokens: number;
  capabilities: string[];
  is_available: boolean;
}

export interface Stats {
  total_evaluations: number;
  total_preferences: number;
  total_traces: number;
  total_campaigns: number;
  total_test_sets: number;
  recent_activity: number;
}

// =============================================================================
// API Functions
// =============================================================================

// Test Sets
export async function fetchTestSets(params?: {
  skip?: number;
  limit?: number;
  search?: string;
}): Promise<{ test_sets: TestSet[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.skip) query.append("skip", params.skip.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.search) query.append("search", params.search);

  const res = await fetch(`${API_BASE}/api/v1/evaluations/test-sets?${query}`);
  if (!res.ok) throw new Error("Failed to fetch test sets");
  const data = await res.json();
  return { test_sets: data.test_sets, total: data.total };
}

export async function fetchTestSet(id: string): Promise<TestSet> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/test-sets/${id}`);
  if (!res.ok) throw new Error("Failed to fetch test set");
  const data = await res.json();
  return data.test_set;
}

export async function createTestSet(testSet: Partial<TestSet>): Promise<TestSet> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/test-sets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testSet),
  });
  if (!res.ok) throw new Error("Failed to create test set");
  const data = await res.json();
  return data.test_set;
}

export async function updateTestSet(id: string, testSet: Partial<TestSet>): Promise<TestSet> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/test-sets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testSet),
  });
  if (!res.ok) throw new Error("Failed to update test set");
  const data = await res.json();
  return data.test_set;
}

export async function deleteTestSet(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/test-sets/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete test set");
}

// Campaigns
export async function fetchCampaigns(params?: {
  skip?: number;
  limit?: number;
  status?: CampaignStatus;
  search?: string;
}): Promise<{ campaigns: Campaign[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.skip) query.append("skip", params.skip.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.status) query.append("status", params.status);
  if (params?.search) query.append("search", params.search);

  const res = await fetch(`${API_BASE}/api/v1/evaluations/campaigns?${query}`);
  if (!res.ok) throw new Error("Failed to fetch campaigns");
  const data = await res.json();
  return { campaigns: data.campaigns, total: data.total };
}

export async function fetchCampaign(id: string): Promise<Campaign> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/campaigns/${id}`);
  if (!res.ok) throw new Error("Failed to fetch campaign");
  const data = await res.json();
  return data.campaign;
}

export async function createCampaign(campaign: Partial<Campaign>): Promise<Campaign> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(campaign),
  });
  if (!res.ok) throw new Error("Failed to create campaign");
  const data = await res.json();
  return data.campaign;
}

export async function deleteCampaign(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/campaigns/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete campaign");
}

export async function runEvaluation(campaignId: string): Promise<{ 
  success: boolean; 
  campaign_id: string;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/run/${campaignId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to start evaluation");
  return res.json();
}

// Compare Models
export async function compareModels(params: {
  test_set_id: string;
  models: ModelConfig[];
  metrics?: string[];
}): Promise<{
  success: boolean;
  test_set_name: string;
  models_compared: string[];
  comparison_metrics: string[];
  model_scores: Record<string, ModelScore>;
  winner?: string;
}> {
  const query = new URLSearchParams();
  query.append("test_set_id", params.test_set_id);
  if (params.metrics) {
    params.metrics.forEach(m => query.append("metrics", m));
  }

  const res = await fetch(
    `${API_BASE}/api/v1/evaluations/compare?${query.toString()}`, 
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.models),
    }
  );
  if (!res.ok) throw new Error("Failed to compare models");
  return res.json();
}

// Available Models
export async function fetchAvailableModels(): Promise<AvailableModel[]> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/models`);
  if (!res.ok) throw new Error("Failed to fetch available models");
  const data = await res.json();
  return data.models;
}

// Evaluate Single Model
export async function evaluateSingleModel(params: {
  model_name: string;
  test_set_id: string;
  model_config?: ModelConfig;
  metrics?: string[];
}): Promise<any> {
  const res = await fetch(
    `${API_BASE}/api/v1/evaluations/models/${params.model_name}/evaluate?test_set_id=${params.test_set_id}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model_config: params.model_config,
        metrics: params.metrics || ["latency", "response_length"],
      }),
    }
  );
  if (!res.ok) throw new Error("Failed to evaluate model");
  return res.json();
}

// Results
export async function fetchResults(params?: {
  campaign_id?: string;
  model_name?: string;
  skip?: number;
  limit?: number;
}): Promise<{ results: TestCaseResult[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.campaign_id) query.append("campaign_id", params.campaign_id);
  if (params?.model_name) query.append("model_name", params.model_name);
  if (params?.skip) query.append("skip", params.skip.toString());
  if (params?.limit) query.append("limit", params.limit.toString());

  const res = await fetch(`${API_BASE}/api/v1/evaluations/results?${query}`);
  if (!res.ok) throw new Error("Failed to fetch results");
  const data = await res.json();
  return { results: data.results, total: data.total };
}

// Seed Sample Data
export async function seedSampleData(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/seed-sample-data`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to seed sample data");
}

// Legacy / Stats
export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  const data = await res.json();
  return data.data;
}
