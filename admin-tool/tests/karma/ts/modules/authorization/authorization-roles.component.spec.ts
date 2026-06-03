import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { 
  AuthorizationRolesComponent 
} from '@admin-tool-modules/authorization/authorization-roles/authorization-roles.component';
import { SettingsService } from '@admin-tool-services/settings.service';

describe('AuthorizationRolesComponent', () => {
  let component: AuthorizationRolesComponent;
  let fixture: ComponentFixture<AuthorizationRolesComponent>;
  let settingsService;

  beforeEach(waitForAsync(() => {
    settingsService = {
      getRoles: sinon.stub().resolves({
        chw: { name: 'usertype.chw', offline: true },
        national_admin: { name: 'usertype.national_admin' },
      }),
      updateRoles: sinon.stub().resolves(),
    };

    return TestBed.configureTestingModule({
      imports: [AuthorizationRolesComponent, TranslateModule.forRoot()],
      providers: [{ provide: SettingsService, useValue: settingsService }],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AuthorizationRolesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => sinon.restore());

  it('should create', () => {
    expect(component).to.exist;
  });

  describe('initial state', () => {
    it('should start with loading false', () => {
      expect(component.loadingPageStatus).to.be.false;
    });
  });

  describe('ngOnInit', () => {
    it('should call getRoles on init', () => {
      expect(settingsService.getRoles.calledOnce).to.be.true;
    });

    it('should fill roles array after init', async () => {
      await fixture.whenStable();
      expect(component.roles).to.have.length(2);
    });

    it('should map roles correctly with key and value', async () => {
      await fixture.whenStable();
      const chw = component.roles.find((r) => r.key === 'chw');
      expect(chw).to.exist;
      expect(chw!.value.name).to.equal('usertype.chw');
      expect(chw!.value.offline).to.be.true;
    });

    it('should set loading to false after init', async () => {
      await fixture.whenStable();
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should handle error if getRoles fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      settingsService.getRoles.rejects(new Error('error'));
      await component.ngOnInit();
      expect(consoleStub.calledOnce).to.be.true;
    });

    it('should set loading to false even if getRoles fails', async () => {
      sinon.stub(console, 'error');
      settingsService.getRoles.rejects(new Error('error'));
      await component.ngOnInit();
      expect(component.loadingPageStatus).to.be.false;
    });
  });

  describe('validateRole', () => {
    it('should return false and set key error when key is empty', () => {
      component.newRole = { name: 'usertype.chw' };
      expect(component['validateRole']()).to.be.false;
      expect(component.roleValidation.key).to.equal('field is required');
    });

    it('should return false and set name error when name is empty', () => {
      component.newRole = { key: 'chw' };
      expect(component['validateRole']()).to.be.false;
      expect(component.roleValidation.name).to.equal('field is required');
    });

    it('should return false and set both errors when both fields are empty', () => {
      component.newRole = {};
      expect(component['validateRole']()).to.be.false;
      expect(component.roleValidation.key).to.equal('field is required');
      expect(component.roleValidation.name).to.equal('field is required');
    });

    it('should return true when both fields are filled', () => {
      component.newRole = { key: 'chw', name: 'usertype.chw' };
      expect(component['validateRole']()).to.be.true;
    });

    it('should clear previous validation errors before validating', () => {
      component.roleValidation = { key: 'field is required' };
      component.newRole = { key: 'chw', name: 'usertype.chw' };
      expect(component['validateRole']()).to.be.true;
      expect(component.roleValidation.key).to.be.undefined;
    });
  });
  describe('addRole', () => {
    it('should not call updateRoles if validation fails', async () => {
      component.newRole = {};
      await component.addRole();
      expect(settingsService.updateRoles.called).to.be.false;
    });

    it('should set responseStatus to loading while saving', async () => {
      component.newRole = { key: 'chw', name: 'usertype.chw' };
      settingsService.updateRoles.callsFake(() => {
        expect(component.responseStatus.state).to.equal('loading');
        return Promise.resolve();
      });
      await component.addRole();
    });

    it('should call updateRoles with existing roles plus new role', async () => {
      component.roles = [{ key: 'national_admin', value: { name: 'usertype.national_admin' } }];
      component.newRole = { key: 'chw', name: 'usertype.chw', offline: true };
      await component.addRole();
      expect(settingsService.updateRoles.calledWith({
        national_admin: { name: 'usertype.national_admin' },
        chw: { name: 'usertype.chw', offline: true },
      })).to.be.true;
    });

    it('should update roles array after success', async () => {
      component.roles = [{ key: 'national_admin', value: { name: 'usertype.national_admin' } }];
      component.newRole = { key: 'chw', name: 'usertype.chw' };
      await component.addRole();
      expect(component.roles).to.have.length(2);
      expect(component.roles.find(r => r.key === 'chw')).to.exist;
    });

    it('should clear newRole after success', async () => {
      component.newRole = { key: 'chw', name: 'usertype.chw' };
      await component.addRole();
      expect(component.newRole).to.deep.equal({});
    });

    it('should clear responseStatus after success', async () => {
      component.newRole = { key: 'chw', name: 'usertype.chw' };
      await component.addRole();
      expect(component.responseStatus).to.deep.equal({});
    });

    it('should set error responseStatus if updateRoles fails', async () => {
      component.newRole = { key: 'chw', name: 'usertype.chw' };
      settingsService.updateRoles.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.addRole();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Error saving settings');
    });

    it('should set isAddingRole to false after success', async () => {
      component.newRole = { key: 'chw', name: 'usertype.chw' };
      await component.addRole();
      expect(component.isAddingRole).to.be.false;
    });

    it('should set isAddingRole to false after error', async () => {
      component.newRole = { key: 'chw', name: 'usertype.chw' };
      settingsService.updateRoles.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.addRole();
      expect(component.isAddingRole).to.be.false;
    });
  });
  describe('deleteRole', () => {
    it('should call updateRoles without the deleted role', async () => {
      await component.deleteRole('chw');
      expect(settingsService.updateRoles.calledWith({
        national_admin: { name: 'usertype.national_admin' },
      })).to.be.true;
    });

    it('should update roles array after success', async () => {
      await component.deleteRole('chw');
      expect(component.roles).to.have.length(1);
      expect(component.roles.find(r => r.key === 'chw')).to.not.exist;
    });

    it('should clear responseStatus after success', async () => {
      await component.deleteRole('chw');
      expect(component.responseStatus).to.deep.equal({});
    });

    it('should set responseStatus to loading while deleting', async () => {
      settingsService.updateRoles.callsFake(() => {
        expect(component.responseStatus.state).to.equal('loading');
        return Promise.resolve();
      });
      await component.deleteRole('chw');
    });

    it('should set error responseStatus if updateRoles fails', async () => {
      settingsService.updateRoles.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.deleteRole('chw');
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Error saving settings');
    });
  });
  describe('DOM', () => {
    it('should render the roles table', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.selection-heading')).to.exist;
    });

    it('should render a row for each role', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const rows = compiled.querySelectorAll('.row:not(.selection-heading)');
      expect(rows.length).to.equal(2);
    });

    it('should show loader when loading', () => {
      component.loadingPageStatus = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader')).to.exist;
    });

    it('should not show loader when not loading', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader')).to.not.exist;
    });

    it('should show check icon for offline roles', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.fa-check')).to.exist;
    });
    
    it('should render the add role form', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('#key')).to.exist;
      expect(compiled.querySelector('#name')).to.exist;
      expect(compiled.querySelector('#offline')).to.exist;
    });

    it('should disable submit button when loading', async () => {
      await fixture.whenStable();
      component.responseStatus = { state: 'loading' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).to.be.true;
    });

    it('should disable delete buttons when loading', async () => {
      await fixture.whenStable();
      component.responseStatus = { state: 'loading' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const deleteButtons = compiled.querySelectorAll<HTMLButtonElement>('.delete button');
      deleteButtons.forEach(button => expect(button.disabled).to.be.true);
    });

    it('should show inline loader when isAddingRole is true and loading', async () => {
      await fixture.whenStable();
      component.responseStatus = { state: 'loading' };
      component.isAddingRole = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader.inline')).to.exist;
    });

    it('should not show inline loader when isAddingRole is false', async () => {
      await fixture.whenStable();
      component.responseStatus = { state: 'loading' };
      component.isAddingRole = false;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader.inline')).to.not.exist;
    });

    it('should show error message when responseStatus is error', async () => {
      await fixture.whenStable();
      component.responseStatus = { state: 'error', msg: 'Error saving settings' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.error')).to.exist;
    });

    it('should show key validation error when roleValidation.key is set', async () => {
      await fixture.whenStable();
      component.roleValidation = { key: 'field is required' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const helpBlocks = compiled.querySelectorAll('.help-block');
      expect(helpBlocks[0].textContent).to.include('field is required');
    });

    it('should show name validation error when roleValidation.name is set', async () => {
      await fixture.whenStable();
      component.roleValidation = { name: 'field is required' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const helpBlocks = compiled.querySelectorAll('.help-block');
      expect(helpBlocks[0].textContent).to.include('field is required');
    });
  });
});
