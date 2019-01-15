var _ = require('underscore'),
  messages = require('@shared-libs/message-utils'),
  lineageFactory = require('lineage'),
  registrationUtils = require('@shared-libs/registration-utils');

angular
  .module('inboxServices')
  .factory('FormatDataRecord', function(
    $log,
    $q,
    $translate,
    DB,
    Language,
    Settings,
    FormatDate
  ) {
    'ngInject';
    'use strict';

    var lineage = lineageFactory($q, DB());
    const patient_fields = ['patient_id', 'patient_uuid', 'patient_name'];

    var getRegistrations = function(patientId) {
      var options = {
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

    var getPatient = function(patientId) {
      var options = { key: ['shortcode', patientId] };
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

    var fieldsToHtml = function(
      settings,
      keys,
      labels,
      data_record,
      def,
      locale
    ) {
      if (!def && data_record && data_record.form) {
        def = getForm(settings, data_record.form);
      }

      if (_.isString(def)) {
        def = getForm(settings, def);
      }

      var fields = {
        headers: [],
        data: [],
      };

      var data = _.extend({}, data_record, data_record.fields);

      _.each(keys, function(key) {
        if (_.isArray(key)) {
          fields.headers.push({ head: titleize(key[0]) });
          fields.data.push(
            _.extend(fieldsToHtml(key[1], labels, data[key[0]], def, locale), {
              isArray: true,
            })
          );
        } else {
          var label = labels.shift();
          fields.headers.push({ head: getMessage(settings, label) });
          if (def && def[key]) {
            def = def[key];
          }
          fields.data.push({
            isArray: false,
            value: prettyVal(settings, data, key, def, locale),
            label: label,
            hasUrl: patient_fields.includes(key)
          });
        }
      });

      return fields;
    };

    /*
     * Get an array of keys from the form.  If dot notation is used it will be an
     * array of arrays.
     *
     * @param Object def - form definition
     *
     * @return Array  - form field keys based on forms definition
     */
    var getFormKeys = function(def) {
      var keys = {};

      var getKeys = function(key, hash) {
        if (key.length > 1) {
          var tmp = key.shift();
          if (!hash[tmp]) {
            hash[tmp] = {};
          }
          getKeys(key, hash[tmp]);
        } else {
          hash[key[0]] = '';
        }
      };

      var hashToArray = function(hash) {
        var array = [];

        _.each(hash, function(value, key) {
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

    var translateKey = function(settings, key, field, locale) {
      var label;
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
    var unrollKey = function(array) {
      var target = [].concat(array),
        root = [];

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
    var titleize = function(s) {
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

    var formatDateField = function(date, field) {
      if (!date) {
        return;
      }
      var formatted;
      var relative;
      if (_.contains(['child_birth_date', 'birth_date'], field)) {
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
    var prettyVal = function(settings, data_record, key, def, locale) {
      if (
        !data_record ||
        _.isUndefined(key) ||
        _.isUndefined(data_record[key])
      ) {
        return;
      }

      var val = data_record[key];

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
            for (var i in def.list) {
              if (def.list.hasOwnProperty(i)) {
                var item = def.list[i];
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

    var translate = function(settings, key, locale, ctx, skipInterpolation) {
      if (_.isObject(key)) {
        return getMessage(settings, key, locale) || key;
      }
      var interpolation = skipInterpolation ? 'no-interpolation' : null;
      // NB: The 5th parameter must be explicitely null to disable sanitization.
      // The result will be sanitized by angular when it's rendered, so using
      // the default sanitization would result in double encoding.
      // Issue: medic/medic-webapp#4618
      return $translate.instant(key, ctx, interpolation, locale, null);
    };

    /*
     * With some forms like ORPT (patient registration), we add additional data to
     * it based on other form submissions.  Form data from other reports is used to
     * create these fields and it is useful to show these new fields in the data
     * records screen/render even though they are not defined in the form.
     */
    var includeNonFormFields = function(settings, doc, form_keys, locale) {
      var fields = [
        'mother_outcome',
        'child_birth_outcome',
        'child_birth_weight',
        'child_birth_date',
        'expected_date',
        'birth_date',
        'patient_id',
      ];

      var dateFields = ['child_birth_date', 'expected_date', 'birth_date'];

      _.each(fields, function(field) {
        var label = translate(settings, field, locale),
          value = doc[field];

        // Only include the property if we find it on the doc and not as a form
        // key since then it would be duplicated.
        if (!value || form_keys.indexOf(field) !== -1) {
          return;
        }

        if (_.contains(dateFields, field)) {
          value = formatDateField(value, field);
        }

        doc.fields.data.unshift({
          label: label,
          value: value,
          isArray: false,
          generated: true,
          hasUrl: patient_fields.includes(field)
        });

        doc.fields.headers.unshift({
          head: label,
        });
      });
    };

    var getGroupName = function(task) {
      if (task.group) {
        return task.type + ':' + task.group;
      }
      return task.type;
    };

    var getGroupDisplayName = function(settings, task, language) {
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
    var getLabels = function(settings, keys, form, locale) {
      var def = getForm(settings, form),
        fields = def && def.fields;

      return _.reduce(
        keys,
        function(memo, key) {
          var field = fields && fields[key];

          if (_.isString(key)) {
            memo.push(translateKey(settings, key, field, locale));
          } else if (_.isArray(key)) {
            _.each(unrollKey(key), function(key) {
              var field = fields && fields[key];
              memo.push(translateKey(settings, key, field, locale));
            });
          }

          return memo;
        },
        []
      );
    };

    var getForm = function(settings, code) {
      return settings.forms && settings.forms[code];
    };

    var getMessage = function(settings, value, locale) {
      function _findTranslation(value, locale) {
        if (value.translations) {
          var translation = _.findWhere(value.translations, { locale: locale });
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

      var test = false;
      if (locale === 'test') {
        test = true;
        locale = 'en';
      }

      var result =
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

    /*
     * Take data record document and return nice formated JSON object.
     */
    var makeDataRecordReadable = function(doc, settings, language, context) {
      var formatted = _.clone(doc);

      // adding a fields property for ease of rendering code
      if (formatted.form && formatted.content_type !== 'xml') {
        var keys = getFormKeys(getForm(settings, formatted.form));
        var labels = getLabels(settings, keys, formatted.form, language);
        formatted.fields = fieldsToHtml(
          settings,
          keys,
          labels,
          formatted,
          language
        );
        includeNonFormFields(settings, formatted, keys, language);
      }

      if (formatted.scheduled_tasks) {
        formatted.scheduled_tasks_by_group = [];
        var groups = {};
        formatted.scheduled_tasks.forEach(function(t) {
          // avoid crash if item is falsey
          if (!t) {
            return;
          }

          var copy = _.clone(t);
          var content = {
            translationKey: t.message_key,
            message: t.message,
          };

          if (!copy.messages) {
            // backwards compatibility
            copy.messages = messages.generate(
              settings,
              _.partial(translate, settings, _, _, null, true),
              doc,
              content,
              t.recipient,
              context
            );
          }

          // timestamp is used for sorting in the frontend
          if (t.timestamp) {
            copy.timestamp = t.timestamp;
          } else if (t.due) {
            copy.timestamp = t.due;
          }

          // translation key used to identify translatable messages
          if (t.message_key) {
            copy.message_key = t.message_key;
          }

          // setup scheduled groups

          var groupName = getGroupName(t);
          var displayName = getGroupDisplayName(settings, t, language);
          var group = groups[groupName];
          if (!group) {
            groups[groupName] = group = {
              group: groupName,
              name: displayName,
              type: t.type,
              number: t.group,
              rows: [],
            };
          }
          group.rows.push(copy);
        });
        Object.keys(groups).forEach(function(key) {
          formatted.scheduled_tasks_by_group.push(groups[key]);
        });
      }

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
      if (formatted.kujua_message) {
        var outgoing_messages = [],
          outgoing_messages_recipients = [];
        _.each(formatted.tasks, function(task) {
          _.each(task.messages, function(msg) {
            var recipient = {
              to: msg.to,
              facility: msg.facility,
              timestamp: task.timestamp,
              uuid: msg.uuid,
            };
            var done = false;
            // append recipient to existing
            _.each(outgoing_messages, function(m) {
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
        formatted.outgoing_messages = outgoing_messages;
        formatted.outgoing_messages_recipients = outgoing_messages_recipients;
      }

      return formatted;
    };

    return function(doc) {
      var promises = [Settings(), Language()];
      var patientId = doc.patient_id || (doc.fields && doc.fields.patient_id);
      if (doc.scheduled_tasks && patientId) {
        promises.push(getPatient(patientId));
        promises.push(getRegistrations(patientId));
      }
      return $q.all(promises).then(function(results) {
        var settings = results[0];
        var language = results[1];
        var context = {};
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
