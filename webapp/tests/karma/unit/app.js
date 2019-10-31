let pouchdb_options;
let setHeaders;

describe('POUCHDB_OPTIONS', () => {
  'use strict';

  beforeEach(() => {
    module('inboxApp');
    inject(function ($injector) {
      pouchdb_options = $injector.get('POUCHDB_OPTIONS');
    });
    sinon.stub(window.PouchDB, 'fetch');
    setHeaders = sinon.stub();
  });

  afterEach(() => sinon.restore());

  it('should have default headers', () => {
    chai.expect(pouchdb_options.remote_headers).to.deep.equal({ 'Accept': 'application/json' });
  });

  it('should have correct default values', () => {
    chai.expect(pouchdb_options.local).to.deep.equal({ auto_compaction: true });
    chai.expect(pouchdb_options.remote).to.have.all.keys(['skip_setup', 'fetch']);
    chai.expect(pouchdb_options.remote.skip_setup).to.equal(true);
    chai.expect(pouchdb_options.remote.fetch).to.be.a('function');
  });

  describe('fetch', () => {
    it('should forward remote headers to window fetch', () => {
      window.PouchDB.fetch.returns('result');
      pouchdb_options.remote_headers['medic-replication-id'] = 'aaaa';
      pouchdb_options.remote_headers['ContentType'] = 'html';

      const opts = { opt: 's', headers: { set: setHeaders }};
      const url = 'http://user:pass@localhost:6500/db';

      chai.expect(pouchdb_options.remote.fetch(url, opts)).to.equal('result');
      chai.expect(window.PouchDB.fetch.callCount).to.equal(1);
      chai.expect(window.PouchDB.fetch.args[0]).to.deep.equal([ url, opts ]);
      chai.expect(setHeaders.callCount).to.equal(3);
      chai.expect(setHeaders.calledWith('Accept', 'application/json')).to.equal(true);
      chai.expect(setHeaders.calledWith('medic-replication-id', 'aaaa')).to.equal(true);
      chai.expect(setHeaders.calledWith('ContentType', 'html')).to.equal(true);
    });

    it('should switch to dbinfo endpoint when root url is requested', () => {
      window.PouchDB.fetch.returns('result');
      const opts = { headers: { set: setHeaders }};
      chai.expect(pouchdb_options.remote.fetch('http://user:pass@localhost:6500/', opts)).to.equal('result');
      chai.expect(window.PouchDB.fetch.callCount).to.equal(1);
      chai.expect(window.PouchDB.fetch.args[0]).to.deep.equal([ 'http://user:pass@localhost:6500/dbinfo', opts ]);
    });
  });


});
