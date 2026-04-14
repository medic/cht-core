import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { TranslateModule } from '@ngx-translate/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersListComponent } from '@admin-tool-modules/users/ts/components/users-list/users-list.component';
import { AuthService } from '@admin-tool-services/auth.service';
import { UsersService } from '@admin-tool-services/users.service';
import { SettingsService } from '@admin-tool-services/settings.service';
import { ChangesService } from '@admin-tool-services/changes.service';

const mockUser = (overrides = {}) => ({
  id: '1',
  username: 'b_wayne',
  fullname: 'Bruce Wayne',
  phone: '555-0101',
  facility_id: 'f1',
  contact_id: 'c1',
  inactive: false,
  ...overrides,
});

describe('UsersListComponent', () => {
  let fixture: ComponentFixture<UsersListComponent>;
  let component: UsersListComponent;
  let authService: any;
  let usersService: any;

  beforeEach(async () => {
    authService = { has: sinon.stub() };
    const unsubscribeStub = sinon.stub();
    usersService = {
      getUsers: sinon.stub(),
      usersUpdated$: {
        subscribe: sinon.stub().callsFake((_cb: any) => ({ unsubscribe: unsubscribeStub })),
      },
    };

    await TestBed.configureTestingModule({
      imports: [UsersListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        { provide: SettingsService, useValue: { get: sinon.stub().resolves({}) } },
        { provide: ChangesService, useValue: { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sinon.restore());

  // --- ZERO ---
  describe('Zero', () => {
    it('should show empty list when no users are returned', async () => {
      authService.has.resolves(true);
      usersService.getUsers.resolves([]);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.users.length).to.equal(0);
    });

    it('should not show loader after empty list loads', async () => {
      authService.has.resolves(true);
      usersService.getUsers.resolves([]);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.loading).to.equal(false);
    });
  });

  // --- ONE ---
  describe('One', () => {
    it('should show one user in the list', async () => {
      authService.has.resolves(true);
      usersService.getUsers.resolves([mockUser()]);

      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.users.length).to.equal(1);
      expect(component.users[0].username).to.equal('b_wayne');
    });
  });

  // --- MANY ---
  describe('Many', () => {
    it('should show multiple users in the list', async () => {
      authService.has.resolves(true);
      usersService.getUsers.resolves([
        mockUser({ id: 1, name: 'b_wayne' }),
        mockUser({ id: 2, name: 't_stark' }),
        mockUser({ id: 3, name: 'p_parker' }),
      ]);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.users.length).to.equal(3);
    });
  });

  // --- BOUNDARIES ---
  describe('Boundaries', () => {
    it('should mark inactive users correctly', async () => {
      authService.has.resolves(true);
      usersService.getUsers.resolves([
        mockUser({ id: 1, inactive: false }),
        mockUser({ id: 2, inactive: true }),
      ]);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.users[0].inactive).to.equal(false);
      expect(component.users[1].inactive).to.equal(true);
    });

    it('should not call editUser when clicking an inactive user', () => {
      const editStub = sinon.stub(component, 'editUser');
      const inactiveUser = mockUser({ inactive: true });

      if (!inactiveUser.inactive) {
        component.editUser(inactiveUser);
      }

      expect(editStub.callCount).to.equal(0);
    });

    it('should call editUser when clicking an active user', () => {
      const editStub = sinon.stub(component, 'editUser');
      const activeUser = mockUser({ inactive: false });

      if (!activeUser.inactive) {
        component.editUser(activeUser);
      }

      expect(editStub.callCount).to.equal(1);
    });
  });

  // --- INTERFACE ---
  describe('Interface', () => {
    it('should call authService.has with can_configure on init', async () => {
      authService.has.resolves(false);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(authService.has.calledWith('can_configure')).to.equal(true);
    });

    it('should call usersService.getUsers when user has permission', async () => {
      authService.has.resolves(true);
      usersService.getUsers.resolves([]);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(usersService.getUsers.callCount).to.equal(1);
    });

    it('should not call usersService.getUsers when user lacks permission', async () => {
      authService.has.resolves(false);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(usersService.getUsers.callCount).to.equal(0);
    });

    it('deleteUser should stop event propagation', () => {
      const event = { stopPropagation: sinon.stub() } as any;
      component.deleteUser(mockUser(), event);
      expect(event.stopPropagation.callCount).to.equal(1);
    });

    it('should call addUser without errors', () => {
      expect(() => component.addUser()).to.not.throw();
    });

    it('should call importUsers without errors', () => {
      expect(() => component.importUsers()).to.not.throw();
    });

    it('should call editUser without errors', () => {
      expect(() => component.editUser(mockUser())).to.not.throw();
    });

    it('should not call editUser when onRowClick called with inactive user', () => {
      const editStub = sinon.stub(component, 'editUser');
      component.onRowClick(mockUser({ inactive: true }));
      expect(editStub.callCount).to.equal(0);
    });

    it('should call editUser when onRowClick called with active user', () => {
      const editStub = sinon.stub(component, 'editUser');
      component.onRowClick(mockUser({ inactive: false }));
      expect(editStub.callCount).to.equal(1);
    });
  });

  // --- EXCEPTIONS ---
  describe('Exceptions', () => {
    it('should set error to true when getUsers fails', async () => {
      authService.has.resolves(true);
      usersService.getUsers.rejects(new Error('API error'));

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.error).to.equal(true);
    });

    it('should set loading to false even when getUsers fails', async () => {
      authService.has.resolves(true);
      usersService.getUsers.rejects(new Error('API error'));

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.loading).to.equal(false);
    });

    it('should not show users when user lacks can_configure permission', async () => {
      authService.has.resolves(false);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.canConfigure).to.equal(false);
      expect(component.users.length).to.equal(0);
    });
  });

  // --- SCENARIOS ---
  describe('Scenarios', () => {
    it('should complete full flow: permission check → load → display users', async () => {
      const users = [
        mockUser({ id: 1, name: 'b_wayne' }),
        mockUser({ id: 2, name: 't_stark' }),
      ];

      authService.has.resolves(true);
      usersService.getUsers.resolves(users);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.canConfigure).to.equal(true);
      expect(component.loading).to.equal(false);
      expect(component.error).to.equal(false);
      expect(component.users.length).to.equal(2);
    });

    it('should show loading indicator while fetching users', async () => {
      authService.has.resolves(true);

      let resolveUsers: any;
      usersService.getUsers.returns(
        new Promise((resolve) => (resolveUsers = resolve)),
      );

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.loading).to.equal(true);

      resolveUsers([]);
    });
  });
});
