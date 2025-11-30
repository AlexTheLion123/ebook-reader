import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

type AuthMode = 'signup' | 'signin' | 'confirm';

interface LoginPageProps {
  onCancel?: () => void;
  onSuccess?: () => void;
  initialMode?: 'signin' | 'signup';
}

// Google G Logo component with proper colors
const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#EA4335"
      d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"
    />
    <path
      fill="#34A853"
      d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"
    />
    <path
      fill="#4A90E2"
      d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"
    />
    <path
      fill="#FBBC05"
      d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"
    />
  </svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({ onCancel, onSuccess, initialMode = 'signup' }) => {
  const { signInWithEmail, signUpWithEmail, confirmSignUpCode, signInWithGoogle, isLoading, isConfigured } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLocalLoading(true);
    
    try {
      await signInWithEmail(email, password);
      // Navigate back to app on success
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLocalLoading(true);
    
    try {
      const result = await signUpWithEmail(email, password, name);
      if (!result.isSignUpComplete) {
        setMode('confirm');
        setSuccess('Check your email for a verification code!');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLocalLoading(true);
    
    try {
      await confirmSignUpCode(email, confirmCode);
      setSuccess('Email verified! You can now sign in.');
      setMode('signin');
      setConfirmCode('');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
    }
  };

  // Not configured state
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a110e]">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Authentication Not Configured</h2>
          <p className="text-brand-cream/60 mb-6">
            Please deploy the backend and set the Cognito environment variables to enable authentication.
          </p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-brand-cream/60 hover:text-brand-cream text-sm uppercase tracking-wider transition-colors"
            >
              Back to Landing
            </button>
          )}
        </div>
      </div>
    );
  }

  const loading = isLoading || localLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a110e] p-4">
      {/* Subtle background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-amber-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-orange-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        
        {/* ============ SIGN UP VIEW ============ */}
        {mode === 'signup' && (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Create an account</h1>
              <p className="text-brand-cream/50 text-base">Start your reading journey today.</p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Google Sign Up - Primary CTA */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-white/5 mb-6"
            >
              <GoogleLogo />
              <span>Sign up with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-brand-cream/40 text-xs uppercase tracking-widest">
                Or continue with
              </span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            {/* Sign Up Form */}
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-brand-cream/50 text-xs uppercase tracking-wider mb-2 font-medium">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-cream/30" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#2a1d18] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-brand-cream/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    placeholder="Jane Doe"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-brand-cream/50 text-xs uppercase tracking-wider mb-2 font-medium">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-cream/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#2a1d18] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-brand-cream/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    placeholder="name@example.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-brand-cream/50 text-xs uppercase tracking-wider mb-2 font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-cream/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#2a1d18] border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white placeholder-brand-cream/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-cream/30 hover:text-brand-cream/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-brand-cream/30 text-xs mt-2">Must include uppercase, lowercase, and numbers</p>
              </div>

              {/* Submit Button - Glowing Orange Gradient */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-4 px-6 rounded-xl hover:from-amber-400 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-[#1a110e] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <p className="text-center text-brand-cream/50 text-sm mt-8">
              Already have an account?{' '}
              <button
                onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
                className="text-white font-semibold hover:text-amber-400 transition-colors underline underline-offset-2"
              >
                Sign in
              </button>
            </p>

            {/* Back to Landing */}
            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full text-center text-brand-cream/40 hover:text-brand-cream/60 text-xs uppercase tracking-widest mt-6 py-2 transition-colors"
              >
                Back to Landing
              </button>
            )}
          </>
        )}

        {/* ============ SIGN IN VIEW ============ */}
        {mode === 'signin' && (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Welcome back</h1>
              <p className="text-brand-cream/50 text-base">Sign in to continue learning.</p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Google Sign In - Primary CTA */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-white/5 mb-6"
            >
              <GoogleLogo />
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-brand-cream/40 text-xs uppercase tracking-widest">
                Or continue with
              </span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Email Address */}
              <div>
                <label className="block text-brand-cream/50 text-xs uppercase tracking-wider mb-2 font-medium">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-cream/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#2a1d18] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-brand-cream/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    placeholder="name@example.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-brand-cream/50 text-xs uppercase tracking-wider font-medium">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      // TODO: Implement forgot password flow
                      setError('Password reset will be sent to your email.');
                    }}
                    className="text-brand-cream/50 hover:text-brand-cream/80 text-xs transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-cream/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#2a1d18] border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white placeholder-brand-cream/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-cream/30 hover:text-brand-cream/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-4 px-6 rounded-xl hover:from-amber-400 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-[#1a110e] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Create Account Link */}
            <p className="text-center text-brand-cream/50 text-sm mt-8">
              Don't have an account?{' '}
              <button
                onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                className="text-white font-semibold hover:text-amber-400 transition-colors underline underline-offset-2"
              >
                Create one
              </button>
            </p>

            {/* Back to Landing */}
            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full text-center text-brand-cream/40 hover:text-brand-cream/60 text-xs uppercase tracking-widest mt-6 py-2 transition-colors"
              >
                Back to Landing
              </button>
            )}
          </>
        )}

        {/* ============ CONFIRM CODE VIEW ============ */}
        {mode === 'confirm' && (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-amber-400" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Check your email</h1>
              <p className="text-brand-cream/50 text-base">We sent a verification code to</p>
              <p className="text-white font-medium">{email}</p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Confirm Form */}
            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label className="block text-brand-cream/50 text-xs uppercase tracking-wider mb-2 font-medium text-center">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  className="w-full bg-[#2a1d18] border border-white/10 rounded-xl py-4 px-4 text-white text-center text-2xl tracking-[0.5em] placeholder-brand-cream/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono"
                  placeholder="000000"
                  maxLength={6}
                  required
                  disabled={loading}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-4 px-6 rounded-xl hover:from-amber-400 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-[#1a110e] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Verify Email
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Back to Sign In */}
            <button
              onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
              className="w-full text-center text-brand-cream/50 hover:text-brand-cream text-sm mt-6 py-2 transition-colors"
            >
              Back to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
