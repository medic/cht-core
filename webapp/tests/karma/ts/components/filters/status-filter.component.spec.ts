import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { provideMockStore } from '@ngrx/store/testing';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { expect } from 'chai';
import sinon from 'sinon';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { StatusFilterComponent } from '@mm-components/filters/status-filter/status-filter.component';
import {
  MultiDropdownFilterComponent
} from '@mm-components/filters/multi-dropdown-filter/multi-dropdown-filter.component';
import { GlobalActions } from '@mm-actions/global';

describe('Status Filter Component', () => {
  let component:StatusFilterComponent;
  let fixture:ComponentFixture<StatusFilterComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [
          BsDropdownModule.forRoot(),
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          BrowserAnimationsModule
        ],
        declarations: [
          StatusFilterComponent,
          MultiDropdownFilterComponent,
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

  it('allStatuses should list all statuses', () => {
    expect(component.allStatuses).to.have.members([
      'valid', 'invalid',
      'unverified', 'errors', 'correct',
    ]);
  });

  it('should clear dropdown filter', () => {
    const dropdownFilterClearSpy = sinon.spy(component.dropdownFilter, 'clear');

    component.clear();

    expect(dropdownFilterClearSpy.callCount).to.equal(1);
    expect(dropdownFilterClearSpy.args[0]).to.deep.equal([false]);
  });

  it('should clear inline filter', () => {
    const inlineFilterClearSpy = sinon.spy(component.inlineFilter, 'clear');
    component.inlineFilter.selected.add('valid');
    component.inlineFilter.selected.add('unverified');
    component.inline = true;

    component.clear();

    expect(inlineFilterClearSpy.calledOnce).to.be.true;
    expect(component.inlineFilter.selected.size).to.equal(0);
  });

  it('should count selected items in inline filter', () => {
    const inlineFilterCountSelectedSpy = sinon.spy(component.inlineFilter, 'countSelected');
    component.inlineFilter.selected.add('valid');
    component.inlineFilter.selected.add('unverified');
    component.inline = true;

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
    const dropdownFilterClearSpy = sinon.spy(component.dropdownFilter, 'clear');
    const inlineFilterClearSpy = sinon.spy(component.inlineFilter, 'clear');
    component.disabled = true;

    component.clear();
    component.inline = true;
    component.clear();

    expect(dropdownFilterClearSpy.notCalled).to.be.true;
    expect(inlineFilterClearSpy.notCalled).to.be.true;
  });
});
