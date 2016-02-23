describe('XmlForms service', function() {
  'use strict';

  var service,
      $rootScope,
      dbQuery = sinon.stub();

  var mockEnketoDoc = function(formInternalId, docId) {
    return {
      id: docId || 'form-0',
      doc: {
        internalId: formInternalId,
        _attachments: { xml: { something: true } },
      },
    };
  };

  var mockJsonDoc = function() {
    return { doc: { _attachments: {} } };
  };

  beforeEach(function() {
    module('inboxApp');
    module(function($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ query: dbQuery }));
    });
    inject(function(_XmlForms_, _$rootScope_) {
      service = _XmlForms_;
      $rootScope = _$rootScope_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(dbQuery);
  });

  it('should get all forms from DB, but only pass on ones with XML attachment', function(done) {
    // given
    var expected = [
      mockEnketoDoc(),
      mockJsonDoc(),
      mockJsonDoc(),
      mockEnketoDoc(),
      mockEnketoDoc(),
    ];
    dbQuery.returns(KarmaUtils.mockPromise(null, { rows: expected }));
    service()
      .then(function(actual) {
        chai.expect(actual.length).to.equal(3);
        chai.expect(actual[0]).to.deep.equal(expected[0].doc);
        chai.expect(actual[1]).to.deep.equal(expected[3].doc);
        chai.expect(actual[2]).to.deep.equal(expected[4].doc);
        done();
      })
      .catch(done);
    setTimeout(function() {
      $rootScope.$apply();
    });
  });
});