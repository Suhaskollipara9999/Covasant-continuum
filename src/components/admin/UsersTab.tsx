import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { fetchUsers } from '../../utils/api';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  last_login: string | null;
}

export default function UsersTab() {
  const { showToast } = useAppStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('internal');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (e: any) {
      showToast(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleInviteSubmit = () => {
    if (!inviteEmail) return;
    showToast(`Invite sent to ${inviteEmail}`);
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('internal');
  };

  return (
    <div className="fade-up">
      <div style={{ background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--sh)' }}>
        <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 800 }}>
          User Management
          <button onClick={() => setShowInviteModal(true)} style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--blue)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Invite User</button>
        </div>
        
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>Loading…</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>No users found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['User', 'Role', 'Last Active'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', borderBottom: '1px solid var(--bd)', color: 'var(--t3)', fontWeight: 700, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: .8, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--bd)' }}>
                  <td style={{ padding: '9px 14px', color: 'var(--t2)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 12 }}>{u.full_name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{ 
                      padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, display: 'inline-flex', textTransform: 'capitalize',
                      background: u.role === 'admin' || u.role === 'superadmin' ? 'rgba(5,150,105,.1)' : u.role === 'internal' ? 'rgba(37,99,235,.1)' : 'rgba(232,81,26,.1)', 
                      color: u.role === 'admin' || u.role === 'superadmin' ? 'var(--grn)' : u.role === 'internal' ? 'var(--blue)' : 'var(--cor)' 
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', color: 'var(--t2)' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
    </div>
  );
}
