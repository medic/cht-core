const db = require('../db');
const { PREFIXES } = require('@medic/constants');
const serverUtils = require('../server-utils');

// Maps the doc.type values that the legacy `medic-client/doc_by_type` view
// indexed onto the `_id` prefixes of those documents. Other types are not
// answered by the shim — the view used to return empty rows for them.
const TYPE_TO_PREFIX = {
  'form': PREFIXES.FORM,
  'user-settings': PREFIXES.COUCH_USER,
  'translations': PREFIXES.TRANSLATIONS,
};

const parseJsonParam = raw => {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== 'string') {
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

// The view emitted `[doc.type]`, so callers query with key like `["form"]`.
const extractType = key => Array.isArray(key) ? key[0] : key;

const fetchByType = async (type, includeDocs) => {
  const prefix = TYPE_TO_PREFIX[type];
  if (!prefix) {
    return [];
  }
  const result = await db.medic.allDocs({
    start_key: prefix,
    end_key: prefix + '￰',
    include_docs: includeDocs,
  });
  return result.rows.map(row => {
    const out = { id: row.id, key: [type], value: null };
    if (includeDocs) {
      out.doc = row.doc;
    }
    return out;
  });
};

const getRequestedTypes = params => {
  const keys = parseJsonParam(params.keys);
  if (Array.isArray(keys)) {
    return keys.map(extractType).filter(Boolean);
  }
  const type = extractType(parseJsonParam(params.key));
  return type ? [type] : [];
};

module.exports = {
  request: async (req, res) => {
    try {
      const params = Object.assign({}, req.query, req.body);
      const includeDocs = params.include_docs === true || params.include_docs === 'true';
      const types = getRequestedTypes(params);

      const rowGroups = await Promise.all(types.map(t => fetchByType(t, includeDocs)));
      const rows = rowGroups.flat();

      return res.json({
        total_rows: rows.length,
        offset: 0,
        rows,
      });
    } catch (err) {
      return serverUtils.serverError(err, req, res);
    }
  },
};
