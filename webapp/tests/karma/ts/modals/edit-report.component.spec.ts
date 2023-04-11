import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BsModalRef } from 'ngx-bootstrap/modal';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { MmModal, MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { EditReportComponent } from '@mm-modals/edit-report/edit-report.component';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { Select2SearchService } from '@mm-services/select2-search.service';
import { UpdateFacilityService } from '@mm-services/update-facility.service';

describe('EditReportComponent', () => {
  let component: EditReportComponent;
  let fixture: ComponentFixture<EditReportComponent>;
  let bdModalRef;
  let setProcessing;
  let setFinished;
  let setError;
  let contactTypesService;
  let select2SearchService;
  let updateFacilityService;

  beforeEach(waitForAsync(() => {
    bdModalRef = {
      hide: sinon.stub(),
      onHidden: new Subject(),
      onHide: new Subject(),
    };

    contactTypesService = { getPersonTypes: sinon.stub() };
    select2SearchService = { init: sinon.stub() };
    updateFacilityService = { update: sinon.stub() };

    setProcessing = sinon.stub(MmModalAbstract.prototype, 'setProcessing');
    setFinished = sinon.stub(MmModalAbstract.prototype, 'setFinished');
    setError = sinon.stub(MmModalAbstract.prototype, 'setError');

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          EditReportComponent,
          MmModal,
        ],
        providers: [
          { provide: BsModalRef, useValue: bdModalRef },
          { provide: ContactTypesService, useValue: contactTypesService },
          { provide: Select2SearchService, useValue: select2SearchService },
          { provide: UpdateFacilityService, useValue: updateFacilityService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(EditReportComponent);
        component = fixture.componentInstance;
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create', () => {
    expect(component).to.exist;
    expect(setError.callCount).to.equal(0);
    expect(setProcessing.callCount).to.equal(0);
    expect(setFinished.callCount).to.equal(0);
  });

  it('should close select2 when modal is hidden', () => {
    const select2Handler = sinon.stub($.fn, 'select2');
    // @ts-ignore
    sinon.spy($, 'find');
    bdModalRef.onHidden.next();
    expect(select2Handler.callCount).to.equal(1);
    expect(select2Handler.args[0]).to.deep.equal(['close']);
    // @ts-ignore
    expect($.find.args[0][0]).to.equal('#edit-report [name=facility]');
  });

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
      component.model.report = {
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
      component.model.report = {
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
      const consoleErrorMock = sinon.stub(console, 'error');
      contactTypesService.getPersonTypes.rejects();

      await component.ngAfterViewInit();

      expect(contactTypesService.getPersonTypes.callCount).to.equal(1);
      expect(select2SearchService.init.callCount).to.equal(0);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error initialising select2');
    });

    it('should catch select2 init errors', async () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      contactTypesService.getPersonTypes.resolves([{ id: 'patient', some: 'field' }]);
      select2SearchService.init.rejects();

      await component.ngAfterViewInit();
      expect(contactTypesService.getPersonTypes.callCount).to.equal(1);
      expect(select2SearchService.init.callCount).to.equal(1);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error initialising select2');
    });
  });

  describe('submit', () => {
    it('should set error if no report', async () => {
      component.model = undefined;

      await component.submit();
      expect(setError.callCount).to.equal(1);
      expect(setError.args[0][1]).to.equal('Error updating facility');

      expect(bdModalRef.hide.callCount).to.equal(0);
      expect(setProcessing.callCount).to.equal(0);
      expect(updateFacilityService.update.callCount).to.equal(0);
    });

    it('should set error if no selected facility', async () => {
      component.model = { report: { _id: 'report', field: 'a' } };
      sinon.stub($.fn, 'val').returns(undefined);

      await component.submit();
      expect(setError.callCount).to.equal(1);
      expect(setError.args[0][1]).to.equal('Please select a facility');

      expect(bdModalRef.hide.callCount).to.equal(0);
      expect(setProcessing.callCount).to.equal(0);
      expect(updateFacilityService.update.callCount).to.equal(0);
    });

    it('should not update if no changes are made', async () => {
      component.model = { report: { _id: 'report', field: 'a', from: 'number' } };
      sinon.stub($.fn, 'val').returns('number');

      await component.submit();
      expect(setError.callCount).to.equal(0);
      expect(setProcessing.callCount).to.equal(0);
      expect(setFinished.callCount).to.equal(0);
      expect(updateFacilityService.update.callCount).to.equal(0);
      expect(bdModalRef.hide.callCount).to.equal(1);
    });

    it('should update if changes have been made', async () => {
      component.model = { report: { _id: 'report', field: 'a' } };
      sinon.stub($.fn, 'val').returns('the_facility_id');
      updateFacilityService.update.resolves();

      const promise = component.submit();
      expect(setError.callCount).to.equal(0);
      expect(setProcessing.callCount).to.equal(1);
      expect(setFinished.callCount).to.equal(0);
      expect(updateFacilityService.update.callCount).to.equal(1);
      expect(updateFacilityService.update.args[0]).to.deep.equal([ 'report', 'the_facility_id' ]);
      expect(bdModalRef.hide.callCount).to.equal(0);

      await promise;
      expect(setFinished.callCount).to.equal(1);
      expect(bdModalRef.hide.callCount).to.equal(1);
      expect(setError.callCount).to.equal(0);
    });

    it('should catch updateFacility errors', async () => {
      component.model = { report: { _id: 'rep_id', field: 'a' } };
      sinon.stub($.fn, 'val').returns('some_facility');
      updateFacilityService.update.rejects({ error: 'boom' });

      const promise = component.submit();
      expect(setError.callCount).to.equal(0);
      expect(setProcessing.callCount).to.equal(1);
      expect(setFinished.callCount).to.equal(0);
      expect(updateFacilityService.update.callCount).to.equal(1);
      expect(updateFacilityService.update.args[0]).to.deep.equal([ 'rep_id', 'some_facility' ]);
      expect(bdModalRef.hide.callCount).to.equal(0);

      await promise;
      expect(setFinished.callCount).to.equal(0);
      expect(bdModalRef.hide.callCount).to.equal(0);
      expect(setError.callCount).to.equal(1);
      expect(setError.args[0]).to.deep.equal([
        { error: 'boom' },
        'Error updating facility',
      ]);
    });
  });

});
