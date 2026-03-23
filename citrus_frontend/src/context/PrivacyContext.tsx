import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface VaultPermissions {
  canDecrypt: boolean;
  canViewPII: boolean;
  vaultToken: string | null;
  keyRotationDays: number;
}

interface PrivacyContextType {
  isPrivacyModeEnabled: boolean;
  togglePrivacyMode: () => void;
  userVaultPermissions: VaultPermissions;
  setVaultPermissions: (permissions: Partial<VaultPermissions>) => void;
  decryptionInProgress: Set<string>;
  startDecryption: (fieldId: string) => void;
  completeDecryption: (fieldId: string) => void;
  revealedFields: Set<string>;
  // Vault Interconnection: Campaign tracking for syncing Evaluations and Traces
  activeCampaignID: string | null;
  setActiveCampaign: (campaignId: string | null) => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const usePrivacy = () => {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
};

interface PrivacyProviderProps {
  children: ReactNode;
}

const CAMPAIGN_STORAGE_KEY = 'citrus_active_campaign';

export const PrivacyProvider: React.FC<PrivacyProviderProps> = ({ children }) => {
  const [isPrivacyModeEnabled, setIsPrivacyModeEnabled] = useState<boolean>(true);
  const [userVaultPermissions, setUserVaultPermissionsState] = useState<VaultPermissions>({
    canDecrypt: true, // Set based on actual auth
    canViewPII: true,
    vaultToken: localStorage.getItem('vault_token'),
    keyRotationDays: 14,
  });
  const [decryptionInProgress, setDecryptionInProgress] = useState<Set<string>>(new Set());
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());
  
  // Vault Interconnection: Active campaign for syncing Evaluations and Traces
  const [activeCampaignID, setActiveCampaignID] = useState<string | null>(() => {
    // Restore from sessionStorage on initial mount
    return sessionStorage.getItem(CAMPAIGN_STORAGE_KEY);
  });

  const togglePrivacyMode = () => {
    setIsPrivacyModeEnabled((prev) => !prev);
    // Reset revealed fields when toggling mode
    if (!isPrivacyModeEnabled) {
      setRevealedFields(new Set());
    }
  };

  const setVaultPermissions = (permissions: Partial<VaultPermissions>) => {
    setUserVaultPermissionsState((prev) => ({ ...prev, ...permissions }));
  };

  const startDecryption = (fieldId: string) => {
    setDecryptionInProgress((prev) => new Set(prev).add(fieldId));
  };

  const completeDecryption = (fieldId: string) => {
    setDecryptionInProgress((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fieldId);
      return newSet;
    });
    setRevealedFields((prev) => new Set(prev).add(fieldId));
  };

  // Vault Interconnection: Set active campaign and persist to sessionStorage
  const setActiveCampaign = (campaignId: string | null) => {
    setActiveCampaignID(campaignId);
    if (campaignId) {
      sessionStorage.setItem(CAMPAIGN_STORAGE_KEY, campaignId);
    } else {
      sessionStorage.removeItem(CAMPAIGN_STORAGE_KEY);
    }
  };

  // Simulate Vault token refresh
  useEffect(() => {
    const refreshToken = () => {
      const token = localStorage.getItem('vault_token');
      if (token) {
        setUserVaultPermissionsState((prev) => ({ ...prev, vaultToken: token }));
      }
    };
    refreshToken();
    const interval = setInterval(refreshToken, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const value: PrivacyContextType = {
    isPrivacyModeEnabled,
    togglePrivacyMode,
    userVaultPermissions,
    setVaultPermissions,
    decryptionInProgress,
    startDecryption,
    completeDecryption,
    revealedFields,
    activeCampaignID,
    setActiveCampaign,
  };

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
};
