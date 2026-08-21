import { useState } from 'react';
import { signIn, signUp } from '../utils/auth';

export default function AuthScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        setSignedUp(true);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (signedUp) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-sub">We sent a confirmation link to <b>{email}</b>. Confirm it, then log in below.</p>
          <button type="button" className="btn secondary" onClick={() => { setSignedUp(false); setMode('login'); }}>Back to log in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <h1 className="auth-title">Galle Zonal Draw Builder</h1>
        <p className="auth-sub">{mode === 'login' ? 'Log in to manage your tournaments.' : 'Create an organizer account.'}</p>
        <label className="modal-field">
          Email
          <input className="modal-input" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="modal-field">
          Password
          <input className="modal-input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
        <button type="button" className="btn secondary" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </form>
    </div>
  );
}
