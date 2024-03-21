import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { NavigationConfirmComponent } from '@mm-modals/navigation-confirm/navigation-confirm.component';
import { TelemetryService } from '@mm-services/telemetry.service';
import { ModalLayoutComponent } from '@mm-components/modal-layout/modal-layout.component';
import { PanelHeaderComponent } from '@mm-components/panel-header/panel-header.component';

describe('NavigationConfirmModal', () => {
  let fixture:ComponentFixture<NavigationConfirmComponent>;
  let component:NavigationConfirmComponent;
  let telemetryService;
  let matDialogRef;

  beforeEach(() => {
    matDialogRef = { close: sinon.stub() };
    telemetryService = { record: sinon.stub() };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          NavigationConfirmComponent,
          ModalLayoutComponent,
          PanelHeaderComponent,
        ],
        providers: [
          { provide: TelemetryService, useValue: telemetryService },
          { provide: MatDialogRef, useValue: matDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: {} },
        ],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(NavigationConfirmComponent);
        component = fixture.componentInstance;
      });
  });

  afterEach(() => sinon.restore());

  it('should create', () => {
    expect(component).to.exist;
  });

  it('should not record telemetry when entry is not defined', () => {
    component.close(true);

    expect(telemetryService.record.notCalled).to.be.true;
    expect(matDialogRef.close.calledOnce).to.be.true;

    sinon.resetHistory();
    component.close(false);

    expect(telemetryService.record.notCalled).to.be.true;
    expect(matDialogRef.close.calledOnce).to.be.true;
  });

  it('should record telemetry when entry is defined', () => {
    component.telemetryEntry = 'some entry:';

    component.close(true);

    expect(telemetryService.record.calledOnce).to.be.true;
    expect(telemetryService.record.args[0]).to.deep.equal([ 'some entry:confirm' ]);
    expect(matDialogRef.close.calledOnce).to.be.true;

    sinon.resetHistory();
    component.close(false);

    expect(telemetryService.record.calledOnce).to.be.true;
    expect(telemetryService.record.args[0]).to.deep.equal([ 'some entry:reject' ]);
    expect(matDialogRef.close.calledOnce).to.be.true;
  });
});
