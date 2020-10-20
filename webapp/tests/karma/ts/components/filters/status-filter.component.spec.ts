import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { expect } from 'chai';
import sinon from 'sinon';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { StatusFilterComponent } from '@mm-components/filters/status-filter/status-filter.component';
import {
  MultiDropdownFilterComponent
} from '@mm-components/filters/multi-dropdown-filter/mullti-dropdown-filter.component';
import { GlobalActions } from '@mm-actions/global';

describe('Status Filter Component', () => {
  let component:StatusFilterComponent;
  let fixture:ComponentFixture<StatusFilterComponent>;
  let store:MockStore;

  beforeEach(async(() => {
    TestBed
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
        store = TestBed.inject(MockStore);
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
    expect(component.allStatuses()).to.have.members([
      'valid', 'invalid',
      'unverified', 'errors', 'correct',
    ]);
  });

  it('clear should clear dropdown filter', () => {
    const dropdownFilterClearSpy = sinon.spy(component.dropdownFilter, 'clear');
    component.clear();
    expect(dropdownFilterClearSpy.callCount).to.equal(1);
    expect(dropdownFilterClearSpy.args[0]).to.deep.equal([false]);
  });

  describe('apply filter', () => {
    it('should add valid statuses correctly', () => {
      const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
      component.applyFilter(['valid']);
      expect(setFilter.args).to.deep.equal([
        [{ valid: true }],
        [{ verified: [] }],
      ]);

      setFilter.reset();
      component.applyFilter(['invalid']);
      expect(setFilter.args).to.deep.equal([
        [{ valid: false }],
        [{ verified: [] }],
      ]);

      setFilter.reset();
      component.applyFilter(['valid', 'invalid']);
      expect(setFilter.args).to.deep.equal([
        [{ valid: undefined }],
        [{ verified: [] }],
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
});
