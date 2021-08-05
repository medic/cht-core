import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsModalRef } from 'ngx-bootstrap/modal';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { MmModal, MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { NavigationConfirmComponent } from '@mm-modals/navigation-confirm/navigation-confirm.component';
import { TelemetryService } from '@mm-services/telemetry.service';

describe('NavigationConfirmModal', () => {
  let telemetryService;
  let bsModalRef;
  let fixture:ComponentFixture<NavigationConfirmComponent>;
  let component:NavigationConfirmComponent;
  let superClose;
  let superCancel;

  beforeEach(() => {
    bsModalRef = {
      hide: sinon.stub(),
      onHidden: new Subject(),
      onHide: new Subject(),
    };

    telemetryService = { record: sinon.stub() };
    superClose = sinon.stub(MmModalAbstract.prototype, 'close');
    superCancel = sinon.stub(MmModalAbstract.prototype, 'cancel');

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          NavigationConfirmComponent,
          MmModal,
        ],
        providers: [
          { provide: BsModalRef, useValue: bsModalRef },
          { provide: TelemetryService, useValue: telemetryService },
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

  describe('submit', () => {
    it('should not record telemetry when not set', () => {
      component.submit();
      expect(telemetryService.record.callCount).to.equal(0);
      expect(superClose.callCount).to.equal(1);
      expect(superCancel.callCount).to.equal(0);
    });

    it('should record telemetry when set', () => {
      component.telemetryEntry = 'some entry:';
      component.submit();
      expect(telemetryService.record.callCount).to.equal(1);
      expect(telemetryService.record.args[0]).to.deep.equal(['some entry:confirm']);
      expect(superClose.callCount).to.equal(1);
      expect(superCancel.callCount).to.equal(0);
    });
  });

  describe('cancel', () => {
    it('should not record telemetry when not set', () => {
      component.cancel();
      expect(telemetryService.record.callCount).to.equal(0);
      expect(superClose.callCount).to.equal(0);
      expect(superCancel.callCount).to.equal(1);
    });

    it('should record telemetry when set', () => {
      component.telemetryEntry = 'some entry:';
      component.cancel();
      expect(telemetryService.record.callCount).to.equal(1);
      expect(telemetryService.record.args[0]).to.deep.equal(['some entry:reject']);
      expect(superClose.callCount).to.equal(0);
      expect(superCancel.callCount).to.equal(1);
    });
  });
});
