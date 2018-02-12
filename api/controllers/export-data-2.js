const _ = require('underscore');

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const DB = new PouchDB(process.env.COUCH_URL);

const { Readable } = require('stream'),
      search = require('search')(Promise, DB);

const SEARCH_BATCH = 100;

const JOIN_COL = ',';
const JOIN_ROW = '\n';

const SUPPORTED_EXPORTS = ['reports'];

const flatten = (fields, prepend=[]) =>
  Object.keys(fields).reduce((acc, k) => {
    const path = [...prepend, k];
    if (typeof fields[k] === 'object' && fields[k]) {
      return _.extend(acc, flatten(fields[k], path));
    } else {
      acc[path.join('.')] = fields[k] || '';
      return acc;
    }
  }, {});

const CSV_MAPPER = {
  reports: (filters) => {
    const forms = (
      filters &&
      filters.forms &&
      filters.forms.selected &&
      _.pluck(filters.forms.selected, 'code'));

    let p = Promise.resolve();
    // If they have not selected any forms we need to get all available ones
    if (!forms) {
      p = p.then(() => {
        // TODO: look at the XmlForms and JsonForms code and use those to work
        //   this out. You may need to pull these out into a shared library,
        //   or just copy what they do.
        console.warn('****************************');
        console.warn('****************************');
        console.warn('Exporting ALL forms is not yet supported');
        console.warn('****************************');
        console.warn('****************************');
        return DB.query('medic-client/forms')
          .then(results => _.pluck(results.rows, 'key'));
        });
    } else {
      p = p.then(() => forms);
    }

    // Determine the fields for each form we care about
    return p.then(forms =>
      Promise.all(forms.map(form =>
        DB.query('medic-client/reports_by_form', {
          key: [form],
          limit: 1,
          include_docs: true
        })
        .then(results =>
          results.rows[0] &&
          results.rows[0].doc &&
          results.rows[0].doc.fields
        ))
      ).then(allFields => {
        const fieldColumns = _.union(
          ...allFields.filter(f => f).map(f => Object.keys(flatten(f)))
        ).sort();

        const allColumns = [
          '_id',
          // TODO: defaults
        ].concat(fieldColumns);

        return {
          header: allColumns,
          fn: record => {
            const flattened = flatten(record.fields);

            return [
              record._id,
              // TODO: defaults
            ].concat(fieldColumns.map(c => flattened[c]));
          }
        };
      }));
  },


  // NB: we don't actually support this (note SUPPORTED_EXPORTS above), it's
  // here in the code to show a simpler examplen than the complicated forms one
  contacts: () => Promise.resolve({
    header: ['id', 'rev', 'name', 'patient_id', 'type'],
    fn: record => [record._id, record._rev, record.name, record.patient_id, record.type]
  })
};

class SearchResultReader extends Readable {

  constructor(type, filters, searchOptions, readableOptions) {
    super(readableOptions);

    this.type = type;
    this.filters = filters;
    this.options = searchOptions || {};

    // There is no reason for a user to pass a skip, but we're going to allow
    // users to pass a limit. This could be useful as an escape hatch / tweak in
    // production.
    this.options.skip = 0;
    this.options.limit = this.options.limit || SEARCH_BATCH;
  }

  _read() {
    let printHeader;

    let p = Promise.resolve();
    if (!this.csvFn) {
      p = p
        .then(() => CSV_MAPPER[this.type](this.filters, this.options))
        .then(({ header, fn }) => {
          this.csvFn = fn;
          printHeader = header;
        });
    }
    p = p
      .then(() => search(this.type, this.filters, this.options))
      .then(ids => {

        if (!ids.length) {
          return this.push(null);
        }

        this.options.skip += this.options.limit;

        return DB.allDocs({
          keys: ids,
          include_docs: true
        })
        .then(results => {
          this.push(
            printHeader ? printHeader.join(JOIN_COL) + JOIN_ROW : '' +
            _.pluck(results.rows, 'doc')
             .map(this.csvFn)
             .map(csvLine => csvLine.join(JOIN_COL))
             .map(lines => lines + JOIN_ROW).join('')
          );
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
  _flatten: flatten
};
