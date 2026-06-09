import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Account } from '../types';
import { ACCOUNTS } from '../types';

export function SignIn() {
  const { signIn, isAuthLoading } = useApp();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="w-[42%] bg-accent flex flex-col justify-center px-12 py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent to-indigo-700 opacity-90"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <i className="fa-solid fa-bolt text-2xl text-white"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">SalesTrack</h1>
              <p className="text-white/70 text-sm">CRM Platform</p>
            </div>
          </div>

          <p className="text-white/90 text-lg mb-8 leading-relaxed">
            Streamline your sales process, manage leads effectively, and close more deals with our powerful CRM platform.
          </p>

          <ul className="space-y-4 mb-12">
            {[
              'Track leads through every sales stage',
              'AI-powered email composition',
              'Detailed analytics and reporting',
              'Team collaboration tools'
            ].map((feature, idx) => (
              <li key={idx} className="flex items-center gap-3 text-white/90">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-check text-xs"></i>
                </div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <p className="text-white/50 text-sm">
            &copy; 2026 SalesTrack CRM. All rights reserved.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-white/5 rounded-full"></div>
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-white/5 rounded-full"></div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-bg-card dark:bg-bg-card flex flex-col justify-center px-12 py-16">
        <div className="max-w-md mx-auto w-full">
          <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-2">Welcome back</h2>
          <p className="text-text-secondary dark:text-text-muted mb-8">Select an account to sign in</p>

          <div className="space-y-3 mb-8">
            {ACCOUNTS.map((account) => (
              <button
                key={account.id}
                onClick={() => setSelectedAccount(account)}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
                  selectedAccount?.id === account.id
                    ? 'border-accent bg-accent/5 shadow-md'
                    : 'border-border dark:border-border hover:border-accent/50 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0"
                  style={{ backgroundColor: account.color }}
                >
                  {account.initials}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-semibold text-text-primary dark:text-white truncate">{account.name}</p>
                  <p className="text-text-secondary dark:text-text-muted text-sm truncate">{account.email}</p>
                  <span className="text-xs text-text-muted dark:text-text-muted">{account.roleLabel}</span>
                </div>
                {selectedAccount?.id === account.id && (
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-check text-white text-xs"></i>
                  </div>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => selectedAccount && signIn(selectedAccount)}
            disabled={!selectedAccount || isAuthLoading}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
              selectedAccount && !isAuthLoading
                ? 'bg-accent hover:bg-indigo-600 shadow-lg shadow-accent/25'
                : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
            }`}
          >
            {isAuthLoading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <i className="fa-solid fa-arrow-right"></i>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
