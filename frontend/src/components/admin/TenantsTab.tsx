import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { fetchTenants, createTenant, updateTenant, deleteTenant, fetchProducts } from '../../utils/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  is_active: boolean;
  settings: { allowed_products?: string[] } | null;
  created_at: string;
}

export default function TenantsTab() {
  const { showToast } = useAppStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [newTenant, setNewTenant] = useState({ name: '', slug: '', domain: '', allowed_products: [] as string[] });
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [tenantError, setTenantError] = useState('');

  const loadTenants = async () => {
    setLoadingTenants(true);
    try {
      const [t, p] = await Promise.all([fetchTenants(), fetchProducts()]);
      setTenants(t);
      setProducts(Array.isArray(p) ? p : p.items || []);
    } catch {}
    setLoadingTenants(false);
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleCreateOrUpdateTenant = async () => {
    setTenantError('');
    if (!newTenant.name || !newTenant.slug) { setTenantError('Name and slug are required'); return; }
    try {
      if ((newTenant as any).id) {
        await updateTenant((newTenant as any).id, { name: newTenant.name, slug: newTenant.slug, domain: newTenant.domain || undefined, allowed_products: newTenant.allowed_products });
        showToast('Tenant updated!');
      } else {
        await createTenant({ name: newTenant.name, slug: newTenant.slug, domain: newTenant.domain || undefined, allowed_products: newTenant.allowed_products });
        showToast('Tenant created!');
      }
      setNewTenant({ name: '', slug: '', domain: '', allowed_products: [] });
      loadTenants();
    } catch (e: any) {
      setTenantError(e.message);
    }
  };

  const handleEditTenant = (t: Tenant) => {
    setNewTenant({
      ...(t as any),
      allowed_products: t.settings?.allowed_products || []
    });
    setTenantError('');
  };

  const handleDeleteTenant = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tenant?')) return;
    try {
      await deleteTenant(id);
      showToast('Tenant deleted');
      loadTenants();
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', background: 'var(--c2)',
    border: '1.5px solid var(--bd)', borderRadius: 7, color: 'var(--t1)',
    fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };

  return (
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
              <div style={{ fontSize: 13, fontWeight: 800 }}>{(newTenant as any).id ? 'Edit Tenant' : 'Create Tenant'}</div>
              {(newTenant as any).id && <button onClick={() => setNewTenant({ name: '', slug: '', domain: '', allowed_products: [] })} style={{ background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>}
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
            <button onClick={handleCreateOrUpdateTenant} style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--pur)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{(newTenant as any).id ? 'Save Changes' : 'Create Tenant'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
