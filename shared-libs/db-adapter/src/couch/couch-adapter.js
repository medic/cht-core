/**
 * CouchDB adapter that wraps a PouchDB instance.
 *
 * Implements the DatabaseAdapter interface by delegating to PouchDB.
 * A Proxy forwards any property access not explicitly defined here
 * to the underlying PouchDB instance, ensuring full backwards
 * compatibility during the migration period.
 *
 * All delegation methods use rest args (...args) to preserve the
 * exact argument count. PouchDB's internal argument normalization
 * relies on argument count (e.g., detecting optional callbacks),
 * so passing explicit `undefined` parameters breaks it.
 */
class CouchAdapter {
  constructor(pouchDb) {
    this._db = pouchDb;

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        }
        const val = target._db[prop];
        if (typeof val === 'function') {
          return val.bind(target._db);
        }
        return val;
      },
      set(target, prop, value) {
        if (Reflect.has(target, prop)) {
          return Reflect.set(target, prop, value);
        }
        target._db[prop] = value;
        return true;
      },
    });
  }

  get backendType() {
    return 'couchdb';
  }

  get(...args) {
    return this._db.get(...args);
  }

  put(...args) {
    return this._db.put(...args);
  }

  post(...args) {
    return this._db.post(...args);
  }

  remove(...args) {
    return this._db.remove(...args);
  }

  allDocs(...args) {
    return this._db.allDocs(...args);
  }

  bulkDocs(...args) {
    return this._db.bulkDocs(...args);
  }

  bulkGet(...args) {
    return this._db.bulkGet(...args);
  }

  query(...args) {
    return this._db.query(...args);
  }

  changes(...args) {
    return this._db.changes(...args);
  }

  getAttachment(...args) {
    return this._db.getAttachment(...args);
  }

  putAttachment(...args) {
    return this._db.putAttachment(...args);
  }

  info() {
    return this._db.info();
  }

  close() {
    return this._db.close();
  }

  compact() {
    return this._db.compact();
  }

  viewCleanup() {
    return this._db.viewCleanup();
  }

  destroy() {
    return this._db.destroy();
  }
}

module.exports = CouchAdapter;
