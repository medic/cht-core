import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { assert } from 'chai';

import { Form2smsService } from '@mm-services/form2sms.service';
import { DbService } from '@mm-services/db.service';
import { GetReportContentService } from '@mm-services/get-report-content.service';
import { ParseProvider } from '@mm-providers/parse.provider';
import { PipesService } from '@mm-services/pipes.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { LanguageService } from '@mm-services/language.service';

describe('Form2Sms service', () => {
  'use strict';

  const TEST_FORM_NAME = 'form:test';
  const TEST_FORM_ID = `form:${TEST_FORM_NAME}`;

  /** @return a mock form ready for putting in #dbContent */
  let service: Form2smsService;
  let dbGet;
  let dbGetAttachment;
  let GetReportContent;

  const testFormExists = () => {
    testFormExistsWithAttachedCode(undefined);
  };

  const testFormExistsWithAttachedCode = (code?) => {
    dbGet.withArgs(TEST_FORM_ID).resolves({ xml2sms: code });
  };

  const aFormSubmission = (xml?) => {
    GetReportContent.resolves(xml);
    return { _id: 'abc-123', form: TEST_FORM_NAME };
  };

  beforeEach(() => {
    dbGet = sinon.stub();
    dbGetAttachment = sinon.stub();
    GetReportContent = sinon.stub();
    const pipesService = {
      getPipeNameVsIsPureMap: sinon.stub().returns(new Map),
      meta: sinon.stub(),
      getInstance: sinon.stub(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({ get: dbGet, getAttachment: dbGetAttachment }) } },
        { provide: GetReportContentService, useValue: { getReportContent: GetReportContent } },
        ParseProvider,
        { provide: PipesService, useValue: pipesService },
        { provide: UserSettingsService, useValue: { get: sinon.stub(), } },
        { provide: LanguageService, useValue: { get: sinon.stub(), } }
      ]
    });
    service = TestBed.inject(Form2smsService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#()', () => {
    it('should throw for a non-existent doc', () => {
      // given
      let NO_FORM;

      // when
      return service
        .transform(NO_FORM)
        .then(smsContent => assert.fail(`Should have thrown, but instead returned ${smsContent}`))
        .catch(err => assert.notEqual(err.name, 'AssertionError'));
    });

    it('should throw for a non-existent form', () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      // given
      const doc = aFormSubmission();
      // and there's no form
      dbGet.withArgs(TEST_FORM_ID).rejects(new Error('expected'));

      // when
      return service
        .transform(doc)
        .then(smsContent => assert.fail(`Should have thrown, but instead returned ${smsContent}`))
        .catch(err => {
          assert.equal(err.message, 'expected');
          assert.equal(consoleErrorMock.callCount, 1);
          assert.isTrue(consoleErrorMock.args[0][0].startsWith('Form2Sms failed: '));
        });
    });

    it('should parse attached code for a form', () => {
      // given
      const doc:any = aFormSubmission();
      doc.fields = { a:1, b:2, c:3 };
      // and
      testFormExistsWithAttachedCode('spaced("T", doc.a, doc.b, doc.c)');

      // when
      return service
        .transform(doc)
        .then(smsContent => assert.equal(smsContent, 'T 1 2 3'));
    });

    it('should fall back to ODK compact form specification if no custom code is provided but value is truthy', () => {
      // given
      const doc = aFormSubmission(`
        <test prefix="T" delimiter="#">
          <field_one tag="f1">une</field_one>
          <field_two tag="f2">deux</field_two>
          <ignored_field>rien</ignored_field>
        </test>
      `);
      // and
      testFormExistsWithAttachedCode(true);
      dbGetAttachment.resolves(new Blob([`
        <test prefix="T" delimiter="#">
          <field_one tag="f1"></field_one>
          <field_two tag="f2"></field_two>
          <ignored_field></ignored_field>
        </test>` ]));

      // when
      return service
        .transform(doc)
        .then(smsContent => assert.equal(smsContent, 'T#f1#une#f2#deux'));
    });

    it('should work with report with no content attachment', () => {
      const doc = {
        form: TEST_FORM_NAME,
        fields: { a: 1, b: 2 },
      };
      testFormExistsWithAttachedCode(true);
      GetReportContent.resolves(doc.fields);
      dbGetAttachment.resolves(new Blob(
        [`<model>
          <instance>
            <form prefix="T" delimiter="#">
              <a tag="a"></a>
              <b tag="b"></b>
            </form>
          </instance>
        </model>` ]
      ));
      return service
        .transform(doc)
        .then(smsContent => assert.equal(smsContent, 'T#a#1#b#2'));
    });

    it('should do nothing if xml2sms field not provided', () => {
      const doc = aFormSubmission(`
        <test prefix="T" delimiter="#">
          <field_one tag="f1">une</field_one>
          <field_two tag="f2">deux</field_two>
          <ignored_field>rien</ignored_field>
        </test>
      `);

      testFormExists();
      return service
        .transform(doc)
        .then(smsContent => assert.isUndefined(smsContent));
    });

    it('should do nothing if xml2sms field is false', () => {
      const doc = aFormSubmission(`
        <test prefix="T" delimiter="#">
          <field_one tag="f1">une</field_one>
          <field_two tag="f2">deux</field_two>
          <ignored_field>rien</ignored_field>
        </test>
      `);

      testFormExistsWithAttachedCode(false);
      return service
        .transform(doc)
        .then(smsContent => assert.isUndefined(smsContent));
    });

    it('should return nothing if neither code nor ODK compact format are provided', () => {
      // given
      const doc = aFormSubmission('<test/>');
      // and
      testFormExistsWithAttachedCode(true);
      dbGetAttachment.resolves(new Blob(
        ['<model><instance><form><test></test></form></instance></model>' ]
      ));
      // when
      return service
        .transform(doc)
        .then(smsContent => assert.isUndefined(smsContent));
    });
  });

  it('should allow nice encoding of danger signs', () => {
    // given
    const doc:any = aFormSubmission();
    doc.fields = {
      s_acc_danger_signs: {
        s_acc_danger_sign_seizure: 'no',
        s_acc_danger_sign_loss_consiousness: 'yes',
        s_acc_danger_sign_unable_drink: 'no',
        s_acc_danger_sign_confusion: 'yes',
        s_acc_danger_sign_vomit: 'no',
        s_acc_danger_sign_chest_indrawing: 'yes',
        s_acc_danger_sign_wheezing: 'no',
        s_acc_danger_sign_bleeding: 'yes',
        s_acc_danger_sign_lathargy: 'no',
        has_danger_sign: 'true',
      },
    };

    // and
    testFormExistsWithAttachedCode(`
        concat(
            "U5 ",
            match(doc.s_acc_danger_signs.has_danger_sign, "true:DANGER, false:NO_DANGER"),
            " ",
            match(doc.s_acc_danger_signs.s_acc_danger_sign_seizure, "yes:S"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_loss_consiousness, "yes:L"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_unable_drink, "yes:D"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_confusion, "yes:C"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_vomit, "yes:V"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_chest_indrawing, "yes:I"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_wheezing, "yes:W"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_bleeding, "yes:B"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_lathargy, "yes:Y")
        )
    `);

    // when
    return service
      .transform(doc)
      .then(smsContent => assert.equal(smsContent, 'U5 DANGER LCIB'));
  });
});
