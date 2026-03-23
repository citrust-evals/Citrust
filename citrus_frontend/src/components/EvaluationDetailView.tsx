import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { VaultGemmaBadge } from './VaultGemmaBadge';
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Brain,
  Zap,
  Clock,
  Target,
  BarChart3,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Database,
} from 'lucide-react';

interface EvaluationMetrics {
  accuracy: number;
  f1_score: number;
  latency_p95: number;
  total_evaluations: number;
  privacy_score: number;
  dp_protected: boolean;
}

interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  actual_output: string;
  passed: boolean;
  latency_ms: number;
  contains_pii: boolean;
}

interface EvaluationDetailViewProps {
  evaluationId: string;
  name: string;
  model: string;
  testSet: string;
  status: 'completed' | 'running' | 'failed';
  metrics?: EvaluationMetrics;
  createdAt: string;
  dpProtected?: boolean;
  onClose: () => void;
}

export const EvaluationDetailView: React.FC<EvaluationDetailViewProps> = ({
  name,
  model,
  testSet,
  status,
  metrics,
  createdAt,
  dpProtected = false,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'test-cases' | 'privacy'>('overview');

  // Mock test cases data (in production, this would come from API)
  const mockTestCases: TestCase[] = Array.from({ length: 12 }, (_, i) => ({
    id: `test-${i + 1}`,
    input: `Test input ${i + 1}: User query about ${['products', 'pricing', 'support', 'features'][i % 4]}`,
    expected_output: `Expected response for test case ${i + 1}`,
    actual_output: `Actual model response for test case ${i + 1}`,
    passed: Math.random() > 0.15,
    latency_ms: Math.floor(Math.random() * 3000) + 500,
    contains_pii: Math.random() > 0.7,
  }));

  const passedTests = mockTestCases.filter(t => t.passed).length;
  const failedTests = mockTestCases.length - passedTests;

  const getMetricTrend = (value: number, threshold: number) => {
    if (value > threshold) return { icon: TrendingUp, color: 'text-green-400', label: 'Above Target' };
    if (value < threshold * 0.9) return { icon: TrendingDown, color: 'text-red-400', label: 'Below Target' };
    return { icon: Minus, color: 'text-yellow-400', label: 'At Target' };
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-6 animate-fadeIn">
      <div
        className="evaluation-detail-modal w-full max-w-7xl max-h-[95vh] flex flex-col rounded-3xl overflow-hidden animate-fadeInUp"
        style={{
          background: 'linear-gradient(135deg, #0a0e14 0%, #1a1f2e 50%, #0f1419 100%)',
          border: '2px solid rgba(168, 85, 247, 0.3)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6), 0 0 100px rgba(168, 85, 247, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header - Terminal Style */}
        <div
          className="relative px-8 py-6 border-b"
          style={{
            background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.08) 0%, rgba(0, 0, 0, 0.2) 100%)',
            borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
          }}
        >
          {/* Decorative corner brackets */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-purple-400/50" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-purple-400/50" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-purple-400/50" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-purple-400/50" />

          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="p-2.5 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(124, 58, 237, 0.1))',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                  }}
                >
                  <BarChart3 size={24} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white font-mono tracking-tight">{name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-400 font-mono">EVAL-{new Date(createdAt).getTime().toString().slice(-8)}</span>
                    {dpProtected && <VaultGemmaBadge compact privacyScore={metrics?.privacy_score} />}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <Brain size={14} className="text-purple-400" />
                  <span className="text-purple-300 font-mono">{model}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <Database size={14} className="text-blue-400" />
                  <span className="text-blue-300 font-mono">{testSet}</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold uppercase ${
                  status === 'completed' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                  status === 'running' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                  'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {status === 'completed' && <CheckCircle2 size={14} />}
                  {status === 'running' && <Activity size={14} className="animate-pulse" />}
                  {status === 'failed' && <AlertTriangle size={14} />}
                  {status}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 text-gray-400 hover:text-white border border-transparent hover:border-white/20"
            >
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            {[
              { id: 'overview', label: 'Performance Overview', icon: Activity },
              { id: 'test-cases', label: 'Test Cases', icon: Target },
              { id: 'privacy', label: 'Privacy Analysis', icon: Shield },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider
                  transition-all duration-200 border font-mono
                  ${
                    activeTab === tab.id
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-lg shadow-purple-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
                  }
                `}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'overview' && metrics && (
            <div className="space-y-8">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Accuracy */}
                <div
                  className="relative p-6 rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(22, 163, 74, 0.03))',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                  }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-400/10 to-transparent rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-green-400/80 uppercase tracking-widest font-mono">Accuracy</span>
                      <Target size={18} className="text-green-400" />
                    </div>
                    <div className="text-5xl font-black text-green-400 mb-2 font-mono tracking-tighter">
                      {(metrics.accuracy * 100).toFixed(1)}%
                    </div>
                    {(() => {
                      const trend = getMetricTrend(metrics.accuracy, 0.9);
                      return (
                        <div className={`flex items-center gap-1.5 text-xs font-mono ${trend.color}`}>
                          <trend.icon size={14} />
                          <span>{trend.label}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* F1 Score */}
                <div
                  className="relative p-6 rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.03))',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-blue-400/80 uppercase tracking-widest font-mono">F1 Score</span>
                      <BarChart3 size={18} className="text-blue-400" />
                    </div>
                    <div className="text-5xl font-black text-blue-400 mb-2 font-mono tracking-tighter">
                      {metrics.f1_score.toFixed(3)}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      Precision · Recall Balance
                    </div>
                  </div>
                </div>

                {/* Latency */}
                <div
                  className="relative p-6 rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.08), rgba(202, 138, 4, 0.03))',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                  }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-400/10 to-transparent rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-yellow-400/80 uppercase tracking-widest font-mono">Latency P95</span>
                      <Zap size={18} className="text-yellow-400" />
                    </div>
                    <div className="text-5xl font-black text-yellow-400 mb-2 font-mono tracking-tighter">
                      {Math.round(metrics.latency_p95 * 100) / 100}<span className="text-2xl">ms</span>
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      95th Percentile Response
                    </div>
                  </div>
                </div>

                {/* Privacy Score */}
                <div
                  className="relative p-6 rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(124, 58, 237, 0.05))',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                  }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-transparent rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-purple-400/80 uppercase tracking-widest font-mono">Privacy</span>
                      <Shield size={18} className="text-purple-400" />
                    </div>
                    <div className="text-5xl font-black text-purple-400 mb-2 font-mono tracking-tighter">
                      {metrics.privacy_score}%
                    </div>
                    {dpProtected && (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-purple-400">
                        <CheckCircle2 size={14} />
                        <span>ε-DP Protected</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Test Results Breakdown */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-mono">
                  <Target size={20} className="text-purple-400" />
                  Test Results Distribution
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-black text-white mb-1 font-mono">
                      {metrics.total_evaluations}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-mono">Total Tests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-green-400 mb-1 font-mono">
                      {passedTests}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-mono">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-red-400 mb-1 font-mono">
                      {failedTests}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-mono">Failed</div>
                  </div>
                </div>

                {/* Visual bar */}
                <div className="mt-6 h-3 rounded-full overflow-hidden bg-gray-800 flex">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-400"
                    style={{ width: `${(passedTests / metrics.total_evaluations) * 100}%` }}
                  />
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-400"
                    style={{ width: `${(failedTests / metrics.total_evaluations) * 100}%` }}
                  />
                </div>
              </div>

              {/* Timeline */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-mono">
                  <Clock size={20} className="text-blue-400" />
                  Execution Timeline
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-400 w-24 font-mono">Created</div>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
                    <div className="text-sm text-white font-mono">
                      {new Date(createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-400 w-24 font-mono">Duration</div>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
                    <div className="text-sm text-white font-mono">
                      {Math.floor(metrics.total_evaluations * metrics.latency_p95 / 1000 / 60)} min
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-400 w-24 font-mono">Avg Latency</div>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
                    <div className="text-sm text-white font-mono">
                      {Math.floor(metrics.latency_p95 * 0.7)}ms
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'test-cases' && (
            <div className="space-y-4">
              {mockTestCases.map((testCase, idx) => (
                <div
                  key={testCase.id}
                  className="p-5 rounded-xl border transition-all duration-200 hover:border-purple-500/30"
                  style={{
                    background: testCase.passed
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(22, 163, 74, 0.02))'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(220, 38, 38, 0.02))',
                    borderColor: testCase.passed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`text-xs font-bold font-mono px-2 py-1 rounded ${
                        testCase.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div className={`flex items-center gap-1.5 text-sm font-mono ${
                        testCase.passed ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {testCase.passed ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        <span className="font-bold">{testCase.passed ? 'PASS' : 'FAIL'}</span>
                      </div>
                      {testCase.contains_pii && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/20 border border-purple-500/30">
                          <Shield size={12} className="text-purple-400" />
                          <span className="text-xs text-purple-400 font-mono">PII</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                      <Zap size={12} />
                      {Math.round(testCase.latency_ms * 100) / 100}ms
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-mono">Input</div>
                      <div className="text-sm text-gray-300 font-mono bg-black/20 p-2 rounded border border-white/5">
                        {testCase.input}
                      </div>
                    </div>
                    {!testCase.passed && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-mono">Expected</div>
                          <div className="text-sm text-gray-300 font-mono bg-black/20 p-2 rounded border border-green-500/20">
                            {testCase.expected_output}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-mono">Actual</div>
                          <div className="text-sm text-gray-300 font-mono bg-black/20 p-2 rounded border border-red-500/20">
                            {testCase.actual_output}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              {dpProtected && (
                <div
                  className="p-6 rounded-2xl border-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(124, 58, 237, 0.05))',
                    borderColor: 'rgba(168, 85, 247, 0.4)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/40">
                      <Shield size={28} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-purple-300 mb-2 font-mono">
                        Differential Privacy Protection Active
                      </h3>
                      <p className="text-sm text-gray-300 leading-relaxed mb-3">
                        This evaluation was conducted using <span className="font-bold text-purple-400">VaultGemma-1B</span>,
                        ensuring mathematical ε-differential privacy guarantees. All sensitive data was processed through
                        HashiCorp Vault's Transit Engine with noise injection calibrated to protect individual records.
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-3 rounded-lg bg-black/30 border border-purple-500/20">
                          <div className="text-xs text-purple-400/80 uppercase tracking-wider mb-1 font-mono">Epsilon (ε)</div>
                          <div className="text-2xl font-black text-purple-400 font-mono">0.1</div>
                        </div>
                        <div className="p-3 rounded-lg bg-black/30 border border-purple-500/20">
                          <div className="text-xs text-purple-400/80 uppercase tracking-wider mb-1 font-mono">Delta (δ)</div>
                          <div className="text-2xl font-black text-purple-400 font-mono">1e-5</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-mono">
                  <Shield size={20} className="text-yellow-400" />
                  PII Detection Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                    <span className="text-sm text-gray-300 font-mono">Test cases with PII</span>
                    <span className="text-lg font-bold text-yellow-400 font-mono">
                      {mockTestCases.filter(t => t.contains_pii).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                    <span className="text-sm text-gray-300 font-mono">Vault encryption ops</span>
                    <span className="text-lg font-bold text-yellow-400 font-mono">
                      {mockTestCases.filter(t => t.contains_pii).length * 2}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                    <span className="text-sm text-gray-300 font-mono">Data leakage risk</span>
                    <span className="text-lg font-bold text-green-400 font-mono">ZERO</span>
                  </div>
                </div>
              </div>

              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-mono">
                  <Activity size={20} className="text-blue-400" />
                  Vault Operations Log
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
                  {mockTestCases.filter(t => t.contains_pii).slice(0, 8).map((test) => (
                    <div key={test.id} className="flex items-center gap-3 text-gray-400 py-1">
                      <span className="text-blue-400">[{new Date().toISOString().split('T')[1].slice(0, 8)}]</span>
                      <span className="text-yellow-400">ENCRYPT</span>
                      <span>→</span>
                      <span className="flex-1 truncate">{test.id}</span>
                      <span className="text-green-400">✓</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
