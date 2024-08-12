import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { provideMockStore } from '@ngrx/store/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { StatusFilterComponent } from '@mm-components/filters/status-filter/status-filter.component';
import { GlobalActions } from '@mm-actions/global';

describe('Status Filter Component', () => {
  let component:StatusFilterComponent;
  let fixture:ComponentFixture<StatusFilterComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          BrowserAnimationsModule
        ],
        declarations: [
          StatusFilterComponent,
        ],
        providers: [
          provideMockStore(),
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(StatusFilterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create Status Filter', () => {
    expect(component).to.exist;
  });

  it('should clear the filter', () => {
    const inlineFilterClearSpy = sinon.spy(component.filter, 'clear');
    component.filter.selected.add('valid');
    component.filter.selected.add('unverified');

    component.clear();

    expect(inlineFilterClearSpy.calledOnce).to.be.true;
    expect(component.filter.selected.size).to.equal(0);
  });

  it('should count selected items in the filter', () => {
    const inlineFilterCountSelectedSpy = sinon.spy(component.filter, 'countSelected');
    component.filter.selected.add('valid');
    component.filter.selected.add('unverified');

    const result = component.countSelected();

    expect(inlineFilterCountSelectedSpy.calledOnce).to.be.true;
    expect(result).to.equal(2);
  });

  describe('apply filter', () => {
    it('should add valid statuses correctly', () => {
      const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
      component.applyFilter(['valid']);
      expect(setFilter.args).to.deep.equal([
        [{ valid: true }],
        [{ verified: undefined }],
      ]);

      setFilter.reset();
      component.applyFilter(['invalid']);
      expect(setFilter.args).to.deep.equal([
        [{ valid: false }],
        [{ verified: undefined }],
      ]);

      setFilter.reset();
      component.applyFilter(['valid', 'invalid']);
      expect(setFilter.args).to.deep.equal([
        [{ valid: undefined }],
        [{ verified: undefined }],
      ]);
    });

    it('should add reviewed statuses correctly', () => {
      const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
      component.applyFilter(['unverified']);
      expect(setFilter.args).to.deep.equal([
        [{ valid: undefined }],
        [{ verified: [undefined] }],
      ]);

      setFilter.reset();
      component.applyFilter(['errors']);
      expect(setFilter.args).to.deep.equal([
        [{ valid: undefined }],
        [{ verified: [false] }],
      ]);

      setFilter.reset();
      component.applyFilter(['correct']);
      expect(setFilter.args).to.deep.equal([
        [{ valid: undefined }],
        [{ verified: [true] }],
      ]);

      setFilter.reset();
      component.applyFilter(['correct', 'errors', 'unverified']);
      expect(setFilter.args).to.deep.equal([
        [{ valid: undefined }],
        [{ verified: [undefined, false, true] }],
      ]);
    });

    it('should add valid and reviewed statuses correctly', () => {
      const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');

      component.applyFilter(['correct', 'valid', 'unverified']);
      expect(setFilter.args).to.deep.equal([
        [{ valid: true }],
        [{ verified: [undefined, true] }],
      ]);
    });
  });

  it('should do nothing if component is disabled', () => {
    const inlineFilterClearSpy = sinon.spy(component.filter, 'clear');
    component.disabled = true;

    component.clear();

    expect(inlineFilterClearSpy.notCalled).to.be.true;
  });
});
