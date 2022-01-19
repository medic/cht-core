const db = require('../db');
const moment = require('moment');
const uuidV4 = require('uuid').v4;
const logger = require('../logger');
const settingsService = require('../services/settings');
const BATCH_SIZE = 100;

const updateMessage = message => {
  if (message.uuid) {
    // already has the required uuid
    return false;
  }
  message.uuid = uuidV4();
  return true;
};

const updateTask = task => {
  let updated = false;
  if (task.messages &&
      task.messages.length &&
      moment().isBefore(moment(task.due))) {
    task.messages.forEach(task => {
      if (updateMessage(task)) {
        updated = true;
      }
    });
  }
  return updated;
};

const update = row => {
  let updated = false;
  if (
    row.doc &&
    row.doc.type === 'data_record' &&
    row.doc.form &&
    row.doc.scheduled_tasks
  ) {
    row.doc.scheduled_tasks.forEach(task => {
      if (updateTask(task)) {
        updated = true;
      }
    });
  }
  return updated;
};

const runBatch = skip => {
  const options = {
    include_docs: true,
    limit: BATCH_SIZE,
    skip: skip,
  };
  return db.medic.allDocs(options).then(result => {
    logger.info(`Processing ${skip} to (${skip + BATCH_SIZE}) docs of ${result.total_rows} total`);
    const toSave = result.rows.filter(update).map(row => row.doc);
    return db.medic.bulkDocs(toSave).then(() => {
      const nextSkip = skip + BATCH_SIZE;
      if (result.total_rows > nextSkip) {
        return runBatch(nextSkip);
      }
    });
  });
};

module.exports = {
  name: 'add-uuid-to-scheduled-tasks',
  created: new Date(2017, 1, 5),
  run: () => {
    return settingsService.get()
      .then(settings => {
        const schedules = settings.schedules;
        if (
          !schedules ||
          !schedules.length ||
          (schedules.length === 1 && !schedules[0].name)
        ) {
          return;
        }
        return runBatch(0);
      });
  }
};
