const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const couchSettings = require('@medic/settings');
const tokenLogin = require('../../src/token-login');
const config = require('../../src/libs/config');
const db = require('../../src/libs/db');
const roles = require('../../src/roles');
const { people, places }  = require('@medic/contacts')(config, db);
const COMPLEX_PASSWORD = '23l4ijk3nSDELKSFnwekirh';

const facilitya = { _id: 'a', name: 'aaron' };
const facilityb = { _id: 'b', name: 'brian' };
const facilityc = { _id: 'c', name: 'cathy' };

let userData;
let clock;
let addMessage;
const oneDayInMS = 24 * 60 * 60 * 1000;

let service;

describe('Users service', () => {
  beforeEach(() => {
    config.init({
      get: () => {},
      getTransitionsLib: () => {},
    });
    db.init({
      medic: { get: () => {}, put: () => {}, allDocs: () => {}, query: () => {} },
      medicLogs: { get: () => {}, put: () => {}, },
      users: { get: () => {}, put: () => {} },
    });
    addMessage = sinon.stub();
    sinon.stub(config, 'getTransitionsLib').returns({ messages: { addMessage } });
    service = rewire('../../src/users');
    service.__set__('getFacilities', sinon.stub().returns([
      facilitya,
      facilityb,
      facilityc,
    ]));
    sinon.stub(couchSettings, 'getCouchConfig').resolves();
    sinon.stub(couchSettings, 'updateAdminPassword').resolves();
    userData = {
      username: 'x',
      password: COMPLEX_PASSWORD,
      place: { name: 'x' },
      contact: { 'parent': 'x' },
      type: 'national-manager'
    };
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('getSettingsUpdates', () => {

    it('sets type property', () => {
      const settings = service.__get__('getSettingsUpdates')('john', {});
      chai.expect(settings.type).to.equal('user-settings');
    });

    it('removes user doc specific fields', () => {
      const data = {
        name: 'john',
        email: 'john@gmail.com',
        password: 'foo',
        roles: ['foo'],
        starsign: 'libra'
      };
      const settings = service.__get__('getSettingsUpdates')('john', data);
      chai.expect(settings.password).to.equal(undefined);
    });

    it('reassigns place and contact fields', () => {
      const data = {
        place: 'abc',
        contact: '123',
        fullname: 'John'
      };
      const settings = service.__get__('getSettingsUpdates')('john', data);
      chai.expect(settings.place).to.equal(undefined);
      chai.expect(settings.contact).to.equal(undefined);
      chai.expect(settings.contact_id).to.equal('123');
      chai.expect(settings.facility_id).to.equal('abc');
      chai.expect(settings.fullname).to.equal('John');
    });

    it('does not reassign language', () => {
      const data = { language: 'sw' };
      const settings = service.__get__('getSettingsUpdates')('john', data);
      chai.expect(settings).to.not.have.property('language');
    });

    it('supports external_id field', () => {
      const data = {
        fullname: 'John',
        external_id: 'CHP020'
      };
      const settings = service.__get__('getSettingsUpdates')('john', data);
      chai.expect(settings.external_id).to.equal('CHP020');
      chai.expect(settings.fullname).to.equal('John');
    });

  });

  describe('getUserUpdates', () => {

    it('enforces name field based on id', () => {
      const data = {
        name: 'sam',
        email: 'john@gmail.com'
      };
      const user = service.__get__('getUserUpdates')('john', data);
      chai.expect(user.name ).to.equal('john');
    });

    it('reassigns place field', () => {
      const data = {
        place: 'abc'
      };
      const user = service.__get__('getUserUpdates')('john', data);
      chai.expect(user.place).to.equal(undefined);
      chai.expect(user.facility_id).to.equal('abc');
    });

  });

  describe('getType', () => {

    it('returns unknown when roles is empty', () => {
      const user = {
        name: 'sam',
        roles: []
      };
      const admins = {};
      chai.expect(service.__get__('getType')(user, admins)).to.equal('unknown');
    });

  });

  describe('hasParent', () => {

    it('works as expected', () => {
      const facility = {
        _id: 'foo',
        color: 'red',
        parent: {
          _id: 'bar',
          color: 'green',
          parent: {
            _id: 'baz',
            color: 'blue'
          }
        }
      };
      chai.expect(service.__get__('hasParent')(facility, 'baz')).to.equal(true);
      chai.expect(service.__get__('hasParent')(facility, 'slime')).to.equal(false);
      chai.expect(service.__get__('hasParent')(facility, 'bar')).to.equal(true);
      chai.expect(service.__get__('hasParent')(facility, 'foo')).to.equal(true);
      chai.expect(service.__get__('hasParent')(facility, 'goo')).to.equal(false);
      // does not modify facility object
      chai.expect(facility).to.deep.equal({
        _id: 'foo',
        color: 'red',
        parent: {
          _id: 'bar',
          color: 'green',
          parent: {
            _id: 'baz',
            color: 'blue'
          }
        }
      });
    });

  });

  describe('validateUser', () => {
    it('defines custom error when not found', () => {
      sinon.stub(db.users, 'get').returns(Promise.reject({ status: 404 }));
      return service.__get__('validateUser')('x').catch(err => {
        chai.expect(err.message).to.equal('Failed to find user.');
      });
    });
  });

  describe('validateUserSettings', () => {
    it('defines custom error when not found', () => {
      sinon.stub(db.medic, 'get').returns(Promise.reject({ status: 404 }));
      return service.__get__('validateUserSettings')('x').catch(err => {
        chai.expect(err.message).to.equal('Failed to find user settings.');
      });
    });
  });

  describe('getType', () => {
    it('returns role when user is in admins list and has role', () => {
      const user = {
        name: 'sam',
        roles: ['driver']
      };
      const admins = {
        'sam': 'x'
      };
      chai.expect(service.__get__('getType')(user, admins)).to.equal('driver');
    });
  });

  describe('getList', () => {

    it('collects user infos', () => {
      const allUsers = [
        {
          id: 'org.couchdb.user:x',
          doc: {
            name: 'lucas',
            facility_id: 'c',
            roles: [ 'national-admin', 'data-entry' ]
          }
        },
        {
          id: 'org.couchdb.user:y',
          doc: {
            name: 'milan',
            facility_id: 'b',
            roles: [ 'district-admin' ]
          }
        }
      ];
      const allUsersSettings = [
        {
          _id: 'org.couchdb.user:x',
          name: 'lucas',
          fullname: 'Lucas M',
          email: 'l@m.com',
          phone: '123456789'
        },
        {
          _id: 'org.couchdb.user:y',
          name: 'milan',
          fullname: 'Milan A',
          email: 'm@a.com',
          phone: '987654321',
          external_id: 'LTT093'
        }
      ];
      service.__set__('getAllUsers', sinon.stub().resolves(allUsers));
      service.__set__('getAllUserSettings', sinon.stub().resolves(allUsersSettings));
      return service.getList().then(data => {
        chai.expect(data.length).to.equal(2);
        const lucas = data[0];
        chai.expect(lucas.id).to.equal('org.couchdb.user:x');
        chai.expect(lucas.username).to.equal('lucas');
        chai.expect(lucas.fullname).to.equal('Lucas M');
        chai.expect(lucas.email).to.equal('l@m.com');
        chai.expect(lucas.phone).to.equal('123456789');
        chai.expect(lucas.place).to.deep.equal(facilityc);
        chai.expect(lucas.type).to.equal('national-admin');
        const milan = data[1];
        chai.expect(milan.id).to.equal('org.couchdb.user:y');
        chai.expect(milan.username).to.equal('milan');
        chai.expect(milan.fullname).to.equal('Milan A');
        chai.expect(milan.email).to.equal('m@a.com');
        chai.expect(milan.phone).to.equal('987654321');
        chai.expect(milan.place).to.deep.equal(facilityb);
        chai.expect(milan.type).to.equal('district-admin');
        chai.expect(milan.external_id).to.equal('LTT093');
      });
    });

    it('filters out non-users', () => {
      const allUsers = [
        {
          id: 'x',
          doc: {
            name: 'lucas',
            facility_id: 'c',
            fullname: 'Lucas M',
            email: 'l@m.com',
            phone: '123456789',
            roles: [ 'national-admin', 'data-entry' ]
          }
        },
        {
          id: 'org.couchdb.user:y',
          doc: {
            name: 'milan',
            facility_id: 'b',
            fullname: 'Milan A',
            email: 'm@a.com',
            phone: '987654321',
            roles: [ 'district-admin' ]
          }
        }
      ];
      const allUserSettings = [
        {
          _id: 'org.couchdb.user:x',
          name: 'lucas',
          fullname: 'Lucas M',
          email: 'l@m.com',
          phone: '123456789'
        },
        {
          _id: 'org.couchdb.user:y',
          name: 'milan',
          fullname: 'Milan A',
          email: 'm@a.com',
          phone: '987654321'
        }
      ];
      service.__set__('getAllUsers', sinon.stub().resolves(allUsers));
      service.__set__('getAllUserSettings', sinon.stub().resolves(allUserSettings));

      return service.getList().then(data => {
        chai.expect(data.length).to.equal(1);
        const milan = data[0];
        chai.expect(milan.id).to.equal('org.couchdb.user:y');
        chai.expect(milan.username).to.equal('milan');
        chai.expect(milan.fullname).to.equal('Milan A');
        chai.expect(milan.email).to.equal('m@a.com');
        chai.expect(milan.phone).to.equal('987654321');
        chai.expect(milan.place).to.deep.equal(facilityb);
        chai.expect(milan.type).to.equal('district-admin');
      });

    });

    it('handles minimal users', () => {
      const allUsers = [
        {
          id: 'org.couchdb.user:x',
          doc: {
            name: 'lucas'
          }
        }
      ];
      service.__set__('getAllUsers', sinon.stub().resolves(allUsers));
      service.__set__('getAllUserSettings', sinon.stub().resolves([]));
      return service.getList().then(data => {
        chai.expect(data.length).to.equal(1);
        const lucas = data[0];
        chai.expect(lucas.id).to.equal('org.couchdb.user:x');
        chai.expect(lucas.username).to.equal('lucas');
        chai.expect(lucas.fullname).to.equal(undefined);
        chai.expect(lucas.email).to.equal(undefined);
        chai.expect(lucas.phone).to.equal(undefined);
        chai.expect(lucas.facility).to.equal(undefined);
        chai.expect(lucas.type).to.equal('unknown');
      });
    });

    it('returns errors from users service', () => {
      service.__set__('getAllUsers', sinon.stub().rejects('not found'));
      service.__set__('getAllUserSettings', sinon.stub().rejects('not found'));
      return service.getList().catch(err => {
        chai.expect(err.name).to.equal('not found');
      });
    });

    it('returns errors from facilities service', () => {
      const allUsers = [
        {
          id: 'x',
          doc: {
            name: 'lucas',
            facility_id: 'c',
            fullname: 'Lucas M',
            email: 'l@m.com',
            phone: '123456789',
            roles: [ 'national-admin', 'data-entry' ]
          }
        },
        {
          id: 'org.couchdb.user:y',
          doc: {
            name: 'milan',
            facility_id: 'b',
            fullname: 'Milan A',
            email: 'm@a.com',
            phone: '987654321',
            roles: [ 'district-admin' ]
          }
        }
      ];
      service.__set__('getAllUsers', sinon.stub().resolves(allUsers));
      service.__set__('getAllUserSettings', sinon.stub().resolves([]));
      service.__set__('getFacilities', sinon.stub().rejects('BOOM'));
      return service.getList().catch(err => {
        chai.expect(err.name).to.equal('BOOM');
      });
    });

  });

  describe('getUserSettings', () => {

    it('returns medic user doc with facility from couchdb user doc', () => {
      sinon
        .stub(db.users, 'get')
        .resolves({ name: 'steve', facility_id: 'steveVille', roles: ['b'] });
      sinon
        .stub(db.medic, 'get')
        .resolves({ name: 'steve2', facility_id: 'otherville', contact_id: 'steve', roles: ['c'] });
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { id: 'steveVille', key: 'steveVille', doc: { _id: 'steveVille', place_id: 'steve_ville', name: 'steve V' } },
          { id: 'steve', key: 'steve', doc: { _id: 'steve', patient_id: 'steve', name: 'steve' } },
        ],
      });

      return service
        .getUserSettings({ name: 'steve' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            name: 'steve',
            facility_id: 'steveVille',
            contact_id: 'steve',
            roles: ['b'],
            facility: { _id: 'steveVille', place_id: 'steve_ville', name: 'steve V' },
            contact: { _id: 'steve', patient_id: 'steve', name: 'steve' },
          });

          chai.expect(db.users.get.callCount).to.equal(1);
          chai.expect(db.users.get.withArgs('org.couchdb.user:steve').callCount).to.equal(1);
          chai.expect(db.medic.get.callCount).to.equal(1);
          chai.expect(db.medic.get.withArgs('org.couchdb.user:steve').callCount).to.equal(1);
          chai.expect(db.medic.allDocs.callCount).to.equal(1);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ keys: ['steveVille', 'steve'], include_docs: true }]);
        });
    });

    it('returns user settings by contact_id from medic user doc', () => {
      sinon
        .stub(db.users, 'get')
        .resolves({ name: 'steve', facility_id: 'steveVille', roles: ['b'] });
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [
            { doc: { name: 'no_contact', } },
            { doc: { name: 'mis_matched_contact', contact_id: 'mis_matched_contact', } },
            { doc: {
              name: 'steve',
              facility_id: 'otherville',
              contact_id: 'steve_contact',
              roles: ['c']
            } }
          ]
        });
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { id: 'steveVille', key: 'steveVille', doc: { _id: 'steveVille', place_id: 'steve_ville', name: 'steve V' } },
          { id: 'steve', key: 'steve', doc: { _id: 'steve', patient_id: 'steve', name: 'steve' } },
        ],
      });

      return service
        .getUserSettings({ contact_id: 'steve_contact' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            name: 'steve',
            facility_id: 'steveVille',
            contact_id: 'steve_contact',
            roles: ['b'],
            facility: { _id: 'steveVille', place_id: 'steve_ville', name: 'steve V' },
            contact: { _id: 'steve', patient_id: 'steve', name: 'steve' },
          });

          chai.expect(db.users.get.callCount).to.equal(1);
          chai.expect(db.users.get.withArgs('org.couchdb.user:steve').callCount).to.equal(1);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0])
            .to.deep.equal(['medic-client/doc_by_type', { include_docs: true, key: ['user-settings'] }]);
          chai.expect(db.medic.allDocs.callCount).to.equal(1);
          chai.expect(db.medic.allDocs.args[0])
            .to.deep.equal([{ keys: ['steveVille', 'steve_contact'], include_docs: true }]);
        });
    });

    it('returns name and roles from provided userCtx', () => {
      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { id: 'myUserVille', key: 'myUserVille', doc: { _id: 'myUserVille', place_id: 'user_ville' } },
          { id: 'my-user-contact', key: 'my-user-contact', doc: { _id: 'my-user-contact', patient_id: 'contact' } },
        ],
      });

      return service
        .getUserSettings({ name: 'my-user' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            _id: 'org.couchdb.user:my-user',
            name: 'my-user',
            roles: [ 'a' ],
            type: 'user-settings',
            some: 'field',
            contact_id: 'my-user-contact',
            facility_id: 'myUserVille',
            facility: { _id: 'myUserVille', place_id: 'user_ville' },
            contact: { _id: 'my-user-contact', patient_id: 'contact' },
          });
        });
    });

    it('should not use malformed results from all docs', () => {
      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [{ id: 'malformed' }],
      });

      return service
        .getUserSettings({ name: 'my-user' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            _id: 'org.couchdb.user:my-user',
            name: 'my-user',
            roles: [ 'a' ],
            type: 'user-settings',
            some: 'field',
            contact_id: 'my-user-contact',
            facility_id: 'myUserVille',
          });
        });
    });

    it('should not use malformed results from all docs', () => {
      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').resolves({});

      return service
        .getUserSettings({ name: 'my-user' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            _id: 'org.couchdb.user:my-user',
            name: 'my-user',
            roles: [ 'a' ],
            type: 'user-settings',
            some: 'field',
            contact_id: 'my-user-contact',
            facility_id: 'myUserVille',
          });
        });
    });

    it('should not use malformed results from all docs', () => {
      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').resolves({ rows: {} });

      return service
        .getUserSettings({ name: 'my-user' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            _id: 'org.couchdb.user:my-user',
            name: 'my-user',
            roles: [ 'a' ],
            type: 'user-settings',
            some: 'field',
            contact_id: 'my-user-contact',
            facility_id: 'myUserVille',
          });
        });
    });

    it('should not use malformed results from all docs', () => {
      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [ undefined, {} ] });

      return service
        .getUserSettings({ name: 'my-user' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            _id: 'org.couchdb.user:my-user',
            name: 'my-user',
            roles: [ 'a' ],
            type: 'user-settings',
            some: 'field',
            contact_id: 'my-user-contact',
            facility_id: 'myUserVille',
          });
        });
    });

    it('should work with not found contact', () => {
      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { id: 'myUserVille', key: 'myUserVille', doc: { _id: 'myUserVille' } },
          { key: 'my-user-contact', error: 'not_found' },
        ],
      });

      return service
        .getUserSettings({ name: 'my-user' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            _id: 'org.couchdb.user:my-user',
            name: 'my-user',
            roles: [ 'a' ],
            type: 'user-settings',
            some: 'field',
            contact_id: 'my-user-contact',
            facility_id: 'myUserVille',
            facility: { _id: 'myUserVille' },
            contact: undefined,
          });
        });
    });

    it('throws error if _users user returns an error', () => {
      sinon.stub(db.users, 'get').rejects({ some: 'err' });
      sinon.stub(db.medic, 'get').resolves({});
      return service
        .getUserSettings({ name: 'steve' })
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
        });
    });

    it('throws error if _users user returns an error when getting by contact_id', () => {
      sinon.stub(db.users, 'get').rejects({ some: 'err' });
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [{ doc: {
            name: 'steve',
            facility_id: 'otherville',
            contact_id: 'steve_contact',
            roles: ['c']
          } }]
        });
      return service
        .getUserSettings({ contact_id: 'steve_contact' })
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
        });
    });

    it('throws error if medic user-settings returns an error', () => {
      sinon.stub(db.users, 'get').resolves({});
      sinon.stub(db.medic, 'get').rejects({ some: 'err' });
      return service
        .getUserSettings({ name: 'steve' })
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
        });
    });

    it('throws error if medic user-settings returns no matching users when getting by contact_id', () => {
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [
            { doc: { name: 'no_contact', } },
            { doc: { name: 'mis_matched_contact', contact_id: 'mis_matched_contact', } },
          ]
        });
      return service
        .getUserSettings({ contact_id: 'steve_contact' })
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({
            message: 'Failed to find user setting with contact_id [steve_contact].',
            status: 404
          });
        });
    });

    it('should throw an error if medic all docs returns an error', () => {
      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').rejects({ error: 'boom' });

      return service
        .getUserSettings({ name: 'steve' })
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ error: 'boom' });
        });
    });
  });

  describe('deleteUser', () => {

    it('returns _users insert errors', () => {
      sinon.stub(db.users, 'get').resolves({});
      sinon.stub(db.medic, 'get').resolves({});
      const put = sinon.stub(db.users, 'put').rejects('Not Found');
      sinon.stub(db.medic, 'put').rejects('Not Found');
      return service.deleteUser('foo').catch(err => {
        chai.expect(err.name).to.equal('Not Found');
        chai.expect(put.callCount).to.equal(1);
      });
    });

    it('sets _deleted on the user-settings doc', () => {
      const userExpected = {
        _id: 'foo_1',
        starsign: 'aries',
        _deleted: true,
      };
      const medicUserExpected = {
        _id: 'foo_2',
        starsign: 'taurus',
        inactive: true,
        deletion_date: (new Date()).valueOf()
      };
      sinon.stub(db.users, 'get').resolves({
        _id: 'foo_1',
        starsign: 'aries',
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'foo_2',
        starsign: 'taurus',
      });
      const usersInsert = sinon.stub(db.users, 'put').resolves();
      const medicUsersInsert = sinon.stub(db.medic, 'put').resolves();
      return service.deleteUser('org.couchdb.user:gareth').then(() => {
        chai.expect(usersInsert.callCount).to.equal(1);
        chai.expect(usersInsert.firstCall.args[0]).to.deep.equal(userExpected);
        chai.expect(medicUsersInsert.firstCall.args[0]).to.deep.equal(medicUserExpected);
      });
    });

  });

  describe('createPlace', () => {
    it('assigns new place', () => {
      sinon.stub(places, 'getOrCreatePlace').resolves({ _id: 'santos' });
      return service.__get__('createPlace')(userData).then(() => {
        chai.expect(userData.place._id).to.equal('santos');
      });
    });
  });

  describe('createUserSettings', () => {

    it('returns error from db insert', () => {
      sinon.stub(db.medic, 'put').rejects('yucky');
      return service.__get__('createUserSettings')(userData).catch(err => {
        chai.expect(err.name).to.equal('yucky');
      });
    });

    it('sets up response', () => {
      sinon.stub(db.medic, 'put').resolves({
        id: 'abc',
        rev: '1-xyz'
      });
      const response = {};
      return service.__get__('createUserSettings')(userData, response).then(() => {
        chai.expect(response).to.deep.equal({
          'user-settings': {
            id: 'abc',
            rev: '1-xyz'
          }
        });
      });
    });

  });

  describe('createContact', () => {

    it('returns error from db insert', () => {
      sinon.stub(people, 'createPerson').returns(Promise.reject('yucky'));
      return service.__get__('createContact')(userData, {}).catch(err => {
        chai.expect(err).to.equal('yucky');
      });
    });

    it('updates contact property', () => {
      sinon.stub(people, 'getOrCreatePerson').resolves({ id: 'abc' });
      const response = {};
      return service.__get__('createContact')(userData, response).then(() => {
        chai.expect(userData.contact).to.deep.equal({ id: 'abc' });
      });
    });

    it('sets up response', () => {
      sinon.stub(people, 'getOrCreatePerson').resolves({ _id: 'abc', _rev: '1-xyz' });
      const response = {};
      return service.__get__('createContact')(userData, response).then(() => {
        chai.expect(response).to.deep.equal({
          contact: {
            id: 'abc',
            rev: '1-xyz'
          }
        });
      });
    });

  });

  describe('createUser', () => {

    it('returns error from db insert', () => {
      sinon.stub(db.users, 'put').rejects('yucky');
      return service.__get__('createUser')(userData, {}).catch(err => {
        chai.expect(err.name).to.equal('yucky');
      });
    });

    it('sets up response', () => {
      sinon.stub(db.users, 'put').resolves({
        id: 'abc',
        rev: '1-xyz'
      });
      const response = {};
      return service.__get__('createUser')(userData, response).then(() => {
        chai.expect(response).to.deep.equal({
          'user': {
            id: 'abc',
            rev: '1-xyz'
          }
        });
      });
    });

  });

  describe('createUser', () => {

    it('returns error if missing fields', () => {
      return service.createUser({})
        .catch(err => chai.expect(err.code).to.equal(400)) // empty
        .then(() => service.createUser({ password: 'x', place: 'x', contact: { parent: 'x' }})) // missing username
        .catch(err => chai.expect(err.code).to.equal(400))
        .then(() => service.createUser({ username: 'x', place: 'x', contact: { parent: 'x' }})) // missing password
        .catch(err => chai.expect(err.code).to.equal(400))
        .then(() => service.createUser({ username: 'x', password: 'x', contact: { parent: 'x' }})) // missing place
        .catch(err => chai.expect(err.code).to.equal(400))
        .then(() => service.createUser({ username: 'x', place: 'x', contact: { parent: 'x' }})) // missing contact
        .catch(err => chai.expect(err.code).to.equal(400))
        .then(() => service.createUser({ username: 'x', place: 'x', contact: {}})) // missing contact.parent
        .catch(err => chai.expect(err.code).to.equal(400));
    });

    it('returns error if short password', () => {
      return service.createUser({
        username: 'x',
        place: 'x',
        contact: { parent: 'x' },
        type: 'national-manager',
        password: 'short'
      }).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message).to.equal('The password must be at least 8 characters long.');
        chai.expect(err.message.translationKey).to.equal('password.length.minimum');
        chai.expect(err.message.translationParams).to.have.property('minimum');
      });
    });

    it('returns error if weak password', () => {
      return service.createUser({
        username: 'x',
        place: 'x',
        contact: { parent: 'x' },
        type: 'national-manager',
        password: 'password'
      }).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message)
          .to.equal('The password is too easy to guess. Include a range of types of characters to increase the score.');
        chai.expect(err.message.translationKey).to.equal('password.weak');
      });
    });

    it('returns error if contact.parent lookup fails', () => {
      service.__set__('validateNewUsername', sinon.stub().resolves());
      service.__set__('createPlace', sinon.stub().resolves());
      service.__set__('setContactParent', sinon.stub().rejects('kablooey'));
      return service.createUser(userData).catch(err => {
        chai.expect(err.name).to.equal('kablooey');
      });
    });

    it('returns error if place lookup fails', () => {
      service.__set__('validateNewUsername', sinon.stub().resolves());
      service.__set__('createPlace', sinon.stub().rejects('fail'));
      return service.createUser(userData).catch(err => {
        chai.expect(err.name).to.equal('fail');
      });
    });

    it('returns error if place is not within contact', () => {
      service.__set__('validateNewUsername', sinon.stub().resolves());
      service.__set__('createPlace', sinon.stub().resolves());
      sinon.stub(places, 'getPlace').resolves({
        _id: 'miami',
        parent: {
          _id: 'florida'
        }
      });
      userData.place = 'georgia';
      return service.createUser(userData).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.translationKey).to.equal('configuration.user.place.contact');
        chai.expect(err.message.message).to.equal('Contact is not within place.');
      });
    });

    it('succeeds if contact and place are the same', () => {
      service.__set__('validateNewUsername', sinon.stub().resolves());
      service.__set__('createPlace', sinon.stub().resolves());
      service.__set__('createUser', sinon.stub().resolves());
      service.__set__('createContact', sinon.stub().resolves());
      service.__set__('storeUpdatedPlace', sinon.stub().resolves());
      service.__set__('createUserSettings', sinon.stub().resolves());
      sinon.stub(places, 'getPlace').resolves({ _id: 'foo' });
      userData.place = 'foo';
      return service.createUser(userData);
    });

    it('succeeds if contact is within place', () => {
      service.__set__('validateNewUsername', sinon.stub().resolves());
      service.__set__('createPlace', sinon.stub().resolves());
      service.__set__('createUser', sinon.stub().resolves());
      service.__set__('createContact', sinon.stub().resolves());
      service.__set__('storeUpdatedPlace', sinon.stub().resolves());
      service.__set__('createUserSettings', sinon.stub().resolves());
      sinon.stub(places, 'getPlace').resolves({
        _id: 'miami',
        parent: {
          _id: 'florida'
        }
      });
      userData.place = 'florida';
      return service.createUser(userData).then(response => {
        chai.expect(response).to.deep.equal({});
      });
    });

    it('fails if new username does not validate', () => {
      service.__set__('validateNewUsername', sinon.stub().rejects('sorry'));
      const insert = sinon.stub(db.medic, 'put');
      return service.createUser(userData).catch(err => {
        chai.expect(err.name).to.equal('sorry');
        chai.expect(insert.callCount).to.equal(0);
      });
    });

    it('errors if username exists in _users db', () => {
      sinon.stub(db.users, 'get').resolves('bob lives here already.');
      sinon.stub(db.medic, 'get').resolves();
      const insert = sinon.stub(db.medic, 'put');
      return service.createUser(userData).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message).to.equal('Username "x" already taken.');
        chai.expect(err.message.translationKey).to.equal('username.taken');
        chai.expect(err.message.translationParams).to.have.property('username');
        chai.expect(insert.callCount).to.equal(0);
      });
    });

    it('errors if username exists in medic db', () => {
      sinon.stub(db.users, 'get').resolves();
      sinon.stub(db.medic, 'get').resolves('jane lives here too.');
      const insert = sinon.stub(db.medic, 'put');
      return service.createUser(userData).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message).to.equal('Username "x" already taken.');
        chai.expect(err.message.translationKey).to.equal('username.taken');
        chai.expect(err.message.translationParams).to.have.property('username');
        chai.expect(insert.callCount).to.equal(0);
      });
    });

  });

  describe('createUsers', () => {
    it('calls `createUser` if the body is not an array', async () => {
      const userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: 'foo',
        contact: { 'parent': 'x' },
        type: 'national-manager'
      };
      service.__set__('validateNewUsername', sinon.stub().resolves());
      service.__set__('createPlace', sinon.stub().resolves());
      service.__set__('createUser', sinon.stub().resolves());
      service.__set__('createContact', sinon.stub().resolves());
      service.__set__('storeUpdatedPlace', sinon.stub().resolves());
      service.__set__('createUserSettings', sinon.stub().resolves());
      sinon.stub(places, 'getPlace').resolves({ _id: 'foo' });
      const response = await service.createUsers(userData);
      chai.expect(response).to.deep.equal({});
    });

    it('returns error if one of the users has missing fields', async () => {
      try {
        sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
        sinon.stub(db.medicLogs, 'put').resolves({});

        const result = await service.createUsers([
          {},
          { password: 'x', place: 'x', contact: { parent: 'x' }},
          { username: 'x', place: 'x', contact: { parent: 'x' }},
          { username: 'x', password: 'x', contact: { parent: 'x' }},
          { username: 'x', place: 'x', contact: { parent: 'x' }},
          { username: 'x', place: 'x', contact: {}},
        ]);

        chai.expect(result).to.have.deep.members([
          { error: 'Missing required fields: username, password, type or roles' },
          { error: 'Missing required fields: username, type or roles' },
          { error: 'Missing required fields: password, type or roles' },
          { error: 'Missing required fields: type or roles' },
          { error: 'Missing required fields: password, type or roles' },
          { error: 'Missing required fields: password, type or roles' },
        ]);
      } catch (error) {
        chai.assert.fail('Should have not thrown');
      }
    });

    it('returns error if one of the users has password errors', async () => {
      try {
        sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
        sinon.stub(db.medicLogs, 'put').resolves({});

        const results = await service.createUsers([
          {
            username: 'x',
            place: 'x',
            contact: { parent: 'x' },
            type: 'national-manager',
            password: 'short',
          },
          {
            username: 'x',
            place: 'x',
            contact: { parent: 'x' },
            type: 'national-manager',
            password: 'password',
          },
        ]);

        chai.expect(results).to.have.deep.members([
          {
            error: {
              message: 'The password must be at least 8 characters long.',
              translationKey: 'password.length.minimum',
              translationParams: { minimum: 8 }
            }
          },
          {
            error: {
              message: 'The password is too easy to guess. Include a range of' +
                ' types of characters to increase the score.',
              translationKey: 'password.weak',
              translationParams: undefined
            }
          },
        ]);
      } catch (error) {
        chai.assert.fail('Should have not thrown');
      }
    });

    it('returns error if one of the users has a missing phone number and should login by SMS', async () => {
      const tokenLoginConfig = { translation_key: 'sms', enabled: true };
      sinon.stub(config, 'get')
        .withArgs('token_login').returns(tokenLoginConfig)
        .withArgs('app_url').returns('url');
      sinon.stub(roles, 'isOffline').returns(false);
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});
      sinon.stub(db.users, 'get').resolves({});
      sinon.stub(db.medic, 'get').resolves({});
      try {
        const result = await service.createUsers([
          {
            username: 'sally',
            roles: ['a', 'b'],
            phone: '+40 755 69-69-69',
            token_login: true,
          },
          {
            username: 'sally',
            roles: ['a', 'b'],
            token_login: true,
          },
        ]);

        chai.expect(result[1]).to.deep.equal({ error: 'Missing required fields: phone' });
      } catch (error) {
        chai.assert.fail('Should have not thrown');
      }
    });

    it('returns error if one of the users has an invalid phone number and should login by SMS', async () => {
      const tokenLoginConfig = { translation_key: 'sms', enabled: true };
      sinon.stub(config, 'get')
        .withArgs('token_login').returns(tokenLoginConfig)
        .withArgs('app_url').returns('url');
      sinon.stub(roles, 'isOffline').returns(false);
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});
      sinon.stub(db.users, 'get').resolves({});
      sinon.stub(db.medic, 'get').resolves({});
      try {
        const result = await service.createUsers([
          {
            username: 'sally',
            roles: ['a', 'b'],
            phone: '+40 755 69-69-69',
            token_login: true,
          },
          {
            username: 'sally',
            roles: ['a', 'b'],
            phone: '123',
            token_login: true,
          },
        ]);

        chai.expect(result[1]).to.deep.equal({ error: 'A valid phone number is required for SMS login.' });
      } catch (error) {
        chai.assert.fail('Should have not thrown');
      }
    });

    it('should normalize phone number and change provided password if should login by SMS', async () => {
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});
      const tokenLoginConfig = { message: 'sms', enabled: true };
      sinon.stub(config, 'get')
        .withArgs('token_login').returns(tokenLoginConfig)
        .withArgs('app_url').returns('');

      sinon.stub(roles, 'isOffline').returns(false);

      const users = [{
        username: 'sally',
        roles: ['a', 'b'],
        phone: '+40 755 69-69-69',
        password: 'random',
        token_login: true,
      }];

      sinon.stub(db.medic, 'put').withArgs(sinon.match({ _id: 'org.couchdb.user:sally' }))
        .resolves({ id: 'org.couchdb.user:sally' });
      sinon.stub(db.users, 'put').withArgs(sinon.match({ _id: 'org.couchdb.user:sally' }))
        .resolves({ id: 'org.couchdb.user:sally' });

      sinon.stub(db.users, 'get').withArgs('org.couchdb.user:sally')
        .onCall(0).rejects({ status: 404 })
        .onCall(1).resolves({
          _id: 'org.couchdb.user:sally',
          type: 'user',
          roles: ['a', 'b', 'mm-online'],
          name: 'sally',
        });
      sinon.stub(db.medic, 'get').withArgs('org.couchdb.user:sally')
        .onCall(0).rejects({ status: 404 })
        .onCall(1).resolves({
          _id: 'org.couchdb.user:sally',
          type: 'user-settings',
          roles: ['a', 'b', 'mm-online'],
          phone: '+40755696969',
          name: 'sally',
        });
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [{ error: 'not_found' }] });

      const response = await service.createUsers(users, 'http://realhost');
      chai.expect(response).to.deep.equal([
        {
          user: { id: 'org.couchdb.user:sally', rev: undefined },
          'user-settings': { id: 'org.couchdb.user:sally', rev: undefined },
          token_login: { expiration_date: oneDayInMS },
        },
      ]);
      chai.expect(db.medic.put.callCount).to.equal(3);
      chai.expect(db.users.put.callCount).to.equal(2);

      chai.expect(db.medic.put.args[0]).to.deep.equal([{
        _id: 'org.couchdb.user:sally',
        name: 'sally',
        type: 'user-settings',
        phone: '+40755696969', // normalized phone
        roles: ['a', 'b', 'mm-online'],
      }]);

      chai.expect(db.users.put.args[0][0]).to.deep.include({
        _id: 'org.couchdb.user:sally',
        name: 'sally',
        type: 'user',
        roles: ['a', 'b', 'mm-online'],
      });
      chai.expect(db.users.put.args[0][0].password).not.to.equal('random');
      chai.expect(db.users.put.args[0][0].password.length).to.equal(20);

      chai.expect(db.medic.put.args[2][0]).to.deep.equal({
        _id: 'org.couchdb.user:sally',
        name: 'sally',
        type: 'user-settings',
        phone: '+40755696969', // normalized phone
        roles: ['a', 'b', 'mm-online'],
        token_login: {
          active: true,
          expiration_date: oneDayInMS,
        },
      });

      chai.expect(db.users.put.args[1][0]).to.deep.include({
        _id: 'org.couchdb.user:sally',
        name: 'sally',
        type: 'user',
        roles: ['a', 'b', 'mm-online'],
      });

      chai.expect(db.users.put.args[1][0].token_login).to.deep.include({
        active: true,
        expiration_date: oneDayInMS,
      });
      const token = db.users.put.args[1][0].token_login.token;
      chai.expect(token.length).to.equal(64);

      const expectedDoc = {
        _id: `token:login:${token}`,
        type: 'token_login',
        reported_date: 0,
        user: 'org.couchdb.user:sally',
        tasks: []
      };
      chai.expect(db.medic.put.args[1][0]).to.deep.equal(expectedDoc);
      chai.expect(addMessage.callCount).to.equal(2);
      chai.expect(addMessage.args[0]).to.deep.equal([
        expectedDoc,
        { enabled: true, message: 'sms' },
        '+40755696969',
        {
          templateContext: {
            _id: 'org.couchdb.user:sally',
            name: 'sally',
            phone: '+40755696969',
            roles: ['a', 'b', 'mm-online'],
            type: 'user'
          }
        }
      ]);
      chai.expect(addMessage.args[1]).to.deep.equal([
        expectedDoc,
        { message: `http://realhost/medic/login/token/${token}` },
        '+40755696969',
      ]);
    });

    describe('errors at insertion', () => {
      it('returns responses with errors if contact.parent lookup fails', async () => {
        const userData = {
          username: 'x',
          password: COMPLEX_PASSWORD,
          place: { name: 'x' },
          contact: { 'parent': 'x' },
          type: 'national-manager'
        };
        service.__set__('validateNewUsername', sinon.stub().resolves());
        service.__set__('createPlace', sinon.stub().resolves());
        service.__set__('setContactParent', sinon.stub().rejects(new Error('kablooey')));
        sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
        sinon.stub(db.medicLogs, 'put').resolves({});

        const response = await service.createUsers([userData]);

        chai.expect(response[0].error).to.equal('kablooey');
      });

      it('returns responses with errors if place lookup fails', async () => {
        const userData = {
          username: 'x',
          password: COMPLEX_PASSWORD,
          place: { name: 'x' },
          contact: { 'parent': 'x' },
          type: 'national-manager'
        };
        service.__set__('validateNewUsername', sinon.stub().resolves());
        service.__set__('createPlace', sinon.stub().rejects(new Error('fail')));
        sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
        sinon.stub(db.medicLogs, 'put').resolves({});

        const response = await service.createUsers([userData]);

        chai.expect(response[0].error).to.equal('fail');
      });

      it('returns responses with errors if username validation fails', async () => {
        const userData = {
          username: 'x',
          password: COMPLEX_PASSWORD,
          place: { name: 'x' },
          contact: { 'parent': 'x' },
          type: 'national-manager'
        };
        service.__set__('validateNewUsername', sinon.stub().rejects(new Error('fail username validation')));
        sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
        sinon.stub(db.medicLogs, 'put').resolves({});

        const response = await service.createUsers([userData]);

        chai.expect(response[0].error).to.equal('fail username validation');
      });

      it('returns responses with errors if contact creation fails', async () => {
        const userData = {
          username: 'x',
          password: COMPLEX_PASSWORD,
          place: { name: 'x' },
          contact: { 'parent': 'x' },
          type: 'national-manager'
        };
        service.__set__('validateNewUsername', sinon.stub().resolves());
        service.__set__('createPlace', sinon.stub().resolves());
        service.__set__('createUser', sinon.stub().resolves());
        service.__set__('setContactParent', sinon.stub().resolves());
        service.__set__('createContact', sinon.stub().rejects(new Error('fail contact creation')));
        sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
        sinon.stub(db.medicLogs, 'put').resolves({});

        const response = await service.createUsers([userData]);

        chai.expect(response[0].error).to.equal('fail contact creation');
      });

      it('returns responses with errors if place update fails', async () => {
        const userData = {
          username: 'x',
          password: COMPLEX_PASSWORD,
          place: { name: 'x' },
          contact: { 'parent': 'x' },
          type: 'national-manager'
        };
        service.__set__('validateNewUsername', sinon.stub().resolves());
        service.__set__('createPlace', sinon.stub().resolves());
        service.__set__('createUser', sinon.stub().resolves());
        service.__set__('setContactParent', sinon.stub().resolves());
        service.__set__('createContact', sinon.stub().resolves());
        service.__set__('storeUpdatedPlace', sinon.stub().rejects(new Error('fail place update')));
        sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
        sinon.stub(db.medicLogs, 'put').resolves({});

        const response = await service.createUsers([userData]);

        chai.expect(response[0].error).to.equal('fail place update');
      });

      it('returns responses with errors if token login fails to be enabled', async () => {
        const tokenLoginConfig = { translation_key: 'sms', enabled: true };
        sinon.stub(config, 'get')
          .withArgs('token_login').returns(tokenLoginConfig)
          .withArgs('app_url').returns('url');
        sinon.stub(roles, 'isOffline').returns(false);

        const userData = {
          username: 'x',
          password: COMPLEX_PASSWORD,
          place: { name: 'x' },
          contact: { 'parent': 'x' },
          type: 'national-manager'
        };
        service.__set__('validateNewUsername', sinon.stub().resolves());
        service.__set__('createPlace', sinon.stub().resolves());
        service.__set__('createUser', sinon.stub().resolves());
        service.__set__('setContactParent', sinon.stub().resolves());
        service.__set__('createContact', sinon.stub().resolves());
        service.__set__('storeUpdatedPlace', sinon.stub().resolves());
        service.__set__('createUser', sinon.stub().resolves());
        service.__set__('createUserSettings', sinon.stub().resolves());
        sinon.stub(tokenLogin, 'manageTokenLogin').rejects(new Error('fail to enable token login'));
        sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
        sinon.stub(db.medicLogs, 'put').resolves({});

        const response = await service.createUsers([userData]);

        chai.expect(response[0].error).to.equal('fail to enable token login');
      });

      it('returns responses with errors if place is not within contact', async () => {
        const userData = {
          username: 'x',
          password: COMPLEX_PASSWORD,
          place: 'georgia',
          contact: { 'parent': 'x' },
          type: 'national-manager'
        };
        service.__set__('validateNewUsername', sinon.stub().resolves());
        service.__set__('createPlace', sinon.stub().resolves());
        sinon.stub(places, 'getPlace').resolves({
          _id: 'miami',
          parent: {
            _id: 'florida'
          }
        });
        sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
        sinon.stub(db.medicLogs, 'put').resolves({});

        const response = await service.createUsers([userData]);

        chai.expect(response[0].error.message).to.equal('Contact is not within place.');
        chai.expect(response[0].error.translationKey).to.equal('configuration.user.place.contact');
      });
    });

    it('succeeds and returns responses if some users fail to be inserted', async () => {
      sinon.stub(db.medic, 'get').resolves({});
      service.__set__('validateNewUsername', sinon.stub().resolves());
      service.__set__('createPlace', sinon.stub().resolves());
      service.__set__('createUser', sinon.stub().resolves());
      service.__set__('createContact', sinon.stub().resolves());
      service.__set__('storeUpdatedPlace', sinon.stub().resolves());
      service.__set__('createUserSettings', sinon.stub().resolves());
      const getPlaceStub = sinon.stub(places, 'getPlace');
      getPlaceStub.withArgs('user1-contact').resolves({
        _id: 'user1-place',
        _rev: 2,
        name: 'user1-place',
        parent: 'user1-contact'
      });
      getPlaceStub.withArgs('user2-contact').resolves();
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});
      const response = await service.createUsers([
        {
          username: 'user1',
          place: 'user1-place',
          contact: { parent: 'user1-contact' },
          type: 'national-manager',
          password: 'Sup3rSecret!',
        },
        {
          username: 'user2',
          place: 'user2-place',
          contact: { parent: 'user2-contact' },
          type: 'national-manager',
          password: 'Sup3rSecret!',
        },
      ]);

      chai.expect(response[0]).to.deep.equal({});
      chai.expect(response[1].error.message).to.equal('Contact is not within place.');
      chai.expect(response[1].error.translationKey).to.equal('configuration.user.place.contact');
    });

    it('succeeds if contact and place are the same', async () => {
      const userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: 'foo',
        contact: { 'parent': 'x' },
        type: 'national-manager'
      };
      service.__set__('validateNewUsername', sinon.stub().resolves());
      service.__set__('createPlace', sinon.stub().resolves());
      service.__set__('createUser', sinon.stub().resolves());
      service.__set__('createContact', sinon.stub().resolves());
      service.__set__('storeUpdatedPlace', sinon.stub().resolves());
      service.__set__('createUserSettings', sinon.stub().resolves());
      sinon.stub(places, 'getPlace').resolves({ _id: 'foo' });
      userData.place = 'foo';
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});

      const response = await service.createUsers([userData]);

      chai.expect(response).to.deep.equal([{}]);
    });

    it('succeeds and response contains the user, contact and user settings fields for each inserted user', async () => {
      const users = [
        {
          username: 'user1',
          place: 'foo',
          contact: 'user1',
          type: 'national-manager',
          password: 'Sup3rSecret!',
        },
        {
          username: 'user2',
          place: 'foo',
          contact: 'user2',
          type: 'national-manager',
          password: 'Sup3rSecret!',
        },
      ];
      const medicGet = sinon.stub(db.medic, 'get');
      const medicPut = sinon.stub(db.medic, 'put');
      const medicQuery = sinon.stub(db.medic, 'query');
      const usersPut = sinon.stub(db.users, 'put');
      service.__set__('validateNewUsername', sinon.stub().resolves());
      service.__set__('storeUpdatedPlace', sinon.stub().resolves());
      sinon.stub(places, 'getPlace').resolves({ _id: 'foo' });
      medicGet.withArgs('user1')
        .onFirstCall().rejects({ status: 404 })
        .onSecondCall().resolves({ type: 'person', _id: 'contact_id', _rev: 1 })
        .withArgs('user2')
        .onFirstCall().rejects({ status: 404 })
        .onSecondCall().resolves({ type: 'person', _id: 'contact_id', _rev: 1 });
      usersPut.callsFake(user => Promise.resolve({ id: user._id, rev: 1 }));
      medicQuery.resolves({ rows: [] });
      medicPut.callsFake(userSettings => Promise.resolve({ id: userSettings._id, rev: 1 }));
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});
      const getOrCreatePerson = sinon.stub(people, 'getOrCreatePerson').resolves({
        _id: 'contact_id',
        _rev: 1,
      });

      const response = await service.createUsers(users);

      chai.expect(response).to.deep.equal([
        {
          contact: {
            id: 'contact_id',
            rev: 1,
          },
          user: {
            id: 'org.couchdb.user:user1',
            rev: 1,
          },
          'user-settings': {
            id: 'org.couchdb.user:user1',
            rev: 1,
          },
        },
        {
          contact: {
            id: 'contact_id',
            rev: 1,
          },
          user: {
            id: 'org.couchdb.user:user2',
            rev: 1,
          },
          'user-settings': {
            id: 'org.couchdb.user:user2',
            rev: 1,
          },
        },
      ]);
      chai.expect(getOrCreatePerson.callCount).to.equal(2);
      chai.expect(getOrCreatePerson.args).to.deep.equal([['user1'], ['user2']]);
    });

    it('succeeds if contact is within place', async () => {
      const userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: 'florida',
        contact: { 'parent': 'x' },
        type: 'national-manager'
      };
      service.__set__('validateNewUsername', sinon.stub().resolves());
      service.__set__('createPlace', sinon.stub().resolves());
      service.__set__('createUser', sinon.stub().resolves());
      service.__set__('createContact', sinon.stub().resolves());
      service.__set__('storeUpdatedPlace', sinon.stub().resolves());
      service.__set__('createUserSettings', sinon.stub().resolves());
      sinon.stub(places, 'getPlace').resolves({
        _id: 'miami',
        parent: {
          _id: 'florida'
        }
      });
      userData.place = 'florida';
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});

      const response = await service.createUsers([userData]);

      chai.expect(response).to.deep.equal([{}]);
    });

    it('errors if username exists in _users db', async () => {
      const userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: { name: 'x' },
        contact: { 'parent': 'x' },
        type: 'national-manager'
      };
      sinon.stub(db.users, 'get').resolves('bob lives here already.');
      sinon.stub(db.medic, 'get').rejects({ status: 404 });
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});
      const insert = sinon.stub(db.medic, 'put');

      const response = await service.createUsers([userData]);

      chai.expect(response[0].error.message).to.equal('Username "x" already taken.');
      chai.expect(response[0].error.translationKey).to.equal('username.taken');
      chai.expect(response[0].error.translationParams).to.have.property('username');
      chai.expect(insert.callCount).to.equal(0);
    });

    it('errors if username exists in medic db', async () => {
      const userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: { name: 'x' },
        contact: { 'parent': 'x' },
        type: 'national-manager'
      };
      sinon.stub(db.users, 'get').rejects({ status: 404 });
      sinon.stub(db.medic, 'get').resolves('jane lives here too.');
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});
      const insert = sinon.stub(db.medic, 'put');

      const response = await service.createUsers([userData]);

      chai.expect(response[0].error.message).to.equal('Username "x" already taken.');
      chai.expect(response[0].error.translationKey).to.equal('username.taken');
      chai.expect(response[0].error.translationParams).to.have.property('username');
      chai.expect(insert.callCount).to.equal(0);
    });
  });

  describe('setContactParent', () => {

    it('resolves contact parent in waterfall', () => {
      service.__set__('validateNewUsername', sinon.stub().resolves());
      service.__set__('createPlace', sinon.stub().resolves());
      service.__set__('hasParent', sinon.stub().resolves());
      service.__set__('createContact', sinon.stub().resolves());
      service.__set__('storeUpdatedPlace', sinon.stub().resolves());
      service.__set__('createUserSettings', sinon.stub().resolves());
      service.__set__('createUser', sinon.stub().resolves());

      sinon.stub(places, 'getPlace').resolves({
        _id: 'a',
        biz: 'marquee'
      });
      return service.createUser(userData).then(() => {
        chai.expect(service.__get__('createContact').args[0][0].contact.parent).to.deep.equal({ _id: 'a' });
      });
    });

    it('fails validation if contact is not in place using id', () => {
      const userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: 'abc',
        contact: 'def',
        type: 'national-manager'
      };
      service.__set__('validateNewUsername', sinon.stub().resolves());
      service.__set__('createPlace', sinon.stub().resolves());
      sinon.stub(db.medic, 'get').resolves({
        _id: 'def',
        type: 'person',
        name: 'greg',
        parent: {
          _id: 'efg'
        }
      });
      sinon.stub(people, 'isAPerson').returns(true);
      return service.createUser(userData).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message).to.equal('Contact is not within place.');
        chai.expect(err.message.translationKey).to.equal('configuration.user.place.contact');
      });
    });

    it('passes validation if contact is in place using id', () => {
      const userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: 'efg',
        contact: 'def',
        type: 'national-manager'
      };
      service.__set__('validateNewUsername', sinon.stub().resolves());
      service.__set__('createPlace', sinon.stub().resolves());
      sinon.stub(db.medic, 'get').resolves({
        _id: 'def',
        type: 'person',
        name: 'greg',
        parent: {
          _id: 'efg'
        }
      });
      sinon.stub(people, 'isAPerson').returns(true);
      service.__set__('createContact', sinon.stub().resolves());
      service.__set__('storeUpdatedPlace', sinon.stub().resolves());
      service.__set__('createUser', sinon.stub().resolves());
      service.__set__('createUserSettings', sinon.stub().resolves());
      return service.createUser(userData).then(() => {
        chai.expect(service.__get__('createContact').args[0][0].contact).to.equal('def');
      });
    });

  });

  describe('updatePlace', () => {

    it('updatePlace resolves place\'s contact in waterfall', () => {
      userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: { name: 'y', parent: 'parent' },
        contact: { name: 'mickey' },
        type: 'national-manager'
      };
      service.__set__('validateNewUsername', sinon.stub().resolves());
      sinon.stub(places, 'getOrCreatePlace').resolves({
        _id: 'place_id',
        _rev: 1,
        name: 'x',
        parent: 'parent',
      });
      const place = { _id: 'place_id', _rev: 2, name: 'x', parent: 'parent' };
      sinon.stub(places, 'getPlace').resolves(place);
      sinon.stub(people, 'getOrCreatePerson').resolves({
        _id: 'b',
        name: 'mickey'
      });
      sinon.stub(db.medic, 'get').resolves(place);
      sinon.stub(db.medic, 'put').resolves();
      service.__set__('createUser', sinon.stub().resolves());
      service.__set__('createUserSettings', sinon.stub().resolves());
      return service.createUser(userData).then(() => {
        chai.expect(userData.contact).to.deep.equal({ _id: 'b', name: 'mickey' });
        chai.expect(userData.place.contact).to.deep.equal({ _id: 'b' });
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(db.medic.get.args[0]).to.deep.equal(['place_id']);
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.medic.put.args[0]).to.deep.equal([{
          _id: 'place_id', _rev: 2, name: 'x', contact: { _id: 'b' }, parent: 'parent',
        }]);
      });
    });

    it('should catch conflicts', () => {
      userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: { name: 'y', parent: 'parent' },
        contact: { name: 'mickey' },
        type: 'national-manager'
      };

      service.__set__('validateNewUsername', sinon.stub().resolves());

      const placeRev1 = { _id: 'place_id', _rev: 1, name: 'x', parent: 'parent' };
      const placeRev2 = { _id: 'place_id', _rev: 2, name: 'x', parent: 'parent', place_id: 'aaaa' };
      sinon.stub(places, 'getOrCreatePlace').resolves(placeRev1);
      sinon.stub(places, 'getPlace').resolves(placeRev1);
      sinon.stub(people, 'getOrCreatePerson').resolves({
        _id: 'b',
        name: 'mickey'
      });
      sinon.stub(db.medic, 'get')
        .onCall(0).resolves(placeRev1)
        .onCall(1).resolves(placeRev2);
      sinon.stub(db.medic, 'put')
        .onCall(0).rejects({ status: 409, reason: 'conflict' })
        .onCall(1).resolves();
      service.__set__('createUser', sinon.stub().resolves());
      service.__set__('createUserSettings', sinon.stub().resolves());

      return service.createUser(userData).then(() => {
        chai.expect(userData.contact).to.deep.equal({ _id: 'b', name: 'mickey' });
        chai.expect(userData.place.contact).to.deep.equal({ _id: 'b' });
        chai.expect(db.medic.get.callCount).to.equal(2);
        chai.expect(db.medic.get.args).to.deep.equal([['place_id'], ['place_id']]);
        chai.expect(db.medic.put.callCount).to.equal(2);
        chai.expect(db.medic.put.args[0]).to.deep.equal([{
          _id: 'place_id', _rev: 1, name: 'x', contact: { _id: 'b' }, parent: 'parent',
        }]);
        chai.expect(db.medic.put.args[1]).to.deep.equal([{
          _id: 'place_id', _rev: 2, name: 'x', contact: { _id: 'b' }, parent: 'parent', place_id: 'aaaa',
        }]);
      });
    });

    it('should retry 3 times on conflicts', () => {
      userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: { name: 'y', parent: 'parent' },
        contact: { name: 'mickey' },
        type: 'national-manager'
      };
      service.__set__('validateNewUsername', sinon.stub().resolves());

      const placeRev1 = { _id: 'place_id', _rev: 1, name: 'x', parent: 'parent' };
      const placeRev2 = { _id: 'place_id', _rev: 2, name: 'x', parent: 'parent', place_id: 'aaaa' };
      const placeRev3 = { _id: 'place_id', _rev: 3, name: 'x', parent: 'parent', place_id: 'aaaa' };
      const placeRev4 = { _id: 'place_id', _rev: 4, name: 'x', parent: 'parent', place_id: 'aaaa' };
      sinon.stub(places, 'getOrCreatePlace').resolves(placeRev1);
      sinon.stub(places, 'getPlace').resolves(placeRev1);
      sinon.stub(people, 'getOrCreatePerson').resolves({ _id: 'b', name: 'mickey' });
      sinon.stub(db.medic, 'get')
        .onCall(0).resolves(placeRev1)
        .onCall(1).resolves(placeRev2)
        .onCall(2).resolves(placeRev3)
        .onCall(3).resolves(placeRev4);
      sinon.stub(db.medic, 'put')
        .onCall(0).rejects({ status: 409, reason: 'conflict' })
        .onCall(1).rejects({ status: 409, reason: 'conflict' })
        .onCall(2).rejects({ status: 409, reason: 'conflict' })
        .onCall(3).resolves();
      service.__set__('createUser', sinon.stub().resolves());
      service.__set__('createUserSettings', sinon.stub().resolves());
      return service.createUser(userData).then(() => {
        chai.expect(userData.contact).to.deep.equal({ _id: 'b', name: 'mickey' });
        chai.expect(userData.place.contact).to.deep.equal({ _id: 'b' });
        chai.expect(db.medic.get.callCount).to.equal(4);
        chai.expect(db.medic.get.args).to.deep.equal([['place_id'], ['place_id'], ['place_id'], ['place_id']]);
        chai.expect(db.medic.put.callCount).to.equal(4);
        chai.expect(db.medic.put.args[0]).to.deep.equal([{
          _id: 'place_id', _rev: 1, name: 'x', contact: { _id: 'b' }, parent: 'parent',
        }]);
        chai.expect(db.medic.put.args[1]).to.deep.equal([{
          _id: 'place_id', _rev: 2, name: 'x', contact: { _id: 'b' }, parent: 'parent', place_id: 'aaaa',
        }]);
      });
    });

    it('should throw after 4 conflicts', () => {
      userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: { name: 'y', parent: 'parent' },
        contact: { name: 'mickey' },
        type: 'national-manager'
      };

      service.__set__('validateNewUsername', sinon.stub().resolves());

      const placeRev1 = { _id: 'place_id', _rev: 1, name: 'x', parent: 'parent' };
      const placeRev2 = { _id: 'place_id', _rev: 2, name: 'x', parent: 'parent', place_id: 'aaaa' };
      const placeRev3 = { _id: 'place_id', _rev: 3, name: 'x', parent: 'parent', place_id: 'aaaa' };
      const placeRev4 = { _id: 'place_id', _rev: 4, name: 'x', parent: 'parent', place_id: 'aaaa' };
      const placeRev5 = { _id: 'place_id', _rev: 5, name: 'x', parent: 'parent', place_id: 'aaaa' };
      sinon.stub(places, 'getOrCreatePlace').resolves(placeRev1);
      sinon.stub(places, 'getPlace').resolves(placeRev1);
      sinon.stub(people, 'getOrCreatePerson').resolves({ _id: 'b', name: 'mickey' });
      sinon.stub(db.medic, 'get')
        .onCall(0).resolves(placeRev1)
        .onCall(1).resolves(placeRev2)
        .onCall(2).resolves(placeRev3)
        .onCall(3).resolves(placeRev4)
        .onCall(4).resolves(placeRev5);
      const conflictErr = new Error('conflict');
      conflictErr.status = 409;
      sinon.stub(db.medic, 'put')
        .onCall(0).rejects(conflictErr)
        .onCall(1).rejects(conflictErr)
        .onCall(2).rejects(conflictErr)
        .onCall(3).rejects(conflictErr)
        .onCall(4).resolves();
      service.__set__('createUser', sinon.stub().resolves());
      service.__set__('createUserSettings', sinon.stub().resolves());
      return service
        .createUser(userData)
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.equal(conflictErr);
          chai.expect(db.medic.get.callCount).to.equal(4);
          chai.expect(db.medic.get.args).to.deep.equal([['place_id'], ['place_id'], ['place_id'], ['place_id']]);
          chai.expect(db.medic.put.callCount).to.equal(4);
          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'place_id', _rev: 1, name: 'x', contact: { _id: 'b' }, parent: 'parent',
          }]);
          chai.expect(db.medic.put.args[1]).to.deep.equal([{
            _id: 'place_id', _rev: 2, name: 'x', contact: { _id: 'b' }, parent: 'parent', place_id: 'aaaa',
          }]);
          chai.expect(service.__get__('createUser').callCount).to.equal(0);
        });
    });

    it('should throw any other error than a conflict', () => {
      userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: { name: 'y', parent: 'parent' },
        contact: { name: 'mickey' },
        type: 'national-manager'
      };
      service.__set__('validateNewUsername', sinon.stub().resolves());

      const place = { _id: 'place_id', _rev: 1, name: 'x', parent: 'parent' };
      sinon.stub(places, 'getOrCreatePlace').resolves(place);
      sinon.stub(places, 'getPlace').resolves(place);
      sinon.stub(people, 'getOrCreatePerson').resolves({
        _id: 'b',
        name: 'mickey'
      });
      sinon.stub(db.medic, 'get').resolves(place);
      sinon.stub(db.medic, 'put').rejects({ status: 400, reason: 'not-a-conflict' });
      service.__set__('createUser', sinon.stub().resolves());
      service.__set__('createUserSettings', sinon.stub().resolves());
      return service
        .createUser(userData)
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ status: 400, reason: 'not-a-conflict' });
          chai.expect(db.medic.get.callCount).to.equal(1);
          chai.expect(db.medic.get.args).to.deep.equal([['place_id']]);
          chai.expect(db.medic.put.callCount).to.equal(1);
          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'place_id', _rev: 1, name: 'x', contact: { _id: 'b' }, parent: 'parent',
          }]);
          chai.expect(service.__get__('createUser').callCount).to.equal(0);
        });
    });

  });

  describe('updateUser', () => {

    it('errors if place, type and password is undefined', () => {
      return service.updateUser('paul', {}, true).catch(err => {
        chai.expect(err.code).to.equal(400);
      });
    });

    it('errors on unknown property', () => {
      return service.updateUser('paul', {foo: 'bar'}, true).catch(err => {
        chai.expect(err.code).to.equal(400);
      });
    });

    it('fails if place fetch fails', () => {
      const data = {
        place: 'x'
      };
      service.__set__('validateUser', sinon.stub().resolves());
      service.__set__('validateUserSettings', sinon.stub().resolves());
      sinon.stub(places, 'getPlace').rejects('Not today pal.');
      const update = sinon.stub(db.medic, 'put');
      return service.updateUser('paul', data, true).catch(() => {
        chai.expect(update.callCount).to.equal(0);
      });
    });

    it('fails if user not found', () => {
      const data = {
        type: 'x'
      };
      service.__set__('validateUser', sinon.stub().rejects('not found'));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      const update = sinon.stub(db.medic, 'put');
      return service.updateUser('paul', data, true).catch(() => {
        chai.expect(update.callCount).to.equal(0);
      });
    });

    it('fails if user settings not found', () => {
      const data = {
        type: 'x'
      };
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().rejects('too rainy today'));
      const update = sinon.stub(db.medic, 'put');
      return service.updateUser('paul', data, true).catch(() => {
        chai.expect(update.callCount).to.equal(0);
      });
    });

    it('fails if users db insert fails', () => {
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      sinon.stub(db.medic, 'put').resolves();
      sinon.stub(db.users, 'put').returns(Promise.reject('shiva was here'));
      return service.updateUser('georgi', {type: 'x'}, true).catch(err => {
        chai.expect(err).to.equal('shiva was here');
      });
    });

    it('fails if medic db insert fails', () => {
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      sinon.stub(db.medic, 'put').returns(Promise.reject('shiva strikes again'));
      sinon.stub(db.users, 'put').resolves({});
      return service.updateUser('georgi', {type: 'x'}, true).catch(err => {
        chai.expect(err).to.equal('shiva strikes again');
      });
    });

    it('succeeds if type is defined', () => {
      const data = {
        type: 'x'
      };
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      return service.updateUser('paul', data, true).then(() => {
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.users.put.callCount).to.equal(1);
      });
    });

    it('succeeds if password is defined', () => {
      const data = {
        password: COMPLEX_PASSWORD
      };
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      return service.updateUser('paul', data, true).then(() => {
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.users.put.callCount).to.equal(1);
      });
    });

    it('succeeds if place is defined and found', () => {
      const data = {
        place: 'x'
      };
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      sinon.stub(places, 'getPlace').resolves();
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      return service.updateUser('paul', data, true).then(() => {
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.users.put.callCount).to.equal(1);
      });
    });

    it('roles param updates roles on user and user-settings doc', () => {
      const data = {
        roles: [ 'rebel' ]
      };
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      sinon.stub(roles, 'isOffline').withArgs(['rebel']).returns(false);
      return service.updateUser('paul', data, true).then(() => {
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.medic.put.args[0][0].roles).to.deep.equal(['rebel', 'mm-online']);
        chai.expect(db.users.put.callCount).to.equal(1);
        chai.expect(db.users.put.args[0][0].roles).to.deep.equal(['rebel', 'mm-online']);
      });
    });

    it('roles param updates roles on user and user-settings doc when offline', () => {
      const data = {
        roles: [ 'rebel' ]
      };
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      sinon.stub(roles, 'isOffline').withArgs(['rebel']).returns(true);
      return service.updateUser('paul', data, true).then(() => {
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.medic.put.args[0][0].roles).to.deep.equal(['rebel']);
        chai.expect(db.users.put.callCount).to.equal(1);
        chai.expect(db.users.put.args[0][0].roles).to.deep.equal(['rebel']);
      });
    });

    it('updates password on user doc', () => {
      const data = {
        password: COMPLEX_PASSWORD
      };
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      sinon.stub(places, 'getPlace').resolves();
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      return service.updateUser('paul', data, true).then(() => {
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.users.put.callCount).to.equal(1);
        chai.expect(db.users.put.args[0][0].password).to.equal(COMPLEX_PASSWORD);
      });
    });

    it('returns error if short password', () => {
      const data = {
        password: 'short'
      };
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      return service.updateUser('paul', data, true).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.translationKey).to.equal('password.length.minimum');
        chai.expect(err.message.translationParams).to.have.property('minimum');
        chai.expect(err.message.message).to.equal('The password must be at least 8 characters long.');
        chai.expect(db.medic.put.callCount).to.equal(0);
        chai.expect(db.users.put.callCount).to.equal(0);
      });
    });

    it('returns error if weak password', () => {
      const data = {
        password: 'aaaaaaaa'
      };
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      return service.updateUser('paul', data, true).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.translationKey).to.equal('password.weak');
        chai.expect(err.message.message)
          .to.equal('The password is too easy to guess. Include a range of types of characters to increase the score.');
        chai.expect(db.medic.put.callCount).to.equal(0);
        chai.expect(db.users.put.callCount).to.equal(0);
      });
    });

    it('updates facility_id on user and user settings', () => {
      const data = {
        place: 'paris'
      };
      service.__set__('validateUser', sinon.stub().resolves({ facility_id: 'maine' }));
      service.__set__('validateUserSettings', sinon.stub().resolves({ facility_id: 'maine' }));
      sinon.stub(places, 'getPlace').resolves();
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      return service.updateUser('paul', data, true).then(() => {
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.medic.put.args[0][0].facility_id).to.equal('paris');
        chai.expect(db.users.put.callCount).to.equal(1);
        chai.expect(db.users.put.args[0][0].facility_id).to.equal('paris');
      });
    });

    it('removes facility_id/contact on user and user settings for online user', () => {
      const data = {
        place: null,
        contact: null
      };
      service.__set__('validateUser', sinon.stub().resolves({
        facility_id: 'maine',
        roles: ['mm-online']
      }));
      service.__set__('validateUserSettings', sinon.stub().resolves({
        facility_id: 'maine',
        contact_id: 1
      }));
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      return service.updateUser('paul', data, true).then(() => {
        chai.expect(db.medic.put.callCount).to.equal(1);
        const settings = db.medic.put.args[0][0];
        chai.expect(settings.facility_id).to.equal(null);
        chai.expect(settings.contact_id).to.equal(null);

        chai.expect(db.users.put.callCount).to.equal(1);
        const user = db.users.put.args[0][0];
        chai.expect(user.facility_id).to.equal(null);
      });
    });

    it('updates user and user settings doc', () => {
      const data = {
        place: 'el paso',
        type: 'rambler',
        password: COMPLEX_PASSWORD
      };
      service.__set__('validateUser', sinon.stub().resolves({
        facility_id: 'maine',
        roles: ['bartender'],
        shoes: 'dusty boots'
      }));
      service.__set__('validateUserSettings', sinon.stub().resolves({
        facility_id: 'maine',
        phone: '123',
        known: false
      }));
      sinon.stub(places, 'getPlace').resolves();
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      sinon.stub(roles, 'isOffline').withArgs(['rambler']).returns(false);
      return service.updateUser('paul', data, true).then(() => {
        chai.expect(db.medic.put.callCount).to.equal(1);
        const settings = db.medic.put.args[0][0];
        chai.expect(settings.facility_id).to.equal('el paso');
        chai.expect(settings.phone).to.equal('123');
        chai.expect(settings.known).to.equal(false);
        chai.expect(settings.type).to.equal('user-settings');
        chai.expect(settings.roles).to.deep.equal(['rambler', 'mm-online']);

        chai.expect(db.users.put.callCount).to.equal(1);
        const user = db.users.put.args[0][0];
        chai.expect(user.facility_id).to.equal('el paso');
        chai.expect(user.roles).to.deep.equal(['rambler', 'mm-online']);
        chai.expect(user.shoes).to.equal('dusty boots');
        chai.expect(user.password).to.equal(COMPLEX_PASSWORD);
        chai.expect(user.type).to.equal('user');
      });
    });

    it('does not add online role for offline users', () => {
      const data = {
        place: 'el paso',
        roles: ['chp'],
        password: COMPLEX_PASSWORD
      };
      service.__set__('validateUser', sinon.stub().resolves({
        facility_id: 'maine',
        roles: ['chp'],
        shoes: 'dusty boots'
      }));
      service.__set__('validateUserSettings', sinon.stub().resolves({
        facility_id: 'maine',
        phone: '123',
        known: false
      }));
      sinon.stub(config, 'get').returns({ chp: { offline: true } });
      sinon.stub(places, 'getPlace').resolves();
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      return service.updateUser('paul', data, true).then(() => {
        chai.expect(db.medic.put.callCount).to.equal(1);
        const settings = db.medic.put.args[0][0];
        chai.expect(settings.roles).to.deep.equal(['chp']);

        chai.expect(db.users.put.callCount).to.equal(1);
        const user = db.users.put.args[0][0];
        chai.expect(user.roles).to.deep.equal(['chp']);
      });
    });

    it('sets up response', () => {
      const data = {
        fullname: 'George'
      };
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      sinon.stub(db.medic, 'put').resolves({ id: 'abc', rev: '1-xyz' });
      sinon.stub(db.users, 'put').resolves({ id: 'def', rev: '1-uvw' });
      return service.updateUser('georgi', data, true).then(resp => {
        chai.expect(resp.user).to.deep.equal({
          id: 'def',
          rev: '1-uvw'
        });
        chai.expect(resp['user-settings']).to.deep.equal({
          id: 'abc',
          rev: '1-xyz'
        });
      });
    });

    it('succeeds if only language is defined by a user with full access', () => {
      const data = {
        language: 'es'
      };
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      const medicPut = sinon.stub(db.medic, 'put').resolves({});
      const usersPut = sinon.stub(db.users, 'put').resolves({});
      return service.updateUser('paul', data, true).then(() => {
        chai.expect(medicPut.callCount).to.equal(1);
        chai.expect(medicPut.args[0]).to.deep.equal([ {
          'name': 'paul',
          'type': 'user-settings',
          '_id': 'org.couchdb.user:paul'
        } ]);
        chai.expect(usersPut.callCount).to.equal(1);
        chai.expect(usersPut.args[0]).to.deep.equal([ {
          'name': 'paul',
          'type': 'user',
          '_id': 'org.couchdb.user:paul'
        } ]);
      });
    });

    it('succeeds if only language is defined by a user without full access', () => {
      const data = {
        language: 'es'
      };
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      const medicPut = sinon.stub(db.medic, 'put').resolves({});
      const usersPut = sinon.stub(db.users, 'put').resolves({});
      return service.updateUser('paul', data, false).then(() => {
        chai.expect(medicPut.callCount).to.equal(1);
        chai.expect(medicPut.args[0]).to.deep.equal([ {
          'name': 'paul',
          'type': 'user-settings',
          '_id': 'org.couchdb.user:paul'
        } ]);
        chai.expect(usersPut.callCount).to.equal(1);
        chai.expect(usersPut.args[0]).to.deep.equal([ {
          'name': 'paul',
          'type': 'user',
          '_id': 'org.couchdb.user:paul'
        } ]);
      });
    });

    it('should update the admin password in CouchDB config', async () => {
      const data = { password: COMPLEX_PASSWORD };
      couchSettings.getCouchConfig.resolves({
        admin1: 'password_1',
        admin2: 'password_2',
      });
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});

      await service.updateUser('admin2', data, true);

      chai.expect(db.medic.put.callCount).to.equal(1);
      chai.expect(db.medic.put.args[0][0]).to.deep.equal({
        _id: 'org.couchdb.user:admin2',
        name: 'admin2',
        type: 'user-settings',
      });
      chai.expect(db.users.put.callCount).to.equal(1);
      chai.expect(db.users.put.args[0][0]).to.deep.equal({
        _id: 'org.couchdb.user:admin2',
        name: 'admin2',
        password: COMPLEX_PASSWORD,
        type: 'user',
      });
      chai.expect(couchSettings.updateAdminPassword.calledOnce).to.be.true;
      chai.expect(couchSettings.updateAdminPassword.args[0]).to.deep.equal(['admin2', COMPLEX_PASSWORD]);
      chai.expect(couchSettings.getCouchConfig.calledOnce).to.be.true;
      chai.expect(couchSettings.getCouchConfig.args[0]).to.deep.equal(['admins']);
    });

    it('should update admin when no password is sent', async () => {
      const data = { fullname: 'John Smith' };
      couchSettings.getCouchConfig.resolves({
        admin1: 'password_1',
        admin2: 'password_2',
      });
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});

      await service.updateUser('admin2', data, true);

      chai.expect(db.medic.put.callCount).to.equal(1);
      chai.expect(db.medic.put.args[0][0]).to.deep.equal({
        _id: 'org.couchdb.user:admin2',
        name: 'admin2',
        type: 'user-settings',
        fullname: 'John Smith',
      });
      chai.expect(db.users.put.callCount).to.equal(1);
      chai.expect(db.users.put.args[0][0]).to.deep.equal({
        _id: 'org.couchdb.user:admin2',
        name: 'admin2',
        type: 'user',
      });
      chai.expect(couchSettings.updateAdminPassword.callCount).to.equal(0);
      chai.expect(couchSettings.getCouchConfig.callCount).to.equal(0);
    });

    it('should not update the password in CouchDB config if user isnt admin', async () => {
      const data = { password: COMPLEX_PASSWORD };
      couchSettings.getCouchConfig.resolves({
        admin1: 'password_1',
        admin2: 'password_2',
      });
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});

      await service.updateUser('anne', data, true);

      chai.expect(db.medic.put.callCount).to.equal(1);
      chai.expect(db.medic.put.args[0][0]).to.deep.equal({
        _id: 'org.couchdb.user:anne',
        name: 'anne',
        type: 'user-settings',
      });
      chai.expect(db.users.put.callCount).to.equal(1);
      chai.expect(db.users.put.args[0][0]).to.deep.equal({
        _id: 'org.couchdb.user:anne',
        name: 'anne',
        type: 'user',
        password: COMPLEX_PASSWORD,
      });
      chai.expect(couchSettings.updateAdminPassword.callCount).to.equal(0);
      chai.expect(couchSettings.getCouchConfig.callCount).to.equal(1);
      chai.expect(couchSettings.getCouchConfig.args[0]).to.deep.equal(['admins']);
    });
  });

  describe('validateNewUsername', () => {

    it('fails if a user already exists with that name', () => {
      const usersGet = sinon.stub(db.users, 'get').resolves({ id: 'abc', rev: '1-xyz' });
      sinon.stub(db.medic, 'get').returns(Promise.reject({ status: 404 }));
      return service.__get__('validateNewUsername')('georgi').catch(err => {
        chai.expect(usersGet.callCount).to.equal(1);
        chai.expect(usersGet.args[0][0]).to.equal('org.couchdb.user:georgi');
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message).to.equal('Username "georgi" already taken.');
        chai.expect(err.message.translationKey).to.equal('username.taken');
        chai.expect(err.message.translationParams).to.have.property('username');
      });
    });

    it('fails if a user settings already exists with that name', () => {
      sinon.stub(db.users, 'get').returns(Promise.reject({ status: 404 }));
      const medicGet = sinon.stub(db.medic, 'get').resolves({ id: 'abc', rev: '1-xyz' });
      return service.__get__('validateNewUsername')('georgi').catch(err => {
        chai.expect(medicGet.callCount).to.equal(1);
        chai.expect(medicGet.args[0][0]).to.equal('org.couchdb.user:georgi');
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message).to.equal('Username "georgi" already taken.');
        chai.expect(err.message.translationKey).to.equal('username.taken');
        chai.expect(err.message.translationParams).to.have.property('username');
      });
    });

    it('fails if username contains invalid characters', () => {
      return service.__get__('validateNewUsername')('^_^').catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message).to.equal(
          'Invalid user name. Valid characters are lower case letters, numbers, underscore (_), and hyphen (-).'
        );
        chai.expect(err.message.translationKey).to.equal('username.invalid');
      });
    });

    it('passes if no user exists', () => {
      sinon.stub(db.users, 'get').returns(Promise.reject({ status: 404 }));
      sinon.stub(db.medic, 'get').returns(Promise.reject({ status: 404 }));
      return service.__get__('validateNewUsername')('georgi');
    });

  });

  describe('createAdmin', () => {
    it('should throw if username already exists', () => {
      sinon.stub(db.medic, 'get').resolves({});
      sinon.stub(db.users, 'get').rejects({ status: 404 });
      return service
        .createAdmin({ name: 'my_user' })
        .then(() => chai.expect().to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.include({ code: 400 });
          chai.expect(db.medic.get.callCount).to.equal(1);
          chai.expect(db.medic.get.args[0]).to.deep.equal(['org.couchdb.user:my_user']);
          chai.expect(db.users.get.callCount).to.equal(2);
          chai.expect(db.users.get.args).to.deep.equal([['org.couchdb.user:my_user'], ['org.couchdb.user:my_user']]);
        });
    });

    it('should throw if _users doc creation fails', () => {
      sinon.stub(db.medic, 'get').rejects({ status: 404 });
      sinon.stub(db.users, 'get').rejects({ status: 404 });

      sinon.stub(db.users, 'put').rejects({ some: 'err' });
      return service
        .createAdmin({ name: 'agatha' })
        .then(() => chai.expect().to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0]).to.deep.equal([
            { name: 'agatha', type: 'user', roles: ['admin'], _id: 'org.couchdb.user:agatha' }
          ]);
        });
    });

    it('should throw if user-settings doc creation fails', () => {
      sinon.stub(db.medic, 'get').rejects({ status: 404 });
      sinon.stub(db.users, 'get').rejects({ status: 404 });

      sinon.stub(db.users, 'put').resolves({ id: 'org.couchdb.user:agatha', rev: 1 });
      sinon.stub(db.medic, 'put').rejects({ some: 'err' });
      return service
        .createAdmin({ name: 'agatha' })
        .then(() => chai.expect().to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0]).to.deep.equal([
            { name: 'agatha', type: 'user', roles: ['admin'], _id: 'org.couchdb.user:agatha' }
          ]);
          chai.expect(db.medic.put.callCount).to.equal(1);
          chai.expect(db.medic.put.args[0]).to.deep.equal([
            { name: 'agatha', type: 'user-settings', roles: ['admin'], _id: 'org.couchdb.user:agatha' }
          ]);
        });
    });

    it('should throw if validating user fails for something other than a 404', () => {
      sinon.stub(db.users, 'get').rejects({ status: 500 });

      sinon.stub(db.users, 'put');
      sinon.stub(db.medic, 'put');
      return service
        .createAdmin({ name: 'agatha' })
        .then(() => chai.expect().to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ status: 500 });
          chai.expect(db.users.put.callCount).to.equal(0);
          chai.expect(db.medic.put.callCount).to.equal(0);
        });
    });

    it('should return new user-settings when successfull', () => {
      sinon.stub(db.medic, 'get').rejects({ status: 404 });
      sinon.stub(db.users, 'get').rejects({ status: 404 });

      sinon.stub(db.users, 'put').resolves({ id: 'org.couchdb.user:perseus', rev: 1 });
      sinon.stub(db.medic, 'put').resolves({ id: 'org.couchdb.user:perseus', rev: 1 });
      return service.createAdmin({ name: 'perseus' }).then(() => {
        chai.expect(db.users.put.callCount).to.equal(1);
        chai.expect(db.users.put.args[0]).to.deep.equal([
          { name: 'perseus', type: 'user', roles: ['admin'], _id: 'org.couchdb.user:perseus' }
        ]);
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.medic.put.args[0]).to.deep.equal([
          { name: 'perseus', type: 'user-settings', roles: ['admin'], _id: 'org.couchdb.user:perseus' }
        ]);
      });
    });
  });

  describe('create a user with token_login', () => {
    it('should require a phone number', () => {
      const user = {
        username: 'sally',
        roles: ['a', 'b'],
        token_login: true,
      };

      const tokenLoginConfig = { translation_key: 'sms', enabled: true };
      sinon.stub(config, 'get')
        .withArgs('token_login').returns(tokenLoginConfig)
        .withArgs('app_url').returns('url');
      sinon.stub(roles, 'isOffline').returns(false);

      return service.createUser(user)
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.nested.include({
            code: 400,
            'message.message': 'Missing required fields: phone',
          });
        });
    });

    it('should require a valid phone number', () => {
      const user = {
        username: 'sally',
        roles: ['a', 'b'],
        phone: '123',
        token_login: true,
      };

      const tokenLoginConfig = { translation_key: 'sms', enabled: true };
      sinon.stub(config, 'get')
        .withArgs('token_login').returns(tokenLoginConfig)
        .withArgs('app_url').returns('url');
      sinon.stub(roles, 'isOffline').returns(false);

      return service.createUser(user)
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.nested.include({
            code: 400,
            'message.message': 'A valid phone number is required for SMS login.',
          });
        });
    });

    it('should normalize phone number and change password (if provided)', () => {
      const tokenLoginConfig = { message: 'sms', enabled: true };
      sinon.stub(config, 'get')
        .withArgs('token_login').returns(tokenLoginConfig)
        .withArgs('app_url').returns('');

      sinon.stub(roles, 'isOffline').returns(false);

      const user = {
        username: 'sally',
        roles: ['a', 'b'],
        phone: '+40 755 69-69-69',
        password: 'random',
        token_login: true,
      };

      sinon.stub(db.medic, 'put').withArgs(sinon.match({ _id: 'org.couchdb.user:sally' }))
        .resolves({ id: 'org.couchdb.user:sally' });
      sinon.stub(db.users, 'put').withArgs(sinon.match({ _id: 'org.couchdb.user:sally' }))
        .resolves({ id: 'org.couchdb.user:sally' });

      sinon.stub(db.users, 'get').withArgs('org.couchdb.user:sally')
        .onCall(0).rejects({ status: 404 })
        .onCall(1).resolves({
          _id: 'org.couchdb.user:sally',
          type: 'user',
          roles: ['a', 'b', 'mm-online'],
          name: 'sally',
        });
      sinon.stub(db.medic, 'get').withArgs('org.couchdb.user:sally')
        .onCall(0).rejects({ status: 404 })
        .onCall(1).resolves({
          _id: 'org.couchdb.user:sally',
          type: 'user-settings',
          roles: ['a', 'b', 'mm-online'],
          phone: '+40755696969',
          name: 'sally',
        });

      sinon.stub(db.medic, 'allDocs').resolves({ rows: [{ error: 'not_found' }] });

      return service.createUser(user, 'http://realhost').then(response => {
        chai.expect(response).to.deep.equal({
          user: { id: 'org.couchdb.user:sally', rev: undefined },
          'user-settings': { id: 'org.couchdb.user:sally', rev: undefined },
          token_login: { expiration_date: oneDayInMS },
        });
        chai.expect(db.medic.put.callCount).to.equal(3);
        chai.expect(db.users.put.callCount).to.equal(2);

        chai.expect(db.medic.put.args[0]).to.deep.equal([{
          _id: 'org.couchdb.user:sally',
          name: 'sally',
          type: 'user-settings',
          phone: '+40755696969', // normalized phone
          roles: ['a', 'b', 'mm-online'],
        }]);

        chai.expect(db.users.put.args[0][0]).to.deep.include({
          _id: 'org.couchdb.user:sally',
          name: 'sally',
          type: 'user',
          roles: ['a', 'b', 'mm-online'],
        });
        chai.expect(db.users.put.args[0][0].password).not.to.equal('random');
        chai.expect(db.users.put.args[0][0].password.length).to.equal(20);

        chai.expect(db.medic.put.args[2][0]).to.deep.equal({
          _id: 'org.couchdb.user:sally',
          name: 'sally',
          type: 'user-settings',
          phone: '+40755696969', // normalized phone
          roles: ['a', 'b', 'mm-online'],
          token_login: {
            active: true,
            expiration_date: oneDayInMS,
          },
        });

        chai.expect(db.users.put.args[1][0]).to.deep.include({
          _id: 'org.couchdb.user:sally',
          name: 'sally',
          type: 'user',
          roles: ['a', 'b', 'mm-online'],
        });

        chai.expect(db.users.put.args[1][0].token_login).to.deep.include({
          active: true,
          expiration_date: oneDayInMS,
        });
        const token = db.users.put.args[1][0].token_login.token;
        chai.expect(token.length).to.equal(64);

        const expectedDoc = {
          _id: `token:login:${token}`,
          type: 'token_login',
          reported_date: 0,
          user: 'org.couchdb.user:sally',
          tasks: []
        };
        chai.expect(db.medic.put.args[1][0]).to.deep.equal(expectedDoc);
        chai.expect(addMessage.callCount).to.equal(2);
        chai.expect(addMessage.args[0]).to.deep.equal([
          expectedDoc,
          { enabled: true, message: 'sms' },
          '+40755696969',
          {
            templateContext: {
              _id: 'org.couchdb.user:sally',
              name: 'sally',
              phone: '+40755696969',
              roles: ['a', 'b', 'mm-online'],
              type: 'user'
            }
          }
        ]);
        chai.expect(addMessage.args[1]).to.deep.equal([
          expectedDoc,
          { message: `http://realhost/medic/login/token/${token}` },
          '+40755696969',
        ]);
      });
    });
  });

  describe('update a user with token_login', () => {
    it('should require a phone number', () => {
      const updates = { token_login: true };

      const tokenLoginConfig = { translation_key: 'sms', enabled: true};
      sinon.stub(config, 'get')
        .withArgs('token_login').returns(tokenLoginConfig)
        .withArgs('app_url').returns('url');
      sinon.stub(roles, 'isOffline').returns(false);

      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:sally',
        type: 'user-settings',
        roles: ['a', 'b', 'mm-online'],
      });
      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:sally',
        type: 'user',
        roles: ['a', 'b', 'mm-online'],
      });

      return service.updateUser('sally', updates)
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.nested.include({
            code: 400,
            'message.message': 'A valid phone number is required for SMS login.',
          });
        });
    });

    it('should require a valid phone number', () => {
      const updates = { token_login: true, phone: '456' };
      const tokenLoginConfig = { translation_key: 'sms', enabled: true };
      sinon.stub(config, 'get')
        .withArgs('token_login').returns(tokenLoginConfig)
        .withArgs('app_url').returns('url');
      sinon.stub(roles, 'isOffline').returns(false);

      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:sally',
        type: 'user-settings',
        roles: ['a', 'b', 'mm-online'],
        phone: '123',
      });
      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:sally',
        type: 'user',
        roles: ['a', 'b', 'mm-online'],
      });

      return service.updateUser('sally', updates)
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.nested.include({
            code: 400,
            'message.message': 'A valid phone number is required for SMS login.',
          });
        });
    });

    it('should normalize phone number and change password', () => {
      const tokenLoginConfig = { message: 'the sms', enabled: true };
      sinon.stub(config, 'get')
        .withArgs('token_login').returns(tokenLoginConfig)
        .withArgs('app_url').returns('http://host');
      sinon.stub(roles, 'isOffline').returns(false);

      const updates = { token_login: true, phone: '+40 755 89-89-89' };
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:sally',
        type: 'user-settings',
        roles: ['a', 'b', 'mm-online'],
        phone: '123',
      });
      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:sally',
        type: 'user',
        roles: ['a', 'b', 'mm-online'],
      });
      sinon.stub(db.medic, 'put').withArgs(sinon.match({ _id: 'org.couchdb.user:sally' }))
        .resolves({ id: 'org.couchdb.user:sally' });
      sinon.stub(db.users, 'put').withArgs(sinon.match({ _id: 'org.couchdb.user:sally' }))
        .resolves({ id: 'org.couchdb.user:sally' });

      sinon.stub(db.medic, 'allDocs').resolves({ rows: [{ error: 'not_found' }] });
      clock.tick(5000);

      return service.updateUser('sally', updates, true, 'https://realhost').then(response => {
        chai.expect(response).to.deep.equal({
          user: { id: 'org.couchdb.user:sally', rev: undefined },
          'user-settings': { id: 'org.couchdb.user:sally', rev: undefined },
          token_login: { expiration_date: 5000 + oneDayInMS },
        });

        chai.expect(db.medic.put.callCount).to.equal(3);
        chai.expect(db.medic.put.args[2][0]).to.deep.equal({
          _id: 'org.couchdb.user:sally',
          name: 'sally',
          type: 'user-settings',
          phone: '+40755898989', // normalized phone
          roles: ['a', 'b', 'mm-online'],
          token_login: {
            active: true,
            expiration_date: 5000 + oneDayInMS,
          },
        });

        chai.expect(db.users.put.callCount).to.equal(2);
        chai.expect(db.users.put.args[1][0]).to.deep.include({
          _id: 'org.couchdb.user:sally',
          name: 'sally',
          type: 'user',
          roles: ['a', 'b', 'mm-online'],
        });

        chai.expect(db.users.put.args[0][0].token_login).to.deep.include({
          active: true,
          expiration_date: 5000 + oneDayInMS,
        });
        chai.expect(db.users.put.args[0][0].password.length).to.equal(20);

        const token = db.users.put.args[0][0].token_login.token;
        chai.expect(token.length).to.equal(64);

        const expectedDoc = {
          _id: `token:login:${token}`,
          type: 'token_login',
          reported_date: 5000,
          user: 'org.couchdb.user:sally',
          tasks: []
        };
        chai.expect(db.medic.put.args[1][0]).to.deep.equal(expectedDoc);
        chai.expect(addMessage.callCount).to.equal(2);
        chai.expect(addMessage.args[0][0]).to.deep.equal(expectedDoc);
        chai.expect(addMessage.args[0][1]).to.deep.equal({ enabled: true, message: 'the sms' });
        chai.expect(addMessage.args[0][2]).to.equal('+40755898989');
        chai.expect(addMessage.args[0][3].templateContext).to.deep.include({
          _id: 'org.couchdb.user:sally',
          name: 'sally',
          phone: '+40755898989',
          roles: ['a', 'b', 'mm-online'],
          type: 'user'
        });
        chai.expect(addMessage.args[1]).to.deep.equal([
          expectedDoc,
          { message: `http://host/medic/login/token/${token}` },
          '+40755898989',
        ]);
      });
    });

    it('should require password when removing token_login', () => {
      const tokenLoginConfig = { message: 'the sms', enabled: true };
      sinon.stub(config, 'get')
        .withArgs('token_login').returns(tokenLoginConfig)
        .withArgs('app_url').returns('http://host');
      sinon.stub(roles, 'isOffline').returns(false);

      const updates = { token_login: false };
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:sally',
        type: 'user-settings',
        roles: ['a', 'b', 'mm-online'],
        token_login: { active: true },
      });
      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:sally',
        type: 'user',
        roles: ['a', 'b', 'mm-online'],
        token_login: { active: true },
      });

      return service.updateUser('sally', updates)
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.nested.include({
            code: 400,
            'message.message': 'Password is required when disabling token login.',
          });
        });
    });

    it('should not require password when not changing token_login', () => {
      const tokenLoginConfig = { message: 'the sms', enabled: true };
      sinon.stub(config, 'get')
        .withArgs('token_login').returns(tokenLoginConfig)
        .withArgs('app_url').returns('http://host');
      sinon.stub(roles, 'isOffline').returns(false);

      const updates = { token_login: false };
      sinon.stub(db.medic, 'get').withArgs('org.couchdb.user:sally').resolves({
        _id: 'org.couchdb.user:sally',
        type: 'user-settings',
        roles: ['a', 'b', 'mm-online'],
      });
      sinon.stub(db.users, 'get').withArgs('org.couchdb.user:sally').resolves({
        _id: 'org.couchdb.user:sally',
        type: 'user',
        roles: ['a', 'b', 'mm-online'],
      });
      sinon.stub(db.users, 'put').resolves({ id: 'org.couchdb.user:sally' });
      sinon.stub(db.medic, 'put').resolves({ id: 'org.couchdb.user:sally' });

      return service.updateUser('sally', updates).then(response => {
        chai.expect(response).to.deep.equal({
          user: { id: 'org.couchdb.user:sally', rev: undefined },
          'user-settings': { id: 'org.couchdb.user:sally', rev: undefined },
        });
      });
    });
  });

  describe('parseCsv', () => {
    it('should throw error when csv is empty', async () => {
      try {
        await service.parseCsv('');
        chai.assert.fail('Should have thrown');
      } catch (error) {
        chai.expect(error.message).to.equal('CSV is empty.');
      }

      try {
        await service.parseCsv(null);
        chai.assert.fail('Should have thrown');
      } catch (error) {
        chai.expect(error.message).to.equal('CSV is empty.');
      }
    });

    it('should parse csv, trim spaces and not split strings with commas inside', async () => {
      const csv = 'password,username,type,place,contact.name,contact.phone,contact.address\n' +
        'Secret1234,mary,person,498a394e-f98b-4e48-8c50-f12aeb018fcc,mary,2652527222,"1 King ST, Kent Town, 55555"\n' +
        'Secret5678, peter ,person,498a394e-f98b-4e48-8c50-f12aeb018fcc,Peter, 2652279,"15 King ST, Kent Town, 55555 "';
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});

      const result = await service.parseCsv(csv);

      chai.expect(result.users).to.have.deep.members([
        {
          password: 'Secret1234',
          username: 'mary',
          type: 'person',
          place: '498a394e-f98b-4e48-8c50-f12aeb018fcc',
          contact: { name: 'mary', phone: '2652527222', address: '1 King ST, Kent Town, 55555' }
        },
        {
          password: 'Secret5678',
          username: 'peter',
          type: 'person',
          place: '498a394e-f98b-4e48-8c50-f12aeb018fcc',
          contact: { name: 'Peter', phone: '2652279', address: '15 King ST, Kent Town, 55555' }
        }
      ]);
    });

    it('should parse csv, trim spaces and not split strings with commas inside', async () => {
      /* eslint-disable max-len */
      const csv = 'password,username,type,place,token_login,contact.name,contact.phone,contact.address\n' +
        ',mary,person,498a394e-f98b-4e48-8c50-f12aeb018fcc,TRUE,mary,2652527222,"1 King ST, Kent Town, 55555"\n' +
        'Secret9876,devi,person,498a394e-f98b-4e48-8c50-f12aeb018fcc,truthy mistake,devi,265252,"12 King ST, Kent Town, 55555"\n' +
        'Secret1144,jeff,person,498a394e-f98b-4e48-8c50-f12aeb018fcc,,jeff,26599102,"27 King ST, Kent Town, 55555"\n' +
        'Secret5678, peter ,person,498a394e-f98b-4e48-8c50-f12aeb018fcc,FALSE,Peter, 2652279,"15 King ST, Kent Town, 55555 "';
      /* eslint-enable max-len */
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});

      const result = await service.parseCsv(csv);

      chai.expect(result.users).to.have.deep.members([
        {
          password: '',
          username: 'mary',
          type: 'person',
          place: '498a394e-f98b-4e48-8c50-f12aeb018fcc',
          contact: { name: 'mary', phone: '2652527222', address: '1 King ST, Kent Town, 55555' },
          token_login: true,
        },
        {
          password: 'Secret9876',
          username: 'devi',
          type: 'person',
          place: '498a394e-f98b-4e48-8c50-f12aeb018fcc',
          contact: { name: 'devi', phone: '265252', address: '12 King ST, Kent Town, 55555' },
          token_login: 'truthy mistake',
        },
        {
          password: 'Secret1144',
          username: 'jeff',
          type: 'person',
          place: '498a394e-f98b-4e48-8c50-f12aeb018fcc',
          contact: { name: 'jeff', phone: '26599102', address: '27 King ST, Kent Town, 55555' },
          token_login: '',
        },
        {
          password: 'Secret5678',
          username: 'peter',
          type: 'person',
          place: '498a394e-f98b-4e48-8c50-f12aeb018fcc',
          contact: { name: 'Peter', phone: '2652279', address: '15 King ST, Kent Town, 55555' },
          token_login: false,
        }
      ]);
    });

    it('should return empty array when there is not users in the csv', async () => {
      const csv = 'password,username,type,place,contact.name,contact.phone,contact.address\n';
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});

      const result = await service.parseCsv(csv);

      chai.expect(result.users).to.have.deep.members([]);
    });

    it('should ignore empty header columns', async () => {
      const csv = 'password,username,type,,contact.name,,contact.address\n' +
        'Secret1234,mary,person,498a394e-f98b-4e48-8c50-f12aeb018fcc,mary,2652527222,"1 King ST, Kent Town, 55555"\n';
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});

      const result = await service.parseCsv(csv);

      chai.expect(result.users).to.have.deep.members([
        {
          password: 'Secret1234',
          username: 'mary',
          type: 'person',
          contact: { name: 'mary', address: '1 King ST, Kent Town, 55555' }
        }
      ]);
    });

    it('should keep attributes if there is not value', async () => {
      const csv = 'password,username,type,place,contact.name,contact.phone,contact.address\n' +
        'Secret1234,mary,person,,mary,     ,"1 King ST, Kent Town, 55555"\n';
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});

      const result = await service.parseCsv(csv);

      chai.expect(result.users).to.have.deep.members([
        {
          password: 'Secret1234',
          username: 'mary',
          type: 'person',
          place: '',
          contact: { name: 'mary', phone: '', address: '1 King ST, Kent Town, 55555' }
        }
      ]);
    });

    it('should parse csv with deep object structure', async () => {
      const csv = 'password,username,type,place,contact.name,contact.address.country' +
        ',contact.address.city.street,contact.address.city.name\n' +
        'Secret1234,mary,person,498a394e-f98b-4e48-8c50-f12aeb018fcc,mary,US,"5th ST", Kent Town\n' +
        'Secret555,peter,person,498a394e-f98b-4e48-8c50-f12aeb018fcc,Peter,CA,,Victoria Town\n';
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});

      const result = await service.parseCsv(csv);

      chai.expect(result.users).to.have.deep.members([
        {
          password: 'Secret1234',
          username: 'mary',
          type: 'person',
          place: '498a394e-f98b-4e48-8c50-f12aeb018fcc',
          contact: {
            name: 'mary',
            address: {
              city: {
                name: 'Kent Town',
                street: '5th ST'
              },
              country: 'US'
            }
          }
        },
        {
          password: 'Secret555',
          username: 'peter',
          type: 'person',
          place: '498a394e-f98b-4e48-8c50-f12aeb018fcc',
          contact: {
            name: 'Peter',
            address: {
              city: {
                name: 'Victoria Town',
                street: ''
              },
              country: 'CA'
            }
          }
        }
      ]);
    });

    it('should parse csv with special characters', async () => {
      const csv = 'password,username,type,place,contact.name,contact.notes\n' +
        'Secret1234,mary,person,498a394e-f98,Mary\'s name!,"#1 @ "King ST"$^&%~`=}{][:;.><?/|*+-_"\n' +
        'Secret5678, peter ,person,498a394e-f99,Peter,"ce fût une belle saison, le maïs sera prêt à partir ' +
        'de l’été c’est-à-dire dès demain, d’où l’invaitation"';
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});

      const result = await service.parseCsv(csv);

      chai.expect(result.users).to.have.deep.members([
        {
          password: 'Secret1234',
          username: 'mary',
          type: 'person',
          place: '498a394e-f98',
          contact: {
            name: 'Mary\'s name!',
            notes: '#1 @ "King ST"$^&%~`=}{][:;.><?/|*+-_' }
        },
        {
          password: 'Secret5678',
          username: 'peter',
          type: 'person',
          place: '498a394e-f99',
          contact: {
            name: 'Peter',
            notes: 'ce fût une belle saison, le maïs sera prêt à partir' +
              ' de l’été c’est-à-dire dès demain, d’où l’invaitation'
          }
        }
      ]);
    });

    it('should ignore excluded header columns', async () => {
      const csv = 'password,username,type,place,contact.meta:excluded,contact.name,contact.notes\n' +
        'Secret1234,mary,person,498a394e-f98,excluded column,Mary\'s name!,"#1 @ "King ST"$^&%~`=}{][:;.><?/|*+-_"\n' +
        'Secret5678, peter ,person,498a394e-f99,excluded column,Peter,' +
        '"ce fût une belle saison, le maïs sera prêt à partir de l’été c’est-à-dire dès demain, d’où l’invaitation"';
      sinon.stub(db.medicLogs, 'get').resolves({ progress: {} });
      sinon.stub(db.medicLogs, 'put').resolves({});

      const result = await service.parseCsv(csv);

      chai.expect(result.users).to.have.deep.members([
        {
          password: 'Secret1234',
          username: 'mary',
          type: 'person',
          place: '498a394e-f98',
          contact: {
            name: 'Mary\'s name!',
            notes: '#1 @ "King ST"$^&%~`=}{][:;.><?/|*+-_' }
        },
        {
          password: 'Secret5678',
          username: 'peter',
          type: 'person',
          place: '498a394e-f99',
          contact: {
            name: 'Peter',
            notes: 'ce fût une belle saison, le maïs sera prêt à partir' +
              ' de l’été c’est-à-dire dès demain, d’où l’invaitation'
          }
        }
      ]);
    });
  });
});

