import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';

const CAMPAIGNS = [
  { ic: 'RN', t: 'CAMS Release Notes', m: 'On publish · 284 recipients', on: true },
  { ic: 'NL', t: 'CAMS Monthly Newsletter', m: '1st of month · 142 recipients', on: true },
  { ic: 'RN', t: 'SalesPulze Release Notes', m: 'On publish · 68 recipients', on: true },
  { ic: 'AL', t: 'ARIIA Bulletins', m: 'On publish · 56 recipients', on: false },
  { ic: 'QD', t: 'Quarterly Roadmap Digest', m: 'End of quarter · 486 recipients', on: true },
];

export default function EmailPage() {
  const { showToast } = useAppStore();
  const [camps, setCamps] = useState(CAMPAIGNS);

  return (
    <div style={{ padding: '18px 20px' }} className="fade-up">
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -.4, marginBottom: 3 }}>Email Scheduler</div>
      <div style={{ fontSize: 12.5, color: 'var(--t2)', marginBottom: 16 }}>Automate Continuum notifications — release notes, newsletters, and artefact alerts.</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Left: Campaigns */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Campaigns</div>
            <button onClick={() => showToast('Campaign builder…')} style={{ padding: '4px 9px', borderRadius: 7, background: 'var(--blue)', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ New Campaign</button>
          </div>
          {camps.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 9, marginBottom: 8, boxShadow: 'var(--sh)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(37,99,235,.1)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{e.ic}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 1 }}>{e.t}</div>
                <div style={{ fontSize: 10.5, color: 'var(--t3)' }}>{e.m}</div>
              </div>
              <button className={`tgl ${e.on ? 'on' : ''}`} onClick={() => setCamps(camps.map((c, j) => j === i ? { ...c, on: !c.on } : c))} />
            </div>
          ))}
        </div>

        {/* Right: Forms */}
        <div>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: 14, boxShadow: 'var(--sh)', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>New Campaign</div>
            <div style={{ marginBottom: 11 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>Campaign Name</label><input placeholder="e.g. CAMS Release Notes — Acme" style={{ width: '100%', padding: '7px 10px', background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 7, color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} /></div>
            <div style={{ marginBottom: 11 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>Product</label><select style={{ width: '100%', padding: '7px 10px', background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 7, color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}><option>CAMS</option><option>SalesPulze</option><option>ARIIA</option><option>G2C</option></select></div>
            <div style={{ marginBottom: 11 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>Trigger</label><select style={{ width: '100%', padding: '7px 10px', background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 7, color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}><option>On Continuum publish</option><option>Monthly schedule</option><option>On JIRA release</option></select></div>
            <div style={{ marginBottom: 11 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>Recipients</label><select style={{ width: '100%', padding: '7px 10px', background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 7, color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}><option>All Internal</option><option>All Customers</option><option>CAMS-AcmeCorp</option><option>SP-RetailCo</option></select></div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={() => showToast('Campaign created!')} style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--cor)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Create</button>
              <button onClick={() => showToast('Test email sent!')} style={{ padding: '7px 14px', borderRadius: 7, background: 'transparent', border: '1.5px solid var(--bd)', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Send Test</button>
            </div>
          </div>

          <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, padding: 14, boxShadow: 'var(--sh)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>SMTP Settings</div>
            <div style={{ marginBottom: 11 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>Provider</label><select style={{ width: '100%', padding: '7px 10px', background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 7, color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}><option>SendGrid</option><option>Azure Communication</option><option>Outlook Exchange</option></select></div>
            <div style={{ marginBottom: 11 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>From Address</label><input defaultValue="continuum@covasant.io" style={{ width: '100%', padding: '7px 10px', background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 7, color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} /></div>
            <div style={{ marginBottom: 11 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>API Key</label><input type="password" defaultValue="●●●●●●●●●●●●" style={{ width: '100%', padding: '7px 10px', background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 7, color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} /></div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={() => showToast('SMTP saved!')} style={{ padding: '7px 14px', borderRadius: 7, background: 'var(--blue)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
              <button onClick={() => showToast('Test sent!')} style={{ padding: '7px 14px', borderRadius: 7, background: 'transparent', border: '1.5px solid var(--bd)', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Test Connection</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
