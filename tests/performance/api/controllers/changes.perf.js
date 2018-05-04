const fs = require('fs');
const PouchDB = require('pouchdb-core');
const testUtils = require('../../../utils');

const { COUCH_HOST, COUCH_PORT, DB_NAME } = require('../../../constants');

describe('/_changes', function() {

  it('should not break for restricted users when multiple relevant changes arrive', function() {
    let changes;

    return createRestrictedUser('mr_test', 't0ps3cret!')
      .then(() => {
        // given a restricted user is listening API's /_changes feed
        const restrictedUserDb = new PouchDB(`http://mr_test:t0ps3cret!@${COUCH_HOST}:${COUCH_PORT}/${DB_NAME}`);
        changes = restrictedUserDb.changes({
          live: true,
          timeout: false,
          heartbeat: 5000,
          filter: 'doc_ids',
          include_docs: true,
          return_docs: false,
        })
        .on('error', err => expect(err).toBe(null));

        // when multiple forms are uploaded
        return uploadFormsInParallel();
      })
      .then(() => changes.cancel());

  });

});

function createRestrictedUser(username, password) {
  const type = 'district-manager';

  let place, contact;

  return Promise.resolve()
    .then(() => testUtils.request({
      path: '/api/v1/places',
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: { name:'National Office', type:'national_office' },
    }))
    .then(res => place = res.id)

    .then(() => testUtils.request({
      path: '/api/v1/people',
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: { name:'Contact', place },
    }))
    .then(res => contact = res.id)

    .then(() => testUtils.request({
      path: '/api/v1/users',
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: { username, password, type, contact, place },
    }));
}

function uploadFormsInParallel() {
  return Promise.all([
    uploadForm('child'),
    uploadForm('collect_off'),
    uploadForm('collect_on'),
    uploadForm('contact:clinic:create'),
    uploadForm('contact:clinic:edit'),
    uploadForm('contact:district_hospital:create'),
    uploadForm('contact:district_hospital:edit'),
    uploadForm('contact:health_center:create'),
    uploadForm('contact:health_center:edit'),
    uploadForm('contact:person:create'),
    uploadForm('contact:person:edit'),
    uploadForm('d'),
    uploadForm('delivery'),
    uploadForm('f'),
    uploadForm('imm'),
    uploadForm('immunization_visit'),
    uploadForm('m'),
    uploadForm('n'),
    uploadForm('off'),
    uploadForm('on'),
    uploadForm('p'),
    uploadForm('postnatal_visit'),
    uploadForm('pregnancy'),
    uploadForm('pregnancy_visit'),
    uploadForm('v'),
  ]);
}

function uploadForm(name) {
  return new Promise((resolve, reject) => {
    fs.readFile(`./tests/performance/api/controllers/changes-data/${name}.form.json`, { encoding:'utf8' }, (err, data) => {
      if(err) {
        return reject(err);
      }
      return resolve(data);
    });
  })
    .then(JSON.parse)
    .then(testUtils.db.put);
}
