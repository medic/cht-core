import { Injectable, NgZone } from '@angular/core';
import * as _ from 'lodash-es';

import { DbService } from '@mm-services/db.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { LanguageService } from '@mm-services/language.service';
import { SettingsService } from '@mm-services/settings.service';
import { TranslateLocaleService } from '@mm-services/translate-locale.service';

import * as messages from '@medic/message-utils';
import * as registrationUtils from '@medic/registration-utils';

@Injectable({
  providedIn: 'root'
})
export class FormatDataRecordService {
  constructor(
    private dbService:DbService,
    private formatDateService:FormatDateService,
    private languageService:LanguageService,
    private settingsService:SettingsService,
    private translateLocaleService:TranslateLocaleService,
    private ngZone:NgZone,
  ) {
  }

  private readonly patientFields = ['patient_id', 'patient_uuid', 'patient_name'];
  private readonly placeFields = ['place_id'];

  private getRegistrations(shortcode) {
    if (!shortcode) {
      return;
    }

    const options = {
      key: shortcode,
      include_docs: true,
    };
    return this.dbService
      .get()
      .query('medic-client/registered_patients', options)
      .then((result) => {
        return result.rows.map(row => row.doc);
      });
  }

  private fieldsToHtml(
    settings,
    doc,
    keys,
    labels?,
    locale?,
    data?,
    def?
  ) {
    if (!def && doc && doc.form) {
      def = this.getForm(settings, doc.form);
    }

    if (_.isString(def)) {
      def = this.getForm(settings, def);
    }

    if (!data) {
      data = Object.assign({}, doc, doc.fields);
    }

    const fields = {
      headers: [] as { head: any }[],
      data: [] as any[],
    };

    _.forEach(keys, (key) => {
      if (_.isArray(key)) {
        const result:any = this.fieldsToHtml(settings, doc, key[1], labels, locale, data[key[0]], def);
        result.isArray = true;
        fields.data.push(result);
        fields.headers.push({ head: this.titleize(key[0]) });
      } else {
        const label = labels.shift();
        fields.headers.push({ head: this.getMessage(settings, label) });
        if (def && def[key]) {
          def = def[key];
        }
        fields.data.push({
          isArray: false,
          value: this.prettyVal(settings, data, key, def, locale),
          label: label,
          target: this.getClickTarget(key, doc)
        });
      }
    });

    return fields;
  }

  private getClickTarget(key, doc) {
    if (this.patientFields.includes(key)) {
      const id = doc.patient?._id || doc.fields?.patient_uuid;
      if (id) {
        return { url: ['/contacts', id] };
      }
    } else if (key === 'case_id') {
      const id = doc.case_id || doc.fields?.case_id;
      if (id) {
        return { filter: `case_id:${id}` };
      }
    } else if (this.placeFields.includes(key)) {
      const id = doc.place?._id;
      if (id) {
        return { url: ['/contacts', id] };
      }
    }
  }

  /*
    * Get an array of keys from the form.  If dot notation is used it will be an
    * array of arrays.
  *
  * @param Object def - form definition
  *
  * @return Array  - form field keys based on forms definition
  */
  private getFormKeys(def) {
    const keys = {};

    const getKeys = (key, hash) => {
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

    const hashToArray = (hash) => {
      const array: (string | any[])[] = [];

      _.forEach(hash, (value, key) => {
        if (typeof value === 'string') {
          array.push(key);
        } else {
          array.push([key, hashToArray(hash[key])]);
        }
      });

      return array;
    };

    if (def) {
      Object
        .keys(def.fields)
        .forEach((key) => {
          getKeys(key.split('.'), keys);
        });
    }

    return hashToArray(keys);
  }

  private translateKey(settings, key, field, locale) {
    let label;
    if (field) {
      label = this.getMessage(
        settings,
        field.labels && field.labels.short,
        locale
      );
    } else {
      label = this.translate(settings, key, locale);
    }
    // still haven't found a proper label; then titleize
    if (key === label) {
      return this.titleize(key);
    } else {
      return label;
    }
  }

  // returns the deepest array from `key`
  private unrollKey(array) {
    let target: any[] = [].concat(array);
    const root: any[] = [];

    while (_.isArray(_.last(target))) {
      root.push(_.first(target));
      target = _.last(target);
    }

    return _.map(target, (item) => {
      return root.concat([item]).join('.');
    });
  }

  /**
  * Return a title-case version of the supplied string.
  * @name titleize(str)
  * @param str The string to transform.
  * @returns {String}
  */
  private titleize(s) {
    return s
      .trim()
      .toLowerCase()
      .replace(/([a-z\d])([A-Z]+)/g, '$1_$2')
      .replace(/[-\s]+/g, '_')
      .replace(/_/g, ' ')
      .replace(/(?:^|\s|-)\S/g, (c) => {
        return c.toUpperCase();
      });
  }

  private formatDateField(date, field) {
    if (!date) {
      return;
    }
    let formatted;
    let relative;
    if (['child_birth_date', 'birth_date', 'lmp_date', 'expected_date', 'bs_date'].includes(field)) {
      formatted = this.formatDateService.date(date);
      relative = this.formatDateService.relative(date, { withoutTime: true });
    } else {
      formatted = this.formatDateService.datetime(date);
      relative = this.formatDateService.relative(date);
    }
    return formatted + ' (' + relative + ')';
  }

  /*
  * @param {Object} data_record - typically a data record or portion (hash)
  * @param {String} key - key for field
                                  * @param {Object} def - form or field definition
  */
  private prettyVal(settings, data_record, key, def, locale) {
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
    if (['date', 'bsDate', 'bsAggreDate'].includes(def.type)) {
      return this.formatDateField(data_record[key], key);
    }
    if (def.type === 'integer') {
      // use list value for month
      if (def.validate && def.validate.is_numeric_month) {
        if (def.list) {
          for (const i in def.list) {
            if (Object.prototype.hasOwnProperty.call(def.list, i)) {
              const item = def.list[i];
              if (item[0] === val) {
                return this.translate(settings, item[1], locale);
              }
            }
          }
        }
      }
    }
    return val;
  }

  private translate(settings, key, locale?, ctx?, skipInterpolation?) {
    if (_.isObject(key)) {
      return this.getMessage(settings, key, locale) || key;
    }

    return this.translateLocaleService.instant(key, ctx, locale, skipInterpolation);
  }

  /*
    * With some forms like patient registration, we add additional data to
    * it based on other form submissions.  Form data from other reports is used to
    * create these fields and it is useful to show these new fields in the data
    * records screen/render even though they are not defined in the form.
  */
  private includeNonFormFieldsJson (settings, doc, formKeys, locale) {
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

    fields.forEach((field) => {
      let value = doc[field];

      // Only include the property if we find it on the doc and not as a form
      // key since then it would be duplicated.
      if (!value || formKeys.indexOf(field) !== -1) {
        return;
      }

      const label = this.translate(settings, field, locale);
      if (dateFields.includes(field)) {
        value = this.formatDateField(value, field);
      }

      doc.fields.data.unshift({
        label,
        value,
        isArray: false,
        generated: true,
        target: this.getClickTarget(field, doc)
      });

      doc.fields.headers.unshift({
        head: label,
      });
    });
  }

  private includeNonFormFieldsXml(doc, fields) {
    const generatedFields = [
      'patient_id',
      'case_id'
    ];

    generatedFields.forEach((field) => {
      const value = doc[field];
      if (!value) {
        return;
      }
      fields.unshift({
        label: field,
        value,
        generated: true,
        target: this.getClickTarget(field, doc)
      });
    });
  }

  private getGroupName(task) {
    if (task.group) {
      return task.type + ':' + task.group;
    }
    return task.type;
  }

  private getGroupDisplayName(settings, task, language) {
    if (task.translation_key) {
      return this.translate(settings, task.translation_key, language, {
        group: task.group,
      });
    }
    return this.getGroupName(task);
  }

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
  private getLabels(settings, keys, form, locale) {
    const def = this.getForm(settings, form);
    const fields = def && def.fields;

    return _.reduce(
      keys,
      (memo: any[], key) => {
        const field = fields && fields[key];

        if (_.isString(key)) {
          memo.push(this.translateKey(settings, key, field, locale));
        } else if (_.isArray(key)) {
          _.forEach(this.unrollKey(key), (key) => {
            const field = fields && fields[key];
            memo.push(this.translateKey(settings, key, field, locale));
          });
        }

        return memo;
      },
      []
    );
  }

  private getForm(settings, code) {
    return settings.forms && settings.forms[code];
  }

  private getMessage(settings, value:any, locale?) {
    const _findTranslation = (value, locale) => {
      if (value.translations) {
        const translation = _.find(value.translations, { locale: locale });
        return translation && translation.content;
      } else {
        // fallback to old translation definition to support
        // backwards compatibility with existing forms
        return value[locale];
      }
    };

    if (!_.isObject(value)) {
      return value;
    }

    let test = false;
    if (locale === 'test') {
      test = true;
      locale = 'en';
    }

    // todo check why the any cast on top is not enough
    const anyValue:any = value;

    let result =
      // 0) does it have a translation_key
      (anyValue.translation_key &&
        this.translate(settings, anyValue.translation_key, locale)) ||
      // 1) Look for the requested locale
      _findTranslation(value, locale) ||
      // 2) Look for the default
      anyValue.default ||
      // 3) Look for the English value
      _findTranslation(value, 'en') ||
      // 4) Look for the first translation
      (anyValue.translations &&
        anyValue.translations[0] &&
        anyValue.translations[0].content) ||
      // 5) Look for the first value
      value[_.first(_.keys(value))!];

    if (test) {
      result = '-' + result + '-';
    }

    return result;
  }

  private getFields(doc, results, values, labelPrefix, depth) {
    if (depth > 3) {
      depth = 3;
    }
    Object
      .keys(values)
      .forEach((key) => {
        const value = values[key];
        const label = labelPrefix + '.' + key;
        if (_.isObject(value)) {
          results.push({ label, depth });
          this.getFields(doc, results, value, label, depth + 1);
        } else {
          const result:any = {
            label,
            value,
            depth,
            target: this.getClickTarget(key, doc),
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
  }

  private getDisplayFields(doc) {
    // calculate fields to display
    if (!doc.fields) {
      return [];
    }
    const label = 'report.' + doc.form;
    const fields = this.getFields(doc, [], doc.fields, label, 0);
    this.includeNonFormFieldsXml(doc, fields);
    const hide = doc.hidden_fields || [];
    hide.push('inputs');
    return _.filter(fields, (field) => {
      return _.every(hide, (h) => {
        const hiddenLabel = label + '.' + h;
        return hiddenLabel !== field.label && field.label.indexOf(hiddenLabel + '.') !== 0;
      });
    });
  }

  private formatXmlFields(doc) {
    doc.fields = this.getDisplayFields(doc);
  }

  private formatJsonFields(doc, settings, language) {
    if (!doc.form) {
      return;
    }
    const keys = this.getFormKeys(this.getForm(settings, doc.form));
    const labels = this.getLabels(settings, keys, doc.form, language);
    doc.fields = this.fieldsToHtml(settings, doc, keys, labels, language);
    this.includeNonFormFieldsJson(settings, doc, keys, language);
  }

  private formatScheduledTasks(doc, settings, language, context) {
    doc.scheduled_tasks_by_group = [];
    const groups = {};
    doc.scheduled_tasks.forEach((task) => {
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
          (key, locale?) => this.translate(settings, key, locale, null, true),
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

      const groupName = this.getGroupName(task);
      let group = groups[groupName];
      if (!group) {
        const displayName = this.getGroupDisplayName(settings, task, language);
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
    Object.keys(groups).forEach((key) => {
      groups[key].rows_sorted = _.sortBy(groups[key].rows, 'timestamp');
      doc.scheduled_tasks_by_group.push(groups[key]);
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
  private formatOutgoingMessages(doc) {
    const outgoing_messages: {
      recipients: any[];
      sent_by: any;
      from: any;
      state: any;
      message: any;
    }[] = [];
    const outgoing_messages_recipients: Record<string, any>[] = [];
    doc.tasks.forEach((task) => {
      task.messages.forEach((msg) => {
        const recipient = {
          to: msg.to,
          facility: msg.facility,
          timestamp: task.timestamp,
          uuid: msg.uuid,
        };
        let done = false;
        // append recipient to existing
        outgoing_messages.forEach((m) => {
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
  }

  /*
    * Take data record document and return nice formated JSON object.
  */
  private makeDataRecordReadable(doc, settings, language, context) {
    const formatted = _.clone(doc);

    if (formatted.content_type === 'xml') {
      this.formatXmlFields(formatted);
    } else {
      this.formatJsonFields(formatted, settings, language);
    }

    if (formatted.scheduled_tasks) {
      this.formatScheduledTasks(formatted, settings, language, context);
    }

    if (formatted.kujua_message) {
      this.formatOutgoingMessages(formatted);
    }

    return formatted;
  }

  format(doc) {
    return this.ngZone.runOutsideAngular(() => this._format(doc));
  }

  private _format(doc) {
    const patientId = doc.patient_id || doc.fields?.patient_id;
    const placeId = doc.place_id || doc.fields?.place_id;

    return Promise
      .all([
        this.settingsService.get(),
        this.languageService.get(),
        doc.scheduled_tasks && this.getRegistrations(patientId),
        doc.scheduled_tasks && this.getRegistrations(placeId),
      ])
      .then(([ settings, language, patientRegistrations=[], placeRegistrations=[] ]) => {
        const context:any = {};

        if (patientId) {
          context.patient = doc.patient;
          context.registrations = patientRegistrations.filter((registration) => {
            return registrationUtils.isValidRegistration(registration, settings);
          });
        }

        if (placeId) {
          context.place = doc.place;
          context.placeRegistrations = placeRegistrations.filter((registration) => {
            return registrationUtils.isValidRegistration(registration, settings);
          });
        }

        return this.makeDataRecordReadable(doc, settings, language, context);
      });
  }
}

