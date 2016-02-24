describe('XmlForms service', function() {
  'use strict';

  var $injector,
      dbQuery = sinon.stub(),
      Changes = sinon.stub();

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
      $provide.factory('DB', KarmaUtils.mockDB({
        query: dbQuery
      }));
      $provide.factory('Changes', function() {
        return Changes;
      });
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(function(_$injector_) {
      $injector = _$injector_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(dbQuery, Changes);
  });

  it('should get all forms from DB, but only pass on ones with XML attachment', function(done) {
    var expected = [
      mockEnketoDoc('assessment'),
      mockJsonDoc(),
      mockJsonDoc(),
      mockEnketoDoc('referral'),
      mockEnketoDoc('registration'),
    ];
    dbQuery.returns(KarmaUtils.mockPromise(null, { rows: expected }));
    $injector.get('XmlForms')('test', function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.length).to.equal(3);
      chai.expect(actual[0]).to.deep.equal(expected[0].doc);
      chai.expect(actual[1]).to.deep.equal(expected[3].doc);
      chai.expect(actual[2]).to.deep.equal(expected[4].doc);
      done();
    });
  });

  it('returns errors from db.query', function(done) {
    dbQuery.returns(KarmaUtils.mockPromise('boom'));
    $injector.get('XmlForms')('test', function(err) {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('is updated when changes fires', function(done) {
    var original = mockEnketoDoc('registration');
    var update = mockEnketoDoc('visit');
    dbQuery
      .onFirstCall().returns(KarmaUtils.mockPromise(null, { rows: [ original ] }))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, { rows: [ original, update ] }));
    var count = 0;
    $injector.get('XmlForms')('test', function(err, actual) {
      chai.expect(err).to.equal(null);
      if (count === 0) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]).to.deep.equal(original.doc);
        setTimeout(function() {
          Changes.args[0][0].callback();
        });
      } else if (count === 1) {
        chai.expect(actual.length).to.equal(2);
        chai.expect(actual[0]).to.deep.equal(original.doc);
        chai.expect(actual[1]).to.deep.equal(update.doc);
        chai.expect(Changes.callCount).to.equal(1);
        chai.expect(dbQuery.callCount).to.equal(2);
        done();
      } else {
        done('Update fired too many times!');
      }
      count++;
    });
  });

});