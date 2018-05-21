const chai = require('chai'),
      sinon = require('sinon').sandbox.create(),
      controller = require('../../../src/controllers/users'),
      people = require('../../../src/controllers/people'),
      places = require('../../../src/controllers/places'),
      db = require('../../../src/db-nano'),
      COMPLEX_PASSWORD = '23l4ijk3nSDELKSFnwekirh';

const facilitya = { _id: 'a', name: 'aaron' },
      facilityb = { _id: 'b', name: 'brian' },
      facilityc = { _id: 'c', name: 'cathy' };

let userData;

describe('Users controller', () => {

  beforeEach(() => {
    sinon.stub(controller, '_getFacilities').callsArgWith(0, null, [
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
      const settings = controller._getSettingsUpdates('john', {});
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
      const settings = controller._getSettingsUpdates('john', data);
      chai.expect(settings.password).to.equal(undefined);
      chai.expect(settings.roles).to.equal(undefined);
      done();
    });

    it('reassigns place and contact fields', done => {
      const data = {
        place: 'abc',
        contact: '123',
        fullname: 'John'
      };
      const settings = controller._getSettingsUpdates('john', data);
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
      const settings = controller._getSettingsUpdates('john', data);
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
      const user = controller._getUserUpdates('john', data);
      chai.expect(user.name ).to.equal('john');
      done();
    });

    it('reassigns place field', done => {
      const data = {
        place: 'abc'
      };
      const user = controller._getUserUpdates('john', data);
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
      chai.expect(controller._getType(user, admins)).to.equal('unknown');
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
      chai.expect(controller._hasParent(facility, 'baz')).to.equal(true);
      chai.expect(controller._hasParent(facility, 'slime')).to.equal(false);
      chai.expect(controller._hasParent(facility, 'bar')).to.equal(true);
      chai.expect(controller._hasParent(facility, 'foo')).to.equal(true);
      chai.expect(controller._hasParent(facility, 'goo')).to.equal(false);
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
      sinon.stub(db._users, 'get').callsArgWith(1, {statusCode: 404});
      controller._validateUser('x', err => {
        chai.expect(err.message).to.equal('Failed to find user.');
        done();
      });
    });
  });

  describe('validateUserSettings', () => {
    it('defines custom error when not found', done => {
      sinon.stub(db.medic, 'get').callsArgWith(1, {statusCode: 404});
      controller._validateUserSettings('x', err => {
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
      chai.expect(controller._getType(user, admins)).to.equal('driver');
      done();
    });
  });

  describe('getList', () => {

    it('collects user infos', done => {
      sinon.stub(controller, '_getAllUsers').callsArgWith(0, null, [
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
      sinon.stub(controller, '_getAllUserSettings').callsArgWith(0, null, [
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
      controller.getList((err, data) => {
        chai.expect(err).to.equal(null);
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
        done();
      });
    });

    it('filters out non-users', done => {
      sinon.stub(controller, '_getAllUsers').callsArgWith(0, null, [
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
      sinon.stub(controller, '_getAllUserSettings').callsArgWith(0, null, [
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
      controller.getList((err, data) => {
        chai.expect(err).to.equal(null);
        chai.expect(data.length).to.equal(1);
        const milan = data[0];
        chai.expect(milan.id).to.equal('org.couchdb.user:y');
        chai.expect(milan.username).to.equal('milan');
        chai.expect(milan.fullname).to.equal('Milan A');
        chai.expect(milan.email).to.equal('m@a.com');
        chai.expect(milan.phone).to.equal('987654321');
        chai.expect(milan.place).to.deep.equal(facilityb);
        chai.expect(milan.type).to.equal('district-admin');
        done();
      });

    });

    it('handles minimal users', done => {
      sinon.stub(controller, '_getAllUsers').callsArgWith(0, null, [
        {
          id: 'org.couchdb.user:x',
          doc: {
            name: 'lucas'
          }
        }
      ]);
      sinon.stub(controller, '_getAllUserSettings').callsArgWith(0, null, []);
      controller.getList((err, data) => {
        chai.expect(err).to.equal(null);
        chai.expect(data.length).to.equal(1);
        const lucas = data[0];
        chai.expect(lucas.id).to.equal('org.couchdb.user:x');
        chai.expect(lucas.username).to.equal('lucas');
        chai.expect(lucas.fullname).to.equal(undefined);
        chai.expect(lucas.email).to.equal(undefined);
        chai.expect(lucas.phone).to.equal(undefined);
        chai.expect(lucas.facility).to.equal(undefined);
        chai.expect(lucas.type).to.equal('unknown');
        done();
      });
    });

    it('returns errors from users service', done => {
      sinon.stub(controller, '_getAllUsers').callsArgWith(0, 'not found');
      controller.getList(err => {
          chai.expect(err).to.equal('not found');
          done();
      });
    });

    it('returns errors from facilities service', done => {
      sinon.stub(controller, '_getAllUsers').callsArgWith(0, null, [
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
      sinon.stub(controller, '_getAllUserSettings').callsArgWith(0, null, []);
      controller._getFacilities.restore();
      sinon.stub(controller, '_getFacilities').callsArgWith(0, 'BOOM');
      controller.getList(err => {
        chai.expect(err).to.equal('BOOM');
        done();
      });
    });

  });

  describe('deleteUser', () => {

    it('returns _users insert errors', done => {
      sinon.stub(db._users, 'get').callsArgWith(1, null, {});
      const insert = sinon.stub(db._users, 'insert').callsArgWith(1, 'Not Found');
      controller.deleteUser('foo', err => {
        chai.expect(err).to.equal('Not Found');
        chai.expect(insert.callCount).to.equal(1);
        done();
      });
    });

    it('sets _deleted on the user doc', done => {
      const expect = {
        _id: 'foo',
        starsign: 'aries',
        _deleted: true
      };
      sinon.stub(db._users, 'get').callsArgWith(1, null, {
        _id: 'foo',
        starsign: 'aries',
      });
      sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
      const usersInsert = sinon.stub(db._users, 'insert').callsArg(1);
      sinon.stub(db.medic, 'insert').callsArg(1);
      controller.deleteUser('foo', err => {
        chai.expect(err).to.equal(null);
        chai.expect(usersInsert.callCount).to.equal(1);
        chai.expect(usersInsert.firstCall.args[0]).to.deep.equal(expect);
        done();
      });
    });

    it('sets _deleted on the user-settings doc', done => {
      const expect = {
        _id: 'foo',
        starsign: 'aries',
        _deleted: true
      };
      sinon.stub(db._users, 'get').callsArgWith(1, null, {
        _id: 'foo',
        starsign: 'aries',
      });
      sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
      const usersInsert = sinon.stub(db._users, 'insert').callsArg(1);
      sinon.stub(db.medic, 'insert').callsArg(1);
      controller.deleteUser('org.couchdb.user:gareth', err => {
        chai.expect(err).to.equal(null);
        chai.expect(usersInsert.callCount).to.equal(1);
        chai.expect(usersInsert.firstCall.args[0]).to.deep.equal(expect);
        done();
      });
    });

  });

  describe('createPlace', () => {
    it('assigns new place', done => {
      sinon.stub(places, 'getOrCreatePlace').callsArgWith(1, null, {
        _id: 'santos'
      });
      controller._createPlace(userData, {}, (err, data) => {
        chai.expect(err).to.equal(null);
        chai.expect(data.place._id).to.equal('santos');
        done();
      });
    });
  });

  describe('createUserSettings', () => {

    it('returns error from db insert', done => {
      sinon.stub(db.medic, 'insert').callsArgWith(2, 'yucky');
      controller._createUserSettings(userData, {}, err => {
        chai.expect(err).to.equal('yucky');
        done();
      });
    });

    it('sets up response', done => {
      sinon.stub(db.medic, 'insert').callsArgWith(2, null, {
        id: 'abc',
        rev: '1-xyz'
      });
      controller._createUserSettings(userData, {}, (err, data, response) => {
        chai.expect(err).to.equal(null);
        chai.expect(response).to.deep.equal({
          'user-settings': {
            id: 'abc',
            rev: '1-xyz'
          }
        });
        done();
      });
    });

    it('sets default roles on user-settings', done => {
      sinon.stub(db.medic, 'insert').callsFake(settings => {
        chai.expect(settings.roles).to.deep.equal([
          'district-manager',
          'kujua_user',
          'data_entry',
          'district_admin'
        ]);
        done();
      });
      controller._createUserSettings({});
    });

  });

  describe('_storeUpdatedUserSettings', () => {

    it('returns response', done => {
      sinon.stub(db.medic, 'insert').callsArgWith(2, null, {
        id: 'abc',
        rev: '1-xyz'
      });
      controller._storeUpdatedUserSettings('john', userData, (err, body) => {
        chai.expect(err).to.equal(null);
        chai.expect(body).to.deep.equal({
          id: 'abc',
          rev: '1-xyz'
        });
        done();
      });
    });

  });

  describe('createContact', () => {

    it('returns error from db insert', done => {
      sinon.stub(people, 'createPerson').callsArgWith(1, 'yucky');
      controller._createContact(userData, {}, err => {
        chai.expect(err).to.equal('yucky');
        done();
      });
    });

    it('updates contact property', done => {
      sinon.stub(people, 'getOrCreatePerson').callsArgWith(1, null, {
        id: 'abc'
      });
      controller._createContact(userData, {}, (err, data) => {
        chai.expect(err).to.equal(null);
        chai.expect(data.contact).to.deep.equal({ id: 'abc' });
        done();
      });
    });

    it('sets up response', done => {
      sinon.stub(people, 'getOrCreatePerson').callsArgWith(1, null, {
        _id: 'abc',
        _rev: '1-xyz'
      });
      controller._createContact(userData, {}, (err, data, response) => {
        chai.expect(err).to.equal(null);
        chai.expect(response).to.deep.equal({
          contact: {
            id: 'abc',
            rev: '1-xyz'
          }
        });
        done();
      });
    });

  });

  describe('_createUser', () => {

    it('sets default roles on user', done => {
      sinon.stub(db._users, 'insert').callsFake(user => {
        chai.expect(user.roles).to.deep.equal([
          'district-manager',
          'kujua_user',
          'data_entry',
          'district_admin'
        ]);
        done();
      });
      controller._createUser({});
    });

    it('returns error from db insert', done => {
      sinon.stub(db._users, 'insert').callsArgWith(2, 'yucky');
      controller._createUser(userData, {}, err => {
        chai.expect(err).to.equal('yucky');
        done();
      });
    });

    it('sets up response', done => {
      sinon.stub(db._users, 'insert').callsArgWith(2, null, {
        id: 'abc',
        rev: '1-xyz'
      });
      controller._createUser(userData, {}, (err, data, response) => {
        chai.expect(err).to.equal(null);
        chai.expect(response).to.deep.equal({
          'user': {
            id: 'abc',
            rev: '1-xyz'
          }
        });
        done();
      });
    });

  });

  describe('createUser', () => {

    it('returns error if missing fields', done => {
      // empty
      controller.createUser({}, err => {
        chai.expect(err.code).to.equal(400);
      });
      // missing username
      controller.createUser({
        password: 'x',
        place: 'x',
        contact: { parent: 'x' }
      }, err => {
        chai.expect(err.code).to.equal(400);
      });
      // missing password
      controller.createUser({
        username: 'x',
        place: 'x',
        contact: { parent: 'x' }
      }, err => {
        chai.expect(err.code).to.equal(400);
      });
      // missing place
      controller.createUser({
        username: 'x',
        password: 'x',
        contact: { parent: 'x' }
      }, err => {
        chai.expect(err.code).to.equal(400);
      });
      // missing contact
      controller.createUser({
        username: 'x',
        place: 'x',
        contact: { parent: 'x' }
      }, err => {
        chai.expect(err.code).to.equal(400);
      });
      // missing contact.parent
      controller.createUser({
        username: 'x',
        place: 'x',
        contact: {}
      }, err => {
        chai.expect(err.code).to.equal(400);
      });
      done();
    });

    it('returns error if short password', done => {
      controller.createUser({
        username: 'x',
        place: 'x',
        contact: { parent: 'x' },
        type: 'national-manager',
        password: 'short'
      }, err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message).to.equal('The password must be at least 8 characters long.');
        done();
      });
    });

    it('returns error if weak password', done => {
      controller.createUser({
        username: 'x',
        place: 'x',
        contact: { parent: 'x' },
        type: 'national-manager',
        password: 'password'
      }, err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message).to.equal('The password is too easy to guess. Include a range of types of characters to increase the score.');
        done();
      });
    });

    it('returns error if contact.parent lookup fails', done => {
      sinon.stub(controller, '_validateNewUsername').callsArg(1);
      sinon.stub(controller, '_createPlace').callsArgWith(2, null, {}, {});
      sinon.stub(controller, '_setContactParent').callsArgWith(2, 'kablooey');
      controller.createUser(userData, err => {
        chai.expect(err).to.equal('kablooey');
        done();
      });
    });

    it('returns error if place lookup fails', done => {
      sinon.stub(controller, '_validateNewUsername').callsArg(1);
      sinon.stub(controller, '_createPlace').callsArgWith(2, 'fail');
      controller.createUser(userData, err => {
        chai.expect(err).to.equal('fail');
        done();
      });
    });

    it('returns error if place is not within contact', done => {
      sinon.stub(controller, '_validateNewUsername').callsArg(1);
      sinon.stub(controller, '_createPlace').callsArgWith(2, null, userData, {});
      sinon.stub(places, 'getPlace').callsArgWith(1, null, {
        '_id': 'miami',
        parent: {
          '_id': 'florida'
        }
      });
      userData.place = 'georgia';
      controller.createUser(userData, err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message).to.equal('Contact is not within place.');
        done();
      });
    });

    it('succeeds if contact and place are the same', done => {
      sinon.stub(controller, '_validateNewUsername').callsArg(1);
      sinon.stub(controller, '_createPlace').callsArgWith(2, null, userData, {});
      sinon.stub(controller, '_createUser').callsArgWith(2, null, {}, {});
      sinon.stub(controller, '_createContact').callsArgWith(2, null, {}, {});
      sinon.stub(controller, '_storeUpdatedPlace').callsArgWith(2, null, {}, {});
      sinon.stub(controller, '_createUserSettings').callsArgWith(2, null, {}, {});
      sinon.stub(places, 'getPlace').callsArgWith(1, null, {
        '_id': 'foo'
      });
      userData.place = 'foo';
      controller.createUser(userData, err => {
        chai.expect(err).to.equal(null);
        done();
      });
    });

    it('succeeds if contact is within place', done => {
      sinon.stub(controller, '_validateNewUsername').callsArg(1);
      sinon.stub(controller, '_createPlace').callsArgWith(2, null, userData, {});
      sinon.stub(controller, '_createUser').callsArgWith(2, null, {}, {});
      sinon.stub(controller, '_createContact').callsArgWith(2, null, {}, {});
      sinon.stub(controller, '_storeUpdatedPlace').callsArgWith(2, null, {}, {});
      sinon.stub(controller, '_createUserSettings').callsArgWith(2, null, {}, {});
      sinon.stub(places, 'getPlace').callsArgWith(1, null, {
        '_id': 'miami',
        parent: {
          '_id': 'florida'
        }
      });
      userData.place = 'florida';
      controller.createUser(userData, (err, response) => {
        chai.expect(err).to.equal(null);
        chai.expect(response).to.deep.equal({});
        done();
      });
    });

    it('returns response object', done => {
      sinon.stub(controller, '_validateNewUsername').callsArg(1);
      sinon.stub(controller, '_createPlace').callsArgWith(2, null, userData, {});
      sinon.stub(controller, '_createUser').callsArgWith(2, null, {}, {});
      sinon.stub(controller, '_createContact').callsArgWith(2, null, {}, {});
      sinon.stub(controller, '_storeUpdatedPlace').callsArgWith(2, null, {}, {});
      sinon.stub(controller, '_createUserSettings').callsArgWith(2, null, {}, {
        biz: 'baz'
      });
      sinon.stub(places, 'getPlace').callsArg(1);
      sinon.stub(controller, '_hasParent').returns(true);
      controller.createUser(userData, (err, response) => {
        chai.expect(err).to.equal(null);
        chai.expect(response).to.deep.equal({
          biz: 'baz'
        });
        done();
      });
    });

    it('fails if new username does not validate', done => {
      sinon.stub(controller, '_validateNewUsername').callsArgWith(1, 'sorry');
      const insert = sinon.stub(db.medic, 'insert');
      controller.createUser(userData, err => {
        chai.expect(err).to.equal('sorry');
        chai.expect(insert.callCount).to.equal(0);
        done();
      });
    });

    it('errors if username exists in _users db', done => {
      sinon.stub(db._users, 'get').callsArgWith(1, null, 'bob lives here already.');
      const insert = sinon.stub(db.medic, 'insert');
      controller.createUser(userData, err => {
        chai.expect(err).to.deep.equal({
          code: 400,
          message: 'Username "x" already taken.'
        });
        chai.expect(insert.callCount).to.equal(0);
        done();
      });
    });

    it('errors if username exists in medic db', done => {
      sinon.stub(db._users, 'get').callsArg(1);
      sinon.stub(db.medic, 'get').callsArgWith(1, null, 'jane lives here too.');
      const insert = sinon.stub(db.medic, 'insert');
      controller.createUser(userData, err => {
        chai.expect(err).to.deep.equal({
          code: 400,
          message: 'Username "x" already taken.'
        });
        chai.expect(insert.callCount).to.equal(0);
        done();
      });
    });

  });

  describe('setContactParent', () => {

    it('resolves contact parent in waterfall', done => {
      sinon.stub(controller, '_validateNewUsername').callsArg(1);
      sinon.stub(controller, '_createPlace').callsArgWith(2, null, userData, {});
      sinon.stub(places, 'getPlace').callsArgWith(1, null, {
        _id: 'a',
        biz: 'marquee'
      });
      sinon.stub(controller, '_hasParent').returns(true);
      // checking function after setContactParent
      sinon.stub(controller, '_createContact').callsFake(data => {
        chai.expect(data.contact.parent).to.deep.equal({ _id: 'a' });
        done();
      });
      controller.createUser(userData);
    });

    it('fails validation if contact is not in place using id', done => {
      const userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: 'abc',
        contact: 'def',
        type: 'national-manager'
      };
      sinon.stub(controller, '_validateNewUsername').callsArg(1);
      sinon.stub(controller, '_createPlace').callsArgWith(2, null, userData, {});
      sinon.stub(db.medic, 'get').callsArgWith(1, null, {
        _id: 'def',
        type: 'person',
        name: 'greg',
        parent: {
          _id: 'efg'
        }
      });
      controller.createUser(userData, err => {
        chai.expect(err.message).to.equal('Contact is not within place.');
        done();
      });
    });

    it('passes validation if contact is in place using id', done => {
      const userData = {
        username: 'x',
        password: COMPLEX_PASSWORD,
        place: 'efg',
        contact: 'def',
        type: 'national-manager'
      };
      sinon.stub(controller, '_validateNewUsername').callsArg(1);
      sinon.stub(controller, '_createPlace').callsArgWith(2, null, userData, {});
      sinon.stub(db.medic, 'get').callsArgWith(1, null, {
        _id: 'def',
        type: 'person',
        name: 'greg',
        parent: {
          _id: 'efg'
        }
      });
      // checking function after setContactParent
      sinon.stub(controller, '_createContact').callsFake(data => {
        chai.expect(data.contact).to.equal('def');
        done();
      });
      controller.createUser(userData);
    });

  });

  describe('updatePlace', () => {

    it('updatePlace resolves place\'s contact in waterfall', done => {
      sinon.stub(controller, '_validateNewUsername').callsArg(1);
      sinon.stub(controller, '_createPlace').callsArgWith(2, null, {}, {});
      sinon.stub(controller, '_setContactParent').callsArgWith(2, null, userData, {});
      sinon.stub(people, 'getOrCreatePerson').callsArgWith(1, null, {
        _id: 'b',
        name: 'mickey'
      });
      sinon.stub(db.medic, 'insert').callsArg(1);
      sinon.stub(controller, '_createUser').callsFake(data => {
        chai.expect(data.contact).to.deep.equal({ _id: 'b', name: 'mickey' });
        chai.expect(data.place.contact).to.deep.equal({ _id: 'b' });
        done();
      });
      controller.createUser(userData);
    });

  });

  describe('updateUser', () => {

    it('errors if place, type and password is undefined', done => {
      controller.updateUser('paul', {}, true, err => {
        chai.expect(err.code).to.equal(400);
        done();
      });
    });

    it('errors on unknown property', done => {
      controller.updateUser('paul', {foo: 'bar'}, true, err => {
        chai.expect(err.code).to.equal(400);
        done();
      });
    });

    it('fails if place fetch fails', done => {
      const data = {
        place: 'x'
      };
      sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
      sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
      sinon.stub(places, 'getPlace').callsArgWith(1, 'Not today pal.');
      const update = sinon.stub(controller, '_storeUpdatedUser');
      const updateSettings = sinon.stub(controller, '_storeUpdatedUserSettings');
      controller.updateUser('paul', data, true, () => {
        chai.expect(update.callCount).to.equal(0);
        chai.expect(updateSettings.callCount).to.equal(0);
        done();
      });
    });

    it('fails if user not found', done => {
      const data = {
        type: 'x'
      };
      sinon.stub(controller, '_validateUser').callsArgWith(1, 'not found');
      const update = sinon.stub(controller, '_storeUpdatedUser');
      const updateSettings = sinon.stub(controller, '_storeUpdatedUserSettings');
      controller.updateUser('paul', data, true, () => {
        chai.expect(update.callCount).to.equal(0);
        chai.expect(updateSettings.callCount).to.equal(0);
        done();
      });
    });

    it('fails if user settings not found', done => {
      const data = {
        type: 'x'
      };
      sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
      sinon.stub(controller, '_validateUserSettings').callsArgWith(1, 'too rainy today');
      const update = sinon.stub(controller, '_storeUpdatedUser');
      const updateSettings = sinon.stub(controller, '_storeUpdatedUserSettings');
      controller.updateUser('paul', data, true, () => {
        chai.expect(update.callCount).to.equal(0);
        chai.expect(updateSettings.callCount).to.equal(0);
        done();
      });
    });

    it('fails if _users db insert fails', done => {
      sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
      sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
      sinon.stub(db.medic, 'insert').callsArgWith(2, null, {});
      sinon.stub(db._users, 'insert').callsArgWith(2, 'shiva was here');
      controller.updateUser('georgi', {type: 'x'}, true, err => {
        chai.expect(err).to.equal('shiva was here');
        done();
      });
    });

    it('fails if medic db insert fails', done => {
      sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
      sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
      sinon.stub(db.medic, 'insert').callsArgWith(2, 'shiva strikes again');
      sinon.stub(db._users, 'insert').callsArgWith(2, null, {});
      controller.updateUser('georgi', {type: 'x'}, true, err => {
        chai.expect(err).to.equal('shiva strikes again');
        done();
      });
    });

    it('succeeds if type is defined', done => {
      const data = {
        type: 'x'
      };
      sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
      sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
      const update = sinon.stub(controller, '_storeUpdatedUser').callsArg(2);
      const updateSettings = sinon.stub(controller, '_storeUpdatedUserSettings').callsArg(2);
      controller.updateUser('paul', data, true, err => {
        chai.expect(err).to.equal(null);
        chai.expect(update.callCount).to.equal(1);
        chai.expect(updateSettings.callCount).to.equal(1);
        done();
      });
    });

    it('succeeds if password is defined', done => {
      const data = {
        password: COMPLEX_PASSWORD
      };
      sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
      sinon.stub(controller, '_validateUserSettings').callsArg(1);
      const update = sinon.stub(controller, '_storeUpdatedUser').callsArg(2);
      const updateSettings = sinon.stub(controller, '_storeUpdatedUserSettings').callsArg(2);
      controller.updateUser('paul', data, true, err => {
        chai.expect(err).to.equal(null);
        chai.expect(update.callCount).to.equal(1);
        chai.expect(updateSettings.callCount).to.equal(1);
        done();
      });
    });

    it('succeeds if place is defined and found', done => {
      const data = {
        place: 'x'
      };
      sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
      sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
      sinon.stub(places, 'getPlace').callsArg(1);
      const update = sinon.stub(controller, '_storeUpdatedUser').callsArg(2);
      const updateSettings = sinon.stub(controller, '_storeUpdatedUserSettings').callsArg(2);
      controller.updateUser('paul', data, true, err => {
        chai.expect(err).to.equal(null);
        chai.expect(update.callCount).to.equal(1);
        chai.expect(updateSettings.callCount).to.equal(1);
        done();
      });
    });

    it('type param updates roles on user and user-settings doc', done => {
      const data = {
        type: 'rebel'
      };
      sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
      sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
      const update = sinon.stub(controller, '_storeUpdatedUser').callsFake((id, data, callback) => {
        chai.expect(data.roles).to.deep.equal(['rebel']);
        callback();
      });
      const updateSettings = sinon.stub(controller, '_storeUpdatedUserSettings').callsFake((id, data, callback) => {
        chai.expect(data.roles).to.deep.equal(['rebel']);
        callback();
      });
      controller.updateUser('paul', data, true, err => {
        chai.expect(err).to.equal(null);
        chai.expect(update.callCount).to.equal(1);
        chai.expect(updateSettings.callCount).to.equal(1);
        done();
      });
    });

    it('updates password on user doc', done => {
      const data = {
        password: COMPLEX_PASSWORD
      };
      sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
      sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
      sinon.stub(places, 'getPlace').callsArg(1);
      const update = sinon.stub(controller, '_storeUpdatedUser').callsFake((id, data, callback) => {
        chai.expect(data.password).to.equal(COMPLEX_PASSWORD);
        callback();
      });
      const updateSettings = sinon.stub(controller, '_storeUpdatedUserSettings').callsArg(2);
      controller.updateUser('paul', data, true, err => {
        chai.expect(err).to.equal(null);
        chai.expect(update.callCount).to.equal(1);
        chai.expect(updateSettings.callCount).to.equal(1);
        done();
      });
    });

    it('returns error if short password', done => {
      const data = {
        password: 'short'
      };
      const update = sinon.stub(controller, '_storeUpdatedUser');
      const updateSettings = sinon.stub(controller, '_storeUpdatedUserSettings');
      controller.updateUser('paul', data, true, err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message).to.equal('The password must be at least 8 characters long.');
        chai.expect(update.callCount).to.equal(0);
        chai.expect(updateSettings.callCount).to.equal(0);
        done();
      });
    });

    it('returns error if weak password', done => {
      const data = {
        password: 'aaaaaaaa'
      };
      const update = sinon.stub(controller, '_storeUpdatedUser');
      const updateSettings = sinon.stub(controller, '_storeUpdatedUserSettings');
      controller.updateUser('paul', data, true, err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message).to.equal('The password is too easy to guess. Include a range of types of characters to increase the score.');
        chai.expect(update.callCount).to.equal(0);
        chai.expect(updateSettings.callCount).to.equal(0);
        done();
      });
    });

    it('updates facility_id on user and user settings', done => {
      const data = {
        place: 'paris'
      };
      sinon.stub(controller, '_validateUser').callsArgWith(1, null, {
        facility_id: 'maine'
      });
      sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {
        facility_id: 'maine'
      });
      sinon.stub(places, 'getPlace').callsArg(1);
      const update = sinon.stub(controller, '_storeUpdatedUser').callsFake((id, user, cb) => {
        chai.expect(user.facility_id).to.equal('paris');
        cb();
      });
      const updateSettings = sinon.stub(controller, '_storeUpdatedUserSettings').callsFake((id, settings, cb) => {
        chai.expect(settings.facility_id).to.equal('paris');
        cb();
      });
      controller.updateUser('paul', data, true, err => {
        chai.expect(err).to.equal(null);
        chai.expect(update.callCount).to.equal(1);
        chai.expect(updateSettings.callCount).to.equal(1);
        done();
      });
    });

    it('updates user and user settings doc', done => {
      const data = {
        place: 'el paso',
        type: 'rambler',
        password: COMPLEX_PASSWORD
      };
      sinon.stub(controller, '_validateUser').callsArgWith(1, null, {
        facility_id: 'maine',
        roles: ['bartender'],
        shoes: 'dusty boots'
      });
      sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {
        facility_id: 'maine',
        phone: '123',
        known: false
      });
      sinon.stub(places, 'getPlace').callsArg(1);
      const update = sinon.stub(controller, '_storeUpdatedUser').callsFake((id, user, cb) => {
        chai.expect(user.facility_id).to.equal('el paso');
        chai.expect(user.roles).to.deep.equal(['rambler']);
        chai.expect(user.shoes).to.equal('dusty boots');
        chai.expect(user.password).to.equal(COMPLEX_PASSWORD);
        chai.expect(user.type).to.equal('user');
        cb();
      });
      const updateSettings = sinon.stub(controller, '_storeUpdatedUserSettings').callsFake((id, settings, cb) => {
        chai.expect(settings.facility_id).to.equal('el paso');
        chai.expect(settings.phone).to.equal('123');
        chai.expect(settings.known).to.equal(false);
        chai.expect(settings.type).to.equal('user-settings');
        cb();
      });
      controller.updateUser('paul', data, true, err => {
        chai.expect(err).to.equal(null);
        chai.expect(update.callCount).to.equal(1);
        chai.expect(updateSettings.callCount).to.equal(1);
        done();
      });
    });

    it('sets up response', done => {
      const data = {
        fullname: 'George'
      };
      sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
      sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
      sinon.stub(db.medic, 'insert').callsArgWith(2, null, {
        id: 'abc',
        rev: '1-xyz'
      });
      sinon.stub(db._users, 'insert').callsArgWith(2, null, {
        id: 'def',
        rev: '1-uvw'
      });
      controller.updateUser('georgi', data, true, (err, resp) => {
        chai.expect(err).to.equal(null);
        chai.expect(resp.user).to.deep.equal({
          id: 'def',
          rev: '1-uvw'
        });
        chai.expect(resp['user-settings']).to.deep.equal({
          id: 'abc',
          rev: '1-xyz'
        });
        done();
      });
    });

  });

  describe('validateNewUsername', () => {

    it('fails if a user already exists with that name', done => {
      const usersGet = sinon.stub(db._users, 'get').callsArgWith(1, null, { id: 'abc', rev: '1-xyz' });
      controller._validateNewUsername('georgi', err => {
        chai.expect(usersGet.callCount).to.equal(1);
        chai.expect(usersGet.args[0][0]).to.equal('org.couchdb.user:georgi');
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message).to.equal('Username "georgi" already taken.');
        done();
      });
    });

    it('fails if a user settings already exists with that name', done => {
      sinon.stub(db._users, 'get').callsArgWith(1, { statusCode: 404 });
      const medicGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, { id: 'abc', rev: '1-xyz' });
      controller._validateNewUsername('georgi', err => {
        chai.expect(medicGet.callCount).to.equal(1);
        chai.expect(medicGet.args[0][0]).to.equal('org.couchdb.user:georgi');
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message).to.equal('Username "georgi" already taken.');
        done();
      });
    });

    it('fails if username contains invalid characters', done => {
      controller._validateNewUsername('^_^', err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message, 'Invalid user name. Valid characters are lower case letters, numbers, underscore (_)).to.equal(and hyphen (-).');
        done();
      });
    });

    it('passes if no user exists', done => {
      sinon.stub(db._users, 'get').callsArgWith(1, { statusCode: 404 });
      sinon.stub(db.medic, 'get').callsArgWith(1, { statusCode: 404 });
      controller._validateNewUsername('georgi', err => {
        chai.expect(err).to.equal(null);
        done();
      });
    });

  });

});
