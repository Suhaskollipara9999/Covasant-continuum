/* ══════════════════════════════════════════
   Covasant Continuum — Static Data
   Type configs only. No more mock/dummy data.
   All real data comes from the API.
   ══════════════════════════════════════════ */

import type { TypeConfig } from '../types';

export const PRODUCTS: Record<string, any> = {};

export const ARTEFACTS: any[] = [];

export const ACCESS_LOGS: any[] = [];

export const TYPE_CONFIG: Record<string, TypeConfig> = {
  'release-notes': { lbl: 'Release Notes', bg: 'rgba(5,150,105,.1)', c: '#059669', bar: '#059669' },
  video: { lbl: 'Video', bg: 'rgba(220,38,38,.1)', c: '#DC2626', bar: '#DC2626' },
  guide: { lbl: 'Guide', bg: 'rgba(124,58,237,.1)', c: '#7C3AED', bar: '#7C3AED' },
  documentation: { lbl: 'Documentation', bg: 'rgba(37,99,235,.1)', c: '#2563EB', bar: '#2563EB' },
  newsletter: { lbl: 'Newsletter', bg: 'rgba(217,119,6,.1)', c: '#D97706', bar: '#D97706' },
};

export const TYPE_LABELS: Record<string, string> = {
  'release-notes': 'Release Notes',
  video: 'Video',
  guide: 'Guide',
  documentation: 'Documentation',
  newsletter: 'Newsletter',
};

export const LOGS: any[] = [];
