/**
 * Admin Password Gate
 * Simple password protection for the admin panel
 * Only allows access with the correct password
 */

import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// The admin password - change this to your desired password
// In production, this should be an environment variable
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'wallqu-admin-2024';

const SESSION_KEY = 'admin_authenticated';

interface AdminPasswordGateProps {
  children: React.ReactNode;
}

export function AdminPasswordGate({ children }: AdminPasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  // Check if already authenticated on mount
  useEffect(() => {
    const authenticated = sessionStorage.getItem(SESSION_KEY);
    setIsAuthenticated(authenticated === 'true');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsAuthenticated(true);
    } else {
      setAttempts((prev) => prev + 1);
      setError('Incorrect password');
      setPassword('');

      // Lock out after 5 failed attempts
      if (attempts >= 4) {
        setError('Too many failed attempts. Please refresh the page.');
      }
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setPassword('');
  };

  // Still checking auth state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated - show password form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Access
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Enter the admin password to continue
              </p>
            </div>

            {/* Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="pr-10"
                  disabled={attempts >= 5}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={!password || attempts >= 5}
              >
                Access Admin Panel
              </Button>
            </form>

            {/* Back link */}
            <div className="mt-6 text-center">
              <a
                href="/"
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                &larr; Back to App
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - render children with logout option available
  return (
    <>
      {children}
      {/* Hidden logout trigger - can be accessed programmatically */}
      <button
        id="admin-logout"
        onClick={handleLogout}
        className="hidden"
        aria-hidden="true"
      />
    </>
  );
}

// Export logout function for use in sidebar
export const logoutAdmin = () => {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = '/admin';
};
