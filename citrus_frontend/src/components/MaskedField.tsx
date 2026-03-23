import React, { useState } from 'react';
import { usePrivacy } from '../context/PrivacyContext';
import { Shield, Lock, Unlock, Sparkles } from 'lucide-react';

interface MaskedFieldProps {
  value: string;
  fieldId: string;
  piiType?: 'email' | 'phone' | 'ssn' | 'credit_card' | 'name' | 'address' | 'generic';
  className?: string;
}

export const MaskedField: React.FC<MaskedFieldProps> = ({
  value,
  fieldId,
  piiType = 'generic',
  className = '',
}) => {
  const {
    isPrivacyModeEnabled,
    userVaultPermissions,
    decryptionInProgress,
    startDecryption,
    completeDecryption,
    revealedFields,
  } = usePrivacy();

  const [decryptionProgress, setDecryptionProgress] = useState(0);
  const isDecrypting = decryptionInProgress.has(fieldId);
  const isRevealed = revealedFields.has(fieldId);

  const getPIIIcon = () => {
    switch (piiType) {
      case 'email':
        return '📧';
      case 'phone':
        return '📞';
      case 'ssn':
        return '🔢';
      case 'credit_card':
        return '💳';
      case 'name':
        return '👤';
      case 'address':
        return '📍';
      default:
        return '🔐';
    }
  };

  const getPIILabel = () => {
    return piiType.toUpperCase().replace('_', ' ');
  };

  const handleReveal = async () => {
    if (!userVaultPermissions.canDecrypt) {
      alert('Access Denied: You do not have permission to decrypt PII data.');
      return;
    }

    startDecryption(fieldId);
    setDecryptionProgress(0);

    // Simulate decryption process
    const duration = 1500; // 1.5 seconds
    const steps = 30;
    const increment = 100 / steps;
    const stepDuration = duration / steps;

    for (let i = 0; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
      setDecryptionProgress(Math.min(100, i * increment));
    }

    completeDecryption(fieldId);
  };

  if (!isPrivacyModeEnabled || isRevealed) {
    // Show actual value with Vault glow
    return (
      <span
        className={`vault-revealed inline-flex items-center gap-2 font-mono ${className}`}
        style={{
          color: '#FFD700',
          textShadow: '0 0 10px rgba(255, 215, 0, 0.3)',
          animation: 'vault-glow 2s ease-in-out',
        }}
      >
        <Unlock size={14} className="text-yellow-400" />
        {value}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Masked Badge */}
      <div
        className="pii-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-xs font-semibold cursor-pointer hover:scale-105 transition-all duration-200 group relative"
        onClick={handleReveal}
        style={{
          background: isDecrypting
            ? 'linear-gradient(90deg, rgba(255,215,0,0.2) 0%, rgba(255,215,0,0.1) 100%)'
            : 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {isDecrypting ? (
          <>
            {/* Decrypting state */}
            <Sparkles size={14} className="text-yellow-400 animate-spin" />
            <span className="text-yellow-400">DECRYPTING...</span>
            <div className="ml-2 w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-all duration-100"
                style={{ width: `${decryptionProgress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            {/* Masked state */}
            <span className="text-lg">{getPIIIcon()}</span>
            <span className="text-gray-300">{getPIILabel()}</span>
            <Lock size={14} className="text-gray-400 group-hover:text-yellow-400 transition-colors" />
          </>
        )}

        {/* Hover hint */}
        {!isDecrypting && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap border border-yellow-500/30">
              Click to decrypt via Vault
            </div>
          </div>
        )}
      </div>

      {/* Vault indicator */}
      {!isDecrypting && (
        <div className="flex items-center gap-1">
          <Shield size={12} className="text-yellow-600" />
          <span className="text-[10px] text-yellow-600/70 font-mono uppercase tracking-wider">
            Vault Transit
          </span>
        </div>
      )}
    </div>
  );
};
