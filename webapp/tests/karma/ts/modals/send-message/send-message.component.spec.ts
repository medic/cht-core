import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BsModalRef } from 'ngx-bootstrap/modal';
import sinon from 'sinon';
import { expect } from 'chai';
import { FormsModule } from '@angular/forms';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { SendMessageService } from '@mm-services/send-message.service';
import { Select2SearchService } from '@mm-services/select2-search.service';
import { FormatProvider } from '@mm-providers/format.provider';
import { SettingsService } from '@mm-services/settings.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { MmModal } from '@mm-modals/mm-modal/mm-modal';

describe('SendMessageComponent', () => {
  let component: SendMessageComponent;
  let fixture: ComponentFixture<SendMessageComponent>;
  let formatProvider;
  let settingsService;
  let contactTypesService;
  let bdModalRef;
  let sendMessageService;
  let select2SearchService;

  beforeEach(waitForAsync(() => {
    bdModalRef = { hide: sinon.stub(), onHide: new Subject() };
    sendMessageService = { send: sinon.stub() };
    select2SearchService = { init: sinon.stub().resolves() };
    formatProvider = {};
    settingsService = { get: sinon.stub().resolves() };
    contactTypesService = { getAll: sinon.stub().resolves() };

    return TestBed
      .configureTestingModule({
        imports: [
          FormsModule,
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          SendMessageComponent,
          MmModal,
        ],
        providers: [
          { provide: BsModalRef, useValue: bdModalRef },
          { provide: SendMessageService, useValue: sendMessageService },
          { provide: Select2SearchService, useValue: select2SearchService },
          { provide: FormatProvider, useValue: formatProvider },
          { provide: SettingsService, useValue: settingsService },
          { provide: ContactTypesService, useValue: contactTypesService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(SendMessageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create', () => {
    expect(component).to.exist;
  });

  it('close() should call hide from BsModalRef', () => {
    component.close();

    expect(bdModalRef.hide.callCount).to.equal(1);
  });
});
