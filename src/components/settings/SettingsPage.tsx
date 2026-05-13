/**
 * Covasant Continuum — Settings Page
 * No API key input — AI is configured via backend .env.
 * Products fetched from real API.
 */

import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { fetchProducts, fetchPlatformSettings, updatePlatformSetting } from '../../utils/api';
import { useAuthStore } from '../../stores/authStore';

interface Product {
  id: string;
  name: string;
  full_name: string;
  is_active: boolean;
}

interface PlatformSetting {
  key: string;
  value: string;
  label: string;
}

export default function SettingsPage() {
  const { showToast } = useAppStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingProducts(true);
      try { setProducts(await fetchProducts()); } catch {}
      setLoadingProducts(false);
    })();
    if (isAdmin) {
      (async () => {
        setLoadingSettings(true);
        try { setSettings(await fetchPlatformSettings()); } catch {}
        setLoadingSettings(false);
      })();
    }
  }, [isAdmin]);

  const handleToggle = async (s: PlatformSetting) => {
    const newVal = s.value === 'true' ? 'false' : 'true';
    setSettings(prev => prev.map(x => x.key === s.key ? { ...x, value: newVal } : x));
    try {
      await updatePlatformSetting(s.key, newVal);
      showToast(`${s.label} ${newVal === 'true' ? 'enabled' : 'disabled'}`);
    } catch (e: any) {
      setSettings(prev => prev.map(x => x.key === s.key ? { ...x, value: s.value } : x));
      showToast(e.message);
    }
  };

  return (
    <div style={{ padding: '18px 20px' }} className="fade-up">
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -.4, marginBottom: 3 }}>Settings</div>
      <div style={{ fontSize: 12.5, color: 'var(--t2)', marginBottom: 16 }}>Configure Continuum integrations, access control, and portal behaviour.</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Left Column */}
        <div>
          {/* AI Configuration Info */}
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>AI Configuration</div>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: 14, boxShadow: 'var(--sh)', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--blue), var(--pur))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>AI</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Powered by Backend AI</div>
                <div style={{ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.5 }}>
                  AI model API keys are configured securely on the server via the <code style={{ background: 'var(--c2)', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>backend/.env</code> file. No client-side keys are needed.
                </div>
                <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(5,150,105,.06)', borderRadius: 6, border: '1px solid rgba(5,150,105,.12)' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--grn)', fontWeight: 700 }}>✓ Securely configured on server</div>
                </div>
              </div>
            </div>
          </div>

          {/* Portal Preferences (admin only) */}
          {isAdmin && (
            <>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Portal Preferences</div>
              <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: 14, boxShadow: 'var(--sh)' }}>
                {loadingSettings ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Loading…</div>
                ) : settings.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>No settings available.</div>
                ) : (
                  settings.map(s => (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--bd)' }}>
                      <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>{s.label}</span>
                      <button className={`tgl ${s.value === 'true' ? 'on' : ''}`} onClick={() => handleToggle(s)} />
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {!isAdmin && (
            <>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Your Account</div>
              <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: 14, boxShadow: 'var(--sh)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--bd)', fontSize: 12 }}>
                  <span style={{ color: 'var(--t3)', fontWeight: 600 }}>Name</span>
                  <span style={{ color: 'var(--t1)', fontWeight: 700 }}>{user?.full_name || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--bd)', fontSize: 12 }}>
                  <span style={{ color: 'var(--t3)', fontWeight: 600 }}>Email</span>
                  <span style={{ color: 'var(--t1)', fontWeight: 700 }}>{user?.email || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 12 }}>
                  <span style={{ color: 'var(--t3)', fontWeight: 600 }}>Role</span>
                  <span style={{ color: 'var(--t1)', fontWeight: 700, textTransform: 'capitalize' }}>{user?.role || '—'}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Products in Continuum</div>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, overflow: 'hidden', marginBottom: 14, boxShadow: 'var(--sh)' }}>
            {loadingProducts ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Loading…</div>
            ) : products.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>No products configured yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead><tr>{['Product', 'Status'].map(h => <th key={h} style={{ padding: '7px 11px', borderBottom: '1px solid var(--bd)', color: 'var(--t3)', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: .8, textAlign: 'left' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td style={{ padding: '7px 11px', borderBottom: '1px solid rgba(15,18,53,.04)', fontWeight: 700, color: 'var(--t1)' }}>{p.full_name || p.name}</td>
                      <td style={{ padding: '7px 11px', borderBottom: '1px solid rgba(15,18,53,.04)' }}>
                        <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: p.is_active ? 'rgba(5,150,105,.1)' : 'rgba(148,163,184,.12)', color: p.is_active ? 'var(--grn)' : '#64748B' }}>{p.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* SSO Info */}
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>SSO / Authentication</div>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: 14, boxShadow: 'var(--sh)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <svg width="20" height="20" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Microsoft Entra ID (Azure AD)</div>
              <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: 'rgba(5,150,105,.1)', color: 'var(--grn)' }}>Configured</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
              Microsoft SSO is configured via the backend auth service. Users can log in using their Microsoft work accounts directly from the login page.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
