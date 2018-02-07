const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const db = new PouchDB(process.env.COUCH_URL);

const { Readable } = require('stream'),
      search = require('search')(Promise, db);

const BATCH = 1000;

class SearchResultReader extends Readable {

  constructor(type, filters, searchOptions, readableOptions) {
    super(readableOptions);

    this.type = type;
    this.filters = filters;
    this.options = searchOptions;

    this.more = true;
  }

  _read() {
    if (!this.more) {
      return this.push(null);
    }

    this.more = false;
    search(this.type, this.filters, this.options)
      .then(ids => {
        console.log('IDS', JSON.stringify(ids, null, 2));

        // TODO: write this so we stream the ids back in BATCH amounts
        // TODO: resolve into documents
        // TODO: convert into a CSV
        // TODO: stream the above process, including searching in pages
        // TODO: pipe through a zip creation?
        this.push(JSON.stringify(ids, null, 2));
      })
      .catch(err => {
        process.nextTick(() => this.emit('error', err));
      });
  }
}

module.exports = {
  export: (type, filters, options) =>
    new SearchResultReader(type, filters, options)
};
