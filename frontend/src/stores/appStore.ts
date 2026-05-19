/* ══════════════════════════════════════════
   Covasant Continuum — Global Store (Zustand)
   ══════════════════════════════════════════ */

import { create } from 'zustand';
import type { UserRole, ViewType, AdminTab, Artefact, ChatMessage } from '../types';
import { ARTEFACTS } from '../data';

interface AppState {
  /* Navigation */
  view: ViewType;
  prod: string | null;
  detailId: number | null;

  /* Filters */
  filterType: string;
  filterVersion: string | null;
  query: string;

  /* User */
  role: UserRole;
  apiKey: string;

  /* Admin */
  adminTab: AdminTab;
  uploadStep: number;
  uploadFile: string | null;

  /* Chat */
  chatOpen: boolean;
  chatMessages: ChatMessage[];

  /* Data */
  artefacts: Artefact[];

  /* Toast */
  toastMessage: string | null;
  toastTimeout: ReturnType<typeof setTimeout> | null;

  /* Actions */
  setView: (view: ViewType) => void;
  setProd: (prod: string | null) => void;
  setDetailId: (id: number | null) => void;
  setFilterType: (ft: string) => void;
  setFilterVersion: (fv: string | null) => void;
  setQuery: (q: string) => void;
  setRole: (r: UserRole) => void;
  setApiKey: (key: string) => void;
  setAdminTab: (tab: AdminTab) => void;
  setUploadStep: (step: number) => void;
  setUploadFile: (file: string | null) => void;
  toggleChat: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  addArtefact: (art: Artefact) => void;
  showToast: (msg: string) => void;
  goHome: () => void;
  openProduct: (p: string) => void;
  openType: (t: string) => void;
  openArtefact: (id: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'home',
  prod: null,
  detailId: null,
  filterType: 'all',
  filterVersion: null,
  query: '',
  role: 'internal',
  apiKey: localStorage.getItem('nx_k') || '',
  adminTab: 'tenants',
  uploadStep: 1,
  uploadFile: null,
  chatOpen: false,
  chatMessages: [
    {
      id: 'init',
      role: 'bot',
      content: "Hi! I'm Continuum AI — ask anything about CAMS, SalesPulze, ARIIA, or G2C.",
      timestamp: new Date(),
    },
  ],
  artefacts: [...ARTEFACTS],
  toastMessage: null,
  toastTimeout: null,

  setView: (view) => set({ view }),
  setProd: (prod) => set({ prod }),
  setDetailId: (id) => set({ detailId: id }),
  setFilterType: (ft) => set({ filterType: ft }),
  setFilterVersion: (fv) => set({ filterVersion: fv }),
  setQuery: (q) => set({ query: q }),
  setRole: (r) => set({ role: r }),
  setApiKey: (key) => {
    localStorage.setItem('nx_k', key);
    set({ apiKey: key });
  },
  setAdminTab: (tab) => set({ adminTab: tab }),
  setUploadStep: (step) => set({ uploadStep: step }),
  setUploadFile: (file) => set({ uploadFile: file }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  addArtefact: (art) => set((s) => ({ artefacts: [art, ...s.artefacts] })),
  showToast: (msg) => {
    const prev = get().toastTimeout;
    if (prev) clearTimeout(prev);
    const timeout = setTimeout(() => set({ toastMessage: null, toastTimeout: null }), 2600);
    set({ toastMessage: msg, toastTimeout: timeout });
  },
  goHome: () => set({ view: 'home', prod: null, filterType: 'all', filterVersion: null, query: '' }),
  openProduct: (p) => set({ view: 'product', prod: p, filterType: 'all', filterVersion: null }),
  openType: (t) => set({ view: 'product', prod: null, filterType: t, filterVersion: null }),
  openArtefact: (id) => set({ view: 'detail', detailId: id }),
}));

/* ── Selectors ── */

/** Check if an artefact is visible to the current role */
export function canSee(a: Artefact, role: UserRole): boolean {
  if (role === 'internal' || role === 'admin' || role === 'superadmin') return true;
  if (a.vs === 'internal') return false;
  if (!a.pj.length) return true;
  return a.pj.some((p) => ['CAMS-AcmeCorp', 'SP-RetailCo'].includes(p));
}

/** Get filtered artefacts based on current state */
export function getFilteredArtefacts(
  artefacts: Artefact[],
  role: UserRole,
  prod: string | null,
  filterType: string,
  filterVersion: string | null,
  query: string
): Artefact[] {
  let r = artefacts.filter((a) => canSee(a, role));
  if (prod) r = r.filter((a) => a.p === prod);
  if (filterType !== 'all') r = r.filter((a) => a.t === filterType);
  if (filterVersion) r = r.filter((a) => a.v === filterVersion);
  if (query) {
    const q = query.toLowerCase();
    r = r.filter(
      (a) =>
        a.tt.toLowerCase().includes(q) ||
        a.ds.toLowerCase().includes(q) ||
        a.p.toLowerCase().includes(q)
    );
  }
  return r;
}
