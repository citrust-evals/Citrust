// Login Page with Email OTP Authentication for Citrus AI
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendOTP, verifyOTP, registerUser } from '../api_auth';

type AuthStep = 'email' | 'otp' | 'register';

// Country codes list
const countryCodes = [
  { code: '+1', country: 'US' },
  { code: '+44', country: 'UK' },
  { code: '+91', country: 'IN' },
  { code: '+86', country: 'CN' },
  { code: '+81', country: 'JP' },
  { code: '+49', country: 'DE' },
  { code: '+33', country: 'FR' },
  { code: '+39', country: 'IT' },
  { code: '+7', country: 'RU' },
  { code: '+55', country: 'BR' },
  { code: '+61', country: 'AU' },
  { code: '+82', country: 'KR' },
  { code: '+34', country: 'ES' },
  { code: '+31', country: 'NL' },
  { code: '+46', country: 'SE' },
  { code: '+41', country: 'CH' },
  { code: '+971', country: 'UAE' },
  { code: '+65', country: 'SG' },
  { code: '+852', country: 'HK' },
  { code: '+60', country: 'MY' },
];

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // Auth flow state
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sessionToken, setSessionToken] = useState('');

  // Registration form state
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  // OTP input refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle email submission
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await sendOTP(email);
      if (response.success) {
        setSuccess('OTP sent to your email!');
        setStep('otp');
        setCountdown(60); // 60 seconds cooldown
        // Focus first OTP input
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      // Focus last filled or next empty input
      const focusIndex = Math.min(index + digits.length, 5);
      otpRefs.current[focusIndex]?.focus();
    } else {
      // Single character input
      if (/^\d*$/.test(value)) {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
          otpRefs.current[index + 1]?.focus();
        }
      }
    }
  };

  // Handle OTP keydown (for backspace navigation)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setIsLoading(true);

    try {
      const response = await verifyOTP(email, otpString);
      if (response.success) {
        if (response.is_new_user) {
          // New user - go to registration
          setSessionToken(response.session_token || '');
          setStep('register');
          setSuccess('OTP verified! Please complete your registration.');
        } else {
          // Existing user - login complete
          if (response.user) {
            login(response.user);
            navigate('/chat');
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setIsLoading(true);

    try {
      const response = await registerUser({
        email,
        name: name.trim(),
        country_code: countryCode,
        phone_number: phoneNumber.trim(),
        session_token: sessionToken,
      });

      if (response.success && response.user) {
        login(response.user);
        navigate('/chat');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setError('');
    setIsLoading(true);

    try {
      const response = await sendOTP(email);
      if (response.success) {
        setSuccess('New OTP sent to your email!');
        setOtp(['', '', '', '', '', '']);
        setCountdown(60);
        otpRefs.current[0]?.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to previous step
  const handleBack = () => {
    setError('');
    setSuccess('');
    if (step === 'otp') {
      setStep('email');
      setOtp(['', '', '', '', '', '']);
    } else if (step === 'register') {
      setStep('otp');
    }
  };

  return (
    <div className="min-h-screen bg-background-dark flex">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-blob"></div>
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative z-10 flex-col justify-between p-12">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <span className="material-symbols-outlined text-primary text-[32px]">spa</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Citrus AI</h1>
            <p className="text-xs text-gray-400 font-mono">v2.4.0</p>
          </div>
        </div>

        <div className="max-w-lg">
          <h2 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
            Evaluate LLMs with<br />
            <span className="text-primary">Confidence</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Compare responses from multiple AI models, track performance metrics, 
            and build better AI systems with real-time insights.
          </p>

          {/* Feature highlights */}
          <div className="mt-8 space-y-4">
            {[
              { icon: 'compare', text: 'Side-by-side model comparison' },
              { icon: 'monitoring', text: 'Real-time performance tracing' },
              { icon: 'analytics', text: 'Advanced analytics dashboard' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-gray-300">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg">{item.icon}</span>
                </div>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-500 text-sm">
          © 2026 Citrus AI. All rights reserved.
        </p>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <span className="material-symbols-outlined text-primary text-[24px]">spa</span>
            </div>
            <h1 className="text-xl font-bold text-white">Citrus AI</h1>
          </div>

          {/* Auth Card */}
          <div className="glass-panel rounded-2xl p-8">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-8">
              {['email', 'otp', 'register'].map((s, idx) => (
                <React.Fragment key={s}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      step === s
                        ? 'bg-primary text-background-dark'
                        : idx < ['email', 'otp', 'register'].indexOf(step)
                        ? 'bg-primary/20 text-primary'
                        : 'bg-white/10 text-gray-500'
                    }`}
                  >
                    {idx < ['email', 'otp', 'register'].indexOf(step) ? (
                      <span className="material-symbols-outlined text-lg">check</span>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  {idx < 2 && (
                    <div
                      className={`flex-1 h-0.5 ${
                        idx < ['email', 'otp', 'register'].indexOf(step)
                          ? 'bg-primary'
                          : 'bg-white/10'
                      }`}
                    ></div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Email Step */}
            {step === 'email' && (
              <>
                <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
                <p className="text-gray-400 mb-6">
                  Enter your email to sign in or create an account
                </p>

                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Email Address</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-xl">
                        mail
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="input-field pl-12"
                        autoFocus
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <span className="material-symbols-outlined text-lg">error</span>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin"></div>
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        Continue
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* OTP Step */}
            {step === 'otp' && (
              <>
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-4"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                  Back
                </button>

                <h2 className="text-2xl font-bold mb-2">Enter OTP</h2>
                <p className="text-gray-400 mb-6">
                  We've sent a 6-digit code to <span className="text-primary">{email}</span>
                </p>

                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  {/* OTP Inputs */}
                  <div className="flex justify-between gap-2">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                        disabled={isLoading}
                      />
                    ))}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <span className="material-symbols-outlined text-lg">error</span>
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || otp.join('').length !== 6}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin"></div>
                        Verifying...
                      </>
                    ) : (
                      'Verify OTP'
                    )}
                  </button>

                  {/* Resend OTP */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={countdown > 0 || isLoading}
                      className={`text-sm ${
                        countdown > 0
                          ? 'text-gray-500 cursor-not-allowed'
                          : 'text-primary hover:underline'
                      }`}
                    >
                      {countdown > 0 ? `Resend OTP in ${countdown}s` : "Didn't receive code? Resend"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Registration Step */}
            {step === 'register' && (
              <>
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-4"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                  Back
                </button>

                <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
                <p className="text-gray-400 mb-6">
                  Just a few more details to get started
                </p>

                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Full Name</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-xl">
                        person
                      </span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="input-field pl-12"
                        autoFocus
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Phone Number</label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        disabled={isLoading}
                      >
                        {countryCodes.map((cc) => (
                          <option key={cc.code} value={cc.code} className="bg-surface-dark">
                            {cc.code} {cc.country}
                          </option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-xl">
                          phone
                        </span>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="1234567890"
                          className="input-field pl-12 w-full"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email (readonly) */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Email</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-xl">
                        mail
                      </span>
                      <input
                        type="email"
                        value={email}
                        className="input-field pl-12 bg-white/5 cursor-not-allowed"
                        disabled
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-green-500 text-xl">
                        verified
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <span className="material-symbols-outlined text-lg">error</span>
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin"></div>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Terms */}
          <p className="text-center text-gray-500 text-sm mt-6">
            By continuing, you agree to our{' '}
            <a href="#" className="text-primary hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
