import React from 'react';
import { VaultGemmaBadge } from './VaultGemmaBadge';
import { Shield, Brain, Zap, TrendingUp, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';

interface EvaluationMetrics {
  accuracy: number;
  f1_score: number;
  latency_p95: number;
  total_evaluations: number;
  privacy_score: number; // 0-100
  dp_protected: boolean;
}

interface EvaluationCardProps {
  name: string;
  model: string;
  testSet: string;
  status: 'completed' | 'running' | 'failed';
  metrics?: EvaluationMetrics;
  createdAt: string;
  dpProtected?: boolean;
  onClick?: () => void;
}

export const EvaluationCard: React.FC<EvaluationCardProps> = ({
  name,
  model,
  testSet,
  status,
  metrics,
  createdAt,
  dpProtected = false,
  onClick,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'running':
        return 'text-blue-400';
      case 'failed':
        return 'text-red-400';
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 border-green-500/30';
      case 'running':
        return 'bg-blue-500/10 border-blue-500/30';
      case 'failed':
        return 'bg-red-500/10 border-red-500/30';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        evaluation-card
        glass-panel rounded-xl p-5 border border-white/10
        hover:border-primary/30 hover:shadow-lg
        transition-all duration-300 cursor-pointer
        group relative overflow-hidden
      `}
      style={{
        background: dpProtected
          ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.03), rgba(168, 85, 247, 0.01))'
          : 'rgba(255, 255, 255, 0.02)',
      }}
    >
      {/* DP Protected indicator overlay */}
      {dpProtected && (
        <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity">
          <Shield size={128} className="text-purple-400 transform rotate-12" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{name}</h3>
            {dpProtected && <VaultGemmaBadge compact privacyScore={metrics?.privacy_score} />}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
            <Brain size={14} />
            <span>{model}</span>
            <span className="text-gray-600">•</span>
            <span>{testSet}</span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase border ${getStatusBg()} ${getStatusColor()}`}>
          {status}
        </div>
      </div>

      {/* Metrics Grid */}
      {metrics && status === 'completed' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Accuracy */}
          <div className="metric-mini-compact">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Accuracy</div>
            <div className="text-xl font-bold font-mono text-white">{(metrics.accuracy * 100).toFixed(1)}%</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp size={10} className="text-green-400" />
              <span className="text-[10px] text-green-400">Excellent</span>
            </div>
          </div>

          {/* F1 Score */}
          <div className="metric-mini-compact">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">F1 Score</div>
            <div className="text-xl font-bold font-mono text-white">{metrics.f1_score.toFixed(3)}</div>
          </div>

          {/* Latency */}
          <div className="metric-mini-compact">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Latency P95</div>
            <div className="text-xl font-bold font-mono text-blue-400">{Math.round(metrics.latency_p95 * 100) / 100}ms</div>
            <div className="flex items-center gap-1 mt-1">
              <Zap size={10} className="text-yellow-400" />
              <span className="text-[10px] text-yellow-400">Fast</span>
            </div>
          </div>

          {/* Privacy Score */}
          <div
            className="metric-mini-compact border border-purple-500/30"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(124, 58, 237, 0.05))',
            }}
          >
            <div className="text-xs text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Shield size={10} />
              Privacy
            </div>
            <div className="text-xl font-bold font-mono text-purple-400">{metrics.privacy_score}%</div>
            {dpProtected && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle2 size={10} className="text-purple-400" />
                <span className="text-[10px] text-purple-400">Leak-Proof</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Running state */}
      {status === 'running' && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse-slow" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-blue-400">Evaluation in progress...</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {metrics?.total_evaluations || 0} / 100 test cases completed
            </div>
          </div>
          <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
              style={{ width: `${((metrics?.total_evaluations || 0) / 100) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock size={12} />
          <span>Created {new Date(createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
          <span>View Details</span>
          <ChevronRight size={16} />
        </div>
      </div>

      {/* DP Protection callout */}
      {dpProtected && metrics && (
        <div className="mt-3 pt-3 border-t border-purple-500/20">
          <div
            className="flex items-center gap-2 p-2 rounded-lg"
            style={{
              background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.1), rgba(124, 58, 237, 0.05))',
              border: '1px solid rgba(168, 85, 247, 0.2)',
            }}
          >
            <Shield size={14} className="text-purple-400 flex-shrink-0" />
            <p className="text-xs text-purple-300">
              Evaluated with <span className="font-semibold">VaultGemma-1B</span> • Mathematical DP guarantee ensures
              zero data leakage
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
