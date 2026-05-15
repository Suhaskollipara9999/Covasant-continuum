import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { fetchLogs } from '../../utils/api';

interface AccessLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  created_at: string;
}

export default function LogsTab() {
  const { showToast } = useAppStore();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchLogs();
      setLogs(data);
    } catch (e: any) {
      showToast(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleExport = () => {
    showToast('Exporting CSV…');
    // Implementation for CSV export
  };

  return (
    <div className="fade-up">
      <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--sh)' }}>
        <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 800 }}>
          Access Logs — Today
          <button onClick={handleExport} style={{ padding: '4px 9px', borderRadius: 7, background: 'transparent', border: '1.5px solid var(--bd)', color: 'var(--t2)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>↓ Export</button>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>No access logs found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['Time', 'User ID', 'Resource', 'Resource ID', 'Action'].map(h => (
                  <th key={h} style={{ padding: '7px 11px', borderBottom: '1px solid var(--bd)', color: 'var(--t3)', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: .8, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ padding: '7px 11px', borderBottom: '1px solid rgba(15,18,53,.04)', fontFamily: 'monospace', color: 'var(--t2)' }}>{new Date(l.created_at).toLocaleString()}</td>
                  <td style={{ padding: '7px 11px', borderBottom: '1px solid rgba(15,18,53,.04)', color: 'var(--t2)' }}>{l.user_id}</td>
                  <td style={{ padding: '7px 11px', borderBottom: '1px solid rgba(15,18,53,.04)', color: 'var(--t2)' }}>{l.resource_type}</td>
                  <td style={{ padding: '7px 11px', borderBottom: '1px solid rgba(15,18,53,.04)', color: 'var(--t2)' }}>{l.resource_id}</td>
                  <td style={{ padding: '7px 11px', borderBottom: '1px solid rgba(15,18,53,.04)' }}>
                    <span style={{ 
                      padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, display: 'inline-flex', textTransform: 'capitalize',
                      background: l.action === 'download' || l.action === 'delete' ? 'rgba(232,81,26,.1)' : l.action === 'create' || l.action === 'upload' ? 'rgba(5,150,105,.1)' : 'rgba(37,99,235,.1)', 
                      color: l.action === 'download' || l.action === 'delete' ? 'var(--cor)' : l.action === 'create' || l.action === 'upload' ? 'var(--grn)' : 'var(--blue)' 
                    }}>
                      {l.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
