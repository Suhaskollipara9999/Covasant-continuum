import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';

const RELEASES = [
  { v: 'v2.4', sp: 'Sprint 18', p: 'CAMS', f: 6, b: 14, s: 'Published' },
  { v: 'v2.3', sp: 'Sprint 17', p: 'CAMS', f: 4, b: 9, s: 'Published' },
  { v: 'v1.8', sp: 'Sprint 21', p: 'SalesPulze', f: 5, b: 7, s: 'Draft' },
  { v: 'v3.1', sp: 'Sprint 9', p: 'ARIIA', f: 3, b: 5, s: 'Pending Review' },
];

const WEBHOOKS = [
  { e: 'jira:version_released', d: 'Trigger on version release', on: true },
  { e: 'jira:sprint_closed', d: 'Trigger on sprint close', on: true },
  { e: 'jira:blocker_resolved', d: 'Log blocker resolutions', on: false },
];

export default function JiraPage() {
  const { showToast } = useAppStore();
  const [hooks, setHooks] = useState(WEBHOOKS);

  return (
    <div style={{ padding: '18px 20px' }} className="fade-up">
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -.4, marginBottom: 3 }}>JIRA Integration</div>
      <div style={{ fontSize: 12.5, color: 'var(--t2)', marginBottom: 16 }}>Auto-sync release artefacts from JIRA sprints into Continuum.</div>

      {/* Connected banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 8, background: 'rgba(5,150,105,.07)', border: '1.5px solid rgba(5,150,105,.18)', marginBottom: 14, fontSize: 12 }}>
        <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="none" stroke="#059669" strokeWidth="1.2" /><path d="M4.5 7l2 2 3-3" stroke="#059669" strokeWidth="1.2" fill="none" /></svg>
        <strong>Connected</strong> — jira.covasant.io
        <span style={{ color: 'var(--blue)', marginLeft: 8 }}>Next sync in 4h</span>
        <button onClick={() => showToast('Sync triggered…')} style={{ marginLeft: 'auto', padding: '4px 9px', borderRadius: 7, background: 'var(--cor)', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>↻ Sync Now</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Left: Releases */}
        <div>
          {RELEASES.map((r, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 9, padding: 12, marginBottom: 8, boxShadow: 'var(--sh)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--blue)', fontWeight: 700 }}>{r.p} {r.v}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>{r.sp}</div>
                </div>
                <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: r.s === 'Published' ? 'rgba(5,150,105,.1)' : r.s === 'Draft' ? 'rgba(148,163,184,.12)' : 'rgba(217,119,6,.1)', color: r.s === 'Published' ? 'var(--grn)' : r.s === 'Draft' ? '#64748B' : 'var(--amb)' }}>{r.s}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>✦ {r.f} features · ⬡ {r.b} fixes</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {r.s !== 'Published' && <button onClick={() => showToast('Publishing to Continuum…')} style={{ padding: '4px 9px', borderRadius: 7, background: 'var(--cor)', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Publish</button>}
                <button onClick={() => showToast('Opening draft…')} style={{ padding: '4px 9px', borderRadius: 7, background: 'transparent', border: '1.5px solid var(--bd)', color: 'var(--t2)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Edit Draft</button>
                <button onClick={() => showToast('Opening JIRA…')} style={{ padding: '4px 9px', borderRadius: 7, background: 'transparent', border: '1.5px solid var(--bd)', color: 'var(--t2)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>JIRA ↗</button>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Config */}
        <div>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: 14, boxShadow: 'var(--sh)', marginBottom: 12 }}>
            <div style={{ marginBottom: 11 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>JIRA Instance URL</label><input defaultValue="https://jira.covasant.io" style={{ width: '100%', padding: '7px 10px', background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 7, color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} /></div>
            <div style={{ marginBottom: 11 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>API Token</label><input type="password" defaultValue="●●●●●●●●●●●●" style={{ width: '100%', padding: '7px 10px', background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 7, color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} /></div>
            <div style={{ marginBottom: 11 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>Auto-publish to Continuum</label><select style={{ width: '100%', padding: '7px 10px', background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 7, color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}><option>No — require review</option><option>Yes — immediately</option></select></div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={() => showToast('Saved!')} style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--blue)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
              <button onClick={() => showToast('Webhook copied!')} style={{ padding: '7px 14px', borderRadius: 7, background: 'transparent', border: '1.5px solid var(--bd)', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Copy Webhook</button>
            </div>
          </div>

          <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: 14, boxShadow: 'var(--sh)' }}>
            {hooks.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--bd)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--blue)' }}>{w.e}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>{w.d}</div>
                </div>
                <button className={`tgl ${w.on ? 'on' : ''}`} onClick={() => setHooks(hooks.map((h, j) => j === i ? { ...h, on: !h.on } : h))} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
