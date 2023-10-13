const _ = require('lodash');
const objectPath = require('object-path');

const config = require('../config');
const date = require('../date');
const moment = require('moment');
const utils = require('../lib/utils');
const logger = require('../lib/logger');
const messages = require('../lib/messages');
const messageUtils = require('@medic/message-utils');
const mutingUtils = require('../lib/muting_utils');

const isMuted = (contact) => contact.muted || mutingUtils.isMutedInLineage(contact);

/**
 * @param {Object} patient - the report's patient subject
 * @param {Object} place - the report's place subject
 * @returns {boolean}
 * if both patient and place exist, prioritise the patient's muted state over the place's muted state.
 * If neither exist, the schedule should not be muted.
 */
const shouldMuteSchedule = (patient, place) => {
  if (patient) {
    return isMuted(patient);
  }
  if (place) {
    return isMuted(place);
  }
  return false;
};

module.exports = {
  // return [hour, minute, timezone]
  getSendTime: function(send_time) {
    if (!send_time) {
      return [];
    }
    const parts = send_time.split(/\s+/);
    const time = parts[0].split(':');
    const tz = parts[1];
    return [time[0], time[1], tz];
  },
  getOffset: function(offset) {
    const tokens = (offset || '').split(' ');
    const value = tokens[0];
    const unit = tokens[1];

    if (/\d+/.test(value) && /(second|minute|hour|day|week|month|year)s?/.test(unit)) {
      return moment.duration(Number(value), unit);
    } else {
      return false;
    }
  },
  getNextTimes: function(doc, now) {
    const first = _.first(doc.scheduled_tasks) || {};
    const due = first.due || now;
    const times = {};

    if (due && now) {
      _.forEach(['minutes', 'hours', 'days', 'weeks', 'months', 'years'], function(unit) {
        times[unit] = moment(due).diff(now, unit);
      });
    }
    return times;
  },
  alreadyRun: function(doc, name) {
    const scheduled_task = _.find(doc.scheduled_tasks, { name: name });
    const task = _.find(doc.tasks, { name: name });
    return Boolean(scheduled_task || task);
  },
  getScheduleConfig: function(name) {
    let ret;
    _.forEach(config.get('schedules'), function(schedule) {
      if (schedule.name === name) {
        ret = schedule;
      }
    });
    return ret;
  },

  //Take doc and schedule config and setup schedule tasks.
  assignSchedule: (doc, schedule, context={}) => {
    const self = module.exports;
    const { place, patient, patientRegistrations, placeRegistrations } = context;
    const now = moment(date.getDate());
    const muted = shouldMuteSchedule(patient, place);
    const allowedState = muted ? 'muted' : 'scheduled';
    const skipGroups = [];

    // if we  can't find the schedule in config, we're done also if forms
    // mismatch or already run.
    if (!_.isObject(schedule) || self.alreadyRun(doc, schedule.name)) {
      return false;
    }

    let startFrom = schedule.start_from;
    if (typeof startFrom === 'undefined') {
      startFrom = 'reported_date';
    }
    
    const docStart = Array.isArray(startFrom)? objectPath.coalesce(doc, startFrom): objectPath.get(doc, startFrom);

    // if the document does not have the `start_from` property (or its
    // falsey) do nothing; this will be rerun on next document change
    if (typeof docStart === 'undefined') {
      return false;
    }

    // if start_form property is null, we skip schedule creation, but mark transition as complete.
    if (docStart === null) {
      return true;
    }

    const start = moment(docStart);

    _.forEach(schedule.messages, function(msg) {
      let due;
      const locale = utils.getLocale(doc);
      const offset = module.exports.getOffset(msg.offset);
      const send_time = module.exports.getSendTime(msg.send_time);
      const message = messages.getMessage(msg, locale);

      if (skipGroups.includes(msg.group)) {
        return;
      }

      if (offset) {
        due = start.clone().add(offset);
        if (send_time.length >= 2) {
          // set timezone first if specified
          if (typeof send_time[2] !== 'undefined') {
            due.utcOffset(send_time[2]);
          }
          due.hours(send_time[0]);
          due.minutes(send_time[1]);
          // seconds don't matter. force seconds to zero just for
          // easier testing.
          due.seconds(0);
          due.milliseconds(0);
        }
        if (msg.send_day) {
          due.day(msg.send_day);
        }
        // don't schedule messages in the past or empty messages
        if (due < now || !message) {
          if (!schedule.start_mid_group) {
            skipGroups.push(msg.group);
          }
          return;
        }

        try {
          const task = {
            due: due.toISOString(),
            group: msg.group,
            type: schedule.name,
            translation_key: schedule.translation_key,
            message_key: msg.translation_key,
            recipient: msg.recipient
          };
          if (!msg.translation_key) {
            // no translation_key so generate now
            task.messages = messageUtils.generate(
              config.getAll(),
              utils.translate,
              doc,
              msg,
              msg.recipient,
              {
                registrations: patientRegistrations,
                patient: patient,
                placeRegistrations: placeRegistrations,
                place: place,
              }
            );
          }
          const state = messages.isOutgoingAllowed(doc.from) ? allowedState : 'denied';
          utils.setTaskState(task, state);

          doc.scheduled_tasks = doc.scheduled_tasks || [];
          doc.scheduled_tasks.push(task);

        } catch (e) {
          utils.addError(doc, {
            message: e.message + ': ' + msg.message,
            code: 'parse_error'
          });
        }
      } else {
        // bad offset, skip this msg
        logger.error(
          `${msg.offset} cannot be parsed as a valid offset. Skipping this msg of ${schedule.name} schedule.`
        );
      }
    });

    // if more than zero messages added, return true
    return Boolean(doc.scheduled_tasks && doc.scheduled_tasks.length);

  }
};
