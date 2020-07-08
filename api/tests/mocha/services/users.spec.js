const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

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
let clock;
const oneDayInMS = 24 * 60 * 60 * 1000;

let service;

describe('Users service', () => {
  beforeEach(() => {
    service = rewire('../../../src/services/users');
    service.__set__('getFacilities', sinon.stub().returns([
      facilitya,
      facilityb,
      facilityc,
    ]));
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
        .then(() => { throw 'should have thrown'; })
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
      service.__set__('validateUser', sinon.stub().resolves({}));
      service.__set__('validateUserSettings', sinon.stub().resolves({}));
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

  describe('getUserByToken', () => {
    it('should do nothing with no input', () => {
      sinon.stub(db.users, 'query');
      return service.getUserByToken().then(response => {
        chai.expect(response).to.equal(false);
        chai.expect(db.users.query.callCount).to.equal(0);
      });
    });

    it('should return false when no matches found', () => {
      sinon.stub(db.users, 'query').resolves({ rows: [] });
      return service.getUserByToken('token', 'hash').then(response => {
        chai.expect(response).to.equal(false);
        chai.expect(db.users.query.callCount).to.equal(1);
        chai.expect(db.users.query.args[0]).to.deep.equal(['token-login/users-by-token', { key: ['token', 'hash'] }]);
      });
    });

    it('should return false when match is expired', () => {
      sinon.stub(db.users, 'query').resolves({ rows: [{ value: { token_expiration_date: 0 }}] });
      return service.getUserByToken('the_token', 'the_hash').then(response => {
        chai.expect(response).to.equal(false);
        chai.expect(db.users.query.callCount).to.equal(1);
        chai.expect(db.users.query.args[0])
          .to.deep.equal(['token-login/users-by-token', { key: ['the_token', 'the_hash'] }]);
      });
    });

    it('should return the row id when match is not expired', () => {
      const future = new Date().getTime() + 1000;
      sinon.stub(db.users, 'query').resolves({ rows: [{ value: { token_expiration_date: future }, id: 'user_id'}] });
      return service.getUserByToken('the_token', 'the_hash').then(response => {
        chai.expect(response).to.equal('user_id');
        chai.expect(db.users.query.callCount).to.equal(1);
        chai.expect(db.users.query.args[0])
          .to.deep.equal(['token-login/users-by-token',{ key: ['the_token', 'the_hash'] }]);
      });
    });

    it('should throw query errors', () => {
      sinon.stub(db.users, 'query').rejects({ some: 'err' });
      return service
        .getUserByToken('t', 'h')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => chai.expect(err).to.deep.equal({ some: 'err' }));
    });
  });

  describe('resetPassword', () => {
    it('should throw an error when user not found', () => {
      sinon.stub(db.users, 'get').rejects({ status: 404 });

      return service
        .resetPassword('userId')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.include({ status: 404 });
        });
    });

    it('should throw an error when user is invalid', () => {
      sinon.stub(db.users, 'get').resolves({ name: 'user' });
      return service
        .resetPassword('userId')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ code: 400, message: 'invalid user' });
        });
    });

    it('should throw an error when user token not active', () => {
      sinon.stub(db.users, 'get').resolves({ name: 'user', token_login: { active: false } });
      return service
        .resetPassword('userId')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ code: 400, message: 'invalid user' });
        });
    });

    it('should update the users password', () => {
      const user = {
        name: 'sally',
        roles: ['a', 'b'],
        facilty_id: 'c',
        type: 'user',
        token_login: {
          active: true,
          token: 'aaaa',
          hash: 'bbb',
          expiration_date: 0,
        },
      };

      sinon.stub(db.users, 'get').resolves(user);
      sinon.stub(db.users, 'put').resolves();

      return service.resetPassword('userID').then(response => {
        chai.expect(response).to.deep.equal({
          password: user.password,
          user: 'sally'
        });
        chai.expect(user.password.length).to.equal(8);

        chai.expect(db.users.get.callCount).to.equal(1);
        chai.expect(db.users.get.args[0]).to.deep.equal(['userID']);

        chai.expect(db.users.put.callCount).to.equal(1);
        chai.expect(db.users.put.args[0]).to.deep.equal([{
          name: 'sally',
          roles: ['a', 'b'],
          facilty_id: 'c',
          type: 'user',
          token_login: {
            active: true,
            token: 'aaaa',
            hash: 'bbb',
            expiration_date: 0,
          },
          password: user.password,
        }]);
      });
    });
  });

  describe('deactivate token login', () => {
    it('should throw an error when user not found', () => {
      sinon.stub(db.users, 'get').rejects({ status: 404 });
      sinon.stub(db.medic, 'get').rejects({ status: 404 });

      return service
        .deactivateTokenLogin('userId')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.include({ status: 404 });
        });
    });

    it('should throw an error when user is invalid', () => {
      sinon.stub(db.users, 'get').resolves({ name: 'user' });
      sinon.stub(db.medic, 'get').resolves({ name: 'user' });
      return service
        .deactivateTokenLogin('userId')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ code: 400, message: 'invalid user' });
        });
    });

    it('should throw an error when user token not active', () => {
      sinon.stub(db.users, 'get').resolves({ name: 'user', token_login: { active: false } });
      sinon.stub(db.medic, 'get').resolves({ name: 'user', token_login: { active: false } });
      return service
        .deactivateTokenLogin('userId')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ code: 400, message: 'invalid user' });
        });
    });

    it('should de-activate token login', () => {
      const user = {
        name: 'sally',
        roles: ['a', 'b'],
        facilty_id: 'c',
        type: 'user',
        token_login: {
          active: true,
          token: 'aaaa',
          hash: 'bbb',
          expiration_date: 0,
        },
      };
      const userSettings = {
        name: 'sally',
        roles: ['a', 'b'],
        phone: 'c',
        type: 'user-settings',
        token_login: { active: true, expiration_date: 0 },
      };

      sinon.stub(db.users, 'get').resolves(user);
      sinon.stub(db.medic, 'get').resolves(userSettings);
      sinon.stub(db.users, 'put').resolves();
      sinon.stub(db.medic, 'put').resolves();
      clock.tick(123);

      return service.deactivateTokenLogin('userID').then(() => {
        chai.expect(db.users.get.callCount).to.equal(1);
        chai.expect(db.users.get.args[0]).to.deep.equal(['userID']);
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(db.medic.get.args[0]).to.deep.equal(['userID']);

        chai.expect(db.users.put.callCount).to.equal(1);
        chai.expect(db.users.put.args[0]).to.deep.equal([{
          name: 'sally',
          roles: ['a', 'b'],
          facilty_id: 'c',
          type: 'user',
          token_login: {
            active: false,
            login_date: 123,
            token: 'aaaa',
            hash: 'bbb',
            expiration_date: 0,
          },
        }]);
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.medic.put.args[0]).to.deep.equal([{
          name: 'sally',
          roles: ['a', 'b'],
          phone: 'c',
          type: 'user-settings',
          token_login: { active: false, expiration_date: 0, login_date: 123 },
        }]);
      });
    });
  });

  describe('manageTokenLogin', () => {
    it('should do nothing when undefined', () => {
      return service.__get__('manageTokenLogin')({}, { user: { id: 'user' } }).then(actual => {
        chai.expect(actual).to.deep.equal({ user: { id: 'user' } });
      });
    });

    it('should do nothing when no config', () => {
      sinon.stub(config, 'get').withArgs('token_login').returns();
      return service.__get__('manageTokenLogin')({ token_login: true }, { user: { id: 'user' } }).then(actual => {
        chai.expect(actual).to.deep.equal({ user: { id: 'user' } });
      });
    });

    describe('disabling token login', () => {
      it('should do nothing when user does not have token_login configured', () => {
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };
        sinon.stub(db.medic, 'get').withArgs('userID').resolves({ _id: 'userID' });
        sinon.stub(db.users, 'get').withArgs('userID').resolves({ _id: 'userID' });

        return service.__get__('manageTokenLogin')({ token_login: false }, response).then(actual => {
          chai.expect(actual).to.deep.equal({ user: { id: 'userID' }, 'user-settings': { id: 'userID' } });
        });
      });

      it('should disable token login when requested', () => {
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };
        const responseCopy = Object.assign({}, response);
        sinon.stub(db.medic, 'get')
          .withArgs('userID').resolves({
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
            token_login: { active: true, expiration_date: 123 },
          })
          .withArgs('the_sms_doc').resolves({
            _id: 'the_sms_doc',
            type: 'sms_doc',
            tasks: [
              { state: 'pending', messages: [{ message: 'sms1' }] },
              { state: 'pending', messages: [{ message: 'sms2' }] },
            ]
          });
        sinon.stub(db.users, 'get').withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          token_login: {
            active: true,
            expiration_date: 123,
            token: 'aaa',
            doc_id: 'the_sms_doc',
          }
        });

        sinon.stub(db.medic, 'put').resolves();
        sinon.stub(db.users, 'put').resolves();

        return service.__get__('manageTokenLogin')({ token_login: false }, response).then(actual => {
          chai.expect(db.medic.put.callCount).to.equal(2);
          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'the_sms_doc',
            type: 'sms_doc',
            tasks: [
              {
                state: 'cleared',
                messages: [{ message: 'sms1' }],
                gateway_ref: undefined,
                state_details: undefined,
                state_history: [{ state: 'cleared', state_details: undefined, timestamp: new Date().toISOString() }],
              },
              {
                state: 'cleared',
                messages: [{ message: 'sms2' }],
                gateway_ref: undefined,
                state_details: undefined,
                state_history: [{ state: 'cleared', state_details: undefined, timestamp: new Date().toISOString() }],
              },
            ]
          }]);
          chai.expect(db.medic.put.args[1]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          }]);

          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          }]);
          chai.expect(actual).to.deep.equal(responseCopy);
        });
      });

      it('should only clear pending messages', () => {
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };
        const responseCopy = Object.assign({}, response);
        sinon.stub(db.medic, 'get')
          .withArgs('userID').resolves({
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
            token_login: { active: true, expiration_date: 123 },
          })
          .withArgs('the_sms_doc').resolves({
            _id: 'the_sms_doc',
            type: 'sms_doc',
            tasks: [
              { state: 'sent', messages: [{ message: 'sms1' }] },
              { state: 'forwarded-by-gateway', messages: [{ message: 'sms2' }] },
            ]
          });
        sinon.stub(db.users, 'get').withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          token_login: {
            active: true,
            expiration_date: 123,
            token: 'aaa',
            doc_id: 'the_sms_doc',
          }
        });

        sinon.stub(db.medic, 'put').resolves();
        sinon.stub(db.users, 'put').resolves();

        return service.__get__('manageTokenLogin')({ token_login: false }, response).then(actual => {
          chai.expect(db.medic.put.callCount).to.equal(1);
          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          }]);

          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          }]);
          chai.expect(actual).to.deep.equal(responseCopy);
        });
      });

      it('should work when old sms message not found', () => {
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };
        sinon.stub(db.medic, 'get')
          .withArgs('userID').resolves({
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
            token_login: { active: true, expiration_date: 123 },
          })
          .withArgs('the_sms_doc').rejects({ status: 404 });

        sinon.stub(db.users, 'get').withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          token_login: {
            active: true,
            expiration_date: 123,
            token: 'aaa',
            doc_id: 'the_sms_doc',
          }
        });

        sinon.stub(db.medic, 'put').resolves();
        sinon.stub(db.users, 'put').resolves();

        return service.__get__('manageTokenLogin')({ token_login: false }, response).then(actual => {
          chai.expect(db.medic.put.callCount).to.equal(1);
          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          }]);

          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          }]);
          chai.expect(actual).to.deep.equal(response);
        });
      });
    });

    describe('enabling token login', () => {
      it('should generate password, token and hash, create sms and update user docs', () => {
        sinon.stub(config, 'get').withArgs('token_login').returns({ message: 'the sms', app_url: 'http://host' });
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };

        sinon.stub(db.medic, 'get').withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          phone: '+40755232323',
        });

        sinon.stub(db.users, 'get').withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
        });

        sinon.stub(db.medic, 'put').resolves();
        sinon.stub(db.users, 'put').resolves();
        sinon.stub(db.medic, 'post').resolves({ id: 'someId' });

        clock.tick(2000);

        return service.__get__('manageTokenLogin')({ token_login: true }, response).then(actual => {
          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0][0]).to.deep.include({
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          });
          chai.expect(db.users.put.args[0][0].token_login).to.deep.include({
            active: true,
            expiration_date: 2000 + oneDayInMS,
            doc_id: 'someId',
          });
          const token = db.users.put.args[0][0].token_login.token;
          const hash = db.users.put.args[0][0].token_login.hash;

          chai.expect(db.medic.post.callCount).to.equal(1);
          chai.expect(db.medic.post.args[0][0]).to.deep.nested.include({
            type: 'token_login_sms',
            reported_date: 2000,
            user: 'userID',
            'tasks[0].state': 'pending',
            'tasks[0].messages[0].to': '+40755232323',
            'tasks[0].messages[0].message': 'the sms',
            'tasks[1].messages[0].to': '+40755232323',
            'tasks[1].messages[0].message': `http://host/medic/login/token/${token}/${hash}`,
          });
          chai.expect(db.medic.put.callCount).to.equal(1);
          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            phone: '+40755232323',
            roles: ['a', 'b'],
            token_login: { active: true, expiration_date: 2000 + oneDayInMS },
          }]);

          chai.expect(actual).to.deep.equal({
            user: { id: 'userID' },
            'user-settings': { id: 'userID' },
            token_login: { id: 'someId', expiration_date: 2000 + oneDayInMS }
          });
        });
      });

      it('should clear previous token_login sms', () => {
        sinon.stub(config, 'get').withArgs('token_login').returns({ message: 'the sms', app_url: 'http://host' });
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };

        sinon.stub(db.medic, 'get').withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          phone: 'phone',
          token_login: { active: true, expiration_date: 2500 },
        });
        db.medic.get.withArgs('oldSms').resolves({
          _id: 'oldSms',
          type: 'token_login_sms',
          reported_date: 1000,
          user: 'userID',
          tasks: [
            {
              state: 'pending',
              messages: [{ to: 'oldphone', message: 'old message' }],
            },
            {
              state: 'pending',
              messages: [{ to: 'oldphone', message: 'old link' }],
            },
          ],
        });

        sinon.stub(db.users, 'get').withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          token_login: {
            active: true,
            doc_id: 'oldSms',
            expiration_date: 2500,
            token: 'oldtoken',
            hash: 'oldhash',
          },
        });

        sinon.stub(db.medic, 'put').resolves();
        sinon.stub(db.users, 'put').resolves();
        sinon.stub(db.medic, 'post').resolves({ id: 'someId' });

        clock.tick(2000);

        return service.__get__('manageTokenLogin')({ token_login: true }, response).then(actual => {
          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0][0]).to.deep.include({
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          });
          chai.expect(db.users.put.args[0][0].token_login).to.deep.include({
            active: true,
            expiration_date: 2000 + oneDayInMS,
            doc_id: 'someId',
          });
          const token = db.users.put.args[0][0].token_login.token;
          const hash = db.users.put.args[0][0].token_login.hash;

          chai.expect(token).not.to.equal('oldtoken');
          chai.expect(token.length).to.equal(50);
          chai.expect(hash).not.to.equal('oldhash');
          chai.expect(hash.length).to.equal(40);

          chai.expect(db.medic.post.callCount).to.equal(1);
          chai.expect(db.medic.post.args[0][0]).to.deep.nested.include({
            type: 'token_login_sms',
            reported_date: 2000,
            user: 'userID',
            'tasks[0].state': 'pending',
            'tasks[0].messages[0].to': 'phone',
            'tasks[0].messages[0].message': 'the sms',
            'tasks[1].messages[0].to': 'phone',
            'tasks[1].messages[0].message': `http://host/medic/login/token/${token}/${hash}`,
          });

          chai.expect(db.medic.put.callCount).to.equal(2);
          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'oldSms',
            type: 'token_login_sms',
            reported_date: 1000,
            user: 'userID',
            tasks: [
              {
                state: 'cleared',
                messages: [{ to: 'oldphone', message: 'old message' }],
                gateway_ref: undefined,
                state_details: undefined,
                state_history: [{ state: 'cleared', state_details: undefined, timestamp: new Date().toISOString() }]
              },
              {
                state: 'cleared',
                messages: [{ to: 'oldphone', message: 'old link' }],
                gateway_ref: undefined,
                state_details: undefined,
                state_history: [{ state: 'cleared', state_details: undefined, timestamp: new Date().toISOString() }]
              },
            ],
          }]);
          chai.expect(db.medic.put.args[1]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            phone: 'phone',
            roles: ['a', 'b'],
            token_login: { active: true, expiration_date: 2000 + oneDayInMS },
          }]);

          chai.expect(actual).to.deep.equal({
            user: { id: 'userID' },
            'user-settings': { id: 'userID' },
            token_login: { id: 'someId', expiration_date: 2000 + oneDayInMS }
          });
        });
      });

      it('should only clear pending tasks in previous token_login sms', () => {
        sinon.stub(config, 'get').withArgs('token_login').returns({ message: 'the sms', app_url: 'http://host' });
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };

        sinon.stub(db.medic, 'get').withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          phone: 'newphone',
          token_login: { active: true, expiration_date: 2500 },
        });
        db.medic.get.withArgs('oldSms').resolves({
          _id: 'oldSms',
          type: 'token_login_sms',
          reported_date: 1000,
          user: 'userID',
          tasks: [
            {
              state: 'pending',
              messages: [{ to: 'oldphone', message: 'old message' }],
            },
            {
              state: 'sent',
              messages: [{ to: 'oldphone', message: 'old link' }],
            },
          ],
        });

        sinon.stub(db.users, 'get').withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          token_login: {
            active: true,
            doc_id: 'oldSms',
            expiration_date: 2500,
            token: 'oldtoken',
            hash: 'oldhash',
          },
        });

        sinon.stub(db.medic, 'put').resolves();
        sinon.stub(db.users, 'put').resolves();
        sinon.stub(db.medic, 'post').resolves({ id: 'otherId' });

        clock.tick(5000);

        return service.__get__('manageTokenLogin')({ token_login: true }, response).then(actual => {
          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0][0].token_login).to.deep.include({
            active: true,
            expiration_date: 5000 + oneDayInMS,
            doc_id: 'otherId',
          });
          const token = db.users.put.args[0][0].token_login.token;
          const hash = db.users.put.args[0][0].token_login.hash;

          chai.expect(db.medic.post.callCount).to.equal(1);
          chai.expect(db.medic.post.args[0][0]).to.deep.nested.include({
            type: 'token_login_sms',
            reported_date: 5000,
            user: 'userID',
            'tasks[0].state': 'pending',
            'tasks[0].messages[0].to': 'newphone',
            'tasks[0].messages[0].message': 'the sms',
            'tasks[1].messages[0].to': 'newphone',
            'tasks[1].messages[0].message': `http://host/medic/login/token/${token}/${hash}`,
          });

          chai.expect(db.medic.put.callCount).to.equal(2);
          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'oldSms',
            type: 'token_login_sms',
            reported_date: 1000,
            user: 'userID',
            tasks: [
              {
                state: 'cleared',
                messages: [{ to: 'oldphone', message: 'old message' }],
                gateway_ref: undefined,
                state_details: undefined,
                state_history: [{ state: 'cleared', state_details: undefined, timestamp: new Date().toISOString() }]
              },
              {
                state: 'sent',
                messages: [{ to: 'oldphone', message: 'old link' }],
              },
            ],
          }]);

          chai.expect(actual).to.deep.equal({
            user: { id: 'userID' },
            'user-settings': { id: 'userID' },
            token_login: { id: 'otherId', expiration_date: 5000 + oneDayInMS }
          });
        });
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

      sinon.stub(config, 'get').withArgs('token_login').returns({ translation_key: 'sms', app_url: 'url' });
      sinon.stub(auth, 'isOffline').returns(false);

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

      sinon.stub(config, 'get').withArgs('token_login').returns({ translation_key: 'sms', app_url: 'url' });
      sinon.stub(auth, 'isOffline').returns(false);

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
      sinon.stub(config, 'get').withArgs('token_login').returns({ message: 'sms', app_url: 'url' });
      sinon.stub(auth, 'isOffline').returns(false);

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
      sinon.stub(db.medic, 'post').resolves({ id: 'someRandomId' });

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

      return service.createUser(user).then(response => {
        chai.expect(response).to.deep.equal({
          user: { id: 'org.couchdb.user:sally', rev: undefined },
          'user-settings': { id: 'org.couchdb.user:sally', rev: undefined },
          token_login: { id: 'someRandomId', expiration_date: oneDayInMS },
        });
        chai.expect(db.medic.put.callCount).to.equal(2);
        chai.expect(db.users.put.callCount).to.equal(2);
        chai.expect(db.medic.post.callCount).to.equal(1);

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

        chai.expect(db.medic.put.args[1][0]).to.deep.equal({
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
          doc_id: 'someRandomId',
        });
        const token = db.users.put.args[1][0].token_login.token;
        const hash = db.users.put.args[1][0].token_login.hash;
        chai.expect(token.length).to.equal(50);
        chai.expect(hash.length).to.equal(40);

        chai.expect(db.medic.post.args[0][0]).to.deep.nested.include({
          type: 'token_login_sms',
          reported_date: 0,
          user: 'org.couchdb.user:sally',
          'tasks[0].messages[0].to': '+40755696969',
          'tasks[0].messages[0].message': 'sms',
          'tasks[0].state': 'pending',
          'tasks[1].messages[0].to': '+40755696969',
          'tasks[1].messages[0].message': `url/medic/login/token/${token}/${hash}`,
          'tasks[1].state': 'pending',
        });
      });
    });
  });

  describe('update a user with token_login', () => {
    it('should require a phone number', () => {
      const updates = { token_login: true };

      sinon.stub(config, 'get').withArgs('token_login').returns({ translation_key: 'sms', app_url: 'url' });
      sinon.stub(auth, 'isOffline').returns(false);

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

      sinon.stub(config, 'get').withArgs('token_login').returns({ translation_key: 'sms', app_url: 'url' });
      sinon.stub(auth, 'isOffline').returns(false);

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
      sinon.stub(config, 'get').withArgs('token_login').returns({ message: 'the sms', app_url: 'http://host' });
      sinon.stub(auth, 'isOffline').returns(false);

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
      sinon.stub(db.medic, 'post').resolves({ id: 'otherRandomId' });
      sinon.stub(db.medic, 'put').withArgs(sinon.match({ _id: 'org.couchdb.user:sally' }))
        .resolves({ id: 'org.couchdb.user:sally' });
      sinon.stub(db.users, 'put').withArgs(sinon.match({ _id: 'org.couchdb.user:sally' }))
        .resolves({ id: 'org.couchdb.user:sally' });

      clock.tick(5000);

      return service.updateUser('sally', updates).then(response => {
        chai.expect(response).to.deep.equal({
          user: { id: 'org.couchdb.user:sally', rev: undefined },
          'user-settings': { id: 'org.couchdb.user:sally', rev: undefined },
          token_login: { id: 'otherRandomId', expiration_date: 5000 + oneDayInMS },
        });

        chai.expect(db.medic.put.callCount).to.equal(2);
        chai.expect(db.medic.put.args[1][0]).to.deep.equal({
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
          doc_id: 'otherRandomId',
        });
        chai.expect(db.users.put.args[0][0].password.length).to.equal(20);

        const token = db.users.put.args[0][0].token_login.token;
        const hash = db.users.put.args[0][0].token_login.hash;
        chai.expect(token.length).to.equal(50);
        chai.expect(hash.length).to.equal(40);

        chai.expect(db.medic.post.args[0][0]).to.deep.nested.include({
          type: 'token_login_sms',
          reported_date: 5000,
          user: 'org.couchdb.user:sally',
          'tasks[0].messages[0].to': '+40755898989',
          'tasks[0].messages[0].message': 'the sms',
          'tasks[0].state': 'pending',
          'tasks[1].messages[0].to': '+40755898989',
          'tasks[1].messages[0].message': `http://host/medic/login/token/${token}/${hash}`,
          'tasks[1].state': 'pending',
        });
      });
    });

    it('should require password when removing token_login', () => {
      sinon.stub(config, 'get').withArgs('token_login').returns({ message: 'the sms', app_url: 'http://host' });
      sinon.stub(auth, 'isOffline').returns(false);

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
            'message.message': 'The password must be at least 8 characters long.',
          });
        });
    });

    it('should not require password when not changing token_login', () => {
      sinon.stub(config, 'get').withArgs('token_login').returns({ message: 'the sms', app_url: 'http://host' });
      sinon.stub(auth, 'isOffline').returns(false);

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
});

