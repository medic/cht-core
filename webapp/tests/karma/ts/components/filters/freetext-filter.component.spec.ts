import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';

describe('Form Type Filter Component', () => {
  let component:FreetextFilterComponent;
  let fixture:ComponentFixture<FreetextFilterComponent>;
  let clock;

  beforeEach(async(() => {

    TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
        ],
        declarations: [
          FreetextFilterComponent,
        ],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(FreetextFilterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
    clock && clock.restore();
  });

  it('should create Form Type Filter', () => {
    expect(component).to.exist;
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscription, 'unsubscribe');
    component.ngOnDestroy();
    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  it('should debounce searches on typing', () => {
    clock = sinon.useFakeTimers();
    const applyFilterSpy = sinon.spy(component, 'applyFilter');
    component.onFieldChange('v');
    expect(applyFilterSpy.callCount).to.equal(0);
    component.onFieldChange('va');
    expect(applyFilterSpy.callCount).to.equal(0);
    clock.tick(100);
    component.onFieldChange('val');
    expect(applyFilterSpy.callCount).to.equal(0);
    clock.tick(100);
    component.onFieldChange('valu');
    expect(applyFilterSpy.callCount).to.equal(0);
    clock.tick(1000);
    expect(applyFilterSpy.callCount).to.equal(1);
    expect(component.inputText).to.equal('valu');
  });
});
