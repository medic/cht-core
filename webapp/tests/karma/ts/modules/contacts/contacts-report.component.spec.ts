import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';

import { ContactsReportComponent } from '@mm-modules/contacts/contacts-report.component';
import { ContactsActions } from '@mm-actions/contacts';
import { GlobalActions } from '@mm-actions/global';
import { EnketoService } from '@mm-services/enketo.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { Selectors } from '@mm-selectors/index';
import { TelemetryService } from '@mm-services/telemetry.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { TranslateFromService } from '@mm-services/translate-from.service';

describe('contacts report component', () => {
  let component: ContactsReportComponent;
  let fixture: ComponentFixture<ContactsReportComponent>;
  let enketoService;
  let geolocationService;
  let geoHandle;
  let telemetryService;
  let xmlFormsService;
  let translateFromService;
  let router;
  let route;

  beforeEach(() => {
    enketoService = {
      unload: sinon.stub(),
      save: sinon.stub(),
      render: sinon.stub().resolves(),
    };
    xmlFormsService = { get: sinon.stub().resolves() };
    geoHandle = { cancel: sinon.stub() };
    geolocationService = { init: sinon.stub().returns(geoHandle) };
    telemetryService = { record: sinon.stub() };
    translateFromService = { get: sinon.stub() };
    router = { navigate: sinon.stub() };
    route = { params: { subscribe: sinon.stub() }, snapshot: { params: {} } };
    const mockedSelectors = [
      { selector: Selectors.getSelectedContact, value: {} },
      { selector: Selectors.getEnketoStatus, value: {} },
      { selector: Selectors.getEnketoSavingStatus, value: false },
      { selector: Selectors.getEnketoError, value: false },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
        ],
        declarations: [
          ContactsReportComponent
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: EnketoService, useValue: enketoService },
          { provide: GeolocationService, useValue: geolocationService },
          { provide: TelemetryService, useValue: telemetryService },
          { provide: XmlFormsService, useValue: xmlFormsService },
          { provide: TranslateFromService, useValue: translateFromService },
          { provide: ActivatedRoute, useValue: route },
          { provide: Router, useValue: router },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ContactsReportComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  });

  afterEach(() => {
    sinon.restore();
  });

  it.only('should create ContactsReportComponent', () => {
    expect(component).to.exist;
  });
});
