/* ══════════════════════════════════════════
   Toast — Notification popup
   ══════════════════════════════════════════ */

import { useAppStore } from '../../stores/appStore';

export default function Toast() {
  const { toastMessage } = useAppStore();

  if (!toastMessage) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--t1)',
        color: '#fff',
        padding: '7px 16px',
        borderRadius: 8,
        fontSize: 12,
        zIndex: 999,
        width: 'fit-content',
        textAlign: 'center',
        animation: 'fadeUp .22s ease',
      }}
    >
      {toastMessage}
    </div>
  );
}
