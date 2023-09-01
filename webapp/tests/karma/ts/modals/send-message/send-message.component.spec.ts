import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import sinon from 'sinon';
import { expect } from 'chai';
import { FormsModule } from '@angular/forms';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { SendMessageService } from '@mm-services/send-message.service';
import { Select2SearchService } from '@mm-services/select2-search.service';
import { FormatProvider } from '@mm-providers/format.provider';
import { SettingsService } from '@mm-services/settings.service';
import { ContactTypesService } from '@mm-services/contact-types.service';

describe('SendMessageComponent', () => {
  let component: SendMessageComponent;
  let fixture: ComponentFixture<SendMessageComponent>;
  let formatProvider;
  let settingsService;
  let contactTypesService;
  let matDialogRef;
  let sendMessageService;
  let select2SearchService;

  beforeEach(() => {
    matDialogRef = { close: sinon.stub() };
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
        declarations: [ SendMessageComponent ],
        providers: [
          { provide: SendMessageService, useValue: sendMessageService },
          { provide: Select2SearchService, useValue: select2SearchService },
          { provide: FormatProvider, useValue: formatProvider },
          { provide: SettingsService, useValue: settingsService },
          { provide: ContactTypesService, useValue: contactTypesService },
          { provide: MatDialogRef, useValue: matDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: {} },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(SendMessageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should create', () => {
    expect(component).to.exist;
  });

  it('should close modal', () => {
    component.close();

    expect(matDialogRef.close.calledOnce).to.be.true;
  });
});
