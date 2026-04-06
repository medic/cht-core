import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
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
    };

    return TestBed.configureTestingModule({
      imports: [AuthorizationRolesComponent],
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
  });
});
