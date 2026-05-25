import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { UsersComponent } from '@admin-tool-modules/users/users.component';
import { AuthService } from '@admin-tool-services/auth.service';
import { UsersService } from '@admin-tool-services/users.service';
import { SettingsService } from '@admin-tool-services/settings.service';
import { ChangesService } from '@admin-tool-services/changes.service';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed.configureTestingModule({
      imports: [UsersComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: AuthService,
          useValue: { has: sinon.stub().resolves(false) },
        },
        {
          provide: UsersService,
          useValue: {
            getUsers: sinon.stub().resolves([]),
            usersUpdated$: { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) },
          },
        },
        { provide: SettingsService, useValue: { get: sinon.stub().resolves({
          roles: {
            chw: { name: 'Community Health Worker', offline: true },
            chw_supervisor: { name: 'CHW Supervisor', offline: true },
            national_admin: { name: 'National Admin', offline: false },
          },
          token_login: { enabled: false },
          oidc_provider: null,
        }) } },
        { provide: ChangesService, useValue: { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(UsersComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => sinon.restore());

  it('should create the users component', () => {
    expect(component).to.exist;
  });

  it('should render the users-list component', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('users-list')).to.exist;
  });
});
