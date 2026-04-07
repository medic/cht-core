// Type declarations for @medic/constants, which is a plain JS module with
// dynamically-built exports that TypeScript cannot infer (e.g. VIEWS is
// populated via a loop).
export const DDOC_IDS: Record<string, string>;
export const DOC_IDS: Record<string, string>;
export const DOC_TYPES: Record<string, string>;
export const HTTP_HEADERS: Record<string, string>;
export const NOUVEAU_BY_DDOC: Record<string, Record<string, string[]>>;
export const NOUVEAU_INDEXES: Record<string, string>;
export const REPLICATED_DDOCS: string[];
export const SENTINEL_METADATA: Record<string, string>;
export const USER_ROLES: Record<string, string>;
export const CONTACT_TYPES: Record<string, string>;
export const VIEWS: Record<string, string>;
export const VIEWS_BY_DDOC: Record<string, Record<string, string[]>>;
export function getDdoc(viewPath: string): string | undefined;
export function getViewName(viewPath: string): string | undefined;
export function nouveauInfoUrl(indexPath: string): string;
export function nouveauUrl(indexPath: string): string;
export function viewUrl(viewPath: string): string;
