import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { SummaryPipe } from '@mm-pipes/message.pipe';
import { TitlePipe } from '@mm-pipes/message.pipe';

describe('messages pipe', () => {
  @Component({ template: `` })
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
        providers: [
          { provide: TranslateService, useValue: { instant: sinon.stub().returnsArg(0) }},
        ],
        declarations: [
          SummaryPipe,
          TestComponent,
          TitlePipe,
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
