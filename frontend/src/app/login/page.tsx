'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ShieldCheck, Dumbbell, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('super@codebyt.com');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials or connection error.');
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      {/* Dynamic Ambient Background Gradients */}
      <div className="absolute top-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-blue-600/10 blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-20%] h-[60%] w-[60%] rounded-full bg-indigo-600/10 blur-[120px]"></div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/20">
            <Dumbbell className="h-9 w-9 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
            Codebyt GMS
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Enterprise Gym Management SaaS
          </p>
        </div>

        {/* Premium Card Structure */}
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400 animate-shake">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 focus:outline-none transition"
                  placeholder="name@gym.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 focus:outline-none transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-400 hover:text-blue-300 transition">
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 transition"
              >
                {submitting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Accounts Helper Box */}
          <div className="mt-8 border-t border-slate-700/60 pt-6">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              Demo Roles (Password: <code className="text-blue-400 bg-slate-900/60 px-1 py-0.5 rounded">admin123</code>)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-700/30">
                <span className="font-medium text-slate-300 block">Super Admin</span>
                super@codebyt.com
              </div>
              <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-700/30">
                <span className="font-medium text-slate-300 block">Gym Admin</span>
                admin@codebyt.com
              </div>
              <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-700/30">
                <span className="font-medium text-slate-300 block">Trainer</span>
                trainer1@codebyt.com
              </div>
              <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-700/30">
                <span className="font-medium text-slate-300 block">Member</span>
                member1@codebyt.com
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
