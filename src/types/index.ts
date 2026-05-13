/* ══════════════════════════════════════════
   Covasant Continuum — Type Definitions
   ══════════════════════════════════════════ */

export type UserRole = 'internal' | 'customer' | 'admin' | 'superadmin';

export type ArtefactType = 'release-notes' | 'video' | 'guide' | 'documentation' | 'newsletter';

export type Visibility = 'internal' | 'customer';

export type PublishStatus = 'published' | 'review' | 'draft';

export type ViewType = 'home' | 'products' | 'product' | 'browse-type' | 'admin' | 'jira' | 'email' | 'settings' | 'detail';

export type AdminTab = 'tenants' | 'logs' | 'users';

export interface Product {
  n: string;
  full: string;
  d: string;
  clr: string;
  bg: string;
  docs: number;
  vids: number;
  rels: number;
}

export interface Artefact {
  id: number;
  p: string;
  t: ArtefactType;
  tt: string;
  v: string | null;
  dt: string;
  vs: Visibility;
  pj: string[];
  ds: string;
  vid?: string;
}

export interface AccessLog {
  t: string;
  u: string;
  r: string;
  a: string;
  ac: string;
  pr: string;
}

export interface TypeConfig {
  lbl: string;
  bg: string;
  c: string;
  bar: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}
