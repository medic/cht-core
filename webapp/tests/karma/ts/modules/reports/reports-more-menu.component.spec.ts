import { ComponentFixture, TestBed, flush, fakeAsync } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { Selectors } from '@mm-selectors/index';
import { AuthService } from '@mm-services/auth.service';
import { SessionService } from '@mm-services/session.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { GlobalActions } from '@mm-actions/global';
import { ReportsMoreMenuComponent } from '@mm-modules/reports/reports-more-menu.component';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';

describe('Reports More Menu Component', () => {
  let component: ReportsMoreMenuComponent;
  let fixture: ComponentFixture<ReportsMoreMenuComponent>;
  let store: MockStore;
  let sessionService;
  let authService;
  let responsiveService;
  let matBottomSheet;
  let matDialog;

  beforeEach(async () => {
    const mockedSelectors = [
      { selector: Selectors.getReportsList, value: [] },
      { selector: Selectors.getSelectedReportDoc, value: undefined },
      { selector: Selectors.getSelectMode, value: false },
      { selector: Selectors.getLoadingContent, value: false },
      { selector: Selectors.getSnapshotData, value: undefined },
    ];
    authService = {
      has: sinon.stub().resolves(false),
      any: sinon.stub().resolves(false),
      online: sinon.stub().returns(false),
    };
    sessionService = { isAdmin: sinon.stub().returns(false) };
    responsiveService = { isMobile: sinon.stub().returns(false) };
    matBottomSheet = { open: sinon.stub() };
    matDialog = { open: sinon.stub() };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          MatExpansionModule,
          CommonModule
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: AuthService, useValue: authService },
          { provide: SessionService, useValue: sessionService },
          { provide: ResponsiveService, useValue: responsiveService },
          { provide: MatBottomSheet, useValue: matBottomSheet },
          { provide: MatDialog, useValue: matDialog },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ReportsMoreMenuComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
      });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should call delete confirm from global actions', fakeAsync(() => {
    const deleteDocConfirmStub = sinon.stub(GlobalActions.prototype, 'deleteDocConfirm');
    store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1' });
    store.refreshState();

    flush();
    component.deleteReport();

    expect(deleteDocConfirmStub.calledOnce).to.be.true;
    expect(deleteDocConfirmStub.args[0][0]).to.deep.equal({ _id: 'report-1' });
  }));

  describe('displayEditOption', () => {
    it('should display edit option when user has all conditions okay', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_update_reports').resolves(true);
      authService.online.returns(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'xml' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports.detail' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.true;
    }));

    it('should not display edit option when is not detail page', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_update_reports').resolves(true);
      authService.online.returns(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'xml' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.false;
    }));

    it('should not display edit option when user does not have can_edit permission', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(false);
      authService.has.withArgs('can_update_reports').resolves(true);
      authService.online.returns(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'xml' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports.detail' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.false;
    }));

    it('should not display edit option when user does not have can_update_reports permission', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_update_reports').resolves(false);
      authService.online.returns(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'xml' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports.detail' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.false;
    }));

    it('should not display edit option when content type of selected report is not xml', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_update_reports').resolves(true);
      authService.online.returns(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'html' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports.detail' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.false;
    }));

    it('should not display edit option when content is loading', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_update_reports').resolves(true);
      authService.online.returns(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'xml' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getLoadingContent, true);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports.detail' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.false;
    }));

    it('should not display edit option when it is select mode', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_update_reports').resolves(true);
      authService.online.returns(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'xml' });
      store.overrideSelector(Selectors.getSelectMode, true);
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports.detail' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.false;
    }));

    it('should not display edit option when user does not have all the conditions', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(false);
      authService.has.withArgs('can_update_reports').resolves(false);
      authService.online.returns(false);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'html' });
      store.overrideSelector(Selectors.getSelectMode, true);
      store.overrideSelector(Selectors.getLoadingContent, true);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.false;
    }));
  });

  describe('displayDeleteOption', () => {
    it('should display delete option when user has all conditions okay', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_delete_reports').resolves(true);
      authService.online.returns(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'xml' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports.detail' });
      store.refreshState();
      flush();

      expect(component.displayDeleteOption()).to.be.true;
    }));

    it('should not display delete option when is not detail page', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_delete_reports').resolves(true);
      authService.online.returns(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'xml' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports' });
      store.refreshState();
      flush();

      expect(component.displayDeleteOption()).to.be.false;
    }));

    it('should not display delete option when user does not have can_edit permission', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(false);
      authService.has.withArgs('can_delete_reports').resolves(true);
      authService.online.returns(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'xml' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports.detail' });
      store.refreshState();
      flush();

      expect(component.displayDeleteOption()).to.be.false;
    }));

    it('should not display delete option when user does not have can_delete_reports permission', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_delete_reports').resolves(false);
      authService.online.returns(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'xml' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports.detail' });
      store.refreshState();
      flush();

      expect(component.displayDeleteOption()).to.be.false;
    }));

    it('should not display delete option when content is loading', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_delete_reports').resolves(true);
      authService.online.returns(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'xml' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getLoadingContent, true);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports.detail' });
      store.refreshState();
      flush();

      expect(component.displayDeleteOption()).to.be.false;
    }));

    it('should not display delete option when in select mode', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_delete_reports').resolves(true);
      authService.online.returns(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1', content_type: 'xml' });
      store.overrideSelector(Selectors.getSelectMode, true);
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports.detail' });
      store.refreshState();
      flush();

      expect(component.displayDeleteOption()).to.be.false;
    }));

    it('should not display delete option when user does not have all the conditions', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(false);
      authService.has.withArgs('can_delete_reports').resolves(false);
      authService.online.returns(false);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'report-1' });
      store.overrideSelector(Selectors.getSelectMode, true);
      store.overrideSelector(Selectors.getLoadingContent, true);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'reports' });
      store.refreshState();
      flush();

      expect(component.displayDeleteOption()).to.be.false;
    }));
  });

  describe('displayExportOption', () => {
    it('should display export option when user has all conditions okay', fakeAsync(() => {
      authService.any.withArgs([[ 'can_export_all' ], [ 'can_export_messages' ]]).resolves(true);
      authService.online.returns(true);
      responsiveService.isMobile.returns(false);

      store.overrideSelector(Selectors.getSelectMode, false);
      store.refreshState();
      component.ngOnInit();
      flush();

      expect(component.displayExportOption()).to.be.true;
    }));

    it('should not display export option when user not have export permission', fakeAsync(() => {
      authService.any.withArgs([[ 'can_export_all' ], [ 'can_export_messages' ]]).resolves(false);
      authService.online.returns(true);
      responsiveService.isMobile.returns(false);

      store.overrideSelector(Selectors.getSelectMode, false);
      store.refreshState();
      component.ngOnInit();
      flush();

      expect(component.displayExportOption()).to.be.false;
    }));

    it('should not display export option when user is offline', fakeAsync(() => {
      authService.any.withArgs([[ 'can_export_all' ], [ 'can_export_messages' ]]).resolves(true);
      authService.online.returns(false);
      responsiveService.isMobile.returns(false);

      store.overrideSelector(Selectors.getSelectMode, false);
      store.refreshState();
      component.ngOnInit();
      flush();

      expect(component.displayExportOption()).to.be.false;
    }));

    it('should not display export option when user is in mobile', fakeAsync(() => {
      authService.any.withArgs([[ 'can_export_all' ], [ 'can_export_messages' ]]).resolves(true);
      authService.online.returns(true);
      responsiveService.isMobile.returns(true);

      store.overrideSelector(Selectors.getSelectMode, false);
      store.refreshState();
      component.ngOnInit();
      flush();

      expect(component.displayExportOption()).to.be.false;
    }));

    it('should not display export option when in select mode', fakeAsync(() => {
      authService.any.withArgs([[ 'can_export_all' ], [ 'can_export_messages' ]]).resolves(true);
      authService.online.returns(true);
      responsiveService.isMobile.returns(false);

      store.overrideSelector(Selectors.getSelectMode, true);
      store.refreshState();
      component.ngOnInit();
      flush();

      expect(component.displayExportOption()).to.be.false;
    }));
  });
});
