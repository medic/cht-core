const { assert } = require('chai');
const querystring = require('querystring');
const rewire = require('rewire');
const sinon = require('sinon');

const api = require('../api-stub');
const environment = require('../../src/lib/environment');

const createUsers = rewire('../../src/fn/create-users');
const userPrompt = rewire('../../src/lib/user-prompt');

const readLine = require('readline-sync');
const mockTestDir = testDir => sinon.stub(environment, 'pathToProject').get(() => testDir);

describe('create-users', () => {
  beforeEach(() => {
    createUsers.__set__('userPrompt', userPrompt);
    return api.start();
  });
  afterEach(() => {
    sinon.restore();
    return api.stop();
  });

  it('should create a user with place defined as a string', function() {
    mockTestDir(`data/create-users/existing-place`);
    api.giveResponses({ body: {} }, { body: {} });
    const todd = {
      username: 'todd',
      password: 'Secret_1',
      roles: ['district-admin'],
      place: 'place_uuid_here',
      contact: {
        c_prop: 'c_val_a'
      },
      name: 'Alice Example',
      phone: '+123456789',
    };

    const qs = {
      facility_id: todd.place,
      role: JSON.stringify(todd.roles),
    };

    return assertDbEmpty()
      .then(() => /* when */ createUsers.execute())
      .then(() => {
        assert.deepEqual(api.requestLog(), [
          { method: 'GET', url: '/api/v1/users-info?' + querystring.stringify(qs), body: {} },
          { method: 'POST', url: '/api/v1/users', body: todd },
        ]);
      });
  });

  it('should create user with existent place and response from user-info', () => {
    mockTestDir(`data/create-users/existing-place`);
    api.giveResponses({ body: { total_docs: 1000, warn: false } }, { body: {} });
    const todd = {
      username: 'todd',
      password: 'Secret_1',
      roles: ['district-admin'],
      place: 'place_uuid_here',
      contact: {
        c_prop: 'c_val_a'
      },
      name: 'Alice Example',
      phone: '+123456789',
    };

    const qs = {
      facility_id: todd.place,
      role: JSON.stringify(todd.roles),
    };

    return assertDbEmpty()
      .then(() => /* when */ createUsers.execute())
      .then(() => {
        assert.deepEqual(api.requestLog(), [
          { method: 'GET', url: '/api/v1/users-info?' + querystring.stringify(qs), body: {} },
          { method: 'POST', url: '/api/v1/users', body: todd },
        ]);
      });
  });

  it('should create user with existent place and not implemented user-info endpoint', () => {
    mockTestDir(`data/create-users/existing-place`);
    api.giveResponses({ status: 404, body: { code: 404, error: 'not_found' } }, { body: {} });
    const todd = {
      username: 'todd',
      password: 'Secret_1',
      roles: ['district-admin'],
      place: 'place_uuid_here',
      contact: {
        c_prop: 'c_val_a'
      },
      name: 'Alice Example',
      phone: '+123456789',
    };

    const qs = {
      facility_id: todd.place,
      role: JSON.stringify(todd.roles),
    };

    return assertDbEmpty()
      .then(() => /* when */ createUsers.execute())
      .then(() => {
        assert.deepEqual(api.requestLog(), [
          { method: 'GET', url: '/api/v1/users-info?' + querystring.stringify(qs), body: {} },
          { method: 'POST', url: '/api/v1/users', body: todd },
        ]);
      });
  });

  it('should require user input before creating user with too many docs', () => {
    mockTestDir(`data/create-users/existing-place`);
    api.giveResponses({ body: { total_docs: 12000, warn: true, limit: 10000 } }, { body: {} });
    const todd = {
      username: 'todd',
      password: 'Secret_1',
      roles: ['district-admin'],
      place: 'place_uuid_here',
      contact: {
        c_prop: 'c_val_a'
      },
      name: 'Alice Example',
      phone: '+123456789',
    };

    sinon.stub(readLine, 'keyInYN').returns(true);
    const qs = {
      facility_id: todd.place,
      role: JSON.stringify(todd.roles),
    };

    return assertDbEmpty()
      .then(() => /* when */ createUsers.execute())
      .then(() => {
        assert.equal(readLine.keyInYN.callCount, 1);
        assert.deepEqual(api.requestLog(), [
          { method: 'GET', url: '/api/v1/users-info?' + querystring.stringify(qs), body: {} },
          { method: 'POST', url: '/api/v1/users', body: todd },
        ]);
      });
  });

  it('should not create user if no input when too many docs', () => {
    mockTestDir(`data/create-users/existing-place`);
    sinon.stub(process, 'exit');
    api.giveResponses({ body: { total_docs: 12000, warn: true, limit: 10000 } } );
    const todd = {
      username: 'todd',
      password: 'Secret_1',
      roles: ['district-admin'],
      place: 'place_uuid_here',
      contact: {
        c_prop: 'c_val_a'
      },
      name: 'Alice Example',
      phone: '+123456789',
    };

    sinon.stub(readLine, 'keyInYN').returns(false);
    const qs = {
      facility_id: todd.place,
      role: JSON.stringify(todd.roles),
    };
    return assertDbEmpty()
      .then(() => /* when */ createUsers.execute())
      .then(() => {
        assert.equal(readLine.keyInYN.callCount, 1);
        assert.equal(process.exit.callCount, 1);
        assert.deepEqual(api.requestLog(), [
          { method: 'GET', url: '/api/v1/users-info?' + querystring.stringify(qs), body: {} },
        ]);
      });
  });

  it('force should create users without interaction', () => {
    sinon.stub(environment, 'force').get(() => true);
    sinon.stub(process, 'exit');
    mockTestDir(`data/create-users/existing-place`);
    api.giveResponses({ body: { total_docs: 12000, warn: true, limit: 10000 } },{ body: {} });
    const todd = {
      username: 'todd',
      password: 'Secret_1',
      roles: ['district-admin'],
      place: 'place_uuid_here',
      contact: {
        c_prop: 'c_val_a'
      },
      name: 'Alice Example',
      phone: '+123456789',
    };

    const qs = {
      facility_id: todd.place,
      role: JSON.stringify(todd.roles),
    };

    return assertDbEmpty()
      .then(() => /* when */ createUsers.execute())
      .then(() => {
        assert.equal(process.exit.callCount, 0);
        assert.deepEqual(api.requestLog(), [
          { method: 'GET', url: '/api/v1/users-info?' + querystring.stringify(qs), body: {} },
          { method: 'POST', url: '/api/v1/users', body: todd },
        ]);
      });
  });

  it('should throw some users-info errors', () => {
    mockTestDir(`data/create-users/existing-place`);
    const todd = {
      roles: ['district-admin'],
      place: 'place_uuid_here',
      contact: {
        c_prop: 'c_val_a'
      },
    };

    api.giveResponses({ status: 500, body: { code: 500, error: 'boom' } } );
    const qs = {
      facility_id: todd.place,
      role: JSON.stringify(todd.roles),
    };
    return assertDbEmpty()
      .then(() => /* when */ createUsers.execute())
      .then(r => assert.equal(r, 'Expected to reject'))
      .catch(err => {
        assert.deepEqual(err.error, { code: 500, error: 'boom' });
        assert.deepEqual(api.requestLog(), [
          { method: 'GET', url: '/api/v1/users-info?' + querystring.stringify(qs), body: {} },
        ]);
      });
  });

  it('should request user-info in sequence before creating users', () => {
    mockTestDir(`data/create-users/multiple-existing-place`);
    const pwd = 'Secret_1';
    api.giveResponses(
      { status: 400, body: { code: 400, error: 'not an offline role' } },
      { body: { total_docs: 12000, warn: true, limit: 10000 } },
      { body: { total_docs: 10200, warn: true, limit: 10000 } },
      { body: { total_docs: 1000, warn: false, limit: 10000 } },
      { body: {} },
      { body: {} },
      { body: {} },
      { body: {} },
    );

    sinon.stub(readLine, 'keyInYN').returns(true);
    const todd = { username: 'todd', password: pwd, roles: ['district-admin'],  place: 'place_uuid_1', contact: 'contact_uuid_1' };
    const jack = { username: 'jack', password: pwd, roles: ['district-admin', 'supervisor'],  place: 'place_uuid_2', contact: 'contact_uuid_2' };
    const jill = { username: 'jill', password: pwd, roles: ['role1', 'role2', 'role3'],  place: 'place_uuid_3', contact: 'contact_uuid_3' };
    const john = { username: 'john', password: pwd, roles: ['role2', 'role3'],  place: 'place_uuid_4', contact: 'contact_uuid_4' };
    const qs = (user) => querystring.stringify({ facility_id: user.place, role: JSON.stringify(user.roles), contact: user.contact });
    return assertDbEmpty()
      .then(() => createUsers.execute())
      .then(() => {
        assert.equal(readLine.keyInYN.callCount, 1);
        assert.deepEqual(api.requestLog(), [
          { method: 'GET', url: '/api/v1/users-info?' + qs(todd), body: {} },
          { method: 'GET', url: '/api/v1/users-info?' + qs(jack), body: {} },
          { method: 'GET', url: '/api/v1/users-info?' + qs(jill), body: {} },
          { method: 'GET', url: '/api/v1/users-info?' + qs(john), body: {} },
          { method: 'POST', url: '/api/v1/users', body: todd },
          { method: 'POST', url: '/api/v1/users', body: jack },
          { method: 'POST', url: '/api/v1/users', body: jill },
          { method: 'POST', url: '/api/v1/users', body: john },
        ]);
      });
  });

  it('should interrupt execution when user fails to confirm user', () => {
    mockTestDir(`data/create-users/multiple-existing-place`);
    sinon.stub(process, 'exit');
    const pwd = 'Secret_1';
    api.giveResponses(
      { status: 400, body: { code: 400, error: 'not an offline role' } },
      { body: { total_docs: 12000, warn: true, limit: 10000 } },
      { body: { total_docs: 10200, warn: true, limit: 10000 } },
      { body: { total_docs: 1000, warn: false, limit: 10000 } },
    );

    sinon.stub(readLine, 'keyInYN').onCall(1).returns(false);
    const todd = { username: 'todd', password: pwd, roles: ['district-admin'],  place: 'place_uuid_1', contact: 'contact_uuid_1' };
    const jack = { username: 'jack', password: pwd, roles: ['district-admin', 'supervisor'],  place: 'place_uuid_2', contact: 'contact_uuid_2' };
    const jill = { username: 'jill', password: pwd, roles: ['role1', 'role2', 'role3'],  place: 'place_uuid_3', contact: 'contact_uuid_3' };
    const john = { username: 'john', password: pwd, roles: ['role2', 'role3'],  place: 'place_uuid_4', contact: 'contact_uuid_4' };
    const qs = (user) => querystring.stringify({ facility_id: user.place, role: JSON.stringify(user.roles), contact: user.contact });
    return assertDbEmpty()
      .then(() => createUsers.execute())
      .then(() => {
        assert.equal(readLine.keyInYN.callCount, 1);
        assert.equal(process.exit.callCount, 1);
        assert.deepEqual(api.requestLog(), [
          { method: 'GET', url: '/api/v1/users-info?' + qs(todd), body: {} },
          { method: 'GET', url: '/api/v1/users-info?' + qs(jack), body: {} },
          { method: 'GET', url: '/api/v1/users-info?' + qs(jill), body: {} },
          { method: 'GET', url: '/api/v1/users-info?' + qs(john), body: {} },
        ]);
      });
  });

  it('should create one user for each row in a CSV file', function() {
    // given
    mockTestDir(`data/create-users/new-place`);
    api.giveResponses({ body: {} }, { body: {} });

    // and
    const alice = {
      username: 'alice',
      password: 'Secret_1',
      roles: ['district-admin'],
      contact: {
        c_prop: 'c_val_a'
      },
      place: {
        c_prop: 'p_val_a',
        name: 'alice area',
        parent: 'abc-123',
        type: 'health_center'
      },
      name: 'Alice Example',
      phone: '+123456789',
    };
    const bob = {
      username: 'bob',
      password: 'Secret_2',
      roles: ['district-admin'],
      contact: {
        c_prop: 'c_val_b'
      },
      place: {
        c_prop: 'p_val_b',
        name: 'bob area',
        parent: 'def-456',
        type: 'health_center'
      },
      name: 'Bob Demo',
      phone: '+987654321',
    };

    return assertDbEmpty()
      .then(() => /* when */ createUsers.execute())

      .then(() =>
        assert.deepEqual(api.requestLog(), [
          { method: 'POST', url: '/api/v1/users', body: alice },
          { method: 'POST', url: '/api/v1/users', body: bob }
        ])
      );
  });
});

function assertDbEmpty() {
  return api.db.allDocs().then(res => assert.equal(res.rows.length, 0));
}
