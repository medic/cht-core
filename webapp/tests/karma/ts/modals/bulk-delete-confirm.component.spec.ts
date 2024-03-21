import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';

import { BulkDeleteConfirmComponent } from '@mm-modals/bulk-delete-confirm/bulk-delete-confirm.component';
import { DeleteDocsService } from '@mm-services/delete-docs.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { ModalLayoutComponent } from '@mm-components/modal-layout/modal-layout.component';
import { PanelHeaderComponent } from '@mm-components/panel-header/panel-header.component';

describe('BulkDeleteConfirmComponent', () => {
  let component: BulkDeleteConfirmComponent;
  let fixture: ComponentFixture<BulkDeleteConfirmComponent>;
  let deleteDocsService;
  let telemetryService;
  let matDialogRef;
  let consoleErrorStub;

  beforeEach(() => {
    deleteDocsService = { delete: sinon.stub().resolves() };
    telemetryService = { record: sinon.stub() };
    matDialogRef = { close: sinon.stub() };
    consoleErrorStub = sinon.stub(console, 'error');

    return TestBed
      .configureTestingModule({
        imports: [
          FormsModule,
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          BulkDeleteConfirmComponent,
          ModalLayoutComponent,
          PanelHeaderComponent
        ],
        providers: [
          { provide: DeleteDocsService, useValue: deleteDocsService },
          { provide: TelemetryService, useValue: telemetryService },
          { provide: MatDialogRef, useValue: matDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: {} },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(BulkDeleteConfirmComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
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

  describe('submit', () => {
    it('should handle missing data', fakeAsync(() => {
      sinon.resetHistory();
      component.docs = [];
      component.type = '';

      component.submit(false);
      flush();

      expect(component.totalDocsSelected).to.equal(0);
      expect(consoleErrorStub.notCalled).to.be.true;
      expect(deleteDocsService.delete.calledOnce).to.be.true;
      expect(deleteDocsService.delete.args[0][0]).to.deep.equal([]);
    }));

    it('should set correct properties and call delete service correctly', fakeAsync(() => {
      sinon.resetHistory();
      component.docs = [
        { _id: 'doc1', field: 1 },
        { _id: 'doc2', field: 2 },
        { _id: 'doc3', field: 3 },
      ];
      component.type = 'reports';

      component.submit(false);

      expect(component.processing).to.be.true;
      expect(telemetryService.record.notCalled).to.be.true;
      expect(component.totalDocsSelected).to.equal(3);
      expect(component.totalDocsDeleted).to.equal(0);

      flush();

      expect(component.processing).to.be.false;
      expect(consoleErrorStub.notCalled).to.be.true;
      expect(deleteDocsService.delete.calledOnce).to.be.true;
      expect(deleteDocsService.delete.args[0][0]).to.deep.equal([
        { _id: 'doc1', field: 1 },
        { _id: 'doc2', field: 2 },
        { _id: 'doc3', field: 3 },
      ]);
      expect(telemetryService.record.calledOnce).to.be.true;
      expect(telemetryService.record.args[0]).to.have.members([ 'bulk_delete:reports', 3 ]);
    }));

    it('should catch deletion errors', fakeAsync(() => {
      sinon.resetHistory();
      deleteDocsService.delete.rejects({ some: 'error' });
      component.docs = [
        { _id: 'doc1', field: 'a' },
        { _id: 'doc2', field: 'b' },
      ];
      component.type = 'reports';

      component.submit(false);

      expect(component.processing).to.be.true;
      expect(telemetryService.record.notCalled).to.be.true;
      expect(component.totalDocsSelected).to.equal(2);
      expect(component.totalDocsDeleted).to.equal(0);

      flush();

      expect(component.processing).to.be.false;
      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.args[0]).to.deep.equal([
        'Error deleting document',
        { some: 'error' },
      ]);
      expect(deleteDocsService.delete.calledOnce).to.be.true;
      expect(deleteDocsService.delete.args[0][0]).to.deep.equal([
        { _id: 'doc1', field: 'a' },
        { _id: 'doc2', field: 'b' },
      ]);
      expect(telemetryService.record.notCalled).to.be.true;
    }));

    it('should work correctly when progressing callback', fakeAsync(() => {
      sinon.resetHistory();
      component.docs = [
        { _id: 'doc1', field: 'a' },
        { _id: 'doc2', field: 'b' },
      ];
      component.type = 'reports';

      component.submit(false);
      const callback = deleteDocsService.delete.args[0][1].progress;

      expect(component.totalDocsDeleted).to.equal(0);
      callback(10);
      expect(component.totalDocsDeleted).to.equal(10);
      callback(21);
      expect(component.totalDocsDeleted).to.equal(21);

      flush();
    }));
  });
});
