var _ = require('underscore'),
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
    name: 'Reports',
    view: 'data_records',
    columns: function(options) {
      var base = createColumnModels(['_id','patient_id','reported_date','from','related_entities.clinic.contact.name','related_entities.clinic.name','related_entities.clinic.parent.contact.name','related_entities.clinic.parent.name','related_entities.clinic.parent.parent.name'], options);
      if (options.form) {
        var def = config.get('forms')[options.form];
        for (var k in def.fields) {
          var labels = def.fields[k].labels.short;
          base.push({
            column: k,
            label: labels[options.locale] || labels.en || k
          });
        }
        return base;
      }
      return base.concat(createColumnModels(['form'], options));
    },
    modelGenerator: function(rows, options) {
      return _.map(rows, function(row) {
        return _.map(_.pluck(options.columns, 'column'), function(column) {
          return formatValue(row.doc, column, options);
        });
      });
    }
  },
  messages: {
    name: 'Messages',
    view: 'data_records',
    columns: function(options) {
      return createColumnModels(['_id','patient_id','reported_date','from','related_entities.clinic.contact.name','related_entities.clinic.name','related_entities.clinic.parent.contact.name','related_entities.clinic.parent.name','related_entities.clinic.parent.parent.name','task.type','task.state','received','scheduled','pending','sent','cleared','muted'], options);
    },
    appendedHeaders: function(options) {
      return _.map(
        ['Message UUID','Sent By','To Phone','Message Body'],
        _.partial(config.translate, _, options.locale)
      );
    },
    modelGenerator: function(rows, options) {
      var models = [];
      rows.forEach(function(row) {
        models = models.concat(generateTaskModels(row.doc, options));
      });
      return models;
    }
  },
  audit: {
    name: 'Audit',
    view: 'audit_records_by_doc',
    columns: function(options) {
      return createColumnModels(['_id','Type','Timestamp','Author','Action','Document'], options);
    },
    modelGenerator: function(rows, options) {
      var models = [];
      rows.forEach(function(row) {
        _.each(row.doc.history, function(rev) {
          models.push([
            row.doc.record_id,
            rev.doc.type,
            formatDate(rev.timestamp, options.timezone),
            rev.user,
            rev.action,
            JSON.stringify(rev.doc)
          ]);
        });
      });
      return models;
    }
  },
  feedback: {
    name: 'Feedback',
    view: 'feedback',
    columns: function(options) {
      return createColumnModels(['_id','reported_date','User','App Version','URL','Info','Log'], options);
    },
    modelGenerator: function(rows, options) {
      return _.map(rows, function(row) {
        return [
          row.doc._id,
          formatDate(row.doc.meta.time, options.timezone),
          row.doc.meta.user.name,
          row.doc.meta.version,
          row.doc.meta.url,
          safeStringify(row.doc.info),
          safeStringify(row.doc.log)
        ];
      });
    }
  }
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
    result = result.zone(Number(tz));
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

var outputToCsv = function(options, type, data, callback) {
  var opts = { headers: true };
  if (options.locale === 'fr') {
    opts.delimiter = ';';
  }
  csv.writeToString(data, opts, function(err, data) {
    if (err) {
      return callback(err);
    }
    callback(null, data);
  });
};

var outputToXml = function(options, type, data, callback) {

  var worksheetName = config.translate(type.name, options.locale);

  var table = xmlbuilder.create('ss:Workbook')
    .att('xmlns', 'urn:schemas-microsoft-com:office:spreadsheet')
    .att('xmlns:o', 'urn:schemas-microsoft-com:office:office')
    .att('xmlns:x', 'urn:schemas-microsoft-com:office:excel')
    .att('xmlns:html', 'http://www.w3.org/TR/REC-html140')
    .att('xmlns:ss','urn:schemas-microsoft-com:office:spreadsheet')
    .ele('Worksheet', { 'ss:Name': worksheetName })
    .ele('Table');

  data.forEach(function(cells) {
    var row = table.ele('Row');
    cells.forEach(function(header) {
      row.ele('Cell').ele('Data', {'ss:Type': 'String'}, header);
    });
  });

  callback(null, table.end());
};

var getRecordsFti = function(params, callback) {
  var options = {
    q: params.query,
    schema: params.schema,
    sort: '\\reported_date<date>',
    include_docs: true
  };
  fti.get('data_records', options, params.district, callback);
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
  db.getView(type.view, options, callback);
};

var getRecords = function(type, params, callback) {
  if (params.query) {
    return getRecordsFti(params, callback);
  }
  getRecordsView(type, params, callback);
};

module.exports = {
  get: function(params, callback) {
    var type = exportTypes[params.type];
    if (!type) {
      return callback('Unknown export type');
    }
    if (params.columns) {
      try {
        params.columns = JSON.parse(params.columns);
      } catch(e) {
        return callback(e);
      }
    }
    getRecords(type, params, function(err, response) {
      if (err) {
        return callback(err);
      }

      var options = {
        timezone: params.tz,
        locale: params.locale || 'en'
      };

      if (params.columns) {
        options.columns = createColumnModels(params.columns, options);
      } else {
        options.columns = type.columns({ form: params.form, locale: options.locale });
      }

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

      var data = type.modelGenerator(response.rows, options);

      if (!params.skip_header_row) {
        // translate headers
        var headers = _.pluck(options.columns, 'label');
        if (type.appendedHeaders) {
          headers = headers.concat(type.appendedHeaders(options));
        }
        data.unshift(headers);
      }

      var outputFn = params.format === 'xml' ? outputToXml : outputToCsv;
      outputFn(options, type, data, callback);

    });
  }
};
