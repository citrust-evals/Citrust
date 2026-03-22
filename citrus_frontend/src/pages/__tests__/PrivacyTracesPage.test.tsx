import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrivacyTracesPage } from '../PrivacyTracesPage';
import { PrivacyProvider } from '../../context/PrivacyContext';
import { AuthProvider } from '../../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock API
vi.mock('../../api', () => ({
  getTraces: vi.fn(() => Promise.resolve({ 
    traces: [
      { 
        trace_id: 'trace-1',
        name: 'Test Trace',
        status: 'success',
        total_latency_ms: 1200,
        total_token_usage: { total_tokens: 150 },
        spans: []
      }
    ] 
  })),
  getTrace: vi.fn(() => Promise.resolve({ 
    success: true, 
    trace: { trace_id: 'trace-1', spans: [] } 
  })),
}));

const MockedTracesPage = () => (
  <BrowserRouter>
    <AuthProvider>
      <PrivacyProvider>
        <PrivacyTracesPage />
      </PrivacyProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('PrivacyTracesPage - Evaluation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('displays evaluation status in trace cards', async () => {
    render(<MockedTracesPage />);
    
    await waitFor(() => {
      // Should show "No Eval" when no active campaign
      expect(screen.getByText(/No Eval/i)).toBeInTheDocument();
    });
  });

  it('displays 5 metrics columns including Evaluation', async () => {
    render(<MockedTracesPage />);
    
    await waitFor(() => {
      // Check for metric column labels in trace cards
      expect(screen.getByText(/Latency/i)).toBeInTheDocument();
      expect(screen.getByText(/Tokens/i)).toBeInTheDocument();
      expect(screen.getByText(/Spans/i)).toBeInTheDocument();
      // Privacy appears multiple times (header, tab, column) - use getAllByText
      expect(screen.getAllByText(/Privacy/i).length).toBeGreaterThan(0);
      // Evaluation column should be present
      expect(screen.getByText('Evaluation')).toBeInTheDocument();
    });
    
    // Verify the grid has 5 columns by checking for the grid-cols-5 class
    const metricsGrid = document.querySelector('.grid-cols-5');
    expect(metricsGrid).toBeInTheDocument();
  });
});
