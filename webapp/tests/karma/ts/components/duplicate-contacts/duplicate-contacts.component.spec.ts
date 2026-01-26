import sinon from 'sinon';
import { expect } from 'chai';
import { Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormService } from '@mm-services/form.service';
import { TranslateService } from '@mm-services/translate.service';
import { DuplicateContactsComponent } from '@mm-components/duplicate-contacts/duplicate-contacts.component';

describe('DuplicateContactsComponent', () => {
  let component: DuplicateContactsComponent;
  let fixture: ComponentFixture<DuplicateContactsComponent>;
  let router;
  let formService;
  let loadContactSummary;
  let translateService;
  let consoleError;

  beforeEach(async () => {
    router = { navigate: sinon.stub() };
    loadContactSummary = sinon.stub();
    formService = formService = {
      loadContactSummary: loadContactSummary,
    };
    translateService = { get: sinon.stub().resolvesArg(0) };
    consoleError = sinon.stub(console, 'error');

    await TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: FormService, useValue: formService },
        { provide: TranslateService, useValue: translateService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DuplicateContactsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sinon.restore());

  it('should navigate to the duplicate item', () => {
    component.duplicate = {
      _id: 'some_id',
      _rev: '1',
      contact_type: 'some_type',
      type: '',
      name: 'test name',
      short_name: 'tn',
      date_of_birth: '1966-04-11',
      dob_type: 'exact',
      reported_date: 1740472311000
    };
    component.navigateToDuplicate();

    expect(router.navigate.callCount).to.equal(1);
    expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'some_id']]);
  });

  describe('loadContactSummary', () => {
    it('should initialize the contact summary', async () => {
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
        reported_date: 1740472311000
      };

      await component.loadContactSummary();

      expect(loadContactSummary.calledOnceWithExactly(component.duplicate)).to.be.true;
      expect(component.contactSummary).to.deep.equal([
        { label: 'label.short_name', value: 'tp1' },
        { label: 'label.dob_type', value: 'exact' },
      ]);
      expect(component.isLoading).to.be.false;
      expect(component.error).to.be.undefined;
      expect(consoleError.notCalled).to.be.true;
      expect(translateService.get.notCalled).to.be.true;
    });

    it('catch summary resolution errors', async () => {
      const expectedError = new Error('some error');
      loadContactSummary.rejects(expectedError);
      component.duplicate = {
        _id: 'some_id',
        _rev: '2',
        name: 'test name',
        contact_type: 'some_type',
        type: '',
        short_name: 'tn',
        date_of_birth: '1966-04-11',
        dob_type: 'exact',
        reported_date: 1740472311000
      };

      await component.loadContactSummary();

      expect(loadContactSummary.calledOnceWithExactly(component.duplicate)).to.be.true;
      expect(component.isLoading).to.be.false;
      expect(component.error).to.equal('duplicate_check.contact.summary_error');
      expect(consoleError.calledOnceWithExactly(expectedError)).to.be.true;
      expect(translateService.get.calledOnceWithExactly('duplicate_check.contact.summary_error')).to.be.true;
    });

    it('avoids re-loading contact summary when already loading', async () => {
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
        reported_date: 1740472311000
      };
      expect(component.contactSummary).to.be.undefined;
      expect(component.isLoading).to.be.false;

      // Trigger an initial load, but delay completion
      const promisedLoad = component.loadContactSummary();

      expect(component.contactSummary).to.be.undefined;
      expect(component.isLoading).to.be.true;

      // Trigger a second load
      await component.loadContactSummary();
      // Await initial load
      await promisedLoad;

      // Should only load contact summary once
      expect(loadContactSummary.calledOnceWithExactly(component.duplicate)).to.be.true;
      expect(component.contactSummary).to.deep.equal([
        { label: 'label.short_name', value: 'tp1' },
        { label: 'label.dob_type', value: 'exact' },
      ]);
      expect(component.isLoading).to.be.false;
      expect(component.error).to.be.undefined;
      expect(consoleError.notCalled).to.be.true;
      expect(translateService.get.notCalled).to.be.true;
    });

    it('avoids loading contact summary when already loaded', async () => {
      const expectedContactSummary = { fields: [
        { label: 'label.short_name', value: 'tp1' },
        { label: 'label.dob_type', value: 'exact' },
      ] };
      component.contactSummary = expectedContactSummary;

      await component.loadContactSummary();

      expect(loadContactSummary.notCalled).to.be.true;
      expect(component.contactSummary).to.equal(expectedContactSummary);
      expect(component.isLoading).to.be.false;
      expect(component.error).to.be.undefined;
      expect(consoleError.notCalled).to.be.true;
      expect(translateService.get.notCalled).to.be.true;
    });

    it('avoids loading contact summary when no duplicate is set', async () => {
      await component.loadContactSummary();

      expect(loadContactSummary.notCalled).to.be.true;
      expect(component.contactSummary).to.be.undefined;
      expect(component.isLoading).to.be.false;
      expect(component.error).to.be.undefined;
      expect(consoleError.notCalled).to.be.true;
      expect(translateService.get.notCalled).to.be.true;
    });
  });
});
