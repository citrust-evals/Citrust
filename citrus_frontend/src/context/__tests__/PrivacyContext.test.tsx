import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PrivacyProvider, usePrivacy } from '../PrivacyContext';

// Test component to access context
const TestConsumer = () => {
  const {
    isPrivacyModeEnabled,
    togglePrivacyMode,
    activeCampaignID,
    setActiveCampaign,
  } = usePrivacy();

  return (
    <div>
      <span data-testid="privacy-mode">{isPrivacyModeEnabled ? 'enabled' : 'disabled'}</span>
      <span data-testid="campaign-id">{activeCampaignID ?? 'none'}</span>
      <button data-testid="toggle-privacy" onClick={togglePrivacyMode}>
        Toggle Privacy
      </button>
      <button data-testid="set-campaign" onClick={() => setActiveCampaign('camp-123')}>
        Set Campaign
      </button>
      <button data-testid="clear-campaign" onClick={() => setActiveCampaign(null)}>
        Clear Campaign
      </button>
    </div>
  );
};

describe('PrivacyContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('existing functionality (backward compatibility)', () => {
    it('should provide isPrivacyModeEnabled defaulting to true', () => {
      render(
        <PrivacyProvider>
          <TestConsumer />
        </PrivacyProvider>
      );

      expect(screen.getByTestId('privacy-mode')).toHaveTextContent('enabled');
    });

    it('should toggle privacy mode', () => {
      render(
        <PrivacyProvider>
          <TestConsumer />
        </PrivacyProvider>
      );

      expect(screen.getByTestId('privacy-mode')).toHaveTextContent('enabled');

      act(() => {
        screen.getByTestId('toggle-privacy').click();
      });

      expect(screen.getByTestId('privacy-mode')).toHaveTextContent('disabled');
    });
  });

  describe('activeCampaignID feature', () => {
    it('should provide activeCampaignID defaulting to null', () => {
      render(
        <PrivacyProvider>
          <TestConsumer />
        </PrivacyProvider>
      );

      expect(screen.getByTestId('campaign-id')).toHaveTextContent('none');
    });

    it('should set activeCampaignID via setActiveCampaign', () => {
      render(
        <PrivacyProvider>
          <TestConsumer />
        </PrivacyProvider>
      );

      act(() => {
        screen.getByTestId('set-campaign').click();
      });

      expect(screen.getByTestId('campaign-id')).toHaveTextContent('camp-123');
    });

    it('should clear activeCampaignID when set to null', () => {
      render(
        <PrivacyProvider>
          <TestConsumer />
        </PrivacyProvider>
      );

      // First set a campaign
      act(() => {
        screen.getByTestId('set-campaign').click();
      });
      expect(screen.getByTestId('campaign-id')).toHaveTextContent('camp-123');

      // Then clear it
      act(() => {
        screen.getByTestId('clear-campaign').click();
      });
      expect(screen.getByTestId('campaign-id')).toHaveTextContent('none');
    });

    it('should persist activeCampaignID in sessionStorage', () => {
      const { unmount } = render(
        <PrivacyProvider>
          <TestConsumer />
        </PrivacyProvider>
      );

      act(() => {
        screen.getByTestId('set-campaign').click();
      });

      expect(sessionStorage.getItem('citrus_active_campaign')).toBe('camp-123');

      unmount();
    });

    it('should restore activeCampaignID from sessionStorage on mount', () => {
      sessionStorage.setItem('citrus_active_campaign', 'restored-camp-456');

      render(
        <PrivacyProvider>
          <TestConsumer />
        </PrivacyProvider>
      );

      expect(screen.getByTestId('campaign-id')).toHaveTextContent('restored-camp-456');
    });

    it('should remove sessionStorage entry when campaign cleared', () => {
      sessionStorage.setItem('citrus_active_campaign', 'to-be-cleared');

      render(
        <PrivacyProvider>
          <TestConsumer />
        </PrivacyProvider>
      );

      act(() => {
        screen.getByTestId('clear-campaign').click();
      });

      expect(sessionStorage.getItem('citrus_active_campaign')).toBeNull();
    });
  });

  describe('usePrivacy hook', () => {
    it('should throw error when used outside PrivacyProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('usePrivacy must be used within a PrivacyProvider');

      consoleSpy.mockRestore();
    });
  });
});
