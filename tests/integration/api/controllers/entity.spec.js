const utils = require('@utils');
const { USER_ROLES } = require('@medic/constants');
const { expect } = require('chai');

describe('Entity API', () => {
  const doc1 = { _id: 'doc1', type: 'some_type', name: 'Document 1' };
  const onlineUser = {
    username: 'online-user',
    password: 'password',
    roles: [USER_ROLES.ONLINE],
  };
  const offlineUser = {
    username: 'offline-user',
    password: 'password',
    roles: ['chw'],
    place: 'some_place'
  };

  before(async () => {
    await utils.saveDocs([doc1]);
    await utils.createUsers([onlineUser, offlineUser]);
  });

  after(async () => {
    await utils.revertDb([]);
    await utils.deleteUsers([onlineUser, offlineUser]);
  });

  describe('GET /api/v1/entity/:id', () => {
    it('returns the document for an online user', async () => {
      const response = await utils.request({
        method: 'GET',
        path: `/api/v1/entity/${doc1._id}`,
        auth: { username: onlineUser.username, password: onlineUser.password }
      });
      expect(response.status).to.equal(200);
      expect(response.body._id).to.equal(doc1._id);
      expect(response.body.name).to.equal(doc1.name);
    });

    it('returns 403 for an offline user', async () => {
      const response = await utils.request({
        method: 'GET',
        path: `/api/v1/entity/${doc1._id}`,
        auth: { username: offlineUser.username, password: offlineUser.password }
      });
      expect(response.status).to.equal(403);
      expect(response.body.message).to.equal('Insufficient privileges');
    });

    it('returns 404 for a non-existent document', async () => {
      const response = await utils.request({
        method: 'GET',
        path: '/api/v1/entity/non-existent-id',
        auth: { username: onlineUser.username, password: onlineUser.password }
      });
      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal('Document not found');
    });
  });
});
