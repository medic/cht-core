import sinon from 'sinon';
import { expect } from 'chai';

describe('Enketo: DB Object Widget', () => {

  let dbObjectWidget;
  let model;
  let nodeFn;
  let getElements;
  let setVal;

  beforeEach(() => {
    dbObjectWidget = require('../../../../../src/js/enketo/widgets/db-object-widget');
    getElements = sinon.stub();
    setVal = sinon.stub();
    nodeFn = sinon.stub().returns({ getElements, setVal });
    model = { node: nodeFn };
  });

  afterEach(() => {
    sinon.restore();
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

  describe('enable', () => {
    let select2SearchInit;
    let widget;
    let originalCHTCore;

    const makeSelectInput = (doc?) => ({
      select2: sinon.stub().returns(doc ? [{ id: 'some-id', doc }] : []),
    });

    beforeEach(() => {
      select2SearchInit = sinon.stub().resolves();
      originalCHTCore = (window as any).CHTCore;
      (window as any).CHTCore = { Select2Search: { init: select2SearchInit } };

      widget = {
        _contactTypes: ['person'],
        _allowNew: false,
        _filterByParent: false,
        enable: dbObjectWidget.prototype.enable,
      };
    });

    afterEach(() => {
      (window as any).CHTCore = originalCHTCore;
    });

    it('should call Select2Search.init() with the pre-populated value when field becomes relevant', () => {
      const contactId = 'contact-uuid-123';
      widget._$textInput = { val: sinon.stub().returns(contactId) };
      widget._$selectInput = makeSelectInput();

      widget.enable();

      expect(select2SearchInit.callCount).to.equal(1);
      expect(select2SearchInit.args[0][0]).to.equal(widget._$selectInput);
      expect(select2SearchInit.args[0][1]).to.deep.equal(['person']);
      expect(select2SearchInit.args[0][2]).to.deep.include({
        allowNew: false,
        filterByParent: false,
        initialValue: contactId,
      });
    });

    it('should NOT call Select2Search.init() when the contact doc is already loaded', () => {
      const contactId = 'contact-uuid-123';
      widget._$textInput = { val: sinon.stub().returns(contactId) };
      widget._$selectInput = makeSelectInput({ _id: contactId, name: 'Test Contact' });

      widget.enable();

      expect(select2SearchInit.callCount).to.equal(0);
    });

    it('should NOT call Select2Search.init() when text input is empty', () => {
      widget._$textInput = { val: sinon.stub().returns('') };
      widget._$selectInput = makeSelectInput();

      widget.enable();

      expect(select2SearchInit.callCount).to.equal(0);
    });

    it('should NOT call Select2Search.init() when _$textInput is not set', () => {
      widget._$textInput = undefined;
      widget._$selectInput = makeSelectInput();

      widget.enable();

      expect(select2SearchInit.callCount).to.equal(0);
    });

  });

});
