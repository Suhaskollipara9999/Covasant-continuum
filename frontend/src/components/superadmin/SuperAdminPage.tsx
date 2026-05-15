/**
 * Covasant Continuum — Super Admin Console
 * AI providers configured via .env — removed from UI.
 * Platform settings persisted via API.
 */

import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import {
  fetchTenants, createTenant, updateTenant, deleteTenant,
  fetchAdmins, fetchUsers, promoteToAdmin, demoteAdmin,
  fetchPlatformSettings, updatePlatformSetting, fetchProducts,
} from '../../utils/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  is_active: boolean;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  last_login: string | null;
}

interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  label: string;
}

export default function SuperAdminPage() {
  const { showToast } = useAppStore();
  const [tab, setTab] = useState<'tenants' | 'users' | 'config'>('tenants');

  const PROVIDER_MODELS: Record<string, string[]> = {
    openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    gemini: ['gemini-1.5-pro', 'gemini-1.5-flash']
  };

  // ── Tenants state ──
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [newTenant, setNewTenant] = useState({ name: '', slug: '', domain: '', allowed_products: [] as string[] });
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [tenantError, setTenantError] = useState('');

  // ── Admins state ──
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [showPromote, setShowPromote] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');
  
  // ── Invite state ──
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('internal');

  // ── Platform settings ──
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // ── Load data based on active tab ──
  const loadTenants = async () => {
    setLoadingTenants(true);
    try { 
      const [t, p] = await Promise.all([fetchTenants(), fetchProducts()]);
      setTenants(t);
      setProducts(Array.isArray(p) ? p : p.items || []);
    } catch {}
    setLoadingTenants(false);
  };
  const loadAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const [a, u] = await Promise.all([fetchAdmins(), fetchUsers()]);
      setAdmins(a);
      setAllUsers(u);
    } catch {}
    setLoadingAdmins(false);
  };
  const loadSettings = async () => {
    setLoadingSettings(true);
    try { setSettings(await fetchPlatformSettings()); } catch {}
    setLoadingSettings(false);
  };

  useEffect(() => {
    if (tab === 'tenants') loadTenants();
    if (tab === 'users') loadAdmins();
    if (tab === 'config') loadSettings();
  }, [tab]);

  // ── Handlers: Tenants ──
  const handleCreateOrUpdateTenant = async () => {
    setTenantError('');
    if (!newTenant.name || !newTenant.slug) { setTenantError('Name and slug are required'); return; }
    try {
      if (newTenant.id) {
        await updateTenant(newTenant.id, { name: newTenant.name, slug: newTenant.slug, domain: newTenant.domain || undefined, allowed_products: newTenant.allowed_products });
        showToast('Tenant updated!');
      } else {
        await createTenant({ name: newTenant.name, slug: newTenant.slug, domain: newTenant.domain || undefined, allowed_products: newTenant.allowed_products });
        showToast('Tenant created!');
      }
      setNewTenant({ name: '', slug: '', domain: '', allowed_products: [] });
      loadTenants();
    } catch (e: any) { setTenantError(e.message); }
  };
  
  const handleEditTenant = (t: Tenant) => {
    setNewTenant({
      id: t.id,
      name: t.name,
      slug: t.slug,
      domain: t.domain || '',
      allowed_products: Array.isArray(t.settings?.allowed_products) ? t.settings.allowed_products : []
    });
  };

  const handleDeleteTenant = async (id: string) => {
    if (!confirm('Delete this tenant?')) return;
    try { await deleteTenant(id); loadTenants(); showToast('Tenant deleted'); } catch (e: any) { showToast(e.message); }
  };

  // ── Handlers: Admins ──
  const handlePromote = async (userId: string) => {
    try { await promoteToAdmin(userId); showToast('User promoted to Admin!'); setShowPromote(false); loadAdmins(); } catch (e: any) { showToast(e.message); }
  };

  const handleDemote = async (userId: string) => {
    if (!confirm('Demote this admin back to internal user?')) return;
    try { await demoteAdmin(userId); showToast('Admin demoted'); loadAdmins(); } catch (e: any) { showToast(e.message); }
  };

  const handleInviteSubmit = () => {
    if (!inviteEmail) return;
    showToast(`Invite sent to ${inviteEmail}`);
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('internal');
  };

  // ── Handlers: Platform settings ──
  const handleToggle = async (s: PlatformSetting) => {
    const newVal = s.value === 'true' ? 'false' : 'true';
    // Optimistic update
    setSettings(prev => prev.map(x => x.key === s.key ? { ...x, value: newVal } : x));
    try {
      await updatePlatformSetting(s.key, newVal);
      showToast(`${s.label} ${newVal === 'true' ? 'enabled' : 'disabled'}`);
    } catch (e: any) {
      // Revert on error
      setSettings(prev => prev.map(x => x.key === s.key ? { ...x, value: s.value } : x));
      showToast(e.message);
    }
  };

  const handleUpdateSettingValue = async (key: string, value: string) => {
    setSettings(prev => prev.map(x => x.key === key ? { ...x, value } : x));
    try {
      await updatePlatformSetting(key, value);
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const formatLastLogin = (s: string | null) => {
    if (!s) return 'Never';
    const d = new Date(s);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString();
  };

  const tabs = [
    { key: 'tenants', label: '🏢 Tenants' },
    { key: 'users', label: '👤 Users' },
    { key: 'config', label: '⚙ Platform' },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', background: 'var(--c2)',
    border: '1.5px solid var(--bd)', borderRadius: 7, color: 'var(--t1)',
    fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };

  const promotableUsers = allUsers.filter(u => u.role !== 'admin' && u.role !== 'superadmin');

  return (
    <div style={{ padding: '18px 20px' }} className="fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -.4 }}>Super Admin Console</div>
        <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 9.5, fontWeight: 700, background: 'rgba(124,58,237,.1)', color: 'var(--pur)', border: '1.5px solid rgba(124,58,237,.18)' }}>SUPERADMIN</span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--t2)', marginBottom: 16 }}>Manage tenants, admin users, and platform settings. AI providers are configured via backend .env.</div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)', marginBottom: 18 }}>
        {tabs.map(t => (
          <a key={t.key} onClick={() => setTab(t.key as any)} style={{ padding: '8px 16px', fontSize: 12.5, fontWeight: tab === t.key ? 700 : 600, cursor: 'pointer', color: tab === t.key ? 'var(--pur)' : 'var(--t3)', textDecoration: 'none', position: 'relative' }}>
            {t.label}
            {tab === t.key && <span style={{ position: 'absolute', bottom: -1, left: 8, right: 8, height: 2, background: 'var(--pur)', borderRadius: '2px 2px 0 0' }} />}
          </a>
        ))}
      </div>

      {/* ═══ Tenants ═══ */}
      {tab === 'tenants' && (
        <div className="fade-up">
          {loadingTenants ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>Loading…</div> : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                {tenants.length === 0 && <div style={{ background: 'var(--card)', border: '1.5px dashed var(--bd)', borderRadius: 10, padding: 30, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>No tenants yet.</div>}
                {tenants.map(t => (
                  <div key={t.id} style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: 14, marginBottom: 10, boxShadow: 'var(--sh)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{t.name}</div>
                      <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: t.is_active ? 'rgba(5,150,105,.1)' : 'rgba(148,163,184,.12)', color: t.is_active ? 'var(--grn)' : '#64748B' }}>{t.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Slug: <span style={{ fontFamily: 'monospace', color: 'var(--blue)' }}>{t.slug}</span></div>
                    {t.domain && <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>Domain: {t.domain}</div>}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleEditTenant(t)} style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--c2)', border: '1.5px solid var(--bd)', color: 'var(--t2)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                      <button onClick={() => handleDeleteTenant(t.id)} style={{ padding: '5px 10px', borderRadius: 6, background: 'transparent', border: '1.5px solid rgba(239,68,68,.2)', color: '#DC2626', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: 14, boxShadow: 'var(--sh)', height: 'fit-content' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{newTenant.id ? 'Edit Tenant' : 'Create Tenant'}</div>
                  {newTenant.id && <button onClick={() => setNewTenant({ name: '', slug: '', domain: '', allowed_products: [] })} style={{ background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>}
                </div>
                {tenantError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#DC2626', marginBottom: 10 }}>{tenantError}</div>}
                <div style={{ marginBottom: 10 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>Tenant Name</label><input placeholder="e.g. Acme Corporation" value={newTenant.name} onChange={e => setNewTenant({ ...newTenant, name: e.target.value })} style={inputStyle} /></div>
                <div style={{ marginBottom: 10 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>Slug</label><input placeholder="e.g. acme-corp" value={newTenant.slug} onChange={e => setNewTenant({ ...newTenant, slug: e.target.value })} style={inputStyle} /></div>
                <div style={{ marginBottom: 10 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>Domain</label><input placeholder="e.g. acmecorp.com" value={newTenant.domain} onChange={e => setNewTenant({ ...newTenant, domain: e.target.value })} style={inputStyle} /></div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>Allowed Products</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto', background: 'var(--c2)', padding: 10, borderRadius: 7, border: '1.5px solid var(--bd)' }}>
                    {products.length === 0 ? <div style={{ fontSize: 11, color: 'var(--t3)' }}>No products available</div> : products.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={newTenant.allowed_products.includes(p.id)} onChange={e => {
                          if (e.target.checked) setNewTenant({ ...newTenant, allowed_products: [...newTenant.allowed_products, p.id] });
                          else setNewTenant({ ...newTenant, allowed_products: newTenant.allowed_products.filter(id => id !== p.id) });
                        }} />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
                <button onClick={handleCreateOrUpdateTenant} style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--pur)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{newTenant.id ? 'Save Changes' : 'Create Tenant'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Users ═══ */}
      {tab === 'users' && (
        <div className="fade-up">
          {loadingAdmins ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>Loading…</div> : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <input 
                  type="search" 
                  placeholder="Search users by name or email..." 
                  value={usersSearch} 
                  onChange={e => setUsersSearch(e.target.value)} 
                  style={{ ...inputStyle, width: 300, background: 'var(--card)' }} 
                />
              </div>
              <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--sh)' }}>
                <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 800 }}>
                  All Users
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowInviteModal(true)} style={{ padding: '4px 9px', borderRadius: 7, background: 'var(--blue)', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Invite User</button>
                    <button onClick={() => setShowPromote(true)} style={{ padding: '4px 9px', borderRadius: 7, background: 'var(--pur)', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Promote to Admin</button>
                  </div>
                </div>
                {allUsers.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>No users found.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead><tr>{['Name', 'Email', 'Role', 'Last Active', ''].map(h => <th key={h} style={{ padding: '7px 11px', borderBottom: '1px solid var(--bd)', color: 'var(--t3)', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: .8, textAlign: 'left' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {allUsers.filter(u => u.full_name.toLowerCase().includes(usersSearch.toLowerCase()) || u.email.toLowerCase().includes(usersSearch.toLowerCase())).map(a => (
                        <tr key={a.id}>
                          <td style={{ padding: '7px 11px', borderBottom: '1px solid rgba(15,18,53,.04)', fontWeight: 600 }}>{a.full_name}</td>
                          <td style={{ padding: '7px 11px', borderBottom: '1px solid rgba(15,18,53,.04)', color: 'var(--t2)' }}>{a.email}</td>
                          <td style={{ padding: '7px 11px', borderBottom: '1px solid rgba(15,18,53,.04)' }}>
                            <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'capitalize', background: a.role === 'superadmin' ? 'rgba(124,58,237,.1)' : a.role === 'admin' ? 'rgba(5,150,105,.1)' : 'rgba(37,99,235,.1)', color: a.role === 'superadmin' ? 'var(--pur)' : a.role === 'admin' ? 'var(--grn)' : 'var(--blue)' }}>{a.role}</span>
                          </td>
                          <td style={{ padding: '7px 11px', borderBottom: '1px solid rgba(15,18,53,.04)', color: 'var(--t2)' }}>{formatLastLogin(a.last_login)}</td>
                          <td style={{ padding: '7px 11px', borderBottom: '1px solid rgba(15,18,53,.04)' }}>
                            {(a.role === 'admin') && <button onClick={() => handleDemote(a.id)} style={{ padding: '4px 9px', borderRadius: 7, background: 'transparent', border: '1.5px solid var(--bd)', color: 'var(--t2)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Demote</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {showPromote && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,18,53,.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowPromote(false)}>
                  <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', width: 440, boxShadow: '0 20px 60px rgba(15,18,53,.18)', maxHeight: '70vh', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px', color: 'var(--t1)' }}>Promote User to Admin</h3>
                    {promotableUsers.length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>No eligible users to promote.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {promotableUsers.map(u => (
                          <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--c2)', borderRadius: 8, border: '1.5px solid var(--bd)' }}>
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{u.full_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--t3)' }}>{u.email} — <span style={{ textTransform: 'capitalize' }}>{u.role}</span></div>
                            </div>
                            <button onClick={() => handlePromote(u.id)} style={{ padding: '5px 12px', borderRadius: 6, background: 'var(--pur)', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Promote</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ textAlign: 'right', marginTop: 14 }}>
                      <button onClick={() => setShowPromote(false)} style={{ padding: '7px 16px', border: '1.5px solid var(--bd)', borderRadius: 8, background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--t2)' }}>Close</button>
                    </div>
                  </div>
                </div>
              )}

              {showInviteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'var(--card)', borderRadius: 12, padding: 24, width: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Invite User</div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>Email Address</label>
                      <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="e.g. jane@company.com" style={{ width: '100%', padding: '8px 12px', background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 8, color: 'var(--t1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>Role</label>
                      <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 8, color: 'var(--t1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                        <option value="internal">Internal</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                        <option value="customer">Customer</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button onClick={() => setShowInviteModal(false)} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', border: '1.5px solid var(--bd)', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                      <button onClick={handleInviteSubmit} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--blue)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Send Invite</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ Platform Config ═══ */}
      {tab === 'config' && (
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: 14, boxShadow: 'var(--sh)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Platform Settings</div>
            {loadingSettings ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Loading…</div>
            ) : settings.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>No settings configured.</div>
            ) : (
              <>
                {(() => {
                  const storedProvider = settings.find(s => s.key === 'active_ai_provider')?.value || 'openai';
                  const currentProvider = storedProvider.toLowerCase().trim();
                  const currentModel = settings.find(s => s.key === 'active_ai_model')?.value || '';
                  const availableModels = PROVIDER_MODELS[currentProvider] || PROVIDER_MODELS['openai'];
                  console.log("DEBUG: storedProvider=", storedProvider, "currentProvider=", currentProvider, "currentModel=", currentModel, "availableModels=", availableModels);
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--bd)' }}>
                        <span style={{ fontSize: 12.5, color: 'var(--t2)', fontWeight: 600 }}>Active AI Provider</span>
                        <select 
                          value={currentProvider}
                          onChange={e => {
                            const newProvider = e.target.value;
                            const models = PROVIDER_MODELS[newProvider] || [];
                            const firstModel = models.length > 0 ? models[0] : '';
                            // Update both settings at once
                            setSettings(prev => prev.map(x => {
                              if (x.key === 'active_ai_provider') return { ...x, value: newProvider };
                              if (x.key === 'active_ai_model') return { ...x, value: firstModel };
                              return x;
                            }));
                            updatePlatformSetting('active_ai_provider', newProvider).catch(() => {});
                            updatePlatformSetting('active_ai_model', firstModel).catch(() => {});
                          }}
                          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--bd)', background: 'var(--card)', fontSize: 12, outline: 'none' }}
                        >
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="gemini">Google Gemini</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--bd)' }}>
                        <span style={{ fontSize: 12.5, color: 'var(--t2)', fontWeight: 600 }}>Active AI Model</span>
                        <select 
                          value={availableModels.includes(currentModel) ? currentModel : (availableModels[0] || '')}
                          onChange={e => handleUpdateSettingValue('active_ai_model', e.target.value)}
                          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--bd)', background: 'var(--card)', fontSize: 12, outline: 'none', minWidth: 220, color: 'var(--t1)' }}
                        >
                          {availableModels.length > 0 ? availableModels.map(m => (
                            <option key={m} value={m}>{m}</option>
                          )) : (
                            <option value="">No models found</option>
                          )}
                        </select>
                      </div>
                    </>
                  );
                })()}
                {settings.filter(s => s.key !== 'active_ai_provider' && s.key !== 'active_ai_model').map(s => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--bd)' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>{s.label}</span>
                    <button className={`tgl ${s.value === 'true' ? 'on' : ''}`} onClick={() => handleToggle(s)} />
                  </div>
                ))}
              </>
            )}
          </div>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: 14, boxShadow: 'var(--sh)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>System Info</div>
            {[
              ['Platform', 'Covasant Continuum v0.1.0'],
              ['Backend', 'FastAPI + PostgreSQL'],
              ['AI Engine', 'Configured via .env'],
              ['Storage', 'Local (cloud-ready)'],
              ['Tenants', `${tenants.length} configured`],
              ['Admins', `${admins.length} active`],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--bd)', fontSize: 12 }}>
                <span style={{ color: 'var(--t3)', fontWeight: 600 }}>{k}</span>
                <span style={{ color: 'var(--t1)', fontWeight: 700 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(37,99,235,.05)', borderRadius: 8, border: '1px solid rgba(37,99,235,.1)' }}>
              <div style={{ fontSize: 10.5, color: 'var(--blue)', fontWeight: 700, marginBottom: 4 }}>💡 AI Provider Configuration</div>
              <div style={{ fontSize: 10.5, color: 'var(--t3)', lineHeight: 1.5 }}>
                AI model API keys are configured securely in <code style={{ background: 'var(--c2)', padding: '1px 4px', borderRadius: 3 }}>backend/.env</code> file. 
                Set <code style={{ background: 'var(--c2)', padding: '1px 4px', borderRadius: 3 }}>ANTHROPIC_API_KEY</code>, <code style={{ background: 'var(--c2)', padding: '1px 4px', borderRadius: 3 }}>OPENAI_API_KEY</code>, or <code style={{ background: 'var(--c2)', padding: '1px 4px', borderRadius: 3 }}>GOOGLE_AI_API_KEY</code> to enable AI features.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
