import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { assert, expect } from 'chai';

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

describe('SidebarMenuComponent', () => {
  let component: SidebarMenuComponent;
  let fixture: ComponentFixture<SidebarMenuComponent>;
  let locationService;
  let dbSyncService;
  let modalService;
  let authService;

  beforeEach(async () => {
    locationService = { adminPath: '/admin/' };
    dbSyncService = { sync: sinon.stub() };
    modalService = { show: sinon.stub() };
    authService = { has: sinon.stub(), online: sinon.stub() };

    await TestBed
      .configureTestingModule({
        imports: [
          RouterTestingModule,
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          MatSidenavModule,
          MatIconModule,
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
        ],
      })
      .compileComponents();

    fixture = TestBed.createComponent(SidebarMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => sinon.restore());

  it('should unsubscribe from observables on component destroy', () => {
    const unsubscribeSpy = sinon.spy((component as any).subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribeSpy.calledOnce).to.be.true;
  });

  it('should initialise component with menu options', () => {
    expect(component.adminAppPath).to.equal('/admin/');

    expect(component.moduleOptions).have.deep.members([
      {
        routerLink: 'messages',
        icon: 'fa-envelope',
        translationKey: 'Messages',
        hasPermissions: 'can_view_messages,!can_view_messages_tab'
      },
      {
        routerLink: 'tasks',
        icon: 'fa-flag',
        translationKey: 'Tasks',
        hasPermissions: 'can_view_tasks,!can_view_tasks_tab'
      },
      {
        routerLink: 'reports',
        icon: 'fa-list-alt',
        translationKey: 'Reports',
        hasPermissions: 'can_view_reports,!can_view_reports_tab'
      },
      {
        routerLink: 'contacts',
        icon: 'fa-user',
        translationKey: 'Contacts',
        hasPermissions: 'can_view_contacts,!can_view_contacts_tab'
      },
      {
        routerLink: 'analytics',
        icon: 'fa-bar-chart-o',
        translationKey: 'Analytics',
        hasPermissions: 'can_view_analytics,!can_view_analytics_tab',
      },
    ]);

    expect(component.secondaryOptions).excluding('click').have.deep.members([
      {
        routerLink: 'trainings',
        icon: 'fa-graduation-cap',
        translationKey: 'training_materials.page.title',
        canDisplay: true,
      },
      {
        routerLink: 'about',
        icon: 'fa-question',
        translationKey: 'about',
        canDisplay: true,
      },
      {
        routerLink: 'user',
        icon: 'fa-user',
        translationKey: 'edit.user.settings',
        hasPermissions: 'can_edit_profile'
      },
      {
        routerLink: 'privacy-policy',
        icon: 'fa-lock',
        translationKey: 'privacy.policy',
        canDisplay: false,
      },
      {
        icon: 'fa-bug',
        translationKey: 'Report Bug',
        canDisplay: true,
      },
    ]);
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

  it('should show report bug modal', () => {
    const reportBug = component.secondaryOptions.find(option => option.translationKey === 'Report Bug');

    if (!reportBug?.click) {
      assert.fail('should have report bug option');
      return;
    }

    reportBug.click();

    expect(modalService.show.calledOnce).to.be.true;
    expect(modalService.show.args[0][0]).to.deep.equal(FeedbackComponent);
  });
});
