import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import EvaluationsDashboard from '../EvaluationsDashboard';
import { PrivacyProvider } from '../../context/PrivacyContext';
import { AuthProvider } from '../../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock API
vi.mock('../../api_evaluations', () => ({
  fetchCampaigns: vi.fn(() => Promise.resolve({ campaigns: [] })),
  fetchTestSets: vi.fn(() => Promise.resolve({ test_sets: [] })),
  fetchStats: vi.fn(() => Promise.resolve({ 
    total_campaigns: 0, 
    total_test_sets: 0,
    total_traces: 0,
    total_preferences: 0,
    total_evaluations: 0
  })),
  fetchAvailableModels: vi.fn(() => Promise.resolve([
    { model_name: 'gpt-4', is_available: true },
    { model_name: 'claude-3', is_available: true },
  ])),
  seedSampleData: vi.fn(() => Promise.resolve({})),
}));

const MockedDashboard = () => (
  <BrowserRouter>
    <AuthProvider>
      <PrivacyProvider>
        <EvaluationsDashboard />
      </PrivacyProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('EvaluationsDashboard - VaultGemma Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders Run Private Eval button in Quick Actions', async () => {
    render(<MockedDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Run Private Eval/i)).toBeInTheDocument();
    });
  });
  
  it('opens model selection panel and shows models when clicking Run Private Eval', async () => {
    const user = userEvent.setup();
    render(<MockedDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Run Private Eval/i)).toBeInTheDocument();
    });
    
    const button = screen.getByText(/Run Private Eval/i);
    await user.click(button);
    
    // Should show model selection panel with available models
    await waitFor(() => {
      expect(screen.getByText(/Select Model for Private Evaluation/i)).toBeInTheDocument();
    });
    
    // Model chips should be visible
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('claude-3')).toBeInTheDocument();
  });

  it('allows selecting a model and running private eval', async () => {
    const user = userEvent.setup();
    render(<MockedDashboard />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/Run Private Eval/i)).toBeInTheDocument();
    });
    
    // Open the panel
    const button = screen.getByText(/Run Private Eval/i);
    await user.click(button);
    
    // Wait for panel to show
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
    });
    
    // Select a model
    const modelButton = screen.getByText('gpt-4');
    await user.click(modelButton);
    
    // Should enable the "Run Eval on gpt-4" button
    const runButton = screen.getByText(/Run Eval on gpt-4/i);
    expect(runButton).not.toBeDisabled();
  });
});
