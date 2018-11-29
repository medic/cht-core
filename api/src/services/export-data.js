var _ = require('underscore'),
  csv = require('fast-csv'),
  moment = require('moment'),
  xmlbuilder = require('xmlbuilder'),
  config = require('../config'),
  db = require('../db-nano'),
  dbPouch = require('../db-pouch'),
  lineage = require('lineage')(Promise, dbPouch.medic);

var createColumnModels = function(values, options) {
  return _.map(values, function(value) {
    return {
      column: value,
      label: config.translate(value, options.locale),
    };
  });
};

var safeStringify = function(obj) {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return obj;
  }
};

var exportTypes = {
  feedback: {
    ddoc: 'medic-admin',
    view: 'feedback',
    generate: function(rows, options) {
      options.columns = createColumnModels(
        ['_id', 'reported_date', 'User', 'App Version', 'URL', 'Info'],
        options
      );
      var model = {
        name: config.translate('Feedback', options.locale),
        columns: options.columns,
      };
      model.data = _.map(rows, function(row) {
        return [
          row.doc._id,
          formatDate(row.doc.meta.time, options.timezone),
          row.doc.meta.user.name,
          row.doc.meta.version,
          row.doc.meta.url,
          safeStringify(row.doc.info),
        ];
      });
      return [model];
    },
  },
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
  var data = (tab && tab.data) || [];

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
  callback(null, function(write, done, flush) {
    var workbook = xmlbuilder
      .begin({ allowSurrogateChars: true, allowEmpty: true }, data => {
        write(data);
        flush();
      })
      .dec({ encoding: 'UTF-8' })
      .ele('Workbook')
      .att('xmlns', 'urn:schemas-microsoft-com:office:spreadsheet')
      .att('xmlns:o', 'urn:schemas-microsoft-com:office:office')
      .att('xmlns:x', 'urn:schemas-microsoft-com:office:excel')
      .att('xmlns:html', 'http://www.w3.org/TR/REC-html140')
      .att('xmlns:ss', 'urn:schemas-microsoft-com:office:spreadsheet')
      .ins('mso-application', 'progid="Excel.Sheet"');

    var row;

    tabs.forEach(function(tab) {
      var table = workbook
        .ele('Worksheet', { 'ss:Name': tab.name })
        .ele('Table');

      if (!options.skipHeader) {
        row = table.ele('Row');
        tab.columns.forEach(function(column) {
          row.ele('Cell').ele('Data', { 'ss:Type': 'String' }, column.label);
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
          row
            .ele('Cell')
            .ele(
              'Data',
              { 'ss:Type': 'String' },
              cell !== '' ? cell : undefined
            );
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

const hydrate = (type, rows, callback) => {
  if (type.hydrate) {
    return type.hydrate(rows, callback);
  }
  callback(null, rows);
};

var getRecords = function(type, params, callback) {
  if (_.isFunction(type.getRecords)) {
    return type.getRecords(callback);
  }
  if (!type.view) {
    return callback(new Error('This export must have a "query" param'));
  }
  const options = {
    include_docs: true,
    descending: true,
    startkey: [9999999999999, {}],
    endkey: [0],
  };
  db.medic.view(type.ddoc || 'medic', type.view, options, (err, response) => {
    if (err) {
      return callback(err);
    }
    hydrate(type, response.rows, err => callback(err, response));
  });
};

var getOptions = function(params) {
  var options = {
    timezone: params.tz,
    locale: params.locale || 'en',
    form: params.form,
    format: params.format,
    skipHeader: params.skip_header_row,
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
    } catch (e) {
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
      return callback({ code: 404 });
    }
    if (!_.isFunction(type.generate)) {
      return callback(
        new Error('Export type must provide a "generate" method')
      );
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
  },
  _lineage: lineage,
};
