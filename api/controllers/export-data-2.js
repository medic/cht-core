const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const db = new PouchDB(process.env.COUCH_URL);

const { Readable } = require('stream'),
      search = require('search')(Promise, db);

const SEARCH_BATCH = 1000;

class SearchResultReader extends Readable {

  constructor(type, filters, searchOptions, readableOptions) {
    super(readableOptions);

    this.type = type;
    this.filters = filters;
    this.options = searchOptions;

    // TODO: do we want people to be able to specify this externally?
    //       Skip doesn't make any sense, but being able to define your own
    //       batch size might be useful for debugging / getting out of sticky
    //       situations in prod
    this.options.skip = 0;
    this.options.limit = SEARCH_BATCH;

    this.tempRound = 10;
  }

  _read() {
    search(this.type, this.filters, this.options)
      .then(ids => {
        if (!ids.length || this.tempRound === 0) {
          return this.push(null);
        }

        this.tempRound -= 1;
        this.options.skip += SEARCH_BATCH;

        // TODO: determine CSV mapper:
        //       Contacts - fn to run over each batch
        //       Reports - needs bootup fn to work out what rows are required,
        //         which in turn returns a fn to run over each batch
        // TODO: resolve into documents
        // TODO: convert into a CSV
        this.push(ids.join('\n') + '\n');
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
