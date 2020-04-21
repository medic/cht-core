const _ = require('lodash/core');
const messages = require('@medic/message-utils');
const lineageFactory = require('@medic/lineage');
const registrationUtils = require('@medic/registration-utils');

angular
  .module('inboxServices')
  .factory('FormatDataRecord', function(
    $log,
    $q,
    $translate,
    DB,
    FormatDate,
    Language,
    Settings
  ) {
    'ngInject';
    'use strict';

    const lineage = lineageFactory($q, DB());
    const patientFields = ['patient_id', 'patient_uuid', 'patient_name'];

    const getRegistrations = function(patientId) {
      const options = {
        key: patientId,
        include_docs: true,
      };
      return DB()
        .query('medic-client/registered_patients', options)
        .then(function(result) {
          return result.rows.map(function(row) {
            return row.doc;
          });
        });
    };

    const getPatient = function(patientId) {
      const options = { key: ['shortcode', patientId] };
      return DB()
        .query('medic-client/contacts_by_reference', options)
        .then(function(result) {
          if (!result.rows.length) {
            return;
          }
          if (result.rows.length > 1) {
            $log.warn(
              'More than one patient person document for shortcode "' +
                patientId +
                '"'
            );
          }
          return lineage.fetchHydratedDoc(result.rows[0].id);
        });
    };

    const fieldsToHtml = function(
      settings,
      doc,
      keys,
      labels,
      locale,
      data,
      def
    ) {
      if (!def && doc && doc.form) {
        def = getForm(settings, doc.form);
      }

      if (_.isString(def)) {
        def = getForm(settings, def);
      }

      if (!data) {
        data = Object.assign({}, doc, doc.fields);
      }

      const fields = {
        headers: [],
        data: [],
      };


      _.forEach(keys, function(key) {
        if (_.isArray(key)) {
          const result = fieldsToHtml(settings, doc, key[1], labels, locale, data[key[0]], def);
          result.isArray = true;
          fields.data.push(result);
          fields.headers.push({ head: titleize(key[0]) });
        } else {
          const label = labels.shift();
          fields.headers.push({ head: getMessage(settings, label) });
          if (def && def[key]) {
            def = def[key];
          }
          fields.data.push({
            isArray: false,
            value: prettyVal(settings, data, key, def, locale),
            label: label,
            target: getClickTarget(key, doc)
          });
        }
      });

      return fields;
    };

    const getClickTarget = (key, doc) => {
      if (patientFields.includes(key)) {
        const id = (doc.patient && doc.patient._id) ||
                   (doc.fields && doc.fields.patient_uuid);
        if (id) {
          return { url: { route: 'contacts.detail', params: { id } } };
        }
      } else if (key === 'case_id') {
        const id = doc.case_id || doc.fields.case_id;
        if (id) {
          return { filter: `case_id:${id}` };
        }
      }
    };

    /*
     * Get an array of keys from the form.  If dot notation is used it will be an
     * array of arrays.
     *
     * @param Object def - form definition
     *
     * @return Array  - form field keys based on forms definition
     */
    const getFormKeys = function(def) {
      const keys = {};

      const getKeys = function(key, hash) {
        if (key.length > 1) {
          const tmp = key.shift();
          if (!hash[tmp]) {
            hash[tmp] = {};
          }
          getKeys(key, hash[tmp]);
        } else {
          hash[key[0]] = '';
        }
      };

      const hashToArray = function(hash) {
        const array = [];

        _.forEach(hash, function(value, key) {
          if (typeof value === 'string') {
            array.push(key);
          } else {
            array.push([key, hashToArray(hash[key])]);
          }
        });

        return array;
      };

      if (def) {
        Object.keys(def.fields).forEach(function(key) {
          getKeys(key.split('.'), keys);
        });
      }

      return hashToArray(keys);
    };

    const translateKey = function(settings, key, field, locale) {
      let label;
      if (field) {
        label = getMessage(
          settings,
          field.labels && field.labels.short,
          locale
        );
      } else {
        label = translate(settings, key, locale);
      }
      // still haven't found a proper label; then titleize
      if (key === label) {
        return titleize(key);
      } else {
        return label;
      }
    };

    // returns the deepest array from `key`
    const unrollKey = function(array) {
      let target = [].concat(array);
      const root = [];

      while (_.isArray(_.last(target))) {
        root.push(_.first(target));
        target = _.last(target);
      }

      return _.map(target, function(item) {
        return root.concat([item]).join('.');
      });
    };

    /**
     * Return a title-case version of the supplied string.
     * @name titleize(str)
     * @param str The string to transform.
     * @returns {String}
     */
    const titleize = function(s) {
      return s
        .trim()
        .toLowerCase()
        .replace(/([a-z\d])([A-Z]+)/g, '$1_$2')
        .replace(/[-\s]+/g, '_')
        .replace(/_/g, ' ')
        .replace(/(?:^|\s|-)\S/g, function(c) {
          return c.toUpperCase();
        });
    };

    const formatDateField = function(date, field) {
      if (!date) {
        return;
      }
      let formatted;
      let relative;
      if (['child_birth_date', 'birth_date'].includes(field)) {
        formatted = FormatDate.date(date);
        relative = FormatDate.relative(date, { withoutTime: true });
      } else {
        formatted = FormatDate.datetime(date);
        relative = FormatDate.relative(date);
      }
      return formatted + '(' + relative + ')';
    };

    /*
     * @param {Object} data_record - typically a data record or portion (hash)
     * @param {String} key - key for field
     * @param {Object} def - form or field definition
     */
    const prettyVal = function(settings, data_record, key, def, locale) {
      if (
        !data_record ||
        _.isUndefined(key) ||
        _.isUndefined(data_record[key])
      ) {
        return;
      }

      const val = data_record[key];

      if (!def) {
        return val;
      }

      if (def.fields && def.fields[key]) {
        def = def.fields[key];
      }

      if (def.type === 'boolean') {
        return val === true ? 'True' : 'False';
      }
      if (def.type === 'date') {
        return formatDateField(data_record[key], key);
      }
      if (def.type === 'integer') {
        // use list value for month
        if (def.validate && def.validate.is_numeric_month) {
          if (def.list) {
            for (const i in def.list) {
              if (Object.prototype.hasOwnProperty.call(def.list, i)) {
                const item = def.list[i];
                if (item[0] === val) {
                  return translate(settings, item[1], locale);
                }
              }
            }
          }
        }
      }
      return val;
    };

    const translate = function(settings, key, locale, ctx, skipInterpolation) {
      if (_.isObject(key)) {
        return getMessage(settings, key, locale) || key;
      }
      const interpolation = skipInterpolation ? 'no-interpolation' : null;
      // NB: The 5th parameter must be explicitly null to disable sanitization.
      // The result will be sanitized by angular when it's rendered, so using
      // the default sanitization would result in double encoding.
      // Issue: medic/medic#4618
      return $translate.instant(key, ctx, interpolation, locale, null);
    };

    /*
     * With some forms like patient registration, we add additional data to
     * it based on other form submissions.  Form data from other reports is used to
     * create these fields and it is useful to show these new fields in the data
     * records screen/render even though they are not defined in the form.
     */
    const includeNonFormFields = function(settings, doc, formKeys, locale) {
      const fields = [
        'mother_outcome',
        'child_birth_outcome',
        'child_birth_weight',
        'child_birth_date',
        'expected_date',
        'birth_date',
        'patient_id',
        'case_id'
      ];

      const dateFields = ['child_birth_date', 'expected_date', 'birth_date'];

      _.forEach(fields, function(field) {
        const label = translate(settings, field, locale);
        let value = doc[field];

        // Only include the property if we find it on the doc and not as a form
        // key since then it would be duplicated.
        if (!value || formKeys.indexOf(field) !== -1) {
          return;
        }

        if (dateFields.includes(field)) {
          value = formatDateField(value, field);
        }

        doc.fields.data.unshift({
          label,
          value,
          isArray: false,
          generated: true,
          target: getClickTarget(field, doc)
        });

        doc.fields.headers.unshift({
          head: label,
        });
      });
    };

    const getGroupName = function(task) {
      if (task.group) {
        return task.type + ':' + task.group;
      }
      return task.type;
    };

    const getGroupDisplayName = function(settings, task, language) {
      if (task.translation_key) {
        return translate(settings, task.translation_key, language, {
          group: task.group,
        });
      }
      return getGroupName(task);
    };

    /*
     * Fetch labels from translation strings or jsonform object, maintaining order
     * in the returned array.
     *
     * @param Array keys - keys we want to resolve labels for
     * @param String form - form code string
     * @param String locale - locale string, e.g. 'en', 'fr', 'en-gb'
     *
     * @return Array  - form field labels based on forms definition.
     *
     * @api private
     */
    const getLabels = function(settings, keys, form, locale) {
      const def = getForm(settings, form);
      const fields = def && def.fields;

      return _.reduce(
        keys,
        function(memo, key) {
          const field = fields && fields[key];

          if (_.isString(key)) {
            memo.push(translateKey(settings, key, field, locale));
          } else if (_.isArray(key)) {
            _.forEach(unrollKey(key), function(key) {
              const field = fields && fields[key];
              memo.push(translateKey(settings, key, field, locale));
            });
          }

          return memo;
        },
        []
      );
    };

    const getForm = function(settings, code) {
      return settings.forms && settings.forms[code];
    };

    const getMessage = function(settings, value, locale) {
      function _findTranslation(value, locale) {
        if (value.translations) {
          const translation = _.find(value.translations, { locale: locale });
          return translation && translation.content;
        } else {
          // fallback to old translation definition to support
          // backwards compatibility with existing forms
          return value[locale];
        }
      }

      if (!_.isObject(value)) {
        return value;
      }

      let test = false;
      if (locale === 'test') {
        test = true;
        locale = 'en';
      }

      let result =
        // 0) does it have a translation_key
        (value.translation_key &&
          translate(settings, value.translation_key, locale)) ||
        // 1) Look for the requested locale
        _findTranslation(value, locale) ||
        // 2) Look for the default
        value.default ||
        // 3) Look for the English value
        _findTranslation(value, 'en') ||
        // 4) Look for the first translation
        (value.translations &&
          value.translations[0] &&
          value.translations[0].content) ||
        // 5) Look for the first value
        value[_.first(_.keys(value))];

      if (test) {
        result = '-' + result + '-';
      }

      return result;
    };

    const getFields = function(doc, results, values, labelPrefix, depth) {
      if (depth > 3) {
        depth = 3;
      }
      Object.keys(values).forEach(function(key) {
        const value = values[key];
        const label = labelPrefix + '.' + key;
        if (_.isObject(value)) {
          results.push({ label, depth });
          getFields(doc, results, value, label, depth + 1);
        } else {
          const result = {
            label,
            value,
            depth,
            target: getClickTarget(key, doc)
          };

          const filePath = 'user-file/' + label.split('.').slice(1).join('/');
          if (doc &&
              doc._attachments &&
              doc._attachments[filePath] &&
              doc._attachments[filePath].content_type &&
              doc._attachments[filePath].content_type.startsWith('image/')) {
            result.imagePath = filePath;
          }

          results.push(result);
        }
      });
      return results;
    };

    const getDisplayFields = function(doc) {
      // calculate fields to display
      if (!doc.fields) {
        return [];
      }
      const label = 'report.' + doc.form;
      const fields = getFields(doc, [], doc.fields, label, 0);
      const hide = doc.hidden_fields || [];
      hide.push('inputs');
      return _.filter(fields, function(field) {
        return _.every(hide, function(h) {
          const hiddenLabel = label + '.' + h;
          return hiddenLabel !== field.label && field.label.indexOf(hiddenLabel + '.') !== 0;
        });
      });
    };

    const formatXmlFields = function(doc) {
      doc.fields = getDisplayFields(doc);
    };

    const formatJsonFields = function(doc, settings, language) {
      if (!doc.form) {
        return;
      }
      const keys = getFormKeys(getForm(settings, doc.form));
      const labels = getLabels(settings, keys, doc.form, language);
      doc.fields = fieldsToHtml(settings, doc, keys, labels, language);
      includeNonFormFields(settings, doc, keys, language);
    };

    const formatScheduledTasks = function(doc, settings, language, context) {
      doc.scheduled_tasks_by_group = [];
      const groups = {};
      doc.scheduled_tasks.forEach(function(task) {
        // avoid crash if item is falsey
        if (!task) {
          return;
        }

        const copy = _.clone(task);
        const content = {
          translationKey: task.message_key,
          message: task.message,
        };

        if (!copy.messages) {
          // backwards compatibility
          copy.messages = messages.generate(
            settings,
            _.partial(translate, settings, _, _, null, true),
            doc,
            content,
            task.recipient,
            context
          );

          if (messages.hasError(copy.messages)) {
            copy.error = true;
          }
        }

        // timestamp is used for sorting in the frontend
        if (task.timestamp) {
          copy.timestamp = task.timestamp;
        } else if (task.due) {
          copy.timestamp = task.due;
        }

        // translation key used to identify translatable messages
        if (task.message_key) {
          copy.message_key = task.message_key;
        }

        // setup scheduled groups

        const groupName = getGroupName(task);
        let group = groups[groupName];
        if (!group) {
          const displayName = getGroupDisplayName(settings, task, language);
          groups[groupName] = group = {
            group: groupName,
            name: displayName,
            type: task.type,
            number: task.group,
            rows: [],
          };
        }
        group.rows.push(copy);
      });
      Object.keys(groups).forEach(function(key) {
        doc.scheduled_tasks_by_group.push(groups[key]);
      });
    };

    /*
     * Prepare outgoing messages for render. Reduce messages to organize by
     * properties: sent_by, from, state and message.  This helps for easier
     * display especially in the case of bulk sms.
     *
     * messages = [
     *    {
     *       recipients: [
     *          {
     *              to: '+123',
     *              facility: <facility>,
     *              timestamp: <timestamp>,
     *              uuid: <uuid>,
     *          },
     *          ...
     *        ],
     *        sent_by: 'admin',
     *        from: '+998',
     *        state: 'sent',
     *        message: 'good morning'
     *    }
     *  ]
     */
    const formatOutgoingMessages = function(doc) {
      const outgoing_messages = [];
      const outgoing_messages_recipients = [];
      doc.tasks.forEach(function(task) {
        task.messages.forEach(function(msg) {
          const recipient = {
            to: msg.to,
            facility: msg.facility,
            timestamp: task.timestamp,
            uuid: msg.uuid,
          };
          let done = false;
          // append recipient to existing
          outgoing_messages.forEach(function(m) {
            if (
              msg.message === m.message &&
              msg.sent_by === m.sent_by &&
              msg.from === m.from &&
              task.state === m.state
            ) {
              m.recipients.push(recipient);
              outgoing_messages_recipients.push(recipient);
              done = true;
            }
          });
          // create new entry
          if (!done) {
            outgoing_messages.push({
              recipients: [recipient],
              sent_by: msg.sent_by,
              from: msg.from,
              state: task.state,
              message: msg.message,
            });
            outgoing_messages_recipients.push(recipient);
          }
        });
      });
      doc.outgoing_messages = outgoing_messages;
      doc.outgoing_messages_recipients = outgoing_messages_recipients;
    };

    /*
     * Take data record document and return nice formated JSON object.
     */
    const makeDataRecordReadable = function(doc, settings, language, context) {
      const formatted = _.clone(doc);

      if (formatted.content_type === 'xml') {
        formatXmlFields(formatted);
      } else {
        formatJsonFields(formatted, settings, language);
      }

      if (formatted.scheduled_tasks) {
        formatScheduledTasks(formatted, settings, language, context);
      }

      if (formatted.kujua_message) {
        formatOutgoingMessages(formatted);
      }

      return formatted;
    };

    return function(doc) {
      const promises = [Settings(), Language()];
      const patientId = doc.patient_id || (doc.fields && doc.fields.patient_id);
      if (doc.scheduled_tasks && patientId) {
        promises.push(getPatient(patientId));
        promises.push(getRegistrations(patientId));
      }
      return $q.all(promises).then(function(results) {
        const settings = results[0];
        const language = results[1];
        const context = {};
        if (results.length === 4) {
          context.patient = results[2];
          context.registrations = results[3].filter(function(registration) {
            return registrationUtils.isValidRegistration(
              registration,
              settings
            );
          });
        }
        return makeDataRecordReadable(doc, settings, language, context);
      });
    };
  });
