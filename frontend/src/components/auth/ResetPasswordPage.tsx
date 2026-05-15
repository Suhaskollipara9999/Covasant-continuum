/**
 * Covasant Continuum — Password Reset Page
 */

import { useState } from 'react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this calls the backend password reset endpoint
    setSent(true);
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
          {sent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✉</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#2563EB', marginBottom: 6 }}>Check your email</div>
              <div style={{ fontSize: 12.5, color: '#4A5180', lineHeight: 1.6 }}>If an account exists for <strong>{email}</strong>, we've sent a password reset link.</div>
              <a href="/" style={{ display: 'inline-block', marginTop: 16, padding: '9px 18px', borderRadius: 8, background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Back to Login</a>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -.3, marginBottom: 4 }}>Reset Password</div>
              <div style={{ fontSize: 12.5, color: '#4A5180', marginBottom: 20 }}>Enter your email to receive a reset link</div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4A5180', marginBottom: 5 }}>Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" style={{ width: '100%', padding: '10px 12px', background: '#F5F7FF', border: '1.5px solid rgba(15,18,53,.08)', borderRadius: 8, color: '#0F1235', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <button type="submit" style={{ width: '100%', padding: '11px', borderRadius: 9, background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Send Reset Link</button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <a href="/" style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>← Back to Sign In</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
