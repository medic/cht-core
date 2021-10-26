import sinon from 'sinon';
import { expect } from 'chai';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { HomeComponent } from '@mm-modules/home/home.component';
import { AuthService } from '@mm-services/auth.service';

describe('HomeComponent', () => {

  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let authServiceMock;
  let routerMock;

  beforeEach(waitForAsync(() => {

    authServiceMock = {
      has: sinon.stub(),
    };
    routerMock = {
      navigate: sinon.stub(),
    };

    return TestBed
      .configureTestingModule({
        declarations: [
          HomeComponent,
        ],
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          FormsModule,
        ],
        providers: [
          { provide: AuthService, useValue: authServiceMock },
          { provide: Router, useValue: routerMock },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(HomeComponent);
        component = fixture.componentInstance;
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('handles no permissions', async () => {
    authServiceMock.has.resolves(false);

    await component.ngOnInit();
    expect(routerMock.navigate.callCount).to.equal(1);
    expect(routerMock.navigate.args[0][0]).to.deep.equal(['error', '403']);
  });

  it('handles some permissions', async () => {
    authServiceMock.has
      .withArgs(['can_view_messages', 'can_view_messages_tab']).resolves(false)
      .withArgs(['can_view_tasks', 'can_view_tasks_tab']).resolves(false)
      .withArgs(['can_view_reports', 'can_view_reports_tab']).resolves(true)
      .withArgs(['can_view_analytics', 'can_view_analytics_tab']).resolves(false)
      .withArgs(['can_view_contacts', 'can_view_contacts_tab']).resolves(true);

    await component.ngOnInit();
    expect(routerMock.navigate.callCount).to.equal(1);
    expect(routerMock.navigate.args[0][0]).to.deep.equal(['reports']);
  });
});
