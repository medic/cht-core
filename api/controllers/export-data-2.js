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

const CSV_MAPPER = {
  forms: (filters, options) => {
    // TODO: determine what CSV mapping strategy we need based on what forms we have
    //
    // for now just…
    return CSV_MAPPER.contacts();
  },
  contacts: () => Promise.resolve({
    header: ['id', 'rev'],
    fn: record => [record._id, record._rev/*, ...*/]
  })
};

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
    this.options.limit = this.options.limit || SEARCH_BATCH;
  }

  _read() {
    const thisTime = Math.random();
    console.log('======================');
    console.log(this.filters, this.options, thisTime);

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
        console.log(ids, thisTime);
        console.log('======================');

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
  export: (type, filters, options) =>
    new SearchResultReader(type, filters, options),
  supportedExports: ['forms', 'contacts']
};
