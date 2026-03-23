import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePrivacy } from '../context/PrivacyContext';
import {
  Shield,
  Key,
  Activity,
  HardDrive,
  Lock,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface VaultStatus {
  transitEngine: 'active' | 'degraded' | 'offline';
  keyRotationDays: number;
  encryptionAlgorithm: string;
  auditStreamConnected: boolean;
  lastHealthCheck: string;
  encryptionOpsToday: number;
  decryptionOpsToday: number;
  averageLatencyMs: number;
}

interface AuditEvent {
  timestamp: string;
  event_type: 'encrypt' | 'decrypt' | 'key_rotation' | 'access_denied' | 'token_refresh';
  token_id: string;
  status: 'success' | 'error';
  duration_ms?: number;
}

interface SecurityDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ isOpen, onClose }) => {
  const { userVaultPermissions } = usePrivacy();
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>({
    transitEngine: 'active',
    keyRotationDays: userVaultPermissions.keyRotationDays || 14,
    encryptionAlgorithm: 'AES-256-GCM96',
    auditStreamConnected: true,
    lastHealthCheck: new Date().toISOString(),
    encryptionOpsToday: 1247,
    decryptionOpsToday: 823,
    averageLatencyMs: 12,
  });
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate audit stream
  useEffect(() => {
    if (!isOpen) return;

    const generateEvent = (): AuditEvent => {
      const types: AuditEvent['event_type'][] = [
        'encrypt',
        'decrypt',
        'key_rotation',
        'access_denied',
        'token_refresh',
      ];
      const type = types[Math.floor(Math.random() * types.length)];
      return {
        timestamp: new Date().toISOString(),
        event_type: type,
        token_id: `[REDACTED_${Math.random().toString(36).substr(2, 6).toUpperCase()}]`,
        status: Math.random() > 0.95 ? 'error' : 'success',
        duration_ms: Math.floor(Math.random() * 30) + 5,
      };
    };

    // Initial events
    const initialEvents = Array.from({ length: 10 }, generateEvent);
    setAuditEvents(initialEvents);

    // Stream new events
    const interval = setInterval(() => {
      const newEvent = generateEvent();
      setAuditEvents((prev) => [newEvent, ...prev].slice(0, 50)); // Keep last 50
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Simulate metrics updates
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setVaultStatus((prev) => ({
        ...prev,
        encryptionOpsToday: prev.encryptionOpsToday + Math.floor(Math.random() * 5),
        decryptionOpsToday: prev.decryptionOpsToday + Math.floor(Math.random() * 3),
        averageLatencyMs: Math.floor(Math.random() * 10) + 8,
        lastHealthCheck: new Date().toISOString(),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getStatusColor = (status: VaultStatus['transitEngine']) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'offline':
        return 'text-red-400';
    }
  };

  const getEventIcon = (type: AuditEvent['event_type']) => {
    switch (type) {
      case 'encrypt':
        return <Lock size={14} className="text-yellow-400" />;
      case 'decrypt':
        return <Key size={14} className="text-blue-400" />;
      case 'key_rotation':
        return <RefreshCw size={14} className="text-purple-400" />;
      case 'access_denied':
        return <AlertCircle size={14} className="text-red-400" />;
      case 'token_refresh':
        return <CheckCircle2 size={14} className="text-green-400" />;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed right-0 top-0 bottom-0 w-[480px] z-40 shadow-2xl animate-slideInRight overflow-y-auto"
      style={{
        background: 'linear-gradient(135deg, rgba(10, 14, 18, 0.98) 0%, rgba(22, 24, 16, 0.98) 100%)',
        borderLeft: '1px solid rgba(255, 215, 0, 0.2)',
        boxShadow: '-10px 0 60px rgba(0, 0, 0, 0.5), 0 0 80px rgba(255, 215, 0, 0.1)',
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-6 py-5 border-b border-yellow-500/20"
        style={{
          background: 'rgba(10, 14, 18, 0.95)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1))',
                border: '1px solid rgba(255, 215, 0, 0.3)',
              }}
            >
              <Shield size={24} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-mono">Security Infrastructure</h2>
              <p className="text-xs text-gray-400 mt-0.5">HashiCorp Vault • Real-time Monitoring</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="text-sm font-semibold">{isRefreshing ? 'Refreshing...' : 'Refresh Status'}</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Vault Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Activity size={16} />
            Vault System Status
          </h3>

          <div className="space-y-2">
            {/* Transit Engine */}
            <div
              className="vault-status-item p-4 rounded-xl border border-white/10 hover:border-yellow-500/30 transition-all duration-200"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(vaultStatus.transitEngine)} animate-pulse-slow`} />
                  <span className="text-sm font-mono text-gray-300">Vault Transit Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold font-mono uppercase ${getStatusColor(vaultStatus.transitEngine)}`}>
                    {vaultStatus.transitEngine}
                  </span>
                  <ChevronRight size={16} className="text-gray-500" />
                </div>
              </div>
            </div>

            {/* Key Rotation */}
            <div
              className="vault-status-item p-4 rounded-xl border border-white/10 hover:border-yellow-500/30 transition-all duration-200"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-blue-400" />
                  <span className="text-sm font-mono text-gray-300">Key Rotation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-blue-400">
                    {vaultStatus.keyRotationDays} Days Remaining
                  </span>
                  <ChevronRight size={16} className="text-gray-500" />
                </div>
              </div>
            </div>

            {/* Encryption Algorithm */}
            <div
              className="vault-status-item p-4 rounded-xl border border-white/10 hover:border-yellow-500/30 transition-all duration-200"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock size={16} className="text-purple-400" />
                  <span className="text-sm font-mono text-gray-300">Encryption Algorithm</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-purple-400">
                    {vaultStatus.encryptionAlgorithm}
                  </span>
                  <ChevronRight size={16} className="text-gray-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operations Metrics */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <HardDrive size={16} />
            Operations (Today)
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div
              className="p-4 rounded-xl border border-green-500/20"
              style={{
                background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.05), rgba(34, 197, 94, 0.05))',
              }}
            >
              <div className="text-xs text-green-400 uppercase tracking-wider mb-1">Encryptions</div>
              <div className="text-2xl font-bold font-mono text-green-400">
                {vaultStatus.encryptionOpsToday.toLocaleString()}
              </div>
            </div>

            <div
              className="p-4 rounded-xl border border-blue-500/20"
              style={{
                background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.05), rgba(59, 130, 246, 0.05))',
              }}
            >
              <div className="text-xs text-blue-400 uppercase tracking-wider mb-1">Decryptions</div>
              <div className="text-2xl font-bold font-mono text-blue-400">
                {vaultStatus.decryptionOpsToday.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Average Latency */}
          <div
            className="p-4 rounded-xl border border-purple-500/20"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(147, 51, 234, 0.05))',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-purple-400 uppercase tracking-wider">Avg Transit Latency</div>
              <div className="text-xl font-bold font-mono text-purple-400">{vaultStatus.averageLatencyMs}ms</div>
            </div>
            <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                style={{ width: `${Math.min((vaultStatus.averageLatencyMs / 30) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Audit Stream */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Activity size={16} />
              Audit Event Stream
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-slow" />
              <span className="text-xs text-green-400 font-mono">LIVE</span>
            </div>
          </div>

          {/* Terminal-style audit feed */}
          <div
            className="audit-stream rounded-xl p-4 font-mono text-xs overflow-y-auto border border-white/10"
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              maxHeight: '400px',
            }}
          >
            <div className="space-y-1">
              {auditEvents.map((event, idx) => (
                <div
                  key={`${event.timestamp}-${idx}`}
                  className={`flex items-center gap-2 py-1 ${
                    idx === 0 ? 'animate-fadeInUp' : ''
                  } ${event.status === 'error' ? 'text-red-400' : 'text-gray-300'}`}
                >
                  <span className="text-gray-600">[{new Date(event.timestamp).toLocaleTimeString()}]</span>
                  <div className="flex items-center gap-1">
                    {getEventIcon(event.event_type)}
                  </div>
                  <span className="uppercase text-gray-400">{event.event_type.replace('_', ' ')}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-yellow-600">Token {event.token_id}</span>
                  {event.duration_ms && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-blue-400">{event.duration_ms}ms</span>
                    </>
                  )}
                  <span className="text-gray-500">•</span>
                  <span
                    className={event.status === 'success' ? 'text-green-400' : 'text-red-400'}
                  >
                    {event.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Health Status */}
        <div
          className="p-4 rounded-xl border border-green-500/30"
          style={{
            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(34, 197, 94, 0.05))',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-green-400" />
              <div>
                <div className="text-sm font-semibold text-green-400">System Healthy</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Last check: {new Date(vaultStatus.lastHealthCheck).toLocaleTimeString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Uptime</div>
              <div className="text-lg font-bold font-mono text-green-400">99.99%</div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
