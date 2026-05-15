/* ══════════════════════════════════════════
   HomePage — Main landing view
   Now fetches real data from the API.
   ══════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { fetchProducts, fetchArtefacts } from '../../utils/api';

interface Product {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
  color: string;
  artefact_count: number;
}

const TYPE_CONFIG = [
  { key: 'Release Notes', abbr: 'RN', label: 'Release Notes', sub: 'Sprint updates', color: '#059669' },
  { key: 'Roadmap', abbr: 'RM', label: 'Roadmap', sub: 'Future plans', color: '#2563EB' },
  { key: 'Product Docs', abbr: 'PD', label: 'Product Docs', sub: 'Core manuals', color: '#7C3AED' },
  { key: 'Architecture', abbr: 'AR', label: 'Architecture', sub: 'System design', color: '#D97706' },
  { key: 'Design System', abbr: 'DS', label: 'Design System', sub: 'UI/UX guidelines', color: '#DB2777' },
  { key: 'Presentations', abbr: 'PR', label: 'Presentations', sub: 'Slide decks', color: '#059669' },
  { key: 'Market Analysis', abbr: 'MA', label: 'Market Analysis', sub: 'Industry trends', color: '#2563EB' },
  { key: 'Competition Analysis', abbr: 'CA', label: 'Competition Analysis', sub: 'Competitor data', color: '#7C3AED' },
  { key: 'Installation Guides', abbr: 'IG', label: 'Installation Guides', sub: 'Setup docs', color: '#D97706' },
  { key: 'Newsletter', abbr: 'NL', label: 'Newsletter', sub: 'Internal news', color: '#DB2777' },
  { key: 'Videos', abbr: 'VD', label: 'Videos', sub: 'Platform demos', color: '#059669' },
  { key: 'Usecases', abbr: 'UC', label: 'Usecases', sub: 'Customer stories', color: '#2563EB' },
  { key: 'Flyers', abbr: 'FL', label: 'Flyers', sub: 'Marketing material', color: '#7C3AED' },
  { key: 'Security Report', abbr: 'SR', label: 'Security Report', sub: 'Audits & compliance', color: '#D97706' },
  { key: 'AI Act', abbr: 'AI', label: 'AI Act', sub: 'Regulatory docs', color: '#DB2777' },
  { key: 'Training', abbr: 'TR', label: 'Training', sub: 'Learning paths', color: '#059669' },
  { key: 'Troubleshooting Guide', abbr: 'TG', label: 'Troubleshooting Guide', sub: 'Fixes & FAQs', color: '#2563EB' },
  { key: 'Error Code Manual', abbr: 'EM', label: 'Error Code Manual', sub: 'Error details', color: '#7C3AED' },
];

export default function HomePage() {
  const { setView } = useAppStore();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});

  const [typeScrollLeft, setTypeScrollLeft] = useState(false);
  const [typeScrollRight, setTypeScrollRight] = useState(true);

  const handleTypeScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    setTypeScrollLeft(scrollLeft > 0);
    setTypeScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2);
  };

  useEffect(() => {
    fetchProducts()
      .then(data => setProducts(Array.isArray(data) ? data : data.items || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));

    // Fetch artefact counts per type
    fetchArtefacts(undefined, 100)
      .then(data => {
        const items = data.items || data || [];
        const counts: Record<string, number> = {};
        TYPE_CONFIG.forEach(t => counts[t.key] = 0);
        items.forEach((a: any) => {
          if (counts[a.artefact_type] !== undefined) counts[a.artefact_type]++;
          else counts[a.artefact_type] = 1;
        });
        setTypeCounts(counts);
      })
      .catch(() => setTypeCounts({}));
  }, []);

  const totalDocs = products.reduce((sum, p) => sum + p.artefact_count, 0);

  return (
    <div style={{ padding: 0 }} className="fade-up">
      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(170deg,#C5D3FA 0%,#D8E0FB 40%,var(--bg) 100%)',
          padding: '28px 28px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Dot pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(37,99,235,.1) 1px,transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.7,
            textTransform: 'uppercase',
            color: 'var(--blue)',
            background: 'rgba(37,99,235,.1)',
            border: '1.5px solid rgba(37,99,235,.18)',
            padding: '3px 10px',
            borderRadius: 20,
            marginBottom: 10,
            position: 'relative',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--blue)',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }}
          />
          Welcome, {user?.full_name || 'User'}
        </div>

        {/* Heading */}
        <div
          style={{
            fontSize: 23,
            fontWeight: 800,
            letterSpacing: -0.6,
            lineHeight: 1.2,
            marginBottom: 7,
            position: 'relative',
          }}
        >
          Your product knowledge,
          <br />
          <span style={{ color: 'var(--blue)' }}>always</span>{' '}
          <span style={{ color: 'var(--pur)' }}>current,</span>{' '}
          <span style={{ color: 'var(--cor)' }}>always on.</span>
        </div>

        <div
          style={{
            fontSize: 13,
            color: 'var(--t2)',
            lineHeight: 1.65,
            marginBottom: 16,
            maxWidth: 490,
            position: 'relative',
          }}
        >
          Covasant Continuum is the ever-evolving repository of every release note, guide, video, and document
          across all Covasant products. Knowledge that compounds — sprint after sprint.
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
          <a
            onClick={() => setView('products' as any)}
            style={{
              padding: '7px 15px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: 'var(--cor)',
              color: '#fff',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              transition: 'all .18s',
            }}
          >
            Browse Products →
          </a>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--bd)', marginTop: 16, position: 'relative' }}>
          {[
            { n: products.length, l: 'Products' },
            { n: totalDocs, l: 'Documents' },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: '12px 0',
                textAlign: 'center',
                borderRight: i < 1 ? '1px solid var(--bd)' : 'none',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue)', letterSpacing: -0.5 }}>
                {loading ? '—' : s.n}
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  color: 'var(--t3)',
                  marginTop: 2,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontWeight: 700,
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Browse by product */}
      <div style={{ padding: '22px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3 }}>Browse by product</div>
          <a
            onClick={() => setView('products' as any)}
            style={{ fontSize: 11.5, color: 'var(--blue)', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}
          >
            View all →
          </a>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Loading products…</div>
        ) : products.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 40, color: 'var(--t3)',
            background: 'var(--card)', borderRadius: 12, border: '1.5px dashed var(--bd)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No products yet</div>
            <p style={{ fontSize: 12, marginTop: 4 }}>Go to the Products page to create your first product.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  useAppStore.getState().setProd(p.id);
                  setView('product' as any);
                }}
                style={{
                  background: 'var(--card)',
                  borderRadius: 12,
                  border: '1.5px solid var(--bd)',
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'all .22s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = p.color;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${p.color}18`;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                  (e.currentTarget as HTMLElement).style.transform = '';
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: p.color }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      flexShrink: 0,
                      background: `${p.color}15`,
                      color: p.color,
                    }}
                  >
                    {p.name.substring(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.3, color: p.color }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{p.full_name}</div>
                  </div>
                </div>
                {p.description && (
                  <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 12 }}>{p.description}</div>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>
                    <b style={{ color: 'var(--t1)' }}>{p.artefact_count}</b> documents
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Browse by type */}
      <div style={{ padding: '0 28px 28px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3, marginBottom: 14 }}>Browse by type</div>
        <div style={{ position: 'relative' }}>
          {typeScrollLeft && (
            <button
              onClick={() => document.getElementById('type-scroll')?.scrollBy({ left: -300, behavior: 'smooth' })}
              style={{ position: 'absolute', left: -14, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 32, height: 32, borderRadius: '50%', background: '#fff', border: '1.5px solid var(--bd)', boxShadow: '0 4px 12px rgba(15,18,53,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)' }}
            ><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
          )}
          {typeScrollRight && (
            <button
              onClick={() => document.getElementById('type-scroll')?.scrollBy({ left: 300, behavior: 'smooth' })}
              style={{ position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 32, height: 32, borderRadius: '50%', background: '#fff', border: '1.5px solid var(--bd)', boxShadow: '0 4px 12px rgba(15,18,53,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)' }}
            ><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
          )}
          <div
            id="type-scroll"
            onScroll={handleTypeScroll}
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              background: 'linear-gradient(135deg, rgba(197,211,250,.25) 0%, rgba(216,224,251,.15) 100%)',
              borderRadius: 14,
              padding: 14,
              border: '1.5px solid var(--bd)',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <style>{`#type-scroll::-webkit-scrollbar { display: none; }`}</style>
            {TYPE_CONFIG.map(t => (
              <div
                key={t.key}
                onClick={() => {
                  useAppStore.getState().setFilterType(t.key);
                  setView('browse-type' as any);
                }}
                style={{
                  minWidth: 160,
                  flexShrink: 0,
                  background: 'var(--card)',
                  borderRadius: 10,
                  padding: '18px 12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: '1.5px solid var(--bd)',
                  transition: 'all .2s',
                }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = t.color;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 14px ${t.color}20`;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '';
                (e.currentTarget as HTMLElement).style.boxShadow = '';
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `${t.color}15`, color: t.color,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, marginBottom: 8,
              }}>
                {t.abbr}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t1)', marginBottom: 2 }}>{t.label}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)' }}>{t.sub}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.color, marginTop: 6 }}>
                {typeCounts[t.key] || 0} {(typeCounts[t.key] || 0) === 1 ? 'doc' : 'docs'}
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}
