import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';

import { SidebarMenuComponent } from '@mm-components/sidebar-menu/sidebar-menu.component';
import { LocationService } from '@mm-services/location.service';
import { DBSyncService } from '@mm-services/db-sync.service';
import { ModalService } from '@mm-services/modal.service';
import { PanelHeaderComponent } from '@mm-components/panel-header/panel-header.component';
import { AuthDirective } from '@mm-directives/auth.directive';
import { AuthService } from '@mm-services/auth.service';
import { GlobalActions } from '@mm-actions/global';
import { LogoutConfirmComponent } from '@mm-modals/logout/logout-confirm.component';
import { FeedbackComponent } from '@mm-modals/feedback/feedback.component';
import { HeaderTabsService, SidebarTab } from '@mm-services/header-tabs.service';
import { CustomResourceService } from '@mm-services/custom-resource.service';
import { ChangesService } from '@mm-services/changes.service';
import { Selectors } from '@mm-selectors/index';

describe('SidebarMenuComponent', () => {
  let component: SidebarMenuComponent;
  let fixture: ComponentFixture<SidebarMenuComponent>;
  let locationService;
  let dbSyncService;
  let modalService;
  let authService;
  let headerTabsService;
  let customResourceService;
  let changesService;
  let store: MockStore;

  const createComponent = async () => {
    await TestBed
      .configureTestingModule({
        imports: [
          RouterTestingModule,
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          MatSidenavModule,
          MatIconTestingModule,
          SidebarMenuComponent,
          PanelHeaderComponent,
          AuthDirective,
        ],
        providers: [
          provideAnimations(),
          provideMockStore(),
          { provide: LocationService, useValue: locationService },
          { provide: DBSyncService, useValue: dbSyncService },
          { provide: ModalService, useValue: modalService },
          { provide: AuthService, useValue: authService },
          { provide: HeaderTabsService, useValue: headerTabsService },
          { provide: CustomResourceService, useValue: customResourceService },
          { provide: ChangesService, useValue: changesService },
        ],
      })
      .compileComponents();
    store = TestBed.inject(MockStore);
    store.overrideSelector(Selectors.getShowPrivacyPolicy, false);
    fixture = TestBed.createComponent(SidebarMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    locationService = { adminPath: '/admin/' };
    dbSyncService = { sync: sinon.stub() };
    modalService = { show: sinon.stub() };
    authService = { has: sinon.stub(), online: sinon.stub() };
    headerTabsService = { getSidebarTabs: sinon.stub().resolves([]) };
    customResourceService = { getImg: sinon.stub().returns('') };
    changesService = { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) };

    await createComponent();
  });

  afterEach(() => sinon.restore());

  it('should unsubscribe from observables on component destroy', () => {
    const unsubscribeSpy = sinon.spy((component as any).subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribeSpy.calledOnce).to.be.true;
  });

  it('should initialise the admin app path', () => {
    expect(component.adminAppPath).to.equal('/admin/');
  });

  it('should populate headerTabsForSidebar from headerTabsService', async () => {
    const sidebarTabs: SidebarTab[] = [
      {
        name: 'messages',
        route: 'messages',
        defaultIcon: 'fa-envelope',
        translation: 'Messages',
        permissions: ['can_view_messages', '!can_view_messages_tab'],
      },
      {
        name: 'bug',
        defaultIcon: 'fa-bug',
        translation: 'Report Bug',
        permissions: [],
      },
    ];
    headerTabsService.getSidebarTabs.resetHistory();
    headerTabsService.getSidebarTabs.resolves(sidebarTabs);

    await TestBed.resetTestingModule();
    await createComponent();

    expect(headerTabsService.getSidebarTabs).to.have.been.calledOnceWithExactly();
    expect(component.headerTabsForSidebar).to.deep.equal(sidebarTabs);
  });

  it('should initialize headerTabsForSidebar as empty array before loading', () => {
    expect(component.headerTabsForSidebar).to.deep.equal([]);
  });

  it('should default showPrivacyPolicy to false', () => {
    expect(component.showPrivacyPolicy).to.be.false;
  });

  it('should update showPrivacyPolicy when the selector emits', () => {
    store.overrideSelector(Selectors.getShowPrivacyPolicy, true);
    store.refreshState();

    expect(component.showPrivacyPolicy).to.be.true;
  });

  it('should close sidebar menu', () => {
    const closeSidebarMenuStub = sinon.stub(GlobalActions.prototype, 'closeSidebarMenu');

    component.close();

    expect(closeSidebarMenuStub.calledOnce).to.be.true;
  });

  it('should not replicate if sync is disabled', () => {
    component.replicationStatus = { current: { disableSyncButton: true } };

    component.replicate();

    expect(dbSyncService.sync.notCalled).to.be.true;
  });

  it('should replicate if sync is enabled', () => {
    component.replicationStatus = { current: { disableSyncButton: false } };

    component.replicate();

    expect(dbSyncService.sync.calledOnce).to.be.true;
  });

  it('should show confirmation logout modal', () => {
    component.logout();

    expect(modalService.show.calledOnce).to.be.true;
    expect(modalService.show.args[0][0]).to.deep.equal(LogoutConfirmComponent);
  });

  describe('onTabClick()', () => {
    it('should show the feedback modal and close the sidebar when the bug tab is clicked', () => {
      const closeStub = sinon.stub(GlobalActions.prototype, 'closeSidebarMenu');

      component.onTabClick({
        name: 'bug',
        defaultIcon: 'fa-bug',
        translation: 'Report Bug',
        permissions: [],
      });

      expect(modalService.show.calledOnce).to.be.true;
      expect(modalService.show.args[0][0]).to.deep.equal(FeedbackComponent);
      expect(closeStub.calledOnce).to.be.true;
    });

    it('should close the sidebar for any other tab', () => {
      const closeStub = sinon.stub(GlobalActions.prototype, 'closeSidebarMenu');

      component.onTabClick({
        name: 'messages',
        route: 'messages',
        defaultIcon: 'fa-envelope',
        translation: 'Messages',
        permissions: [],
      });

      expect(modalService.show.called).to.be.false;
      expect(closeStub.calledOnce).to.be.true;
    });
  });
});
