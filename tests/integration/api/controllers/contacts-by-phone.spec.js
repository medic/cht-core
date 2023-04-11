const chai = require('chai');
const utils = require('../../../utils');
const _ = require('lodash');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);

const password = 'passwordSUP3RS3CR37!';

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hospital',
};

const users = [
  {
    username: 'offline',
    password: password,
    place: {
      _id: 'fixture:offline',
      type: 'health_center',
      name: 'Offline place',
      parent: 'PARENT_PLACE',
    },
    contact: {
      _id: 'fixture:user:offline',
      name: 'OfflineUser',
    },
    roles: ['district_admin'],
  },
  {
    username: 'online',
    password: password,
    place: {
      _id: 'fixture:online',
      type: 'health_center',
      name: 'Online place',
      parent: 'PARENT_PLACE',
    },
    contact: {
      _id: 'fixture:user:online',
      name: 'OnlineUser',
    },
    roles: ['national_admin'],
  },
];

let offlineRequestOptions;
let onlineRequestOptions;
let noAuthRequestOptions;

const contacts = [
  parentPlace,
  {
    _id: 'hc1',
    type: 'health_center',
    name: 'hc1',
    parent: { _id: 'PARENT_PLACE' },
    contact: { _id: 'supervisor1', parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } } },
  },
  {
    _id: 'supervisor1',
    type: 'person',
    name: 'supervisor1',
    parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } },
    phone: '+40722111111',
  },
  {
    _id: 'clinic1',
    type: 'clinic',
    name: 'clinic1',
    parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } },
    contact: { _id: 'chw1', parent: { _id: 'clinic1', parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } } } },
  },
  {
    _id: 'chw1',
    type: 'person',
    name: 'chw1',
    parent: { _id: 'clinic1', parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } } },
    phone: '+40722222222',
  },
  {
    _id: 'patient1',
    type: 'person',
    name: 'patient1',
    parent: { _id: 'clinic1', parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } } },
    phone: '+40722333333',
  },
  {
    _id: 'patient2',
    type: 'person',
    name: 'patient2',
    parent: { _id: 'clinic1', parent: { _id: 'hc1', parent: { _id: 'PARENT_PLACE' } } },
    phone: '+40722444444',
  },
  {
    _id: 'DISTRICT_2',
    type: 'district_hospital',
    name: 'District2',
    contact: { _id: 'supervisor2', parent: { _id: 'DISTRICT_2' } },
  },
  {
    _id: 'supervisor2',
    type: 'person',
    name: 'supervisor2',
    parent: { _id: 'DISTRICT_2' },
    phone: '+40722444444',
  },
  {
    _id: 'hc2',
    type: 'health_center',
    name: 'hc1',
    parent: { _id: 'DISTRICT_2' },
    contact: { _id: 'chw2', parent: { _id: 'hc2', parent: { _id: 'DISTRICT_2' } } },
  },
  {
    _id: 'chw2',
    type: 'person',
    name: 'chw2',
    parent: { _id: 'hc2', parent: { _id: 'DISTRICT_2' } },
    phone: '+40722555555',
  },
  {
    _id: 'clinic2',
    type: 'clinic',
    name: 'clinic2',
    parent: { _id: 'hc2', parent: { _id: 'DISTRICT_2' } },
    contact: { _id: 'patient3', parent: { _id: 'clinic2', parent: { _id: 'hc2', parent: { _id: 'DISTRICT_2' } } } },
  },
  {
    _id: 'patient3',
    type: 'person',
    name: 'patient3',
    parent: { _id: 'clinic2', parent: { _id: 'hc2', parent: { _id: 'DISTRICT_2' } } },
    phone: '+40722777777',
  },
  {
    _id: 'patient4',
    type: 'person',
    name: 'patient4',
    parent: { _id: 'clinic2', parent: { _id: 'hc2', parent: { _id: 'DISTRICT_2' } } },
    phone: '+40722777777',
  },
];


const findContact = id => contacts.find(d => d._id === id);

const hydrate = doc => {
  const hydrated = _.cloneDeep(doc);
  if (hydrated.parent) {
    hydrated.parent = hydrate(_.cloneDeep(findContact(doc.parent._id)));
  }
  if (hydrated.contact) {
    hydrated.contact = _.cloneDeep(findContact(doc.contact._id));
  }
  return hydrated;
};

describe('Contacts by phone API', () => {
  before(async () => {
    await utils.saveDocs(contacts);
    await utils.createUsers(users);
  });

  after(async () => {
    await utils.deleteUsers(users);
    await utils.revertDb([], true);
  });

  beforeEach(() => {
    offlineRequestOptions = { path: '/api/v1/contacts-by-phone', auth: { username: 'offline', password }, };
    onlineRequestOptions = { path: '/api/v1/contacts-by-phone', auth: { username: 'online', password }, };
    noAuthRequestOptions = {
      path: '/api/v1/contacts-by-phone',
      headers: { 'Accept': 'application/json' },
      noAuth: true
    };
  });

  describe('it should block unauthenticated requests', () => {
    it('using GET', () => {
      noAuthRequestOptions.qs = { phone: '+40722777777' };
      return utils
        .request(noAuthRequestOptions)
        .then(() => chai.assert.fail('Should not allow unauthenticated requests'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(401);
          chai.expect(err.error).to.deep.include({ code: 401, error: 'unauthorized' });
        });
    });

    it('using POST', () => {
      noAuthRequestOptions.body = { phone: '+40722111111' };
      noAuthRequestOptions.method = 'POST';
      return utils
        .request(noAuthRequestOptions)
        .then(() => chai.assert.fail('Should not allow unauthenticated requests'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(401);
          chai.expect(err.error).to.deep.include({ code: 401, error: 'unauthorized' });
        });
    });
  });

  describe('it should block offline users', () => {
    it('using GET', () => {
      offlineRequestOptions.qs = { phone: '+40722222222' };
      return utils
        .request(offlineRequestOptions)
        .then(() => chai.assert.fail('Should not allow offline users'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(403);
          chai.expect(err.error).to.deep.include({ code: 403, error: 'forbidden' });
        });
    });

    it('using POST', () => {
      offlineRequestOptions.body = { phone: '+40722333333' };
      offlineRequestOptions.method = 'POST';
      return utils
        .request(offlineRequestOptions)
        .then(() => chai.assert.fail('Should not allow offline users'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(403);
          chai.expect(err.error).to.deep.include({ code: 403, error: 'forbidden' });
        });
    });
  });

  describe('GET', () => {
    it('should fail when no param', () => {
      return utils
        .request(onlineRequestOptions)
        .then(() => chai.assert.fail('Should fail when no params'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(400);
          chai.expect(err.error).to.deep.equal({
            error: 'bad_request',
            reason: '`phone` parameter is required and must be a valid phone number'
          });
        });
    });

    it('should fail with incorrect param', () => {
      onlineRequestOptions.qs = { phone: 'random string' };
      return utils
        .request(onlineRequestOptions)
        .then(() => chai.assert.fail('Should fail when no params'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(400);
          chai.expect(err.error).to.deep.equal({
            error: 'bad_request',
            reason: '`phone` parameter is required and must be a valid phone number'
          });
        });
    });

    it('should output correct response with one result', () => {
      onlineRequestOptions.qs = { phone: '+40722111111' };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal(
          {
            ok: true,
            docs: [hydrate(contacts.find(doc => doc.phone === '+40722111111'))],
          }
        );
      });
    });

    it('should output correct response with multiple results', () => {
      onlineRequestOptions.qs = { phone: '+40722444444' };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal({
          ok: true,
          docs: contacts.filter(doc => doc.phone === '+40722444444' ).map(hydrate),
        });
      });
    });

    it('should support missing docs', () => {
      onlineRequestOptions.qs = { phone: '+40755363636' };
      return utils
        .request(onlineRequestOptions)
        .then(() => chai.assert.fail('Should 404 when not found'))
        .catch(result => {
          chai.expect(result.error).to.deep.equal({ error: 'not_found', reason: 'no matches found' });
        });
    });

    it('should normalize phone number', () => {
      onlineRequestOptions.qs = { phone: '+40 (722) 444-444' };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal({
          ok: true,
          docs: contacts.filter(doc => doc.phone === '+40722444444' ).map(hydrate),
        });
      });
    });
  });

  describe('POST', () => {
    beforeEach(() => {
      onlineRequestOptions.method = 'POST';
    });

    it('should fail when no param', () => {
      return utils
        .request(onlineRequestOptions)
        .then(() => chai.assert.fail('Should fail when no params'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(400);
          chai.expect(err.error).to.deep.equal({
            error: 'bad_request',
            reason: '`phone` parameter is required and must be a valid phone number'
          });
        });
    });

    it('should fail with incorrect param', () => {
      onlineRequestOptions.body = { phone: 'random string' };
      return utils
        .request(onlineRequestOptions)
        .then(() => chai.assert.fail('Should fail with incorrect params'))
        .catch(err => {
          chai.expect(err.statusCode).to.equal(400);
          chai.expect(err.error).to.deep.equal({
            error: 'bad_request',
            reason: '`phone` parameter is required and must be a valid phone number'
          });
        });
    });

    it('should output correct response with one result', () => {
      onlineRequestOptions.body = { phone: '+40722555555' };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal({
          ok: true,
          docs: [hydrate(contacts.find(doc => doc.phone === '+40722555555' ))]
        });
      });
    });

    it('should output correct responce with multiple matches', () => {
      onlineRequestOptions.body = { phone: '+40722777777' };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal({
          ok: true,
          docs: contacts.filter(doc => doc.phone === '+40722777777' ).map(hydrate),
        });
      });
    });

    it('should primarily use the query param', () => {
      onlineRequestOptions.body = { phone: '+40722111111' };
      onlineRequestOptions.qs = { phone: '+40722222222' };

      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal({
          ok: true,
          docs: contacts.filter(doc => doc.phone === '+40722222222' ).map(hydrate),
        });
      });
    });

    it('should support missing docs', () => {
      onlineRequestOptions.body = { phone: '+40755363636' };
      return utils
        .request(onlineRequestOptions)
        .then(() => chai.assert.fail('Should 404 when not found'))
        .catch(result => {
          chai.expect(result.error).to.deep.equal({ error: 'not_found', reason: 'no matches found' });
        });
    });

    it('should normalize phone number', () => {
      onlineRequestOptions.body = { phone: '+40 (722) 222 222' };
      return utils.request(onlineRequestOptions).then(result => {
        chai.expect(result).excludingEvery('_rev').to.deep.equal({
          ok: true,
          docs: contacts.filter(doc => doc.phone === '+40722222222' ).map(hydrate),
        });
      });
    });
  });

});
