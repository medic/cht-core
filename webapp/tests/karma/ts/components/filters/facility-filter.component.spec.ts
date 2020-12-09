import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { expect } from 'chai';
import sinon from 'sinon';

import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';
import {
  MultiDropdownFilterComponent
} from '@mm-components/filters/multi-dropdown-filter/mullti-dropdown-filter.component';
import { PlaceHierarchyService } from '@mm-services/place-hierarchy.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';

describe('Facility Filter Component', () => {
  let component:FacilityFilterComponent;
  let fixture:ComponentFixture<FacilityFilterComponent>;
  let store:MockStore;
  let placeHierarchyService;

  beforeEach(async(() => {
    placeHierarchyService = {
      get: sinon.stub(),
    };

    const mockedSelectors = [
      { selector: Selectors.getIsAdmin, value: true },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          BrowserAnimationsModule,
          BsDropdownModule.forRoot(),
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
        ],
        declarations: [
          FacilityFilterComponent,
          MultiDropdownFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: PlaceHierarchyService, useValue: placeHierarchyService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(FacilityFilterComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create Facility Filter', () => {
    expect(component).to.exist;
  });

  describe('loadFacilities', () => {
    it('should load facilities', async () => {
      placeHierarchyService.get.resolves([]);
      await component.loadFacilities();
      expect(component.facilities).to.deep.equal([]);
    });

    it('should catch errors when loading facilities', async () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      placeHierarchyService.get.rejects({ some: 'err' });
      await component.loadFacilities();
      expect(component.facilities).to.deep.equal([]);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error loading facilities');
    });

    it('should sort and flatten facilities recursively', async () => {
      const facilities = [
        {
          _id: '1',
          doc: { name: 'not_first', },
          children: [
            {
              _id: '2',
              doc: { name: 'some_child' },
              children: [
                { _id: '3', doc: { name: 'seven' } },
                { _id: '4', doc: { name: 'five' } },
              ]
            }
          ]
        },
        {
          _id: '2',
          doc: { name: 'first' },
        },
        {
          _id: '3',
          doc: { name: 'alpha' },
          children: [
            {
              _id: 'a',
              doc: { name: 'nine' },
              children: [
                { _id: 'aa', doc: { name: 'oops' } },
                { _id: 'bb', doc: { name: 'lint' } },
              ]
            },
            {
              _id: 'b',
              doc: { name: 'eight' },
              children: [
                { _id: 'cc', doc: { name: 'enel' } },
                { _id: 'dd', doc: { name: 'kalas' } },
              ]
            },
          ],
        },
      ];

      placeHierarchyService.get.resolves(facilities);
      await component.loadFacilities();
      expect(component.facilities).to.deep.equal([
        {
          _id: '3',
          doc: { name: 'alpha' },
          children: [
            {
              _id: 'b',
              doc: { name: 'eight' },
              children: [
                { _id: 'cc', doc: { name: 'enel' } },
                { _id: 'dd', doc: { name: 'kalas' } },
              ]
            },
            {
              _id: 'a',
              doc: { name: 'nine' },
              children: [
                { _id: 'bb', doc: { name: 'lint' } },
                { _id: 'aa', doc: { name: 'oops' } },
              ]
            },

          ],
        },
        {
          _id: '2',
          doc: { name: 'first' },
        },
        {
          _id: '1',
          doc: { name: 'not_first', },
          children: [
            {
              _id: '2',
              doc: { name: 'some_child' },
              children: [
                { _id: '4', doc: { name: 'five' } },
                { _id: '3', doc: { name: 'seven' } },
              ]
            }
          ]
        },
      ]);

      expect(component.flattenedFacilities).to.have.deep.members([
        {
          _id: '3',
          doc: { name: 'alpha' },
          children: [
            {
              _id: 'b',
              doc: { name: 'eight' },
              children: [
                { _id: 'cc', doc: { name: 'enel' } },
                { _id: 'dd', doc: { name: 'kalas' } },
              ]
            },
            {
              _id: 'a',
              doc: { name: 'nine' },
              children: [
                { _id: 'bb', doc: { name: 'lint' } },
                { _id: 'aa', doc: { name: 'oops' } },
              ]
            },
          ],
        },
        {
          _id: 'b',
          doc: { name: 'eight' },
          children: [
            { _id: 'cc', doc: { name: 'enel' } },
            { _id: 'dd', doc: { name: 'kalas' } },
          ]
        },
        {
          _id: 'a',
          doc: { name: 'nine' },
          children: [
            { _id: 'bb', doc: { name: 'lint' } },
            { _id: 'aa', doc: { name: 'oops' } },
          ]
        },
        { _id: 'cc', doc: { name: 'enel' } },
        { _id: 'dd', doc: { name: 'kalas' } },
        { _id: 'bb', doc: { name: 'lint' } },
        { _id: 'aa', doc: { name: 'oops' } },
        {
          _id: '2',
          doc: { name: 'first' },
        },
        {
          _id: '1',
          doc: { name: 'not_first', },
          children: [
            {
              _id: '2',
              doc: { name: 'some_child' },
              children: [
                { _id: '4', doc: { name: 'five' } },
                { _id: '3', doc: { name: 'seven' } },
              ]
            }
          ]
        },
        {
          _id: '2',
          doc: { name: 'some_child' },
          children: [
            { _id: '4', doc: { name: 'five' } },
            { _id: '3', doc: { name: 'seven' } },
          ]
        },
        { _id: '4', doc: { name: 'five' } },
        { _id: '3', doc: { name: 'seven' } },
      ]);
    });
  });

  it('should apply filter correctly', async () => {
    const facilities = [{ doc: { _id: '' } }, { some: 'field' }, { doc: { _id: 'b' } }];
    const spySearch = sinon.spy(component.search, 'emit');
    component.applyFilter(facilities);
    expect(spySearch.callCount).to.equal(1);
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscription, 'unsubscribe');
    component.ngOnDestroy();
    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  it('trackByFn should return unique value', () => {
    const facility = { doc: { _id: 'a', _rev: 'b' } };
    expect(component.trackByFn(0, facility)).to.equal('ab');
  });

  it('should toggle children when toggling parent', () => {
    const dropdownFilterToggleSpy = sinon.spy(component.dropdownFilter, 'toggle');
    const facility = {
      _id: 'parent',
      children: [
        { _id: 'child1', children: [{ _id: 'child3', children: [{ _id: 'child4' }] }] },
        { _id: 'child2' },
      ]
    };
    component.toggle(facility);
    expect(dropdownFilterToggleSpy.callCount).to.equal(5);
    expect(dropdownFilterToggleSpy.args).to.deep.equal([
      [facility],
      [{ _id: 'child1', children: [{ _id: 'child3', children: [{ _id: 'child4' }] }] }],
      [{ _id: 'child3', children: [{ _id: 'child4' }] }],
      [{ _id: 'child4' }],
      [{ _id: 'child2' }],
    ]);
  });

  describe('getLabel', () => {
    it('should return the facility name, if existent', async(() => {
      const facility = { doc: { name: 'fancy' } };
      component.itemLabel(facility).subscribe(value => {
        expect(value).to.equal('fancy');
      });
    }));

    it('should return deleted for admins when name is not set', async(() => {
      const facility = { doc: { _id: 'fancy' } };
      component.itemLabel(facility).subscribe(value => {
        expect(value).to.equal('place.deleted');
      });
    }));

    it('should return unavailable for non-admins when name is not set', async(() => {
      store.overrideSelector(Selectors.getIsAdmin, false);
      store.refreshState();
      fixture.detectChanges();
      const facility = { doc: { _id: 'fancy' } };
      component.itemLabel(facility).subscribe(value => {
        expect(value).to.equal('place.unavailable');
      });
    }));
  });

  it('clear should clear dropdown filter', () => {
    const dropdownFilterClearSpy = sinon.spy(component.dropdownFilter, 'clear');
    component.clear();
    expect(dropdownFilterClearSpy.callCount).to.equal(1);
    expect(dropdownFilterClearSpy.args[0]).to.deep.equal([false]);
  });

  it('applyFilter should set correct selected facility ids', () => {
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    const selectedFacilities = [
      { doc: { _id: 'one' }, children: [{ doc: { _id: 'child1' } }, { doc: { _id: 'child2' } }] },
      { doc: { _id: 'child1' } },
      { doc: { _id: 'child2' } },
      { doc: { _id: 'parent1' }, children: [] },
    ];
    component.applyFilter(selectedFacilities);
    expect(setFilter.callCount).to.equal(1);
    expect(setFilter.args[0]).to.deep.equal([
      { facilities: { selected: ['one', 'child1', 'child2', 'parent1'] } }
    ]);
  });
});
