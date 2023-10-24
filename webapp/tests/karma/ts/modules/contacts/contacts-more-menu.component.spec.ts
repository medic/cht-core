import { ComponentFixture, TestBed, flush, fakeAsync } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { ContactsMoreMenuComponent } from '@mm-modules/contacts/contacts-more-menu.component';
import { Selectors } from '@mm-selectors/index';
import { AuthService } from '@mm-services/auth.service';
import { SessionService } from '@mm-services/session.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { GlobalActions } from '@mm-actions/global';
import { CommonModule } from '@angular/common';

describe('Contacts More Menu Component', () => {
  let component: ContactsMoreMenuComponent;
  let fixture: ComponentFixture<ContactsMoreMenuComponent>;
  let store: MockStore;
  let userSettingsService;
  let sessionService;
  let authService;
  let responsiveService;

  beforeEach(async () => {
    const mockedSelectors = [
      { selector: Selectors.getContactsList, value: [] },
      { selector: Selectors.getSelectedContactDoc, value: undefined },
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
    userSettingsService = { get: sinon.stub().resolves(undefined) };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          CommonModule,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: AuthService, useValue: authService },
          { provide: SessionService, useValue: sessionService },
          { provide: ResponsiveService, useValue: responsiveService },
          { provide: UserSettingsService, useValue: userSettingsService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ContactsMoreMenuComponent);
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
    store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
    store.refreshState();

    flush();
    component.deleteContact();

    expect(deleteDocConfirmStub.calledOnce).to.be.true;
    expect(deleteDocConfirmStub.args[0][0]).to.deep.equal({ _id: 'contact-1' });
  }));

  describe('displayEditOption', () => {
    it('should display edit option when user has all conditions okay', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.online.returns(true);
      userSettingsService.get.resolves({ facility_id: 'facility-1' });

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'contacts.detail' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.true;
    }));

    it('should display edit option when user is online and facility id is his contact id', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.online.returns(true);
      userSettingsService.get.resolves({ facility_id: 'contact-1' });

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'contacts.detail' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.true;
    }));

    it('should display edit option when user is offline and facility id is not his contact id', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.online.returns(false);
      userSettingsService.get.resolves({ facility_id: 'facility-1' });

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'contacts.detail' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.true;
    }));

    it('should not display edit option when is not detail page', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.online.returns(true);
      userSettingsService.get.resolves({ facility_id: 'facility-1' });

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'contacts' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.false;
    }));

    it('should not display edit option when user does not have can_edit permission', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(false);
      authService.online.returns(true);
      userSettingsService.get.resolves({ facility_id: 'facility-1' });

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'contacts.detail' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.false;
    }));

    it('should not display edit option when content is loading', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.online.returns(true);
      userSettingsService.get.resolves({ facility_id: 'facility-1' });

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
      store.overrideSelector(Selectors.getLoadingContent, true);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'contacts.detail' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.false;
    }));

    it('should not display edit option when user does not have all the conditions', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(false);
      authService.online.returns(false);
      userSettingsService.get.resolves({ facility_id: 'contact-1' });

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
      store.overrideSelector(Selectors.getLoadingContent, true);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'contacts' });
      store.refreshState();
      flush();

      expect(component.displayEditOption()).to.be.false;
    }));
  });

  describe('displayDeleteOption', () => {
    it('should display delete option when user has all conditions okay', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_delete_contacts').resolves(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'contacts.detail' });
      store.refreshState();
      flush();

      expect(component.displayDeleteOption()).to.be.true;
    }));

    it('should not display delete option when is not detail page', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_delete_contacts').resolves(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'contacts' });
      store.refreshState();
      flush();

      expect(component.displayDeleteOption()).to.be.false;
    }));

    it('should not display delete option when user does not have can_edit permission', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(false);
      authService.has.withArgs('can_delete_contacts').resolves(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'contacts.detail' });
      store.refreshState();
      flush();

      expect(component.displayDeleteOption()).to.be.false;
    }));

    it('should not display delete option when user does not have can_delete_contacts permission', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_delete_contacts').resolves(false);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
      store.overrideSelector(Selectors.getLoadingContent, false);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'contacts.detail' });
      store.refreshState();
      flush();

      expect(component.displayDeleteOption()).to.be.false;
    }));

    it('should not display delete option when content is loading', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(true);
      authService.has.withArgs('can_delete_contacts').resolves(true);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
      store.overrideSelector(Selectors.getLoadingContent, true);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'contacts.detail' });
      store.refreshState();
      flush();

      expect(component.displayDeleteOption()).to.be.false;
    }));

    it('should not display delete option when user does not have all the conditions', fakeAsync(() => {
      authService.has.withArgs('can_edit').resolves(false);
      authService.has.withArgs('can_delete_contacts').resolves(false);

      component.ngOnInit();

      store.overrideSelector(Selectors.getSelectedContactDoc, { _id: 'contact-1' });
      store.overrideSelector(Selectors.getLoadingContent, true);
      store.overrideSelector(Selectors.getSnapshotData, { name: 'contacts' });
      store.refreshState();
      flush();

      expect(component.displayDeleteOption()).to.be.false;
    }));
  });

  describe('displayExportOption', () => {
    it('should display export option when user has all conditions okay', fakeAsync(() => {
      authService.any.withArgs([[ 'can_export_all' ], [ 'can_export_contacts' ]]).resolves(true);
      authService.online.returns(true);
      responsiveService.isMobile.returns(false);

      component.ngOnInit();
      flush();

      expect(component.displayExportOption()).to.be.true;
    }));

    it('should not display export option when user not have export permission', fakeAsync(() => {
      authService.any.withArgs([[ 'can_export_all' ], [ 'can_export_contacts' ]]).resolves(false);
      authService.online.returns(true);
      responsiveService.isMobile.returns(false);

      component.ngOnInit();
      flush();

      expect(component.displayExportOption()).to.be.false;
    }));

    it('should not display export option when user is offline', fakeAsync(() => {
      authService.any.withArgs([[ 'can_export_all' ], [ 'can_export_contacts' ]]).resolves(true);
      authService.online.returns(false);
      responsiveService.isMobile.returns(false);

      component.ngOnInit();
      flush();

      expect(component.displayExportOption()).to.be.false;
    }));

    it('should not display export option when user is in mobile', fakeAsync(() => {
      authService.any.withArgs([[ 'can_export_all' ], [ 'can_export_contacts' ]]).resolves(true);
      authService.online.returns(true);
      responsiveService.isMobile.returns(true);

      component.ngOnInit();
      flush();

      expect(component.displayExportOption()).to.be.false;
    }));
  });
});
