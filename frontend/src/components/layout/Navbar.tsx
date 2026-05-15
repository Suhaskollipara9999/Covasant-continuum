/* ══════════════════════════════════════════
   Navbar — Top navigation bar
   Clean version: no role switcher, no Admin button.
   Search uses real API. Role is auto-determined from auth.
   ══════════════════════════════════════════ */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { searchArtefacts } from '../../utils/api';
import NotificationBell from '../ui/NotificationBell';

interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  artefact_type: string | null;
  product_id: string | null;
}

export default function Navbar() {
  const { view, goHome, setView, toggleChat } = useAppStore();
  const { user, logout } = useAuthStore();

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val || val.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchArtefacts(val);
        setResults(data.items || []);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleResultClick = (r: SearchResult) => {
    setShowResults(false);
    setQuery('');
    if (r.product_id) {
      useAppStore.getState().setProd(r.product_id);
      setView('product');
    }
  };

  // Determine which tabs to show based on role
  const role = user?.role || 'internal';
  const isAdmin = role === 'admin' || role === 'superadmin';

  const tabs = [
    { key: 'home', label: 'Home' },
    { key: 'products', label: 'Products' },
    ...(isAdmin ? [
      { key: 'admin', label: 'Admin' },
      { key: 'jira', label: 'JIRA' },
      { key: 'email', label: 'Email' },
      { key: 'settings', label: 'Settings' },
    ] : []),
  ];

  return (
    <nav
      style={{
        height: 52,
        background: 'var(--nav)',
        borderBottom: '1px solid var(--bd)',
        display: 'flex',
        alignItems: 'stretch',
        padding: '0 20px',
        flexShrink: 0,
        boxShadow: 'var(--sh)',
      }}
    >
      {/* Logo */}
      <div
        onClick={goHome}
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 1,
          cursor: 'pointer',
          flexShrink: 0,
          paddingRight: 16,
          marginRight: 2,
          borderRight: '1px solid var(--bd)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', letterSpacing: -0.5, lineHeight: 1 }}>
          Covasant <b style={{ color: 'var(--blue)' }}>Continuum</b>
        </div>
        <div
          style={{
            fontSize: 7.5,
            color: 'var(--t3)',
            letterSpacing: 0.9,
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          AI-Driven. Human-Inspired.
        </div>
      </div>

      {/* Nav Tabs */}
      <div style={{ display: 'flex', alignItems: 'stretch', marginLeft: 4 }}>
        {tabs.map((tab) => (
          <a
            key={tab.key}
            onClick={() => (tab.key === 'home' ? goHome() : setView(tab.key as any))}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 13px',
              fontSize: 12.5,
              fontWeight: (view === tab.key || (tab.key === 'products' && view === 'product')) ? 700 : 600,
              cursor: 'pointer',
              color: (view === tab.key || (tab.key === 'products' && view === 'product')) ? 'var(--blue)' : 'var(--t3)',
              textDecoration: 'none',
              position: 'relative',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              transition: 'color .18s',
            }}
          >
            {tab.label}
            {(view === tab.key || (tab.key === 'products' && view === 'product')) && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 8,
                  right: 8,
                  height: 2,
                  background: 'var(--blue)',
                  borderRadius: '2px 2px 0 0',
                }}
              />
            )}
          </a>
        ))}
      </div>

      {/* Search */}
      <div
        ref={searchRef}
        style={{
          flex: 1,
          maxWidth: 280,
          margin: '0 8px 0 auto',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <svg
          style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
        >
          <circle cx="5.5" cy="5.5" r="4.5" stroke="#9098BA" strokeWidth="1.3" />
          <line x1="9.2" y1="9.2" x2="12" y2="12" stroke="#9098BA" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          name="continuum-search-docs"
          autoComplete="off"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search documents…"
          style={{
            width: '100%',
            padding: '6px 32px 6px 28px',
            background: 'var(--c2)',
            border: '1.5px solid var(--bd)',
            borderRadius: 7,
            color: 'var(--t1)',
            fontSize: 12,
            fontFamily: 'inherit',
            outline: 'none',
          }}
          onFocus={() => query.length >= 2 && setShowResults(true)}
        />
        {/* Keyboard shortcut hint */}
        <span
          style={{
            position: 'absolute',
            right: 9,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <kbd
            style={{
              background: 'var(--card)',
              border: '1px solid var(--bd)',
              borderRadius: 3,
              padding: '1px 4px',
              fontSize: 9.5,
              fontFamily: 'inherit',
              color: 'var(--t3)',
              fontWeight: 700,
            }}
          >
            ⌘K
          </kbd>
        </span>

        {/* Search Results Dropdown */}
        {showResults && (
          <div style={{
            position: 'absolute', top: 38, left: 0, right: 0,
            background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 10,
            boxShadow: '0 12px 40px rgba(15,18,53,.14)', zIndex: 300, overflow: 'hidden',
            maxHeight: 300, overflowY: 'auto',
          }}>
            {searching ? (
              <div style={{ padding: '14px', textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Searching…</div>
            ) : results.length === 0 ? (
              <div style={{ padding: '14px', textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>No results found for "{query}"</div>
            ) : (
              results.map(r => (
                <div
                  key={r.id}
                  onClick={() => handleResultClick(r)}
                  style={{
                    padding: '8px 12px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(15,18,53,.04)',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.3 }}>{r.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
                    {r.artefact_type && <span style={{ textTransform: 'capitalize' }}>{r.artefact_type} · </span>}
                    {r.description?.substring(0, 80)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, flexShrink: 0 }}>
        <NotificationBell />

        {/* AI Chat toggle */}
        {isAdmin && (
          <a
            onClick={toggleChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 7,
              background: 'linear-gradient(135deg,var(--blue),var(--pur))',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            AI Chat
          </a>
        )}

        {/* User avatar */}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            background: 'var(--blue)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 800,
            flexShrink: 0,
            cursor: 'default',
          }}
          title={user?.email || ''}
        >
          {(user?.full_name || 'U').charAt(0).toUpperCase()}
        </div>

        {/* Logout */}
        <a
          onClick={logout}
          title="Logout"
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            color: 'var(--t3)',
            userSelect: 'none',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </a>
      </div>
    </nav>
  );
}
