import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { AboutComponent } from '@mm-modules/about/about.component';
import { ResourceIconsService } from '@mm-services/resource-icons.service';
import { SessionService } from '@mm-services/session.service';
import { VersionService } from '@mm-services/version.service';
import { DbService } from '@mm-services/db.service';
import { Selectors } from '@mm-selectors/index';

describe('About Component', () => {
  let component:AboutComponent;
  let fixture:ComponentFixture<AboutComponent>;
  let dbService;
  let resourceIconsService;
  let sessionService;
  let versionService;
  let dbInfo;

  beforeEach(async(() => {
    const mockedSelectors = [
      { selector: Selectors.getReplicationStatus, value: {} },
      { selector: Selectors.getAndroidAppVersion, value: '' },
    ];

    versionService = {
      getLocal: sinon.stub().resolves('123'),
      getRemoteRev: sinon.stub().resolves('456'),
    };

    dbInfo = sinon.stub().resolves('db-info');
    dbService = { get: sinon.stub().returns({ info: dbInfo }) };
    resourceIconsService = { getDocResources: sinon.stub().resolves() };
    sessionService = { userCtx: sinon.stub().returns('userctx') };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule
        ],
        declarations: [
          AboutComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ResourceIconsService, useValue: resourceIconsService },
          { provide: SessionService, useValue: sessionService },
          { provide: VersionService, useValue: versionService },
          { provide: DbService, useValue: dbService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AboutComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create About component', () => {
    expect(component).to.exist;
  });

  it('ngOnInit() should subscribe to redux, get versions, ', async () => {
    const spySubscriptionsAdd = sinon.spy(component.subscription, 'add');

    component.ngOnInit();

    expect(spySubscriptionsAdd.callCount).to.equal(1);
  });

  it('initializes data', async(async () => {
    dbInfo.resolves({ some: 'info' });
    sessionService.userCtx.returns('session info');
    versionService.getLocal.resolves({ version: '3.5.0', rev: '12' });
    versionService.getRemoteRev.resolves('15');

    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenRenderingDone();

    expect(component.dbInfo).to.deep.equal({ some: 'info' });
    expect(component.userCtx).to.equal('session info');
    expect(component.version).to.equal('3.5.0');
    expect(component.localRev).to.equal('12');
    expect(component.remoteRev).to.equal('15');
  }));

  it ('display partner logo if it exists', async(async () => {
    resourceIconsService.getDocResources.resolves(['Medic Mobile']);
    versionService.getLocal.resolves({ version: '3.5.0', rev: '12' });
    versionService.getRemoteRev.resolves('15');

    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.partners[0]).to.equal('Medic Mobile');
  }));

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscription, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });
});
