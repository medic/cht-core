import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { provideMockStore } from '@ngrx/store/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { FastActionButtonComponent } from '@mm-components/fast-action-button/fast-action-button.component';
import { AuthService } from '@mm-services/auth.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { SessionService } from '@mm-services/session.service';
import { FastAction, IconType } from '@mm-services/fast-action-button.service';

describe('FastActionButtonComponent', () => {
  let component: FastActionButtonComponent;
  let fixture: ComponentFixture<FastActionButtonComponent>;
  let router;
  let authService;
  let responsiveService;
  let sessionService;
  let matBottomSheet;
  let matDialog;
  let matBottomSheetRef;
  let matDialogRef;

  beforeEach(async () => {
    router = {
      events: { pipe: sinon.stub().returns({ subscribe: sinon.stub() }) },
    };
    authService = { has: sinon.stub() };
    responsiveService = { isMobile: sinon.stub() };
    sessionService = { isAdmin: sinon.stub() };
    matBottomSheetRef = { dismiss: sinon.stub() };
    matBottomSheet = { open: sinon.stub().returns(matBottomSheetRef) };
    matDialogRef = { close: sinon.stub() };
    matDialog = { open: sinon.stub().returns(matDialogRef) };

    await TestBed
      .configureTestingModule({
        declarations: [ FastActionButtonComponent ],
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        providers: [
          provideMockStore(),
          { provide: Router, useValue: router },
          { provide: AuthService, useValue: authService },
          { provide: SessionService, useValue: sessionService },
          { provide: ResponsiveService, useValue: responsiveService },
          { provide: MatBottomSheet, useValue: matBottomSheet },
          { provide: MatDialog, useValue: matDialog },
        ],
      })
      .compileComponents();

    fixture = TestBed.createComponent(FastActionButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => sinon.restore());

  it('should return fast executable action', () => {
    const actionOne: FastAction = {
      id: 'action-1',
      label: 'action number one',
      icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
      canDisplay: sinon.stub(),
      execute: sinon.stub(),
    };
    const actionTwo: FastAction = {
      id: 'action-2',
      label: 'action number two',
      icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
      canDisplay: sinon.stub(),
      execute: sinon.stub(),
    };

    component.fastActions = [ actionOne ];
    expect(component.getFastExecutableAction()).to.deep.equal(actionOne);

    component.fastActions = [ actionOne, actionTwo ];
    expect(component.getFastExecutableAction()).to.be.undefined;

    actionOne.alwaysOpenInPanel = true;
    component.fastActions = [ actionOne ];
    expect(component.getFastExecutableAction()).to.be.undefined;
  });

  it('should close display panels', () => {
    const actionOne = {
      id: 'action-1',
      label: 'action number one',
      icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
      canDisplay: sinon.stub(),
      execute: sinon.stub(),
    };
    const actionTwo = {
      id: 'action-2',
      label: 'action number two',
      icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
      canDisplay: sinon.stub(),
      execute: sinon.stub(),
    };
    component.fastActions = [ actionOne, actionTwo ];

    responsiveService.isMobile.returns(false);
    component.open();
    sinon.resetHistory();

    component.closeAll();

    expect(matDialogRef.close.calledOnce).to.be.true;
    expect(matBottomSheetRef.dismiss.notCalled).to.be.true;

    responsiveService.isMobile.returns(true);
    component.open();
    sinon.resetHistory();

    component.closeAll();

    expect(matDialogRef.close.notCalled).to.be.true;
    expect(matBottomSheetRef.dismiss.calledOnce).to.be.true;
  });

  it('should execute action', () => {
    const actionOne = {
      id: 'action-1',
      label: 'action number one',
      icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
      canDisplay: sinon.stub(),
      execute: sinon.stub(),
    };

    component.executeAction(actionOne);

    expect(matDialogRef.close.notCalled).to.be.true;
    expect(matBottomSheetRef.dismiss.notCalled).to.be.true;
    expect(actionOne.execute.calledOnce).to.be.true;
  });

  it('should return track id', () => {
    const actionOne = {
      id: 'action-1',
      label: 'action number one',
      icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
      canDisplay: sinon.stub(),
      execute: sinon.stub(),
    };

    expect(component.trackById(1, actionOne)).to.equal('action-1');
  });

  it('should return fast executable action label', () => {
    const actionOne: FastAction = {
      id: 'action-1',
      labelKey: 'action.label',
      icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
      canDisplay: sinon.stub(),
      execute: sinon.stub(),
    };
    const actionTwo: FastAction = {
      id: 'action-2',
      label: 'action number two',
      icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
      canDisplay: sinon.stub(),
      execute: sinon.stub(),
    };

    component.fastActions = [ actionOne, actionTwo ];
    expect(component.getActionLabel()).to.be.undefined;

    component.fastActions = [ actionOne ];
    expect(component.getActionLabel()).to.equal('action.label');

    component.fastActions = [ actionTwo ];
    expect(component.getActionLabel()).to.equal('action number two');
  });

  it('should return trigger button icon', () => {
    const actionOne: FastAction = {
      id: 'action-1',
      labelKey: 'action.label',
      icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
      canDisplay: sinon.stub(),
      execute: sinon.stub(),
    };
    const actionTwo: FastAction = {
      id: 'action-2',
      label: 'action number two',
      icon: { name: 'resource-icon', type: IconType.RESOURCE },
      canDisplay: sinon.stub(),
      execute: sinon.stub(),
    };
    const actionThree: FastAction = {
      id: 'action-3',
      label: 'action number three',
      icon: { name: '', type: IconType.FONT_AWESOME },
      canDisplay: sinon.stub(),
      execute: sinon.stub(),
    };

    component.fastActions = [ actionOne, actionTwo ];
    expect(component.getTriggerButtonIcon()).to.equal('fa-plus');

    component.fastActions = [ actionOne ];
    expect(component.getTriggerButtonIcon()).to.equal('an-icon');

    component.fastActions = [ actionTwo ];
    expect(component.getTriggerButtonIcon()).to.equal('fa-plus');

    component.fastActions = [ actionThree ];
    expect(component.getTriggerButtonIcon()).to.equal('fa-plus');
  });

  describe('open()', () => {
    it('should open the list of action in the dialog', () => {
      responsiveService.isMobile.returns(false);
      const actionOne = {
        id: 'action-1',
        label: 'action number one',
        icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
        canDisplay: sinon.stub(),
        execute: sinon.stub(),
      };
      const actionTwo = {
        id: 'action-2',
        label: 'action number two',
        icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
        canDisplay: sinon.stub(),
        execute: sinon.stub(),
      };
      component.fastActions = [ actionOne, actionTwo ];

      component.open();

      expect(matDialogRef.close.notCalled).to.be.true;
      expect(matBottomSheetRef.dismiss.notCalled).to.be.true;
      expect(actionOne.execute.notCalled).to.be.true;
      expect(actionTwo.execute.notCalled).to.be.true;
      expect(responsiveService.isMobile.calledOnce).to.be.true;
      expect(matBottomSheet.open.notCalled).to.be.true;
      expect(matDialog.open.calledOnce).to.be.true;
      expect(matDialog.open.args[0]).to.have.deep.members([
        component.contentWrapper,
        {
          autoFocus: false,
          minWidth: 300,
          minHeight: 150,
        },
      ]);
    });

    it('should open an action in the dialog', () => {
      responsiveService.isMobile.returns(false);
      const actionOne = {
        id: 'action-1',
        label: 'action number one',
        icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
        canDisplay: sinon.stub(),
        execute: sinon.stub(),
        alwaysOpenInPanel: true
      };
      component.fastActions = [ actionOne ];

      component.open();

      expect(matDialogRef.close.notCalled).to.be.true;
      expect(matBottomSheetRef.dismiss.notCalled).to.be.true;
      expect(actionOne.execute.notCalled).to.be.true;
      expect(responsiveService.isMobile.calledOnce).to.be.true;
      expect(matBottomSheet.open.notCalled).to.be.true;
      expect(matDialog.open.calledOnce).to.be.true;
      expect(matDialog.open.args[0]).to.have.deep.members([
        component.contentWrapper,
        {
          autoFocus: false,
          minWidth: 300,
          minHeight: 150,
        },
      ]);
    });

    it('should open the list of action in the bottom sheet', () => {
      responsiveService.isMobile.returns(true);
      const actionOne = {
        id: 'action-1',
        label: 'action number one',
        icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
        canDisplay: sinon.stub(),
        execute: sinon.stub(),
      };
      const actionTwo = {
        id: 'action-2',
        label: 'action number two',
        icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
        canDisplay: sinon.stub(),
        execute: sinon.stub(),
      };
      component.fastActions = [ actionOne, actionTwo ];

      component.open();

      expect(matDialogRef.close.notCalled).to.be.true;
      expect(matBottomSheetRef.dismiss.notCalled).to.be.true;
      expect(actionOne.execute.notCalled).to.be.true;
      expect(actionTwo.execute.notCalled).to.be.true;
      expect(responsiveService.isMobile.calledOnce).to.be.true;
      expect(matDialog.open.notCalled).to.be.true;
      expect(matBottomSheet.open.calledOnce).to.be.true;
      expect(matBottomSheet.open.args[0][0]).to.deep.equal(component.contentWrapper);
    });

    it('should execute the action immediately', () => {
      const actionOne = {
        id: 'action-1',
        label: 'action number one',
        icon: { name: 'an-icon', type: IconType.FONT_AWESOME },
        canDisplay: sinon.stub(),
        execute: sinon.stub(),
      };
      component.fastActions = [ actionOne ];

      component.open();

      expect(actionOne.execute.calledOnce).to.be.true;
      expect(matDialogRef.close.notCalled).to.be.true;
      expect(matBottomSheetRef.dismiss.notCalled).to.be.true;
      expect(responsiveService.isMobile.notCalled).to.be.true;
      expect(matBottomSheet.open.notCalled).to.be.true;
      expect(matDialog.open.notCalled).to.be.true;
    });
  });
});
