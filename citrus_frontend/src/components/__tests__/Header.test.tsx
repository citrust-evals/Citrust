import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import Header from '../Header';
import { PrivacyProvider } from '../../context/PrivacyContext';
import { AuthProvider } from '../../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

const MockedHeader = () => (
  <BrowserRouter>
    <AuthProvider>
      <PrivacyProvider>
        <Header />
      </PrivacyProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Header - Vault Shield Toggle', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('renders Vault Privacy Shield toggle with correct initial state', () => {
    render(<MockedHeader />);
    
    const toggle = screen.getByRole('switch', { name: /vault-toggle/i });
    // Privacy mode default is ON (true) per PrivacyContext.tsx
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/Vault Shield/i)).toBeInTheDocument();
  });
  
  it('toggles privacy mode when clicked', () => {
    render(<MockedHeader />);
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('displays ON/OFF state text correctly', () => {
    render(<MockedHeader />);
    
    expect(screen.getByText(/\[ON\]/)).toBeInTheDocument();
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    expect(screen.getByText(/\[OFF\]/)).toBeInTheDocument();
  });

  it('shows gold glow border when privacy mode is enabled', () => {
    const { container } = render(<MockedHeader />);
    
    const header = container.querySelector('header');
    expect(header?.className).toContain('border-[#FFB800]');
    expect(header?.className).toContain('shadow-');
  });

  it('removes gold glow when privacy mode is disabled', () => {
    const { container } = render(<MockedHeader />);
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    const header = container.querySelector('header');
    expect(header?.className).toContain('border-white/5');
    expect(header?.className).not.toContain('border-[#FFB800]');
  });
});
