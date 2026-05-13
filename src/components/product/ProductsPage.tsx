/**
 * Covasant Continuum — Products Page
 * Lists all products. Admins/SuperAdmins see a Create Product button.
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';
import { fetchProducts, createProduct, deleteProduct } from '../../utils/api';

interface Product {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
  color: string;
  artefact_count: number;
  created_at: string;
}

export default function ProductsPage() {
  const { user } = useAuthStore();
  const { setView } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', full_name: '', description: '', color: '#2563EB' });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const loadProducts = async () => {
    try {
      const data = await fetchProducts();
      // fetchProducts now returns the array directly (or an array if it fails)
      setProducts(Array.isArray(data) ? data : data.items || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await createProduct(form);
      setShowCreate(false);
      setForm({ name: '', full_name: '', description: '', color: '#2563EB' });
      loadProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      loadProducts();
    } catch {}
  };

  return (
    <div style={{ padding: '30px 40px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--t1)', margin: 0 }}>Products</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>
            Browse product documentation, guides, and release notes.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: '10px 20px', background: '#2563EB', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(37,99,235,.25)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Product
          </button>
        )}
      </div>

      {/* Create Product Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,18,53,.4)', zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, padding: '28px 32px', width: 440,
            boxShadow: '0 20px 60px rgba(15,18,53,.18)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 18px', color: 'var(--t1)' }}>Create New Product</h3>
            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#DC2626', marginBottom: 14 }}>{error}</div>}
            <form onSubmit={handleCreate}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: 5 }}>Short Name (e.g. CAMS)</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E2E6F0'} />
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: 5 }}>Full Name</label>
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E2E6F0'} />
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: 5 }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 14, resize: 'vertical', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E2E6F0'} />
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: 5 }}>Color</label>
              <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                style={{ width: 50, height: 32, border: '1.5px solid #E2E6F0', borderRadius: 6, cursor: 'pointer', marginBottom: 18 }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '9px 18px', border: '1.5px solid #E2E6F0', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--t2)' }}>Cancel</button>
                <button type="submit" disabled={creating} style={{ padding: '9px 22px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {creating ? 'Creating…' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)' }}>Loading products…</div>
      ) : products.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 80, color: 'var(--t3)',
          background: 'var(--card)', borderRadius: 16, border: '1.5px dashed var(--bd)',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#B0B8D4" strokeWidth="1.5" style={{ marginBottom: 12 }}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <div style={{ fontSize: 15, fontWeight: 700 }}>No products yet</div>
          {isAdmin && <p style={{ fontSize: 12, marginTop: 6 }}>Click "Create Product" to get started.</p>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          {products.map(p => (
            <div
              key={p.id}
              onClick={() => {
                useAppStore.getState().setProd(p.id);
                setView('product');
              }}
              style={{
                background: 'var(--card)', border: '1.5px solid var(--bd)',
                borderRadius: 14, padding: '22px 24px', cursor: 'pointer',
                transition: 'border-color .2s, box-shadow .2s',
                position: 'relative',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = p.color; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${p.color}18`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${p.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{p.full_name}</div>
                </div>
              </div>
              {p.description && (
                <p style={{ fontSize: 12, color: 'var(--t3)', margin: '0 0 12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.description}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--t3)' }}>
                <span style={{ fontWeight: 700, color: p.color }}>{p.artefact_count}</span> documents
              </div>
              {isAdmin && (
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                  style={{
                    position: 'absolute', top: 12, right: 12,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#B0B8D4', padding: 4,
                  }}
                  title="Delete product"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
