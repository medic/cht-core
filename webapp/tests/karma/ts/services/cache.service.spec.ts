import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { ChangesService } from '@mm-services/changes.service';
import { CacheService } from '@mm-services/cache.service';

describe('Cache Service', () => {
  let service:CacheService;
  let changesCallback;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ChangesService, useValue: { subscribe: (options) => changesCallback = options.callback } },
      ]
    });

    service = TestBed.inject(CacheService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns errors from get', (done) => {
    service.register({ get: (callback) => {
        callback('boom');
      }})((err) => {
      expect(err).to.equal('boom');
      done();
    });
  });

  it('returns errors from get', (done) => {
    service.register({ get: (callback) => {
        callback('boom');
      }})((err) => {
      expect(err).to.equal('boom');
      done();
    });
  });

  it('returns results from get', (done) => {
    const docs = [ { _id: 1 } ];
    service.register({ get: (callback) => {
        callback(null, docs);
      }})((err, results) => {
      expect(err).to.equal(null);
      expect(results).to.deep.equal(docs);
      done();
    });
  });

  it('calls multiple callbacks', (done) => {
    const docs = [ { _id: 1 } ];
    let callback;
    let count = 0;
    const cache = service.register({ get: (_callback) => {
        callback = _callback;
      }});
    const ass = (err, results) => {
      expect(err).to.equal(null);
      expect(results).to.deep.equal(docs);
      count++;
      if (count === 2) {
        done();
      }
    };
    cache(ass);
    cache(ass);
    callback(null, docs);
  });

  it('caches the result', (done) => {
    const docs = [ { _id: 1 } ];
    let callback;
    let count = 0;
    const cache = service.register({ get: (_callback) => {
        callback = _callback;
      }});
    const ass = (err, results) => {
      expect(err).to.equal(null);
      expect(results).to.deep.equal(docs);
      count++;
      if (count === 3) {
        done();
      }
    };
    cache(ass);
    cache(ass);
    callback(null, docs);
    cache(ass);
  });

  it('invalidates the cache on doc update', (done) => {
    const initial = [ { _id: 1, name: 'gareth' } ];
    const updated = [ { _id: 1, name: 'alex' } ];
    let count = 0;
    const cache = service.register({
      get: (callback) => {
        if (count === 0) {
          callback(null, initial);
        } else if (count === 1) {
          callback(null, updated);
        } else {
          expect(true).to.equal(false);
        }
        count++;
      },
      invalidate: () => {
        return true;
      }
    });
    cache((err, results) => {
      expect(err).to.equal(null);
      expect(results).to.deep.equal(initial);
    });
    changesCallback({ id: 1, changes: [ { rev: '5-xyz' } ] });
    cache((err, results) => {
      expect(err).to.equal(null);
      expect(results).to.deep.equal(updated);
      done();
    });
  });

  it('invalidates the cache on new doc', (done) => {
    const newDoc = { _id: 2, name: 'alex' };
    const initial = [ { _id: 1, name: 'gareth' } ];
    const updated = [ { _id: 1, name: 'gareth' }, newDoc ];
    let count = 0;
    const cache = service.register({
      get: (callback) => {
        if (count === 0) {
          callback(null, initial);
        } else if (count === 1) {
          callback(null, updated);
        } else {
          expect(true).to.equal(false);
        }
        count++;
      },
      invalidate: (change) => {
        return change.id === newDoc._id;
      }
    });
    cache((err, results) => {
      expect(err).to.equal(null);
      expect(results).to.deep.equal(initial);
    });
    changesCallback({ id: newDoc._id, doc: newDoc });
    setTimeout(() => {
      cache((err, results) => {
        expect(err).to.equal(null);
        expect(results).to.deep.equal(updated);
        done();
      });
    });
  });

  it('does not invalidate the cache when filter fails', (done) => {
    const newDoc = { _id: 2, name: 'alex' };
    const initial = [ { _id: 1, name: 'gareth' } ];
    let count = 0;
    const cache = service.register({
      get: (callback) => {
        if (count === 0) {
          callback(null, initial);
        } else {
          expect(true).to.equal(false);
        }
        count++;
      },
      invalidate: (change) => {
        return change.id !== newDoc._id;
      }
    });
    cache((err, results) => {
      expect(err).to.equal(null);
      expect(results).to.deep.equal(initial);
    });
    changesCallback({
      id: newDoc._id,
      changes: [ { rev: '1-xyz' } ],
      doc: newDoc
    });
    setTimeout(() => {
      cache((err, results) => {
        expect(err).to.equal(null);
        expect(results).to.deep.equal(initial);
        done();
      });
    });
  });

});
