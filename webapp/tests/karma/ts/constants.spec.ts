import sinon from 'sinon';
import { assert, expect } from 'chai';

import { POUCHDB_OPTIONS } from '../../../src/ts/constants';

describe('Constants', () => {
  let originalPouchDB;
  let setHeaders;

  beforeEach(() => {
    setHeaders = sinon.stub();
    originalPouchDB = window.PouchDB;
    window.PouchDB = { fetch: sinon.stub() };
  });

  afterEach(() => {
    sinon.restore();
    window.PouchDB = originalPouchDB;
  });

  it('should have correct default values', () => {
    expect(POUCHDB_OPTIONS.local).to.deep.equal({ auto_compaction: true, skip_setup: false });
    expect(POUCHDB_OPTIONS.remote).to.have.all.keys(['skip_setup', 'fetch']);
    expect(POUCHDB_OPTIONS.remote.skip_setup).to.equal(true);
    expect(POUCHDB_OPTIONS.remote.fetch).to.be.a('function');
    expect(POUCHDB_OPTIONS.remote_headers).to.deep.equal({ Accept: 'application/json' });
  });

  describe('fetch()', () => {
    it('should forward remote headers to window fetch', async () => {
      window.PouchDB.fetch.resolves('result');
      const opts = { opt: 's', headers: { set: setHeaders } };
      const url = 'http://user:pass@localhost:6500/db';

      const result = await POUCHDB_OPTIONS.remote.fetch(url, opts);

      expect(result).to.equal('result');
      expect(window.PouchDB.fetch.callCount).to.equal(1);
      expect(window.PouchDB.fetch.args[0]).to.deep.equal([ url, opts ]);
      expect(setHeaders.callCount).to.equal(1);
      expect(setHeaders.calledWith('Accept', 'application/json')).to.equal(true);
    });

    it('should switch to dbinfo endpoint when root url is requested', async () => {
      window.PouchDB.fetch.resolves('result');
      const opts = { headers: { set: setHeaders }};
      const url = 'http://user:pass@localhost:6500/';

      const result = await POUCHDB_OPTIONS.remote.fetch(url, opts);

      expect(result).to.equal('result');
      expect(window.PouchDB.fetch.callCount).to.equal(1);
      expect(window.PouchDB.fetch.args[0]).to.deep.equal([ 'http://user:pass@localhost:6500/dbinfo', opts ]);
    });

    it('should reject if options body exceeds limit', () => {
      const url = 'http://user:pass@localhost:6500/';
      const opts = {
        headers: { set: setHeaders },
        body: { length: 32000001 }
      };

      return POUCHDB_OPTIONS.remote
        .fetch(url, opts)
        .then(() => {
          assert.fail('expected error to be thrown');
        })
        .catch(error => {
          expect(error).to.deep.equal({
            message: 'Payload Too Large',
            code: 413
          });
        });
    });
  });
});
