import { useState, type FormEvent } from 'react';
import { api } from './api';

export function AuthForm({ onAuthenticated }: { onAuthenticated: (token: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      onAuthenticated((await api.authenticate(mode, email, password)).token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <form className="panel w-full max-w-md space-y-5 p-8" onSubmit={submit}>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.25em] text-indigo-400">
            Cloud engineering portfolio
          </p>
          <h1 className="mt-2 text-3xl font-bold">CloudTask</h1>
          <p className="mt-2 text-slate-400">Sign in to manage your deployment tasks.</p>
        </div>
        <label className="block text-sm">
          Email
          <input
            className="field mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className="field mt-1"
            type="password"
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <button className="button w-full" disabled={loading}>
          {loading ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button"
          className="w-full text-sm text-indigo-300"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}
        </button>
      </form>
    </main>
  );
}
