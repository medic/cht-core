import sinon from 'sinon';
import { expect, assert } from 'chai';
import * as moment from 'moment';
import { DatePipe } from '@angular/common';
import { of } from 'rxjs';

import { ParseProvider } from '@mm-providers/parse.provider';
import { AgePipe, } from '@mm-pipes/date.pipe';
import { TitlePipe } from '@mm-pipes/message.pipe';
import { PhonePipe } from '@mm-pipes/phone.pipe';
import { FormatDateService } from '@mm-services/format-date.service';
import { RelativeDateService } from '@mm-services/relative-date.service';
import { XmlFormsContextUtilsService } from '@mm-services/xml-forms-context-utils.service';

describe('Parse provider', () => {
  let provider:ParseProvider;
  let pipesService;

  afterEach(() => sinon.restore());

  const parse = (expression, context?, locals?) => {
    return provider.parse(expression)(context, locals);
  };

  describe('without pipes', () => {
    beforeEach(() => {
      pipesService = {
        getPipeNameVsIsPureMap: sinon.stub().returns(new Map()),
        meta: sinon.stub(),
        getInstance: sinon.stub(),
      };
      provider = new ParseProvider(pipesService);
    });

    it('should handle simple expressions', () => {
      expect(parse('1+1')).to.equal(2);
      expect(parse('5*8')).to.equal(40);
      expect(parse('200-100')).to.equal(100);
      expect(parse('"Hello" + " " + "world"')).to.equal('Hello world');
      expect(isNaN(parse('-"Hello"'))).to.be.true;
      expect(isNaN(parse('+"Hello"'))).to.be.true;
    });

    it('should crash when parser throws', () => {
      let result;
      try {
        result = parse('2 ===== 3');
        assert.fail('should have thrown');
      } catch (e) {
        expect(e.message.startsWith('Parser Error: Unexpected token')).to.equal(true);
        expect(result).to.equal(undefined);
      }
    });

    it('should handle context', () => {
      const context = {
        array: [1, 2, 3, 4, 5, 6, 7],
        isEven: (nbr) => nbr % 2 === 0,
        isOdd: (nbr) => nbr % 2 !== 0,
      };
      expect(parse('isOdd(array[0])', context)).to.equal(true);
      expect(parse('isOdd(array[1])', context)).to.equal(false);
      expect(parse('isEven(array[5])', context)).to.equal(true);
      expect(parse('isEven(array[6])', context)).to.equal(false);
    });

    it('should handle locals and context', () => {
      const context = {
        joinComma: array => array.join(','),
        joinSpace: array => array.join(' '),
      };
      const locals = {
        array: ['hello', 'world', '!']
      };
      expect(parse('joinComma(array)', context, locals)).to.equal('hello,world,!');
      expect(parse('joinSpace(array)', context, locals)).to.equal('hello world !');
    });

    it('should overwrite context with locals', () => {
      const context = {
        array1: [1, 2, 3],
        array2: [4, 5, 6],
      };
      const locals = {
        array1: [7, 8, 9],
      };
      expect(parse('array1.concat(array2)', context, locals)).to.deep.equal([7, 8, 9, 4, 5, 6]);
      expect(parse('array2.concat(array1)', context, locals)).to.deep.equal([4, 5, 6, 7, 8, 9]);
    });

    it('should process methods correctly', () => {
      const userContactDoc:any = {
        name: 'Hanry',
        phone: '+61466661112',
        contact_type: 'chp',
        type: 'person',
        reported_date: 1602853017680,
        parent: {
          name: 'Sushi Roll Clinic',
          type: 'district_hospital',
          reported_date: 1602852999338,
          place_id: '40046',
          contact: {
            name: 'Hanry',
            phone: '+61466661112',
            contact_type: 'chp',
            type: 'person',
            reported_date: 1602853017680,
            parent: {
              _id: 'dcf86fe98aa9fe2ddb207e4483006f69'
            },
            patient_id: '57848',
            _id: 'dcf86fe98aa9fe2ddb207e44830078b0',
          },
          parent: {
            _id: 'dcf86fe98aa9fe2ddb207e4483006f69',
          },
          _id: 'dcf86fe98aa9fe2ddb207e4483006f69',
        },
        patient_id: '57848',
      };
      const expression = '(user.parent.use_cases && user.parent.use_cases.split(" ").indexOf("pnc") !== -1) ' +
        '|| (user.parent.parent.use_cases && user.parent.parent.use_cases.split(" ").indexOf("pnc") !== -1)';
      const result = parse(expression, { user: userContactDoc });
      expect(result).to.equal(undefined);

      userContactDoc.parent.use_cases = 'some pnc thing';
      const result2 = parse(expression, { user: userContactDoc });
      expect(result2).to.equal(true);

      userContactDoc.parent.use_cases = undefined;
      userContactDoc.parent.parent.use_cases = 'some other pnc thing';
      const result3 = parse(expression, { user: userContactDoc });
      expect(result3).to.equal(true);

      userContactDoc.parent.parent.use_cases = 'some other nopnc thing';
      const result4 = parse(expression, { user: userContactDoc });
      expect(result4).to.equal(false);
    });

    it('should work with a form context', () => {
      const expression = `
        contact.type === 'person' && 
        summary.alive && !summary.muted && summary.show_delivery_form && 
        user.parent.type === 'health_center' && 
        (!contact.sex || contact.sex === 'female') && 
        (!contact.date_of_birth || (ageInYears(contact) >= 12 && ageInYears(contact) <= 49))
      `;
      const context = new XmlFormsContextUtilsService();
      const user = {
        parent: { type: 'health_center' },
      };
      const contact = {
        date_of_birth: '2007-05-13',
        date_of_birth_method: 'approx',
        name: 'Laura',
        patient_id: '03451',
        reported_date: 1672900567448,
        role: 'patient',
        sex: 'female',
        type: 'person',
      };
      const summaryAlive = {
        alive: true,
        muted: false,
        show_delivery_form: true,
      };
      const summaryDeceased = {
        alive: false,
        muted: false,
        show_delivery_form: true,
      };

      const trueResult = parse(expression, context, { user, contact, summary: summaryAlive });
      const falseResult = parse(expression, context, { user, contact, summary: summaryDeceased });

      expect(trueResult).to.equal(true);
      expect(falseResult).to.equal(false);
    });
  });

  describe('with pipes', () => {
    let translateService;
    let settingsService;
    let languageService;
    let formatNumberService;

    let formatDateService;
    let relativeDateService;
    let sanitizer;
    let clock;

    beforeEach(() => {
      translateService = {
        get: sinon.stub().callsFake((e) => of([e])),
        instant: sinon.stub().returnsArg(0),
      };
      settingsService = {
        get: sinon.stub().resolves({
          date_format: 'd-m-Y',
          reported_date_format: 'd-m-Y',
          default_country_code: 'RO',
        }),
      };
      languageService = { useDevanagariScript: sinon.stub().returns(false) };
      formatNumberService = { localize: sinon.stub().returnsArg(0) };
      sanitizer = {
        bypassSecurityTrustHtml: sinon.stub().returnsArg(0),
      };

      formatDateService = new FormatDateService(
        translateService,
        settingsService,
        languageService,
        formatNumberService
      );
      relativeDateService = new RelativeDateService(formatDateService);

      pipesService = {
        getPipeNameVsIsPureMap: sinon.stub().returns(new Map()),
        meta: sinon.stub(),
        getInstance: sinon.stub(),
      };
    });

    afterEach(() => {
      clock && clock.restore();
    });

    it('should work with built-in date', () => {
      pipesService = {
        getPipeNameVsIsPureMap: sinon.stub().returns(new Map([['date', { pure: true }]])),
        meta: sinon.stub().returns({ pure: true }),
        getInstance: sinon.stub().returns(new DatePipe('en')),
      };
      provider = new ParseProvider(pipesService);
      const date = moment('2020-01-01').valueOf();
      expect(parse(`${date} | date:'d-M-y'`)).to.equal('1-1-2020');
      expect(parse(`"2020-08-23" | date:'d-M-y'`)).to.equal('23-8-2020');
    });

    it('should work with custom age pipe', () => {
      pipesService = {
        getPipeNameVsIsPureMap: sinon.stub().returns(new Map([['age', { pure: true }]])),
        meta: sinon.stub().returns({ pure: true }),
        getInstance: sinon.stub().returns(new AgePipe(formatDateService, relativeDateService, sanitizer)),
      };
      const today = moment('2020-10-30');
      clock = sinon.useFakeTimers(today.valueOf());

      provider = new ParseProvider(pipesService);
      let birthDate = moment('2019-01-01').valueOf();
      let result = parse(`${birthDate} | age`);
      // result will be html like:
      /*
       <span class="relative-date past age" title="01-Jan-2019">
         <span class="relative-date-content update-relative-date"
         data-date-options='{"date":1546293600000,"absoluteToday":true,"withoutTime":true,"age":true}'>
           21 months
         </span>
       </span>
      */
      let html = $(result);
      expect(html.hasClass('age')).to.equal(true);
      expect(html.attr('title')).to.equal('01-Jan-2019');
      expect(html.find('.relative-date-content').html()).to.equal('21 months');

      birthDate = moment('1956-02-01').valueOf();
      result = parse(`${birthDate} | age`);
      html = $(result);
      expect(html.hasClass('age')).to.equal(true);
      expect(html.attr('title')).to.equal('01-Feb-1956');
      expect(html.find('.relative-date-content').html()).to.equal('64 years');
    });

    it('should work with title pipe', () => {
      pipesService = {
        getPipeNameVsIsPureMap: sinon.stub().returns(new Map([['title', { pure: true }]])),
        meta: sinon.stub().returns({ pure: true }),
        getInstance: sinon.stub().returns(new TitlePipe(translateService)),
      };
      provider = new ParseProvider(pipesService);
      const forms = [
        { code: 'forma', title: 'Form A' },
        { code: 'formb', title: 'Form B' },
      ];
      const report1 = { no: 'form' };
      const report2 = { kujua_message: true };
      const report3 = { form: 'other' };
      const report4 = { form: 'forma' };
      const report5 = { form: 'formb' };

      // no report and no forms
      expect(parse('report | title:forms', {} )).to.equal('');

      const context:any = { report: report1, forms }; // report without form
      expect(parse('report | title:forms', context)).to.equal('sms_message.message');

      context.report = report2; // kujua message
      expect(parse('report | title:forms', context)).to.equal('Outgoing Message');

      context.report = report3; // missing form
      expect(parse('report | title:forms', context)).to.equal('other');

      context.report = report4;
      expect(parse('report | title:forms', context)).to.equal('Form A');
      context.report = report5;
      expect(parse('report | title:forms', context)).to.equal('Form B');
      context.forms = [];
      expect(parse('report | title:forms', context)).to.equal('formb');
    });

    it('should work with phone pipe', async () => {
      pipesService = {
        getPipeNameVsIsPureMap: sinon.stub().returns(new Map([['phone', { pure: true }]])),
        meta: sinon.stub().returns({ pure: true }),
        getInstance: sinon.stub().returns(new PhonePipe(settingsService, sanitizer)),
      };
      provider = new ParseProvider(pipesService);
      await Promise.resolve(); // wait for phonePipe to get settings

      let html = $(parse('"+40 (0744) 36 36 36" | phone'));
      expect(html.find('.desktop-only').html()).to.equal('+40 744 363 636'); // formatted visible
      expect(html.find('.mobile-only').html()).to.equal('+40 744 363 636'); // formatted visible
      expect(html.find('.mobile-only').attr('href')).to.equal('tel:+40 (0744) 36 36 36');

      html = $(parse('phoneNumber | phone', { phoneNumber: '+254722547527' }));
      expect(html.find('.desktop-only').html()).to.equal('+254 722 547527'); // formatted visible
      expect(html.find('.mobile-only').html()).to.equal('+254 722 547527'); // formatted visible
      expect(html.find('.mobile-only').attr('href')).to.equal('tel:+254722547527');
    });
  });
});
