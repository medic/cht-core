import { expect } from 'chai';
import sinon from 'sinon';
import { TestBed } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { ContactMutedService } from '@mm-services/contact-muted.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { SearchService } from '@mm-services/search.service';
import { Select2SearchService } from '@mm-services/select2-search.service';
import { SessionService } from '@mm-services/session.service';
import { SettingsService } from '@mm-services/settings.service';

describe('Select2SearchService', () => {
  let service: Select2SearchService;

  let contactMutedService;
  let lineageModelGeneratorService;
  let sessionService;
  let settingsService;

  let selectEl;
  let val;
  let select2Val;

  beforeEach(() => {
    settingsService = {
      get: sinon.stub().resolves({})
    };
    sessionService = {
      isOnlineOnly: sinon.stub().returns(true)
    };
    lineageModelGeneratorService = {
      contact: sinon.stub()
    };
    contactMutedService = {
      getMuted: sinon.stub().returns(false)
    };

    val = '';
    select2Val = [{}];
    selectEl = {
      append: sinon.stub(),
      children: sinon.stub(),
      on: sinon.stub(),
      select2: sinon.stub().returns(select2Val),
      trigger: sinon.stub(),
      val: sinon.stub().callsFake(v => {
        if (v !== undefined) {
          val = v;
        }
        return val;
      }),
      removeClass: sinon.stub(),
      addClass: sinon.stub()
    };

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
      ],
      providers: [
        { provide: ContactMutedService, useValue: contactMutedService },
        { provide: LineageModelGeneratorService, useValue: lineageModelGeneratorService },
        { provide: SearchService, useValue: { } },
        { provide: SessionService, useValue: sessionService },
        { provide: SettingsService, useValue: settingsService },
      ]
    });
    service = TestBed.inject(Select2SearchService);
  });

  afterEach(() => sinon.restore());

  describe('init', () => {
    it('should set empty value when initial value is empty', async () => {
      await service.init(selectEl, [ 'person' ], {initialValue: ''});
      expect(selectEl.val.callCount).to.equal(3);
      expect(selectEl.val.args[0]).to.deep.equal([ ]);    // first time the component reads the current value
      expect(selectEl.val.args[1]).to.deep.equal([ '' ]); // set the value
      expect(selectEl.val.args[2]).to.deep.equal([ ]);    // read the value
      expect(val).to.equal('');                           // current value ''
      expect(lineageModelGeneratorService.contact.callCount).to.equal(0);   // empty initial value => no calls to DB
      expect(selectEl.trigger.args[0]).to.deep.equal([ 'change' ]);         // the change is notified to the component
    });

    it('should set right value when a valid reference is set', async () => {
      selectEl.children.returns({ length: 0 });
      const person = {
        _id: 'aaa-222-333',
        doc: {
          _id: 'aaa-222-333',
          _rev: '1-000123',
          type: 'person',
          name: 'Charles C'
        },
      };
      lineageModelGeneratorService.contact.resolves(person);
      await service.init(selectEl, [ 'person' ], { initialValue: 'aaa-222-333' });
      expect(selectEl.val.callCount).to.equal(2);
      expect(selectEl.val.args[0]).to.deep.equal([ 'aaa-222-333' ]); // set the value
      expect(selectEl.val.args[1]).to.deep.equal([ ]);               // read the value
      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(lineageModelGeneratorService.contact.args[0]).to.deep.equal([ 'aaa-222-333', { merge: true } ]);
      expect(contactMutedService.getMuted.callCount).to.equal(1);
      expect(contactMutedService.getMuted.args[0]).to.deep.equal([ person.doc ]);
      expect(val).to.equal('aaa-222-333');                           // final value
      expect(select2Val[0]).to.deep.equal({ doc: person.doc });
      expect(selectEl.trigger.callCount).to.equal(1);
      expect(selectEl.trigger.args[0]).to.deep.equal([ 'change' ]);  // the change is notified to the component
    });

    it('should set the id value when a deleted reference is set and fixed label', async () => {
      selectEl.children.returns({ length: 0 });
      lineageModelGeneratorService.contact.rejects({ code: 404, error: 'not found' });
      await service.init(selectEl, ['person'], {initialValue: 'aaa-222-333'});
      expect(selectEl.val.callCount).to.equal(2);
      expect(selectEl.val.args[0]).to.deep.equal([ 'aaa-222-333' ]);  // set the value
      expect(selectEl.val.args[1]).to.deep.equal([ ]);                // read the value
      expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
      expect(lineageModelGeneratorService.contact.args[0]).to.deep.equal([ 'aaa-222-333', { merge: true } ]);
      expect(contactMutedService.getMuted.callCount).to.equal(0);
      expect(val).to.equal('aaa-222-333');                              // final value
      expect(select2Val[0]).to.deep.equal({ text: 'unknown.contact' }); // Label in Select2
      expect(selectEl.trigger.callCount).to.equal(1);
      expect(selectEl.trigger.args[0]).to.deep.equal([ 'change' ]);     // the change is notified to the component
    });
  });
});
