var _ = require('underscore'),
    JSZip = require('jszip'),
    childProcess = require('child_process'),
    csv = require('fast-csv'),
    objectPath = require('object-path'),
    moment = require('moment'),
    xmlbuilder = require('xmlbuilder'),
    config = require('../config'),
    db = require('../db'),
    fti = require('./fti');

var createColumnModels = function(values, options) {
  return _.map(values, function(value) {
    return {
      column: value,
      label: config.translate(value, options.locale)
    };
  });
};

var safeStringify = function(obj) {
  try {
    return JSON.stringify(obj);
  } catch(e) {
    return obj;
  }
};

var exportTypes = {
  forms: {
    view: 'data_records',
    index: 'data_records',
    orderBy: '\\reported_date<date>',
    generate: function(rows, options) {

      var userDefinedColumns = !!options.columns;
      var tabs = [];

      if (!userDefinedColumns) {
        options.columns = createColumnModels([
          '_id',
          'patient_id',
          'reported_date',
          'from',
          'contact.name',
          'contact.parent.name',
          'contact.parent.parent.contact.name',
          'contact.parent.parent.name',
          'contact.parent.parent.parent.name'
        ], options);
      }

      // add overview tab
      if (!options.form) {
        if (!userDefinedColumns) {
          options.columns = options.columns.concat(createColumnModels(['form'], options));
        }
        tabs.push({
          name: config.translate('Reports', options.locale),
          columns: options.columns
        });
        var rawColumnNames = _.pluck(options.columns, 'column');
        tabs[0].data = _.map(rows, function(row) {
          return _.map(rawColumnNames, function(column) {
            return formatValue(row.doc, column, options);
          });
        });
      }

      // add individual form tabs
      var byForm = {};
      var columns;
      rows.forEach(function(row) {
        var formCode = row.doc.form;
        if (!byForm[formCode]) {
          var forms = config.get('forms');
          var def = forms && forms[formCode];
          columns = options.columns.concat([]);
          if (def) {
            for (var k in def.fields) {
              if (def.fields.hasOwnProperty(k)) {
                var labels = def.fields[k].labels.short;
                columns.push({
                  column: 'fields.' + k,
                  label: labels[options.locale] || labels.en || k
                });
              }
            }
          }
          var label = def && def.meta && def.meta.label;
          var name = label && label[options.locale] ||
                     label && label.en ||
                     formCode;
          byForm[formCode] = {
            name: name,
            columns: columns,
            rawColumnNames: _.pluck(columns, 'column'),
            data: []
          };
        }
        var tab = byForm[formCode];
        tab.data.push(_.map(tab.rawColumnNames, function(column) {
          return formatValue(row.doc, column, options);
        }));
      });

      return tabs.concat(_.sortBy(_.values(byForm), function(tab) {
        return tab.name.toLowerCase();
      }));
    }
  },
  messages: {
    view: 'data_records',
    index: 'data_records',
    orderBy: '\\reported_date<date>',
    generate: function(rows, options) {
      if (!options.columns) {
        options.columns = createColumnModels([
          '_id',
          'patient_id',
          'reported_date',
          'from',
          'contact.name',
          'contact.parent.name',
          'contact.parent.parent.contact.name',
          'contact.parent.parent.name',
          'contact.parent.parent.parent.name',
          'task.type',
          'task.state',
          'received',
          'scheduled',
          'pending',
          'sent',
          'cleared',
          'muted'
        ], options);
      }
      var model = {
        name: config.translate('Messages', options.locale),
        data: []
      };
      rows.forEach(function(row) {
        model.data = model.data.concat(generateTaskModels(row.doc, options));
      });
      // append headers labels after model generation
      model.columns = options.columns.concat(
        createColumnModels(['Message UUID','Sent By','To Phone','Message Body'], options)
      );
      return [ model ];
    }
  },
  audit: {
    getRecords: function(callback) {
      db.audit.list({
        limit: 1000,
        include_docs: true
      }, callback);
    },
    generate: function(rows, options) {
      if (!options.columns) {
        options.columns = createColumnModels([
          '_id',
          'Type',
          'Timestamp',
          'Author',
          'Action',
          'Document'
        ], options);
      }
      var model = {
        name: config.translate('Audit', options.locale),
        data: [],
        columns: options.columns
      };
      rows.forEach(function(row) {
        _.each(row.doc.history, function(rev) {
          model.data.push([
            row.doc.record_id,
            rev.doc.type,
            formatDate(rev.timestamp, options.timezone),
            rev.user,
            rev.action,
            JSON.stringify(rev.doc)
          ]);
        });
      });
      return [ model ];
    }
  },
  feedback: {
    ddoc: 'medic-client',
    view: 'feedback',
    generate: function(rows, options) {
      options.columns = createColumnModels([
        '_id',
        'reported_date',
        'User',
        'App Version',
        'URL',
        'Info'
      ], options);
      var model = {
        name: config.translate('Feedback', options.locale),
        columns: options.columns
      };
      model.data = _.map(rows, function(row) {
        return [
          row.doc._id,
          formatDate(row.doc.meta.time, options.timezone),
          row.doc.meta.user.name,
          row.doc.meta.version,
          row.doc.meta.url,
          safeStringify(row.doc.info)
        ];
      });
      return [ model ];
    }
  },
  contacts: {
    index: 'contacts',
    orderBy: 'name',
    generate: function(rows, options) {
      return [ {
        name: config.translate('Contacts', options.locale),
        columns: [  ],
        data: _.pluck(rows, 'doc')
      } ];
    }
  },
  logs: {
    lowlevel: true,
    generate: function(callback) {
      var rv = [];
      var child = childProcess.spawn(
        'sudo',
        [ '/boot/print-logs' ],
        { stdio: 'pipe' }
      );
      child.on('exit', function(code) {
        if (code !== 0) {
          return callback(new Error(
            'Log export exited with non-zero status ' + code
          ));
        }
        createLogZip(rv).then(function(content) {
          callback(null, content);
        });
      });
      child.stdout.on('data', function(buffer) {
        rv.push(buffer);
      });
      child.stdin.end();
    }
  }
};

var createLogZip = function(rv) {
  var filename = 'server-logs-' + moment().format('YYYYMMDD') + '.md';
  return new JSZip()
    .file(filename, Buffer.concat(rv))
    .generateAsync({ type: 'nodebuffer', compression: 'deflate' });
};

var normalizeResponse = function(doc, options) {
  return {
    type: config.translate('Automated Reply', options.locale),
    state: 'sent',
    timestamp: doc.reported_date,
    state_history: [{
      state: 'sent',
      timestamp: doc.reported_date
    }],
    messages: doc.responses
  };
};

var normalizeIncoming = function(doc, options) {
  return {
    type: config.translate('sms_message.message', options.locale),
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
var normalizeTasks = function(doc, options) {
  var tasks = [];
  if (doc.responses && doc.responses.length > 0) {
    tasks.push(normalizeResponse(doc, options));
  }
  if (doc.tasks && doc.tasks.length > 0) {
    tasks = tasks.concat(doc.tasks);
  }
  if (doc.scheduled_tasks && doc.scheduled_tasks.length > 0) {
    tasks = tasks.concat(doc.scheduled_tasks);
  }
  if (doc.sms_message && doc.sms_message.message) {
    tasks.push(normalizeIncoming(doc, options));
  }
  return tasks;
};

var getStateDate = function(state, task, history) {
  if (state === 'scheduled' && task.due) {
    return task.due;
  }
  if (history[state]) {
    return history[state];
  }
  if (task.state === state) {
    return task.timestamp;
  }
  return;
};

var formatDate = function(date, tz) {
  if (!date) {
    return '';
  }
  // return in a specified timezone offset
  var result = moment(date);
  if (typeof tz !== 'undefined') {
    result = result.utcOffset(-1 * Number(tz));
  }
  // return in UTC or browser/server preference/default
  return result.format('DD, MMM YYYY, HH:mm:ss Z');
};

var filter = function(task, history, options) {
  var filter = options.filterState;
  if (!filter) {
    return true;
  }
  var state = history[filter.state];
  if (!state) {
    // task hasn't been in the required state
    return false;
  }
  var stateTimestamp = getStateDate(filter.state, task, history);
  if (!stateTimestamp) {
    // task has no timestamp
    return false;
  }
  stateTimestamp = moment(stateTimestamp);
  if (filter.from && stateTimestamp.isBefore(filter.from)) {
    // task is earlier than filter period start
    return false;
  }
  if (filter.to && stateTimestamp.isAfter(filter.to)) {
    // task is later than filter period end
    return false;
  }
  return true;
};

var buildHistory = function(task) {
  var history = {};
  _.each(task.state_history, function(item) {
    history[item.state] = item.timestamp;
  });
  return history;
};

var formatValue = function(doc, column, options) {
  if ('reported_date' === column) {
    return formatDate(doc.reported_date, options.timezone);
  }
  return objectPath.get(doc, column);
};

var generateTaskModels = function(doc, options) {
  var tasks = normalizeTasks(doc, options);
  var genericType = config.translate('Task Message', options.locale);
  var rows = [];
  _.each(tasks, function(task) {

    var history = buildHistory(task);

    if (filter(task, history, options)) {
      var vals = _.map(_.pluck(options.columns, 'column'), function(column) {
        if (_.contains(['received', 'scheduled', 'pending', 'sent', 'cleared', 'muted'], column)) {
          // check the history
          return formatDate(getStateDate(column, task, history), options.timezone);
        }
        if (column === 'task.type') {
          return task.type || genericType;
        }
        if (column.indexOf('task.') === 0) {
          return objectPath.get(task, column.substring(5));
        }
        return formatValue(doc, column, options);
      });

      _.each(task.messages, function(msg) {
        vals = vals.concat([ msg.uuid, msg.sent_by, msg.to, msg.message ]);
      });

      rows.push(vals);
    }

  });

  return rows;
};

var outputToJson = function(options, tabs, callback) {
  // json doesn't support tabs
  callback(null, JSON.stringify(tabs[0].data));
};

var outputToCsv = function(options, tabs, callback) {
  var opts = { headers: true };
  if (options.locale === 'fr') {
    opts.delimiter = ';';
  }

  // csv doesn't support tabs
  var tab = tabs[0];
  var data = tab && tab.data || [];

  if (tab && !options.skipHeader) {
    data.unshift(_.pluck(tab.columns, 'label'));
  }

  csv.writeToString(data, opts, function(err, result) {
    if (err) {
      return callback(err);
    }
    callback(null, result);
  });
};

var outputToXml = function(options, tabs, callback) {
  callback(null, function(write, done) {
    var workbook = xmlbuilder.begin({ allowSurrogateChars: true, allowEmpty: true }, write)
      .dec({ encoding: 'UTF-8' })
      .ele('Workbook')
      .att('xmlns', 'urn:schemas-microsoft-com:office:spreadsheet')
      .att('xmlns:o', 'urn:schemas-microsoft-com:office:office')
      .att('xmlns:x', 'urn:schemas-microsoft-com:office:excel')
      .att('xmlns:html', 'http://www.w3.org/TR/REC-html140')
      .att('xmlns:ss','urn:schemas-microsoft-com:office:spreadsheet')
      .ins('mso-application', 'progid="Excel.Sheet"');

    var row;

    tabs.forEach(function(tab) {
      var table = workbook
        .ele('Worksheet', { 'ss:Name': tab.name })
        .ele('Table');

      if (!options.skipHeader) {
        row = table.ele('Row');
        tab.columns.forEach(function(column) {
          row.ele('Cell').ele('Data', {'ss:Type': 'String'}, column.label);
          row.up().up();
        });
        row.up();
      }

      tab.data.forEach(function(cells) {
        row = table.ele('Row');
        cells.forEach(function(cell) {
          // passing '' as a value creates an opening and closing element: <Foo></Foo>
          // passing nothing or undefined create one closed element: <Foo />
          // Converting empty string to undefined to keep it consistent
          row.ele('Cell').ele('Data', {'ss:Type': 'String'}, cell !== '' ? cell : undefined);
          row.up().up();
        });
        row.up();
      });

      table.up().up();
    });

    workbook.end();
    done();
  });
};

var getRecordsFti = function(type, params, callback) {
  var options = {
    q: params.query,
    schema: params.schema,
    sort: type.orderBy,
    include_docs: true
  };
  fti.get(type.index, options, params.district, callback);
};

var getRecordsView = function(type, params, callback) {
  var districtId = params.district;
  var options = {
    include_docs: true,
    descending: true
  };
  if (params.type === 'messages') {
    if (districtId) {
      options.startkey = [districtId, 9999999999999, {}];
      options.endkey = [districtId, 0];
    } else {
      options.startkey = [9999999999999, {}];
      options.endkey = [0];
    }
  } else if (params.type === 'forms') {
    var form = params.form || '*';
    if (districtId) {
      options.startkey = [true, districtId, form, {}];
      options.endkey = [true, districtId, form, 0];
    } else {
      options.startkey = [true, form, {}];
      options.endkey = [true, form, 0];
    }
  } else if (params.type === 'feedback') {
    options.startkey = [9999999999999, {}];
    options.endkey = [0];
  }
  var actual = type.db || db.medic;
  actual.view(type.ddoc || 'medic', type.view, options, callback);
};

var getRecords = function(type, params, callback) {
  if (_.isFunction(type.getRecords)) {
    return type.getRecords(callback);
  }
  if (params.query) {
    if (!type.index) {
      return callback(new Error('This export cannot handle "query" param'));
    }
    return getRecordsFti(type, params, callback);
  }
  if (!type.view) {
    return callback(new Error('This export must have a "query" param'));
  }
  getRecordsView(type, params, callback);
};

var getOptions = function(params) {
  var options = {
    timezone: params.tz,
    locale: params.locale || 'en',
    form: params.form,
    format: params.format,
    skipHeader: params.skip_header_row
  };
  if (params.filter_state) {
    options.filterState = { state: params.filter_state };
    if (params.filter_state_from) {
      options.filterState.from = moment()
        .add(params.filter_state_from, 'days')
        .startOf('day');
    }
    if (params.filter_state_to) {
      options.filterState.to = moment()
        .add(params.filter_state_to, 'days')
        .endOf('day');
    }
  }

  if (params.columns) {
    var parsedColumns;
    try {
      parsedColumns = JSON.parse(params.columns);
    } catch(e) {
      parsedColumns = [];
    }
    options.columns = createColumnModels(parsedColumns, options);
  }

  return options;
};

module.exports = {
  get: function(params, callback) {
    var type = exportTypes[params.type];
    if (!type) {
      return callback(new Error('Unknown export type'));
    }
    if (!_.isFunction(type.generate)) {
      return callback(new Error('Export type must provide a "generate" method'));
    }
    if (type.lowlevel) {
      return type.generate(callback);
    }

    getRecords(type, params, function(err, response) {
      if (err) {
        return callback(err);
      }

      var options = getOptions(params);
      var tabs = type.generate(response.rows, options);

      if (params.format === 'xml') {
        outputToXml(options, tabs, callback);
      } else if (params.format === 'json') {
        outputToJson(options, tabs, callback);
      } else {
        outputToCsv(options, tabs, callback);
      }

    });
  }
};
