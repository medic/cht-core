describe('XmlForms service', function() {
  'use strict';

  var $injector,
      dbQuery,
      Changes,
      Auth,
      UserContact;

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
    dbQuery = sinon.stub();
    Changes = sinon.stub();
    Auth = sinon.stub();
    UserContact = sinon.stub();
    module(function($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({
        query: dbQuery
      }));
      $provide.factory('Changes', function() {
        return Changes;
      });
      $provide.factory('Auth', function() {
        return Auth;
      });
      $provide.factory('UserContact', function() {
        return UserContact;
      });
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(function(_$injector_) {
      $injector = _$injector_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(dbQuery, Changes, Auth, UserContact);
  });

  it('should get all forms from DB, but only pass on ones with XML attachment', function(done) {
    var given = [
      mockEnketoDoc('assessment'),
      mockJsonDoc(),
      mockJsonDoc(),
      mockEnketoDoc('referral'),
      mockEnketoDoc('registration'),
    ];
    dbQuery.returns(KarmaUtils.mockPromise(null, { rows: given }));
    UserContact.returns(KarmaUtils.mockPromise());
    var service = $injector.get('XmlForms');
    service('test', function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.length).to.equal(3);
      chai.expect(actual[0]).to.deep.equal(given[0].doc);
      chai.expect(actual[1]).to.deep.equal(given[3].doc);
      chai.expect(actual[2]).to.deep.equal(given[4].doc);
      done();
    });
  });

  it('returns errors from db.query', function(done) {
    dbQuery.returns(KarmaUtils.mockPromise('boom'));
    var service = $injector.get('XmlForms');
    service('test', function(err) {
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
    UserContact.returns(KarmaUtils.mockPromise());
    var count = 0;
    var service = $injector.get('XmlForms');
    service('test', function(err, actual) {
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

  it('caches xml forms', function(done) {
    var original = mockEnketoDoc('registration');
    var update = mockEnketoDoc('visit');
    dbQuery
      .onFirstCall().returns(KarmaUtils.mockPromise(null, { rows: [ original ] }))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, { rows: [ original, update ] }));
    UserContact.returns(KarmaUtils.mockPromise());
    var count = 0;
    var service = $injector.get('XmlForms');
    service('test', function(err, actual) {
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
        service('test-2', function(err, actual) {
          chai.expect(actual.length).to.equal(2);
          chai.expect(actual[0]).to.deep.equal(original.doc);
          chai.expect(actual[1]).to.deep.equal(update.doc);
          chai.expect(Changes.callCount).to.equal(1);
          chai.expect(dbQuery.callCount).to.equal(2); // db doesn't get hit again
          done();
        });
      } else {
        done('Update fired too many times!');
      }
      count++;
    });
  });

  it('filter to person forms', function(done) {
    var given = [
      {
        id: 'form-0',
        doc: {
          internalId: 'zero',
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-1',
        doc: {
          internalId: 'one',
          context: {},
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-2',
        doc: {
          internalId: 'two',
          context: { person: true },
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-3',
        doc: {
          internalId: 'three',
          context: { place: true },
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-4',
        doc: {
          internalId: 'four',
          context: { person: true, place: false },
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-5',
        doc: {
          internalId: 'five',
          context: { person: false, place: true },
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-6',
        doc: {
          internalId: 'six',
          context: { person: true, place: true },
          _attachments: { xml: { something: true } },
        },
      },
    ];
    dbQuery.returns(KarmaUtils.mockPromise(null, { rows: given }));
    UserContact.returns(KarmaUtils.mockPromise());
    var service = $injector.get('XmlForms');
    service('test', { doc: { type: 'person' } }, function(err, actual) {
      try {
        chai.expect(err).to.equal(null);
        chai.expect(actual[0]).to.deep.equal(given[0].doc);
        chai.assert.deepEqual(_.pluck(actual, 'internalId'), [
          'zero',
          'one',
          'two',
          'four',
          'six',
        ]);
        done();
      } catch(e) {
        // don't let assertion errors bubble up to the service again
        done(e);
      }
    });
  });

  it('filter to place forms', function(done) {
    var given = [
      {
        id: 'form-0',
        doc: {
          internalId: 'zero',
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-1',
        doc: {
          internalId: 'one',
          context: {},
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-2',
        doc: {
          internalId: 'two',
          context: { person: true },
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-3',
        doc: {
          internalId: 'three',
          context: { place: true },
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-4',
        doc: {
          internalId: 'four',
          context: { person: true, place: false },
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-5',
        doc: {
          internalId: 'five',
          context: { person: false, place: true },
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-6',
        doc: {
          internalId: 'six',
          context: { person: true, place: true },
          _attachments: { xml: { something: true } },
        },
      },
    ];
    dbQuery.returns(KarmaUtils.mockPromise(null, { rows: given }));
    UserContact.returns(KarmaUtils.mockPromise());
    var service = $injector.get('XmlForms');
    service('test', { doc: { type: 'district_hospital' } }, function(err, actual) {
      try {
        chai.expect(err).to.equal(null);
        chai.assert.deepEqual(_.pluck(actual, 'internalId'), [
          'zero',
          'one',
          'three',
          'five',
          'six',
        ]);
        done();
      } catch(e) {
        // don't let assertion errors bubble up to the service again
        done(e);
      }
    });
  });

  it('filter with custom function', function(done) {
    var given = [
      {
        id: 'form-0',
        doc: {
          internalId: 'visit',
          context: {
            expression: 'ageInYears(contact) >= 16 && user.name === "Frank"'
          },
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-1',
        doc: {
          internalId: 'stock-report',
          context: {
            expression: 'ageInYears(contact) >= 18 && user.name === "Frank"'
          },
          _attachments: { xml: { something: true } },
        },
      }
    ];
    dbQuery.returns(KarmaUtils.mockPromise(null, { rows: given }));
    UserContact.returns(KarmaUtils.mockPromise(null, { name: 'Frank' }));
    var service = $injector.get('XmlForms');
    var seventeenYearOldDob = new Date();
    seventeenYearOldDob.setFullYear(seventeenYearOldDob.getFullYear() - 17);
    service('test', { doc: { date_of_birth: seventeenYearOldDob.valueOf() } }, function(err, actual) {
      try {
        chai.expect(err).to.equal(null);
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]).to.deep.equal(given[0].doc);
        chai.expect(UserContact.callCount).to.equal(1);
        done();
      } catch(e) {
        // don't let assertion errors bubble up to the service again
        done(e);
      }
    });
  });

  it('filter with custom function and type', function(done) {
    var given = [
      {
        id: 'form-0',
        doc: {
          internalId: 'visit',
          context: {
            person: true,
            expression: 'contact.sex === "female"'
          },
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-1',
        doc: {
          internalId: 'stock-report',
          context: {
            place: true,
            expression: 'contact.sex === "female"'
          },
          _attachments: { xml: { something: true } },
        },
      }
    ];
    dbQuery.returns(KarmaUtils.mockPromise(null, { rows: given }));
    UserContact.returns(KarmaUtils.mockPromise());
    var service = $injector.get('XmlForms');
    var seventeenYearOldDob = new Date();
    seventeenYearOldDob.setFullYear(seventeenYearOldDob.getFullYear() - 17);
    service('test', { doc: { sex: 'female', type: 'person' } }, function(err, actual) {
      try {
        chai.expect(err).to.equal(null);
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]).to.deep.equal(given[0].doc);
        done();
      } catch(e) {
        // don't let assertion errors bubble up to the service again
        done(e);
      }
    });
  });

  it('filter for contact forms', function(done) {
    var given = [
      {
        id: 'visit',
        doc: {
          _id: 'visit',
          internalId: 'visit',
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form:contact:person',
        doc: {
          _id: 'form:contact:person',
          internalId: 'stock-report',
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form:contact:clinic',
        doc: {
          _id: 'form:contact:clinic',
          internalId: 'registration',
          _attachments: { xml: { something: true } },
        },
      }
    ];
    dbQuery.returns(KarmaUtils.mockPromise(null, { rows: given }));
    UserContact.returns(KarmaUtils.mockPromise());
    var service = $injector.get('XmlForms');
    service('test', { contactForms: true }, function(err, actual) {
      try {
        chai.expect(err).to.equal(null);
        chai.expect(actual.length).to.equal(2);
        chai.expect(actual[0]).to.deep.equal(given[1].doc);
        chai.expect(actual[1]).to.deep.equal(given[2].doc);
        done();
      } catch(e) {
        // don't let assertion errors bubble up to the service again
        done(e);
      }
    });
  });

  it('filter for non-contact forms', function(done) {
    var given = [
      {
        id: 'visit',
        doc: {
          _id: 'visit',
          internalId: 'visit',
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form:contact:person',
        doc: {
          _id: 'form:contact:person',
          internalId: 'stock-report',
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form:contact:clinic',
        doc: {
          _id: 'form:contact:clinic',
          internalId: 'registration',
          _attachments: { xml: { something: true } },
        },
      }
    ];
    dbQuery.returns(KarmaUtils.mockPromise(null, { rows: given }));
    UserContact.returns(KarmaUtils.mockPromise());
    var service = $injector.get('XmlForms');
    service('test', { contactForms: false }, function(err, actual) {
      try {
        chai.expect(err).to.equal(null);
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]).to.deep.equal(given[0].doc);
        done();
      } catch(e) {
        // don't let assertion errors bubble up to the service again
        done(e);
      }
    });
  });

  it('filter for user', function(done) {
    var given = [
      {
        id: 'visit',
        doc: {
          _id: 'visit',
          internalId: 'visit',
          _attachments: { xml: { something: true } },
          context: {
            permission: [ 'national_admin', 'district_admin' ]
          },
        },
      },
      {
        id: 'form:contact:person',
        doc: {
          _id: 'form:contact:person',
          internalId: 'stock-report',
          _attachments: { xml: { something: true } },
          context: {
            permission: [ 'national_admin' ]
          },
        },
      },
      {
        id: 'form:contact:clinic',
        doc: {
          _id: 'form:contact:clinic',
          internalId: 'registration',
          _attachments: { xml: { something: true } },
        },
      }
    ];

    dbQuery.returns(KarmaUtils.mockPromise(null, { rows: given }));
    UserContact.returns(KarmaUtils.mockPromise());
    Auth.withArgs([ 'national_admin', 'district_admin' ]).returns(KarmaUtils.mockPromise('no auth'));
    Auth.withArgs([ 'national_admin' ]).returns(KarmaUtils.mockPromise());
    var service = $injector.get('XmlForms');
    service('test', function(err, actual) {
      try {
        chai.expect(err).to.equal(null);
        chai.expect(actual.length).to.equal(2);
        chai.expect(actual[0]).to.deep.equal(given[1].doc);
        chai.expect(actual[1]).to.deep.equal(given[2].doc);
        chai.expect(Auth.callCount).to.equal(2);
        done();
      } catch(e) {
        // don't let assertion errors bubble up to the service again
        done(e);
      }
    });
  });

  it('ignore context to get full list of available forms', function(done) {
    var given = [
      {
        id: 'visit',
        doc: {
          _id: 'visit',
          internalId: 'visit',
          _attachments: { xml: { something: true } },
          context: {
            permission: [ 'national_admin', 'district_admin' ]
          },
        },
      },
      {
        id: 'form:contact:person',
        doc: {
          _id: 'form:contact:person',
          internalId: 'stock-report',
          _attachments: { xml: { something: true } },
          context: {
            place: true,
            expression: 'false'
          },
        },
      },
      {
        id: 'form:contact:clinic',
        doc: {
          _id: 'form:contact:clinic',
          internalId: 'registration',
          _attachments: { xml: { something: true } },
          context: { person: true },
        },
      }
    ];
    dbQuery.returns(KarmaUtils.mockPromise(null, { rows: given }));
    UserContact.returns(KarmaUtils.mockPromise());
    var service = $injector.get('XmlForms');
    service('test', { ignoreContext: true }, function(err, actual) {
      try {
        chai.expect(err).to.equal(null);
        chai.expect(actual.length).to.equal(3);
        chai.expect(Auth.callCount).to.equal(0);
        done();
      } catch(e) {
        // don't let assertion errors bubble up to the service again
        done(e);
      }
    });
  });

  it('filter for non-contact forms but ignore context', function(done) {
    var given = [
      {
        id: 'visit',
        doc: {
          _id: 'visit',
          internalId: 'visit',
          _attachments: { xml: { something: true } },
          context: {
            permission: [ 'national_admin', 'district_admin' ]
          },
        },
      },
      {
        id: 'form:contact:person',
        doc: {
          _id: 'form:contact:person',
          internalId: 'stock-report',
          _attachments: { xml: { something: true } },
          context: {
            place: true,
            expression: 'false'
          },
        },
      },
      {
        id: 'form:contact:clinic',
        doc: {
          _id: 'form:contact:clinic',
          internalId: 'registration',
          _attachments: { xml: { something: true } },
          context: { person: true },
        },
      }
    ];
    dbQuery.returns(KarmaUtils.mockPromise(null, { rows: given }));
    UserContact.returns(KarmaUtils.mockPromise());
    var service = $injector.get('XmlForms');
    service('test', { ignoreContext: true, contactForms: false }, function(err, actual) {
      try {
        chai.expect(err).to.equal(null);
        chai.expect(actual[0]).to.deep.equal(given[0].doc);
        chai.expect(Auth.callCount).to.equal(0);
        done();
      } catch(e) {
        // don't let assertion errors bubble up to the service again
        done(e);
      }
    });
  });
});
