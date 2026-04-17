import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { expect } from 'chai';
import sinon from 'sinon';
import { TranslateModule } from '@ngx-translate/core';
import { EditUserComponent } from '@admin-tool-modules/users/ts/components/edit-user/edit-user.component';
import { EditUserService } from '@admin-tool-services/edit-user.service';
import { Select2SearchService } from '@admin-tool-services/select2search.service';
import { SettingsService } from '@admin-tool-services/settings.service';
import { UsersService } from '@admin-tool-services/users.service';
import { User } from '@admin-tool-modules/users/users-interfaces';

describe('EditUserComponent', () => {
  let component: EditUserComponent;
  let fixture: ComponentFixture<EditUserComponent>;
  let editUserService: any;
  let select2SearchService: any;
  let settingsService: any;
  let usersService: any;
  let httpMock: HttpTestingController;
  let jqueryInstance: any;

  const mockSettings = (overrides: any = {}) => ({
    roles: {
      chw: { name: 'usertype.chw', offline: true },
      chw_supervisor: { name: 'usertype.chw-supervisor', offline: true },
      national_admin: { name: 'usertype.national_admin', offline: false },
    },
    token_login: { enabled: false },
    oidc_provider: null,
    ...overrides,
  });

  const mockUser: Partial<User> = {
    id: 'org.couchdb.user:b_wayne',
    username: 'b_wayne',
    fullname: 'Bruce Wayne',
    email: 'bruce@wayne.com',
    phone: '555-0101',
    facility_id: 'f1',
    contact_id: 'c1',
    roles: ['national_admin'],
    inactive: false,
  };

  const stabilize = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
  };

  /**
   * Sets user, triggers loadSettingsAndPopulate directly (bypassing ngOnChanges/setTimeout),
   * then stabilizes the zone.
   */
  const setupWithUser = async (user: Partial<User>, settingsOverride?: any) => {
    if (settingsOverride) {
      settingsService.get.resolves(settingsOverride);
    }
    component.user = user as User;
    component.visible = true;
    await component.loadSettingsAndPopulate();
    await stabilize();
  };

  const flushReplicationLimit = () => {
    const requests = httpMock.match(r => r.url.includes('/api/v1/users-info'));
    requests.forEach(req => req.flush({ warn: false }));
  };

  beforeEach(async () => {
    jqueryInstance = {
      val: sinon.stub().returns(null),
      trigger: sinon.stub().returnsThis(),
      select2: sinon.stub().returnsThis(),
      find: sinon.stub().returns({ length: 0 }),
      append: sinon.stub().returnsThis(),
    };
    (window as any).$ = sinon.stub().returns(jqueryInstance);

    editUserService = { updateUser: sinon.stub() };
    select2SearchService = {
      initPlaceSelect: sinon.stub().resolves(),
      initPersonSelect: sinon.stub().resolves(),
      isContactInPlace: sinon.stub().resolves(true),
    };
    settingsService = { get: sinon.stub().resolves(mockSettings()) };
    usersService = {
      notifyUsersUpdated: sinon.stub(),
      usersUpdated$: {
        subscribe: sinon.stub().callsFake(() => ({ unsubscribe: sinon.stub() })),
      },
    };

    await TestBed.configureTestingModule({
      imports: [EditUserComponent, TranslateModule.forRoot()],
      providers: [
        { provide: EditUserService, useValue: editUserService },
        { provide: Select2SearchService, useValue: select2SearchService },
        { provide: SettingsService, useValue: settingsService },
        { provide: UsersService, useValue: usersService },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditUserComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sinon.restore();
  });

  describe('Zero', () => {
    it('should initialise with visible false', () => {
      expect(component.visible).to.equal(false);
    });

    it('should initialise with no errors', () => {
      expect(Object.keys(component.errors)).to.have.length(0);
    });

    it('should initialise with loading false', () => {
      expect(component.loading).to.equal(false);
    });

    it('should initialise with no available roles before settings load', () => {
      expect(component.availableRoles).to.have.length(0);
    });

    it('should load roles from settings when modal becomes visible', async () => {
      await setupWithUser(mockUser);
      expect(component.availableRoles.length).to.be.greaterThan(0);
    });

    it('should exclude _admin role from available roles', async () => {
      settingsService.get.resolves(mockSettings({
        roles: { _admin: { name: 'Admin' }, chw: { name: 'CHW', offline: true } },
      }));
      await setupWithUser(mockUser);
      const keys = component.availableRoles.map(r => r.key);
      expect(keys).to.not.include('_admin');
    });
  });

  describe('One', () => {
    it('should populate model from user when modal becomes visible', async () => {
      await setupWithUser(mockUser);
      expect(component.model.username).to.equal('b_wayne');
      expect(component.model.fullname).to.equal('Bruce Wayne');
      expect(component.model.email).to.equal('bruce@wayne.com');
    });

    it('should pre-select user roles', async () => {
      await setupWithUser(mockUser);
      expect(component.model.roles).to.include('national_admin');
    });

    it('should toggle role on and off', async () => {
      await setupWithUser(mockUser);
      component.toggleRole('chw');
      expect(component.model.roles).to.include('chw');
      component.toggleRole('chw');
      expect(component.model.roles).to.not.include('chw');
    });

    it('should toggle password visibility', () => {
      expect(component.model.showPassword).to.equal(false);
      component.togglePassword();
      expect(component.model.showPassword).to.equal(true);
    });
  });

  describe('Many', () => {
    it('should allow multiple roles to be selected', async () => {
      await setupWithUser(mockUser);
      component.toggleRole('chw');
      component.toggleRole('chw_supervisor');
      expect(component.model.roles).to.include('chw');
      expect(component.model.roles).to.include('chw_supervisor');
    });
  });

  describe('Boundaries', () => {
    it('should set isOfflineRole when an offline role is selected', async () => {
      await setupWithUser(mockUser);
      component.toggleRole('chw');
      expect(component.isOfflineRole).to.equal(true);
    });

    it('should set isOfflineRole false when only online roles selected', async () => {
      await setupWithUser(mockUser);
      expect(component.isOfflineRole).to.equal(false);
    });

    it('should hide password when token login is active', async () => {
      await setupWithUser(
        { ...mockUser, token_login: { active: true, expiration_date: Date.now() + 10000 } },
        mockSettings({ token_login: { enabled: true } })
      );
      component.model.token_login = true;
      expect(component.passwordHidden).to.equal(true);
    });

    it('should hide password when SSO login is active', async () => {
      settingsService.get.resolves(mockSettings({ oidc_provider: 'https://sso.example.com' }));
      await setupWithUser(mockUser);
      component.model.oidc_username = 'bruce@sso.com';
      expect(component.passwordHidden).to.equal(true);
    });

    it('should normalise facility_id string to array', async () => {
      await setupWithUser({ ...mockUser, facility_id: 'f1' });
      expect(Array.isArray(component.model.place) || component.model.place === null).to.be.true;
    });
  });

  describe('Interface', () => {
    it('should emit closed when cancel is called', () => {
      const closedSpy = sinon.spy();
      component.closed.subscribe(closedSpy);
      component.cancel();
      expect(closedSpy.callCount).to.equal(1);
    });

    it('should reset model when cancel is called', async () => {
      await setupWithUser(mockUser);
      component.model.fullname = 'Changed Name';
      component.cancel();
      expect(component.model.fullname).to.equal('');
    });

    it('should set roles error when no role is selected on submit', async () => {
      await setupWithUser(mockUser);
      component.model.roles = [];
      await component.submit();
      expect(component.errors.roles).to.equal('field.required');
    });

    it('should set email error for invalid email', async () => {
      await setupWithUser(mockUser);
      component.model.email = 'not-an-email';
      await component.submit();
      expect(component.errors.email).to.equal('email.invalid');
    });

    it('should set password error when disabling token login without new password', async () => {
      await setupWithUser(
        { ...mockUser, token_login: { active: true, expiration_date: Date.now() + 10000 } },
        mockSettings({ token_login: { enabled: true } })
      );
      component.model.token_login = false;
      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;
      expect(component.errors.password).to.equal('field.required');
    });

    it('should not require password when no change is made', async () => {
      await setupWithUser(mockUser);
      editUserService.updateUser.resolves({});
      component.model.password = '';
      component.model.passwordConfirm = '';
      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;
      expect(component.errors.password).to.be.undefined;
    });

    it('should call editUserService.updateUser on valid submit', async () => {
      await setupWithUser(mockUser);
      editUserService.updateUser.resolves({});
      component.model.fullname = 'New Name';
      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;
      expect(editUserService.updateUser.callCount).to.equal(1);
    });

    it('should notify usersService after successful update', async () => {
      await setupWithUser(mockUser);
      editUserService.updateUser.resolves({});
      component.model.fullname = 'New Name';
      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;
      expect(usersService.notifyUsersUpdated.callCount).to.equal(1);
    });

    it('should emit userUpdated and closed after successful submit', async () => {
      const userUpdatedSpy = sinon.spy();
      const closedSpy = sinon.spy();
      component.userUpdated.subscribe(userUpdatedSpy);
      component.closed.subscribe(closedSpy);
      await setupWithUser(mockUser);
      editUserService.updateUser.resolves({});
      component.model.fullname = 'New Name';

      await component.submit();

      expect(userUpdatedSpy.callCount).to.equal(1);
      expect(closedSpy.callCount).to.equal(1);
    });

    it('should set submit error when updateUser fails', async () => {
      await setupWithUser(mockUser);
      editUserService.updateUser.rejects({ error: { message: 'Update failed' } });
      component.model.fullname = 'New Name';
      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;
      expect(component.errors.submit).to.equal('Update failed');
    });

    it('should set fallback error when API returns no message', async () => {
      await setupWithUser(mockUser);
      editUserService.updateUser.rejects({});
      component.model.fullname = 'New Name';
      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;
      expect(component.errors.submit).to.equal('Error updating user');
    });

    it('should set loading to false after failed submit', async () => {
      await setupWithUser(mockUser);
      editUserService.updateUser.rejects({});
      component.model.fullname = 'New Name';
      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;
      expect(component.loading).to.equal(false);
    });

    it('should close without calling updateUser when nothing changed', async () => {
      const closedSpy = sinon.spy();
      component.closed.subscribe(closedSpy);
      await setupWithUser(mockUser);
      // Do not change any field — submit with identical data
      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;
      expect(editUserService.updateUser.callCount).to.equal(0);
      expect(closedSpy.callCount).to.equal(1);
    });

    it('should require facility for offline roles', async () => {
      await setupWithUser({ ...mockUser, roles: [] });
      component.model.roles = ['chw'];
      component.model.place = null;
      component.model.contact = null;
      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;
      expect(component.errors.place).to.equal('field.required');
    });

    it('should set contact error when contact is not in place', async () => {
      select2SearchService.isContactInPlace.resolves(false);
      await setupWithUser({ ...mockUser, roles: ['chw'] });
      component.model.roles = ['chw'];
      component.model.place = 'f1';
      component.model.contact = 'c1';
      await component.submit();
      expect(component.errors.contact).to.equal('configuration.user.place.contact');
    });
  });

  describe('Exceptions', () => {
    it('should handle settings load failure gracefully', async () => {
      settingsService.get.rejects(new Error('Settings unavailable'));
      await setupWithUser(mockUser);
      expect(component.availableRoles).to.have.length(0);
    });

    it('should not call updateUser when validation fails', async () => {
      await setupWithUser(mockUser);
      component.model.roles = [];
      await component.submit();
      expect(editUserService.updateUser.callCount).to.equal(0);
    });
  });

  describe('Scenarios', () => {
    it('should show token login management when token login is already enabled', async () => {
      await setupWithUser(
        { ...mockUser, token_login: { active: true, expiration_date: Date.now() + 10000 } },
        mockSettings({ token_login: { enabled: true } })
      );
      expect(component.model.tokenLoginEnabled).to.not.be.null;
      expect(component.model.tokenLoginEnabled?.active).to.equal(true);
    });

    it('should show SSO field when oidc_provider is set in settings', async () => {
      await setupWithUser(mockUser, mockSettings({ oidc_provider: 'https://sso.example.com' }));
      expect(component.allowSSOLogin).to.equal(true);
    });

    it('should reset form when visible becomes false', async () => {
      await setupWithUser(mockUser);
      expect(component.model.username).to.equal('b_wayne');
      component.visible = false;
      component.ngOnChanges({
        visible: { currentValue: false, previousValue: true, firstChange: false, isFirstChange: () => false },
      } as any);
      expect(component.model.username).to.equal('');
    });
  });
});
