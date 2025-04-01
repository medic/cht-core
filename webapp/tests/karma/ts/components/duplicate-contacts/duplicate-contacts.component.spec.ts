import sinon from 'sinon';
import { expect } from 'chai';
import { Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { FormService } from '@mm-services/form.service';
import { TranslateService } from '@mm-services/translate.service';
import { Selectors } from '@mm-selectors/index';
import { FormatDateService } from '@mm-services/format-date.service';
import { DuplicateContactsComponent } from '@mm-components/duplicate-contacts/duplicate-contacts.component';

describe('DuplicateContactsComponent', () => {
  let component: DuplicateContactsComponent;
  let fixture: ComponentFixture<DuplicateContactsComponent>;
  let router;
  let formService;
  let loadContactSummary;
  let translateService;
  let formatDateService;

  beforeEach(async () => {
    router = { navigate: sinon.stub() };
    loadContactSummary = sinon.stub();
    formService = formService = {
      loadContactSummary: loadContactSummary,
    };
    translateService = { get: sinon.stub().resolvesArg(0) };
    formatDateService = { init: sinon.stub() };

    const mockedSelectors = [
      { selector: Selectors.getEnketoStatus, value: {} },
      { selector: Selectors.getEnketoSavingStatus, value: false },
      { selector: Selectors.getEnketoEditedStatus, value: false },
      { selector: Selectors.getEnketoError, value: false },
      { selector: Selectors.getLoadingContent, value: false },
      { selector: Selectors.getCancelCallback, value: undefined },
    ];

    await TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        DuplicateContactsComponent
      ],
      providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: Router, useValue: router },
        { provide: FormService, useValue: formService },
        { provide: TranslateService, useValue: translateService },
        { provide: FormatDateService, useValue: formatDateService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DuplicateContactsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sinon.restore());

  it('should navigate to the duplicate item', async () => {
    component.duplicate = {
      _id: 'some_id',
      _rev: '1',
      contact_type: 'some_type',
      type: '',
      name: 'test name',
      short_name: 'tn',
      date_of_birth: '1966-04-11',
      dob_type: 'exact',
      reported_date: new Date('1740472311000')
    };
    component._navigateToDuplicate();

    expect(router.navigate.callCount).to.equal(1);
    expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'some_id']]);
  });

  it('should return a contact summary', async () => {
    loadContactSummary.resolves([
      { label: 'label.short_name', value: 'tp1' },
      { label: 'label.dob_type', value: 'exact' },
    ]);
    component.duplicate = {
      _id: 'some_id',
      _rev: '1',
      contact_type: 'some_type',
      type: '',
      name: 'test name',
      short_name: 'tn',
      date_of_birth: '1966-04-11',
      dob_type: 'exact',
      reported_date: new Date('1740472311000')
    };
    await component._loadContactSummary();
    const sanitizedContact = loadContactSummary.getCall(0).args[0];
    expect(sanitizedContact).to.not.have.property('name');
    expect(sanitizedContact).to.not.have.property('reported_date');
    expect(component._summary).to.deep.equal([
      { label: 'label.short_name', value: 'tp1' },
      { label: 'label.dob_type', value: 'exact' },
    ]);
  });

  it('catch summary resolution errors', async () => {
    loadContactSummary.throws(new Error('some error'));
    component.duplicate = {
      _id: 'some_id',
      _rev: '2',
      name: 'test name',
      contact_type: 'some_type',
      type: '',
      short_name: 'tn',
      date_of_birth: '1966-04-11',
      dob_type: 'exact',
      reported_date: new Date('1740472311000')
    };
    try {
      await component._loadContactSummary();
    } catch (e) {
      expect(e.message).to.equal('Contact with ID some_id not found');
    }
    expect(loadContactSummary.callCount).to.equal(1);
  });
});
