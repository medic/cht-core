const _ = require('lodash');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const uuid = require('uuid').v4;
const constants = require('@constants');
const { expect } = require('chai');

const assertChangeIds = (changes, ...expectedIds) => {
  expect(getIds(changes.results)).to.have.members(expectedIds);
};

const getIds = docsOrChanges => docsOrChanges.map(elem => elem._id || elem.id);

const requestChanges = (username, params = {}) => {
  const options = {
    path: '/_changes',
    qs: params,
    auth: { username, password }
  };
  return utils.requestOnTestDb(options);
};

const password = 'passwordSUP3RS3CR37!';

const users = [
  {
    username: 'bob',
    password: password,
    place: {
      _id: 'fixture:bobville',
      type: 'health_center',
      name: 'Bobville',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:bobville',
    },
    contact: {
      _id: 'fixture:user:bob',
      name: 'Bob',
      patient_id: 'shortcode:user:bob',
    },
    roles: ['district-manager', 'kujua_user', 'data_entry', 'district_admin']
  },
  {
    username: 'clare',
    password: password,
    place: {
      _id: 'fixture:clareville',
      type: 'health_center',
      name: 'Clareville',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:clareville',
    },
    contact: {
      _id: 'fixture:user:clare',
      name: 'Clare',
      patient_id: 'shortcode:clare',
    },
    roles: ['district_admin']
  },
  {
    username: 'chw-boss',
    password: password,
    place: {
      _id: 'fixture:chw-bossville',
      type: 'health_center',
      name: 'CHW Bossville',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:chw-bossville',
    },
    contact: {
      _id: 'fixture:user:chw-boss',
      name: 'CHW Boss',
      patient_id: 'shortcode:user:chw-boss',
    },
    roles: ['district_admin']
  },
  {
    username: 'chw',
    password: password,
    place: {
      _id: 'fixture:chwville',
      type: 'clinic',
      name: 'Chwville',
      parent: 'fixture:chw-bossville',
      place_id: 'shortcode:chwville',
    },
    contact: {
      _id: 'fixture:user:chw',
      name: 'CHW',
      patient_id: 'shortcode:user:chw',
    },
    roles: ['district_admin', 'analytics']
  },
  {
    username: 'supervisor',
    password: password,
    place: 'PARENT_PLACE',
    contact: {
      _id: 'fixture:user:supervisor',
      name: 'Supervisor',
      patient_id: 'shortcode:user:supervisor',
    },
    roles: ['district_admin']
  },
  {
    username: 'steve',
    password: password,
    place: {
      _id: 'fixture:steveville',
      type: 'health_center',
      name: 'Steveville',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:steveville',
    },
    contact: {
      _id: 'fixture:user:steve',
      name: 'Steve',
      patient_id: 'shortcode:user:steve',
    },
    roles: ['district-manager', 'kujua_user', 'data_entry', 'district_admin']
  },
  {
    username: 'manager',
    password: password,
    place: {
      _id: 'fixture:managerville',
      type: 'health_center',
      name: 'Managerville',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:managerville',
    },
    contact: {
      _id: 'fixture:user:manager',
      name: 'Manager',
      patient_id: 'shortcode:user:manager',
    },
    roles: ['national_admin']
  },
];

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hostpital'
};

const bobUserId = 'org.couchdb.user:bob';

const createSomeContacts = (nbr, parent) => {
  const docs = [];
  parent = typeof parent === 'string' ? { _id: parent } : parent;
  for (let i = 0; i < nbr; i++) {
    docs.push({
      _id: `random_contact_${parent._id}_${uuid()}`,
      type: `clinic`,
      parent: parent
    });
  }

  return docs;
};

let currentSeq;
const getCurrentSeq = () => getLastSeq().then(lastSeq => currentSeq = lastSeq);
const getLastSeq = () => {
  return sentinelUtils.waitForSentinel()
    .then(() => utils.requestOnTestDb('/_changes?descending=true&limit=1'))
    .then(result => result.last_seq);
};

describe('changes handler', () => {

  const DOCS_TO_KEEP = [
    'PARENT_PLACE',
    /^messages-/,
    /^fixture/,
    /^org.couchdb.user/,
  ];

  before(() => {
    // Bootstrap users
    return utils
      .saveDoc(parentPlace)
      .then(() => utils.createUsers(users, true));
  });

  after( async () => {
    // Clean up like normal
    await utils.revertDb([], true);// And also revert users we created in before
    await utils.deleteUsers(users, true);
  });

  beforeEach(() => getCurrentSeq());
  afterEach(() => utils.revertDb(DOCS_TO_KEEP, true));

  describe('requests', () => {
    it('should allow DB admins to POST to _changes', () => {
      return utils
        .requestOnTestDb({
          path: '/_changes?since=0&filter=_doc_ids&heartbeat=10000',
          method: 'POST',
          body: { doc_ids: [bobUserId] },
        })
        .then(result => {
          expect(result.results).to.be.ok;
        });
    });

    it('should copy proxied response headers', () => {
      return utils
        .requestOnTestDb({
          path: '/_changes?limit=1',
          resolveWithFullResponse: true,
        })
        .then(response => {
          expect(response.headers).to.be.ok;
          expect(response.headers['content-type']).to.equal('application/json');
          expect(response.headers.server).to.be.ok;
        });
    });
  });

  describe('Filtered replication', () => {
    const changesIDs = [
      'service-worker-meta',
      '_design/medic-client',
      'settings'
    ];

    beforeEach(async () => {
      await getCurrentSeq();
    });

    it('should only return service-worker, design doc and settings updates', async () => {
      const changes = await requestChanges('bob');
      assertChangeIds(changes, ...changesIDs, bobUserId);
    });

    it('should not return other changed documents', async () => {
      const allowedDocs = createSomeContacts(12, 'fixture:bobville');
      const deniedDocs = createSomeContacts(10, 'irrelevant-place');

      await utils.saveDocs(allowedDocs);
      await utils.saveDocs(deniedDocs);

      const changes = await requestChanges('bob');
      assertChangeIds(changes, ...changesIDs, bobUserId);
    });

    it('should only return static docs when specific docs are requested', async () => {
      const allowedDocs = createSomeContacts(12, 'fixture:bobville');
      const deniedDocs = createSomeContacts(10, 'irrelevant-place');

      await utils.saveDocs(allowedDocs);
      await utils.saveDocs(deniedDocs);

      const changes = await requestChanges('bob', { filter: '_doc_ids', doc_ids: getIds(allowedDocs) });
      assertChangeIds(changes, ...changesIDs, bobUserId);
    });

    it('should only return static docs when since param is used', async () => {
      const allowedDocs = createSomeContacts(12, 'fixture:bobville');
      const deniedDocs = createSomeContacts(10, 'irrelevant-place');

      await utils.saveDocs(allowedDocs);
      await utils.saveDocs(deniedDocs);

      const changes = await requestChanges('bob', { since: currentSeq });
      assertChangeIds(changes, ...changesIDs, bobUserId);
    });


    it('should forward changes requests when db name is not medic', () => {
      return utils
        .requestOnMedicDb({ path: '/_changes', auth: { username: 'bob', password } })
        .then(results => {
          return assertChangeIds(results, ...changesIDs, bobUserId);
        });
    });

    it('filters calls with irregular urls which match couchdb endpoint', () => {
      const options = {
        auth: { username: 'bob', password },
        method: 'GET'
      };

      return Promise
        .all([
          utils.requestOnTestDb(_.defaults({ path: '/_changes' }, options)),
          utils.requestOnTestDb(_.defaults({ path: '//_changes//' }, options)),
          utils.request(_.defaults({ path: `//${constants.DB_NAME}//_changes` }, options)),
          utils
            .requestOnTestDb(_.defaults({ path: '/_changes/dsad' }, options))
            .catch(err => err),
          utils
            .requestOnTestDb(_.defaults({ path: '//_changes//dsada' }, options))
            .catch(err => err),
          utils
            .request(_.defaults({ path: `//${constants.DB_NAME}//_changes//dsadada` }, options))
            .catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '/_changes' }, options)),
          utils.requestOnMedicDb(_.defaults({ path: '//_changes//' }, options)),
          utils.request(_.defaults({ path: `//medic//_changes` }, options)),
          utils
            .requestOnMedicDb(_.defaults({ path: '/_changes/dsad' }, options))
            .catch(err => err),
          utils
            .requestOnMedicDb(_.defaults({ path: '//_changes//dsada' }, options))
            .catch(err => err),
          utils
            .request(_.defaults({ path: `//medic//_changes//dsadada` }, options))
            .catch(err => err),
        ])
        .then(results => {
          results.forEach(result => {
            if (result.results) {
              return assertChangeIds(result, ...changesIDs, bobUserId);
            }
            expect(result.responseBody.error).to.equal('forbidden');
          });
        });
    });
  });
});
