import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { TranslateModule } from '@ngx-translate/core';
import { DeleteUserComponent } from '@admin-tool-modules/users/ts/components/delete-user/delete-user.component';
import { UsersService } from '@admin-tool-services/users.service';
import { User } from '@admin-tool-modules/users/users-interfaces';

interface UsersServiceMock {
  deleteUser: SinonStub;
  notifyUsersUpdated: SinonStub;
}

describe('DeleteUserComponent', () => {
  let component: DeleteUserComponent;
  let fixture: ComponentFixture<DeleteUserComponent>;
  let usersService: UsersServiceMock;

  const mockUser: Partial<User> = {
    id: '1',
    username: 'b_wayne',
    fullname: 'Bruce Wayne',
  };

  const stabilize = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    usersService = {
      deleteUser: sinon.stub(),
      notifyUsersUpdated: sinon.stub(),
    };

    await TestBed.configureTestingModule({
      imports: [DeleteUserComponent, TranslateModule.forRoot()],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteUserComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sinon.restore());

  describe('Zero', () => {
    it('should initialise with visible false', () => {
      expect(component.visible).to.equal(false);
    });

    it('should initialise with no user', () => {
      expect(component.user).to.be.null;
    });

    it('should initialise with loading false', () => {
      expect(component.loading).to.equal(false);
    });

    it('should initialise with no error', () => {
      expect(component.error).to.be.null;
    });
  });

  describe('One', () => {
    it('should show the modal when visible is true', async () => {
      component.visible = true;
      component.user = mockUser as User;
      await stabilize();
      const modal = fixture.nativeElement.querySelector('.modal.in');
      expect(modal).to.exist;
    });

    it('should hide the modal when visible is false', async () => {
      component.visible = false;
      await stabilize();
      const modal = fixture.nativeElement.querySelector('.modal.in');
      expect(modal).to.not.exist;
    });

    it('should display the username in the confirmation message', async () => {
      component.visible = true;
      component.user = mockUser as User;
      await stabilize();
      const body = fixture.nativeElement.querySelector('.modal-body');
      expect(body.textContent).to.include('b_wayne');
    });
  });

  describe('Boundaries', () => {
    it('should not call deleteUser when user has no username', async () => {
      component.user = { id: '1' } as User;
      await component.confirm();
      expect(usersService.deleteUser.callCount).to.equal(0);
    });

    it('should not call deleteUser when user is null', async () => {
      component.user = null;
      await component.confirm();
      expect(usersService.deleteUser.callCount).to.equal(0);
    });
  });

  describe('Interface', () => {
    it('should emit closed when cancel is called', () => {
      const closedSpy = sinon.spy();
      component.closed.subscribe(closedSpy);
      component.cancel();
      expect(closedSpy.callCount).to.equal(1);
    });

    it('should clear error when cancel is called', () => {
      component.error = 'some error';
      component.cancel();
      expect(component.error).to.be.null;
    });

    it('should call deleteUser with the username on confirm', async () => {
      component.user = mockUser as User;
      usersService.deleteUser.resolves({});
      await component.confirm();
      expect(usersService.deleteUser.calledWith('b_wayne')).to.be.true;
    });

    it('should notify usersService after successful delete', async () => {
      component.user = mockUser as User;
      usersService.deleteUser.resolves({});
      await component.confirm();
      expect(usersService.notifyUsersUpdated.callCount).to.equal(1);
    });

    it('should emit userDeleted and closed after successful delete', async () => {
      const userDeletedSpy = sinon.spy();
      const closedSpy = sinon.spy();
      component.userDeleted.subscribe(userDeletedSpy);
      component.closed.subscribe(closedSpy);
      component.user = mockUser as User;
      usersService.deleteUser.resolves({});
      await component.confirm();
      expect(userDeletedSpy.callCount).to.equal(1);
      expect(closedSpy.callCount).to.equal(1);
    });

    it('should set error when deleteUser fails', async () => {
      component.user = mockUser as User;
      usersService.deleteUser.rejects({ error: { message: 'Server error' } });
      await component.confirm();
      expect(component.error).to.equal('Server error');
    });

    it('should set fallback error when API returns no message', async () => {
      component.user = mockUser as User;
      usersService.deleteUser.rejects({});
      await component.confirm();
      expect(component.error).to.equal('Error deleting document');
    });

    it('should set loading to false after failed delete', async () => {
      component.user = mockUser as User;
      usersService.deleteUser.rejects({});
      await component.confirm();
      expect(component.loading).to.equal(false);
    });
  });

  describe('Exceptions', () => {
    it('should not emit userDeleted when delete fails', async () => {
      const userDeletedSpy = sinon.spy();
      component.userDeleted.subscribe(userDeletedSpy);
      component.user = mockUser as User;
      usersService.deleteUser.rejects({});
      await component.confirm();
      expect(userDeletedSpy.callCount).to.equal(0);
    });
  });

  describe('Scenarios', () => {
    it('should show backdrop when visible', async () => {
      component.visible = true;
      component.user = mockUser as User;
      await stabilize();
      const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');
      expect(backdrop).to.exist;
    });

    it('should disable buttons while loading', async () => {
      component.visible = true;
      component.user = mockUser as User;
      component.loading = true;
      await stabilize();
      const buttons =
        fixture.nativeElement.querySelectorAll('button[disabled]');
      expect(buttons.length).to.be.greaterThan(0);
    });
  });
});
