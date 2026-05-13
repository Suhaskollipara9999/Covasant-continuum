/**
 * Covasant Continuum — AI Chat Panel (Resizable)
 * Uses backend API for AI (keys from .env). No client-side API key needed.
 * Draggable top edge to resize.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { sendChatMessage } from '../../utils/api';
import { useAuthStore } from '../../stores/authStore';

export default function ChatPanel() {
  const { chatOpen, chatMessages, toggleChat, addChatMessage } = useAppStore();
  const { user } = useAuthStore();
  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Resizable height
  const [height, setHeight] = useState(340);
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(0);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [chatMessages]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStartY.current = e.clientY;
    dragStartH.current = height;
  }, [height]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const delta = dragStartY.current - e.clientY;
      setHeight(Math.max(180, Math.min(600, dragStartH.current + delta)));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  if (!chatOpen) return null;

  const sendMsg = async () => {
    const val = inputRef.current?.value?.trim();
    if (!val) return;
    inputRef.current!.value = '';
    addChatMessage({ id: Date.now().toString(), role: 'user', content: val, timestamp: new Date() });

    const typingId = (Date.now() + 2).toString();
    addChatMessage({ id: typingId, role: 'bot', content: '⏳', timestamp: new Date() });

    try {
      const data = await sendChatMessage(val, { role: user?.role });
      const store = useAppStore.getState();
      const msgs = store.chatMessages.filter(m => m.id !== typingId);
      const reply = data.content || data.response || 'Got it!';
      useAppStore.setState({ chatMessages: [...msgs, { id: (Date.now() + 3).toString(), role: 'bot', content: reply, timestamp: new Date() }] });
    } catch (err: any) {
      const store = useAppStore.getState();
      const msgs = store.chatMessages.filter(m => m.id !== typingId);
      const errMsg = err.message?.includes('Chat unavailable')
        ? 'AI chat is not configured. Set ANTHROPIC_API_KEY in backend .env file.'
        : `Error: ${err.message}`;
      useAppStore.setState({ chatMessages: [...msgs, { id: (Date.now() + 4).toString(), role: 'bot', content: errMsg, timestamp: new Date() }] });
    }
  };

  return (
    <div
      ref={panelRef}
      style={{
        background: 'var(--card)',
        borderTop: '1px solid var(--bd)',
        display: 'flex',
        flexDirection: 'column',
        height,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Drag Handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: 'absolute', top: -4, left: 0, right: 0, height: 8,
          cursor: 'ns-resize', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ width: 36, height: 3, borderRadius: 2, background: dragging ? 'var(--blue)' : 'var(--bd)', transition: 'background .2s' }} />
      </div>

      {/* Header */}
      <div style={{ padding: '10px 16px', background: 'linear-gradient(135deg,var(--blue),var(--pur))', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>AI</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Continuum AI</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.75)' }}>Powered by backend AI · Drag top edge to resize</div>
        </div>
        <a onClick={toggleChat} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.2)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>Close</a>
      </div>

      {/* Messages */}
      <div ref={msgsRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7, background: 'var(--c2)' }}>
        {chatMessages.map(m => (
          <div key={m.id} style={{
            maxWidth: '82%', padding: '8px 11px', borderRadius: 10, fontSize: 12, lineHeight: 1.5,
            ...(m.role === 'bot'
              ? { background: 'var(--card)', border: '1.5px solid var(--bd)', alignSelf: 'flex-start', borderTopLeftRadius: 3, color: 'var(--t1)' }
              : { background: 'linear-gradient(135deg,var(--blue),var(--pur))', color: '#fff', alignSelf: 'flex-end', borderTopRightRadius: 3 }),
          }}>
            {m.content === '⏳' ? (
              <span style={{ display: 'inline-flex', gap: 4 }}>
                {[0, .2, .4].map((d, i) => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--t3)', animation: `typing-bounce 1.2s ${d}s infinite` }} />)}
              </span>
            ) : m.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '9px 12px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 6, background: 'var(--card)', flexShrink: 0 }}>
        <input ref={inputRef} placeholder="Ask about releases, guides, APIs…" onKeyDown={e => { if (e.key === 'Enter') sendMsg(); }} style={{ flex: 1, padding: '6px 10px', background: 'var(--c2)', border: '1.5px solid var(--bd)', borderRadius: 7, color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
        <button onClick={sendMsg} style={{ width: 30, height: 30, borderRadius: 7, background: 'linear-gradient(135deg,var(--blue),var(--pur))', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      </div>
    </div>
  );
}
