const { Readable } = require('stream');

const BATCH = 100;

const MAPPERS = {
  dhis: require('./export/dhis'),
  reports: require('./export/report-mapper'),
  contacts: require('./export/contact-mapper'),
  messages: require('./export/message-mapper'),
  feedback: require('./export/feedback-mapper'),
  'user-devices': require('./export/user-devices'),
};

const joinLine = (csvLine) => csvLine.join(',') + '\n';

const csvLineToString = (csvLine) => {
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

  return joinLine(escapedCsvLine);
};

class SearchResultReader extends Readable {

  constructor(type, filters, searchOptions, readableOptions) {
    super(readableOptions);

    this.filters = filters;
    this.options = searchOptions;
    this.mapper = MAPPERS[type];

    // There is no reason for a user to pass a skip, but we're going to allow
    // users to pass a limit. This could be useful as an escape hatch / tweak in
    // production.
    this.options.skip = 0;
    this.options.limit = this.options.limit || BATCH;
  }

  _read() {
    if (!this.getRows) {
      return this.mapper.map(this.filters, this.options)
        .then(({ header, getRows }) => {
          this.getRows = getRows;
          this.push(joinLine(header));
        });
    }

    return this.mapper.getDocIds(this.options, this.filters)
      .then(ids => {

        if (!ids.length) {
          return this.push(null);
        }

        this.options.skip += this.options.limit;

        return this.mapper.getDocs(ids)
          .then(docs => {
            const lines = docs.map(doc => {
              return this.getRows(doc).map(csvLineToString).join('');
            });
            this.push(lines.join(''));
          });
      })
      .catch(err => {
        process.nextTick(() => this.emit('error', err));
      });
  }
}

const format = type => ['dhis', 'user-devices'].includes(type) ? 'json' : 'csv';

module.exports = {
  exportStream: (type, filters, options) => new SearchResultReader(type, filters, options),
  exportObject: (type, filters, options) => MAPPERS[type](filters, options),
  isSupported: type => !!MAPPERS[type],
  permission: type => {
    const typeToPermissionMap = {
      contacts: 'can_export_contacts',
      dhis2: 'can_export_dhis',
      feedback: 'can_export_feedback',
      messages: 'can_export_messages',
      reports: 'can_export_messages',
      'user-devices': 'can_export_devices_details',
    };

    const permission = typeToPermissionMap[type];
    if (!permission) {
      throw Error('invalid program exception: missing permission for type');
    }
    return permission;
  },
  format,
  _mapper: type => MAPPERS[type]
};
