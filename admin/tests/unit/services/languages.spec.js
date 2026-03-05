describe('Languages service', function() {

  'use strict';

  let service;
  let allDocs;

  beforeEach(function() {
    allDocs = sinon.stub();
    module('adminApp');
    module(function($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ allDocs }));
    });
    inject(function(_Languages_) {
      service = _Languages_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(allDocs);
  });

  it('returns all enabled languages', function(done) {
    allDocs.resolves({
      rows: [
        { doc: { code: 'en', name: 'English', generic: {} } },
        { doc: { code: 'es', name: 'Spanish', generic: {} } },
        { doc: { code: 'fr', name: 'French', generic: {} } }
      ]
    });

    service().then(function(result) {
      chai.expect(allDocs.callCount).to.equal(1);
      chai.expect(allDocs.args[0][0]).to.deep.equal({
        start_key: 'messages-',
        end_key: 'messages-\ufff0',
        include_docs: true
      });
      chai.expect(result).to.deep.equal([
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' }
      ]);
      done();
    }).catch(done);
  });

  it('returns empty array when no languages exist', function(done) {
    allDocs.resolves({ rows: [] });

    service().then(function(result) {
      chai.expect(allDocs.callCount).to.equal(1);
      chai.expect(result).to.deep.equal([]);
      done();
    }).catch(done);
  });

  it('rejects when DB query fails', function(done) {
    const error = new Error('DB connection failed');
    allDocs.rejects(error);

    service().then(function() {
      done(new Error('Expected promise to be rejected'));
    }).catch(function(err) {
      chai.expect(err).to.equal(error);
      done();
    });
  });

});
