import $ from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';
import { Form } from 'enketo-core';

describe('Enketo: DB Object Widget', () => {

  let dbObjectWidget;
  let model;
  let nodeFn;
  let getElements;
  let setVal;
  let input;

  beforeEach(() => {
    dbObjectWidget = require('../../../../../src/js/enketo/widgets/db-object-widget');
    getElements = sinon.stub();
    setVal = sinon.stub();
    nodeFn = sinon.stub().returns({ getElements, setVal });
    model = { node: nodeFn };
    input = { find: sinon.stub(), setVal: sinon.stub() };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('updateFields', () => {

    it('should set node values', () => {
      const currentForm = { model, input };
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
      const currentForm = { model, input };
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

  describe('with a rendered form', () => {
    let form;
    let originalCHTCore;

    const formHtml = `
      <div id="db-object-widget-test">
        <form class="or clearfix" autocomplete="off" novalidate="novalidate" dir="ltr" id="db-object-test">
          <section class="or-group-data" name="/data/prev_respondent">
            <label class="question non-select">
              <span lang="" class="question-label active">HHM ID</span>
              <input type="text" name="/data/prev_respondent/_id" data-type-xml="string">
            </label>
            <label class="question non-select">
              <span lang="" class="question-label active">Name</span>
              <input type="text" name="/data/prev_respondent/name" data-type-xml="string">
            </label>
          </section>
        </form>
      </div>`;

    const modelStr = `
      <model>
        <instance>
          <data id="db-object-test">
            <prev_respondent>
              <_id/>
              <name/>
            </prev_respondent>
            <meta>
              <instanceID/>
            </meta>
          </data>
        </instance>
      </model>`;

    before(() => originalCHTCore = window.CHTCore);
    after(() => window.CHTCore = originalCHTCore);

    beforeEach(() => {
      window.CHTCore = { Translate: { instant: sinon.stub().returnsArg(0) } };
      document.body.insertAdjacentHTML('afterbegin', formHtml);
      form = new Form(document.querySelector('#db-object-widget-test form'), { modelStr });
      expect(form.init()).to.be.empty;
    });

    afterEach(() => {
      $('#db-object-widget-test').remove();
    });

    it('should show the loaded values in the form controls', () => {
      const data = { _id: 'contact-1', name: 'Sally' };
      dbObjectWidget._updateFields(form, data, '/data/prev_respondent', 0, '/data/prev_respondent/_id');

      expect(form.model.node('/data/prev_respondent/name', 0).getVal()).to.equal('Sally');
      expect($('#db-object-widget-test input[name="/data/prev_respondent/name"]').val()).to.equal('Sally');
    });

  });

});
