import { useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import TenantsTab from './TenantsTab';
import LogsTab from './LogsTab';
import UsersTab from './UsersTab';
import type { AdminTab } from '../../types';

const TABS: { key: AdminTab; label: string }[] = [
  { key: 'tenants', label: 'Tenants' },
  { key: 'logs', label: 'Access Logs' },
  { key: 'users', label: 'Users' },
];

export default function AdminPage() {
  const { adminTab, setAdminTab } = useAppStore();

  useEffect(() => {
    if (!TABS.some(t => t.key === adminTab)) {
      setAdminTab('tenants');
    }
  }, [adminTab, setAdminTab]);

  return (
    <div style={{ padding: '18px 20px' }} className="fade-up">
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -.4, marginBottom: 3 }}>Admin</div>
      <div style={{ fontSize: 12.5, color: 'var(--t2)', marginBottom: 16 }}>Manage tenants, view access logs, and control users.</div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)', marginBottom: 18 }}>
        {TABS.map(tab => (
          <a key={tab.key} onClick={() => setAdminTab(tab.key)} style={{ padding: '8px 16px', fontSize: 12.5, fontWeight: adminTab === tab.key ? 700 : 600, cursor: 'pointer', color: adminTab === tab.key ? 'var(--blue)' : 'var(--t3)', textDecoration: 'none', position: 'relative', userSelect: 'none' }}>
            {tab.label}
            {adminTab === tab.key && <span style={{ position: 'absolute', bottom: -1, left: 8, right: 8, height: 2, background: 'var(--blue)', borderRadius: '2px 2px 0 0' }} />}
          </a>
        ))}
      </div>
      <div className="fade-up">
        {adminTab === 'tenants' && <TenantsTab />}
        {adminTab === 'logs' && <LogsTab />}
        {adminTab === 'users' && <UsersTab />}
      </div>
    </div>
  );
}
