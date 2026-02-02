import React, { useState, useEffect } from 'react';
import { getTraces, getTrace, getTraceStatistics, type Trace, type TraceSpan, type TraceStatistics } from '../api';
import { formatDate, formatDuration, formatTokens, getModelDisplayName, formatRelativeTime } from '../utils';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/UIComponents';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const TracesPage: React.FC = () => {
    const [traces, setTraces] = useState<Trace[]>([]);
    const [statistics, setStatistics] = useState<TraceStatistics | null>(null);
    const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterModel, setFilterModel] = useState<string>('');

    useEffect(() => {
        loadData();
    }, [filterStatus, filterModel]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [tracesData, statsData] = await Promise.all([
                getTraces({
                    status: filterStatus || undefined,
                    model_name: filterModel || undefined,
                    limit: 50,
                }),
                getTraceStatistics(),
            ]);
            setTraces(tracesData.traces || []);
            setStatistics(statsData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewTrace = async (traceId: string) => {
        try {
            const response = await getTrace(traceId, true);
            if (response.success && response.trace) {
                setSelectedTrace(response.trace);
            }
        } catch (err) {
            console.error('Failed to load trace details:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <LoadingSpinner size="lg" text="Loading traces..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <ErrorState error={error} retry={loadData} />
            </div>
        );
    }

    // Prepare chart data
    const modelData = statistics?.models_used?.map(m => ({
        name: getModelDisplayName(m.model),
        calls: m.call_count,
        tokens: m.total_tokens,
        latency: m.avg_latency_ms,
    })) || [];

    const statusData = [
        { name: 'Success', value: statistics?.successful_traces || 0 },
        { name: 'Failed', value: statistics?.failed_traces || 0 },
    ];

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="Total Traces"
                        value={statistics?.total_traces || 0}
                        icon="insights"
                        color="primary"
                    />
                    <MetricCard
                        title="Avg Latency (P95)"
                        value={`${statistics?.latency?.p95_ms?.toFixed(0) || 0}ms`}
                        icon="speed"
                        color="warning"
                        subtitle={`P99: ${statistics?.latency?.p99_ms?.toFixed(0) || 0}ms`}
                    />
                    <MetricCard
                        title="Total Tokens"
                        value={formatTokens(statistics?.tokens?.total)}
                        icon="token"
                        color="info"
                        subtitle={`Avg per trace: ${formatTokens(statistics?.tokens?.avg_per_trace)}`}
                    />
                    <MetricCard
                        title="Success Rate"
                        value={statistics ? `${((statistics.successful_traces / statistics.total_traces) * 100).toFixed(1)}%` : '0%'}
                        icon="check_circle"
                        color="success"
                    />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Model Usage Chart */}
                    <div className="glass-panel rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Model Usage</h3>
                        {modelData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={modelData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                                    <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(26, 32, 41, 0.95)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            color: '#fff',
                                        }}
                                    />
                                    <Bar dataKey="calls" fill="#caff61" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState icon="bar_chart" title="No Data" description="No model usage data available" />
                        )}
                    </div>

                    {/* Status Distribution */}
                    <div className="glass-panel rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Status Distribution</h3>
                        {statusData.some(d => d.value > 0) ? (
                            <div className="flex items-center justify-center h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {statusData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#4CAF50' : '#EF5350'} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(26, 32, 41, 0.95)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: '#fff',
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyState icon="pie_chart" title="No Data" description="No status data available" />
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="glass-panel rounded-2xl p-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Filter by Status
                            </label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="input-field"
                            >
                                <option value="">All Statuses</option>
                                <option value="success">Success</option>
                                <option value="error">Error</option>
                                <option value="running">Running</option>
                            </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Filter by Model
                            </label>
                            <input
                                type="text"
                                value={filterModel}
                                onChange={(e) => setFilterModel(e.target.value)}
                                placeholder="Enter model name..."
                                className="input-field"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button onClick={loadData} className="btn-primary h-11">
                                <span className="material-symbols-outlined text-[18px] mr-2">refresh</span>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Traces Table */}
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-xl font-bold text-white">Trace History</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Click on any trace to view detailed span information
                        </p>
                    </div>

                    {traces.length === 0 ? (
                        <EmptyState
                            icon="inbox"
                            title="No Traces Found"
                            description="No trace data available. Start using the chat to generate traces."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                                            Trace ID
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                                            Name
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                                            Status
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                                            Latency
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                                            <div className="flex flex-col">
                                                <span>Tokens</span>
                                                <span className="text-[10px] text-gray-500 normal-case">(prompt / completion)</span>
                                            </div>
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                                            Spans
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                                            User / Session
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                                            Time
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {traces.map((trace) => {
                                        // Get model names from spans
                                        const models = [...new Set(
                                            (trace.spans || [])
                                                .map(s => s.model_name)
                                                .filter(Boolean)
                                        )];
                                        const hasErrors = trace.status === 'error' ||
                                            (trace.spans || []).some(s => s.error);

                                        return (
                                            <tr
                                                key={trace.trace_id}
                                                className={`hover:bg-white/5 transition-colors cursor-pointer ${hasErrors ? 'bg-red-500/5' : ''}`}
                                                onClick={() => handleViewTrace(trace.trace_id)}
                                            >
                                                <td className="px-4 py-3">
                                                    <code className="text-xs text-primary font-mono">
                                                        {trace.trace_id?.slice(0, 12) || 'N/A'}...
                                                    </code>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-gray-300 truncate max-w-[180px]">
                                                            {trace.name}
                                                        </span>
                                                        {models.length > 0 && (
                                                            <span className="text-[10px] text-gray-500 truncate max-w-[180px]">
                                                                {models.map(m => getModelDisplayName(m)).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <StatusBadge status={trace.status} />
                                                        {hasErrors && trace.status !== 'error' && (
                                                            <span className="material-symbols-outlined text-[14px] text-yellow-500" title="Contains errors">
                                                                warning
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-sm font-medium ${(trace.total_latency_ms || 0) > 5000
                                                            ? 'text-red-400'
                                                            : (trace.total_latency_ms || 0) > 2000
                                                                ? 'text-yellow-400'
                                                                : 'text-green-400'
                                                        }`}>
                                                        {formatDuration(trace.total_latency_ms)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-blue-400 font-medium">
                                                            {formatTokens(trace.total_token_usage?.total_tokens)}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500">
                                                            {formatTokens(trace.total_token_usage?.prompt_tokens)} / {formatTokens(trace.total_token_usage?.completion_tokens)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="badge-neutral">
                                                            {trace.spans?.length || 0}
                                                        </span>
                                                        {(trace.spans?.length || 0) > 0 && (
                                                            <div className="flex gap-0.5">
                                                                {['llm', 'tool', 'chain'].map(type => {
                                                                    const count = (trace.spans || []).filter(s => s.span_type === type).length;
                                                                    return count > 0 ? (
                                                                        <span
                                                                            key={type}
                                                                            className={`text-[9px] px-1 py-0.5 rounded ${type === 'llm' ? 'bg-purple-500/20 text-purple-300' :
                                                                                    type === 'tool' ? 'bg-blue-500/20 text-blue-300' :
                                                                                        'bg-green-500/20 text-green-300'
                                                                                }`}
                                                                            title={`${count} ${type} span${count > 1 ? 's' : ''}`}
                                                                        >
                                                                            {count}{type[0].toUpperCase()}
                                                                        </span>
                                                                    ) : null;
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        {trace.user_id && (
                                                            <span className="text-[10px] text-gray-400 truncate max-w-[100px]" title={trace.user_id}>
                                                                👤 {trace.user_id.slice(0, 8)}...
                                                            </span>
                                                        )}
                                                        {trace.session_id && (
                                                            <span className="text-[10px] text-gray-500 truncate max-w-[100px]" title={trace.session_id}>
                                                                🔗 {trace.session_id.slice(0, 8)}...
                                                            </span>
                                                        )}
                                                        {!trace.user_id && !trace.session_id && (
                                                            <span className="text-[10px] text-gray-600">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-gray-400">
                                                            {formatRelativeTime(trace.start_time)}
                                                        </span>
                                                        <span className="text-[10px] text-gray-600">
                                                            {trace.start_time ? new Date(trace.start_time).toLocaleTimeString() : '—'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        className="text-primary hover:text-primary/80 transition-colors p-1 rounded hover:bg-white/5"
                                                        title="View trace details"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">
                                                            visibility
                                                        </span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                    )}
                </div>
            </div>

            {/* Trace Detail Modal */}
            {selectedTrace && <TraceDetailModal trace={selectedTrace} onClose={() => setSelectedTrace(null)} />}
        </div>
    );
};

// Trace Detail Modal Component
const TraceDetailModal: React.FC<{ trace: Trace; onClose: () => void }> = ({ trace, onClose }) => {
    const renderSpan = (span: TraceSpan, level: number = 0) => (
        <div key={span.span_id} className={`mb-3 ${level > 0 ? 'ml-8' : ''}`}>
            <div className="glass-panel rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-white">{span.name}</span>
                            <StatusBadge status={span.span_type} size="sm" />
                        </div>
                        {span.model_name && (
                            <p className="text-xs text-gray-400">
                                Model: {getModelDisplayName(span.model_name)}
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">
                            {formatDuration(span.latency_ms)}
                        </p>
                        {span.token_usage && (
                            <p className="text-xs text-primary">
                                {formatTokens(span.token_usage.total_tokens)} tokens
                            </p>
                        )}
                    </div>
                </div>

                {span.error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-xs text-red-400">
                        Error: {span.error}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={onClose}
        >
            <div
                className="glass-panel rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/10 flex items-start justify-between sticky top-0 bg-surface-dark/95 backdrop-blur-md z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Trace Details</h2>
                        <div className="flex items-center gap-3 flex-wrap">
                            <code className="text-xs text-primary font-mono bg-primary/10 px-2 py-1 rounded">
                                {trace.trace_id}
                            </code>
                            <StatusBadge status={trace.status} />
                            <span className="text-xs text-gray-400">
                                {formatDate(trace.start_time)}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined text-[24px]">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="glass-panel rounded-lg p-4">
                            <p className="text-xs text-gray-500 mb-1">Total Latency</p>
                            <p className="text-xl font-bold text-primary">
                                {formatDuration(trace.total_latency_ms)}
                            </p>
                        </div>
                        <div className="glass-panel rounded-lg p-4">
                            <p className="text-xs text-gray-500 mb-1">Total Tokens</p>
                            <p className="text-xl font-bold text-blue-400">
                                {formatTokens(trace.total_token_usage?.total_tokens)}
                            </p>
                        </div>
                        <div className="glass-panel rounded-lg p-4">
                            <p className="text-xs text-gray-500 mb-1">Spans</p>
                            <p className="text-xl font-bold text-green-400">
                                {trace.spans?.length || 0}
                            </p>
                        </div>
                    </div>

                    {/* Span Details */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4">Span Tree</h3>
                        <div className="space-y-3">
                            {trace.spans?.map((span) => renderSpan(span))}
                            {(!trace.spans || trace.spans.length === 0) && (
                                <EmptyState icon="account_tree" title="No Spans" description="No span data available for this trace" />
                            )}
                        </div>
                    </div>

                    {/* Metadata */}
                    {trace.metadata && Object.keys(trace.metadata).length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Metadata</h3>
                            <div className="glass-panel rounded-lg p-4">
                                <pre className="text-xs text-gray-300 font-mono overflow-x-auto">
                                    {JSON.stringify(trace.metadata, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TracesPage;