import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/authContext';
import { signIn, auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Loader2, ExternalLink, AlertCircle } from 'lucide-react';

export const AuthPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setErrorMsg('');
    try {
      await signIn();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/popup-blocked') {
        setErrorMsg('Sign-in popup was cancelled or blocked by your browser. If you consistently see this, try opening the app in a new tab.');
      } else {
        setErrorMsg(error.message || 'Failed to sign in.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSigningIn) return;
    if (!username || !password) return;
    
    setIsSigningIn(true);
    setErrorMsg('');
    
    try {
      const finalEmail = username.includes('@') ? username.toLowerCase().trim() : `${username.toLowerCase().trim()}@coop.local`;
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, finalEmail, password);
      } else {
        await createUserWithEmailAndPassword(auth, finalEmail, password);
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/invalid-credential') {
        setErrorMsg('Invalid email or password.');
      } else if (error.code === 'auth/email-already-in-use') {
        setErrorMsg('An account already exists for this email. Please sign in instead.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMsg('Password should be at least 6 characters.');
      } else {
        setErrorMsg(error.message || `Failed to ${mode}.`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-blue-600">
          <ShieldCheck className="w-12 h-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 tracking-tight">
          Co-op Society Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to manage your society account & transactions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm sm:rounded-xl sm:px-10 border border-gray-100">
          
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Authentication Issue</p>
                <p className="mt-1 opacity-90">{errorMsg}</p>
                {errorMsg.includes('new tab') && (
                  <button 
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="mt-3 flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-red-200 text-red-700 font-medium hover:bg-red-50 transition-colors"
                  >
                    Open in New Tab <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                mode === 'login' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setErrorMsg(''); }}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                mode === 'register' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              First Time Setup
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            {mode === 'register' && (
              <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg border border-blue-100 mb-2">
                Use this option if the admin has registered your Username but you haven't set a password yet.
              </div>
            )}
            <div>
              <label className="block sm text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={isSigningIn}
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isSigningIn}
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                placeholder={mode === 'login' ? 'Enter your password' : 'Create a new password'}
              />
            </div>
            <button
              type="submit"
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSigningIn && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Sign in with Password' : 'Set Password & Continue'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fillRule="evenodd"
                clipRule="evenodd"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
          
          <p className="text-xs text-center text-gray-500 mt-6 leading-relaxed">
            By creating an account or logging in, you agree to our <br/>
            <Link to="/terms" className="text-blue-600 hover:underline">Terms of Use</Link> and <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};
