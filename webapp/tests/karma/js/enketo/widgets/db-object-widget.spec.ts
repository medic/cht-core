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

  describe('loading a contact on a page that is not shown', () => {
    let form;
    let originalCHTCore;
    let originalSelect2;

    const formHtml = `
      <div id="db-object-widget-pages-test">
        <form class="or clearfix pages" autocomplete="off" novalidate="novalidate" dir="ltr" id="db-object-pages">
          <section class="or-group or-appearance-field-list" name="/data/page_1">
            <label class="question non-select">
              <span lang="" class="question-label active">Notes</span>
              <input type="text" name="/data/page_1/notes" data-type-xml="string">
            </label>
          </section>
          <section class="or-group or-appearance-field-list" name="/data/page_2">
            <label class="question non-select or-appearance-select-contact or-appearance-type-person">
              <span lang="" class="question-label active">Contact</span>
              <input type="text" name="/data/page_2/_id" data-type-xml="string"
                data-constraint="../name = 'This is the wrong name'">
              <span class="or-constraint-msg active" lang="" data-i18n="constraint.invalid">Value not allowed</span>
            </label>
            <label class="question non-select">
              <span lang="" class="question-label active">Name</span>
              <input type="text" name="/data/page_2/name" data-type-xml="string">
            </label>
          </section>
        </form>
      </div>`;

    const modelStr = `
      <model>
        <instance>
          <data id="db-object-pages">
            <page_1>
              <notes/>
            </page_1>
            <page_2>
              <_id>contact-1</_id>
              <name/>
            </page_2>
            <meta>
              <instanceID/>
            </meta>
          </data>
        </instance>
      </model>`;

    before(() => {
      originalCHTCore = window.CHTCore;
      originalSelect2 = $.fn.select2;
    });

    after(() => {
      window.CHTCore = originalCHTCore;
      $.fn.select2 = originalSelect2;
    });

    beforeEach(() => {
      window.CHTCore = {
        Translate: { instant: sinon.stub().returnsArg(0) },
        Select2Search: { init: sinon.stub().resolves() },
        Enketo: { getCurrentForm: () => form },
      };
      $.fn.select2 = sinon.stub().returns([{ id: 'contact-1', doc: { _id: 'contact-1', name: 'Sally' } }]);
      document.body.insertAdjacentHTML('afterbegin', formHtml);
      form = new Form(document.querySelector('#db-object-widget-pages-test form'), { modelStr });
      expect(form.init()).to.be.empty;
    });

    afterEach(() => {
      $('#db-object-widget-pages-test').remove();
    });

    it('should validate the contact question without leaving the current page', async () => {
      const firstPage = $('#db-object-widget-pages-test [name="/data/page_1"]')[0];
      const $contactQuestion = $('#db-object-widget-pages-test input[name="/data/page_2/_id"]').closest('.question');
      expect(form.pages.current).to.equal(firstPage);

      $('#db-object-widget-pages-test select[name="/data/page_2/_id"]').trigger('change');
      await new Promise(resolve => setTimeout(resolve));

      expect(form.model.node('/data/page_2/name', 0).getVal()).to.equal('Sally');
      expect($contactQuestion.hasClass('invalid-constraint')).to.equal(true);
      expect(form.pages.current).to.equal(firstPage);
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
