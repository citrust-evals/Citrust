import React, { useState, useEffect } from 'react';
import { healthCheck } from '../api';
import StatusBadge from '../components/StatusBadge';
import { LoadingSpinner } from '../components/UIComponents';

const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const data = await healthCheck();
      setHealth(data);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">System configuration and health status</p>
        </div>

        {/* System Health */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">health_and_safety</span>
            System Health
          </h2>

          {loading ? (
            <div className="py-8">
              <LoadingSpinner size="md" text="Checking system health..." />
            </div>
          ) : health ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div>
                  <p className="text-sm font-medium text-white">API Status</p>
                  <p className="text-xs text-gray-400">FastAPI Backend</p>
                </div>
                <StatusBadge status={health.status === 'healthy' ? 'success' : 'error'} label={health.status} />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div>
                  <p className="text-sm font-medium text-white">Database</p>
                  <p className="text-xs text-gray-400">MongoDB Connection</p>
                </div>
                <StatusBadge status={health.mongodb_connected ? 'success' : 'error'} label={health.mongodb_connected ? 'Connected' : 'Disconnected'} />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">API Version</p>
                  <p className="text-xs text-gray-400">Current version</p>
                </div>
                <code className="text-sm text-primary font-mono bg-primary/10 px-3 py-1 rounded">
                  {health.version}
                </code>
              </div>

              <button
                onClick={checkHealth}
                className="btn-secondary w-full mt-4"
              >
                <span className="material-symbols-outlined text-[18px] mr-2">refresh</span>
                Refresh Status
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              Failed to load health status
            </div>
          )}
        </div>

        {/* API Configuration */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">settings</span>
            API Configuration
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                API Base URL
              </label>
              <input
                type="text"
                value={import.meta.env.VITE_API_URL || 'http://localhost:8000'}
                readOnly
                className="input-field bg-white/5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Environment
              </label>
              <input
                type="text"
                value={import.meta.env.MODE || 'development'}
                readOnly
                className="input-field bg-white/5"
              />
            </div>
          </div>
        </div>

        {/* About */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">info</span>
            About Citrus AI
          </h2>

          <div className="space-y-3">
            <p className="text-gray-300">
              Citrus AI is a professional LLM evaluation platform built to help developers and researchers
              compare, analyze, and improve language model performance.
            </p>

            <div className="flex items-center gap-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-xs text-gray-500">Frontend Version</p>
                <p className="text-sm font-mono text-primary">2.4.0</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Backend Version</p>
                <p className="text-sm font-mono text-primary">{health?.version || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;