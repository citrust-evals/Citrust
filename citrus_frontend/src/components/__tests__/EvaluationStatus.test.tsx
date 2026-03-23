import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EvaluationStatus } from '../EvaluationStatus';

describe('EvaluationStatus Component', () => {
  it('renders evaluation score with DP badge and tooltip', () => {
    render(<EvaluationStatus score={0.98} metric="Safety" isDP={true} epsilon={1.0} />);
    
    expect(screen.getByText(/Safety:/i)).toBeInTheDocument();
    expect(screen.getByText(/0.98/i)).toBeInTheDocument();
    expect(screen.getByText(/\[DP\]/i)).toBeInTheDocument();
  });
  
  it('renders "No Eval" when score is null', () => {
    render(<EvaluationStatus score={null} metric="Safety" />);
    expect(screen.getByText(/No Eval/i)).toBeInTheDocument();
  });
  
  it('renders without DP badge when isDP is false', () => {
    render(<EvaluationStatus score={0.95} metric="Accuracy" isDP={false} />);
    expect(screen.queryByText(/\[DP\]/i)).not.toBeInTheDocument();
  });

  it('formats score to 2 decimal places', () => {
    render(<EvaluationStatus score={0.123456} metric="Precision" isDP={false} />);
    expect(screen.getByText(/0.12/)).toBeInTheDocument();
  });

  it('applies gold color (#FFB800) to DP badge', () => {
    render(<EvaluationStatus score={0.85} metric="Safety" isDP={true} />);
    const dpBadge = screen.getByText(/\[DP\]/i);
    expect(dpBadge.className).toContain('text-[#FFB800]');
  });
});
