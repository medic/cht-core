import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import sinon from 'sinon';
import { assert, expect } from 'chai';
import * as _ from 'lodash-es';

import { XmlFormsService } from '@mm-services/xml-forms.service';
import { AuthService } from '@mm-services/auth.service';
import { ChangesService } from '@mm-services/changes.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { XmlFormsContextUtilsService } from '@mm-services/xml-forms-context-utils.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { DbService } from '@mm-services/db.service';
import { ParseProvider } from '@mm-providers/parse.provider';
import { PipesService } from '@mm-services/pipes.service';
import { FileReaderService } from '@mm-services/file-reader.service';
import { FeedbackService } from '@mm-services/feedback.service';

describe('XmlForms service', () => {
  let dbGet;
  let dbQuery;
  let dbGetAttachment;
  let Changes;
  let hasAuth;
  let UserContact;
  let getContactType;
  let getTypeId;
  let contextUtils;
  let pipesService;
  let error;
  let warn;
  let fileReaderService;
  let feedbackService;

  const mockEnketoDoc = (formInternalId?, docId?) => {
    return {
      id: docId || 'form-0',
      doc: {
        _id: docId || 'form-0',
        internalId: formInternalId,
        _attachments: { xml: { something: true } },
      },
    };
  };

  const mockJsonDoc = () => {
    return { doc: { _id: 'json-doc', _attachments: {} } };
  };

  const getService = () => {
    return TestBed.inject(XmlFormsService);
  };

  beforeEach(() => {
    dbQuery = sinon.stub();
    dbGet = sinon.stub();
    dbGetAttachment = sinon.stub();
    Changes = sinon.stub();
    hasAuth = sinon.stub();
    UserContact = sinon.stub();
    getContactType = sinon.stub();
    fileReaderService = sinon.stub();
    feedbackService = { submit: sinon.stub() };
    getTypeId = sinon.stub().callsFake(contact => contact.type === 'contact' ? contact.contact_type : contact.type);
    contextUtils = {};
    error = sinon.stub(console, 'error');
    warn = sinon.stub(console, 'warn');

    pipesService = {
      transform: sinon.stub().returnsArg(1),
      getPipeNameVsIsPureMap: sinon.stub().returns(new Map()),
      meta: sinon.stub(),
      getInstance: sinon.stub(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({
          query: dbQuery, get: dbGet, getAttachment: dbGetAttachment
        } ) } },
        { provide: ChangesService, useValue: { subscribe: Changes } },
        { provide: AuthService, useValue: { has: hasAuth } },
        { provide: XmlFormsContextUtilsService, useValue: contextUtils },
        { provide: ContactTypesService, useValue: { get: getContactType, getTypeId } },
        { provide: UserContactService, useValue: { get: UserContact } },
        ParseProvider,
        { provide: PipesService, useValue: pipesService },
        { provide: FileReaderService, useValue: { utf8: fileReaderService } },
        { provide: FeedbackService, useValue: feedbackService },
      ],
    });
  });

  afterEach(() => {
    sinon.restore();
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
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();
      return service.list().then(actual => {
        expect(actual.length).to.equal(3);
        expect(actual[0]).to.deep.equal(given[0].doc);
        expect(actual[1]).to.deep.equal(given[3].doc);
        expect(actual[2]).to.deep.equal(given[4].doc);
      });
    });

    it('returns forms that have an xml file extension', () => {
      const given = [
        {
          id: 'form-1',
          doc: {
            _id: 'form-1',
            internalId: 'one',
            _attachments: {
              image: { something: true },
              'form.xml': { something: true }
            },
          },
        },
        {
          id: 'form-2',
          doc: {
            _id: 'form-2',
            internalId: 'two',
            _attachments: {
              image: { something: true },
              xml: { something: true }
            },
          },
        },
        {
          id: 'form-3',
          doc: {
            _id: 'form-3',
            internalId: 'three',
            _attachments: {
              image: { something: true },
              notxml: { something: true }
            },
          },
        }
      ];
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();
      return service.list().then(actual => {
        expect(actual.length).to.equal(2);
        expect(actual[0]).to.deep.equal(given[0].doc);
        expect(actual[1]).to.deep.equal(given[1].doc);
      });
    });

    it('returns errors from db.query', () => {
      dbQuery.rejects('boom');
      const service = getService();
      return service
        .list('test')
        .then(() => {
          assert.fail('Expected error to be thrown');
        })
        .catch(err => {
          expect(err.name).to.equal('boom');
        });
    });

    it('filter to person forms', () => {
      const given = [
        {
          id: 'form-0',
          doc: {
            _id: 'form-0',
            internalId: 'zero',
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-1',
          doc: {
            _id: 'form-1',
            internalId: 'one',
            context: {},
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-2',
          doc: {
            _id: 'form-2',
            internalId: 'two',
            context: { person: true },
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-3',
          doc: {
            _id: 'form-3',
            internalId: 'three',
            context: { place: true },
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-4',
          doc: {
            _id: 'form-4',
            internalId: 'four',
            context: { person: true, place: false },
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-5',
          doc: {
            _id: 'form-5',
            internalId: 'five',
            context: { person: false, place: true },
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-6',
          doc: {
            _id: 'form-6',
            internalId: 'six',
            context: { person: true, place: true },
            _attachments: { xml: { something: true } },
          },
        },
      ];
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();
      getContactType.resolves({ person: true });
      return service.list({ doc: { type: 'person' } }).then(actual => {
        expect(actual[0]).to.deep.equal(given[0].doc);
        assert.deepEqual(_.map(actual, 'internalId'), [
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
            _id: 'form-0',
            internalId: 'zero',
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-1',
          doc: {
            _id: 'form-1',
            internalId: 'one',
            context: {},
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-2',
          doc: {
            _id: 'form-2',
            internalId: 'two',
            context: { person: true },
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-3',
          doc: {
            _id: 'form-3',
            internalId: 'three',
            context: { place: true },
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-4',
          doc: {
            _id: 'form-4',
            internalId: 'four',
            context: { person: true, place: false },
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-5',
          doc: {
            _id: 'form-5',
            internalId: 'five',
            context: { person: false, place: true },
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-6',
          doc: {
            _id: 'form-6',
            internalId: 'six',
            context: { person: true, place: true },
            _attachments: { xml: { something: true } },
          },
        },
      ];
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();
      getContactType.resolves({ person: false });
      return service.list({ doc: { type: 'district_hospital' } }).then(actual => {
        assert.deepEqual(_.map(actual, 'internalId'), [
          'zero',
          'one',
          'three',
          'five',
          'six',
        ]);
      });
    });

    it('filter with correct type', () => {
      const given = [
        {
          id: 'form-0',
          doc: {
            _id: 'form-0',
            internalId: 'zero',
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-1',
          doc: {
            _id: 'form-1',
            internalId: 'one',
            context: {},
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-2',
          doc: {
            _id: 'form-2',
            internalId: 'two',
            context: { person: true },
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-3',
          doc: {
            _id: 'form-3',
            internalId: 'three',
            context: { place: true },
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-4',
          doc: {
            _id: 'form-4',
            internalId: 'four',
            context: { person: true, place: false },
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-5',
          doc: {
            _id: 'form-5',
            internalId: 'five',
            context: { person: false, place: true },
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form-6',
          doc: {
            _id: 'form-6',
            internalId: 'six',
            context: { person: true, place: true },
            _attachments: { xml: { something: true } },
          },
        },
      ];
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();
      getContactType.resolves({ person: false });
      getTypeId.returns('the correct type');

      const doc = { type: 'clinic', contact_type: 'not_a_clinic', _id: 'uuid' };

      return service.list({ doc }).then(result => {
        expect(getTypeId.callCount).to.equal(6);
        expect(getTypeId.args).to.deep.equal([[doc], [doc], [doc], [doc], [doc], [doc], ]);
        expect(getContactType.callCount).to.equal(6);
        expect(getContactType.args).to.deep.equal([
          ['the correct type'],
          ['the correct type'],
          ['the correct type'],
          ['the correct type'],
          ['the correct type'],
          ['the correct type'],
        ]);

        const ids = result.map(form => form.internalId);
        expect(ids).to.deep.equal([ 'zero', 'one', 'three', 'five', 'six', ]);
      });
    });

    it('filter with custom function', () => {
      const given = [
        {
          id: 'form-0',
          doc: {
            _id: 'form-0',
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
            _id: 'form-1',
            internalId: 'stock-report',
            context: {
              expression: 'isBlue(contact) && user.name === "Frank"'
            },
            _attachments: { xml: { something: true } },
          },
        }
      ];
      contextUtils.isBlue = contact => {
        return contact.color === 'blue';
      };
      dbQuery.resolves({ rows: given });
      UserContact.resolves({ name: 'Frank' });
      const service = getService();
      getContactType.resolves({ person: false });
      return service.list({ doc: { color: 'blue' } }).then(actual => {
        expect(actual.length).to.equal(1);
        expect(actual[0]).to.deep.equal(given[1].doc);
        expect(UserContact.callCount).to.equal(1);
      });
    });

    it('filter with custom function x2', () => {
      const given = [
        {
          id: 'form-0',
          doc: {
            _id: 'form-0',
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
            _id: 'form-1',
            internalId: 'stock-report',
            context: {
              expression: 'isBlue(contact) && user.name === "Frank"'
            },
            _attachments: { xml: { something: true } },
          },
        }
      ];
      contextUtils.isBlue = contact => {
        return contact.color === 'blue';
      };
      dbQuery.resolves({ rows: given });
      UserContact.resolves({ name: 'Frank' });
      const service = getService();
      getContactType.resolves({ person: false });
      return service.list({ doc: { color: 'red' } }).then(actual => {
        expect(actual.length).to.equal(1);
        expect(actual[0]).to.deep.equal(given[0].doc);
        expect(UserContact.callCount).to.equal(1);
      });
    });

    it('filter with custom function and type', () => {
      const given = [
        {
          id: 'form-0',
          doc: {
            _id: 'form-0',
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
            _id: 'form-1',
            internalId: 'stock-report',
            context: {
              place: true,
              expression: 'contact.sex === "female"'
            },
            _attachments: { xml: { something: true } },
          },
        }
      ];
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();
      getContactType.resolves({ person: true });
      return service.list({ doc: { sex: 'female', type: 'person' } }).then(actual => {
        expect(actual.length).to.equal(1);
        expect(actual[0]).to.deep.equal(given[0].doc);
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
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();
      getContactType.resolves({ person: true });
      return service.list({ doc: { sex: 'female' } }).then(actual => {
        expect(actual.length).to.equal(1);
        expect(actual[0]).to.deep.equal(given[1].doc);
        expect(error.callCount).to.equal(1);
        expect(error.args[0][0]).to.equal('Unable to evaluate expression for form: form-0');
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
          id: 'form:delivery',
          doc: {
            _id: 'form:delivery',
            internalId: 'form:delivery',
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
        },
        {
          id: 'form:training:new-feature',
          doc: {
            _id: 'form:training:new-feature',
            internalId: 'new-feature',
            _attachments: { xml: { something: true } },
          },
        }
      ];
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();
      return service.list({ contactForms: true }).then(actual => {
        expect(actual.length).to.equal(2);
        expect(actual).to.have.deep.members([ given[1].doc, given[3].doc ]);
      });
    });

    it('should filter by report forms', () => {
      const given = [
        {
          id: 'form:visit',
          doc: {
            _id: 'form:visit',
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
        },
        {
          id: 'form:delivery',
          doc: {
            _id: 'form:delivery',
            internalId: 'form:delivery',
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form:training:new-feature',
          doc: {
            _id: 'form:training:new-feature',
            internalId: 'new-feature',
            _attachments: { xml: { something: true } },
          },
        }
      ];
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();
      return service.list({ reportForms: true }).then(actual => {
        expect(actual.length).to.equal(2);
        expect(actual).to.have.deep.members([ given[0].doc, given[3].doc ]);
      });
    });

    it('should filter by training forms', () => {
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
        },
        {
          id: 'form:delivery',
          doc: {
            _id: 'form:delivery',
            internalId: 'form:delivery',
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form:training:new-feature',
          doc: {
            _id: 'form:training:new-feature',
            internalId: 'new-feature',
            _attachments: { xml: { something: true } },
          },
        }
      ];
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();
      return service.list({ trainingCards: true }).then(actual => {
        expect(actual.length).to.equal(1);
        expect(actual[0]).to.deep.equal(given[4].doc);
      });
    });

    it('should filter by more than 1 type of form', async () => {
      const given = [
        {
          id: 'form:contact:clinic',
          doc: {
            _id: 'form:contact:clinic',
            internalId: 'registration',
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form:delivery',
          doc: {
            _id: 'form:delivery',
            internalId: 'form:delivery',
            _attachments: { xml: { something: true } },
          },
        },
        {
          id: 'form:training:new-feature',
          doc: {
            _id: 'form:training:new-feature',
            internalId: 'new-feature',
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
          id: 'visit',
          doc: {
            _id: 'visit',
            internalId: 'visit',
            _attachments: { xml: { something: true } },
          },
        },
      ];
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();

      const reportsAndTrainings = await service.list({ reportForms: true, trainingCards: true });
      expect(reportsAndTrainings.length).to.equal(3);
      expect(reportsAndTrainings).to.have.deep.members([ given[1].doc, given[2].doc, given[4].doc ]);

      const reportsAndContacts = await service.list({ reportForms: true, contactForms: true });
      expect(reportsAndContacts.length).to.equal(4);
      expect(reportsAndContacts).to.have.deep.members([ given[0].doc, given[1].doc, given[3].doc, given[4].doc ]);

      const trainingsAndContacts = await service.list({ trainingCards: true, contactForms: true });
      expect(trainingsAndContacts.length).to.equal(3);
      expect(trainingsAndContacts).to.have.deep.members([ given[0].doc, given[2].doc, given[3].doc ]);

      const allForms = await service.list({ reportForms: true, trainingCards: true, contactForms: true });
      expect(allForms.length).to.equal(5);
      expect(allForms).to.have.deep.members([ given[0].doc, given[1].doc, given[2].doc, given[3].doc, given[4].doc ]);
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

      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      hasAuth.withArgs([ 'national_admin', 'district_admin' ]).resolves(false);
      hasAuth.withArgs([ 'national_admin' ]).resolves(true);
      const service = getService();
      return service.list().then(actual => {
        expect(actual.length).to.equal(2);
        expect(actual[0]).to.deep.equal(given[1].doc);
        expect(actual[1]).to.deep.equal(given[2].doc);
        expect(hasAuth.callCount).to.equal(2);
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
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();
      return service.list({ ignoreContext: true }).then(actual => {
        expect(actual.length).to.equal(3);
        expect(hasAuth.callCount).to.equal(0);
      });
    });

    it('filter for report forms and ignore context', () => {
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
        },
        {
          id: 'form:training:new-feature',
          doc: {
            _id: 'form:training:new-feature',
            internalId: 'new-feature',
            _attachments: { xml: { something: true } },
          },
        }
      ];
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();
      return service.list({ ignoreContext: true, reportForms: true }).then(actual => {
        expect(actual[0]).to.deep.equal(given[0].doc);
        expect(hasAuth.callCount).to.equal(0);
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
      dbQuery.resolves({ rows: given });
      UserContact.resolves();
      const service = getService();
      return service.list().then(actual => {
        expect(actual.length).to.equal(1);
        expect(actual[0]).to.deep.equal(given[1].doc);
      });

    });

    it('does not return a form with a truthy expression if the user does not have relevant permissions', () => {
      const given = [
        {
          id: 'visit',
          doc: {
            _id: 'visit',
            internalId: 'visit',
            _attachments: { xml: { something: true } },
            context: {
              expression: 'true',
              permission: [ 'national_admin' ]
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
              expression: 'true',
              permission: [ 'district_admin' ]
            },
          },
        }
      ];
      dbQuery.resolves({ rows: given });
      hasAuth.withArgs([ 'national_admin' ]).resolves(true);
      UserContact.resolves();
      const service = getService();
      return service.list().then(actual => {
        expect(actual.length).to.equal(1);
        expect(actual[0]).to.deep.equal(given[0].doc);
      });
    });

    it('does not return a form with a false expression if the user has the relevant permissions', () => {
      const given = [
        {
          id: 'visit',
          doc: {
            _id: 'visit',
            internalId: 'visit',
            _attachments: { xml: { something: true } },
            context: {
              expression: 'false',
              permission: [ 'national_admin' ]
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
              expression: 'false',
              permission: [ 'district_admin' ]
            },
          },
        }
      ];
      dbQuery.resolves({ rows: given });
      hasAuth.withArgs([ 'national_admin' ]).resolves(true);
      UserContact.resolves();
      const service = getService();
      return service.list().then(actual => {
        expect(actual.length).to.equal(0);
      });
    });

  });

  describe('listen', () => {

    it('is updated when changes fires', fakeAsync(() => {
      const original = mockEnketoDoc('registration');
      const update = mockEnketoDoc('visit');
      dbQuery
        .onFirstCall().resolves({ rows: [ original ] })
        .onSecondCall().resolves({ rows: [ original, update ] });
      UserContact.resolves();
      let count = 0;
      const service = getService();
      service.subscribe('test', (err, actual) => {
        expect(err).to.equal(null);
        if (count === 0) {
          expect(actual.length).to.equal(1);
          expect(actual[0]).to.deep.equal(original.doc);
          tick();
          Changes.args[0][0].callback();
        } else if (count === 1) {
          expect(actual.length).to.equal(2);
          expect(actual[0]).to.deep.equal(original.doc);
          expect(actual[1]).to.deep.equal(update.doc);
          expect(Changes.callCount).to.equal(1);
          expect(dbQuery.callCount).to.equal(2);
        } else {
          assert.fail('Update fired too many times!');
        }
        count++;
      });
    }));

    it('caches xml forms', fakeAsync(() => {
      const original = mockEnketoDoc('registration');
      const update = mockEnketoDoc('visit');
      dbQuery
        .onFirstCall().resolves({ rows: [ original ] })
        .onSecondCall().resolves({ rows: [ original, update ] });
      UserContact.resolves();
      let count = 0;
      const service = getService();
      service.subscribe('test', (err, actual) => {
        expect(err).to.equal(null);
        if (count === 0) {
          expect(actual.length).to.equal(1);
          expect(actual[0]).to.deep.equal(original.doc);
          tick();
          Changes.args[0][0].callback();
        } else if (count === 1) {
          expect(actual.length).to.equal(2);
          expect(actual[0]).to.deep.equal(original.doc);
          expect(actual[1]).to.deep.equal(update.doc);
          expect(Changes.callCount).to.equal(1);
          expect(dbQuery.callCount).to.equal(2);
          service.subscribe('test-2', (err, actual) => {
            expect(actual.length).to.equal(2);
            expect(actual[0]).to.deep.equal(original.doc);
            expect(actual[1]).to.deep.equal(update.doc);
            expect(Changes.callCount).to.equal(1);
            expect(dbQuery.callCount).to.equal(2); // db doesn't get hit again
          });
        } else {
          assert.fail('Update fired too many times!');
        }
        count++;
      });

    }));

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

      it('should not return forms when collectForms not set', () => {
        dbQuery.resolves({ rows: [ collectForm, enketoForm ] });
        UserContact.resolves();
        const service = getService();
        return service.list({ reportForms: true }).then(actual => {
          expect(actual.length).to.equal(1);
          expect(actual[0]._id).to.equal('enketo');
        });
      });

      it('should return forms when collectForms is set true', () => {
        dbQuery.resolves({ rows: [ collectForm, enketoForm ] });
        UserContact.resolves();
        const service = getService();
        return service.list({ collectForms: true }).then(actual => {
          expect(actual.length).to.equal(1);
          expect(actual[0]._id).to.equal('collect');
        });
      });

      it('should return forms when collectForms and reportForms are set true', () => {
        dbQuery.resolves({ rows: [ collectForm, enketoForm ] });
        UserContact.resolves();
        const service = getService();
        return service.list({ collectForms: true, reportForms: true }).then(actual => {
          expect(actual.length).to.equal(2);
          expect(actual[0]._id).to.equal('collect');
          expect(actual[1]._id).to.equal('enketo');
        });
      });
    });

  });

  describe('get', () => {

    it('gets valid form by id with "xml" attachment', () => {
      const internalId = 'birth';
      const expected = {
        type: 'form',
        _attachments: {
          xml: { stub: true },
          'model.xml': { stub: true },
          'form.html': { stub: true },
        }
      };
      dbQuery.resolves([]);
      dbGet.resolves(expected);
      const service = getService();
      return service.get(internalId).then(actual => {
        expect(actual).to.deep.equal(expected);
        expect(dbGet.callCount).to.equal(1);
        expect(dbGet.args[0][0]).to.equal(`form:${internalId}`);
      });
    });

    it('gets valid form by id with ".xml" file extension', () => {
      const internalId = 'birth';
      const expected = {
        type: 'form',
        _attachments: {
          'something.xml': { stub: true },
          'model.xml': { stub: true },
          'form.html': { stub: true },
        }
      };
      dbGet.resolves(expected);
      dbQuery.resolves([]);
      const service = getService();
      return service.get(internalId).then(actual => {
        expect(actual).to.equal(expected);
      });
    });

    it('returns error, logs when getById fails', () => {
      const internalId = 'birth';
      dbGet.rejects('getById fails');
      dbQuery.rejects('getByView fails');
      const service = getService();
      return service.get(internalId)
        .then(() => {
          assert.fail('getById fails');
        })
        .catch(err => {
          expect(err.name).to.equal('getById fails');
          expect(warn.callCount).to.equal(1);
          expect(warn.args[0][0]).to.equal('Error in XMLFormService : getById : ');
        });
    });

    it('returns error, logs and register feedback doc when getByView fails', () => {
      const internalId = 'birth';
      const expectedErrorTitle = 'Error in XMLFormService : getByView : ';
      dbGet.rejects({status: 404 });
      dbQuery.rejects('getByView fails');
      const service = getService();
      return service.get(internalId)
        .then(() => {
          assert.fail('getByView fails');
        })
        .catch(err => {
          expect(err.message).to.match(new RegExp(expectedErrorTitle));
          expect(warn.callCount).to.equal(1);
          expect(warn.args[0][0]).to.equal('Error in XMLFormService : getById : ');
          expect(error.callCount).to.equal(1);
          expect(error.args[0][0]).to.equal(expectedErrorTitle);
        });
    });

    it('returns error when cannot find xform attachment', () => {
      const internalId = 'birth';
      const expectedErrorTitle = 'Error in XMLFormService : hasRequiredAttachments : ';
      const expectedErrorDetail = `The form "${internalId}" doesn't have required attachments`;
      const expected = {
        type: 'form',
        _attachments: { 'something.txt': { stub: true } }
      };
      dbGet.resolves(expected);
      dbQuery.resolves([]);
      const service = getService();
      return service
        .get(internalId)
        .then(() => {
          assert.fail('expected error to be thrown');
        })
        .catch(err => {
          expect(err.message).to.equal(expectedErrorTitle + expectedErrorDetail);
          expect(error.callCount).to.equal(1);
          expect(error.args[0][0]).to.equal(expectedErrorTitle);
          expect(error.args[0][1]).to.equal(expectedErrorDetail);
        });
    });

    it('falls back to using view if no doc found', () => {
      const internalId = 'birth';
      const expected = {
        internalId,
        _attachments: {
          'something.xml': { stub: true },
          'model.xml': { stub: true },
          'form.html': { stub: true },
        }
      };
      dbGet.rejects({ status: 404 });
      dbQuery.resolves({
        rows: [
          { doc: expected },
          { doc: { internalId: 'death', _attachments: { 'something.xml': { stub: true } } } }
        ]
      });
      const service = getService();
      return service.get(internalId).then(actual => {
        expect(warn.callCount).to.equal(1);
        expect(warn.args[0][0]).to.equal('Error in XMLFormService : getById : ');
        expect(actual).to.deep.equal(expected);
        expect(dbQuery.callCount).to.equal(1);
        expect(dbQuery.args[0][0]).to.equal(`medic-client/doc_by_type`);
        const options = dbQuery.args[0][1];
        expect(options.include_docs).to.equal(true);
        expect(options.key).to.deep.equal(['form']);
      });
    });

    it('query fails if multiple forms found', () => {
      const internalId = 'birth';
      const expectedErrorTitle = 'Error in XMLFormService : getByView : ';
      const expectedErrorDetail = `Multiple forms found for internalId : "${internalId}"`;
      const expected = {
        internalId,
        _attachments: { 'something.xml': { stub: true } }
      };
      dbGet.rejects({ status: 404 });
      dbQuery.resolves({
        rows: [
          { doc: expected },
          { doc: { internalId, _attachments: { 'something.xml': { stub: true } } } }
        ]
      });
      const service = getService();
      return service
        .get(internalId)
        .then(() => {
          assert.fail('expected error to be thrown');
        })
        .catch(err => {
          expect(err.message).to.equal(expectedErrorTitle  + expectedErrorDetail);
          expect(warn.callCount).to.equal(1);
          expect(warn.args[0][0]).to.equal('Error in XMLFormService : getById : ');
          expect(error.callCount).to.equal(1);
          expect(error.args[0][0]).to.equal(expectedErrorTitle);
          expect(error.args[0][1]).to.equal(expectedErrorDetail);
        });
    });

    it('query fails if no forms found', () => {
      const internalId = 'birth';
      const expectedErrorTitle = 'Error in XMLFormService : getByView : ';
      const expectedErrorDetail = `No form found for internalId : "${internalId}"`;
      dbGet.rejects({ status: 404 });
      dbQuery.resolves({
        rows: [
          { doc: { internalId: 'death', _attachments: { 'something.xml': { stub: true } } } }
        ]
      });
      const service = getService();
      return service
        .get(internalId)
        .then(() => {
          assert.fail('expected error to be thrown');
        })
        .catch(err => {
          expect(err.message).to.equal(expectedErrorTitle + expectedErrorDetail);
          expect(warn.callCount).to.equal(1);
          expect(warn.args[0][0]).to.equal('Error in XMLFormService : getById : ');
          expect(error.callCount).to.equal(1);
          expect(error.args[0][0]).to.equal(expectedErrorTitle);
          expect(error.args[0][1]).to.equal(expectedErrorDetail);
        });
    });
  });

  describe('getDocAndFormAttachment', () => {

    it('fails if no forms found', () => {
      const internalId = 'birth';
      const expectedErrorTitle = 'Error in XMLFormService : getDocAndFormAttachment : ';
      const expectedErrorDetail = `The form "${internalId}" doesn't have an xform attachment`;
      dbQuery.resolves([]);
      dbGet.resolves({
        _id: 'form:death',
        _attachments: {
          'something.xml': { stub: true },
          'model.xml': { stub: true },
          'form.html': { stub: true },
        },
        internalId: 'birth'
      });
      dbGetAttachment.rejects({ status: 404 });
      const service = getService();
      return service
        .getDocAndFormAttachment(internalId)
        .then(() => {
          assert.fail('expected error to be thrown');
        })
        .catch(err => {
          expect(err.message).to.equal(expectedErrorTitle + expectedErrorDetail);
          expect(error.callCount).to.equal(1);
          expect(error.args[0][0]).to.equal(expectedErrorTitle);
          expect(error.args[0][1]).to.equal(expectedErrorDetail);
        });
    });

    it('fails if failed to get forms, but not 404', () => {
      const internalId = 'birth';
      const expectedErrorTitle = 'Error in XMLFormService : getDocAndFormAttachment : ';
      const expectedErrorDetail = `Failed to get the form "${internalId}" xform attachment`;
      dbQuery.resolves([]);
      dbGet.resolves({
        _id: 'form:death',
        _attachments: {
          'something.xml': { stub: true },
          'model.xml': { stub: true },
          'form.html': { stub: true },
        },
        internalId: 'birth'
      });
      dbGetAttachment.rejects();
      const service = getService();
      return service
        .getDocAndFormAttachment(internalId)
        .then(() => {
          assert.fail('expected error to be thrown');
        })
        .catch(err => {
          expect(err.message).to.equal(expectedErrorTitle + expectedErrorDetail);
          expect(error.callCount).to.equal(1);
          expect(error.args[0][0]).to.equal(expectedErrorTitle);
          expect(error.args[0][1]).to.equal(expectedErrorDetail);
        });
    });

    it('returns doc and xml', () => {
      const internalId = 'birth';
      const formDoc = {
        _id: 'form:death',
        _attachments: {
          xml: { stub: true },
          'model.xml': { stub: true },
          'form.html': { stub: true },
        },
        internalId: 'birth'
      };
      dbQuery.resolves([]);
      dbGet.resolves(formDoc);
      dbGetAttachment.resolves('someblob');
      fileReaderService.resolves('<form/>');
      const service = getService();
      return service
        .getDocAndFormAttachment(internalId)
        .then((result) => {
          expect(result.doc).to.deep.equal(formDoc);
          expect(result.xml).to.deep.equal('<form/>');
          expect(dbGetAttachment.callCount).to.equal(1);
          expect(dbGetAttachment.args[0][0]).to.equal('form:death');
          expect(dbGetAttachment.args[0][1]).to.equal('xml');
          expect(fileReaderService.callCount).to.equal(1);
          expect(fileReaderService.args[0][0]).to.equal('someblob');
        });
    });

  });

  describe('canAccessForm', () => {
    it('should return true when user can access the form', async () => {
      const form = {
        type: 'form',
        context: {
          permission: 'can_view_this_form',
          expression: 'user.name === "Frank"',
        },
        _attachments: { xml: { stub: true } },
      };
      const userContact = { name: 'Frank' };
      hasAuth.withArgs('can_view_this_form').resolves(true);
      dbQuery.resolves([]);
      const service = getService();

      const result = await service.canAccessForm(form, userContact);

      expect(result).to.be.true;
      expect(hasAuth.calledOnce).to.be.true;
      expect(hasAuth.args[0][0]).to.equal('can_view_this_form');
    });

    it('should return false when user cannot access the form because expression does not match', async () => {
      const form = {
        type: 'form',
        context: {
          permission: 'can_view_this_form',
          expression: 'user.name === "Frank"',
        },
        _attachments: { xml: { stub: true } },
      };
      const userContact = { name: 'Anna' };
      hasAuth.withArgs('can_view_this_form').resolves(true);
      dbQuery.resolves([]);
      const service = getService();

      const result = await service.canAccessForm(form, userContact);

      expect(result).to.be.false;
      expect(hasAuth.calledOnce).to.be.true;
      expect(hasAuth.args[0][0]).to.equal('can_view_this_form');
    });

    it('should return false when user cannot access the form because missing permissions', async () => {
      const form = {
        type: 'form',
        context: {
          permission: 'can_view_this_form',
          expression: 'user.name === "Frank"',
        },
        _attachments: { xml: { stub: true } },
      };
      const userContact = { name: 'Frank' };
      hasAuth.withArgs('can_view_this_form').resolves(false);
      dbQuery.resolves([]);
      const service = getService();

      const result = await service.canAccessForm(form, userContact);

      expect(result).to.be.false;
      expect(hasAuth.calledOnce).to.be.true;
      expect(hasAuth.args[0][0]).to.equal('can_view_this_form');
    });
  });
});
