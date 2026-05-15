import { useAppStore } from '../../stores/appStore';
import { TYPE_CONFIG } from '../../data';
import { formatDate } from '../../utils';

export default function DetailPage() {
  const { artefacts, detailId, setProd, setView, showToast } = useAppStore();
  const a = artefacts.find(x => x.id === detailId);
  if (!a) return null;
  const tc = TYPE_CONFIG[a.t] || { lbl: '?', bg: 'rgba(37,99,235,.1)', c: '#2563EB' };
  const isV = a.t === 'video';

  return (
    <div style={{ padding: '18px 20px' }} className="fade-up">
      <a onClick={() => { setProd(a.p); setView('product'); }} style={{ padding: '4px 9px', borderRadius: 7, background: 'transparent', border: '1.5px solid var(--bd)', color: 'var(--t2)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginBottom: 14, textDecoration: 'none' }}>← Back to {a.p}</a>

      <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: 14, boxShadow: 'var(--sh)' }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 11, alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--bd)', marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 9, background: tc.bg, color: tc.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{tc.lbl}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -.3, color: 'var(--t1)' }}>{a.tt}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{a.p} · {a.v || 'N/A'} · {formatDate(a.dt)}</div>
          </div>
        </div>

        {/* Content */}
        {isV ? (
          <div style={{ aspectRatio: '16/9', background: '#000', borderRadius: 9, overflow: 'hidden', marginBottom: 14 }}>
            {a.vid ? (
              <iframe src={a.vid} width="100%" height="100%" style={{ border: 'none' }} allowFullScreen />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#fff' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>▶</div>
                <div>Configure video URL in Settings</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 8, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>Document Preview</div>
            <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.8 }}>
              <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--t1)', fontWeight: 700 }}>1. Overview</strong><br />{a.tt} — guidance for {a.p} {a.v || ''}.</p>
              <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--t1)', fontWeight: 700 }}>2. Key Content</strong><br />{a.ds}</p>
              <p style={{ color: 'var(--t3)', fontSize: 11.5, fontStyle: 'italic' }}>Download for the full document.</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => showToast('Download started')} style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--cor)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>↓ Download PDF</button>
          <button onClick={() => showToast('Link copied')} style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--blue)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>⇗ Copy Link</button>
        </div>
      </div>
    </div>
  );
}
