/**
 * Covasant Continuum — Login Page
 * Split-panel design with Microsoft Entra ID SSO integration.
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useMicrosoftAuth } from '../../hooks/useMicrosoftAuth';

export default function LoginPage() {
  const { login, isLoading, error, clearError, setError } = useAuthStore();
  const {
    loginWithMicrosoft,
    handleMicrosoftCallback,
    isConfigured: msConfigured,
    loading: msLoading,
    setLoading: setMsLoading,
    error: msError,
  } = useMicrosoftAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Handle Microsoft SSO callback on mount
  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
      (async () => {
        setMsLoading(true);
        const result = await handleMicrosoftCallback();
        if (result) {
          // Validate with our backend to get Continuum JWT tokens
          try {
            const BASE_URL = 'https://continuum-backend-823807258560.us-central1.run.app';
            const resp = await fetch(`${BASE_URL}/api/v1/auth/oauth/validate-entra-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: result.email, name: result.name }),
            });
            if (resp.ok) {
              const data = await resp.json();
              // Store tokens and user in authStore
              useAuthStore.setState({
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                user: {
                  id: data.user.id,
                  email: data.user.email,
                  full_name: data.user.full_name,
                  role: data.user.role,
                  tenant_id: data.user.tenant_id,
                  is_active: data.user.is_active,
                  avatar_url: data.user.avatar_url,
                },
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
              localStorage.setItem('cc_access', data.access_token);
              localStorage.setItem('cc_refresh', data.refresh_token);
            } else {
              const errData = await resp.json().catch(() => ({ detail: 'Authentication failed' }));
              setError(errData.detail || 'Microsoft authentication failed');
            }
          } catch {
            setError('Failed to connect to server for Microsoft SSO validation.');
          }
        }
        setMsLoading(false);
      })();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(email, password);
  };

  const displayError = error || msError;

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      fontFamily: "'Manrope Variable', Manrope, 'Inter', sans-serif",
      overflow: 'hidden',
    }}>
      {/* ── Left Panel: Branding ── */}
      <div style={{
        flex: '0 0 45%',
        background: 'linear-gradient(160deg, #f0f4ff 0%, #e8eeff 30%, #dbe4ff 60%, #f0f4ff 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '40px 50px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle decorative shapes */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(37, 99, 235, 0.06)',
        }} />
        <div style={{
          position: 'absolute', top: 120, right: 80, width: 100, height: 100,
          borderRadius: 16, background: 'rgba(37, 99, 235, 0.04)', transform: 'rotate(15deg)',
        }} />
        <div style={{
          position: 'absolute', bottom: 100, left: -30, width: 150, height: 150,
          borderRadius: '50%', background: 'rgba(37, 99, 235, 0.04)',
        }} />

        {/* Logo */}
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0F1235', letterSpacing: -0.5 }}>
            Covasant
          </div>
          <div style={{
            fontSize: 9, color: '#6B7199', letterSpacing: 1.2, fontWeight: 700,
            textTransform: 'uppercase', marginTop: 2,
          }}>
            AI-Driven. Human-Inspired.
          </div>
        </div>

        {/* Main headline */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontSize: 42, fontWeight: 800, color: '#1A44B8',
            lineHeight: 1.15, letterSpacing: -0.8, marginBottom: 20, margin: 0,
          }}>
            Covasant<br />Continuum
          </h1>
          <p style={{
            fontSize: 15, color: '#555B7A', lineHeight: 1.7,
            maxWidth: 380, margin: 0, marginTop: 18,
          }}>
            Unified platform to manage product knowledge, release notes, guides,
            and AI-powered documentation across your enterprise. Knowledge that
            compounds — sprint after sprint.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20,
          fontSize: 12, color: '#6B7199',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7199" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            www.covasant.com
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7199" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            help@covasant.com
          </span>
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        padding: '40px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{
            fontSize: 28, fontWeight: 800, color: '#0F1235',
            marginBottom: 6, margin: 0,
          }}>
            Welcome!
          </h2>
          <p style={{
            fontSize: 13.5, color: '#6B7199', marginBottom: 28,
            marginTop: 6,
          }}>
            Please add your login credentials here.
          </p>

          {/* Error Alert */}
          {displayError && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 12.5, color: '#DC2626', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {displayError}
            </div>
          )}

          {/* Microsoft SSO loading */}
          {msLoading && (
            <div style={{
              background: 'rgba(37,99,235,.05)', border: '1px solid rgba(37,99,235,.15)',
              borderRadius: 8, padding: '14px', marginBottom: 16,
              textAlign: 'center', fontSize: 13, color: '#2563EB', fontWeight: 600,
            }}>
              Validating Microsoft account…
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block', fontSize: 12.5, fontWeight: 700,
                color: '#0F1235', marginBottom: 6,
              }}>
                Enter a registered Email/Username
              </label>
              <input
                id="login-email"
                type="email"
                name="login-email-field"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={{
                  width: '100%', padding: '11px 14px',
                  border: '1.5px solid #E2E6F0', borderRadius: 8,
                  fontSize: 13, color: '#0F1235', fontFamily: 'inherit',
                  outline: 'none', background: '#fff',
                  transition: 'border-color .2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E2E6F0'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block', fontSize: 12.5, fontWeight: 700,
                color: '#0F1235', marginBottom: 6,
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="login-password-field"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '11px 40px 11px 14px',
                    border: '1.5px solid #E2E6F0', borderRadius: 8,
                    fontSize: 13, color: '#0F1235', fontFamily: 'inherit',
                    outline: 'none', background: '#fff',
                    transition: 'border-color .2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563EB'}
                  onBlur={e => e.target.style.borderColor = '#E2E6F0'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', padding: 4,
                    color: '#9098BA',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 24,
            }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 7,
                fontSize: 12.5, color: '#555B7A', cursor: 'pointer',
                userSelect: 'none',
              }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  style={{
                    width: 15, height: 15, accentColor: '#2563EB',
                    cursor: 'pointer',
                  }}
                />
                Remember me
              </label>
              <a
                href="#"
                onClick={e => e.preventDefault()}
                style={{
                  fontSize: 12.5, color: '#2563EB', fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '12px',
                background: isLoading ? '#93B5FD' : '#2563EB',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background .2s, transform .1s',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
              }}
              onMouseDown={e => { if (!isLoading) (e.target as HTMLElement).style.transform = 'scale(0.985)'; }}
              onMouseUp={e => (e.target as HTMLElement).style.transform = ''}
            >
              {isLoading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            margin: '22px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: '#E2E6F0' }} />
            <span style={{ fontSize: 11.5, color: '#9098BA', fontWeight: 600 }}>or Login using</span>
            <div style={{ flex: 1, height: 1, background: '#E2E6F0' }} />
          </div>

          {/* OAuth Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              style={{
                flex: 1, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                padding: '10px 16px', border: '1.5px solid #E2E6F0',
                borderRadius: 8, background: '#fff', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600, color: '#0F1235',
                fontFamily: 'inherit', transition: 'border-color .2s, box-shadow .2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(37,99,235,.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E6F0'; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Login with Google
            </button>
            <button
              type="button"
              onClick={loginWithMicrosoft}
              disabled={msLoading}
              style={{
                flex: 1, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                padding: '10px 16px', border: '1.5px solid #E2E6F0',
                borderRadius: 8, background: '#fff',
                cursor: msLoading ? 'not-allowed' : 'pointer',
                fontSize: 12.5, fontWeight: 600, color: '#0F1235',
                fontFamily: 'inherit', transition: 'border-color .2s, box-shadow .2s',
                opacity: msLoading ? 0.6 : 1,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(37,99,235,.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E6F0'; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
            >
              <svg width="16" height="16" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              {msLoading ? 'Validating…' : 'Login with Microsoft'}
            </button>
          </div>

          {/* Microsoft SSO Config Note */}
          {!msConfigured && (
            <div style={{
              marginTop: 14, padding: '8px 10px',
              background: 'rgba(217,119,6,.06)', borderRadius: 6,
              border: '1px solid rgba(217,119,6,.15)',
              fontSize: 10.5, color: '#92400E', lineHeight: 1.5,
            }}>
              💡 Microsoft SSO requires <code style={{ background: 'rgba(217,119,6,.08)', padding: '1px 3px', borderRadius: 2 }}>VITE_AUTH_BASE_URL</code> and <code style={{ background: 'rgba(217,119,6,.08)', padding: '1px 3px', borderRadius: 2 }}>VITE_AUTH_CLIENT_ID</code> in your frontend <code style={{ background: 'rgba(217,119,6,.08)', padding: '1px 3px', borderRadius: 2 }}>.env</code> file.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
