import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { LineagePipe, SummaryPipe, TitlePipe } from '@mm-pipes/message.pipe';
import { Selectors } from '@mm-selectors/index';
import { FormatProvider } from '@mm-providers/format.provider';

describe('messages pipe', () => {
  @Component({
    template: ``,
    standalone: true,
    imports: [SummaryPipe, TitlePipe]
  })
  class TestComponent {
    @Input() forms;
    @Input() message;
  }

  let fixture;

  const override = async(template, { forms, message }: { forms?; message? } = {}) => {
    TestBed.overrideTemplate(TestComponent, template);
    fixture = TestBed.createComponent(TestComponent);
    fixture.componentInstance.forms = forms;
    fixture.componentInstance.message = message;
    fixture.detectChanges();
    await fixture.whenRenderingDone();
  };

  beforeEach(() => {
    TestBed
      .configureTestingModule({
        imports: [SummaryPipe,
          TestComponent,
          TitlePipe,],
        providers: [
          { provide: TranslateService, useValue: { instant: sinon.stub().returnsArg(0) } },
        ]
      })
      .compileComponents();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('summary', () => {
    it('should render nothing when no message', async () => {
      const forms = [
        { code: 'A', title: 'aye' },
        { code: 'B', title: 'bee' },
        { code: 'C', title: 'sea' }
      ];
      await override(`<div [innerHTML]="message | summary:forms"></div>`, { forms });
      expect(fixture.nativeElement.innerText).to.equal('');
    });

    it('should render Message when no form', async() => {
      const forms = [
        { code: 'A', title: 'aye' },
        { code: 'B', title: 'bee' },
        { code: 'C', title: 'sea' }
      ];
      const message = {};

      await override(`<div [innerHTML]="message | summary:forms"></div>`, { message, forms });
      expect(fixture.nativeElement.innerText).to.equal('tasks.0.messages.0.message');
    });

    it('should render form title when form', async() => {
      const forms = [
        { code: 'A', title: 'aye' },
        { code: 'B', title: 'bee' },
        { code: 'C', title: 'sea' }
      ];
      const message = {
        form: 'B'
      };
      await override(`<div [innerHTML]="message | summary:forms"></div>`, { message, forms });
      expect(fixture.nativeElement.innerText).to.equal('bee');
    });
  });

  describe('title', () => {
    it('should render nothing when no message', async() => {
      const forms = [
        { code: 'A', title: 'aye' },
        { code: 'B', title: 'bee' },
        { code: 'C', title: 'sea' }
      ];
      const message = undefined;

      await override(`<div [innerHTML]="message | title:forms"></div>`, { message, forms });
      expect(fixture.nativeElement.querySelector('div').innerHTML).to.equal('');
    });

    it('should render Incoming Message when no form', async() => {
      const forms = [
        { code: 'A', title: 'aye' },
        { code: 'B', title: 'bee' },
        { code: 'C', title: 'sea' }
      ];
      const message = {};

      await override(`<div [innerHTML]="message | title:forms"></div>`, { message, forms });
      expect(fixture.nativeElement.querySelector('div').innerHTML).to.equal('sms_message.message');
    });

    it('should render Outgoing Message when no form and kujua_message is set', async() => {
      const forms = [
        { code: 'A', title: 'aye' },
        { code: 'B', title: 'bee' },
        { code: 'C', title: 'sea' }
      ];
      const message = {
        kujua_message: true
      };

      await override(`<div [innerHTML]="message | title:forms"></div>`, { message, forms });
      expect(fixture.nativeElement.querySelector('div').innerHTML).to.equal('Outgoing Message');
    });

    it('should render form title when form', async() => {
      const forms = [
        { code: 'A', title: 'aye' },
        { code: 'B', title: 'bee' },
        { code: 'C', title: 'sea' }
      ];
      const message = {
        form: 'B'
      };

      await override(`<div [innerHTML]="message | title:forms"></div>`, { message, forms });
      expect(fixture.nativeElement.querySelector('div').innerHTML).to.equal('bee');
    });
  });

});

describe('LineagePipe', () => {
  let pipe: LineagePipe;
  let store: MockStore;
  let formatProvider;

  beforeEach(() => {
    formatProvider = { lineage: sinon.stub().returnsArg(0) };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          selectors: [
            { selector: Selectors.getIsOnlineOnly, value: false },
            { selector: Selectors.getUserFacilities, value: [] },
          ]
        }),
        { provide: FormatProvider, useValue: formatProvider },
        LineagePipe,
      ]
    });

    store = TestBed.inject(MockStore);
    pipe = TestBed.inject(LineagePipe);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('removeUserFacility', () => {
    it('should not filter lineage for online users', () => {
      store.overrideSelector(Selectors.getIsOnlineOnly, true);
      store.overrideSelector(Selectors.getUserFacilities, [{ name: 'Facility A' }]);
      store.refreshState();

      pipe.transform(['Place 1', 'Place 2', 'Facility A']);

      expect(formatProvider.lineage.args[0][0]).to.deep.equal(['Place 1', 'Place 2', 'Facility A']);
    });

    it('should not filter lineage for users with multiple facilities', () => {
      store.overrideSelector(Selectors.getIsOnlineOnly, false);
      store.overrideSelector(Selectors.getUserFacilities, [{ name: 'Facility A' }, { name: 'Facility B' }]);
      store.refreshState();

      pipe.transform(['Place 1', 'Place 2', 'Facility A']);
      expect(formatProvider.lineage.args[0][0]).to.deep.equal(['Place 1', 'Place 2', 'Facility A']);

      pipe.transform(['Place 1', 'Place 2', 'Facility B']);
      expect(formatProvider.lineage.args[1][0]).to.deep.equal(['Place 1', 'Place 2', 'Facility B']);
    });

    it('should not filter lineage when user has no facilities', () => {
      store.overrideSelector(Selectors.getIsOnlineOnly, false);
      store.overrideSelector(Selectors.getUserFacilities, []);
      store.refreshState();

      pipe.transform(['Place 1', 'Place 2', 'Facility A']);

      expect(formatProvider.lineage.args[0][0]).to.deep.equal(['Place 1', 'Place 2', 'Facility A']);
    });

    it('should not filter lineage when no lineage matches user facility', () => {
      store.overrideSelector(Selectors.getIsOnlineOnly, false);
      store.overrideSelector(Selectors.getUserFacilities, [{ name: 'Facility X' }]);
      store.refreshState();

      pipe.transform(['Place 1', 'Place 2', 'Facility A']);

      expect(formatProvider.lineage.args[0][0]).to.deep.equal(['Place 1', 'Place 2', 'Facility A']);
    });

    it('should remove user facility from end of string array lineage', () => {
      store.overrideSelector(Selectors.getIsOnlineOnly, false);
      store.overrideSelector(Selectors.getUserFacilities, [{ name: 'Facility A' }]);
      store.refreshState();

      const lineage = ['Place 1', 'Place 2', 'Facility A'];
      pipe.transform(lineage);

      expect(formatProvider.lineage.args[0][0]).to.deep.equal(['Place 1', 'Place 2']);
    });

    it('should remove user facility from end of object array lineage', () => {
      store.overrideSelector(Selectors.getIsOnlineOnly, false);
      store.overrideSelector(Selectors.getUserFacilities, [{ name: 'Facility A' }]);
      store.refreshState();

      const lineage = [{ name: 'Place 1' }, { name: 'Place 2' }, { name: 'Facility A' }];
      pipe.transform(lineage);

      expect(formatProvider.lineage.args[0][0]).to.deep.equal([{ name: 'Place 1' }, { name: 'Place 2' }]);
    });

    it('should not remove facility if it is not at the end of lineage', () => {
      store.overrideSelector(Selectors.getIsOnlineOnly, false);
      store.overrideSelector(Selectors.getUserFacilities, [{ name: 'Facility A' }]);
      store.refreshState();

      const lineage = ['Facility A', 'Place 1', 'Place 2'];
      pipe.transform(lineage);

      expect(formatProvider.lineage.args[0][0]).to.deep.equal(['Facility A', 'Place 1', 'Place 2']);
    });

    it('should filter out null/undefined values from lineage', () => {
      store.overrideSelector(Selectors.getIsOnlineOnly, false);
      store.overrideSelector(Selectors.getUserFacilities, [{ name: 'Facility A' }]);
      store.refreshState();

      const lineage = ['Place 1', null, 'Place 2', undefined, 'Facility A'];
      pipe.transform(lineage);

      expect(formatProvider.lineage.args[0][0]).to.deep.equal(['Place 1', 'Place 2']);
    });

    it('should handle empty lineage array', () => {
      store.overrideSelector(Selectors.getIsOnlineOnly, false);
      store.overrideSelector(Selectors.getUserFacilities, [{ name: 'Facility A' }]);
      store.refreshState();

      const lineage = [];
      pipe.transform(lineage);

      expect(formatProvider.lineage.args[0][0]).to.deep.equal([]);
    });

    it('should handle lineage with only null values', () => {
      store.overrideSelector(Selectors.getIsOnlineOnly, false);
      store.overrideSelector(Selectors.getUserFacilities, [{ name: 'Facility A' }]);
      store.refreshState();

      const lineage = [null, undefined, null];
      pipe.transform(lineage);

      expect(formatProvider.lineage.args[0][0]).to.deep.equal([]);
    });

    it('should pass through non-array values unchanged', () => {
      store.overrideSelector(Selectors.getIsOnlineOnly, false);
      store.overrideSelector(Selectors.getUserFacilities, [{ name: 'Facility A' }]);
      store.refreshState();

      const lineage = { parent: { name: 'Place 1' } };
      pipe.transform(lineage);

      expect(formatProvider.lineage.args[0][0]).to.deep.equal({ parent: { name: 'Place 1' } });
    });

    it('should handle facility with undefined name', () => {
      store.overrideSelector(Selectors.getIsOnlineOnly, false);
      store.overrideSelector(Selectors.getUserFacilities, [{ name: undefined }]);
      store.refreshState();

      const lineage = ['Place 1', 'Place 2'];
      pipe.transform(lineage);

      expect(formatProvider.lineage.args[0][0]).to.deep.equal(['Place 1', 'Place 2']);
    });
  });
});
