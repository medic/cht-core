const chai = require('chai');
const sinon = require('sinon');
const service = require('../../../src/services/users');
const people = require('../../../src/controllers/people');
const places = require('../../../src/controllers/places');
const config = require('../../../src/config');
const db = require('../../../src/db');
const auth = require('../../../src/auth');
const COMPLEX_PASSWORD = '23l4ijk3nSDELKSFnwekirh';

const facilitya = { _id: 'a', name: 'aaron' };
const facilityb = { _id: 'b', name: 'brian' };
const facilityc = { _id: 'c', name: 'cathy' };

let userData;

describe('Users service', () => {

  beforeEach(() => {
    sinon.stub(service, '_getFacilities').returns([
      facilitya,
      facilityb,
      facilityc,
    ]);
    userData = {
      username: 'x',
      password: COMPLEX_PASSWORD,
      place: { name: 'x' },
      contact: { 'parent': 'x' },
      type: 'national-manager'
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getSettingsUpdates', () => {

    it('sets type property', done => {
      const settings = service._getSettingsUpdates('john', {});
      chai.expect(settings.type).to.equal('user-settings');
      done();
    });

    it('removes user doc specific fields', done => {
      const data = {
        name: 'john',
        email: 'john@gmail.com',
        password: 'foo',
        roles: ['foo'],
        starsign: 'libra'
      };
      const settings = service._getSettingsUpdates('john', data);
      chai.expect(settings.password).to.equal(undefined);
      done();
    });

    it('reassigns place and contact fields', done => {
      const data = {
        place: 'abc',
        contact: '123',
        fullname: 'John'
      };
      const settings = service._getSettingsUpdates('john', data);
      chai.expect(settings.place).to.equal(undefined);
      chai.expect(settings.contact).to.equal(undefined);
      chai.expect(settings.contact_id).to.equal('123');
      chai.expect(settings.facility_id).to.equal('abc');
      chai.expect(settings.fullname).to.equal('John');
      done();
    });

    it('supports external_id field', done => {
      const data = {
        fullname: 'John',
        external_id: 'CHP020'
      };
      const settings = service._getSettingsUpdates('john', data);
      chai.expect(settings.external_id).to.equal('CHP020');
      chai.expect(settings.fullname).to.equal('John');
      done();
    });

  });

  describe('getUserUpdates', () => {

    it('enforces name field based on id', done => {
      const data = {
        name: 'sam',
        email: 'john@gmail.com'
      };
      const user = service._getUserUpdates('john', data);
      chai.expect(user.name ).to.equal('john');
      done();
    });

    it('reassigns place field', done => {
      const data = {
        place: 'abc'
      };
      const user = service._getUserUpdates('john', data);
      chai.expect(user.place).to.equal(undefined);
      chai.expect(user.facility_id).to.equal('abc');
      done();
    });

  });

  describe('getType', () => {

    it('returns unknown when roles is empty', done => {
      const user = {
        name: 'sam',
        roles: []
      };
      const admins = {};
      chai.expect(service._getType(user, admins)).to.equal('unknown');
      done();
    });

  });

  describe('hasParent', () => {

    it('works as expected', done => {
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
      chai.expect(service._hasParent(facility, 'baz')).to.equal(true);
      chai.expect(service._hasParent(facility, 'slime')).to.equal(false);
      chai.expect(service._hasParent(facility, 'bar')).to.equal(true);
      chai.expect(service._hasParent(facility, 'foo')).to.equal(true);
      chai.expect(service._hasParent(facility, 'goo')).to.equal(false);
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
      done();
    });

  });

  describe('validateUser', () => {
    it('defines custom error when not found', done => {
      sinon.stub(db.users, 'get').returns(Promise.reject({ status: 404 }));
      service._validateUser('x').catch(err => {
        chai.expect(err.message).to.equal('Failed to find user.');
        done();
      });
    });
  });

  describe('validateUserSettings', () => {
    it('defines custom error when not found', done => {
      sinon.stub(db.medic, 'get').returns(Promise.reject({ status: 404 }));
      service._validateUserSettings('x').catch(err => {
        chai.expect(err.message).to.equal('Failed to find user settings.');
        done();
      });
    });
  });

  describe('getType', () => {
    it('returns role when user is in admins list and has role', done => {
      const user = {
        name: 'sam',
        roles: ['driver']
      };
      const admins = {
        'sam': 'x'
      };
      chai.expect(service._getType(user, admins)).to.equal('driver');
      done();
    });
  });

  describe('getList', () => {

    it('collects user infos', () => {
      sinon.stub(service, '_getAllUsers').resolves([
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
      ]);
      sinon.stub(service, '_getAllUserSettings').resolves([
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
      ]);
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
      sinon.stub(service, '_getAllUsers').resolves([
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
      ]);
      sinon.stub(service, '_getAllUserSettings').resolves([
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
      ]);
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
      sinon.stub(service, '_getAllUsers').resolves([
        {
          id: 'org.couchdb.user:x',
          doc: {
            name: 'lucas'
          }
        }
      ]);
      sinon.stub(service, '_getAllUserSettings').resolves([]);
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

    it('returns errors from users service', done => {
      sinon.stub(service, '_getAllUsers').returns(Promise.reject('not found'));
      sinon.stub(service, '_getAllUserSettings').returns(Promise.reject('not found'));
      service.getList().catch(err => {
        chai.expect(err).to.equal('not found');
        done();
      });
    });

    it('returns errors from facilities service', done => {
      sinon.stub(service, '_getAllUsers').resolves([
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
      ]);
      sinon.stub(service, '_getAllUserSettings').resolves([]);
      service._getFacilities.restore();
      sinon.stub(service, '_getFacilities').returns(Promise.reject('BOOM'));
      service.getList().catch(err => {
        chai.expect(err).to.equal('BOOM');
        done();
      });
    });

  });

  describe('deleteUser', () => {

    it('returns _users insert errors', done => {
      sinon.stub(db.users, 'get').resolves({});
      sinon.stub(db.medic, 'get').resolves({});
      const put = sinon.stub(db.users, 'put').returns(Promise.reject('Not Found'));
      sinon.stub(db.medic, 'put').returns(Promise.reject('Not Found'));
      service.deleteUser('foo').catch(err => {
        chai.expect(err).to.equal('Not Found');
        chai.expect(put.callCount).to.equal(1);
        done();
      });
    });

    it('sets _deleted on the user doc', () => {
      const expected = {
        _id: 'foo',
        starsign: 'aries',
        _deleted: true
      };
      sinon.stub(db.users, 'get').resolves({
        _id: 'foo',
        starsign: 'aries',
      });
      sinon.stub(db.medic, 'get').resolves({});
      const usersInsert = sinon.stub(db.users, 'put').resolves();
      sinon.stub(db.medic, 'put').resolves();
      return service.deleteUser('foo').then(() => {
        chai.expect(usersInsert.callCount).to.equal(1);
        chai.expect(usersInsert.firstCall.args[0]).to.deep.equal(expected);
      });
    });

    it('sets _deleted on the user-settings doc', () => {
      const expected = {
        _id: 'foo',
        starsign: 'aries',
        _deleted: true
      };
      sinon.stub(db.users, 'get').resolves({
        _id: 'foo',
        starsign: 'aries',
      });
      sinon.stub(db.medic, 'get').resolves({});
      const usersInsert = sinon.stub(db.users, 'put').resolves();
      sinon.stub(db.medic, 'put').resolves();
      return service.deleteUser('org.couchdb.user:gareth').then(() => {
        chai.expect(usersInsert.callCount).to.equal(1);
        chai.expect(usersInsert.firstCall.args[0]).to.deep.equal(expected);
      });
    });

  });

  describe('createPlace', () => {
    it('assigns new place', () => {
      sinon.stub(places, 'getOrCreatePlace').resolves({ _id: 'santos' });
      return service._createPlace(userData).then(() => {
        chai.expect(userData.place._id).to.equal('santos');
      });
    });
  });

  describe('createUserSettings', () => {

    it('returns error from db insert', done => {
      sinon.stub(db.medic, 'put').returns(Promise.reject('yucky'));
      service._createUserSettings(userData).catch(err => {
        chai.expect(err).to.equal('yucky');
        done();
      });
    });

    it('sets up response', () => {
      sinon.stub(db.medic, 'put').resolves({
        id: 'abc',
        rev: '1-xyz'
      });
      const response = {};
      return service._createUserSettings(userData, response).then(() => {
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

    it('returns error from db insert', done => {
      sinon.stub(people, 'createPerson').returns(Promise.reject('yucky'));
      service._createContact(userData, {}).catch(err => {
        chai.expect(err).to.equal('yucky');
        done();
      });
    });

    it('updates contact property', () => {
      sinon.stub(people, 'getOrCreatePerson').resolves({ id: 'abc' });
      const response = {};
      return service._createContact(userData, response).then(() => {
        chai.expect(userData.contact).to.deep.equal({ id: 'abc' });
      });
    });

    it('sets up response', () => {
      sinon.stub(people, 'getOrCreatePerson').resolves({ _id: 'abc', _rev: '1-xyz' });
      const response = {};
      return service._createContact(userData, response).then(() => {
        chai.expect(response).to.deep.equal({
          contact: {
            id: 'abc',
            rev: '1-xyz'
          }
        });
      });
    });

  });

  describe('_createUser', () => {

    it('returns error from db insert', done => {
      sinon.stub(db.users, 'put').returns(Promise.reject('yucky'));
      service._createUser(userData, {}).catch(err => {
        chai.expect(err).to.equal('yucky');
        done();
      });
    });

    it('sets up response', () => {
      sinon.stub(db.users, 'put').resolves({
        id: 'abc',
        rev: '1-xyz'
      });
      const response = {};
      return service._createUser(userData, response).then(() => {
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

    it('returns error if missing fields', done => {
      // empty
      service.createUser({}).catch(err => {
        chai.expect(err.code).to.equal(400);
      });
      // missing username
      service.createUser({
        password: 'x',
        place: 'x',
        contact: { parent: 'x' }
      }).catch(err => {
        chai.expect(err.code).to.equal(400);
      });
      // missing password
      service.createUser({
        username: 'x',
        place: 'x',
        contact: { parent: 'x' }
      }).catch(err => {
        chai.expect(err.code).to.equal(400);
      });
      // missing place
      service.createUser({
        username: 'x',
        password: 'x',
        contact: { parent: 'x' }
      }).catch(err => {
        chai.expect(err.code).to.equal(400);
      });
      // missing contact
      service.createUser({
        username: 'x',
        place: 'x',
        contact: { parent: 'x' }
      }).catch(err => {
        chai.expect(err.code).to.equal(400);
      });
      // missing contact.parent
      service.createUser({
        username: 'x',
        place: 'x',
        contact: {}
      }).catch(err => {
        chai.expect(err.code).to.equal(400);
      });
      done();
    });

    it('returns error if short password', done => {
      service.createUser({
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
        done();
      });
    });

    it('returns error if weak password', done => {
      service.createUser({
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
        done();
      });
    });

    it('returns error if contact.parent lookup fails', done => {
      sinon.stub(service, '_validateNewUsername').resolves();
      sinon.stub(service, '_createPlace').resolves();
      sinon.stub(service, '_setContactParent').returns(Promise.reject('kablooey'));
      service.createUser(userData).catch(err => {
        chai.expect(err).to.equal('kablooey');
        done();
      });
    });

    it('returns error if place lookup fails', done => {
      sinon.stub(service, '_validateNewUsername').resolves();
      sinon.stub(service, '_createPlace').returns(Promise.reject('fail'));
      service.createUser(userData).catch(err => {
        chai.expect(err).to.equal('fail');
        done();
      });
    });

    it('returns error if place is not within contact', done => {
      sinon.stub(service, '_validateNewUsername').resolves();
      sinon.stub(service, '_createPlace').resolves();
      sinon.stub(places, 'getPlace').resolves({
        _id: 'miami',
        parent: {
          _id: 'florida'
        }
      });
      userData.place = 'georgia';
      service.createUser(userData).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.translationKey).to.equal('configuration.user.place.contact');
        chai.expect(err.message.message).to.equal('Contact is not within place.');
        done();
      });
    });

    it('succeeds if contact and place are the same', () => {
      sinon.stub(service, '_validateNewUsername').resolves();
      sinon.stub(service, '_createPlace').resolves();
      sinon.stub(service, '_createUser').resolves();
      sinon.stub(service, '_createContact').resolves();
      sinon.stub(service, '_storeUpdatedPlace').resolves();
      sinon.stub(service, '_createUserSettings').resolves();
      sinon.stub(places, 'getPlace').resolves({ _id: 'foo' });
      userData.place = 'foo';
      return service.createUser(userData);
    });

    it('succeeds if contact is within place', () => {
      sinon.stub(service, '_validateNewUsername').resolves();
      sinon.stub(service, '_createPlace').resolves();
      sinon.stub(service, '_createUser').resolves();
      sinon.stub(service, '_createContact').resolves();
      sinon.stub(service, '_storeUpdatedPlace').resolves();
      sinon.stub(service, '_createUserSettings').resolves();
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

    it('fails if new username does not validate', done => {
      sinon.stub(service, '_validateNewUsername').returns(Promise.reject('sorry'));
      const insert = sinon.stub(db.medic, 'put');
      service.createUser(userData).catch(err => {
        chai.expect(err).to.equal('sorry');
        chai.expect(insert.callCount).to.equal(0);
        done();
      });
    });

    it('errors if username exists in _users db', done => {
      sinon.stub(db.users, 'get').resolves('bob lives here already.');
      sinon.stub(db.medic, 'get').resolves();
      const insert = sinon.stub(db.medic, 'put');
      service.createUser(userData).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message).to.equal('Username "x" already taken.');
        chai.expect(err.message.translationKey).to.equal('username.taken');
        chai.expect(err.message.translationParams).to.have.property('username');
        chai.expect(insert.callCount).to.equal(0);
        done();
      });
    });

    it('errors if username exists in medic db', done => {
      sinon.stub(db.users, 'get').resolves();
      sinon.stub(db.medic, 'get').resolves('jane lives here too.');
      const insert = sinon.stub(db.medic, 'put');
      service.createUser(userData).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message).to.equal('Username "x" already taken.');
        chai.expect(err.message.translationKey).to.equal('username.taken');
        chai.expect(err.message.translationParams).to.have.property('username');
        chai.expect(insert.callCount).to.equal(0);
        done();
      });
    });

  });

  describe('setContactParent', () => {

    it('resolves contact parent in waterfall', () => {
      sinon.stub(service, '_validateNewUsername').resolves();
      sinon.stub(service, '_createPlace').resolves();
      sinon.stub(places, 'getPlace').resolves({
        _id: 'a',
        biz: 'marquee'
      });
      sinon.stub(service, '_hasParent').returns(true);
      sinon.stub(service, '_createContact').resolves();
      sinon.stub(service, '_storeUpdatedPlace').resolves();
      sinon.stub(service, '_createUser').resolves();
      sinon.stub(service, '_createUserSettings').resolves();
      return service.createUser(userData).then(() => {
        chai.expect(service._createContact.args[0][0].contact.parent).to.deep.equal({ _id: 'a' });
      });
    });

    it('fails validation if contact is not in place using id', done => {
      const userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: 'abc',
        contact: 'def',
        type: 'national-manager'
      };
      sinon.stub(service, '_validateNewUsername').resolves();
      sinon.stub(service, '_createPlace').resolves();
      sinon.stub(db.medic, 'get').resolves({
        _id: 'def',
        type: 'person',
        name: 'greg',
        parent: {
          _id: 'efg'
        }
      });
      sinon.stub(people, 'isAPerson').returns(true);
      service.createUser(userData).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message).to.equal('Contact is not within place.');
        chai.expect(err.message.translationKey).to.equal('configuration.user.place.contact');
        done();
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
      sinon.stub(service, '_validateNewUsername').resolves();
      sinon.stub(service, '_createPlace').resolves();
      sinon.stub(db.medic, 'get').resolves({
        _id: 'def',
        type: 'person',
        name: 'greg',
        parent: {
          _id: 'efg'
        }
      });
      sinon.stub(people, 'isAPerson').returns(true);
      sinon.stub(service, '_createContact').resolves();
      sinon.stub(service, '_storeUpdatedPlace').resolves();
      sinon.stub(service, '_createUser').resolves();
      sinon.stub(service, '_createUserSettings').resolves();
      return service.createUser(userData).then(() => {
        chai.expect(service._createContact.args[0][0].contact).to.equal('def');
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
      sinon.stub(service, '_validateNewUsername').resolves();
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
      sinon.stub(service, '_createUser').resolves();
      sinon.stub(service, '_createUserSettings').resolves();
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
      sinon.stub(service, '_validateNewUsername').resolves();

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
      sinon.stub(service, '_createUser').resolves();
      sinon.stub(service, '_createUserSettings').resolves();
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
      sinon.stub(service, '_validateNewUsername').resolves();

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
      sinon.stub(service, '_createUser').resolves();
      sinon.stub(service, '_createUserSettings').resolves();
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
      sinon.stub(service, '_validateNewUsername').resolves();

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
      sinon.stub(service, '_createUser').resolves();
      sinon.stub(service, '_createUserSettings').resolves();
      return service
        .createUser(userData)
        .then(() => { throw 'should have thrown'; })
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
          chai.expect(service._createUser.callCount).to.equal(0);
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
      sinon.stub(service, '_validateNewUsername').resolves();

      const place = { _id: 'place_id', _rev: 1, name: 'x', parent: 'parent' };
      sinon.stub(places, 'getOrCreatePlace').resolves(place);
      sinon.stub(places, 'getPlace').resolves(place);
      sinon.stub(people, 'getOrCreatePerson').resolves({
        _id: 'b',
        name: 'mickey'
      });
      sinon.stub(db.medic, 'get').resolves(place);
      sinon.stub(db.medic, 'put').rejects({ status: 400, reason: 'not-a-conflict' });
      sinon.stub(service, '_createUser').resolves();
      sinon.stub(service, '_createUserSettings').resolves();
      return service
        .createUser(userData)
        .then(() => { throw 'should have thrown'; })
        .catch(err => {
          chai.expect(err).to.deep.equal({ status: 400, reason: 'not-a-conflict' });
          chai.expect(db.medic.get.callCount).to.equal(1);
          chai.expect(db.medic.get.args).to.deep.equal([['place_id']]);
          chai.expect(db.medic.put.callCount).to.equal(1);
          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'place_id', _rev: 1, name: 'x', contact: { _id: 'b' }, parent: 'parent',
          }]);
          chai.expect(service._createUser.callCount).to.equal(0);
        });
    });

  });

  describe('updateUser', () => {

    it('errors if place, type and password is undefined', done => {
      service.updateUser('paul', {}, true).catch(err => {
        chai.expect(err.code).to.equal(400);
        done();
      });
    });

    it('errors on unknown property', done => {
      service.updateUser('paul', {foo: 'bar'}, true).catch(err => {
        chai.expect(err.code).to.equal(400);
        done();
      });
    });

    it('fails if place fetch fails', done => {
      const data = {
        place: 'x'
      };
      sinon.stub(service, '_validateUser').resolves({});
      sinon.stub(service, '_validateUserSettings').resolves({});
      sinon.stub(places, 'getPlace').returns(Promise.reject('Not today pal.'));
      const update = sinon.stub(db.medic, 'put');
      service.updateUser('paul', data, true).catch(() => {
        chai.expect(update.callCount).to.equal(0);
        done();
      });
    });

    it('fails if user not found', done => {
      const data = {
        type: 'x'
      };
      sinon.stub(service, '_validateUser').returns(Promise.reject('not found'));
      sinon.stub(service, '_validateUserSettings').resolves({});
      const update = sinon.stub(db.medic, 'put');
      service.updateUser('paul', data, true).catch(() => {
        chai.expect(update.callCount).to.equal(0);
        done();
      });
    });

    it('fails if user settings not found', done => {
      const data = {
        type: 'x'
      };
      sinon.stub(service, '_validateUser').resolves({});
      sinon.stub(service, '_validateUserSettings').returns(Promise.reject('too rainy today'));
      const update = sinon.stub(db.medic, 'put');
      service.updateUser('paul', data, true).catch(() => {
        chai.expect(update.callCount).to.equal(0);
        done();
      });
    });

    it('fails if users db insert fails', done => {
      sinon.stub(service, '_validateUser').resolves({});
      sinon.stub(service, '_validateUserSettings').resolves({});
      sinon.stub(db.medic, 'put').resolves();
      sinon.stub(db.users, 'put').returns(Promise.reject('shiva was here'));
      service.updateUser('georgi', {type: 'x'}, true).catch(err => {
        chai.expect(err).to.equal('shiva was here');
        done();
      });
    });

    it('fails if medic db insert fails', done => {
      sinon.stub(service, '_validateUser').resolves({});
      sinon.stub(service, '_validateUserSettings').resolves({});
      sinon.stub(db.medic, 'put').returns(Promise.reject('shiva strikes again'));
      sinon.stub(db.users, 'put').resolves({});
      service.updateUser('georgi', {type: 'x'}, true).catch(err => {
        chai.expect(err).to.equal('shiva strikes again');
        done();
      });
    });

    it('succeeds if type is defined', () => {
      const data = {
        type: 'x'
      };
      sinon.stub(service, '_validateUser').resolves({});
      sinon.stub(service, '_validateUserSettings').resolves({});
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
      sinon.stub(service, '_validateUser').resolves({});
      sinon.stub(service, '_validateUserSettings').resolves({});
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
      sinon.stub(service, '_validateUser').resolves({});
      sinon.stub(service, '_validateUserSettings').resolves({});
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
      sinon.stub(service, '_validateUser').resolves({});
      sinon.stub(service, '_validateUserSettings').resolves({});
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      sinon.stub(auth, 'isOffline').withArgs(['rebel']).returns(false);
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
      sinon.stub(service, '_validateUser').resolves({});
      sinon.stub(service, '_validateUserSettings').resolves({});
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      sinon.stub(auth, 'isOffline').withArgs(['rebel']).returns(true);
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
      sinon.stub(service, '_validateUser').resolves({});
      sinon.stub(service, '_validateUserSettings').resolves({});
      sinon.stub(places, 'getPlace').resolves();
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      return service.updateUser('paul', data, true).then(() => {
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.users.put.callCount).to.equal(1);
        chai.expect(db.users.put.args[0][0].password).to.equal(COMPLEX_PASSWORD);
      });
    });

    it('returns error if short password', done => {
      const data = {
        password: 'short'
      };
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      service.updateUser('paul', data, true).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.translationKey).to.equal('password.length.minimum');
        chai.expect(err.message.translationParams).to.have.property('minimum');
        chai.expect(err.message.message).to.equal('The password must be at least 8 characters long.');
        chai.expect(db.medic.put.callCount).to.equal(0);
        chai.expect(db.users.put.callCount).to.equal(0);
        done();
      });
    });

    it('returns error if weak password', done => {
      const data = {
        password: 'aaaaaaaa'
      };
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      service.updateUser('paul', data, true).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.translationKey).to.equal('password.weak');
        chai.expect(err.message.message)
          .to.equal('The password is too easy to guess. Include a range of types of characters to increase the score.');
        chai.expect(db.medic.put.callCount).to.equal(0);
        chai.expect(db.users.put.callCount).to.equal(0);
        done();
      });
    });

    it('updates facility_id on user and user settings', () => {
      const data = {
        place: 'paris'
      };
      sinon.stub(service, '_validateUser').resolves({ facility_id: 'maine' });
      sinon.stub(service, '_validateUserSettings').resolves({ facility_id: 'maine' });
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
      sinon.stub(service, '_validateUser').resolves({
        facility_id: 'maine',
        roles: ['mm-online']
      });
      sinon.stub(service, '_validateUserSettings').resolves({
        facility_id: 'maine',
        contact_id: 1
      });
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
      sinon.stub(service, '_validateUser').resolves({
        facility_id: 'maine',
        roles: ['bartender'],
        shoes: 'dusty boots'
      });
      sinon.stub(service, '_validateUserSettings').resolves({
        facility_id: 'maine',
        phone: '123',
        known: false
      });
      sinon.stub(places, 'getPlace').resolves();
      sinon.stub(db.medic, 'put').resolves({});
      sinon.stub(db.users, 'put').resolves({});
      sinon.stub(auth, 'isOffline').withArgs(['rambler']).returns(false);
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
      sinon.stub(service, '_validateUser').resolves({
        facility_id: 'maine',
        roles: ['chp'],
        shoes: 'dusty boots'
      });
      sinon.stub(service, '_validateUserSettings').resolves({
        facility_id: 'maine',
        phone: '123',
        known: false
      });
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
      sinon.stub(service, '_validateUser').resolves({});
      sinon.stub(service, '_validateUserSettings').resolves({});
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

  });

  describe('validateNewUsername', () => {

    it('fails if a user already exists with that name', done => {
      const usersGet = sinon.stub(db.users, 'get').resolves({ id: 'abc', rev: '1-xyz' });
      sinon.stub(db.medic, 'get').returns(Promise.reject({ status: 404 }));
      service._validateNewUsername('georgi').catch(err => {
        chai.expect(usersGet.callCount).to.equal(1);
        chai.expect(usersGet.args[0][0]).to.equal('org.couchdb.user:georgi');
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message).to.equal('Username "georgi" already taken.');
        chai.expect(err.message.translationKey).to.equal('username.taken');
        chai.expect(err.message.translationParams).to.have.property('username');
        done();
      });
    });

    it('fails if a user settings already exists with that name', done => {
      sinon.stub(db.users, 'get').returns(Promise.reject({ status: 404 }));
      const medicGet = sinon.stub(db.medic, 'get').resolves({ id: 'abc', rev: '1-xyz' });
      service._validateNewUsername('georgi').catch(err => {
        chai.expect(medicGet.callCount).to.equal(1);
        chai.expect(medicGet.args[0][0]).to.equal('org.couchdb.user:georgi');
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message).to.equal('Username "georgi" already taken.');
        chai.expect(err.message.translationKey).to.equal('username.taken');
        chai.expect(err.message.translationParams).to.have.property('username');
        done();
      });
    });

    it('fails if username contains invalid characters', done => {
      service._validateNewUsername('^_^').catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message.message).to.equal(
          'Invalid user name. Valid characters are lower case letters, numbers, underscore (_), and hyphen (-).'
        );
        chai.expect(err.message.translationKey).to.equal('username.invalid');
        done();
      });
    });

    it('passes if no user exists', () => {
      sinon.stub(db.users, 'get').returns(Promise.reject({ status: 404 }));
      sinon.stub(db.medic, 'get').returns(Promise.reject({ status: 404 }));
      return service._validateNewUsername('georgi');
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
          chai.expect(db.users.get.callCount).to.equal(1);
          chai.expect(db.users.get.args[0]).to.deep.equal(['org.couchdb.user:my_user']);
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

});

