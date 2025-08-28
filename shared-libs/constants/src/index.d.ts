declare module "@medic/constants" {
  // Headers
  export const X_REQUEST_ID: string;
  export const X_MEDIC_SERVICE: string;

  // Flags / states
  export const MM_ONLINE: string;

  // Local DB seq docs
  export const LOCAL_TRANSITIONS_SEQ: string;
  export const LOCAL_BACKGROUND_SEQ: string;

  // Doc types / ids
  export const DOC_TYPE_TRANSLATIONS: string;
  export const DOC_ID_SERVICE_WORKER_META: string;

  // Helpers
  export function translationDoc(code: string): string;
  export function couchUser(username: string): string;
}

