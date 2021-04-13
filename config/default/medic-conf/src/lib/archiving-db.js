/*
ArchivingDB allows medic-conf to run when API is not available. Instead of making all actions aware of the --archive mode, this "database returns 
mocked response that an empty database would return. Data that would upload to API is saved to disk as an archive. The API uses one such archive when
it starts to deploy a default configuration.

This class implements the interfaces from the PouchDB object which are used by medic-conf actions.
*/
const archiveDocToFile = require('./archive-doc-to-file');

class ArchivingDB {
  constructor(destination) {
    this.destination = destination;
  }

  allDocs() {
    throw Error('not supported in --archive mode');
  }

  bulkDocs(docs) {
    docs.forEach(doc => archiveDocToFile(this.destination, doc._id, doc));
    return Promise.resolve(docs.map(doc => ({ id: doc._id })));
  }

  get couchUrl() {
    return this.destination;
  }

  get() {
    const error = Error('Document does not exist');
    error.status = 404;
    return Promise.reject(error);
  }

  put(doc) {
    archiveDocToFile(this.destination, doc._id, doc);
  }

  query() {
    throw Error('not supported in --archive mode');
  }

  remove() {
    throw Error('not supported in --archive mode');
  }
}

module.exports = ArchivingDB;
