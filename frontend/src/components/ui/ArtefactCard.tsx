/* ══════════════════════════════════════════
   ArtefactCard — Card for each artefact
   Matches prototype .ac exactly
   ══════════════════════════════════════════ */

import { TYPE_CONFIG, TYPE_LABELS } from '../../data';
import { useAppStore } from '../../stores/appStore';
import { formatDate } from '../../utils';
import type { Artefact } from '../../types';

interface Props {
  artefact: Artefact;
}

export default function ArtefactCard({ artefact: a }: Props) {
  const { openArtefact, showToast } = useAppStore();
  const tc = TYPE_CONFIG[a.t] || { lbl: '?', bg: 'rgba(37,99,235,.1)', c: '#2563EB', bar: '#2563EB' };
  const isV = a.t === 'video';

  return (
    <div
      className="fade-up"
      onClick={() => openArtefact(a.id)}
      style={{
        background: 'var(--card)',
        border: '1.5px solid var(--bd)',
        borderRadius: 11,
        padding: 13,
        cursor: 'pointer',
        transition: 'all .2s',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        boxShadow: 'var(--sh)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--bdh)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shh)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--sh)';
        (e.currentTarget as HTMLElement).style.transform = '';
      }}
    >
      {/* Top color bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, background: tc.bar }} />

      {/* Header */}
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 800,
            flexShrink: 0,
            background: tc.bg,
            color: tc.c,
          }}
        >
          {tc.lbl}
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.35 }}>{a.tt}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)' }}>
            {a.p}
            {a.v ? ' · ' + a.v : ''}
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.5 }}>{a.ds}</div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <span
          style={{
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            background: tc.bg,
            color: tc.c,
          }}
        >
          {TYPE_LABELS[a.t] || a.t}
        </span>
        <span
          style={{
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            background: a.vs === 'internal' ? 'rgba(37,99,235,.08)' : 'rgba(232,81,26,.08)',
            color: a.vs === 'internal' ? '#2563EB' : '#E8511A',
          }}
        >
          {a.vs === 'internal' ? 'Internal' : 'Customer'}
        </span>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 7,
          borderTop: '1px solid var(--bd)',
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--t3)' }}>{formatDate(a.dt)}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openArtefact(a.id);
            }}
            style={{
              width: 23,
              height: 23,
              borderRadius: 5,
              background: 'var(--c2)',
              border: '1px solid var(--bd)',
              color: 'var(--t2)',
              cursor: 'pointer',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all .2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--blue)';
              (e.currentTarget as HTMLElement).style.color = '#fff';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--c2)';
              (e.currentTarget as HTMLElement).style.color = 'var(--t2)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)';
            }}
          >
            {isV ? '▶' : '◉'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              showToast('Link copied');
            }}
            style={{
              width: 23,
              height: 23,
              borderRadius: 5,
              background: 'var(--c2)',
              border: '1px solid var(--bd)',
              color: 'var(--t2)',
              cursor: 'pointer',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all .2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--blue)';
              (e.currentTarget as HTMLElement).style.color = '#fff';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--c2)';
              (e.currentTarget as HTMLElement).style.color = 'var(--t2)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)';
            }}
          >
            ⇗
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              showToast('Downloading…');
            }}
            style={{
              width: 23,
              height: 23,
              borderRadius: 5,
              background: 'var(--c2)',
              border: '1px solid var(--bd)',
              color: 'var(--t2)',
              cursor: 'pointer',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all .2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--blue)';
              (e.currentTarget as HTMLElement).style.color = '#fff';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--c2)';
              (e.currentTarget as HTMLElement).style.color = 'var(--t2)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)';
            }}
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  );
}
