import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BsModalRef } from 'ngx-bootstrap/modal';
import sinon from 'sinon';
import { expect } from 'chai';
import { FormsModule } from '@angular/forms';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { MmModal, MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { BulkDeleteConfirmComponent } from '@mm-modals/bulk-delete-confirm/bulk-delete-confirm.component';
import { DeleteDocsService } from '@mm-services/delete-docs.service';
import { TelemetryService } from '@mm-services/telemetry.service';

describe('BulkDeleteConfirmComponent', () => {
  let component: BulkDeleteConfirmComponent;
  let fixture: ComponentFixture<BulkDeleteConfirmComponent>;
  let deleteDocsService;
  let bdModalRef;
  let setProcessing;
  let setFinished;
  let setError;
  let telemetryService;

  beforeEach(waitForAsync(() => {
    bdModalRef = {
      hide: sinon.stub(),
      onHidden: new Subject(),
      onHide: new Subject(),
    };
    deleteDocsService = { delete: sinon.stub().resolves() };
    telemetryService = { record: sinon.stub() };

    setProcessing = sinon.stub(MmModalAbstract.prototype, 'setProcessing');
    setFinished = sinon.stub(MmModalAbstract.prototype, 'setFinished');
    setError = sinon.stub(MmModalAbstract.prototype, 'setError');

    return TestBed
      .configureTestingModule({
        imports: [
          FormsModule,
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          BulkDeleteConfirmComponent,
          MmModal,
        ],
        providers: [
          { provide: BsModalRef, useValue: bdModalRef },
          { provide: DeleteDocsService, useValue: deleteDocsService },
          { provide: TelemetryService, useValue: telemetryService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(BulkDeleteConfirmComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create', () => {
    expect(component).to.exist;
    expect(component.deleteComplete).to.equal(false);
  });

  it('close() should call hide from BsModalRef', () => {
    component.close();

    expect(bdModalRef.hide.callCount).to.equal(1);
  });

  describe('submit', () => {
    it('should handle missing data', async() => {
      component.model = undefined;
      await component.submit();
      expect(component.totalDocsSelected).to.equal(0);
      expect(deleteDocsService.delete.callCount).to.equal(1);
      expect(deleteDocsService.delete.args[0][0]).to.deep.equal([]);
    });

    it('should set correct properties and call delete service correctly', async () => {
      component.model = {
        docs: [
          { _id: 'doc1', field: 1 },
          { _id: 'doc2', field: 2 },
          { _id: 'doc3', field: 3 },
        ],
        type: 'reports',
      };
      const promise = component.submit();
      expect(setProcessing.callCount).to.equal(1);
      expect(setFinished.callCount).to.equal(0);
      expect(component.totalDocsSelected).to.equal(3);
      expect(component.totalDocsDeleted).to.equal(0);
      await promise;
      expect(setProcessing.callCount).to.equal(1);
      expect(setFinished.callCount).to.equal(1);
      expect(setError.callCount).to.equal(0);
      expect(deleteDocsService.delete.callCount).to.equal(1);
      expect(deleteDocsService.delete.args[0][0]).to.deep.equal([
        { _id: 'doc1', field: 1 },
        { _id: 'doc2', field: 2 },
        { _id: 'doc3', field: 3 },
      ]);
      expect(component.deleteComplete).to.equal(true);
      expect(telemetryService.record.calledOnce).to.be.true;
      expect(telemetryService.record.args[0]).to.have.members([ 'bulk_delete:reports', 3 ]);
    });

    it('should catch deletion errors', async () => {
      deleteDocsService.delete.rejects({ some: 'error' });
      component.model = {
        docs: [
          { _id: 'doc1', field: 'a' },
          { _id: 'doc2', field: 'b' },
        ],
        type: 'reports',
      };
      const promise = component.submit();
      expect(setProcessing.callCount).to.equal(1);
      expect(setFinished.callCount).to.equal(0);
      expect(component.totalDocsSelected).to.equal(2);
      expect(component.totalDocsDeleted).to.equal(0);
      await promise;
      expect(setProcessing.callCount).to.equal(1);
      expect(setFinished.callCount).to.equal(0);
      expect(setError.callCount).to.equal(1);
      expect(setError.args[0]).to.deep.equal([
        { some: 'error' },
        'Error deleting document'
      ]);
      expect(deleteDocsService.delete.callCount).to.equal(1);
      expect(deleteDocsService.delete.args[0][0]).to.deep.equal([
        { _id: 'doc1', field: 'a' },
        { _id: 'doc2', field: 'b' },
      ]);
      expect(component.deleteComplete).to.equal(false);
      expect(telemetryService.record.notCalled).to.be.true;
    });

    it('progress callback should work correctly', async () => {
      component.model = {
        docs: [
          { _id: 'doc1', field: 'a' },
          { _id: 'doc2', field: 'b' },
        ],
        type: 'reports',
      };
      const promise = component.submit();
      const callback = deleteDocsService.delete.args[0][1].progress;
      expect(component.totalDocsDeleted).to.equal(0);
      callback(10);
      expect(component.totalDocsDeleted).to.equal(10);
      callback(21);
      expect(component.totalDocsDeleted).to.equal(21);
      await promise;
    });
  });
});
