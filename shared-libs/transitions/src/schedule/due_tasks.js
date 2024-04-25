// ToThinkAbout: this doesn't need to exist. We can just work this out dynamically when
//       gateway queries, it's not slow or complicated.
const moment = require('moment');
const utils = require('../lib/utils');
const date = require('../date');
const config = require('../config');
const db = require('../db');
const request = require('@medic/couch-request');
const lineage = require('@medic/lineage')(Promise, db.medic);
const messageUtils = require('@medic/message-utils');

const BATCH_SIZE = 1000;

const getTemplateContext = async (doc) => {
  const context = {
    // the doc is already hydrated
    patient: doc.patient,
    place: doc.place,
  };

  const patientShortcodeId = doc.fields?.patient_id || doc.patient?.patient_id;
  const placeShortcodeId = doc.fields?.place_id || doc.place?.place_id;
  if (!patientShortcodeId && !placeShortcodeId) {
    return context;
  }

  const [patientRegistrations, placeRegistrations] = await Promise.all([
    patientShortcodeId && utils.getRegistrations({ id: patientShortcodeId }),
    placeShortcodeId && utils.getRegistrations({ id: placeShortcodeId }),
  ]);

  context.registrations = patientRegistrations;
  context.placeRegistrations = placeRegistrations;

  return context;
};

const updateScheduledTasks = (doc, context, dueDates) => {
  if (!doc) {
    return;
  }

  let updatedTasks = false;
  // set task to pending for gateway to pick up
  doc.scheduled_tasks.forEach(task => {
    // use the same due calculation as the `messages_by_state` view
    let due = task.due || task.timestamp || doc.reported_date;
    if (typeof due !== 'string') {
      due = moment(due).toISOString();
    }

    if (dueDates.includes(due)) {
      if (!task.messages) {
        const content = {
          translationKey: task.message_key,
          message: task.message,
        };

        const messages = messageUtils.generate(
          config.getAll(),
          utils.translate,
          doc,
          content,
          task.recipient,
          context
        );

        // generated messages could have errors, such messages should not be saved
        // an example invalid message would be generated when a registration was missing the patient
        if (!messageUtils.hasError(messages)) {
          task.messages = messages;
        }
      }

      // only update task states when messages exist
      if (task.messages) {
        updatedTasks = true;
        utils.setTaskState(task, 'pending');
      }
    }
  });

  return updatedTasks;
};

const getNextBatch = (result, startKeyDocId, query) => {
  const lastRow = result.rows.at(-1);
  const nextKey = lastRow.key;
  let nextKeyDocId = lastRow.id;

  if (nextKeyDocId === startKeyDocId || nextKeyDocId === result.rows[0].id) {
    if (result.rows.length >= query.limit) {
      // queue is saturated with this single doc, double the limit for the next requests to get past it
      query.limit = query.limit * 2;
    } else {
      // this is the last doc, process it and there's no need to continue
      nextKeyDocId = null;
    }
  }

  return { nextKeyDocId, nextKey };
};

const processBatch = async (result) => {
  const rows = {};
  result.rows.forEach(row => {
    if (!rows[row.id]) {
      row.dueDates = [];
      rows[row.id] = row;
    }
    rows[row.id].dueDates.push(moment(row.key[1]).toISOString());
  });

  for (const row of Object.values(rows)) {
    const [doc] = await lineage.hydrateDocs([row.doc]);
    const context = await getTemplateContext(doc);
    const hasUpdatedTasks = updateScheduledTasks(doc, context, row.dueDates);
    if (hasUpdatedTasks) {
      lineage.minify(doc);
      await db.medic.put(doc);
    }
  }
};

const getBatch = async (query, startKey, startKeyDocId) => {
  const queryString = Object.assign({}, query);
  if (startKeyDocId) {
    queryString.startkey_docid = startKeyDocId;
    queryString.startkey = JSON.stringify(startKey);
  }

  const options = {
    baseUrl: db.couchUrl,
    uri: '/_design/medic/_view/messages_by_state',
    qs: queryString,
    json: true
  };

  const result = await request.get(options);
  if (!result.rows?.length) {
    return;
  }

  await processBatch(result);

  const { nextKeyDocId, nextKey } = getNextBatch(result, startKeyDocId, query);
  if (nextKeyDocId) {
    return await getBatch(query, nextKey, nextKeyDocId);
  }
};

module.exports = {
  execute: () => {
    const now = moment(date.getDate());
    const overdue = now.clone().subtract(7, 'days');
    const opts = {
      include_docs: true,
      endkey: JSON.stringify([ 'scheduled', now.valueOf() ]),
      startkey: JSON.stringify([ 'scheduled', overdue.valueOf() ]),
      limit: BATCH_SIZE,
    };

    return getBatch(opts);
  },
  _lineage: lineage,
};
