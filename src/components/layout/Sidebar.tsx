/* ══════════════════════════════════════════
   Sidebar — Left filter panel
   Matches prototype .sb exactly
   ══════════════════════════════════════════ */

import { useAppStore, canSee } from '../../stores/appStore';

export default function Sidebar() {
  const { filterType, filterVersion, setFilterType, setFilterVersion, setView, artefacts, role } = useAppStore();

  const visible = artefacts.filter((a: any) => canSee(a, role));
  const counts: Record<string, number> = {
    a: visible.length,
    rn: visible.filter((a: any) => a.t === 'release-notes').length,
    vi: visible.filter((a: any) => a.t === 'video').length,
    gu: visible.filter((a: any) => a.t === 'guide').length,
    do: visible.filter((a: any) => a.t === 'documentation').length,
    nl: visible.filter((a: any) => a.t === 'newsletter').length,
  };

  const typeFilters = [
    { key: 'all', icon: '◈', color: 'var(--blue)', label: 'All', countKey: 'a' },
    { key: 'release-notes', icon: '●', color: 'var(--grn)', label: 'Release Notes', countKey: 'rn' },
    { key: 'video', icon: '▶', color: 'var(--pur)', label: 'Videos', countKey: 'vi' },
    { key: 'guide', icon: '◉', color: 'var(--cor)', label: 'Guides', countKey: 'gu' },
    { key: 'documentation', icon: '≡', color: 'var(--blue)', label: 'Docs', countKey: 'do' },
    { key: 'newsletter', icon: '✉', color: 'var(--amb)', label: 'Newsletters', countKey: 'nl' },
  ];

  const versionFilters = [
    { v: 'v2.4', label: 'v2.4 · Sprint 18', icon: 'NEW', iconColor: 'var(--cor)', isBold: true },
    { v: 'v2.3', label: 'v2.3 · Sprint 17', icon: '●', iconColor: 'var(--t3)', isBold: false },
    { v: 'v1.8', label: 'SP v1.8', icon: '●', iconColor: 'var(--t3)', isBold: false },
  ];

  const handleTypeClick = (key: string) => {
    setFilterType(key);
    setFilterVersion(null);
    setView('product');
  };

  const handleVersionClick = (v: string) => {
    setFilterVersion(filterVersion === v ? null : v);
    setView('product');
  };

  return (
    <aside
      style={{
        width: 200,
        background: 'var(--card)',
        borderRight: '1px solid var(--bd)',
        padding: '14px 10px',
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      {/* Filter by Type */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color: 'var(--t3)',
            padding: '0 7px',
            marginBottom: 6,
          }}
        >
          Filter by Type
        </div>
        {typeFilters.map((f) => {
          const isOn = filterType === f.key;
          return (
            <div
              key={f.key}
              onClick={() => handleTypeClick(f.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 8px',
                borderRadius: 7,
                cursor: 'pointer',
                fontSize: 12.5,
                color: isOn ? 'var(--blue)' : 'var(--t2)',
                fontWeight: isOn ? 700 : 500,
                background: isOn ? 'rgba(37,99,235,.08)' : 'transparent',
                position: 'relative',
                marginBottom: 1,
                transition: 'all .18s',
              }}
            >
              {isOn && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 4,
                    bottom: 4,
                    width: 2.5,
                    background: 'var(--blue)',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
              <span style={{ width: 18, textAlign: 'center', color: f.color }}>{f.icon}</span>
              {f.label}
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 10,
                  background: 'var(--c2)',
                  padding: '1px 5px',
                  borderRadius: 7,
                  color: 'var(--t3)',
                }}
              >
                {counts[f.countKey]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Releases */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color: 'var(--t3)',
            padding: '0 7px',
            marginBottom: 6,
          }}
        >
          Releases
        </div>
        {versionFilters.map((vf) => {
          const isOn = filterVersion === vf.v;
          return (
            <div
              key={vf.v}
              onClick={() => handleVersionClick(vf.v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 8px',
                borderRadius: 7,
                cursor: 'pointer',
                fontSize: 12.5,
                color: isOn ? 'var(--blue)' : 'var(--t2)',
                fontWeight: isOn ? 700 : 500,
                background: isOn ? 'rgba(37,99,235,.08)' : 'transparent',
                position: 'relative',
                marginBottom: 1,
                transition: 'all .18s',
              }}
            >
              {isOn && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 4,
                    bottom: 4,
                    width: 2.5,
                    background: 'var(--blue)',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
              <span
                style={{
                  width: 18,
                  textAlign: 'center',
                  fontSize: vf.isBold ? 9 : 9,
                  fontWeight: vf.isBold ? 800 : 400,
                  color: vf.iconColor,
                }}
              >
                {vf.icon}
              </span>
              {vf.label}
            </div>
          );
        })}
      </div>

      {/* Tools */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color: 'var(--t3)',
            padding: '0 7px',
            marginBottom: 6,
          }}
        >
          Tools
        </div>
        {[
          { icon: '⇄', label: 'JIRA Sync', view: 'jira' },
          { icon: '✉', label: 'Email', view: 'email' },
          { icon: '◎', label: 'Admin', view: 'admin' },
        ].map((tool) => (
          <div
            key={tool.view}
            onClick={() => setView(tool.view as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 8px',
              borderRadius: 7,
              cursor: 'pointer',
              fontSize: 12.5,
              color: 'var(--t2)',
              fontWeight: 500,
              marginBottom: 1,
              transition: 'all .18s',
            }}
          >
            <span style={{ width: 18, textAlign: 'center' }}>{tool.icon}</span>
            {tool.label}
          </div>
        ))}
      </div>
    </aside>
  );
}
