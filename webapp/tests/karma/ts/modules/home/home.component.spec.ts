import sinon from 'sinon';
import { expect } from 'chai';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { HomeComponent } from '@mm-modules/home/home.component';
import { HeaderTabsService } from '@mm-services/header-tabs.service';

describe('HomeComponent', () => {

  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let headerTabsServiceMock;
  let routerMock;

  beforeEach(waitForAsync(() => {

    headerTabsServiceMock = {
      getPrimaryTab: sinon.stub().resolves({ route: 'messages' }),
    };
    routerMock = {
      navigate: sinon.stub(),
    };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          FormsModule,
          HomeComponent,
        ],
        providers: [
          { provide: HeaderTabsService, useValue: headerTabsServiceMock },
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
    headerTabsServiceMock.getPrimaryTab.resolves(undefined);

    await component.ngOnInit();
    expect(routerMock.navigate.callCount).to.equal(1);
    expect(routerMock.navigate.args[0][0]).to.deep.equal(['error', '403']);
  });

  it('handles some permissions', async () => {
    headerTabsServiceMock.getPrimaryTab.resolves({ route: 'reports' });

    await component.ngOnInit();
    expect(routerMock.navigate.callCount).to.equal(1);
    expect(routerMock.navigate.args[0][0]).to.deep.equal(['reports']);
  });
});
