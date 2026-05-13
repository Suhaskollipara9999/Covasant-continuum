/**
 * Covasant Continuum — Accept Invite Page
 * Allows invited users to set their name and password.
 */

import { useState } from 'react';

export default function AcceptInvitePage() {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [error, setError] = useState('');

  const token = new URLSearchParams(window.location.search).get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!token) { setError('Invalid invite link'); return; }

    setStatus('loading');
    try {
      const res = await fetch('/api/v1/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, full_name: fullName, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Failed to accept invite' }));
        throw new Error(data.detail);
      }
      const data = await res.json();
      localStorage.setItem('c_at', data.access_token);
      localStorage.setItem('c_rt', data.refresh_token);
      localStorage.setItem('c_user', JSON.stringify(data.user));
      setStatus('success');
      setTimeout(() => window.location.href = '/', 2000);
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(170deg,#C5D3FA 0%,#D8E0FB 40%,#EDF0FC 100%)', fontFamily: "'Manrope Variable', Manrope, sans-serif" }}>
      <div style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -.8, color: '#0F1235' }}>
            Covasant <span style={{ color: '#2563EB' }}>Continuum</span>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid rgba(15,18,53,.08)', padding: '28px 30px', boxShadow: '0 8px 40px rgba(15,18,53,.08)' }}>
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#059669', marginBottom: 6 }}>Welcome aboard!</div>
              <div style={{ fontSize: 12.5, color: '#4A5180' }}>Redirecting to Continuum…</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -.3, marginBottom: 4 }}>Accept Invite</div>
              <div style={{ fontSize: 12.5, color: '#4A5180', marginBottom: 20 }}>Set up your account to get started</div>

              {(error || status === 'error') && (
                <div style={{ background: 'rgba(239,68,68,.08)', border: '1.5px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '9px 13px', marginBottom: 14, fontSize: 12, color: '#DC2626' }}>
                  ⚠ {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4A5180', marginBottom: 5 }}>Full Name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Your full name" style={{ width: '100%', padding: '10px 12px', background: '#F5F7FF', border: '1.5px solid rgba(15,18,53,.08)', borderRadius: 8, color: '#0F1235', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4A5180', marginBottom: 5 }}>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="Minimum 8 characters" style={{ width: '100%', padding: '10px 12px', background: '#F5F7FF', border: '1.5px solid rgba(15,18,53,.08)', borderRadius: 8, color: '#0F1235', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4A5180', marginBottom: 5 }}>Confirm Password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Confirm your password" style={{ width: '100%', padding: '10px 12px', background: '#F5F7FF', border: '1.5px solid rgba(15,18,53,.08)', borderRadius: 8, color: '#0F1235', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <button type="submit" disabled={status === 'loading'} style={{ width: '100%', padding: '11px', borderRadius: 9, background: 'linear-gradient(135deg,#059669,#047857)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {status === 'loading' ? 'Creating account…' : 'Create Account & Sign In'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
