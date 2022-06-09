const { performance } = require('perf_hooks');
const _ = require('lodash');
const moment = require('moment');
const request = require('request-promise-native');

const config = require('../config');
const db = require('../db');
const scheduling = require('../lib/scheduling');
const later = require('later');
const lineage = require('@medic/lineage')(Promise, db.medic);
const logger = require('../lib/logger');
const messages = config.getTransitionsLib().messages;
const contactTypesUtils = require('@medic/contact-types-utils');

const BATCH_SIZE = 1000;

// set later to use local time
later.date.localTime();

const getReminderId = (reminder, scheduledDate, placeId) => {
  return `reminder:${reminder.form}:${scheduledDate.valueOf()}:${placeId}`;
};

const isContactTypeConfigValid = type => {
  return contactTypesUtils.isHardcodedType(type) ||
         contactTypesUtils.getTypeById(config.getAll(), type);

};

const isConfigValid = (reminder) => {
  return Boolean(
    reminder &&
    (reminder.form && typeof reminder.form === 'string') &&
    (reminder.message || reminder.translation_key) &&
    (reminder.text_expression || reminder.cron) &&
    (
      !reminder.contact_types ||
      (reminder.contact_types.length && reminder.contact_types.every(type => isContactTypeConfigValid(type)))
    )
  );
};

const getSchedule = (config) => {
  return later.schedule(scheduling.getSchedule(config));
};

const getReminderWindowStart = (reminder) => {
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
const matchReminder = (reminder) => {
  const schedule = getSchedule(reminder);
  // this will return a moment sometime between the start of the hour and 24 hours ago
  // this is purely for efficiency so we're not always examining a 24 hour stretch
  return getReminderWindowStart(reminder)
    .then(start => {
      // this will return either the previous time the schedule should have run
      // or null if it should not have run in that window.
      const end = moment();
      const previous = schedule.prev(1, end.toDate(), start.toDate());
      // schedule.prev doesn't have a setting to be inclusive or exclusive to the given time frame limits
      // if `getReminderWindowStart` returns the moment when the reminder ran last, we check that `previous` is after
      // this moment, so we don't run the same reminder twice
      return (previous instanceof Date && start.isBefore(previous)) ? moment(previous) : false;
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

const getPlaceIds = (keys, startDocId) => {
  const query = {
    keys,
    limit: BATCH_SIZE
  };

  if (startDocId) {
    query.start_key_doc_id = startDocId;
  }

  // using `request` library because PouchDB doesn't support `start_key_doc_id` in view queries
  // using `start_key_doc_id` because using `skip` is *very* slow
  return request
    .get(`${db.couchUrl}/_design/medic-client/_view/contacts_by_type`, { qs: query, json: true })
    .then(result => result.rows.map(row => row.id));
};

// filter places that do not have this reminder
const getPlaceIdsWithoutReminder = (reminder, scheduledDate, placeIds) => {
  if (!placeIds.length) {
    return [];
  }
  const reminderIds = placeIds.map(id => getReminderId(reminder, scheduledDate, id));
  return db.medic.allDocs({ keys: reminderIds }).then(result => {
    const exists = (row) => row.id && !row.error && row.value && !row.value.deleted;
    return placeIds.filter((id, idx) => !exists(result.rows[idx]));
  });
};

const getPlacesWithoutSentForms = (reminder, scheduledDate, placeIds) => {
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
        if (scheduledDate.isSameOrBefore(lastReceived.add(muteDuration))) {
          const placeId = row.key[1];
          invalidPlaceIds.push(placeId);
        }
      });

      return _.difference(placeIds, invalidPlaceIds);
    });
};

const canSend = (reminder, scheduledDate, place) => {
  if (!place.contact) {
    // nobody to send to
    return false;
  }

  if (place.muted) {
    return false;
  }

  // backwards compatibility: check for reminders created pre-update
  if (place.tasks &&
      place.tasks.some(task => task.form === reminder.form && task.timestamp === scheduledDate.toISOString())) {
    return false;
  }

  return true;
};

const getValidPlaces = (reminder, scheduledDate, placeIds) => {
  if (!placeIds.length) {
    return [];
  }
  return db.medic
    .allDocs({ keys: placeIds, include_docs: true })
    .then(result => {
      const places = result.rows
        .map(row => row.doc)
        .filter(place => canSend(reminder, scheduledDate, place));

      return places;
    });
};

const getValidPlacesBatch = (reminder, scheduledDate, contactsByTypeKeys, startDocId) => {
  return getPlaceIds(contactsByTypeKeys, startDocId).then(placeIds => {
    if (startDocId) {
      placeIds.shift();
    }
    if (!placeIds.length) {
      return { places: [] };
    }
    const nextDocId = placeIds[placeIds.length - 1];
    return getPlaceIdsWithoutReminder(reminder, scheduledDate, placeIds)
      .then(placeIds => getPlacesWithoutSentForms(reminder, scheduledDate, placeIds))
      .then(placeIds => getValidPlaces(reminder, scheduledDate, placeIds))
      .then(places => lineage.hydrateDocs(places))
      .then(places => ({ places, nextDocId }));
  });
};

const createReminder = (reminder, scheduledDate, place) => {
  const context = {
    templateContext: {
      week: scheduledDate.format('w'),
      year: scheduledDate.format('YYYY')
    },
    patient: place
  };

  const reminderDoc = {
    _id: getReminderId(reminder, scheduledDate, place._id ),
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
    task.timestamp = scheduledDate.toISOString();
    task.type = 'reminder';
  }

  return reminderDoc;
};

const getContactsByTypeKeys = reminder => {
  const ids = reminder.contact_types ||
              contactTypesUtils.getLeafPlaceTypes(config.getAll()).map(type => type.id);
  return JSON.stringify(ids.map(id => [ id ]));
};

const sendReminders = (reminder, scheduledDate, startDocId) => {
  const contactsByTypeKeys = getContactsByTypeKeys(reminder);
  return getValidPlacesBatch(reminder, scheduledDate, contactsByTypeKeys, startDocId)
    .then(({ places, nextDocId }) => {
      if (!places || !places.length) {
        return nextDocId;
      }

      const reminderDocs = places.map(place => createReminder(reminder, scheduledDate, place));
      return db.medic
        .bulkDocs(reminderDocs)
        .then(results => {
          const errors = results.filter(result => result.error);
          if (errors.length) {
            logger.error('Errors saving reminders: %o', errors);
            throw new Error('Errors saving reminders');
          }
        })
        .then(() => nextDocId);
    })
    .then(nextDocId => nextDocId && sendReminders(reminder, scheduledDate, nextDocId));
};

const createReminderLog = (reminder, scheduledDate, start) => {
  const duration = performance.now() - start;
  const reminderLog = {
    _id: `reminderlog:${reminder.form}:${scheduledDate.valueOf()}`,
    duration: duration,
    reminder: reminder,
    reported_date: moment().valueOf(),
    type: 'reminderlog',
  };
  logger.debug('Reminder %o succesfully completed in %d seconds', reminder, duration / 1000);
  return db.sentinel.put(reminderLog);
};

const runReminder = (reminder = {}) => {
  // see if the reminder should run in the given window
  return matchReminder(reminder).then(scheduledDate => {
    if (!scheduledDate) {
      return;
    }
    logger.debug('Running reminder %o', reminder);
    const start = performance.now();
    return sendReminders(reminder, scheduledDate).then(() => createReminderLog(reminder, scheduledDate, start));
  });
};

module.exports = {
  // called from schedule/index.js every 5 minutes, for now
  execute: () => {
    const reminders = config.get('reminders') || [];
    return reminders
      .filter(reminder => {
        if (isConfigValid(reminder)) {
          return true;
        }
        logger.warn('Reminder configuration invalid: %o', reminder);
        return false;
      })
      .reduce((p, reminder) => p.then(() => runReminder(reminder)), Promise.resolve());
  },
};
