/**
 * MongoDB view registry — translates CouchDB MapReduce view queries
 * into MongoDB aggregation pipelines / queries.
 *
 * Each entry maps a 'designDoc/viewName' string to a function that
 * accepts (collection, opts) and returns a PouchDB-compatible view result:
 *   { total_rows, offset, rows: [{ id, key, value, doc? }] }
 */

const CONTACT_TYPES = ['district_hospital', 'health_center', 'clinic', 'person'];

const formatViewResult = (rows, opts = {}) => {
  return {
    total_rows: rows.length,
    offset: opts.skip || 0,
    rows,
  };
};

const keyMatch = (docKey, opts) => {
  if (opts.key !== undefined) {
    return JSON.stringify(docKey) === JSON.stringify(opts.key);
  }
  if (opts.keys) {
    return opts.keys.some(k => JSON.stringify(k) === JSON.stringify(docKey));
  }
  return true;
};

// ---- View Implementations ----

/**
 * medic/contacts_by_depth
 * Emits [parentId] and [parentId, depth] for each ancestor.
 * Queried with: { keys: [[facilityId], [facilityId, depth], ...] }
 */
const contactsByDepth = async (collection, opts) => {
  // Extract the facility IDs from the keys (first element of each key array)
  const facilityIds = [...new Set((opts.keys || []).map(k => k[0]))];

  // Find contacts that have any of these facility IDs in their ancestry
  const contacts = await collection.find({
    $or: [
      { _id: { $in: facilityIds } },
      { 'parent._id': { $in: facilityIds } },
      { 'parent.parent._id': { $in: facilityIds } },
      { 'parent.parent.parent._id': { $in: facilityIds } },
      { 'parent.parent.parent.parent._id': { $in: facilityIds } },
    ],
    type: { $in: ['contact', ...CONTACT_TYPES] },
    _deleted: { $ne: true },
  }).toArray();

  const rows = [];
  for (const doc of contacts) {
    const value = {
      shortcode: doc.patient_id || doc.place_id,
      primary_contact: typeof doc.contact === 'object' ? doc.contact?._id : doc.contact,
    };

    let parent = doc;
    let depth = 0;
    while (parent) {
      if (parent._id) {
        const key1 = [parent._id];
        const key2 = [parent._id, depth];
        if (keyMatch(key1, opts)) {
          rows.push({ id: doc._id, key: key1, value });
        }
        if (keyMatch(key2, opts)) {
          rows.push({ id: doc._id, key: key2, value });
        }
      }
      depth++;
      parent = parent.parent;
    }
  }

  return formatViewResult(rows, opts);
};

/**
 * medic/contacts_by_primary_contact
 * Emits primaryContactId for contacts.
 * Queried with: { keys: [docIds], include_docs: true }
 */
const contactsByPrimaryContact = async (collection, opts) => {
  const query = {
    type: { $in: ['contact', ...CONTACT_TYPES] },
    _deleted: { $ne: true },
  };

  if (opts.keys) {
    query.$or = [
      { 'contact._id': { $in: opts.keys } },
      { contact: { $in: opts.keys } },
    ];
  }

  const docs = await collection.find(query).toArray();

  const rows = docs.map(doc => {
    const primaryContact = typeof doc.contact === 'object' ? doc.contact?._id : doc.contact;
    const row = { id: doc._id, key: primaryContact, value: null };
    if (opts.include_docs) {
      row.doc = doc;
    }
    return row;
  }).filter(row => !opts.keys || opts.keys.includes(row.key));

  return formatViewResult(rows, opts);
};

/**
 * medic-client/contacts_by_type
 * Emits [type] with order value. Has _count reduce.
 * Queried with: { reduce: true, group: true } OR { reduce: false, include_docs: true, limit, start_key }
 */
const contactsByType = async (collection, opts) => {
  const query = {
    type: { $in: ['contact', ...CONTACT_TYPES] },
    _deleted: { $ne: true },
  };

  if (opts.reduce) {
    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: { $cond: [{ $eq: ['$type', 'contact'] }, '$contact_type', '$type'] },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    const rows = results.map(r => ({
      key: [r._id],
      value: r.count,
    }));

    return formatViewResult(rows, opts);
  }

  // Non-reduce mode
  if (opts.startkey) {
    const startType = Array.isArray(opts.startkey) ? opts.startkey[0] : opts.startkey;
    query.$or = [
      { type: startType },
      { contact_type: startType },
    ];
  }

  const cursor = collection.find(query).sort({ type: 1, name: 1 });
  if (opts.limit) {
    cursor.limit(opts.limit);
  }

  const docs = await cursor.toArray();
  const rows = docs.map(doc => {
    const type = doc.type === 'contact' ? doc.contact_type : doc.type;
    const dead = !!doc.date_of_death;
    const muted = !!doc.muted;
    const idx = CONTACT_TYPES.indexOf(type) !== -1 ? CONTACT_TYPES.indexOf(type) : type;
    const order = `${dead} ${muted} ${idx} ${(doc.name || '').toLowerCase()}`;
    const row = { id: doc._id, key: [type], value: order };
    if (opts.include_docs) {
      row.doc = doc;
    }
    return row;
  });

  return formatViewResult(rows, opts);
};

/**
 * medic-client/reports_by_form
 * Emits [formName] with reported_date. Has _count reduce.
 * Queried with: { reduce: true, group: true }
 */
const reportsByForm = async (collection, opts) => {
  if (opts.reduce) {
    const pipeline = [
      { $match: { type: 'data_record', form: { $exists: true, $ne: null }, _deleted: { $ne: true } } },
      { $group: { _id: '$form', count: { $sum: 1 } } },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    const rows = results.map(r => ({
      key: [r._id],
      value: r.count,
    }));

    return formatViewResult(rows, opts);
  }

  const docs = await collection.find({
    type: 'data_record',
    form: { $exists: true, $ne: null },
    _deleted: { $ne: true },
  }).toArray();

  const rows = docs.map(doc => ({
    id: doc._id,
    key: [doc.form],
    value: doc.reported_date,
  }));

  return formatViewResult(rows, opts);
};

/**
 * medic-client/doc_by_type
 * Emits [docType].
 * Queried with: { include_docs: true, key: ['meta'] }
 */
const docByType = async (collection, opts) => {
  const query = { _deleted: { $ne: true } };

  if (opts.key) {
    const type = Array.isArray(opts.key) ? opts.key[0] : opts.key;
    query.type = type;
  }

  const docs = await collection.find(query).toArray();
  const rows = docs.map(doc => {
    const row = { id: doc._id, key: [doc.type], value: null };
    if (opts.include_docs) {
      row.doc = doc;
    }
    return row;
  });

  return formatViewResult(rows, opts);
};

/**
 * medic/messages_by_state
 * Emits [taskState, dueTimestamp] for messages in tasks/scheduled_tasks.
 * Queried with: { limit, startkey: ['pending-or-forwarded', 0], endkey: ['pending-or-forwarded', '\ufff0'] }
 */
const messagesByState = async (collection, opts) => {
  const docs = await collection.find({
    _deleted: { $ne: true },
    $or: [
      { 'tasks.0': { $exists: true } },
      { 'scheduled_tasks.0': { $exists: true } },
    ],
  }).toArray();

  const rows = [];
  for (const doc of docs) {
    const allTasks = [...(doc.tasks || []), ...(doc.scheduled_tasks || [])];
    for (const task of allTasks) {
      let due = task.due || task.timestamp || doc.reported_date;
      if (typeof due === 'string') {
        due = Date.parse(due);
      }

      const emitRow = (state, value) => {
        const key = [state, due];
        if (isInRange(key, opts)) {
          rows.push({ id: doc._id, key, value });
        }
      };

      if (task.messages) {
        for (const msg of task.messages) {
          if (msg.uuid && msg.to && msg.message) {
            const value = { content: msg.message, to: msg.to, id: msg.uuid };
            emitRow(task.state, value);
            if (task.state === 'pending' || task.state === 'forwarded-to-gateway') {
              emitRow('pending-or-forwarded', value);
            }
          }
        }
      } else {
        emitRow(task.state, {});
      }
    }
  }

  let filtered = rows;
  if (opts.limit) {
    filtered = filtered.slice(0, opts.limit);
  }

  return formatViewResult(filtered, opts);
};

/**
 * medic-sms/messages_by_gateway_ref
 * Emits gateway_ref → message UUID.
 * Queried with: { keys: [...] }
 */
const messagesByGatewayRef = async (collection, opts) => {
  const docs = await collection.find({
    _deleted: { $ne: true },
    $or: [
      { 'tasks.gateway_ref': { $in: opts.keys || [] } },
      { 'scheduled_tasks.gateway_ref': { $in: opts.keys || [] } },
      { 'sms_message.gateway_ref': { $in: opts.keys || [] } },
    ],
  }).toArray();

  const rows = [];
  for (const doc of docs) {
    for (const task of [...(doc.tasks || []), ...(doc.scheduled_tasks || [])]) {
      if (task.gateway_ref && (opts.keys || []).includes(task.gateway_ref)) {
        for (const msg of (task.messages || [])) {
          rows.push({ id: doc._id, key: task.gateway_ref, value: msg.uuid });
        }
      }
    }
    if (doc.type === 'data_record' && doc.sms_message?.gateway_ref) {
      if ((opts.keys || []).includes(doc.sms_message.gateway_ref)) {
        rows.push({ id: doc._id, key: doc.sms_message.gateway_ref, value: doc.sms_message.uuid });
      }
    }
  }

  return formatViewResult(rows, opts);
};

/**
 * medic-sms/messages_by_uuid
 * Emits message UUID.
 * Queried with: { keys: [...] }
 */
const messagesByUuid = async (collection, opts) => {
  const uuids = new Set(opts.keys || []);
  const docs = await collection.find({
    _deleted: { $ne: true },
    $or: [
      { 'tasks.messages.uuid': { $in: opts.keys || [] } },
      { 'scheduled_tasks.messages.uuid': { $in: opts.keys || [] } },
    ],
  }).toArray();

  const rows = [];
  for (const doc of docs) {
    for (const task of [...(doc.tasks || []), ...(doc.scheduled_tasks || [])]) {
      for (const msg of (task.messages || [])) {
        if (msg.uuid && uuids.has(msg.uuid)) {
          rows.push({ id: doc._id, key: msg.uuid, value: null });
        }
      }
    }
  }

  return formatViewResult(rows, opts);
};

/**
 * medic-conflicts/conflicts
 * Emits for docs with _conflicts. Has _count reduce.
 * Queried with: { reduce: true }
 * Note: MongoDB doesn't have native conflict tracking. This returns 0 conflicts.
 */
const conflicts = async (collection, opts) => {
  if (opts.reduce) {
    return formatViewResult([{ key: null, value: 0 }], opts);
  }
  return formatViewResult([], opts);
};

/**
 * medic-admin/message_queue
 * Complex view emitting message state keys. Has _count reduce.
 * Queried with: { reduce: true, group_level: 1 } OR { reduce: true, start_key, end_key }
 */
const messageQueue = async (collection, opts) => {
  const mutedStatuses = ['muted', 'cleared', 'denied', 'duplicate'];
  const successStatuses = ['delivered', 'sent'];
  const failureStatuses = ['failed'];

  if (opts.reduce && opts.start_key && opts.end_key) {
    // Range query with reduce — count messages in state between dates
    const stateKey = opts.start_key[0];
    const startDate = opts.start_key[1];
    const endDate = opts.end_key[1];

    const docs = await collection.find({
      _deleted: { $ne: true },
      $or: [
        { 'tasks.0': { $exists: true } },
        { 'scheduled_tasks.0': { $exists: true } },
      ],
    }).toArray();

    let count = 0;
    for (const doc of docs) {
      for (const task of [...(doc.tasks || []), ...(doc.scheduled_tasks || [])]) {
        const due = new Date(task.due || task.timestamp || doc.reported_date).getTime();
        if (due < startDate || due > endDate) {
          continue;
        }

        let matchState;
        if (stateKey === 'due' || stateKey === 'scheduled' || stateKey === 'muted') {
          if (task.state === 'scheduled') {
            matchState = 'scheduled';
          } else if (mutedStatuses.includes(task.state)) {
            matchState = 'muted';
          } else {
            matchState = 'due';
          }
        } else if (stateKey === 'delivered' && successStatuses.includes(task.state)) {
          matchState = 'delivered';
        } else if (stateKey === 'failed' && failureStatuses.includes(task.state)) {
          matchState = 'failed';
        }

        if (matchState === stateKey) {
          const msgCount = task.messages ? task.messages.filter(m => m.uuid && m.to && m.message).length : 1;
          count += msgCount;
        }
      }
    }

    return formatViewResult([{ key: opts.start_key, value: count }], opts);
  }

  if (opts.reduce && opts.group_level === 1) {
    // Group by first key element (state category)
    const docs = await collection.find({
      _deleted: { $ne: true },
      $or: [
        { 'tasks.0': { $exists: true } },
        { 'scheduled_tasks.0': { $exists: true } },
      ],
    }).toArray();

    const counts = {};
    for (const doc of docs) {
      for (const task of [...(doc.tasks || []), ...(doc.scheduled_tasks || [])]) {
        const categories = [];
        if (task.state === 'scheduled') {
          categories.push('scheduled');
        } else if (mutedStatuses.includes(task.state)) {
          categories.push('muted');
        } else {
          categories.push('due');
        }
        if (successStatuses.includes(task.state)) {
          categories.push('delivered');
        }
        if (failureStatuses.includes(task.state)) {
          categories.push('failed');
        }

        const msgCount = task.messages ? task.messages.filter(m => m.uuid && m.to && m.message).length : 1;
        for (const cat of categories) {
          counts[cat] = (counts[cat] || 0) + msgCount;
        }
      }
    }

    const rows = Object.entries(counts).map(([key, value]) => ({
      key: [key],
      value,
    }));

    return formatViewResult(rows, opts);
  }

  return formatViewResult([], opts);
};

/**
 * medic-admin/contacts_by_dhis_orgunit
 * Emits orgUnit ID for contacts with dhis config.
 * Queried with: { key: orgUnit, include_docs: true }
 */
const contactsByDhisOrgunit = async (collection, opts) => {
  const query = {
    type: { $in: ['contact', ...CONTACT_TYPES] },
    dhis: { $exists: true },
    _deleted: { $ne: true },
  };

  if (opts.key) {
    query.$or = [
      { 'dhis.orgUnit': opts.key },
      { 'dhis': { $elemMatch: { orgUnit: opts.key } } },
    ];
  }

  const docs = await collection.find(query).toArray();
  const rows = [];

  for (const doc of docs) {
    const dhisEntries = Array.isArray(doc.dhis) ? doc.dhis : [doc.dhis];
    for (const entry of dhisEntries) {
      if (!opts.key || entry.orgUnit === opts.key) {
        const row = { id: doc._id, key: entry.orgUnit, value: null };
        if (opts.include_docs) {
          row.doc = doc;
        }
        rows.push(row);
      }
    }
  }

  return formatViewResult(rows, opts);
};

// ---- Helpers ----

const isInRange = (key, opts) => {
  if (opts.startkey) {
    for (let i = 0; i < opts.startkey.length; i++) {
      if (key[i] < opts.startkey[i]) {
        return false;
      }
      if (key[i] > opts.startkey[i]) {
        break;
      }
    }
  }
  if (opts.endkey) {
    for (let i = 0; i < opts.endkey.length; i++) {
      if (key[i] > opts.endkey[i]) {
        return false;
      }
      if (key[i] < opts.endkey[i]) {
        break;
      }
    }
  }
  return true;
};

/**
 * medic-client/reports_by_date
 * Emits [reported_date] for data_records with forms.
 * Queried with: { limit, descending, skip }
 */
const reportsByDate = async (collection, opts) => {
  const query = {
    type: 'data_record',
    form: { $exists: true, $ne: null },
    _deleted: { $ne: true },
  };

  const sort = opts.descending ? { reported_date: -1 } : { reported_date: 1 };
  const cursor = collection.find(query).sort(sort);
  if (opts.skip) { cursor.skip(opts.skip); }
  if (opts.limit) { cursor.limit(opts.limit); }

  const docs = await cursor.toArray();
  const rows = docs.map(doc => {
    const row = { id: doc._id, key: [doc.reported_date], value: doc.reported_date };
    if (opts.include_docs) { row.doc = doc; }
    return row;
  });

  return formatViewResult(rows, opts);
};

/**
 * medic/doc_summaries_by_id
 * Emits doc _id with a summary object for reports and contacts.
 * Queried with: { keys: [docIds] }
 */
const docSummariesById = async (collection, opts) => {
  const query = { _deleted: { $ne: true } };
  if (opts.keys) {
    query._id = { $in: opts.keys };
  }

  const docs = await collection.find(query).toArray();
  const rows = [];

  const getLineage = (contact) => {
    const parts = [];
    while (contact) {
      if (contact._id) { parts.push(contact._id); }
      contact = contact.parent;
    }
    return parts;
  };

  for (const doc of docs) {
    if (doc.type === 'data_record' && doc.form) {
      const subject = {};
      const ref = doc.patient_id || doc.fields?.patient_id || doc.fields?.patient_uuid || doc.place_id || doc.fields?.place_id;
      if (doc.fields?.patient_name) { subject.name = doc.fields.patient_name; }
      if (ref) { subject.value = ref; subject.type = 'reference'; }
      else if (subject.name) { subject.value = subject.name; subject.type = 'name'; }

      rows.push({
        id: doc._id,
        key: doc._id,
        value: {
          _rev: doc._rev,
          from: doc.from || doc.sent_by,
          phone: doc.contact?.phone,
          form: doc.form,
          read: doc.read,
          valid: !doc.errors || !doc.errors.length,
          verified: doc.verified,
          reported_date: doc.reported_date,
          contact: doc.contact?._id,
          lineage: getLineage(doc.contact?.parent),
          subject,
          case_id: doc.case_id || doc.fields?.case_id,
        },
      });
    } else if (['contact', 'clinic', 'district_hospital', 'health_center', 'person'].includes(doc.type)) {
      rows.push({
        id: doc._id,
        key: doc._id,
        value: {
          _rev: doc._rev,
          name: doc.name || doc.phone,
          phone: doc.phone,
          type: doc.type,
          contact_type: doc.contact_type,
          contact: doc.contact?._id,
          lineage: getLineage(doc.parent),
          date_of_death: doc.date_of_death,
          muted: doc.muted,
        },
      });
    }
  }

  return formatViewResult(rows, opts);
};

/**
 * medic-client/contacts_by_parent
 * Emits [parentId, type] for contacts with a parent.
 * Queried with: { startkey: [parentId], endkey: [parentId, {}], include_docs: true }
 */
const contactsByParent = async (collection, opts) => {
  const contactTypes = ['contact', 'district_hospital', 'health_center', 'clinic', 'person'];
  const query = { type: { $in: contactTypes }, _deleted: { $ne: true }, 'parent._id': { $exists: true } };

  const parentId = opts.startkey?.[0] || opts.key?.[0];
  if (parentId) {
    query['parent._id'] = parentId;
  }
  if (opts.keys) {
    query['parent._id'] = { $in: opts.keys.map(k => Array.isArray(k) ? k[0] : k) };
  }

  const docs = await collection.find(query).toArray();
  const rows = docs.map(doc => {
    const type = doc.type === 'contact' ? doc.contact_type : doc.type;
    const row = { id: doc._id, key: [doc.parent._id, type], value: null };
    if (opts.include_docs) { row.doc = doc; }
    return row;
  });

  return formatViewResult(rows, opts);
};

/**
 * medic-client/docs_by_id_lineage
 * Emits [docId, depth] walking up parent lineage.
 * Queried with: { startkey: [id], endkey: [id, {}], include_docs: true }
 */
const docsByIdLineage = async (collection, opts) => {
  // Extract the target doc ID from startkey
  const targetId = opts.startkey?.[0] || opts.key?.[0];
  if (!targetId) {
    return formatViewResult([], opts);
  }

  const doc = await collection.findOne({ _id: targetId });
  if (!doc) {
    return formatViewResult([], opts);
  }

  const rows = [];
  const contactTypes = ['contact', 'district_hospital', 'health_center', 'clinic', 'person'];

  if (contactTypes.includes(doc.type)) {
    // Contact — walk its own lineage
    let current = doc;
    let depth = 0;
    while (current && current._id) {
      const row = { id: doc._id, key: [doc._id, depth], value: { _id: current._id } };
      if (opts.include_docs) {
        if (depth === 0) {
          row.doc = doc;
        } else {
          row.doc = await collection.findOne({ _id: current._id });
        }
      }
      rows.push(row);
      depth++;
      current = current.parent;
    }
  } else if (doc.type === 'data_record' && doc.form) {
    // Report — emit self then walk contact lineage
    const row0 = { id: doc._id, key: [doc._id, 0], value: null };
    if (opts.include_docs) { row0.doc = doc; }
    rows.push(row0);

    let contact = doc.contact;
    let depth = 1;
    while (contact && contact._id) {
      const row = { id: doc._id, key: [doc._id, depth], value: { _id: contact._id } };
      if (opts.include_docs) {
        row.doc = await collection.findOne({ _id: contact._id });
      }
      rows.push(row);
      depth++;
      contact = contact.parent;
    }
  }

  return formatViewResult(rows, opts);
};

// ---- Registry ----

const VIEW_REGISTRY = {
  'medic/contacts_by_depth': contactsByDepth,
  'medic/contacts_by_primary_contact': contactsByPrimaryContact,
  'medic-client/contacts_by_type': contactsByType,
  'medic-client/reports_by_form': reportsByForm,
  'medic-client/doc_by_type': docByType,
  'medic/messages_by_state': messagesByState,
  'medic-sms/messages_by_gateway_ref': messagesByGatewayRef,
  'medic-sms/messages_by_uuid': messagesByUuid,
  'medic-conflicts/conflicts': conflicts,
  'medic-admin/message_queue': messageQueue,
  'medic-admin/contacts_by_dhis_orgunit': contactsByDhisOrgunit,
  'medic-client/reports_by_date': reportsByDate,
  'medic/doc_summaries_by_id': docSummariesById,
  'medic-client/docs_by_id_lineage': docsByIdLineage,
  'medic-client/contacts_by_parent': contactsByParent,
};

/**
 * Generic view fallback — runs the CouchDB map function from the design doc
 * stored in MongoDB against all matching documents.
 */
const genericViewFallback = async (viewName, collection, opts) => {
  const [ddoc, view] = viewName.split('/');
  const ddocId = `_design/${ddoc}`;

  // Load the design doc from MongoDB
  const designDoc = await collection.findOne({ _id: ddocId });
  if (!designDoc?.views?.[view]?.map) {
    // Design doc or view not found — return empty results instead of crashing
    return formatViewResult([], opts);
  }

  const mapFnStr = designDoc.views[view].map;
  const rows = [];

  // Get all non-deleted docs (or filtered by keys if querying by _id)
  const query = { _deleted: { $ne: true } };
  const docs = await collection.find(query).toArray();

  // Run the map function against each document
  for (const doc of docs) {
    try {
      const emitted = [];
      const emit = (key, value) => emitted.push({ key, value });
      // eslint-disable-next-line no-new-func
      const mapFn = new Function('doc', 'emit', mapFnStr.replace(/^function\s*\([^)]*\)\s*\{/, '').replace(/\}$/, ''));
      mapFn(doc, emit);

      for (const { key, value } of emitted) {
        if (keyMatch(key, opts) && isInRange(key, opts)) {
          const row = { id: doc._id, key, value };
          if (opts.include_docs) { row.doc = doc; }
          rows.push(row);
        }
      }
    } catch (e) {
      // Skip docs that cause map function errors
    }
  }

  // Apply limit
  let result = rows;
  if (opts.descending) { result.reverse(); }
  if (opts.skip) { result = result.slice(opts.skip); }
  if (opts.limit) { result = result.slice(0, opts.limit); }

  return formatViewResult(result, opts);
};

/**
 * Execute a view query.
 * @param {string} viewName - 'designDoc/viewName'
 * @param {Collection} collection - MongoDB collection
 * @param {object} opts - Query options (keys, key, startkey, endkey, include_docs, reduce, group, group_level, limit)
 * @returns {Promise<ViewResult>}
 */
const queryView = async (viewName, collection, opts = {}) => {
  const handler = VIEW_REGISTRY[viewName];
  if (handler) {
    return handler(collection, opts);
  }
  // Fallback: try to run the CouchDB map function from the design doc
  return genericViewFallback(viewName, collection, opts);
};

module.exports = {
  queryView,
  VIEW_REGISTRY,
};
