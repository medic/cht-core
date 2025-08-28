// shared-libs/constants/src/index.ts
export const X_REQUEST_ID = 'X-Request-Id';
export const X_MEDIC_SERVICE = 'X-Medic-Service';

export const MM_ONLINE = 'mm-online';

export const LOCAL_TRANSITIONS_SEQ = '_local/transitions-seq';
export const LOCAL_BACKGROUND_SEQ = '_local/background-seq';

export const DOC_TYPE_TRANSLATIONS = 'translations';
export const DOC_ID_SERVICE_WORKER_META = 'service-worker-meta';

export const translationDoc = (code: string) => `messages-${code}`;
export const couchUser = (username: string) => `org.couchdb.user:${username}`;

