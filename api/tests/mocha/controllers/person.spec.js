const sinon = require('sinon');
const { expect } = require('chai');
const { Person, Qualifier } = require('@medic/cht-datasource');
const auth = require('../../../src/auth');
const controller = require('../../../src/controllers/person');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');

describe('Person Controller', () => {
  let authCheck;
  let dataContextBind;
  let serverUtilsError;
  let req;
  let res;

  beforeEach(() => {
    authCheck = sinon.stub(auth, 'check');
    dataContextBind = sinon.stub(dataContext, 'bind');
    serverUtilsError = sinon.stub(serverUtils, 'error');
    res = {
      json: sinon.stub(),
    };
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    describe('get', () => {
      const qualifier = Object.freeze({ uuid: 'uuid' });
      let byUuid;
      let personGet;
      let personGetWithLineage;

      beforeEach(() => {
        req = {
          params: { uuid: 'uuid' },
          query: { }
        };
        byUuid = sinon
          .stub(Qualifier, 'byUuid')
          .returns(qualifier);
        personGet = sinon.stub();
        personGetWithLineage = sinon.stub();
        dataContextBind
          .withArgs(Person.v1.get)
          .returns(personGet);
        dataContextBind
          .withArgs(Person.v1.getWithLineage)
          .returns(personGetWithLineage);
      });

      it('returns a person', async () => {
        const person = { name: 'John Doe' };
        personGet.resolves(person);

        await controller.v1.get(req, res);

        expect(authCheck.calledOnceWithExactly(req, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.get)).to.be.true;
        expect(byUuid.calledOnceWithExactly(req.params.uuid)).to.be.true;
        expect(personGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(person)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a person with lineage when the query parameter is set', async () => {
        const person = { name: 'John Doe' };
        personGetWithLineage.resolves(person);
        req.query.with_lineage = 'true';

        await controller.v1.get(req, res);

        expect(authCheck.calledOnceWithExactly(req, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getWithLineage)).to.be.true;
        expect(byUuid.calledOnceWithExactly(req.params.uuid)).to.be.true;
        expect(personGet.notCalled).to.be.true;
        expect(personGetWithLineage.calledOnceWithExactly(qualifier)).to.be.true;
        expect(res.json.calledOnceWithExactly(person)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a 404 error if person is not found', async () => {
        personGet.resolves(null);

        await controller.v1.get(req, res);

        expect(authCheck.calledOnceWithExactly(req, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.get)).to.be.true;
        expect(byUuid.calledOnceWithExactly(req.params.uuid)).to.be.true;
        expect(personGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 404, message: 'Person not found' },
          req,
          res
        )).to.be.true;
      });

      it('returns error if user unauthorized', async () => {
        const error = new Error('Unauthorized');
        authCheck.rejects(error);

        await controller.v1.get(req, res);

        expect(authCheck.calledOnceWithExactly(req, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(byUuid.notCalled).to.be.true;
        expect(personGet.notCalled).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(error, req, res)).to.be.true;
      });
    });
  });
});
