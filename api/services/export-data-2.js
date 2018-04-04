const _ = require('underscore'),
      moment = require('moment'),
      objectPath = require('object-path'),
      db = require('../db-pouch'),
      lineage = require('lineage')(Promise, db.medic);

const { Readable } = require('stream'),
      search = require('search')(Promise, db.medic);

const BATCH = 100;

const SUPPORTED_EXPORTS = [ 'reports', 'contacts', 'messages' ];

/**
 * Flattens a given object into an object where the keys are dot-notation
 * paths to the flattened values:
 * {
 *   "foo": {
 *     "bar": "smang"
 *   }
 * }
 *
 * becomes:
 *
 * {
 *   "foo.bar": "smang"
 * }
 */
const flatten = (fields, prepend=[]) => {
  return Object.keys(fields).reduce((acc, k) => {
    const path = [...prepend, k];

    if (typeof fields[k] === 'object' && fields[k] && !Array.isArray(fields[k])) {
      // Recurse into valid objects. We ignore arrays as they are variable
      // length, so you can't generate a stable header out of them. Instead,
      // when we convert them into CSV we JSON.stringify them and treat them as
      // one cell.
      _.extend(acc, flatten(fields[k], path));
    } else {
      acc[path.join('.')] = fields[k];
    }

    return acc;
  }, {});
};

const CSV_MAPPER = {
  reports: (filters) => {
    // Either selected forms or all currently used forms
    const getForms = () => {
      const forms = (
        filters &&
        filters.forms &&
        filters.forms.selected &&
        _.pluck(filters.forms.selected, 'code'));

      if (forms) {
        return Promise.resolve(forms);
      } else {
        return db.medic.query('medic-client/reports_by_form', {group: true})
                .then(results => results.rows.map(r => r.key[0]));
      }
    };

    // Take an array of the fields property of reports and generate a unique
    // list of sorted CSV columns
    const uniqueColumns = allFields => _.union(
      ...allFields.map(f => Object.keys(flatten(f)))
    ).sort();

    return getForms().then(forms =>
      Promise.all(forms.map(form =>
        db.medic.query('medic-client/reports_by_form', {
          key: [form],
          limit: 1,
          include_docs: true,
          reduce: false
        })
        .then(results =>
          results.rows[0] &&
          results.rows[0].doc &&
          results.rows[0].doc.fields
        ))
      ).then(allFields => {
        // Filter on identity as you can select forms that have no reports
        const fieldColumns = uniqueColumns(allFields.filter(_.identity));

        const allColumns = [
          '_id',
          'form',
          'patient_id',
          'reported_date',
          'from',
          'contact.name',
          'contact.parent.name',
          'contact.parent.parent.name',
          'contact.parent.parent.parent.name'
        ].concat(fieldColumns);

        return {
          header: allColumns,
          fn: record => {
            return [[
              record._id,
              record.form,
              record.patient_id,
              formatDate(record.reported_date),
              record.from,
              objectPath.get(record, ['contact', 'name']),
              objectPath.get(record, ['contact', 'parent', 'name']),
              objectPath.get(record, ['contact', 'parent', 'parent', 'name']),
              objectPath.get(record, ['contact', 'parent', 'parent', 'parent', 'name'])
            ].concat(fieldColumns.map(c => objectPath.get(record.fields, c)))];
          }
        };
      }));
  },

  contacts: () => Promise.resolve({
    header: ['id', 'rev', 'name', 'patient_id', 'type'],
    fn: record => [[record._id, record._rev, record.name, record.patient_id, record.type]]
  }),

  messages: () => Promise.resolve({
    header: [
      'id',
      'patient_id',
      'reported_date',
      'from',
      'type',
      'state',
      'received',
      'scheduled',
      'pending',
      'sent',
      'cleared',
      'muted',
      'message_id',
      'sent_by',
      'to_phone',
      'content'
    ],
    fn: record => {
      const tasks = normalizeTasks(record);
      return _.flatten(tasks.map(task => {
        const history = buildHistory(task);
        return task.messages.map(message => [
          record._id,
          record.patient_id,
          formatDate(record.reported_date),
          record.from,
          task.type || 'Task Message',
          task.state,
          getStateDate('received', task, history),
          getStateDate('scheduled', task, history),
          getStateDate('pending', task, history),
          getStateDate('sent', task, history),
          getStateDate('cleared', task, history),
          getStateDate('muted', task, history),
          message.uuid,
          message.sent_by,
          message.to,
          message.message
        ]);
      }), true);
    }
  })
};

const normalizeResponse = doc => {
  return {
    type: 'Automated Reply',
    state: 'sent',
    timestamp: doc.reported_date,
    state_history: [{
      state: 'sent',
      timestamp: doc.reported_date
    }],
    messages: doc.responses
  };
};

const normalizeIncoming = doc => {
  return {
    type: 'Message',
    state: 'received',
    timestamp: doc.reported_date,
    state_history: [{
      state: 'received',
      timestamp: doc.reported_date
    }],
    messages: [{
      sent_by: doc.from,
      message: doc.sms_message.message
    }]
  };
};

/*
  Normalize and combine incoming messages, responses, tasks and
  scheduled_tasks into one array Note, auto responses will likely get
  deprecated soon in favor of sentinel based messages.

  Normalized form:
  {
  type: ['Auto Response', 'Incoming Message', <schedule name>, 'Task Message'],
  state: ['received', 'sent', 'pending', 'muted', 'scheduled', 'cleared'],
  timestamp/due: <date string>,
  messages: [{
      uuid: <uuid>,
      to: <phone>,
      message: <message body>
  }]
  }
*/
const normalizeTasks = doc => {
  let tasks = [];
  if (doc.responses && doc.responses.length > 0) {
    tasks.push(normalizeResponse(doc));
  }
  if (doc.tasks && doc.tasks.length > 0) {
    tasks = tasks.concat(doc.tasks);
  }
  if (doc.scheduled_tasks && doc.scheduled_tasks.length > 0) {
    tasks = tasks.concat(doc.scheduled_tasks);
  }
  if (doc.sms_message && doc.sms_message.message) {
    tasks.push(normalizeIncoming(doc));
  }
  return tasks;
};

const buildHistory = task => {
  const history = {};
  if (task.state_history) {
    task.state_history.forEach(item => {
      history[item.state] = item.timestamp;
    });
  }
  return history;
};

const getStateDate = (state, task, history) => {
  let date;
  if (state === 'scheduled' && task.due) {
    date = task.due;
  } else if (history[state]) {
    date = history[state];
  } else if (task.state === state) {
    date = task.timestamp;
  }
  return formatDate(date);
};

const formatDate = date => {
  if (!date) {
    return '';
  }
  return moment(date).utc().format('DD, MMM YYYY, HH:mm:ss Z');
};

const JOIN_COL = ',';
const JOIN_ROW = '\n';
class SearchResultReader extends Readable {

  constructor(type, filters, searchOptions, readableOptions) {
    super(readableOptions);

    this.type = type;
    this.filters = filters;
    this.options = searchOptions;

    // There is no reason for a user to pass a skip, but we're going to allow
    // users to pass a limit. This could be useful as an escape hatch / tweak in
    // production.
    this.options.skip = 0;
    this.options.limit = this.options.limit || BATCH;
  }

  static csvLineToString(csvLine) {
    const escapedCsvLine = csvLine.map(cell => {
      let escaped;

      // Strings and arrays (because they contain commas, might contain strings
      // etc) need to be quoted and escaped
      if (typeof cell === 'string') {
        escaped = cell.replace(/"/g, '\\"');
      } else if (Array.isArray(cell)) {
        escaped = JSON.stringify(cell).replace(/"/g, '\\"');
      } else {
        // We don't need to escape this
        return cell;
      }

      return `"${escaped}"`;
    });

    return escapedCsvLine.join(JOIN_COL);
  }

  getDocIds() {
    if (this.type === 'messages') {
      return db.medic.query('medic/tasks_messages', this.options)
        .then(result => result.rows)
        .then(rows => rows.map(row => row.id));
    }
    return module.exports._search(this.type, this.filters, this.options);
  }

  _read() {
    if (!this.csvFn) {
      return CSV_MAPPER[this.type](this.filters, this.options)
        .then(({ header, fn }) => {
          this.csvFn = fn;
          this.push(header.join(JOIN_COL) + JOIN_ROW);
        });
    }

    return this.getDocIds()
      .then(ids => {

        if (!ids.length) {
          return this.push(null);
        }

        this.options.skip += this.options.limit;

        return db.medic.allDocs({
          keys: ids,
          include_docs: true
        })
        .then(result => result.rows.map(row => row.doc))
        .then(lineage.hydrateDocs)
        .then(docs => {
          this.push(docs.map(doc => {
            return this.csvFn(doc)
              .map(SearchResultReader.csvLineToString)
              .join(JOIN_ROW);
          }).join(JOIN_ROW) + JOIN_ROW); // new line at the end
        });
      })
      .catch(err => {
        process.nextTick(() => this.emit('error', err));
      });
  }
}

module.exports = {
  export: (type, filters, options) => new SearchResultReader(type, filters, options),
  supportedExports: SUPPORTED_EXPORTS,
  _search: search,
  _flatten: flatten,
  _lineage: lineage
};
