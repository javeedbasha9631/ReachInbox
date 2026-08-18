import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authApi, setToken } from '../services/api';

const API_BASE = 'https://reachinbox-backend-production-e3f2.up.railway.app';

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const [authConfig, setAuthConfig] = useState<{googleEnabled: boolean; devLoginEnabled: boolean}>({googleEnabled: false, devLoginEnabled: true});
  const [devLoading, setDevLoading] = useState(false);

  useEffect(() => {
    authApi.getConfig().then((res: any) => {
      if (res.success && res.data) {
        setAuthConfig(res.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, loading]);

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleDevLogin = async () => {
    setDevLoading(true);
    try {
      const res = await authApi.devLogin();
      if (res.token) {
        setToken(res.token);
      }
      window.location.href = '/dashboard';
    } catch {
      setDevLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">ReachInbox</h1>
          <p className="text-gray-400">Schedule and manage your email campaigns</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-8 shadow-xl border border-gray-700">
          <div className="space-y-4">
            {authConfig.googleEnabled && (
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            )}

            {authConfig.devLoginEnabled && (
              <>
                {authConfig.googleEnabled && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-gray-800 text-gray-400">or</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleDevLogin}
                  disabled={devLoading}
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {devLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Try Demo Mode
                    </>
                  )}
                </button>
              </>
            )}

            {!authConfig.googleEnabled && !authConfig.devLoginEnabled && (
              <p className="text-center text-gray-400">No login methods available. Contact administrator.</p>
            )}
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Powered by Brevo Email Service
        </p>
      </div>
    </div>
  );
}
