import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePrivacy } from '../context/PrivacyContext';
import { MaskedField } from './MaskedField';
import { VaultGemmaBadge } from './VaultGemmaBadge';
import {
  X,
  Clock,
  Zap,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { formatDuration, formatDate } from '../utils';

interface TraceSpan {
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
  has_pii?: boolean;
  pii_fields?: string[];
}

interface Trace {
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
  privacy_score?: number;
  vault_processed?: boolean;
}

interface TraceDetailViewProps {
  trace: Trace;
  onClose: () => void;
}

export const TraceDetailView: React.FC<TraceDetailViewProps> = ({ trace, onClose }) => {
  const { isPrivacyModeEnabled, togglePrivacyMode } = usePrivacy();
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'spans' | 'metadata'>('overview');

  const toggleSpan = (spanId: string) => {
    const newExpanded = new Set(expandedSpans);
    if (newExpanded.has(spanId)) {
      newExpanded.delete(spanId);
    } else {
      newExpanded.add(spanId);
    }
    setExpandedSpans(newExpanded);
  };

  const getSpanIcon = (type: string) => {
    switch (type) {
      case 'llm':
        return <Cpu size={16} className="text-purple-400" />;
      case 'tool':
        return <Zap size={16} className="text-yellow-400" />;
      case 'chain':
        return <MessageSquare size={16} className="text-blue-400" />;
      default:
        return <MessageSquare size={16} className="text-gray-400" />;
    }
  };

  const renderSpanContent = (span: TraceSpan) => {
    const hasPII = span.has_pii || false;

    return (
      <div className="space-y-4">
        {/* Input/Output */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Input */}
          <div className="vault-field-container">
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">input</span>
              Input
              {hasPII && <Shield size={12} className="text-yellow-500" />}
            </h5>
            <div
              className="font-mono text-sm p-3 rounded-lg border border-white/5"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {hasPII && isPrivacyModeEnabled ? (
                <MaskedField
                  value={JSON.stringify(span.input, null, 2)}
                  fieldId={`${span.span_id}-input`}
                  piiType="generic"
                  className="text-gray-300"
                />
              ) : (
                <pre className="text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(span.input, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* Output */}
          <div className="vault-field-container">
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">output</span>
              Output
              {hasPII && <Shield size={12} className="text-yellow-500" />}
            </h5>
            <div
              className="font-mono text-sm p-3 rounded-lg border border-white/5"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {hasPII && isPrivacyModeEnabled ? (
                <MaskedField
                  value={JSON.stringify(span.output, null, 2)}
                  fieldId={`${span.span_id}-output`}
                  piiType="generic"
                  className="text-gray-300"
                />
              ) : (
                <pre className="text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(span.output, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="metric-mini">
            <Clock size={14} className="text-blue-400" />
            <div>
              <div className="text-xs text-gray-400">Latency</div>
              <div className="text-sm font-semibold text-white font-mono">
                {formatDuration(span.latency_ms || 0)}
              </div>
            </div>
          </div>

          {span.token_usage && (
            <>
              <div className="metric-mini">
                <MessageSquare size={14} className="text-green-400" />
                <div>
                  <div className="text-xs text-gray-400">Prompt Tokens</div>
                  <div className="text-sm font-semibold text-white font-mono">
                    {span.token_usage.prompt_tokens.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="metric-mini">
                <MessageSquare size={14} className="text-purple-400" />
                <div>
                  <div className="text-xs text-gray-400">Completion</div>
                  <div className="text-sm font-semibold text-white font-mono">
                    {span.token_usage.completion_tokens.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="metric-mini">
                <MessageSquare size={14} className="text-yellow-400" />
                <div>
                  <div className="text-xs text-gray-400">Total Tokens</div>
                  <div className="text-sm font-semibold text-white font-mono">
                    {span.token_usage.total_tokens.toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div
        className="trace-detail-modal w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden animate-fadeInUp"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 14, 18, 0.98) 0%, rgba(22, 24, 16, 0.98) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 80px rgba(202, 255, 97, 0.1)',
        }}
      >
        {/* Header - Sticky */}
        <div
          className="sticky top-0 z-10 px-6 py-4 border-b border-white/10"
          style={{
            background: 'rgba(10, 14, 18, 0.95)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white font-mono">{trace.name}</h2>
                {trace.vault_processed && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30">
                    <Shield size={14} className="text-yellow-500" />
                    <span className="text-xs font-mono text-yellow-500">VAULT PROCESSED</span>
                  </div>
                )}
                {trace.privacy_score !== undefined && <VaultGemmaBadge privacyScore={trace.privacy_score} compact />}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400 font-mono">
                <span>ID: {trace.trace_id}</span>
                <span>•</span>
                <span>{formatDate(trace.start_time)}</span>
                {trace.user_id && (
                  <>
                    <span>•</span>
                    <MaskedField value={trace.user_id} fieldId={`trace-user-${trace.trace_id}`} piiType="name" />
                  </>
                )}
              </div>
            </div>

            {/* Privacy Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePrivacyMode}
                className={`
                  privacy-toggle-btn
                  flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm
                  transition-all duration-300 border
                  ${
                    isPrivacyModeEnabled
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30'
                      : 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                  }
                `}
              >
                {isPrivacyModeEnabled ? (
                  <>
                    <Eye size={16} />
                    <span>Privacy Mode: ON</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={16} />
                    <span>Privacy Mode: OFF</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {['overview', 'spans', 'metadata'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-200
                  ${
                    activeTab === tab
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Status & Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    {trace.status === 'success' ? (
                      <CheckCircle2 size={20} className="text-green-400" />
                    ) : (
                      <AlertTriangle size={20} className="text-red-400" />
                    )}
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Status</span>
                  </div>
                  <div
                    className={`text-lg font-bold font-mono ${
                      trace.status === 'success' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {trace.status.toUpperCase()}
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={20} className="text-blue-400" />
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Total Latency</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {formatDuration(trace.total_latency_ms || 0)}
                  </div>
                </div>

                {trace.total_token_usage && (
                  <>
                    <div className="glass-panel p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare size={20} className="text-purple-400" />
                        <span className="text-xs text-gray-400 uppercase tracking-wider">Total Tokens</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-white">
                        {trace.total_token_usage.total_tokens.toLocaleString()}
                      </div>
                    </div>

                    <div className="glass-panel p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={20} className="text-yellow-400" />
                        <span className="text-xs text-gray-400 uppercase tracking-wider">Privacy Score</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-yellow-400">
                        {trace.privacy_score || 100}%
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Timeline visualization */}
              <div className="glass-panel p-5 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined">timeline</span>
                  Execution Timeline
                </h3>
                <div className="space-y-2">
                  {trace.spans?.map((span) => {
                    const widthPercent = span.latency_ms
                      ? (span.latency_ms / (trace.total_latency_ms || 1)) * 100
                      : 10;
                    return (
                      <div key={span.span_id} className="flex items-center gap-3">
                        <div className="w-32 text-xs text-gray-400 font-mono truncate">{span.name}</div>
                        <div className="flex-1 h-8 bg-gray-800/50 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full rounded-lg transition-all duration-300 flex items-center px-2"
                            style={{
                              width: `${Math.max(widthPercent, 5)}%`,
                              background:
                                span.span_type === 'llm'
                                  ? 'linear-gradient(90deg, #7C3AED, #A855F7)'
                                  : 'linear-gradient(90deg, #FBBF24, #F59E0B)',
                            }}
                          >
                            <span className="text-xs font-mono text-white font-semibold">
                              {formatDuration(span.latency_ms || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'spans' && (
            <div className="space-y-3">
              {trace.spans?.map((span) => (
                <div
                  key={span.span_id}
                  className="glass-panel rounded-xl overflow-hidden border border-white/10 hover:border-primary/30 transition-all duration-200"
                >
                  {/* Span header */}
                  <button
                    onClick={() => toggleSpan(span.span_id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedSpans.has(span.span_id) ? (
                        <ChevronDown size={20} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={20} className="text-gray-400" />
                      )}
                      {getSpanIcon(span.span_type)}
                      <div className="text-left">
                        <div className="font-semibold text-white">{span.name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">
                          {span.span_type} • {span.span_id}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {span.has_pii && <Shield size={16} className="text-yellow-500" />}
                      {span.model_name && (
                        <span className="text-sm text-gray-400 font-mono">{span.model_name}</span>
                      )}
                      <span className="text-sm font-mono text-blue-400">{formatDuration(span.latency_ms || 0)}</span>
                    </div>
                  </button>

                  {/* Span content */}
                  {expandedSpans.has(span.span_id) && (
                    <div className="px-5 pb-5 border-t border-white/10">{renderSpanContent(span)}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="glass-panel p-5 rounded-xl">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {JSON.stringify(trace.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
