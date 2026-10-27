import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy } from 'lucide-react';
import { apiRequest } from '../services/api';
import { PUBLIC_DEMO } from '../services/demo';
import { getDbMode } from '../services/mockSupabase';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'signed-out' | 'signed-in'>(getDbMode() === 'mock' ? 'signed-in' : 'loading');
  const [error, setError] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'member' | 'demo' | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const signIn = async (mode: 'member' | 'demo') => {
    if (busy || !sessionReady) return;
    setBusy(mode);
    setError('');
    try {
      const credentials = mode === 'demo' ? PUBLIC_DEMO : { login, password };
      await apiRequest('login', { method: 'POST', body: JSON.stringify(credentials) });
      setPassword('');
      setState('signed-in');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally { setBusy(null); }
  };

  if (state === 'signed-in') return <>{children}</>;
  if (state === 'loading') return <main className="min-h-screen bg-slate-950 text-white grid place-items-center" aria-busy="true">Connecting securely…</main>;
  const inputClass = 'mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 p-3 text-base caret-indigo-400 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:border-indigo-400';
  return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-5 py-10 selection:bg-indigo-500/30">
    <form className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8" onSubmit={event => { event.preventDefault(); void signIn('member'); }}>
      <header className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Omega Systems</h1>
        <p className="text-slate-300 text-sm mt-2 leading-relaxed">Sign in to your production inventory.</p>
      </header>
      <div className="space-y-5">
        <label className="block text-sm font-medium">Username<input name="username" autoComplete="username" required maxLength={100} value={login} onChange={e => setLogin(e.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-medium">Password<input name="password" type="password" autoComplete="current-password" required maxLength={72} value={password} onChange={e => setPassword(e.target.value)} className={inputClass} /></label>
        {error && <p role="alert" className="text-sm text-red-300 leading-relaxed">{error}</p>}
        {!sessionReady && <button type="button" className="text-indigo-300 text-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400" onClick={() => void loadSession()}>Retry connection</button>}
        <button type="submit" disabled={!!busy || !sessionReady} className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-lg p-3 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-400">{busy === 'member' ? 'Signing in…' : 'Sign in'}</button>
      </div>
      <section aria-labelledby="demo-heading" className="mt-7 pt-6 border-t border-slate-700/80">
        <h2 id="demo-heading" className="text-base font-semibold text-white">Here to explore?</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-300">Take a look around with our demo account. Inventory and productions are available to view.</p>
        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3"><dt className="text-slate-300">Username</dt><dd className="font-mono text-slate-100 select-all">{PUBLIC_DEMO.login}</dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="text-slate-300">Password</dt><dd className="flex items-center gap-1.5 min-w-0"><code className="text-xs sm:text-[13px] text-slate-100 select-all break-all">{PUBLIC_DEMO.password}</code><button type="button" aria-label={copied ? 'Demo password copied' : 'Copy demo password'} title={copied ? 'Copied' : 'Copy password'} className="shrink-0 p-2 -mr-2 text-slate-300 hover:text-white rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400" onClick={async () => { try { await navigator.clipboard.writeText(PUBLIC_DEMO.password); setCopied(true); } catch { setError('Select and copy the demo password manually.'); } }}>{copied ? <Check size={15} /> : <Copy size={15} />}</button></dd></div>
        </dl>
        <button type="button" disabled={!!busy || !sessionReady} onClick={() => void signIn('demo')} className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-indigo-400/60 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-400">{busy === 'demo' ? 'Opening demo…' : 'Explore demo'}<ArrowRight size={16} aria-hidden="true" /></button>
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">Read-only access. Your visit will not change any data.<span className="sr-only" aria-live="polite">{copied ? ' Demo password copied.' : ''}</span></p>
      </section>
    </form>
  </main>;
}
