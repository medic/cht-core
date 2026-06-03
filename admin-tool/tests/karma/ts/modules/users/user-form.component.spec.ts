import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { TranslateModule } from '@ngx-translate/core';
import { UserFormComponent } from '@admin-tool-modules/users/ts/components/user-form/user-form.component';
import { Select2SearchService } from '@admin-tool-services/select2search.service';
import { SettingsService } from '@admin-tool-services/settings.service';
import { UsersService } from '@admin-tool-services/users.service';
import { User } from '@admin-tool-modules/users/users-interfaces';

interface UsersServiceMock {
  createUser: SinonStub;
  updateUser: SinonStub;
  notifyUsersUpdated: SinonStub;
  usersUpdated$: { subscribe: SinonStub };
}

describe('UserFormComponent', () => {
  let component: UserFormComponent;
  let fixture: ComponentFixture<UserFormComponent>;
  let usersService: UsersServiceMock;
  let select2SearchService: any;
  let settingsService: any;
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
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

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
    const requests = httpMock.match((r) => r.url.includes('/api/v1/users-info'),);
    requests.forEach((req) => req.flush({ warn: false }));
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

    usersService = {
      createUser: sinon.stub(),
      updateUser: sinon.stub(),
      notifyUsersUpdated: sinon.stub(),
      usersUpdated$: {
        subscribe: sinon
          .stub()
          .callsFake(() => ({ unsubscribe: sinon.stub() })),
      },
    };
    select2SearchService = {
      initPlaceSelect: sinon.stub().resolves(),
      initPersonSelect: sinon.stub().resolves(),
      isContactInPlace: sinon.stub().resolves(true),
    };
    settingsService = { get: sinon.stub().resolves(mockSettings()) };

    await TestBed.configureTestingModule({
      imports: [UserFormComponent, TranslateModule.forRoot()],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: Select2SearchService, useValue: select2SearchService },
        { provide: SettingsService, useValue: settingsService },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sinon.restore();
  });

  // ==========================================================================
  // CREATE MODE
  // ==========================================================================
  describe('Create mode', () => {
    beforeEach(() => {
      component.mode = 'create';
    });

    describe('Zero', () => {
      it('should initialise with empty model', () => {
        expect(component.model.username).to.equal('');
        expect(component.model.roles).to.deep.equal([]);
      });

      it('should initialise with no errors', () => {
        expect(Object.keys(component.errors)).to.have.length(0);
      });

      it('should initialise with loading false', () => {
        expect(component.loading).to.equal(false);
      });

      it('should have title Add User', () => {
        expect(component.title).to.equal('Add User');
      });

      it('should have submitLabel Add User', () => {
        expect(component.submitLabel).to.equal('Add User');
      });

      it('should load roles from settings on init', async () => {
        await stabilize();
        expect(component.availableRoles.length).to.be.greaterThan(0);
      });

      it('should exclude _admin role from available roles', async () => {
        settingsService.get.resolves(
          mockSettings({
            roles: {
              _admin: { name: 'Admin' },
              chw: { name: 'CHW', offline: true },
            },
          }),
        );
        await stabilize();
        const keys = component.availableRoles.map((r) => r.key);
        expect(keys).to.not.include('_admin');
      });
    });

    describe('One', () => {
      it('should add a role when toggleRole is called with a new key', async () => {
        await stabilize();
        component.toggleRole('chw');
        expect(component.model.roles).to.include('chw');
      });

      it('should remove a role when toggleRole is called with an existing key', async () => {
        await stabilize();
        component.toggleRole('chw');
        component.toggleRole('chw');
        expect(component.model.roles).to.not.include('chw');
      });

      it('should set isOfflineRole true when an offline role is selected', async () => {
        await stabilize();
        component.toggleRole('chw');
        expect(component.isOfflineRole).to.equal(true);
      });

      it('should toggle showPassword when togglePassword is called', () => {
        expect(component.model.showPassword).to.equal(false);
        component.togglePassword();
        expect(component.model.showPassword).to.equal(true);
      });
    });

    describe('Boundaries', () => {
      it('should reject username with uppercase letters', async () => {
        await stabilize();
        component.model.username = 'B_Wayne';
        component.model.roles = ['national_admin'];
        component.model.password = 'Str0ng!Pass99';
        component.model.passwordConfirm = 'Str0ng!Pass99';
        await component.submit();
        expect(component.errors.username).to.equal('username.invalid');
      });

      it('should reject username with spaces', async () => {
        await stabilize();
        component.model.username = 'b wayne';
        component.model.roles = ['national_admin'];
        component.model.password = 'Str0ng!Pass99';
        component.model.passwordConfirm = 'Str0ng!Pass99';
        await component.submit();
        expect(component.errors.username).to.equal('username.invalid');
      });

      it('should accept username with hyphens and underscores', async () => {
        await stabilize();
        await new Promise((resolve) => setTimeout(resolve, 0));
        component.model.username = 'b_wayne-test';
        component.model.roles = ['national_admin'];
        component.model.password = 'Str0ng!Pass99';
        component.model.passwordConfirm = 'Str0ng!Pass99';
        usersService.createUser.resolves({});
        const promise = component.submit();
        flushReplicationLimit();
        await promise;
        expect(component.errors.username).to.be.undefined;
      });

      it('should reject password shorter than 8 characters', async () => {
        await stabilize();
        component.model.username = 'b_wayne';
        component.model.roles = ['national_admin'];
        component.model.password = 'short';
        component.model.passwordConfirm = 'short';
        await component.submit();
        expect(component.errors.password).to.equal('password.length.minimum');
      });

      it('should hide password fields when token login is enabled', async () => {
        settingsService.get.resolves(
          mockSettings({ token_login: { enabled: true } }),
        );
        await stabilize();
        component.model.token_login = true;
        expect(component.passwordHidden).to.equal(true);
      });

      it('should hide password fields when SSO login is active', () => {
        component.allowSSOLogin = true;
        component.model.oidc_username = 'bruce@sso.com';
        expect(component.passwordHidden).to.equal(true);
      });
    });

    describe('Interface', () => {
      it('should emit closed when cancel is called', () => {
        const closedSpy = sinon.spy();
        component.closed.subscribe(closedSpy);
        component.cancel();
        expect(closedSpy.callCount).to.equal(1);
      });

      it('should set username error when username is missing on submit', async () => {
        await stabilize();
        component.model.roles = ['national_admin'];
        component.model.password = 'Str0ng!Pass99';
        component.model.passwordConfirm = 'Str0ng!Pass99';
        await component.submit();
        expect(component.errors.username).to.equal('field.required');
      });

      it('should set roles error when no role is selected on submit', async () => {
        await stabilize();
        component.model.username = 'b_wayne';
        component.model.password = 'Str0ng!Pass99';
        component.model.passwordConfirm = 'Str0ng!Pass99';
        await component.submit();
        expect(component.errors.roles).to.equal('field.required');
      });

      it('should set password error when password is missing on submit', async () => {
        await stabilize();
        component.model.username = 'b_wayne';
        component.model.roles = ['national_admin'];
        await component.submit();
        expect(component.errors.password).to.equal('field.required');
      });

      it('should call usersService.createUser on valid submit', async () => {
        await stabilize();
        await new Promise((resolve) => setTimeout(resolve, 0));
        usersService.createUser.resolves({});
        component.model.username = 'b_wayne';
        component.model.roles = ['national_admin'];
        component.model.password = 'Str0ng!Pass99';
        component.model.passwordConfirm = 'Str0ng!Pass99';
        const promise = component.submit();
        flushReplicationLimit();
        await promise;
        expect(usersService.createUser.callCount).to.equal(1);
      });

      it('should emit userSaved and closed after successful create', async () => {
        const userSavedSpy = sinon.spy();
        const closedSpy = sinon.spy();
        component.userSaved.subscribe(userSavedSpy);
        component.closed.subscribe(closedSpy);
        await stabilize();
        await new Promise((resolve) => setTimeout(resolve, 0));
        usersService.createUser.resolves({});
        component.model.username = 'b_wayne';
        component.model.roles = ['national_admin'];
        component.model.password = 'Str0ng!Pass99';
        component.model.passwordConfirm = 'Str0ng!Pass99';
        await component.submit();
        expect(userSavedSpy.callCount).to.equal(1);
        expect(closedSpy.callCount).to.equal(1);
      });

      it('should set submit error when createUser fails', async () => {
        await stabilize();
        usersService.createUser.rejects({ error: { message: 'Server error' } });
        component.model.username = 'b_wayne';
        component.model.roles = ['national_admin'];
        component.model.password = 'Str0ng!Pass99';
        component.model.passwordConfirm = 'Str0ng!Pass99';
        const promise = component.submit();
        flushReplicationLimit();
        await promise;
        expect(component.errors.submit).to.equal('Server error');
      });

      it('should not require password when token login is enabled', async () => {
        settingsService.get.resolves(
          mockSettings({ token_login: { enabled: true } }),
        );
        await stabilize();
        await new Promise((resolve) => setTimeout(resolve, 0));
        usersService.createUser.resolves({});
        component.model.username = 'b_wayne';
        component.model.roles = ['national_admin'];
        component.model.token_login = true;
        component.model.phone = '+1234567890';
        const promise = component.submit();
        flushReplicationLimit();
        await promise;
        expect(component.errors.password).to.be.undefined;
      });
    });

    describe('Exceptions', () => {
      it('should not call createUser when validation fails', async () => {
        await stabilize();
        await component.submit();
        expect(usersService.createUser.callCount).to.equal(0);
      });

      it('should set fallback submit error when API returns no message', async () => {
        await stabilize();
        usersService.createUser.rejects({});
        component.model.username = 'b_wayne';
        component.model.roles = ['national_admin'];
        component.model.password = 'Str0ng!Pass99';
        component.model.passwordConfirm = 'Str0ng!Pass99';
        const promise = component.submit();
        flushReplicationLimit();
        await promise;
        expect(component.errors.submit).to.equal('users.create.error');
      });
    });
  });

  // ==========================================================================
  // EDIT MODE
  // ==========================================================================
  describe('Edit mode', () => {
    beforeEach(() => {
      component.mode = 'edit';
    });

    describe('Zero', () => {
      it('should have title Edit User', () => {
        expect(component.title).to.equal('Edit User');
      });

      it('should have submitLabel Submit', () => {
        expect(component.submitLabel).to.equal('Submit');
      });

      it('should load roles from settings when modal becomes visible', async () => {
        await setupWithUser(mockUser);
        expect(component.availableRoles.length).to.be.greaterThan(0);
      });

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
    });

    describe('One', () => {
      it('should toggle role on and off', async () => {
        await setupWithUser(mockUser);
        component.toggleRole('chw');
        expect(component.model.roles).to.include('chw');
        component.toggleRole('chw');
        expect(component.model.roles).to.not.include('chw');
      });

      it('should set isOfflineRole when an offline role is selected', async () => {
        await setupWithUser(mockUser);
        component.toggleRole('chw');
        expect(component.isOfflineRole).to.equal(true);
      });
    });

    describe('Boundaries', () => {
      it('should not require password when no change is made', async () => {
        await setupWithUser(mockUser);
        usersService.updateUser.resolves({});
        component.model.fullname = 'New Name';
        const promise = component.submit();
        flushReplicationLimit();
        await promise;
        expect(component.errors.password).to.be.undefined;
      });

      it('should hide password when token login is active', async () => {
        await setupWithUser(
          {
            ...mockUser,
            token_login: { active: true, expiration_date: Date.now() + 10000 },
          },
          mockSettings({ token_login: { enabled: true } }),
        );
        component.model.token_login = true;
        expect(component.passwordHidden).to.equal(true);
      });

      it('should not validate username in edit mode', async () => {
        await setupWithUser(mockUser);
        component.model.roles = [];
        await component.submit();
        expect(component.errors.username).to.be.undefined;
      });
    });

    describe('Interface', () => {
      it('should emit closed when cancel is called', () => {
        const closedSpy = sinon.spy();
        component.closed.subscribe(closedSpy);
        component.cancel();
        expect(closedSpy.callCount).to.equal(1);
      });

      it('should set roles error when no role is selected on submit', async () => {
        await setupWithUser(mockUser);
        component.model.roles = [];
        await component.submit();
        expect(component.errors.roles).to.equal('field.required');
      });

      it('should call usersService.updateUser on valid submit', async () => {
        await setupWithUser(mockUser);
        usersService.updateUser.resolves({});
        component.model.fullname = 'New Name';
        const promise = component.submit();
        flushReplicationLimit();
        await promise;
        expect(usersService.updateUser.callCount).to.equal(1);
      });

      it('should emit userSaved and closed after successful update', async () => {
        const userSavedSpy = sinon.spy();
        const closedSpy = sinon.spy();
        component.userSaved.subscribe(userSavedSpy);
        component.closed.subscribe(closedSpy);
        await setupWithUser(mockUser);
        usersService.updateUser.resolves({});
        component.model.fullname = 'New Name';
        await component.submit();
        expect(userSavedSpy.callCount).to.equal(1);
        expect(closedSpy.callCount).to.equal(1);
      });

      it('should close without calling updateUser when nothing changed', async () => {
        const closedSpy = sinon.spy();
        component.closed.subscribe(closedSpy);
        await setupWithUser(mockUser);
        const promise = component.submit();
        flushReplicationLimit();
        await promise;
        expect(usersService.updateUser.callCount).to.equal(0);
        expect(closedSpy.callCount).to.equal(1);
      });

      it('should set submit error when updateUser fails', async () => {
        await setupWithUser(mockUser);
        usersService.updateUser.rejects({
          error: { message: 'Update failed' },
        });
        component.model.fullname = 'New Name';
        const promise = component.submit();
        flushReplicationLimit();
        await promise;
        expect(component.errors.submit).to.equal('Update failed');
      });

      it('should set loading to false after failed submit', async () => {
        await setupWithUser(mockUser);
        usersService.updateUser.rejects({});
        component.model.fullname = 'New Name';
        const promise = component.submit();
        flushReplicationLimit();
        await promise;
        expect(component.loading).to.equal(false);
      });

      it('should require facility for offline roles', async () => {
        await setupWithUser({ ...mockUser, roles: ['chw'] });
        component.model.place = null;
        component.model.contact = null;
        const promise = component.submit();
        flushReplicationLimit();
        await promise;
        expect(component.errors.place).to.equal('field.required');
      });
    });

    describe('Exceptions', () => {
      it('should handle settings load failure gracefully', async () => {
        settingsService.get.rejects(new Error('Settings unavailable'));
        component.user = mockUser as User;
        component.visible = true;
        component.ngOnChanges({
          visible: {
            currentValue: true,
            previousValue: false,
            firstChange: false,
            isFirstChange: () => false,
          },
        } as any);
        await stabilize();
        expect(component.availableRoles).to.have.length(0);
      });

      it('should not call updateUser when validation fails', async () => {
        await setupWithUser(mockUser);
        component.model.roles = [];
        await component.submit();
        expect(usersService.updateUser.callCount).to.equal(0);
      });
    });

    describe('Scenarios', () => {
      it('should reset form when visible becomes false', async () => {
        await setupWithUser(mockUser);
        expect(component.model.username).to.equal('b_wayne');
        component.visible = false;
        component.ngOnChanges({
          visible: {
            currentValue: false,
            previousValue: true,
            firstChange: false,
            isFirstChange: () => false,
          },
        } as any);
        expect(component.model.username).to.equal('');
      });

      it('should show SSO field when oidc_provider is set in settings', async () => {
        await setupWithUser(
          mockUser,
          mockSettings({ oidc_provider: 'https://sso.example.com' }),
        );
        expect(component.allowSSOLogin).to.equal(true);
      });

      it('should show token login management when token login is already enabled', async () => {
        await setupWithUser(
          {
            ...mockUser,
            token_login: { active: true, expiration_date: Date.now() + 10000 },
          },
          mockSettings({ token_login: { enabled: true } }),
        );
        expect(component.model.tokenLoginEnabled).to.not.be.null;
        expect(component.model.tokenLoginEnabled?.active).to.equal(true);
      });
    });
  });
});
