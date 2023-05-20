
import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { ErrorLogComponent } from '@mm-components/error-log/error-log.component';
import { SessionService } from '@mm-services/session.service';
import { ChangesService } from '@mm-services/changes.service';
import { PipesModule } from '@mm-pipes/pipes.module';

describe('Error log component', () => {
  let component: ErrorLogComponent;
  let fixture: ComponentFixture<ErrorLogComponent>;
  let sessionService;
  let changesService;

  beforeEach(async () => {
    sessionService = {
      isOnlineOnly: sinon.stub().returns(false),
      userCtx: sinon.stub().resolves()
    };

    changesService = { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) };

    return TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        PipesModule
      ],
      declarations: [ ErrorLogComponent ],
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: ChangesService, useValue: changesService },
        provideMockStore(),
      ]
    })
      .compileComponents().then(() => {
        fixture = TestBed.createComponent(ErrorLogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  });

  it('should create component', fakeAsync(() => {
    expect(component).to.exist;
  }));

  it('should initialize data on ngAfterViewInit', fakeAsync(() => {
    sessionService.userCtx.returns('session info');

    component.ngAfterViewInit();

    expect(component.userCtx).to.eql('session info');
    expect(component.url).to.exist;
    expect(component.currentDate).to.eql(Date.now());
  }));

  it('should unsubscribe from observables on component destroy', () => {
    const unsubscribeSpy = sinon.spy(component.subscription, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribeSpy.callCount).to.equal(1);
  });

});
