// Authentication API functions for Citrus AI
const API_BASE_URL = 'http://localhost:8000';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  country_code: string;
  phone_number: string;
  role: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  is_new_user?: boolean;
  session_token?: string;
}

export interface OTPRequest {
  email: string;
}

export interface OTPVerifyRequest {
  email: string;
  otp: string;
}

export interface RegistrationRequest {
  email: string;
  name: string;
  country_code: string;
  phone_number: string;
  session_token: string;
}

// Token management
const TOKEN_KEY = 'citrus_auth_token';
const USER_KEY = 'citrus_user';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = (): User | null => {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

export const setStoredUser = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// API calls
export const sendOTP = async (email: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send OTP');
  }

  return response.json();
};

export const verifyOTP = async (email: string, otp: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, otp }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to verify OTP');
  }

  const data = await response.json();
  
  // If existing user, store token and user data
  if (data.success && data.token && data.user) {
    setStoredToken(data.token);
    setStoredUser(data.user);
  }

  return data;
};

export const registerUser = async (data: RegistrationRequest): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to register');
  }

  const result = await response.json();
  
  // Store token and user data
  if (result.success && result.token && result.user) {
    setStoredToken(result.token);
    setStoredUser(result.user);
  }

  return result;
};

export const getCurrentUser = async (): Promise<AuthResponse> => {
  const token = getStoredToken();
  
  if (!token) {
    throw new Error('No token found');
  }

  const response = await fetch(`${API_BASE_URL}/auth/me?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    removeStoredToken();
    throw new Error('Session expired');
  }

  const data = await response.json();
  
  if (data.success && data.user) {
    setStoredUser(data.user);
  }

  return data;
};

export const logout = async (): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    removeStoredToken();
  }
};

export const isAuthenticated = (): boolean => {
  return !!getStoredToken();
};
