const crypto = require('node:crypto');
const auth = require('../auth');
const db = require('../db');
const logger = require('@medic/logger');
const serverUtils = require('../server-utils');
const { generateManifest } = require('./scope-manifest');
const { getRevocationListData } = require('./revocation-list');
const config = require('../config');

const P2P_KEYS_DOC_ID = 'p2p-server-keys';

// In-memory cache of the ECDSA key pair (populated on first use or from CouchDB vault)
let cachedKeyPair = null;

/**
 * Base64url encode a buffer (JWT-safe encoding).
 */
const base64url = (buf) => {
  let str = buf.toString('base64');
  str = str.replace(/\+/g, '-').replace(/\//g, '_');
  while (str.endsWith('=')) {
    str = str.slice(0, -1);
  }
  return str;
};

/**
 * Convert a DER-encoded ECDSA signature to raw R||S format (64 bytes for P-256).
 * DER structure: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
 */
const derToRawSignature = (derBuf) => {
  let offset = 2; // skip SEQUENCE tag + length
  // R component
  const rLen = derBuf[offset + 1];
  offset += 2;
  let r = derBuf.slice(offset, offset + rLen);
  offset += rLen;
  // S component
  const sLen = derBuf[offset + 1];
  offset += 2;
  let s = derBuf.slice(offset, offset + sLen);

  // Trim leading zero padding (DER adds 0x00 prefix when high bit is set)
  if (r.length > 32) {
    r = r.slice(r.length - 32);
  }
  if (s.length > 32) {
    s = s.slice(s.length - 32);
  }

  // Left-pad to 32 bytes if shorter
  const rPad = Buffer.alloc(32);
  const sPad = Buffer.alloc(32);
  r.copy(rPad, 32 - r.length);
  s.copy(sPad, 32 - s.length);

  return Buffer.concat([rPad, sPad]);
};

/**
 * Get or create the ECDSA P-256 key pair for JWT signing.
 * Keys are persisted in the vault DB so they survive restarts.
 */
const getKeyPair = async () => {
  if (cachedKeyPair) {
    return cachedKeyPair;
  }

  // Try loading from vault DB
  try {
    const doc = await db.vault.get(P2P_KEYS_DOC_ID);
    cachedKeyPair = {
      privateKey: crypto.createPrivateKey(doc.private_key_pem),
      publicKeyPem: doc.public_key_pem,
    };
    return cachedKeyPair;
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }
  }

  // Generate new key pair
  logger.info('Generating new ECDSA P-256 key pair for P2P JWT signing');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });

  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });

  // Persist to vault DB
  try {
    await db.vault.put({
      _id: P2P_KEYS_DOC_ID,
      public_key_pem: publicKeyPem,
      private_key_pem: privateKeyPem,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn('Failed to persist P2P keys to vault: %o', err);
    // Continue with in-memory keys — they'll be regenerated on restart
  }

  cachedKeyPair = {
    privateKey,
    publicKeyPem,
  };
  return cachedKeyPair;
};

/**
 * Sign a JWT payload with ECDSA P-256 (ES256).
 */
const signJwt = async (payload) => {
  const { privateKey, publicKeyPem } = await getKeyPair();

  const header = { alg: 'ES256', typ: 'JWT' };
  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));

  const signingInput = `${headerB64}.${payloadB64}`;
  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  const derSignature = sign.sign(privateKey);

  // Convert DER-encoded ECDSA signature to raw R||S format (required by JWT ES256 spec).
  // Node.js crypto produces DER; JWT requires 64-byte concatenated R||S for P-256.
  const rawSignature = derToRawSignature(derSignature);
  const signatureB64 = base64url(rawSignature);

  return {
    token: `${signingInput}.${signatureB64}`,
    publicKeyPem,
  };
};

/**
 * Build JWT payload.
 */
const buildPayload = (userSettings, facilityPath) => {
  const p2pConfig = config.get('p2p_sync') || {};
  const tokenExpiryDays = p2pConfig.token_expiry_days || 30;
  const nowSec = Math.floor(Date.now() / 1000);

  const facilityId = Array.isArray(userSettings.facility_id)
    ? userSettings.facility_id[0]
    : userSettings.facility_id;

  return {
    sub: userSettings._id,
    role: (userSettings.roles || [])[0] || 'unknown',
    facility_id: facilityId,
    facility_path: facilityPath,
    replication_depth: getReplicationDepth(userSettings.roles || []),
    allowed_relay_peers: [],
    permissions: getPermissions(userSettings.roles || [], p2pConfig),
    iat: nowSec,
    exp: nowSec + (tokenExpiryDays * 24 * 60 * 60),
    jti: crypto.randomUUID(),
  };
};

/**
 * Get replication depth for the user's roles.
 */
const getReplicationDepth = (roles) => {
  const depthSettings = config.get('replication_depth') || [];
  return depthSettings
    .filter(setting => roles.includes(setting.role))
    .map(setting => Number.parseInt(setting.depth, 10))
    .filter(depth => !Number.isNaN(depth))
    .reduce((max, depth) => Math.max(max, depth), 0);
};

/**
 * Determine P2P permissions based on roles and config.
 */
const getPermissions = (roles, p2pConfig) => {
  const hostRoles = p2pConfig.host_roles || [];
  const peerRoles = p2pConfig.peer_roles || [];
  const isHost = roles.some(r => hostRoles.includes(r));
  const isPeer = roles.some(r => peerRoles.includes(r));
  const perms = [];
  if (isHost || isPeer) {
    perms.push('can_push', 'can_pull');
  }
  if (isHost) {
    perms.push('can_relay');
  }
  return perms;
};

/**
 * Build facility path (array of ancestor facility IDs) by walking the contact hierarchy.
 */
const fetchParentId = async (currentId) => {
  try {
    const doc = await db.medic.get(currentId);
    return doc.parent?._id || null;
  } catch (err) {
    logger.warn('Could not fetch facility %s for path: %o', currentId, err);
    return null;
  }
};

const getFacilityPath = async (facilityId) => {
  const path = [];
  let currentId = Array.isArray(facilityId) ? facilityId[0] : facilityId;

  // Walk up to 5 levels to prevent infinite loops
  for (let i = 0; i < 5 && currentId; i++) {
    const parentId = await fetchParentId(currentId);
    if (!parentId) {
      break;
    }
    path.unshift(parentId);
    currentId = parentId;
  }

  return path;
};

/**
 * POST /api/v1/p2p/authorize
 * Issues a signed JWT token for P2P participation.
 */
const authorize = async (req, res) => {
  try {
    // 1. Verify user is authenticated
    const userCtx = await auth.getUserCtx(req);

    // 2. Check P2P is enabled (cheap config check before any DB reads)
    const p2pConfig = config.get('p2p_sync') || {};
    if (!p2pConfig.enabled) {
      return serverUtils.error({ code: 403, message: 'P2P sync is not enabled' }, req, res);
    }

    // 3. Get user settings
    const userSettings = await auth.getUserSettings(userCtx);
    if (!userSettings.facility_id) {
      return serverUtils.error({ code: 403, message: 'User has no facility_id assigned' }, req, res);
    }

    // 4. Check user's role is allowed (host or peer)
    const hostRoles = p2pConfig.host_roles || [];
    const peerRoles = p2pConfig.peer_roles || [];
    const allowedRoles = new Set([...hostRoles, ...peerRoles]);
    const hasAllowedRole = (userSettings.roles || []).some(role => allowedRoles.has(role));
    if (!hasAllowedRole) {
      return serverUtils.error({ code: 403, message: 'User role not authorized for P2P sync' }, req, res);
    }

    // 5. Build facility path
    const facilityPath = await getFacilityPath(userSettings.facility_id);

    // 6. Build and sign JWT
    const payload = buildPayload(userSettings, facilityPath);
    const { token, publicKeyPem } = await signJwt(payload);

    // 7. Generate scope manifest
    const scopeManifest = generateManifest(userSettings);

    // 8. Get revocation list version
    const revocationList = await getRevocationListData();

    res.json({
      token,
      server_public_key: publicKeyPem,
      scope_manifest: scopeManifest,
      revocation_list_version: revocationList.version,
    });
  } catch (err) {
    serverUtils.error(err, req, res);
  }
};

module.exports = {
  authorize,
};
