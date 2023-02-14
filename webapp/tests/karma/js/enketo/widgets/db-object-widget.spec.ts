import sinon from 'sinon';
import { expect } from 'chai';

describe('Enketo: DB Object Widget', () => {

  let dbObjectWidget;
  let model;
  let nodeFn;
  let getCurrentForm;
  let getElements;
  let setVal;

  beforeEach(() => {
    dbObjectWidget = require('../../../../../src/js/enketo/widgets/db-object-widget');
    getElements = sinon.stub();
    setVal = sinon.stub();
    nodeFn = sinon.stub().returns({ getElements, setVal });
    model = { node: nodeFn };
    getCurrentForm = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('updateDoc', () => {

    let $this;
    let doc;

    beforeEach(() => {
      $this = {};
      doc = {};
    });

    it('should gracefully handle when the form is unloaded - #7602', () => {
      window.CHTCore = { Enketo: undefined };
      dbObjectWidget._updateDoc($this, doc);
      expect(getCurrentForm.callCount).to.equal(0);
    });

  });

  describe('updateFields', () => {

    it('should set node values', () => {
      const currentForm = { model };
      getElements.returns(['']);
      const data = { name: 'john' };
      const keyRoot = '/test';
      const index = 0;
      const originatingKeyPath = keyRoot;
      dbObjectWidget._updateFields(currentForm, data, keyRoot, index, originatingKeyPath);
      expect(nodeFn.callCount).to.equal(1);
      expect(nodeFn.args[0][0]).to.equal('/test/name');
      expect(nodeFn.args[0][1]).to.equal(0);
      expect(setVal.callCount).to.equal(1);
      expect(setVal.args[0][0]).to.equal('john');
    });

    it('should iterate over objects', () => {
      const currentForm = { model };
      getElements.returns(['']);
      const data = {
        patient: { name: 'john'},
        chw: { name: 'jill' }
      };
      const keyRoot = '/test';
      const index = 0;
      const originatingKeyPath = keyRoot;
      dbObjectWidget._updateFields(currentForm, data, keyRoot, index, originatingKeyPath);
      expect(nodeFn.callCount).to.equal(2);
      expect(nodeFn.args[0][0]).to.equal('/test/patient/name');
      expect(nodeFn.args[0][1]).to.equal(0);
      expect(nodeFn.args[1][0]).to.equal('/test/chw/name');
      expect(nodeFn.args[1][1]).to.equal(0);
      expect(setVal.callCount).to.equal(2);
      expect(setVal.args[0][0]).to.equal('john');
      expect(setVal.args[1][0]).to.equal('jill');
    });

  });

});
