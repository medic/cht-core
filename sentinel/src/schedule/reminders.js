const config = require('../config');
const messages = config.getTransitionsLib().messages;
const later = require('later');
const moment = require('moment');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const logger = require('../lib/logger');
const _ = require('underscore');
const request = require('request-promise-native');
const { performance } = require('perf_hooks');

const BATCH_SIZE = 1000;

// set later to use local time
later.date.localTime();

const getReminderId = (reminder, date, placeId) => `reminder:${reminder.form}:${date.valueOf()}:${placeId}`;

const isConfigValid = (config) => {
  return Boolean(
    config &&
    (config.form && typeof config.form === 'string') &&
    (config.message || config.translation_key) &&
    (config.text_expression || config.cron)
  );
};

const getSchedule = (config) => {
  // fetch a schedule based on the configuration, parsing it as a "cron"
  // or "text" statement see:
  // http://bunkat.github.io/later/parsers.html
  if (!config) {
    return;
  }
  if (config.text_expression) {
    // text expression takes precedence over cron
    return later.schedule(later.parse.text(config.text_expression));
  }
  if (config.cron) {
    return later.schedule(later.parse.cron(config.cron));
  }
};

const getReminderWindow = (reminder) => {
  const now = moment();
  // at the most, look a day back
  const since = now.clone().startOf('hour').subtract(1, 'day');
  const form = reminder && reminder.form;

  const options = {
    descending: true,
    limit: 1,
    startkey: `reminderlog:${form}:${now.valueOf()}`,
    endkey: `reminderlog:${form}:${since.valueOf()}`
  };

  return db.sentinel.allDocs(options).then(result => {
    if (!result.rows || !result.rows.length) {
      return since;
    }
    const reminderLogTimestamp = result.rows[0].id.split(':')[2];
    return moment(parseInt(reminderLogTimestamp));
  });
};

// matches from "now" to the start of the last hour
// later reverses time ranges fro later#prev searches
const matchReminder = (reminder) => {
  const schedule = getSchedule(reminder);
  // this will return a moment sometime between the start of the hour and 24 hours ago
  // this is purely for efficiency so we're not always examining a 24 hour stretch
  return getReminderWindow(reminder)
    .then(end => {
      // this will return either the previous time the schedule should have run
      // or null if it should not have run in that window.
      const start = moment();
      const previous = schedule.prev(1, start.toDate(), end.toDate());
      return (previous instanceof Date && end.isBefore(previous)) ? moment(previous) : false;
    });
};

// returns strings like "1 day" as a moment.duration
const durationRegex = /^\d+ (minute|day|hour|week)s?$/;
const parseDuration = (format) => {
  if (!durationRegex.test(format)) {
    return;
  }

  const tokens = format.split(' ');
  return moment.duration(Number(tokens[0]), tokens[1]);
};

const getLeafPlaceIds = (startDocId) => {
  const types = config.get('contact_types') || [];
  const placeTypes = types.filter(type => !type.person);
  const leafPlaceTypes = placeTypes.filter(type => {
    return placeTypes.every(inner => !inner.parents || !inner.parents.includes(type.id));
  });
  const keys = leafPlaceTypes.map(type => [ type.id ]);

  const query = {
    limit: BATCH_SIZE,
    keys: JSON.stringify(keys),
    start_key_doc_id: startDocId
  };

  logger.debug('requesting leaf places for keys %o starting with %o', keys, startDocId);
  return request
    .get(`${db.couchUrl}/_design/medic-client/_view/contacts_by_type`, { qs: query, json: true })
    .then(result => result.rows.map(row => row.id));
};

// filter places that do not have this reminder
const filterPlaceIdsWithoutReminder = (reminder, date, placeIds) => {
  if (!placeIds.length) {
    return [];
  }
  const reminderIds = placeIds.map(id => getReminderId(reminder, date, id));
  return db.medic.allDocs({ keys: reminderIds }).then(result => {
    const exists = (row) => row.id && !row.error && row.value && !row.value.deleted;
    return placeIds.filter((id, idx) => !exists(result.rows[idx]));
  });
};

const filterPlacesWithoutSentForms = (reminder, date, placeIds) => {
  if (!placeIds.length) {
    return [];
  }

  if (!reminder.mute_after_form_for) {
    return placeIds;
  }
  const muteDuration = parseDuration(reminder.mute_after_form_for);
  if (!muteDuration) {
    return placeIds;
  }

  const keys = placeIds.map(id => [reminder.form, id]);
  return db.medic
    .query('medic/reports_by_form_and_parent', { keys, group: true })
    .then(results => {
      const invalidPlaceIds = [];
      results.rows.forEach(row => {

        if (!row.value || !row.value.max) {
          return;
        }
        const lastReceived = moment(row.value.max);
        // if it should mute due to being in the mute duration
        if (date.isSameOrBefore(lastReceived.add(muteDuration))) {
          const placeId = row.key[1];
          invalidPlaceIds.push(placeId);
        }
      });

      return _.difference(placeIds, invalidPlaceIds);
    });
};

const canSend = (reminder, date, place) => {
  if (!place.contact) {
    // nobody to send to
    return false;
  }

  if (place.muted) {
    return false;
  }

  // backwards compatibility: check for reminders created pre-update
  if (place.tasks && place.tasks.find(task => task.form === reminder.form && task.timestamp === date.toISOString())) {
    return false;
  }

  return true;
};

const filterValidPlaces = (reminder, date, placeIds) => {
  if (!placeIds.length) {
    return [];
  }
  return db.medic
    .allDocs({ keys: placeIds, include_docs: true })
    .then(result => {
      logger.warn('%o', result);
      const places = result.rows
        .map(row => row.doc)
        .filter(place => canSend(reminder, date, place));

      if (!places.length) {
        return [];
      }

      return lineage.hydrateDocs(places);
    });
};

const getLeafPlaces = (reminder, date, startDocId) => {
  return getLeafPlaceIds(startDocId).then(placeIds => {
    // don't process the same doc twice!
    placeIds = placeIds.filter(id => id !== startDocId);
    if (!placeIds.length) {
      return { places: [] };
    }
    const nextDocId = placeIds[placeIds.length - 1];
    return filterPlaceIdsWithoutReminder(reminder, date, placeIds)
      .then(placeIds => filterPlacesWithoutSentForms(reminder, date, placeIds))
      .then(placeIds => filterValidPlaces(reminder, date, placeIds))
      .then(places => ({ places, nextDocId }));
  });
};

const createReminder = (reminder, date, place) => {
  const context = {
    templateContext: {
      week: date.format('w'),
      year: date.format('YYYY')
    },
    patient: place
  };

  const reminderDoc = {
    _id: getReminderId(reminder, date, place._id ),
    type: 'reminder',
    contact: lineage.minifyLineage(place.contact),
    place: { _id: place._id, parent: lineage.minifyLineage(place.parent) },
    form: reminder.form,
    reported_date: new Date().getTime(),
    tasks: []
  };
  const task = messages.addMessage(reminderDoc, reminder, 'reporting_unit', context);
  if (task) {
    task.form = reminder.form;
    task.timestamp = date.toISOString();
    task.type = 'reminder';
  }

  return reminderDoc;
};

const sendReminders = (reminder, date, startDocId) => {
  return getLeafPlaces(reminder, date, startDocId)
    .then(({ places, nextDocId }) => {
      if (!places || !places.length) {
        return nextDocId;
      }

      const reminderDocs = places.map(place => createReminder(reminder, date, place));
      return db.medic
        .bulkDocs(reminderDocs)
        .then(results => {
          const errors = results.filter(result => result.error);
          if (errors.length) {
            logger.error('Errors saving reminders', errors);
            throw new Error('Errors saving reminders');
          }
        })
        .then(() => nextDocId);
    })
    .then(nextDocId => nextDocId && sendReminders(reminder, date, nextDocId));
};

const createReminderLog = (reminder, date, start) => {
  const duration = performance.now() - start;
  const reminderLog = {
    _id: `reminderlog:${reminder.form}:${date.valueOf()}`,
    reminder: reminder,
    duration: duration,
    reported_date: moment().valueOf()
  };
  logger.debug('Reminder %o succesfully completed in %d', reminder, duration);
  return db.sentinel.put(reminderLog);
};

const runReminder = (reminder = {}) => {
  // see if the reminder should run in the given window
  return matchReminder(reminder).then(date => {
    if (!date) {
      return;
    }
    logger.debug('Running reminder %o', reminder);
    const start = performance.now();
    return sendReminders(reminder, date).then(() => createReminderLog(reminder, date, start));
  });
};

module.exports = {
  // called from schedule/index.js every 5 minutes, for now
  execute: callback => {
    const reminders = config.get('reminders') || [];
    return reminders
      .filter(reminder => isConfigValid(reminder))
      .reduce((p, reminder) => p.then(() => runReminder(reminder)), Promise.resolve())
      .then(() => callback())
      .catch(callback);
  },
};
