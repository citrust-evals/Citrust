import React, { useState, useEffect } from 'react';
import { getEvaluations, getEvaluationStats, type Evaluation, type EvaluationStats } from '../api';
import { formatDate, formatPercent, truncate } from '../utils';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/UIComponents';

const EvaluationsDashboard: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSession, setFilterSession] = useState('');
  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null);

  useEffect(() => {
    loadData();
  }, [filterSession]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [evalsData, statsData] = await Promise.all([
        getEvaluations({
          session_id: filterSession || undefined,
          limit: 50,
        }),
        getEvaluationStats(),
      ]);
      setEvaluations(evalsData.evaluations || []);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Loading evaluations..." />
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Evaluations"
            value={stats?.total_evaluations || 0}
            icon="assessment"
            color="primary"
          />
          <MetricCard
            title="Preferences Collected"
            value={stats?.total_preferences || 0}
            icon="thumb_up"
            color="success"
          />
          <MetricCard
            title="Unique Users"
            value={stats?.unique_users || 0}
            icon="group"
            color="info"
          />
          <MetricCard
            title="Active Sessions"
            value={stats?.unique_sessions || 0}
            icon="sync"
            color="warning"
          />
        </div>

        {/* Filters */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Filter by Session ID
              </label>
              <input
                type="text"
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                placeholder="Enter session ID..."
                className="input-field"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={loadData}
                className="btn-primary h-11"
              >
                <span className="material-symbols-outlined text-[18px] mr-2">refresh</span>
                Refresh
              </button>
              {filterSession && (
                <button
                  onClick={() => setFilterSession('')}
                  className="btn-secondary h-11"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Evaluations Table */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Recent Evaluations</h2>
            <p className="text-sm text-gray-400 mt-1">
              Click on any evaluation to view details
            </p>
          </div>

          {evaluations.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="No Evaluations Found"
              description="No evaluation data available. Start chatting to generate evaluations."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Session ID
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      User Prompt
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Winner
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {evaluations.map((evaluation) => (
                    <tr
                      key={evaluation._id}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedEval(evaluation)}
                    >
                      <td className="px-6 py-4">
                        <code className="text-xs text-primary font-mono">
                          {truncate(evaluation.session_id, 12)}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-300 max-w-md truncate">
                          {evaluation.user_prompt || 'N/A'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400">
                          {evaluation.model_used || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {evaluation.winner_index !== undefined ? (
                          <StatusBadge status="success" label={`Response ${evaluation.winner_index + 1}`} />
                        ) : (
                          <StatusBadge status="neutral" label="No Winner" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatDate(evaluation.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-primary hover:text-primary/80 transition-colors">
                          <span className="material-symbols-outlined text-[20px]">
                            visibility
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Evaluation Detail Modal */}
      {selectedEval && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedEval(null)}
        >
          <div
            className="glass-panel rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Evaluation Details</h2>
                <p className="text-sm text-gray-400">
                  Session: <code className="text-primary font-mono">{selectedEval.session_id}</code>
                </p>
              </div>
              <button
                onClick={() => setSelectedEval(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Prompt */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  User Prompt
                </label>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-gray-100">{selectedEval.user_prompt || 'N/A'}</p>
                </div>
              </div>

              {/* Responses */}
              {selectedEval.responses && selectedEval.responses.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Generated Responses
                  </label>
                  <div className="space-y-3">
                    {selectedEval.responses.map((response, idx) => (
                      <div
                        key={idx}
                        className={`bg-white/5 rounded-lg p-4 border ${idx === selectedEval.winner_index
                            ? 'border-primary bg-primary/5'
                            : 'border-white/10'
                          }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-primary">
                            Response {idx + 1}
                          </span>
                          {idx === selectedEval.winner_index && (
                            <StatusBadge status="success" label="Winner" size="sm" />
                          )}
                        </div>
                        <p className="text-gray-100 text-sm">{truncate(response, 200)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback */}
              {selectedEval.feedback && (
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    User Feedback
                  </label>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-gray-100">{selectedEval.feedback}</p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    User ID
                  </label>
                  <p className="text-sm text-gray-300">
                    {selectedEval.user_id || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Chat ID
                  </label>
                  <p className="text-sm text-gray-300">
                    {selectedEval.chat_id || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Model Used
                  </label>
                  <p className="text-sm text-gray-300">
                    {selectedEval.model_used || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Timestamp
                  </label>
                  <p className="text-sm text-gray-300">
                    {formatDate(selectedEval.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationsDashboard;