const chai = require('chai').use(require('chai-as-promised'));
const expect = chai.expect;
const sinon = require('sinon');
const rewire = require('rewire');

let lib;

describe('Audit', () => {
  beforeEach(() => {
    lib = rewire('../src/index');
  });

  describe('initLib', () => {
    it('should set databases, async store and app name', () => {
      const medicDb = { name: 'medic' };
      const auditDb = { name: 'medic' };
      const store = { method: sinon.stub() };

      lib.initLib(medicDb, auditDb, 'sentinel', store);

      expect(lib.__get__('db').medic).to.equal(medicDb);
      expect(lib.__get__('db').audit).to.equal(auditDb);
      expect(lib.__get__('asyncLocalStorage')).to.equal(store);
    });
  });
});
