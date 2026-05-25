import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { 
  AuthorizationPermissionsComponent
} from '@admin-tool-modules/authorization/authorization-permissions/authorization-permissions.component';
import { SettingsService } from '@admin-tool-services/settings.service';

describe('AuthorizationPermissionsComponent', () => {
  let component: AuthorizationPermissionsComponent;
  let fixture: ComponentFixture<AuthorizationPermissionsComponent>;
  let settingsService;

  beforeEach(waitForAsync(() => {
    settingsService = {
      getRoles: sinon.stub().resolves({
        chw: { name: 'usertype.chw', offline: true },
        national_admin: { name: 'usertype.national_admin' },
      }),
      getPermissions: sinon.stub().resolves({
        can_configure: ['national_admin'],
        can_edit: ['chw', 'national_admin'],
      }),
      updatePermissions: sinon.stub().resolves(),
    };

    return TestBed.configureTestingModule({
      imports: [AuthorizationPermissionsComponent, TranslateModule.forRoot()],
      providers: [{ provide: SettingsService, useValue: settingsService }],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AuthorizationPermissionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => sinon.restore());

  it('should create', () => {
    expect(component).to.exist;
  });

  describe('initial state', () => {
    it('should start with empty permissions array', () => {
      expect(component.permissions).to.be.an('array');
    });

    it('should start with loadingPageStatus false', () => {
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should start with empty responseStatus', () => {
      expect(component.responseStatus).to.deep.equal({});
    });
  });
  describe('ngOnInit', () => {
    it('should call getRoles on init', () => {
      expect(settingsService.getRoles.calledOnce).to.be.true;
    });

    it('should call getPermissions on init', () => {
      expect(settingsService.getPermissions.calledOnce).to.be.true;
    });

    it('should fill permissions array after init', async () => {
      await fixture.whenStable();
      expect(component.permissions).to.have.length(2);
    });

    it('should sort permissions alphabetically', async () => {
      await fixture.whenStable();
      expect(component.permissions[0].key).to.equal('can_configure');
      expect(component.permissions[1].key).to.equal('can_edit');
    });

    it('should set loadingPageStatus to false after init', async () => {
      await fixture.whenStable();
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should set loadingPageStatus to false even if getRoles fails', async () => {
      sinon.stub(console, 'error');
      settingsService.getRoles.rejects(new Error('error'));
      await component.ngOnInit();
      expect(component.loadingPageStatus).to.be.false;
    });

    it('should handle error if getRoles fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      settingsService.getRoles.rejects(new Error('error'));
      await component.ngOnInit();
      expect(consoleStub.calledOnce).to.be.true;
    });

    it('should handle error if getPermissions fails', async () => {
      const consoleStub = sinon.stub(console, 'error');
      settingsService.getPermissions.rejects(new Error('error'));
      await component.ngOnInit();
      expect(consoleStub.calledOnce).to.be.true;
    });
  });
  describe('buildPermissions', () => {
    it('should build permissions with correct keys', async () => {
      await fixture.whenStable();
      const permission = component.permissions.find(p => p.key === 'can_configure');
      expect(permission).to.exist;
    });

    it('should build roles for each permission', async () => {
      await fixture.whenStable();
      const permission = component.permissions.find(p => p.key === 'can_configure');
      expect(permission!.roles).to.have.length(2);
    });

    it('should set enabled true for roles that have the permission', async () => {
      await fixture.whenStable();
      const permission = component.permissions.find(p => p.key === 'can_configure');
      const role = permission!.roles.find(r => r.key === 'national_admin');
      expect(role!.enabled).to.be.true;
    });

    it('should set enabled false for roles that do not have the permission', async () => {
      await fixture.whenStable();
      const permission = component.permissions.find(p => p.key === 'can_configure');
      const role = permission!.roles.find(r => r.key === 'chw');
      expect(role!.enabled).to.be.false;
    });

    it('should set role name from rolesMap', async () => {
      await fixture.whenStable();
      const permission = component.permissions.find(p => p.key === 'can_configure');
      const role = permission!.roles.find(r => r.key === 'chw');
      expect(role!.name).to.equal('usertype.chw');
    });

    it('should return empty array when permissions map is empty', async () => {
      settingsService.getPermissions.resolves({});
      await component.ngOnInit();
      expect(component.permissions).to.have.length(0);
    });
  });
  describe('setPermissions', () => {
    it('should set responseStatus to loading at start', () => {
      component.setPermissions();
      expect(component.responseStatus.state).to.equal('loading');
    });

    it('should call updatePermissions with correct permissions map', async () => {
      await fixture.whenStable();
      await component.setPermissions();
      expect(settingsService.updatePermissions.calledWith({
        can_configure: ['national_admin'],
        can_edit: ['chw', 'national_admin'],
      })).to.be.true;
    });

    it('should clear responseStatus after success', async () => {
      await fixture.whenStable();
      await component.setPermissions();
      expect(component.responseStatus).to.deep.equal({});
    });

    it('should set responseStatus to loading while saving', async () => {
      await fixture.whenStable();
      settingsService.updatePermissions.callsFake(() => {
        expect(component.responseStatus.state).to.equal('loading');
        return Promise.resolve();
      });
      await component.setPermissions();
    });

    it('should set error responseStatus if updatePermissions fails', async () => {
      await fixture.whenStable();
      settingsService.updatePermissions.rejects(new Error('error'));
      sinon.stub(console, 'error');
      await component.setPermissions();
      expect(component.responseStatus.state).to.equal('error');
      expect(component.responseStatus.msg).to.equal('Error saving settings');
    });

    it('should call console.error if updatePermissions fails', async () => {
      await fixture.whenStable();
      settingsService.updatePermissions.rejects(new Error('error'));
      const consoleStub = sinon.stub(console, 'error');
      await component.setPermissions();
      expect(consoleStub.calledOnce).to.be.true;
    });
  });
  describe('DOM', () => {
    it('should show loader when loadingPageStatus is true', () => {
      component.loadingPageStatus = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader')).to.exist;
    });

    it('should not show loader when loadingPageStatus is false', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader')).to.not.exist;
    });

    it('should render a row for each permission', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const rows = compiled.querySelectorAll('.row');
      expect(rows.length).to.equal(2);
    });

    it('should render checkboxes for each role in each permission', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const checkboxes = compiled.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).to.equal(4);
    });

    it('should render the submit button', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('button[type="submit"]')).to.exist;
    });

    it('should disable submit button when loading', async () => {
      await fixture.whenStable();
      component.responseStatus = { state: 'loading' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).to.be.true;
    });

    it('should enable submit button when not loading', async () => {
      await fixture.whenStable();
      component.responseStatus = {};
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).to.be.false;
    });

    it('should show inline loader when responseStatus is loading', async () => {
      await fixture.whenStable();
      component.responseStatus = { state: 'loading' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.loader.inline')).to.exist;
    });

    it('should show error message when responseStatus is error', async () => {
      await fixture.whenStable();
      component.responseStatus = { state: 'error', msg: 'Error saving settings' };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.error')).to.exist;
    });

    it('should not show error message when responseStatus is empty', async () => {
      await fixture.whenStable();
      component.responseStatus = {};
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.error')).to.not.exist;
    });
  });
});
