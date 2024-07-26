import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';

import { AnalyticsFilterComponent } from '@mm-components/filters/analytics-filter/analytics-filter.component';

describe('Analytics Filter Component', () => {
  let component: AnalyticsFilterComponent;
  let fixture: ComponentFixture<AnalyticsFilterComponent>;
  let route;
  let router;
  let routerEventSubject;

  beforeEach(async () => {
    route = {
      snapshot: { queryParams: { query: '' }, firstChild: { data: { moduleId: 'some-module' } } },
    };
    routerEventSubject = new Subject();
    router = {
      events: { pipe: sinon.stub().returns(routerEventSubject) },
      navigate: sinon.stub(),
    };

    await TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } })
        ],
        declarations: [
          AnalyticsFilterComponent,
        ],
        providers: [
          { provide: ActivatedRoute, useValue: route },
          { provide: Router, useValue: router },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AnalyticsFilterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should create AnalyticsFilterComponent', () => {
    expect(component).to.exist;
  });

  it('should update the active module when route changes', fakeAsync(() => {
    component.analyticsModules = [
      { id: 'targets' },
      { id: 'target-aggregates' },
    ];

    routerEventSubject.next({ snapshot: { data: { moduleId: 'random-module' } } });
    flush();

    expect(component.activeModule).to.be.undefined;

    routerEventSubject.next({ snapshot: { data: { moduleId: 'targets' } } });
    flush();

    expect(component.activeModule).to.not.be.undefined;
    expect(component.activeModule.id).to.equal('targets');

    routerEventSubject.next({ snapshot: { data: { moduleId: 'target-aggregates' } } });
    flush();

    expect(component.activeModule).to.not.be.undefined;
    expect(component.activeModule.id).to.equal('target-aggregates');
  }));

});
