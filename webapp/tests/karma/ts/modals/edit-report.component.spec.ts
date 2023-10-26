import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { EditReportComponent } from '@mm-modals/edit-report/edit-report.component';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { Select2SearchService } from '@mm-services/select2-search.service';
import { UpdateFacilityService } from '@mm-services/update-facility.service';
import { ModalLayoutComponent } from '@mm-components/modal-layout/modal-layout.component';
import { PanelHeaderComponent } from '@mm-components/panel-header/panel-header.component';

describe('EditReportComponent', () => {
  let component: EditReportComponent;
  let fixture: ComponentFixture<EditReportComponent>;
  let contactTypesService;
  let select2SearchService;
  let updateFacilityService;
  let matDialogRef;
  let consoleErrorStub;
  const afterClosed$ = new Subject();

  beforeEach(() => {
    matDialogRef = { close: sinon.stub(), afterClosed: sinon.stub().returns(afterClosed$) };
    consoleErrorStub = sinon.stub(console, 'error');
    contactTypesService = { getPersonTypes: sinon.stub() };
    select2SearchService = { init: sinon.stub() };
    updateFacilityService = { update: sinon.stub() };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          EditReportComponent,
          ModalLayoutComponent,
          PanelHeaderComponent,
        ],
        providers: [
          { provide: ContactTypesService, useValue: contactTypesService },
          { provide: Select2SearchService, useValue: select2SearchService },
          { provide: UpdateFacilityService, useValue: updateFacilityService },
          { provide: MatDialogRef, useValue: matDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: {} },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(EditReportComponent);
        component = fixture.componentInstance;
      });
  });

  afterEach(() => sinon.restore());

  it('should create', () => {
    expect(component).to.exist;
    expect(component.processing).to.be.false;
  });

  it('should close modal', () => {
    component.close();

    expect(matDialogRef.close.calledOnce).to.be.true;
  });

  it('should close select2 when modal is hidden', fakeAsync(() => {
    contactTypesService.getPersonTypes.resolves();
    const select2Handler = sinon.stub($.fn, 'select2');
    // @ts-ignore
    sinon.spy($, 'find');

    component.ngAfterViewInit();
    afterClosed$.next(true);
    flush();

    expect(select2Handler.callCount).to.equal(1);
    expect(select2Handler.args[0]).to.deep.equal(['close']);
    // @ts-ignore
    expect($.find.args[0][0]).to.equal('#edit-report [name=facility]');
  }));

  describe('ngAfterViewInit', () => {
    it('should init select2 with person contact types', async () => {
      contactTypesService.getPersonTypes.resolves([
        { id: 'person', some: 'field' },
        { id: 'chw', other: 'field' },
        { id: 'patient', name: 'patient' },
      ]);
      select2SearchService.init.resolves();
      // @ts-ignore
      sinon.spy($, 'find');

      await component.ngAfterViewInit();

      expect(contactTypesService.getPersonTypes.callCount).to.equal(1);
      expect(select2SearchService.init.callCount).to.equal(1);
      const selector = $('#edit-report [name=facility]');
      expect(select2SearchService.init.args[0]).to.deep.equal([
        selector,
        [ 'person', 'chw', 'patient' ],
        {
          allowNew: false,
          initialValue: undefined,
        }
      ]);
      // @ts-ignore
      expect($.find.args[0][0]).to.equal('#edit-report [name=facility]');
    });

    it('should pass report from as fallback', async () => {
      component.report = {
        _id: 'report',
        type: 'data_record',
        from: 'the_phone',
        fields: { patient_id: 'the_patient' },
      };
      contactTypesService.getPersonTypes.resolves([{ id: 'person', some: 'field' }]);
      select2SearchService.init.resolves();

      await component.ngAfterViewInit();

      const selector = $('#edit-report [name=facility]');
      expect(select2SearchService.init.args[0]).to.deep.equal([
        selector,
        [ 'person' ],
        {
          allowNew: false,
          initialValue: 'the_phone',
        }
      ]);
    });

    it('should pass report contact as initialValue', async () => {
      component.report = {
        _id: 'report',
        type: 'data_record',
        from: 'the_phone',
        contact: { _id: 'the_contact', phone: 'the_phone' },
        fields: { patient_id: 'the_patient' },
      };
      contactTypesService.getPersonTypes.resolves([{ id: 'patient', some: 'field' }]);
      select2SearchService.init.resolves();

      await component.ngAfterViewInit();

      const selector = $('#edit-report [name=facility]');
      expect(select2SearchService.init.args[0]).to.deep.equal([
        selector,
        [ 'patient' ],
        {
          allowNew: false,
          initialValue: 'the_contact',
        }
      ]);
    });

    it('should catch contactTypes errors', async () => {
      sinon.resetHistory();
      contactTypesService.getPersonTypes.rejects();

      await component.ngAfterViewInit();

      expect(contactTypesService.getPersonTypes.calledOnce).to.be.true;
      expect(select2SearchService.init.notCalled).to.be.true;
      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.args[0][0]).to.equal('Error initialising select2');
    });

    it('should catch select2 init errors', async () => {
      sinon.resetHistory();
      contactTypesService.getPersonTypes.resolves([{ id: 'patient', some: 'field' }]);
      select2SearchService.init.rejects();

      await component.ngAfterViewInit();

      expect(contactTypesService.getPersonTypes.calledOnce).to.be.true;
      expect(select2SearchService.init.calledOnce).to.be.true;
      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.args[0][0]).to.equal('Error initialising select2');
    });
  });

  describe('submit', () => {
    it('should set error if no report', async () => {
      sinon.resetHistory();
      component.report = undefined;

      await component.submit();

      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.args[0]).to.have.deep.members([
        'Error updating facility',
        new Error('Validation error'),
      ]);
      expect(matDialogRef.close.notCalled).to.be.true;
      expect(component.processing).to.be.false;
      expect(updateFacilityService.update.notCalled).to.be.true;
    });

    it('should set error if no selected facility', async () => {
      sinon.resetHistory();
      component.report = { _id: 'report', field: 'a' };
      sinon.stub($.fn, 'val').returns(undefined);

      await component.submit();

      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.args[0]).to.have.deep.members([
        'Please select a facility',
        new Error('Validation error'),
      ]);
      expect(matDialogRef.close.notCalled).to.be.true;
      expect(component.processing).to.be.false;
      expect(updateFacilityService.update.notCalled).to.be.true;
    });

    it('should not update if no changes are made', async () => {
      sinon.resetHistory();
      component.report = { _id: 'report', field: 'a', from: 'number' };
      sinon.stub($.fn, 'val').returns('number');

      await component.submit();

      expect(matDialogRef.close.calledOnce).to.be.true;
      expect(consoleErrorStub.notCalled).to.be.true;
      expect(component.processing).to.be.false;
      expect(updateFacilityService.update.notCalled).to.be.true;
    });

    it('should update if changes have been made', async () => {
      sinon.resetHistory();
      component.report = { _id: 'report', field: 'a' };
      sinon.stub($.fn, 'val').returns('the_facility_id');
      updateFacilityService.update.resolves();

      const promise = component.submit();

      expect(consoleErrorStub.notCalled).to.be.true;
      expect(component.processing).to.be.true;
      expect(updateFacilityService.update.calledOnce).to.be.true;
      expect(updateFacilityService.update.args[0]).to.deep.equal([ 'report', 'the_facility_id' ]);
      expect(matDialogRef.close.notCalled).to.be.true;

      await promise;

      expect(consoleErrorStub.notCalled).to.be.true;
      expect(component.processing).to.be.false;
      expect(matDialogRef.close.calledOnce).to.be.true;
    });

    it('should catch updateFacility errors', async () => {
      sinon.resetHistory();
      component.report = { _id: 'rep_id', field: 'a' };
      sinon.stub($.fn, 'val').returns('some_facility');
      updateFacilityService.update.rejects({ error: 'boom' });

      const promise = component.submit();

      expect(consoleErrorStub.notCalled).to.be.true;
      expect(component.processing).to.be.true;
      expect(updateFacilityService.update.calledOnce).to.be.true;
      expect(updateFacilityService.update.args[0]).to.deep.equal([ 'rep_id', 'some_facility' ]);
      expect(matDialogRef.close.notCalled).to.be.true;

      await promise;

      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.args[0]).to.deep.equal([
        'Error updating facility',
        { error: 'boom' },
      ]);
      expect(component.processing).to.be.false;
      expect(matDialogRef.close.notCalled).to.be.true;
    });
  });

});
