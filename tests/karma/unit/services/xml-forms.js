describe('XmlForms service', () => {
  'use strict';

  let $injector,
      dbQuery,
      Changes,
      Auth,
      UserContact,
      contextUtils;

  const mockEnketoDoc = (formInternalId, docId) => {
    return {
      id: docId || 'form-0',
      doc: {
        internalId: formInternalId,
        _attachments: { xml: { something: true } },
      },
    };
  };

  const mockJsonDoc = () => {
    return { doc: { _attachments: {} } };
  };

  beforeEach(() => {
    module('inboxApp');
    dbQuery = sinon.stub();
    Changes = sinon.stub();
    Auth = sinon.stub();
    UserContact = sinon.stub();
    contextUtils = {};
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({
        query: dbQuery
      }));
      $provide.value('Changes', Changes);
      $provide.value('Auth', Auth);
      $provide.value('UserContact', UserContact);
      $provide.value('XmlFormsContextUtils', contextUtils);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(_$injector_ => {
      $injector = _$injector_;
    });
  });

  afterEach(() => {
    KarmaUtils.restore(dbQuery, Changes, Auth, UserContact);
  });

  it('should get all forms from DB, but only pass on ones with XML attachment', done => {
    const given = [
      mockEnketoDoc('assessment'),
      mockJsonDoc(),
      mockJsonDoc(),
      mockEnketoDoc('referral'),
      mockEnketoDoc('registration'),
    ];
    dbQuery.returns(Promise.resolve({ rows: given }));
    UserContact.returns(Promise.resolve());
    const service = $injector.get('XmlForms');
    service('test', (err, actual) => {
      chai.expect(err).to.equal(null);
      chai.expect(actual.length).to.equal(3);
      chai.expect(actual[0]).to.deep.equal(given[0].doc);
      chai.expect(actual[1]).to.deep.equal(given[3].doc);
      chai.expect(actual[2]).to.deep.equal(given[4].doc);
      done();
    });
  });

  it('returns errors from db.query', done => {
    dbQuery.returns(Promise.reject('boom'));
    const service = $injector.get('XmlForms');
    service('test', err => {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('is updated when changes fires', done => {
    const original = mockEnketoDoc('registration');
    const update = mockEnketoDoc('visit');
    dbQuery
      .onFirstCall().returns(Promise.resolve({ rows: [ original ] }))
      .onSecondCall().returns(Promise.resolve({ rows: [ original, update ] }));
    UserContact.returns(Promise.resolve());
    let count = 0;
    const service = $injector.get('XmlForms');
    service('test', (err, actual) => {
      chai.expect(err).to.equal(null);
      if (count === 0) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]).to.deep.equal(original.doc);
        setTimeout(() => {
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

  it('caches xml forms', done => {
    const original = mockEnketoDoc('registration');
    const update = mockEnketoDoc('visit');
    dbQuery
      .onFirstCall().returns(Promise.resolve({ rows: [ original ] }))
      .onSecondCall().returns(Promise.resolve({ rows: [ original, update ] }));
    UserContact.returns(Promise.resolve());
    let count = 0;
    const service = $injector.get('XmlForms');
    service('test', (err, actual) => {
      chai.expect(err).to.equal(null);
      if (count === 0) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]).to.deep.equal(original.doc);
        setTimeout(() => {
          Changes.args[0][0].callback();
        });
      } else if (count === 1) {
        chai.expect(actual.length).to.equal(2);
        chai.expect(actual[0]).to.deep.equal(original.doc);
        chai.expect(actual[1]).to.deep.equal(update.doc);
        chai.expect(Changes.callCount).to.equal(1);
        chai.expect(dbQuery.callCount).to.equal(2);
        service('test-2', (err, actual) => {
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

  it('filter to person forms', done => {
    const given = [
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
    dbQuery.returns(Promise.resolve({ rows: given }));
    UserContact.returns(Promise.resolve());
    const service = $injector.get('XmlForms');
    service('test', { doc: { type: 'person' } }, (err, actual) => {
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

  it('filter to place forms', done => {
    const given = [
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
    dbQuery.returns(Promise.resolve({ rows: given }));
    UserContact.returns(Promise.resolve());
    const service = $injector.get('XmlForms');
    service('test', { doc: { type: 'district_hospital' } }, (err, actual) => {
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

  it('filter with custom function', done => {
    const given = [
      {
        id: 'form-0',
        doc: {
          internalId: 'visit',
          context: {
            expression: '!isBlue(contact) && user.name === "Frank"'
          },
          _attachments: { xml: { something: true } },
        },
      },
      {
        id: 'form-1',
        doc: {
          internalId: 'stock-report',
          context: {
            expression: 'isBlue(contact) && user.name === "Frank"'
          },
          _attachments: { xml: { something: true } },
        },
      }
    ];
    contextUtils = {
      isBlue: contact => {
        return contact.color === 'blue';
      }
    };
    dbQuery.returns(Promise.resolve({ rows: given }));
    UserContact.returns(Promise.resolve({ name: 'Frank' }));
    const service = $injector.get('XmlForms');
    service('test', { doc: { color: 'blue' } }, (err, actual) => {
      try {
        chai.expect(err).to.equal(null);
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]).to.deep.equal(given[0].doc);
        chai.expect(UserContact.callCount).to.equal(1);
        done();
      } catch(e) {
        // don't let assertion errors bubble up to the service again
        console.log(JSON.stringify(e));
        done(e);
      }
    });
  });

  it('filter with custom function and type', done => {
    const given = [
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
    dbQuery.returns(Promise.resolve({ rows: given }));
    UserContact.returns(Promise.resolve());
    const service = $injector.get('XmlForms');
    service('test', { doc: { sex: 'female', type: 'person' } }, (err, actual) => {
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

  it('filter for contact forms', done => {
    const given = [
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
    dbQuery.returns(Promise.resolve({ rows: given }));
    UserContact.returns(Promise.resolve());
    const service = $injector.get('XmlForms');
    service('test', { contactForms: true }, (err, actual) => {
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

  it('filter for non-contact forms', done => {
    const given = [
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
    dbQuery.returns(Promise.resolve({ rows: given }));
    UserContact.returns(Promise.resolve());
    const service = $injector.get('XmlForms');
    service('test', { contactForms: false }, (err, actual) => {
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

  it('filter for user', done => {
    const given = [
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

    dbQuery.returns(Promise.resolve({ rows: given }));
    UserContact.returns(Promise.resolve());
    Auth.withArgs([ 'national_admin', 'district_admin' ]).returns(Promise.reject('no auth'));
    Auth.withArgs([ 'national_admin' ]).returns(Promise.resolve());
    const service = $injector.get('XmlForms');
    service('test', (err, actual) => {
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

  it('ignore context to get full list of available forms', done => {
    const given = [
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
    dbQuery.returns(Promise.resolve({ rows: given }));
    UserContact.returns(Promise.resolve());
    const service = $injector.get('XmlForms');
    service('test', { ignoreContext: true }, (err, actual) => {
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

  it('filter for non-contact forms but ignore context', done => {
    const given = [
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
    dbQuery.returns(Promise.resolve({ rows: given }));
    UserContact.returns(Promise.resolve());
    const service = $injector.get('XmlForms');
    service('test', { ignoreContext: true, contactForms: false }, (err, actual) => {
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

  it('can filter out when no contact selected', done => {
    const given = [
      {
        id: 'visit',
        doc: {
          _id: 'visit',
          internalId: 'visit',
          _attachments: { xml: { something: true } },
          context: {
            expression: '!!contact'
          },
        },
      },
      {
        id: 'registration',
        doc: {
          _id: 'visit',
          internalId: 'visit',
          _attachments: { xml: { something: true } },
          context: {
            expression: '!contact'
          },
        },
      }
    ];
    dbQuery.returns(Promise.resolve({ rows: given }));
    UserContact.returns(Promise.resolve());
    const service = $injector.get('XmlForms');
    service('test', {}, (err, actual) => {
      try {
        chai.expect(err).to.equal(null);
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]).to.deep.equal(given[1].doc);
        done();
      } catch(e) {
        // don't let assertion errors bubble up to the service again
        done(e);
      }
    });
  });

  describe('collect forms', () => {

    const collectForm = {
      id: 'collect',
      doc: {
        _id: 'collect',
        internalId: 'collect',
        _attachments: { xml: { something: true } },
        context: { collect: true },
      }
    };
    const enketoForm = {
      id: 'enketo',
      doc: {
        _id: 'enketo',
        internalId: 'enketo',
        _attachments: { xml: { something: true } },
        context: { },
      }
    };

    it('are excluded by default', done => {
      dbQuery.returns(Promise.resolve({ rows: [ collectForm, enketoForm ] }));
      UserContact.returns(Promise.resolve());
      const service = $injector.get('XmlForms');
      service('test', {}, (err, actual) => {
        chai.expect(err).to.equal(null);
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]._id).to.equal('enketo');
        done();
      });
    });

    it('are returned if includeCollect is true', done => {
      dbQuery.returns(Promise.resolve({ rows: [ collectForm, enketoForm ] }));
      UserContact.returns(Promise.resolve());
      const service = $injector.get('XmlForms');
      service('test', { includeCollect: true }, (err, actual) => {
        chai.expect(err).to.equal(null);
        chai.expect(actual.length).to.equal(2);
        chai.expect(actual[0]._id).to.equal('collect');
        chai.expect(actual[1]._id).to.equal('enketo');
        done();
      });
    });
  });
});
