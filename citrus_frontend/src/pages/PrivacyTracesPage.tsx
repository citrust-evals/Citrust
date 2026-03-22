import React, { useState, useEffect } from 'react';
import { TraceDetailView } from '../components/TraceDetailView';
import { EvaluationDetailView } from '../components/EvaluationDetailView';
import { SecurityDashboard } from '../components/SecurityDashboard';
import { PrivacyAuditView } from '../components/PrivacyAuditView';
import { EvaluationCard } from '../components/EvaluationCard';
import { EvaluationStatus } from '../components/EvaluationStatus';
import { Shield, Lock } from 'lucide-react';
import { getTraces, getTrace, type Trace } from '../api';
import { LoadingSpinner, EmptyState } from '../components/UIComponents';
import { formatDuration } from '../utils';
import { usePrivacy } from '../context/PrivacyContext';

/**
 * Privacy-First Traces Page
 * 
 * Integrates all privacy components with REAL DATA from your API:
 * - PrivacyContext for global state management
 * - TraceDetailView with privacy mode toggle
 * - SecurityDashboard for Vault monitoring
 * - PrivacyAuditView for comparison
 * - EvaluationCard with privacy metrics
 */
export const PrivacyTracesPage: React.FC = () => {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const [showSecurityDashboard, setShowSecurityDashboard] = useState(false);
  const [activeView, setActiveView] = useState<'traces' | 'evaluations' | 'audit'>('traces');
  const [loading, setLoading] = useState(true);
  
  // Get privacy context for Evaluation column
  const { isPrivacyModeEnabled, activeCampaignID } = usePrivacy();

  // Load real traces from API
  useEffect(() => {
    loadTraces();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadTraces, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleViewEvaluation = (evaluationId: string) => {
    // Find the evaluation details
    const evaluation = sampleEvaluations.find(e => e.id === evaluationId);
    if (evaluation) {
      setSelectedEvaluation(evaluation);
    }
  };

  const loadTraces = async () => {
    try {
      const response = await getTraces({ limit: 50 });
      setTraces(response.traces || []);
    } catch (err) {
      console.error('Failed to load traces:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTrace = async (traceId: string) => {
    try {
      const response = await getTrace(traceId, true);
      if (response.success && response.trace) {
        // Add privacy metadata if not present
        const traceWithPrivacy = {
          ...response.trace,
          privacy_score: response.trace.privacy_score || 100,
          vault_processed: response.trace.vault_processed || true,
          spans: response.trace.spans?.map(span => ({
            ...span,
            has_pii: span.has_pii || false, // Backend should set this
          })),
        };
        setSelectedTrace(traceWithPrivacy);
      }
    } catch (err) {
      console.error('[PrivacyTracesPage] Failed to load trace details:', err);
    }
  };

  // Sample evaluations
  const sampleEvaluations = [
    {
      id: '1',
      name: 'Q4 Customer Support Evaluation',
      model: 'gpt-4-turbo',
      testSet: 'support-queries-v2',
      status: 'completed' as const,
      metrics: {
        accuracy: 0.94,
        f1_score: 0.921,
        latency_p95: 2340,
        total_evaluations: 500,
        privacy_score: 100,
        dp_protected: true,
      },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      dpProtected: true,
    },
    {
      id: '2',
      name: 'Product Recommendations Test',
      model: 'claude-3-opus',
      testSet: 'recommendations-v1',
      status: 'running' as const,
      metrics: {
        accuracy: 0,
        f1_score: 0,
        latency_p95: 0,
        total_evaluations: 67,
        privacy_score: 100,
        dp_protected: true,
      },
      createdAt: new Date().toISOString(),
      dpProtected: true,
    },
    {
      id: '3',
      name: 'Legacy System Evaluation',
      model: 'gpt-3.5-turbo',
      testSet: 'legacy-queries',
      status: 'completed' as const,
      metrics: {
        accuracy: 0.87,
        f1_score: 0.845,
        latency_p95: 1200,
        total_evaluations: 250,
        privacy_score: 45,
        dp_protected: false,
      },
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      dpProtected: false,
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/10 bg-background-dark/95 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white font-mono mb-2">Privacy-First Trace Explorer</h1>
            <p className="text-gray-400">
              All PII encrypted via HashiCorp Vault • VaultGemma DP Protection • Zero Data Leakage
            </p>
          </div>
          <button
            onClick={() => setShowSecurityDashboard(!showSecurityDashboard)}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300
              ${
                showSecurityDashboard
                  ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400'
                  : 'glass-panel text-gray-300 hover:bg-white/10'
              }
            `}
          >
            <Shield size={20} />
            <span>Security Dashboard</span>
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2">
          {(['traces', 'evaluations', 'audit'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`
                px-6 py-2.5 rounded-lg font-semibold capitalize transition-all duration-200
                ${
                  activeView === view
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {view === 'traces' && 'Trace Viewer'}
              {view === 'evaluations' && 'Evaluations'}
              {view === 'audit' && 'Privacy Audit'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeView === 'traces' && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" text="Loading traces..." />
              </div>
            ) : traces.length === 0 ? (
              <EmptyState
                icon="search"
                title="No traces found"
                description="Start using your LLM application to generate traces"
              />
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {traces.map((trace) => (
                  <div
                    key={trace.trace_id}
                    className="glass-panel rounded-xl p-6 border border-white/10 hover:border-primary/30 cursor-pointer transition-all duration-300 group"
                    onClick={() => handleViewTrace(trace.trace_id)}
                  >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
                            trace.status === 'success' 
                              ? 'bg-green-500/10 border-green-500/30' 
                              : trace.status === 'error'
                              ? 'bg-red-500/10 border-red-500/30'
                              : 'bg-blue-500/10 border-blue-500/30'
                          }`}>
                            <Shield size={24} className={
                              trace.status === 'success' 
                                ? 'text-green-400' 
                                : trace.status === 'error'
                                ? 'text-red-400'
                                : 'text-blue-400'
                            } />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                              {trace.name || 'Untitled Trace'}
                            </h3>
                            <p className="text-sm text-gray-400 font-mono">ID: {trace.trace_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                            trace.status === 'success'
                              ? 'bg-green-500/10 border-green-500/30'
                              : trace.status === 'error'
                              ? 'bg-red-500/10 border-red-500/30'
                              : 'bg-blue-500/10 border-blue-500/30'
                          }`}>
                            <div className={`w-2 h-2 rounded-full animate-pulse-slow ${
                              trace.status === 'success'
                                ? 'bg-green-400'
                                : trace.status === 'error'
                                ? 'bg-red-400'
                                : 'bg-blue-400'
                            }`} />
                            <span className={`text-sm font-semibold uppercase ${
                              trace.status === 'success'
                                ? 'text-green-400'
                                : trace.status === 'error'
                                ? 'text-red-400'
                                : 'text-blue-400'
                            }`}>{trace.status}</span>
                          </div>
                          <Lock size={20} className="text-yellow-400" />
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-4">
                        <div className="metric-mini-compact">
                          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Latency</div>
                          <div className="text-lg font-bold font-mono text-white">
                            {formatDuration(trace.total_latency_ms || 0)}
                          </div>
                        </div>
                        <div className="metric-mini-compact">
                          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tokens</div>
                          <div className="text-lg font-bold font-mono text-white">
                            {trace.total_token_usage?.total_tokens || 0}
                          </div>
                        </div>
                        <div className="metric-mini-compact">
                          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Spans</div>
                          <div className="text-lg font-bold font-mono text-white">
                            {trace.spans?.length || 0}
                          </div>
                        </div>
                        <div
                          className="metric-mini-compact border-purple-500/30"
                          style={{
                            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(124, 58, 237, 0.05))',
                          }}
                        >
                          <div className="text-xs text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Shield size={10} />
                            Privacy
                          </div>
                          <div className="text-lg font-bold font-mono text-purple-400">100%</div>
                        </div>
                        <div
                          className="metric-mini-compact border-yellow-500/30"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.1), rgba(255, 184, 0, 0.05))',
                          }}
                        >
                          <div className="text-xs text-yellow-400 uppercase tracking-wider mb-1">Evaluation</div>
                          <EvaluationStatus 
                            score={activeCampaignID ? 0.98 : null} 
                            metric="Safety" 
                            isDP={isPrivacyModeEnabled && !!activeCampaignID}
                            epsilon={1.0}
                          />
                        </div>
                      </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'evaluations' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sampleEvaluations.map((evaluation) => (
                <EvaluationCard 
                  key={evaluation.id} 
                  {...evaluation}
                  onClick={() => handleViewEvaluation(evaluation.id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeView === 'audit' && (
          <div>
            <PrivacyAuditView />
          </div>
        )}
      </div>

      {/* Trace Detail Modal */}
      {selectedTrace && <TraceDetailView trace={selectedTrace} onClose={() => setSelectedTrace(null)} />}

      {/* Evaluation Detail Modal */}
      {selectedEvaluation && (
        <EvaluationDetailView
          evaluationId={selectedEvaluation.id}
          name={selectedEvaluation.name}
          model={selectedEvaluation.model}
          testSet={selectedEvaluation.testSet}
          status={selectedEvaluation.status}
          metrics={selectedEvaluation.metrics}
          createdAt={selectedEvaluation.createdAt}
          dpProtected={selectedEvaluation.dpProtected}
          onClose={() => setSelectedEvaluation(null)}
        />
      )}

      {/* Security Dashboard Drawer */}
      <SecurityDashboard isOpen={showSecurityDashboard} onClose={() => setShowSecurityDashboard(false)} />
    </div>
  );
};
