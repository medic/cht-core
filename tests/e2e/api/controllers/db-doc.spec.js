const _ = require('underscore');
const chai = require('chai');
const utils = require('../../../utils');
const sUtils = require('../../sentinel/utils');
const constants = require('../../../constants');

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

let offlineRequestOptions, onlineRequestOptions;

const DOCS_TO_KEEP = [
  'PARENT_PLACE',
  /^messages-/,
  /^fixture/,
  /^org.couchdb.user/,
];

const clinics = [
  {
    _id: 'fixture:offline:clinic',
    name: 'offline clinic',
    type: 'clinic',
    parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
    reported_date: 1
  },
  {
    _id: 'fixture:online:clinic',
    name: 'online clinic',
    type: 'clinic',
    parent: { _id: 'fixture:online', parent: { _id: 'PARENT_PLACE' } },
    reported_date: 1
  },
];

const patients = [
  {
    _id: 'fixture:offline:patient',
    name: 'offline patient',
    patient_id: '123456',
    type: 'person',
    parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
    reported_date: 1
  },
  {
    _id: 'fixture:offline:clinic:patient',
    name: 'offline patient',
    patient_id: 'c123456',
    type: 'person',
    parent: { _id: 'fixture:offline:clinic', parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } } },
    reported_date: 1
  },
  {
    _id: 'fixture:online:patient',
    name: 'online patient',
    patient_id: '654321',
    type: 'person',
    parent: { _id: 'fixture:online', parent: { _id: 'PARENT_PLACE' } },
    reported_date: 1
  },
  {
    _id: 'fixture:online:clinic:patient',
    name: 'online patient',
    patient_id: 'c654321',
    type: 'person',
    parent: { _id: 'fixture:online:clinic', parent: { _id: 'fixture:online', parent: { _id: 'PARENT_PLACE' } } },
    reported_date: 1
  },
];

describe('db-doc handler', () => {
  beforeAll(done => {
    utils
      .saveDoc(parentPlace)
      .then(() => utils.createUsers(users))
      .then(() => utils.saveDocs([...clinics, ...patients]))
      .then(done);
  });

  afterAll(done =>
    utils
      .revertDb()
      .then(() => utils.deleteUsers(users))
      .then(done));

  afterEach(done => utils.revertDb(DOCS_TO_KEEP, true).then(done));

  beforeEach(() => {
    offlineRequestOptions = { auth: { username: 'offline', password }, };
    onlineRequestOptions = { auth: { username: 'online', password }, };
  });

  describe('does not restrict online users', () => {
    it('GET', () => {
      _.extend(onlineRequestOptions, {
        method: 'GET',
        path: '/fixture:user:offline',
      });

      return utils.requestOnTestDb(onlineRequestOptions).then(result => {
        chai.expect(result).to.deep.include({
          _id: 'fixture:user:offline',
          name: 'OfflineUser',
          type: 'person',
          parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
        });
      });
    });

    it('POST', () => {
      _.extend(onlineRequestOptions, {
        path: '/',
        method: 'POST',
        body: {
          _id: 'db_doc_post',
          type: 'district_hospital',
          name: 'NEW PLACE',
        },
      });

      return utils
        .requestOnTestDb(onlineRequestOptions)
        .then(result => {
          chai.expect(result).to.include({
            id: 'db_doc_post',
            ok: true,
          });
          return utils.getDoc('db_doc_post');
        })
        .then(result => {
          chai.expect(result).to.include({
            _id: 'db_doc_post',
            type: 'district_hospital',
            name: 'NEW PLACE',
          });
        });
    });

    it('PUT', () => {
      return utils
        .saveDoc({ _id: 'db_doc_put', type: 'clinic', name: 'my clinic' })
        .then(result => {
          _.extend(onlineRequestOptions, {
            method: 'PUT',
            path: '/db_doc_put',
            body: {
              _id: 'db_doc_put',
              type: 'clinic',
              name: 'my updated clinic',
              _rev: result.rev,
            },
          });

          return utils.requestOnTestDb(onlineRequestOptions);
        })
        .then(result => {
          chai.expect(result).to.include({ id: 'db_doc_put', ok: true });
          return utils.getDoc('db_doc_put');
        })
        .then(result => {
          chai.expect(result).to.include({
            _id: 'db_doc_put',
            type: 'clinic',
            name: 'my updated clinic',
          });
        });
    });

    it('DELETE', () => {
      return utils
        .saveDoc({ _id: 'db_doc_delete', type: 'clinic', name: 'my clinic' })
        .then(result => {
          _.extend(onlineRequestOptions, {
            method: 'DELETE',
            path: `/db_doc_delete?rev=${result.rev}`,
          });

          return utils.requestOnTestDb(onlineRequestOptions);
        })
        .then(result => {
          chai.expect(result).to.include({
            id: 'db_doc_delete',
            ok: true,
          });
          return utils.getDoc('db_doc_delete');
        })
        .catch(err => {
          chai.expect(err.responseBody.error).to.equal('not_found');
        });
    });

    it('GET attachment', () => {
      return utils
        .saveDoc({ _id: 'with_attachments' })
        .then(result =>
          utils.requestOnTestDb({
            path: `/with_attachments/att_name?rev=${result.rev}`,
            method: 'PUT',
            body: 'my attachment content',
            headers: { 'Content-Type': 'text/plain' },
            json: false
          })
        )
        .then(() => {
          onlineRequestOptions.path = '/with_attachments/att_name';
          return utils.requestOnTestDb(onlineRequestOptions, false, true);
        })
        .then(result => {
          chai.expect(result).to.equal('my attachment content');
        });
    });

    it('PUT attachment', () => {
      return utils
        .saveDoc({ _id: 'with_attachments' })
        .then(result => {
          _.extend(onlineRequestOptions, {
            path: `/with_attachments/new_attachment?rev=${result.rev}`,
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            body: 'my new attachment content',
          });

          return utils.requestOnTestDb(onlineRequestOptions);
        })
        .then(result => utils.requestOnTestDb(`/with_attachments/new_attachment?rev=${result.rev}`))
        .then(result => {
          chai.expect(result).to.equal('my new attachment content');
        });
    });
  });

  describe('restricts offline users', () => {
    it('GET', () => {
      offlineRequestOptions.method = 'GET';

      return Promise.all([
        utils.requestOnTestDb(_.defaults({ path: '/fixture:user:offline' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '/fixture:user:online' }, offlineRequestOptions)).catch(err => err),
      ]).then(results => {
        chai.expect(results[0]).to.deep.include({
          _id: 'fixture:user:offline',
          name: 'OfflineUser',
          type: 'person',
          parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
        });

        chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
      });
    });

    it('GET delete stubs', () => {
      offlineRequestOptions.method = 'GET';

      const docs = [
        {
          _id: 'a1',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'Allowed Contact 1',
        },
        {
          _id: 'd1',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'Denied Contact 1',
        },
      ];

      return utils
        .saveDocs(docs)
        .then(result => Promise.all(docs.map((doc, key) => utils.requestOnTestDb({ method: 'DELETE', path: `/${doc._id}?rev=${result[key].rev}`,}))))
        .then(results => {
          results.forEach((result, key) => (docs[key]._rev = result.rev));
          return Promise.all(docs.map(doc => utils.requestOnTestDb(_.defaults({ path: `/${doc._id}?rev=${doc._rev}` }, offlineRequestOptions))));
        })
        .then(results => {
          chai.expect(results.length).to.equal(2);
          chai.expect(results[0]).to.deep.equal({
            _id: 'a1',
            _rev: docs[0]._rev,
            _deleted: true,
          });
          chai.expect(results[1]).to.deep.equal({
            _id: 'd1',
            _rev: docs[1]._rev,
            _deleted: true,
          });
        });
    });

    it('GET with open_revs', () => {
      offlineRequestOptions.method = 'GET';

      const docs = [
        {
          _id: 'a1_revs',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'Allowed Contact 1',
        },
        {
          _id: 'd1_revs',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'Denied Contact 1',
        },
        {
          _id: 'd2_revs',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'Denied Contact 2',
        },
      ];

      return utils
        .saveDocs(docs)
        .then(results => {
          results.forEach((result, key) => (docs[key]._rev = result.rev));

          return utils.saveDocs(docs);
        })
        .then(results => {
          results.forEach((result, key) => (docs[key]._rev = result.rev));

          docs[0].parent = { _id: 'fixture:online' };
          docs[1].parent = { _id: 'fixture:offline' };

          return utils.saveDocs(docs);
        })
        .then(results => {
          const deletes = [];
          results.forEach((result, key) => (docs[key]._rev = result.rev));

          deletes.push({
            _id: docs[0]._id,
            _rev: docs[0]._rev,
            _deleted: true,
          });
          deletes.push({
            _id: docs[1]._id,
            _rev: docs[1]._rev,
            _deleted: true,
          });

          return utils.saveDocs(deletes);
        })
        .then(results => {
          results.forEach((result, key) => (docs[key]._rev = result.rev));

          return Promise.all(docs.map(doc => utils.requestOnTestDb(`/${doc._id}?rev=${doc._rev}&revs=true`)));
        })
        .then(results =>
          Promise.all(
            _.flatten(
              results.map(result => {
                const open_revs = result._revisions.ids.map((rev, key) => `${result._revisions.start - key}-${rev}`);
                const path = `/${result._id}?rev=${result._rev}&open_revs=${JSON.stringify(open_revs)}`;
                const pathAll = `/${result._id}?rev=${result._rev}&open_revs=all`;
                return [
                  utils.requestOnTestDb(_.defaults({ path: path }, offlineRequestOptions)),
                  utils.requestOnTestDb(_.defaults({ path: pathAll }, offlineRequestOptions)),
                ];
              })
            )
          )
        )
        .then(results => {
          chai.expect(results[0].length).to.equal(3);
          chai.expect(results[0][0].ok._rev.startsWith('1')).to.equal(true);
          chai.expect(results[0][1].ok._rev.startsWith('2')).to.equal(true);
          chai.expect(results[0][2].ok._rev.startsWith('4')).to.equal(true);
          chai.expect(results[0].every(result => result.ok._id === 'a1_revs' && (result.ok._deleted || result.ok.parent._id === 'fixture:offline'))).to.equal(true);

          chai.expect(results[1].length).to.equal(1);
          chai.expect(results[1][0].ok._deleted).to.equal(true);

          chai.expect(results[2].length).to.equal(2);
          chai.expect(results[2][0].ok._rev.startsWith('3')).to.equal(true);
          chai.expect(results[2][1].ok._rev.startsWith('4')).to.equal(true);
          chai.expect(results[2].every(result => result.ok._id === 'd1_revs' && (result.ok._deleted || result.ok.parent._id === 'fixture:offline'))).to.equal(true);

          chai.expect(results[3].length).to.equal(1);
          chai.expect(results[3][0].ok._deleted).to.equal(true);

          chai.expect(results[4].length).to.equal(0);
          chai.expect(results[5].length).to.equal(0);
        });
    });

    it('GET with various params', () => {
      const revs = {
        allowed_attach: [],
        denied_attach: [],
      };

      return utils
        .saveDocs([
          {
            _id: 'allowed_attach',
            type: 'clinic',
            parent: { _id: 'fixture:offline' },
            name: 'allowed attach',
          },
          {
            _id: 'denied_attach',
            type: 'clinic',
            parent: { _id: 'fixture:online' },
            name: 'denied attach',
          },
        ])
        .then(results => {
          return Promise.all(
            results.map(result => {
              revs[result.id].push(result.rev);
              return utils.requestOnTestDb({
                path: `/${result.id}/att_name?rev=${result.rev}`,
                method: 'PUT',
                body: 'my attachment content',
                headers: { 'Content-Type': 'text/plain' },
              });
            })
          );
        })
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));
          return Promise.all([
            utils.requestOnTestDb(_.extend({ path: `/allowed_attach?rev=${revs.allowed_attach[0]}&attachments=true&revs=true` }, offlineRequestOptions)),
            utils.requestOnTestDb(_.extend({ path: `/allowed_attach?rev=${revs.allowed_attach[1]}&attachments=true&revs=false` }, offlineRequestOptions)),
            utils.requestOnTestDb(_.extend({ path: `/allowed_attach?attachments=false&revs=true&revs_info=true` }, offlineRequestOptions)),
            utils.requestOnTestDb(_.extend({ path: `/denied_attach?rev=${revs.denied_attach[0]}&attachments=true&revs=true` }, offlineRequestOptions)).catch(err => err),
            utils.requestOnTestDb(_.extend({ path: `/denied_attach?rev=${revs.denied_attach[1]}&attachments=true&revs=false` }, offlineRequestOptions)).catch(err => err),
            utils.requestOnTestDb(_.extend({ path: `/denied_attach?attachments=true&revs=true&revs_info=true` }, offlineRequestOptions)).catch(err => err),
          ]);
        })
        .then(results => {
          chai.expect(results[0]._attachments).to.be.undefined;
          chai.expect(results[0]._revisions).to.be.ok;
          chai.expect(`${results[0]._revisions.start}-${results[0]._revisions.ids[0]}`).to.equal(revs.allowed_attach[0]);

          chai.expect(results[1]._attachments).to.be.ok;
          chai.expect(results[1]._attachments.att_name).to.be.ok;
          chai.expect(results[1]._attachments.att_name.data).to.be.ok;
          chai.expect(results[1]._revisions).to.be.undefined;
          chai.expect(results[1]._revs_info).to.be.undefined;

          chai.expect(results[2]._attachments).to.be.ok;
          chai.expect(results[2]._attachments.att_name).to.be.ok;
          chai.expect(results[2]._attachments.att_name.data).to.be.undefined;
          chai.expect(results[2]._attachments.att_name.stub).to.deep.equal(true);
          chai.expect(results[2]._revisions).to.be.ok;
          chai.expect(`${results[2]._revisions.start}-${results[2]._revisions.ids[0]}`).to.deep.equal(revs.allowed_attach[1]);
          chai.expect(results[2]._revs_info).to.be.ok;
          chai.expect(results[2]._revs_info.length).to.deep.equal(results[2]._revisions.ids.length);
          chai.expect(results[2]._revs_info[0]).to.deep.equal({ rev: revs.allowed_attach[1], status: 'available' });

          chai.expect(results[3].statusCode).to.deep.equal(403);
          chai.expect(results[4].statusCode).to.deep.equal(403);
          chai.expect(results[5].statusCode).to.deep.equal(403);
        });
    });

    it('POST', () => {
      _.extend(offlineRequestOptions, {
        method: 'POST',
      });

      const allowedDoc = {
        _id: 'allowed_doc_post',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'allowed',
      };
      const deniedDoc = {
        _id: 'denied_doc_post',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'denied',
      };

      return Promise.all([
        utils.requestOnTestDb(_.defaults({ body: JSON.stringify(allowedDoc), path: '/' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ body: JSON.stringify(deniedDoc), path: '/' }, offlineRequestOptions)).catch(err => err),
        utils.requestOnTestDb(_.defaults({ path: '/' }, offlineRequestOptions)).catch(err => err),
      ])
        .then(([allowed, denied, forbidden]) => {
          chai.expect(allowed).to.include({ id: 'allowed_doc_post', ok: true,});
          chai.expect(denied).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(forbidden).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});

          return Promise.all([
            utils.getDoc('allowed_doc_post'),
            utils.getDoc('denied_doc_post').catch(err => err),
          ]);
        })
        .then(([allowed, denied]) => {
          chai.expect(allowed).to.deep.include(allowedDoc);
          chai.expect(denied.statusCode).to.deep.equal(404);

          const ids = ['allowed_doc_post', 'denied_doc_post'];
          return sUtils.waitForSentinel(ids).then(() => sUtils.getInfoDocs(ids));
        }).then(([allowedInfo, deniedInfo]) => {
          chai.expect(allowedInfo).to.be.ok;
          chai.expect(deniedInfo).to.be.undefined;
        });
    });

    it('PUT', () => {
      _.extend(offlineRequestOptions, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      const docs = [
        {
          _id: 'a_put_1',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'a1',
        },
        {
          _id: 'a_put_2',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'a2',
        },
        {
          _id: 'd_put_1',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'd1',
        },
        {
          _id: 'd_put_2',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'd2',
        },
      ];

      return utils
        .saveDocs(docs)
        .then(results => {
          results.forEach((result, idx) => (docs[idx]._rev = result.rev));

          const updates = [
            {
              _id: 'n_put_1',
              type: 'clinic',
              parent: { _id: 'fixture:offline' },
              name: 'n1',
            }, // new allowed
            {
              _id: 'n_put_2',
              type: 'clinic',
              parent: { _id: 'fixture:online' },
              name: 'n2',
            }, // new denied
            _.defaults({ name: 'a1 updated' }, docs[0]), // stored allowed, new allowed
            _.defaults({ name: 'a2 updated', parent: { _id: 'fixture:online' } }, docs[1]), // stored allowed, new denied
            _.defaults({ name: 'd1 updated' }, docs[2]), // stored denied, new denied
            _.defaults({ name: 'd2 updated', parent: { _id: 'fixture:offline' } }, docs[3]), // stored denied, new allowed
          ];

          const promises = updates.map(doc =>
            utils
              .requestOnTestDb(_.extend({ path: `/${doc._id}`, body: JSON.stringify(doc) }, offlineRequestOptions))
              .catch(err => err));
          return Promise.all(promises);
        })
        .then(results => {
          chai.expect(results[0]).to.include({ ok: true, id: 'n_put_1' });
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.include({ ok: true, id: 'a_put_1',});

          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[4]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[5]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});

          const ids = ['a_put_1', 'a_put_2', 'd_put_1', 'd_put_2', 'n_put_1', 'n_put_2'];

          return sUtils.waitForSentinel(ids).then(() => sUtils.getInfoDocs(ids));
        }).then(([a1, a2, d1, d2, n1, n2]) => {
          chai.expect(a1._rev.substring(0, 2)).to.equal('3-');
          chai.expect(a2._rev.substring(0, 2)).to.equal('2-');
          chai.expect(d1._rev.substring(0, 2)).to.equal('2-');
          chai.expect(d2._rev.substring(0, 2)).to.equal('2-');
          chai.expect(n1._rev.substring(0, 2)).to.equal('2-');
          chai.expect(n2).to.be.undefined;
        });
    });

    it('PUT over DELETE stubs', () => {
      _.extend(offlineRequestOptions, {
        method: 'PUT',
      });

      const docs = [
        {
          _id: 'a_put_del_1',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'a1',
        },
        {
          _id: 'a_put_del_2',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'a2',
        },
        {
          _id: 'd_put_del_1',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'd1',
        },
        {
          _id: 'd_put_del_2',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'd2',
        },
      ];

      return utils
        .saveDocs(docs)
        .then(results =>
          Promise.all(
            docs.map((doc, idx) =>
              utils.requestOnTestDb({
                method: 'DELETE',
                path: `/${doc._id}?rev=${results[idx].rev}`,
              })
            )
          )
        )
        .then(results => {
          results.forEach((result, idx) => (docs[idx]._rev = result.rev));

          const updates = [
            _.defaults({ name: 'a1 updated' }, docs[0]), // prev allowed, deleted, new allowed
            _.defaults({ name: 'a2 updated', parent: { _id: 'fixture:online' } }, docs[1]), // prev allowed, deleted, new denied
            _.defaults({ name: 'd1 updated' }, docs[2]), // prev denied, deleted, new denied
            _.defaults({ name: 'd2 updated', parent: { _id: 'fixture:offline' } }, docs[3]), // prev denied, deleted, new allowed
          ];

          return Promise.all(updates.map(doc =>
            utils
              .requestOnTestDb(_.extend({ path: `/${doc._id}`, body: JSON.stringify(doc) }, offlineRequestOptions))
              .catch(err => err)));
        })
        .then(results => {
          chai.expect(results[0]).to.deep.nested.include({ statusCode: 409, 'responseBody.error': 'conflict'});
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 409, 'responseBody.error': 'conflict'});
        });
    });

    it('DELETE', () => {
      offlineRequestOptions.method = 'DELETE';

      return utils
        .saveDocs([
          {
            _id: 'allowed_del',
            type: 'clinic',
            parent: { _id: 'fixture:offline' },
            name: 'allowed',
          },
          {
            _id: 'denied_del',
            type: 'clinic',
            parent: { _id: 'fixture:online' },
            name: 'denied',
          },
        ])
        .then(results =>
          Promise.all([
            utils.requestOnTestDb(_.extend({ path: `/allowed_del?rev=${results[0].rev}` }, offlineRequestOptions)),
            utils.requestOnTestDb(_.extend({ path: `/denied_del?rev=${results[1].rev}` }, offlineRequestOptions)).catch(err => err),
          ])
        )
        .then(results => {
          chai.expect(results[0]).to.deep.include({ id: 'allowed_del', ok: true });
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});

          return Promise.all([
            utils.getDoc('allowed_del').catch(err => err),
            utils.getDoc('denied_del'),
          ]);
        })
        .then(results => {
          chai.expect(results[0]).to.deep.include({ statusCode: 404, responseBody: { error: 'not_found', reason: 'deleted' } });
          chai.expect(results[1]).to.deep.include({
            _id: 'denied_del',
            type: 'clinic',
            parent: { _id: 'fixture:online' },
            name: 'denied',
          });
        });
    });

    it('GET attachment', () => {
      const revs = {
        allowed_attach: [],
        denied_attach: [],
      };
      offlineRequestOptions.json = false;

      return utils
        .saveDocs([
          {
            _id: 'allowed_attach',
            type: 'clinic',
            parent: { _id: 'fixture:offline' },
            name: 'allowed attach',
          },
          {
            _id: 'denied_attach',
            type: 'clinic',
            parent: { _id: 'fixture:online' },
            name: 'denied attach',
          },
        ])
        .then(results =>
          Promise.all(
            results.map(result => {
              revs[result.id].push(result.rev);
              return utils.requestOnTestDb({
                path: `/${result.id}/att_name?rev=${result.rev}`,
                method: 'PUT',
                body: 'my attachment content',
                headers: { 'Content-Type': 'text/plain' },
              });
            })
          )
        )
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));
          return Promise.all([
            utils.requestOnTestDb(_.extend({ path: '/allowed_attach/att_name' }, offlineRequestOptions), false, true),
            utils.requestOnTestDb(_.extend({ path: '/denied_attach/att_name' }, offlineRequestOptions)).catch(err => err),
            utils.requestOnTestDb(_.extend({ path: `/denied_attach/att_name?rev=${results[1].rev}` }, offlineRequestOptions)).catch(err => err),
          ]);
        })
        .then(results => {
          chai.expect(results[0]).to.equal('my attachment content');
          chai.expect(results[1]).to.deep.include({ statusCode: 404, responseBody: { error: 'bad_request', reason: 'Invalid rev format' }});
          chai.expect(results[2]).to.deep.include({ statusCode: 403, responseBody: { error: 'forbidden', reason: 'Insufficient privileges' }});

          return Promise.all([
            utils.getDoc('allowed_attach'),
            utils.getDoc('denied_attach'),
          ]);
        })
        .then(results => {
          return utils.saveDocs([
            _.extend(results[0], { parent: { _id: 'fixture:online' } }),
            _.extend(results[1], { parent: { _id: 'fixture:offline' } }),
          ]);
        })
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));

          const promises = [];
          const attachmentRequest = (rev, id) =>
            utils
              .requestOnTestDb(_.extend({ path: `/${id}/att_name?rev=${rev}` }, offlineRequestOptions), false, true)
              .catch(err => err);
          Object.keys(revs).forEach(id => promises.push(...revs[id].map(rev => attachmentRequest(rev, id))));
          return Promise.all(promises);
        })
        .then(results => {
          // allowed_attach is allowed, but missing attachment
          chai.expect(results[0].responseBody).to.deep.equal({
            error: 'not_found',
            reason: 'Document is missing attachment',
          });
          // allowed_attach is allowed and has attachment
          chai.expect(results[1]).to.equal('"my attachment content"');
          // allowed_attach is not allowed and has attachment
          chai.expect(results[2]responseBody..error).to.equal('forbidden');

          // denied_attach is not allowed, but missing attachment
          chai.expect(results[3].responseBody.error).to.equal('forbidden');
          // denied_attach is not allowed and has attachment
          chai.expect(results[4].responseBody.error).to.equal('forbidden');
          // denied_attach is allowed and has attachment
          chai.expect(results[5]).to.equal('my attachment content');

          //attachments for deleted docs
          return Promise.all([
            utils.deleteDoc('allowed_attach'),
            utils.deleteDoc('denied_attach'),
          ]);
        })
        .then(results => {
          return Promise.all([
            utils.requestOnTestDb(_.extend({ path: '/allowed_attach/att_name' }, offlineRequestOptions)).catch(err => err),
            utils.requestOnTestDb(_.extend({ path: `/allowed_attach/att_name?rev=${results[0].rev}` }, offlineRequestOptions)).catch(err => err),
            utils.requestOnTestDb(_.extend({ path: '/denied_attach/att_name' }, offlineRequestOptions)).catch(err => err),
            utils.requestOnTestDb(_.extend({ path: `/denied_attach/att_name?rev=${results[1].rev}` }, offlineRequestOptions), false, true),
          ]);
        })
        .then(results => {
          chai.expect(results[0]).to.deep.nested.include({ statusCode: 404, 'responseBody.error': 'bad_request' });
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.deep.nested.include({ statusCode: 404, 'responseBody.error': 'bad_request' });
          chai.expect(results[3]).to.equal('"my attachment content"');
        });
    });

    it('GET attachment with name containing slashes', () => {
      const revs = {
        allowed_attach_1: [],
        denied_attach_1: [],
      };

      return utils
        .saveDocs([
          {
            _id: 'allowed_attach_1',
            type: 'clinic',
            parent: { _id: 'fixture:offline' },
            name: 'allowed attach',
          },
          {
            _id: 'denied_attach_1',
            type: 'clinic',
            parent: { _id: 'fixture:online' },
            name: 'denied attach',
          },
        ])
        .then(results =>
          Promise.all(
            results.map(result => {
              revs[result.id].push(result.rev);
              return utils.requestOnTestDb({
                path: `/${result.id}/att_name/1/2/3/etc?rev=${result.rev}`,
                method: 'PUT',
                body: 'my attachment content',
                headers: { 'Content-Type': 'text/plain' },
              });
            })
          )
        )
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));
          return Promise.all([
            utils.requestOnTestDb(_.extend({ path: '/allowed_attach_1/att_name/1/2/3/etc' }, offlineRequestOptions), false, true),
            utils.requestOnTestDb(_.extend({ path: `/allowed_attach_1/att_name/1/2/3/etc?rev=${results[0].rev}`}, offlineRequestOptions), false, true),
            utils.requestOnTestDb(_.extend({ path: '/denied_attach_1/att_name/1/2/3/etc' }, offlineRequestOptions)).catch(err => err),
            utils.requestOnTestDb(_.extend({ path: `/denied_attach_1/att_name/1/2/3/etc?rev=${results[1].rev}`}, offlineRequestOptions)).catch(err => err),
          ]);
        })
        .then(results => {
          chai.expect(results[0]).to.equal('"my attachment content"');
          chai.expect(results[1]).to.equal('"my attachment content"');

          chai.expect(results[2]).to.deep.nested.include({ statusCode: 404, 'responseBody.error': 'bad_request' });
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});

          return Promise.all([
            utils.getDoc('allowed_attach_1'),
            utils.getDoc('denied_attach_1'),
          ]);
        })
        .then(results => {
          return utils.saveDocs([
            _.extend(results[0], { parent: { _id: 'fixture:online' } }),
            _.extend(results[1], { parent: { _id: 'fixture:offline' } }),
          ]);
        })
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));

          const promises = [];
          const attachmentRequest = (rev, id) =>
            utils
              .requestOnTestDb(_.extend({ path: `/${id}/att_name/1/2/3/etc?rev=${rev}` }, offlineRequestOptions), false, true)
              .catch(err => err);
          Object.keys(revs).forEach(id => promises.push(...revs[id].map(rev => attachmentRequest(rev, id))));
          return Promise.all(promises);
        })
        .then(results => {
          // allowed_attach is allowed, but missing attachment
          chai.expect(results[0].responseBody).to.deep.equal({
            error: 'not_found',
            reason: 'Document is missing attachment',
          });
          // allowed_attach is allowed and has attachment
          chai.expect(results[1]).to.equal('my attachment content');
          // allowed_attach is not allowed and has attachment
          chai.expect(results[2].responseBody.error).to.equal('forbidden');
          // denied_attach is not allowed, but missing attachment
          chai.expect(results[3].responseBody.error).to.equal('forbidden');
          // denied_attach is not allowed and has attachment
          chai.expect(results[4].responseBody.error).to.equal('forbidden');
          // denied_attach is allowed and has attachment
          chai.expect(results[5]).to.equal('my attachment content');
        });
    });

    it('PUT attachment', () => {
      _.extend(offlineRequestOptions, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: 'my new attachment content',
      });

      return utils
        .saveDocs([
          {
            _id: 'a_with_attachments',
            type: 'clinic',
            parent: { _id: 'fixture:offline' },
            name: 'allowed attach',
          },
          {
            _id: 'd_with_attachments',
            type: 'clinic',
            parent: { _id: 'fixture:online' },
            name: 'denied attach',
          },
        ])
        .then(results => Promise.all(
          results.map(result =>
            utils
              .requestOnTestDb(_.extend({ path: `/${result.id}/new_attachment?rev=${result.rev}` }, offlineRequestOptions))
              .catch(err => err)))
        )
        .then(results => {
          chai.expect(results[0]).to.deep.include({ ok: true,  id: 'a_with_attachments' });
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});

          return Promise.all([
            utils.requestOnTestDb({ path: '/a_with_attachments' }),
            utils.requestOnTestDb({ path: '/a_with_attachments/new_attachment' }, false, true),
            utils.requestOnTestDb({ path: '/d_with_attachments' }),
            utils.requestOnTestDb({ path: '/d_with_attachments/new_attachment' }).catch(err => err),
          ]);
        })
        .then(results => {
          chai.expect(results[0]._attachments.new_attachment).to.be.ok;
          chai.expect(results[0]._id).to.equal('a_with_attachments');

          chai.expect(results[1]).to.equal('my new attachment content');

          chai.expect(results[2]._attachments).to.be.undefined;
          chai.expect(results[2]._id).to.equal('d_with_attachments');

          chai.expect(results[3].responseBody.error).to.equal('not_found');
        });
    });
  });

  describe('should restrict offline users when db name is not medic', () => {
    it('GET', () => {
      offlineRequestOptions.method = 'GET';

      return Promise.all([
        utils.requestOnMedicDb(_.defaults({ path: '/fixture:user:offline' }, offlineRequestOptions)),
        utils.requestOnMedicDb(_.defaults({ path: '/fixture:user:online' }, offlineRequestOptions)).catch(err => err),
      ]).then(results => {
        chai.expect(results[0]).to.deep.include({
          _id: 'fixture:user:offline',
          name: 'OfflineUser',
          type: 'person',
          parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
        });
        chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
      });
    });

    it('PUT', () => {
      _.extend(offlineRequestOptions, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      const docs = [
        {
          _id: 'a_put_1',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'a1',
        },
        {
          _id: 'a_put_2',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'a2',
        },
        {
          _id: 'd_put_1',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'd1',
        },
        {
          _id: 'd_put_2',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'd2',
        },
      ];

      return utils
        .saveDocs(docs)
        .then(results => {
          results.forEach((result, idx) => (docs[idx]._rev = result.rev));

          const updates = [
            { _id: 'n_put_1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'n1' }, // new allowed
            { _id: 'n_put_2', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'n2' }, // new denied
            _.defaults({ name: 'a1 updated' }, docs[0]), // stored allowed, new allowed
            _.defaults({ name: 'a2 updated', parent: { _id: 'fixture:online' } }, docs[1]), // stored allowed, new denied
            _.defaults({ name: 'd1 updated' }, docs[2]), // stored denied, new denied
            _.defaults({ name: 'd2 updated', parent: { _id: 'fixture:offline' } }, docs[3]), // stored denied, new allowed
          ];

          return Promise.all(
            updates.map(doc =>
              utils
                .requestOnTestDb(_.extend({ path: `/${doc._id}`, body: doc }, offlineRequestOptions))
                .catch(err => err)
            )
          );
        })
        .then(results => {
          chai.expect(results[0]).to.deep.include({ ok: true, id: 'n_put_1' });
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.deep.include({ ok: true, id: 'a_put_1' });
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[4]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[5]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        });
    });

    it('GET attachment', () => {
      return utils
        .saveDoc({ _id: 'with_attachments' })
        .then(result =>
          utils.requestOnMedicDb({
            path: `/with_attachments/att_name?rev=${result.rev}`,
            method: 'PUT',
            body: 'my attachment content',
            headers: { 'Content-Type': 'text/plain' },
          })
        )
        .then(() => {
          onlineRequestOptions.path = '/with_attachments/att_name';
          return utils.requestOnMedicDb(onlineRequestOptions, false, true);
        })
        .then(result => {
          chai.expect(result).to.equal('my attachment content');
        });
    });

    it('PUT attachment', () => {
      return utils
        .saveDoc({ _id: 'with_attachments' })
        .then(result => {
          _.extend(onlineRequestOptions, {
            path: `/with_attachments/new_attachment?rev=${result.rev}`,
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            body: 'my new attachment content',
          });

          return utils.requestOnMedicDb(onlineRequestOptions);
        })
        .then(result => utils.requestOnMedicDb(`/with_attachments/new_attachment?rev=${result.rev}`, false, true))
        .then(result => {
          chai.expect(result).to.equal('my new attachment content');
        });
    });
  });

  it('restricts calls with irregular urls which match couchdb endpoints', () => {
    const doc = {
      _id: 'denied_report',
      contact: { _id: 'fixture:online' },
      type: 'data_record',
      form: 'a',
    };

    return utils
      .saveDoc(doc)
      .then(() =>
        Promise.all([
          utils.requestOnTestDb(_.defaults({ path: '/denied_report' }, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '///denied_report//' }, offlineRequestOptions)).catch(err => err),
          utils
            .request(_.defaults({ path: `//${constants.DB_NAME}//denied_report/dsada` }, offlineRequestOptions))
            .catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/denied_report/something' }, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '///denied_report//something' }, offlineRequestOptions)).catch(err => err),
          utils
            .request(_.defaults({ path: `//${constants.DB_NAME}//denied_report/something` }, offlineRequestOptions))
            .catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '/denied_report' }, offlineRequestOptions)).catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '///denied_report//' }, offlineRequestOptions)).catch(err => err),
          utils
            .request(_.defaults({ path: `//medic//denied_report/dsada` }, offlineRequestOptions))
            .catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '/denied_report/something' }, offlineRequestOptions)).catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '///denied_report//something' }, offlineRequestOptions)).catch(err => err),
          utils
            .request(_.defaults({ path: `//medic//denied_report/something` }, offlineRequestOptions))
            .catch(err => err),
        ])
      )
      .then(results => {
        chai.expect(results.every(result => result.statusCode === 403 || result.statusCode === 404)).to.equal(true);
      });
  });

  it('allows creation of feedback docs', () => {
    const doc = { _id: 'fb1', type: 'feedback', content: 'content' };

    _.extend(offlineRequestOptions, {
      path: '/',
      method: 'POST',
      body: doc,
    });

    return utils
      .requestOnTestDb(offlineRequestOptions)
      .then(result => {
        expect(_.omit(result, 'rev')).toEqual({ id: 'fb1', ok: true });
        return utils.getDoc('fb1');
      })
      .then(result => {
        chai.expect(result).to.deep.include(doc);
      });
  });

  it('does not allow updates of feedback docs', () => {
    const doc = { _id: 'fb1', type: 'feedback', content: 'content' };

    return utils
      .saveDoc(doc)
      .then(result => {
        doc._rev = result.rev;
        doc.content = 'new content';

        _.extend(offlineRequestOptions, {
          method: 'PUT',
          path: '/fb1',
          body: doc,
        });
        return utils.requestOnTestDb(offlineRequestOptions).catch(err => err);
      })
      .then(result => {
        chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        return utils.getDoc('fb1');
      })
      .then(result => {
        chai.expect(result._rev).to.equal(doc._rev);
        chai.expect(result.content).to.equal('content');
      });
  });

  describe('interactions with ddocs', () => {
    it('allows GETting _design/medic-client blocks all other ddoc GET requests', () => {
      return Promise
        .all([
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic-client' }, offlineRequestOptions)),
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic' }, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/something' }, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic-admin' }, offlineRequestOptions)).catch(err => err)
        ])
        .then(results => {
          chai.expect(results[0]._id).to.equal('_design/medic-client');

          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        });
    });

    it('blocks PUTting any ddoc', () => {
      const request = {
        method: 'PUT',
        body: { some: 'data' },
      };

      return Promise
        .all([
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic-client' }, request, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic' }, request, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/something' }, request, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic-admin' }, request, offlineRequestOptions)).catch(err => err),
        ])
        .then(results => {
          chai.expect(results[0]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        });
    });

    it('blocks DELETEing any ddoc', () => {
      const request = {
        method: 'DELETE',
      };

      return Promise
        .all([
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic-client' }, request, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic' }, request, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/something' }, request, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic-admin' }, request, offlineRequestOptions)).catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '/_design/medic-client' }, request, offlineRequestOptions)).catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '/_design/medic' }, request, offlineRequestOptions)).catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '/_design/something' }, request, offlineRequestOptions)).catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '/_design/medic-admin' }, request, offlineRequestOptions)).catch(err => err),
        ])
        .then(results => {
          results.forEach(result => {
            chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        });
      });
    });
  });
});
