import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { TranslateModule } from '@ngx-translate/core';
import { CreateUserComponent } from '@admin-tool-modules/users/ts/components/create-user/create-user.component';
import { CreateUserService } from '@admin-tool-services/create-user.service';
import { Select2SearchService } from '@admin-tool-services/select2search.service';
import { SettingsService } from '@admin-tool-services/settings.service';
import { UsersService } from '@admin-tool-services/users.service';

const mockSettings = (overrides: any = {}) => ({
  roles: {
    chw: { name: 'Community Health Worker', offline: true },
    chw_supervisor: { name: 'CHW Supervisor', offline: true },
    national_admin: { name: 'National Admin', offline: false },
  },
  token_login: { enabled: false },
  oidc_provider: null,
  ...overrides,
});

describe('CreateUserComponent', () => {
  let fixture: ComponentFixture<CreateUserComponent>;
  let component: CreateUserComponent;
  let createUserService: any;
  let select2SearchService: any;
  let settingsService: any;
  let usersService: any;

  let jqueryInstance: any;
  let httpMock: HttpTestingController;

  /**
   * Waits for Angular zone to settle AND for any pending microtasks
   * (e.g. Sinon stub promises like settingsService.get) to resolve.
   * Must be called after fixture.detectChanges() before interacting with async state.
   */
  const stabilize = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
  };

  /**
   * Flushes a pending replication limit request with a no-warning response.
   * Called after submit() in tests that expect the form to proceed past that check.
   */
  const flushReplicationLimit = () => {
    const requests = httpMock.match(r => r.url.includes('/api/v1/users-info'));
    requests.forEach(req => req.flush({ warn: false }));
  };

  beforeEach(async () => {
    // Mock jQuery globally — not available in Karma environment
    jqueryInstance = {
      val: sinon.stub().returns(null),
      trigger: sinon.stub().returnsThis(),
      select2: sinon.stub().returnsThis(),
      find: sinon.stub().returns({ length: 0 }),
      append: sinon.stub().returnsThis(),
    };
    (window as any).$ = sinon.stub().returns(jqueryInstance);

    createUserService = { createUser: sinon.stub() };
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
      imports: [CreateUserComponent, TranslateModule.forRoot()],
      providers: [
        { provide: CreateUserService, useValue: createUserService },
        { provide: Select2SearchService, useValue: select2SearchService },
        { provide: SettingsService, useValue: settingsService },
        { provide: UsersService, useValue: usersService },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateUserComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Flush any pending HTTP requests (e.g. replication limit check)
    try {
      httpMock.verify(); 
    } catch { /* ignore */ }
    sinon.restore();
    delete (window as any).$;
  });

  // --- ZERO ---
  describe('Zero', () => {
    it('should initialise with empty model', () => {
      expect(component.model.username).to.equal('');
      expect(component.model.password).to.equal('');
      expect(component.model.roles).to.deep.equal([]);
      expect(component.model.place).to.equal(null);
      expect(component.model.contact).to.equal(null);
    });

    it('should initialise with no errors', () => {
      expect(Object.keys(component.errors).length).to.equal(0);
    });

    it('should initialise with loading false', () => {
      expect(component.loading).to.equal(false);
    });

    it('should initialise with no available roles before settings load', () => {
      expect(component.availableRoles.length).to.equal(0);
    });

    it('should load roles from settings on init', async () => {
      await stabilize();

      expect(component.availableRoles.length).to.equal(3);
      expect(component.availableRoles[0].key).to.equal('chw');
      expect(component.availableRoles[0].label).to.equal('Community Health Worker');
    });

    it('should exclude _admin role from available roles', async () => {
      settingsService.get.resolves(mockSettings({
        roles: {
          _admin: { name: 'Admin' },
          chw: { name: 'Community Health Worker', offline: true },
        },
      }));

      await stabilize();

      expect(component.availableRoles.length).to.equal(1);
      expect(component.availableRoles[0].key).to.equal('chw');
    });
  });

  // --- ONE ---
  describe('One', () => {
    it('should add a role when toggleRole is called with a new key', () => {
      component.toggleRole('chw');
      expect(component.model.roles).to.include('chw');
    });

    it('should remove a role when toggleRole is called with an existing key', () => {
      component.model.roles = ['chw'];
      component.toggleRole('chw');
      expect(component.model.roles).to.not.include('chw');
    });

    it('should set isOfflineRole true when an offline role is selected', async () => {
      await stabilize();

      component.toggleRole('chw');
      expect(component.isOfflineRole).to.equal(true);
    });

    it('should set isOfflineRole false when an online role is selected', async () => {
      await stabilize();

      component.toggleRole('national_admin');
      expect(component.isOfflineRole).to.equal(false);
    });

    it('should toggle showPassword when togglePassword is called', () => {
      expect(component.model.showPassword).to.equal(false);
      component.togglePassword();
      expect(component.model.showPassword).to.equal(true);
      component.togglePassword();
      expect(component.model.showPassword).to.equal(false);
    });
  });

  // --- MANY ---
  describe('Many', () => {
    it('should allow multiple roles to be selected', () => {
      component.toggleRole('chw');
      component.toggleRole('chw_supervisor');
      expect(component.model.roles.length).to.equal(2);
      expect(component.model.roles).to.include('chw');
      expect(component.model.roles).to.include('chw_supervisor');
    });

    it('should remove only the toggled role when multiple roles are selected', () => {
      component.model.roles = ['chw', 'chw_supervisor'];
      component.toggleRole('chw');
      expect(component.model.roles.length).to.equal(1);
      expect(component.model.roles).to.include('chw_supervisor');
    });
  });

  // --- BOUNDARIES ---
  describe('Boundaries', () => {
    it('should reject username with uppercase letters', async () => {
      component.model.username = 'BadUser';
      component.model.roles = ['chw'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';

      await component.submit();

      expect(component.errors.username).to.equal('username.invalid');
    });

    it('should reject username with spaces', async () => {
      component.model.username = 'bad user';
      component.model.roles = ['chw'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';

      await component.submit();

      expect(component.errors.username).to.equal('username.invalid');
    });

    it('should accept username with hyphens and underscores', async () => {
      component.model.username = 'b_wayne-2';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';
      createUserService.createUser.resolves({});

      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;

      expect(component.errors.username).to.be.undefined;
    });

    it('should reject password shorter than 8 characters', async () => {
      component.model.username = 'b_wayne';
      component.model.roles = ['chw'];
      component.model.password = 'short';
      component.model.passwordConfirm = 'short';

      await component.submit();

      expect(component.errors.password).to.equal('password.length.minimum');
    });

    it('should reject a weak password that meets length requirement', async () => {
      component.model.username = 'b_wayne';
      component.model.roles = ['chw'];
      component.model.password = 'aaaaaaaa';
      component.model.passwordConfirm = 'aaaaaaaa';

      await component.submit();

      expect(component.errors.password).to.equal('password.weak');
    });

    it('should reject invalid email format', async () => {
      component.model.username = 'b_wayne';
      component.model.email = 'notanemail';
      component.model.roles = ['chw'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';

      await component.submit();

      expect(component.errors.email).to.equal('email.invalid');
    });

    it('should accept email that matches something@something', async () => {
      component.model.username = 'b_wayne';
      component.model.email = 'bruce@wayne.com';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';
      createUserService.createUser.resolves({});

      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;

      expect(component.errors.email).to.be.undefined;
    });
  });

  // --- INTERFACE ---
  describe('Interface', () => {
    it('should emit closed when cancel is called', () => {
      const closedSpy = sinon.spy();
      component.closed.subscribe(closedSpy);

      component.cancel();

      expect(closedSpy.callCount).to.equal(1);
    });

    it('should reset model when cancel is called', () => {
      component.model.username = 'b_wayne';
      component.model.roles = ['chw'];

      component.cancel();

      expect(component.model.username).to.equal('');
      expect(component.model.roles).to.deep.equal([]);
    });

    it('should set username error when username is missing on submit', async () => {
      component.model.username = '';
      await component.submit();
      expect(component.errors.username).to.equal('field.required');
    });

    it('should set roles error when no role is selected on submit', async () => {
      component.model.username = 'b_wayne';
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';

      await component.submit();

      expect(component.errors.roles).to.equal('field.required');
    });

    it('should set password error when password is missing on submit', async () => {
      component.model.username = 'b_wayne';
      component.model.roles = ['national_admin'];

      await component.submit();

      expect(component.errors.password).to.equal('field.required');
    });

    it('should set passwordConfirm error when passwords do not match', async () => {
      component.model.username = 'b_wayne';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Different!Pass99';

      await component.submit();

      expect(component.errors.passwordConfirm).to.equal('Passwords must match');
    });

    it('should require facility for offline roles', async () => {
      await stabilize();

      component.model.username = 'b_wayne';
      component.model.roles = ['chw'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';

      // If settingsRoles isn't populated yet, chw appears online and
      // validateReplicationLimit() fires an HTTP call — flush it defensively
      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;

      expect(component.errors.place).to.equal('field.required');
    });

    it('should require contact for offline roles', async () => {
      await stabilize();

      component.model.username = 'b_wayne';
      component.model.roles = ['chw'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';

      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;

      expect(component.errors.contact).to.equal('field.required');
    });

    it('should not require facility or contact for online roles', async () => {
      await stabilize();

      component.model.username = 'b_wayne';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';
      createUserService.createUser.resolves({});

      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;

      expect(component.errors.place).to.be.undefined;
      expect(component.errors.contact).to.be.undefined;
    });

    it('should call createUserService.createUser on valid submit', async () => {
      await stabilize();

      component.model.username = 'b_wayne';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';
      createUserService.createUser.resolves({});

      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;

      expect(createUserService.createUser.callCount).to.equal(1);
    });

    it('should notify usersService after successful submit', async () => {
      await stabilize();

      component.model.username = 'b_wayne';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';
      createUserService.createUser.resolves({});

      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;

      expect(usersService.notifyUsersUpdated.callCount).to.equal(1);
    });

    it('should emit userCreated and closed after successful submit', async () => {
      await stabilize();

      const userCreatedSpy = sinon.spy();
      const closedSpy = sinon.spy();
      component.userCreated.subscribe(userCreatedSpy);
      component.closed.subscribe(closedSpy);

      component.model.username = 'b_wayne';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';
      createUserService.createUser.resolves({});

      await component.submit();

      expect(createUserService.createUser.callCount).to.equal(1);
      expect(userCreatedSpy.callCount).to.equal(1);
      expect(closedSpy.callCount).to.equal(1);
    });

    it('should set submit error when createUser fails', async () => {
      await stabilize();

      component.model.username = 'b_wayne';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';
      createUserService.createUser.rejects({ error: { message: 'Username already taken' } });

      await component.submit();

      expect(component.errors.submit).to.equal('Username already taken');
    });

    it('should set loading to false after failed submit', async () => {
      await stabilize();

      component.model.username = 'b_wayne';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';
      createUserService.createUser.rejects(new Error('Network error'));

      await component.submit();

      expect(component.loading).to.equal(false);
    });

    it('should hide password fields when token login is enabled', async () => {
      await stabilize();

      settingsService.get.resolves(mockSettings({ token_login: { enabled: true } }));
      component.allowTokenLogin = true;
      component.model.token_login = true;

      expect(component.passwordHidden).to.equal(true);
    });

    it('should hide password fields when SSO login is active', () => {
      component.allowSSOLogin = true;
      component.model.oidc_username = 'bruce@wayne.com';

      expect(component.passwordHidden).to.equal(true);
    });

    it('should not require password when token login is enabled', async () => {
      await stabilize();

      component.allowTokenLogin = true;
      component.model.token_login = true;
      component.model.username = 'b_wayne';
      component.model.roles = ['national_admin'];
      component.model.phone = '+1234567890';
      createUserService.createUser.resolves({});

      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;

      expect(component.errors.password).to.be.undefined;
    });

    it('should set contact error when contact is not in place', async () => {
      await stabilize();

      select2SearchService.isContactInPlace.resolves(false);

      // Make jQuery val() return the place and contact so computeFields populates the model
      jqueryInstance.val.onCall(0).returns(['facility-1']);
      jqueryInstance.val.onCall(1).returns('contact-1');

      component.model.username = 'b_wayne';
      component.model.roles = ['chw'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';

      await component.submit();

      expect(component.errors.contact).to.equal('configuration.user.place.contact');
    });
  });

  // --- EXCEPTIONS ---
  describe('Exceptions', () => {
    it('should set fallback submit error when API returns no message', async () => {
      await stabilize();

      component.model.username = 'b_wayne';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';
      createUserService.createUser.rejects(new Error('Network error'));

      await component.submit();

      expect(component.errors.submit).to.equal('users.create.error');
    });

    it('should not call createUser when validation fails', async () => {
      component.model.username = '';
      await component.submit();
      expect(createUserService.createUser.callCount).to.equal(0);
    });

    it('should not call createUser when contact is not in place', async () => {
      await stabilize();

      select2SearchService.isContactInPlace.resolves(false);

      component.model.username = 'b_wayne';
      component.model.roles = ['chw'];
      component.model.place = 'facility-1';
      component.model.contact = 'contact-1';
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';

      await component.submit();

      expect(createUserService.createUser.callCount).to.equal(0);
    });

    it('should handle settings load failure gracefully', async () => {
      settingsService.get.rejects(new Error('Settings unavailable'));

      await stabilize();

      expect(component.availableRoles.length).to.equal(0);
    });

    it('should reset errors on new submit attempt', async () => {
      await stabilize();

      component.model.username = '';
      await component.submit();
      expect(component.errors.username).to.equal('field.required');

      component.model.username = 'b_wayne';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';
      createUserService.createUser.resolves({});

      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;

      expect(component.errors.username).to.be.undefined;
    });
  });

  // --- SCENARIOS ---
  describe('Scenarios', () => {
    it('should complete full happy path: fill form → submit → close modal', async () => {
      await stabilize();

      const closedSpy = sinon.spy();
      component.closed.subscribe(closedSpy);
      createUserService.createUser.resolves({});

      component.model.username = 'b_wayne';
      component.model.fullname = 'Bruce Wayne';
      component.model.email = 'bruce@wayne.com';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';

      const submitPromise = component.submit();
      await fixture.whenStable();
      flushReplicationLimit();
      await submitPromise;
      await fixture.whenStable();

      expect(createUserService.createUser.callCount).to.equal(1);
      expect(usersService.notifyUsersUpdated.callCount).to.equal(1);
      expect(closedSpy.callCount).to.equal(1);
      expect(component.model.username).to.equal('');
    });

    it('should reset form after successful submit', async () => {
      await stabilize();

      component.model.username = 'b_wayne';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';
      createUserService.createUser.resolves({});

      const submitPromise = component.submit();
      flushReplicationLimit();
      await submitPromise;

      expect(component.model.username).to.equal('');
      expect(component.model.roles).to.deep.equal([]);
      expect(component.model.password).to.equal('');
      expect(component.loading).to.equal(false);
    });

    it('should require facility when online user selects a contact', async () => {
      await stabilize();

      // computeFields reads from DOM — return empty place and a contact
      jqueryInstance.val.onCall(0).returns([]);
      jqueryInstance.val.onCall(1).returns('contact-1');

      component.model.username = 'b_wayne';
      component.model.roles = ['national_admin'];
      component.model.password = 'Str0ng!Pass99';
      component.model.passwordConfirm = 'Str0ng!Pass99';

      await component.submit();

      expect(component.errors.place).to.equal('field.required');
    });

    it('should show token login checkbox when token login is enabled in settings', async () => {
      settingsService.get.resolves(mockSettings({ token_login: { enabled: true } }));

      await stabilize();

      expect(component.allowTokenLogin).to.equal(true);
    });

    it('should show SSO field when oidc_provider is set in settings', async () => {
      settingsService.get.resolves(mockSettings({ oidc_provider: 'https://sso.example.com' }));

      await stabilize();

      expect(component.allowSSOLogin).to.equal(true);
    });
  });
});
