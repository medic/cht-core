describe('XmlForms service', () => {
  'use strict';

  let $injector;
  let dbGet;
  let dbQuery;
  let Changes;
  let hasAuth;
  let UserContact;
  let getContactType;
  let contextUtils;
  let error;

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
    dbGet = sinon.stub();
    Changes = sinon.stub();
    hasAuth = sinon.stub();
    UserContact = sinon.stub();
    getContactType = sinon.stub();
    error = sinon.stub();
    contextUtils = {};
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({
        query: dbQuery,
        get: dbGet
      }));
      $provide.value('Changes', Changes);
      $provide.value('Auth', { has: hasAuth });
      $provide.value('UserContact', UserContact);
      $provide.value('XmlFormsContextUtils', contextUtils);
      $provide.value('ContactTypes', { get: getContactType });
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('$log', {error: error});
    });
    inject(_$injector_ => {
      $injector = _$injector_;
    });
  });

  afterEach(() => {
    KarmaUtils.restore(dbQuery, Changes, hasAuth, UserContact);
  });

  describe('list', () => {

    it('should get all forms from DB, but only pass on ones with XML attachment', () => {
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
      return service.list().then(actual => {
        chai.expect(actual.length).to.equal(3);
        chai.expect(actual[0]).to.deep.equal(given[0].doc);
        chai.expect(actual[1]).to.deep.equal(given[3].doc);
        chai.expect(actual[2]).to.deep.equal(given[4].doc);
      });
    });

    it('returns forms that have an xml file extension', () => {
      const given = [
        {
          id: 'form-1',
          doc: {
            internalId: 'one',
            _attachments: {
              'image': { something: true },
              'form.xml': { something: true }
            },
          },
        },
        {
          id: 'form-2',
          doc: {
            internalId: 'two',
            _attachments: {
              'image': { something: true },
              'xml': { something: true }
            },
          },
        },
        {
          id: 'form-3',
          doc: {
            internalId: 'three',
            _attachments: {
              'image': { something: true },
              'notxml': { something: true }
            },
          },
        }
      ];
      dbQuery.returns(Promise.resolve({ rows: given }));
      UserContact.returns(Promise.resolve());
      const service = $injector.get('XmlForms');
      return service.list().then(actual => {
        chai.expect(actual.length).to.equal(2);
        chai.expect(actual[0]).to.deep.equal(given[0].doc);
        chai.expect(actual[1]).to.deep.equal(given[1].doc);
      });
    });

    it('returns errors from db.query', done => {
      dbQuery.returns(Promise.reject('boom'));
      const service = $injector.get('XmlForms');
      service.list('test')
        .then(() => {
          done(new Error('Expected error to be thrown'));
        })
        .catch(err => {
          chai.expect(err).to.equal('boom');
          done();
        });
    });

    it('filter to person forms', () => {
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
      getContactType.resolves({ person: true });
      return service.list({ doc: { type: 'person' } }).then(actual => {
        chai.expect(actual[0]).to.deep.equal(given[0].doc);
        chai.assert.deepEqual(_.map(actual, 'internalId'), [
          'zero',
          'one',
          'two',
          'four',
          'six',
        ]);
      });
    });

    it('filter to place forms', () => {
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
      getContactType.resolves({ person: false });
      return service.list({ doc: { type: 'district_hospital' } }).then(actual => {
        chai.assert.deepEqual(_.map(actual, 'internalId'), [
          'zero',
          'one',
          'three',
          'five',
          'six',
        ]);
      });
    });

    it('filter with custom function', () => {
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
      getContactType.resolves({ person: false });
      return service.list({ doc: { color: 'blue' } }).then(actual => {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]).to.deep.equal(given[0].doc);
        chai.expect(UserContact.callCount).to.equal(1);
      });
    });

    it('filter with custom function and type', () => {
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
      getContactType.resolves({ person: true });
      return service.list({ doc: { sex: 'female', type: 'person' } }).then(actual => {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]).to.deep.equal(given[0].doc);
      });
    });

    it('broken custom functions log clean errors and count as filtered', () => {
      const given = [
        {
          id: 'form-0',
          doc: {
            _id: 'form-0',
            internalId: 'visit',
            context: {
              expression: 'contact.sex ==== "female"' // <-- typo!
            },
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-1',
          doc: {
            _id: 'form-1',
            internalId: 'stock-report',
            context: {
              expression: 'contact.sex === "female"'
            },
            _attachments: { xml: { something: true } },
          },
        }
      ];
      dbQuery.returns(Promise.resolve({ rows: given }));
      UserContact.returns(Promise.resolve());
      const service = $injector.get('XmlForms');
      getContactType.resolves({ person: true });
      return service.list({ doc: { sex: 'female' } }).then(actual => {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]).to.deep.equal(given[1].doc);
        chai.expect(error.callCount).to.equal(1);
        chai.expect(error.args[0][0]).to.equal('Unable to evaluate expression for form: form-0');
      });
    });

    it('filter for contact forms', () => {
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
      return service.list({ contactForms: true }).then(actual => {
        chai.expect(actual.length).to.equal(2);
        chai.expect(actual[0]).to.deep.equal(given[1].doc);
        chai.expect(actual[1]).to.deep.equal(given[2].doc);
      });
    });

    it('filter for non-contact forms', () => {
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
      return service.list({ contactForms: false }).then(actual => {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]).to.deep.equal(given[0].doc);
      });
    });

    it('filter for user', () => {
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
      hasAuth.withArgs([ 'national_admin', 'district_admin' ]).resolves(false);
      hasAuth.withArgs([ 'national_admin' ]).resolves(true);
      const service = $injector.get('XmlForms');
      return service.list().then(actual => {
        chai.expect(actual.length).to.equal(2);
        chai.expect(actual[0]).to.deep.equal(given[1].doc);
        chai.expect(actual[1]).to.deep.equal(given[2].doc);
        chai.expect(hasAuth.callCount).to.equal(2);
      });
    });

    it('ignore context to get full list of available forms', () => {
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
      return service.list({ ignoreContext: true }).then(actual => {
        chai.expect(actual.length).to.equal(3);
        chai.expect(hasAuth.callCount).to.equal(0);
      });
    });

    it('filter for non-contact forms but ignore context', () => {
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
      return service.list({ ignoreContext: true, contactForms: false }).then(actual => {
        chai.expect(actual[0]).to.deep.equal(given[0].doc);
        chai.expect(hasAuth.callCount).to.equal(0);
      });
    });

    it('can filter out when no contact selected', () => {
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
      return service.list().then(actual => {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0]).to.deep.equal(given[1].doc);
      });

    });

  });

  describe('listen', () => {

    it('is updated when changes fires', done => {
      const original = mockEnketoDoc('registration');
      const update = mockEnketoDoc('visit');
      dbQuery
        .onFirstCall().returns(Promise.resolve({ rows: [ original ] }))
        .onSecondCall().returns(Promise.resolve({ rows: [ original, update ] }));
      UserContact.returns(Promise.resolve());
      let count = 0;
      const service = $injector.get('XmlForms');
      service.listen('test', (err, actual) => {
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
      service.listen('test', (err, actual) => {
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
          service.listen('test-2', (err, actual) => {
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

      it('are excluded by default', () => {
        dbQuery.returns(Promise.resolve({ rows: [ collectForm, enketoForm ] }));
        UserContact.returns(Promise.resolve());
        const service = $injector.get('XmlForms');
        return service.list().then(actual => {
          chai.expect(actual.length).to.equal(1);
          chai.expect(actual[0]._id).to.equal('enketo');
        });
      });

      it('are returned if includeCollect is true', () => {
        dbQuery.returns(Promise.resolve({ rows: [ collectForm, enketoForm ] }));
        UserContact.returns(Promise.resolve());
        const service = $injector.get('XmlForms');
        return service.list({ includeCollect: true }).then(actual => {
          chai.expect(actual.length).to.equal(2);
          chai.expect(actual[0]._id).to.equal('collect');
          chai.expect(actual[1]._id).to.equal('enketo');
        });
      });
    });

  });

  describe('get', () => {

    it('gets valid form by id with "xml" attachment', () => {
      const internalId = 'birth';
      const expected = {
        type: 'form',
        _attachments: { xml: { stub: true } }
      };
      dbQuery.returns(Promise.resolve([]));
      dbGet.resolves(expected);
      const service = $injector.get('XmlForms');
      return service.get(internalId).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
        chai.expect(dbGet.callCount).to.equal(1);
        chai.expect(dbGet.args[0][0]).to.equal(`form:${internalId}`);
      });
    });

    it('gets valid form by id with ".xml" file extension', () => {
      const internalId = 'birth';
      const expected = {
        type: 'form',
        _attachments: { 'something.xml': { stub: true } }
      };
      dbGet.resolves(expected);
      dbQuery.returns(Promise.resolve([]));
      const service = $injector.get('XmlForms');
      return service.get(internalId).then(actual => {
        chai.expect(actual).to.equal(expected);
      });
    });

    it('returns error when cannot find xform attachment', done => {
      const internalId = 'birth';
      const expected = {
        type: 'form',
        _attachments: { 'something.txt': { stub: true } }
      };
      dbGet.resolves(expected);
      dbQuery.returns(Promise.resolve([]));
      const service = $injector.get('XmlForms');
      service.get(internalId)
        .then(() => {
          done(new Error('expected error to be thrown'));
        })
        .catch(err => {
          chai.expect(err.message).to.equal(`The form "${internalId}" doesn't have an xform attachment`);
          done();
        });
    });

    it('falls back to using view if no doc found', () => {
      const internalId = 'birth';
      const expected = {
        internalId,
        _attachments: { 'something.xml': { stub: true } }
      };
      dbGet.returns(Promise.reject({ status: 404 }));
      dbQuery.resolves({ rows: [
        { doc: expected },
        { doc: { internalId: 'death', _attachments: { 'something.xml': { stub: true } } } }
      ] });
      const service = $injector.get('XmlForms');
      return service.get(internalId).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
        chai.expect(dbQuery.callCount).to.equal(1);
        chai.expect(dbQuery.args[0][0]).to.equal(`medic-client/doc_by_type`);
        const options = dbQuery.args[0][1];
        chai.expect(options.include_docs).to.equal(true);
        chai.expect(options.key).to.deep.equal(['form']);
      });
    });

    it('query fails if multiple forms found', done => {
      const internalId = 'birth';
      const expected = {
        internalId,
        _attachments: { 'something.xml': { stub: true } }
      };
      dbGet.returns(Promise.reject({ status: 404 }));
      dbQuery.resolves({ rows: [
        { doc: expected },
        { doc: { internalId, _attachments: { 'something.xml': { stub: true } } } }
      ] });
      const service = $injector.get('XmlForms');
      service.get(internalId)
        .then(() => {
          done(new Error('expected error to be thrown'));
        })
        .catch(err => {
          chai.expect(err.message).to.equal(`Multiple forms found for internalId: "${internalId}"`);
          done();
        });
    });

    it('query fails if no forms found', done => {
      const internalId = 'birth';
      dbGet.returns(Promise.reject({ status: 404 }));
      dbQuery.resolves({ rows: [
        { doc: { internalId: 'death', _attachments: { 'something.xml': { stub: true } } } }
      ] });
      const service = $injector.get('XmlForms');
      service.get(internalId)
        .then(() => {
          done(new Error('expected error to be thrown'));
        })
        .catch(err => {
          chai.expect(err.message).to.equal(`No form found for internalId "${internalId}"`);
          done();
        });
    });

  });

});
