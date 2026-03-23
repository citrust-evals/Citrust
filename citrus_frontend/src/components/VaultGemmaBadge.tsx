import React, { useState } from 'react';

interface VaultGemmaBadgeProps {
  privacyScore?: number; // 0-100
  compact?: boolean;
  showTooltip?: boolean;
  variant?: 'default' | 'evaluation' | 'inline';
}

export const VaultGemmaBadge: React.FC<VaultGemmaBadgeProps> = ({
  privacyScore = 100,
  compact = false,
  showTooltip = true,
  variant = 'default',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'evaluation':
        return 'px-3 py-1.5 text-xs';
      case 'inline':
        return 'px-2 py-0.5 text-[10px]';
      default:
        return 'px-2.5 py-1 text-xs';
    }
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`
          vault-gemma-badge
          ${getVariantStyles()}
          font-mono font-semibold
          rounded-lg
          relative overflow-hidden
          cursor-help
          transition-all duration-300
          hover:scale-105
          group
        `}
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #C084FC 100%)',
          boxShadow: isHovered
            ? '0 0 20px rgba(168, 85, 247, 0.6), 0 0 40px rgba(168, 85, 247, 0.3)'
            : '0 0 10px rgba(168, 85, 247, 0.4)',
        }}
      >
        {/* Animated gradient overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
            backgroundSize: '200% 200%',
            animation: 'shimmer 2s infinite',
          }}
        />

        {/* Content */}
        <div className="relative flex items-center gap-1.5 text-white">
          {/* DP Shield Icon */}
          <svg
            width={compact ? '12' : '14'}
            height={compact ? '12' : '14'}
            viewBox="0 0 24 24"
            fill="none"
            className="flex-shrink-0"
          >
            <path
              d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z"
              fill="currentColor"
              opacity="0.3"
            />
            <path
              d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M9 12l2 2 4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {!compact && <span className="font-bold tracking-wide">DP PROTECTED</span>}
          {compact && <span className="font-bold">DP</span>}
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && isHovered && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 animate-fadeInUp"
          style={{ minWidth: '320px' }}
        >
          <div
            className="glass-panel rounded-xl p-4 border border-purple-500/30"
            style={{
              background: 'rgba(17, 24, 39, 0.98)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(168, 85, 247, 0.3)',
            }}
          >
            {/* Tooltip arrow */}
            <div
              className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px"
              style={{
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid rgba(168, 85, 247, 0.3)',
              }}
            />

            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-white font-semibold text-sm font-mono">
                    VaultGemma-1B Evaluation
                  </h4>
                  <p className="text-purple-300 text-xs mt-0.5">Differential Privacy Engine</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono text-purple-300">
                    {privacyScore}
                    <span className="text-sm text-purple-400">%</span>
                  </div>
                  <div className="text-[10px] text-purple-400 uppercase tracking-wider">
                    Leak-Proof
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

              {/* Description */}
              <p className="text-gray-300 text-xs leading-relaxed">
                Evaluated via <span className="text-purple-300 font-semibold">VaultGemma-1B</span>.
                Mathematical <span className="text-purple-300 font-semibold">Differential Privacy (DP)</span> guarantees
                this trace data <span className="text-white font-semibold">cannot be memorized or leaked</span> by the
                model.
              </p>

              {/* DP Properties */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-slow" />
                  <span className="text-purple-200 text-[11px] font-mono">ε-bounded</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-slow" />
                  <span className="text-purple-200 text-[11px] font-mono">δ-secure</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-slow" />
                  <span className="text-purple-200 text-[11px] font-mono">Zero leakage</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-slow" />
                  <span className="text-purple-200 text-[11px] font-mono">Auditable</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
