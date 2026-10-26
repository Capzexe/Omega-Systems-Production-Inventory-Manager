import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { getDbMode } from '../services/mockSupabase';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'signed-out' | 'signed-in'>(getDbMode() === 'mock' ? 'signed-in' : 'loading');
  const [error, setError] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const loadSession = async () => {
    try {
      const session = await apiRequest('session');
      setSessionReady(true);
      setError('');
      setState(session.user ? 'signed-in' : 'signed-out');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect.');
      setState('signed-out');
    }
  };
  useEffect(() => {
    if (getDbMode() === 'mock') return;
    void loadSession();
    const expired = () => { setState('signed-out'); setSessionReady(false); void loadSession(); };
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, []);

  if (state === 'signed-in') return <>{children}</>;
  if (state === 'loading') return <main className="min-h-screen bg-slate-950 text-white grid place-items-center" aria-busy="true">Connecting securely…</main>;
  return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
    <form className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 space-y-5" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError('');
      try {
        await apiRequest('login', { method: 'POST', body: JSON.stringify({ login, password }) });
        setPassword(''); setState('signed-in');
      } catch (err) { setError(err instanceof Error ? err.message : 'Sign-in failed.'); }
      finally { setBusy(false); }
    }}>
      <div><p className="text-indigo-400 text-sm font-semibold">Omega Systems</p><h1 className="text-2xl font-bold mt-2">Sign in</h1><p className="text-slate-400 text-sm mt-2">Access your production inventory.</p></div>
      <label className="block text-sm">Username<input name="username" autoComplete="username" required maxLength={100} value={login} onChange={e => setLogin(e.target.value)} className="mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 p-3" /></label>
      <label className="block text-sm">Password<input name="password" type="password" autoComplete="current-password" required maxLength={72} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 p-3" /></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {!sessionReady && <button type="button" className="text-indigo-300 text-sm" onClick={() => void loadSession()}>Retry connection</button>}
      <button disabled={busy || !sessionReady} className="w-full bg-indigo-600 rounded-lg p-3 font-semibold disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
      <p className="text-xs text-slate-500">Contact your administrator for an account or password reset.</p>
    </form>
  </main>;
}
