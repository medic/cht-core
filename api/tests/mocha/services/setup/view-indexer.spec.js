const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');

const db = require('../../../../src/db');
const env = require('../../../../src/environment');
const rpn = require('request-promise-native');
const databases = require('../../../../src/services/setup/databases');
const upgradeLogService = require('../../../../src/services/setup/upgrade-log');

let viewIndexer;

describe('View indexer service', () => {
  beforeEach(() => {
    sinon.stub(databases, 'DATABASES').value(databases.DATABASES.map(dbObject => {
      return Object.assign({}, dbObject, { name: `thedb${dbObject.name}` });
    }));
    sinon.stub(env, 'db').value('thedb');
    viewIndexer = rewire('../../../../src/services/setup/view-indexer');
  });
  afterEach(() => {
    sinon.restore();
  });

  describe('getViewsToIndex', () => {
    it('should return an array of function that will start view indexing', async () => {
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { doc: { _id: '_design/:staged:one', views: { view1: {}, view2: {}, view3: {}} } },
          { doc: { _id: '_design/:staged:three', views: { view4: {} }} },
        ]
      });
      sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [] });
      sinon.stub(db.medicLogs, 'allDocs').resolves({ rows: [{ doc: { _id: '_design/:staged:two' } }] });
      sinon.stub(db.medicUsersMeta, 'allDocs').resolves({
        rows: [
          { doc: { _id: '_design/:staged:four', views: { view: {} }} },
        ],
      });

      sinon.stub(rpn, 'get').resolves();
      sinon.stub(env, 'serverUrl').value('http://localhost');

      const result = await viewIndexer.getViewsToIndex();

      expect(result.length).to.equal(5);
      result.forEach(item => expect(item).to.be.a('function'));

      expect(rpn.get.callCount).to.equal(0);

      await Promise.all(result.map(item => item()));

      expect(rpn.get.callCount).to.equal(5);
      expect(rpn.get.args).to.deep.equal([
        [{
          uri: 'http://localhost/thedb/_design/:staged:one/_view/view1',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
        [{
          uri: 'http://localhost/thedb/_design/:staged:one/_view/view2',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
        [{
          uri: 'http://localhost/thedb/_design/:staged:one/_view/view3',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
        [{
          uri: 'http://localhost/thedb/_design/:staged:three/_view/view4',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
        [{
          uri: 'http://localhost/thedb-users-meta/_design/:staged:four/_view/view',
          json: true,
          qs: { limit: 1 },
          timeout: 2000,
        }],
      ]);
    });
  });

  describe('indexView', () => {
    it('should query the view with a timeout', async () => {
      sinon.stub(rpn, 'get').resolves();
      sinon.stub(env, 'serverUrl').value('http://localhost');

      await viewIndexer.__get__('indexView')('medic', '_design/:staged:medic', 'contacts');

      expect(rpn.get.callCount).to.equal(1);
      expect(rpn.get.args[0]).to.deep.equal([{
        uri: 'http://localhost/medic/_design/:staged:medic/_view/contacts',
        json: true,
        qs: { limit: 1 },
        timeout: 2000,
      }]);
    });

    it('should retry if the error is a timeout error', async () => {
      sinon.stub(env, 'serverUrl').value('http://localhost');
      sinon.stub(rpn, 'get').rejects({ error: { code: 'ESOCKETTIMEDOUT' } });
      rpn.get.onCall(20).resolves();

      await viewIndexer.__get__('indexView')('other', '_design/mydesign', 'viewname');

      expect(rpn.get.callCount).to.equal(21);
      const params = {
        uri: 'http://localhost/other/_design/mydesign/_view/viewname',
        json: true,
        qs: { limit: 1 },
        timeout: 2000,
      };
      expect(rpn.get.args).to.deep.equal(Array.from({ length: 21 }).map(() => [params]));
    });

    it('should terminate when other errors are thrown', async () => {
      sinon.stub(env, 'serverUrl').value('http://localhost');
      sinon.stub(rpn, 'get').rejects({ error: { code: 'ESOCKETTIMEDOUT' } });
      rpn.get.onCall(10).rejects({ name: 'error' });

      try {
        await viewIndexer.__get__('indexView')('other', '_design/mydesign', 'viewname');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ name: 'error' });
        expect(rpn.get.callCount).to.equal(11);
      }
    });
  });

  describe('indexViewsFn', () => {
    it('should call all indexView functions', async () => {
      const viewToIndexFunctions = [
        sinon.stub().resolves('a'),
        sinon.stub().resolves('b'),
        sinon.stub().resolves('c'),
        sinon.stub().resolves('d'),
      ];
      sinon.stub(upgradeLogService, 'setIndexing');
      sinon.stub(upgradeLogService, 'setIndexed');

      const promise = viewIndexer.indexViews(viewToIndexFunctions);

      viewToIndexFunctions.forEach(indexFn => expect(indexFn.called).to.equal(false));
      expect(upgradeLogService.setIndexing.callCount).to.equal(1);
      expect(upgradeLogService.setIndexed.callCount).to.equal(0);

      const result = await promise;

      viewToIndexFunctions.forEach(indexFn => {
        expect(indexFn.callCount).to.equal(1);
        expect(indexFn.args[0]).to.deep.equal([]);
      });
      expect(upgradeLogService.setIndexing.callCount).to.equal(1);
      expect(upgradeLogService.setIndexed.callCount).to.equal(1);

      expect(result).to.deep.equal(['a', 'b', 'c', 'd']);
    });

    it('should throw error if indexing fails', async () => {
      const viewToIndexFunctions = [
        sinon.stub().resolves('a'),
        sinon.stub().resolves('b'),
        sinon.stub().rejects({ an: 'error' }),
      ];
      sinon.stub(upgradeLogService, 'setIndexing');
      sinon.stub(upgradeLogService, 'setIndexed');

      try {
        await viewIndexer.indexViews(viewToIndexFunctions);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'error' });
      }
    });

    it('should do nothing if passed param is not an array', async () => {
      sinon.stub(upgradeLogService, 'setIndexed');
      await viewIndexer.indexViews('something');
      expect(upgradeLogService.setIndexed.callCount).to.equal(1);
    });
  });
});
