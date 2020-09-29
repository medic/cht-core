import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { StatusFilterComponent } from '@mm-components/filters/status-filter/status-filter.component';
import { MultiDropdownFilterComponent } from '@mm-components/filters/multi-dropdown-filter/mullti-dropdown-filter.component';

describe('Form Type Filter Component', () => {
  let component:StatusFilterComponent;
  let fixture:ComponentFixture<StatusFilterComponent>;

  beforeEach(async(() => {
    TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
        ],
        declarations: [
          StatusFilterComponent,
          MultiDropdownFilterComponent,
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

  it('should create Form Type Filter', () => {
    expect(component).to.exist;
  });

});
