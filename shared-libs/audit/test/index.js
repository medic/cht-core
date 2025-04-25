const chai = require('chai').use(require('chai-as-promised'));
const expect = chai.expect;
const sinon = require('sinon');
const rewire = require('rewire');

let lib;

describe('Audit', () => {
  beforeEach(() => {
    lib = rewire('../src/index');
  });

  describe('fetchCallback', () => {
    const getResponse = (ok, json, streamed, body) => {
      return {
        ok,
        json: sinon.stub().resolves(body),
        streamed,
        body: sinon.stub().value(body),
        headers: {
          get: sinon.stub().withArgs('content-type').returns(json ? 'application/json' : 'text/plain')
        }
      };
    };

    beforeEach(() => {
      medicDb = { name: 'medic',  };
      lib.initLib({ name: 'medic' }, { name: 'audit' }, 'sentinel', { method: sinon.stub() });
    });

    it('should skip invalid requests', async () => {
      const response = getResponse(false, true, false, { ok: false, error: 'not_found' });



    });

    it('should skin non-json responses', async () => {

    });

    it('should skip non-write requests', async () => {

    });

    it('should record audit on db-doc POST', async () => {

    });

    it('should record audit on db-doc PUT', async () => {

    });

    it('should record audit on _bulk_docs', async () => {

    });

    it('should record audit on _bulk_docs with new_edits', async () => {

    });

    it('should skip adding request ids when local storage is not set', async () => {

    });
  });

  describe('expressCallback', () => {
    it('should skip invalid requests', async () => {

    });

    it('should skin non-json responses', async () => {

    });

    it('should skip non-write requests', async () => {

    });

    it('should record audit on db-doc POST', async () => {

    });

    it('should record audit on db-doc PUT', async () => {

    });

    it('should record audit on _bulk_docs', async () => {

    });

    it('should record audit on _bulk_docs with new_edits', async () => {

    });

    it('should skip adding request ids when local storage is not set', async () => {

    });
  });
});
