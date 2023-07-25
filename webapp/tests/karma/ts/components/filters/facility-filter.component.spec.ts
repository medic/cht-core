import { ComponentFixture, TestBed, waitForAsync, fakeAsync, flush } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import sinon from 'sinon';
import * as chai from 'chai';
import * as chaiExclude from 'chai-exclude';
//@ts-ignore
chai.use(chaiExclude);
import { expect } from 'chai';

import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';
import {
  MultiDropdownFilterComponent
} from '@mm-components/filters/multi-dropdown-filter/multi-dropdown-filter.component';
import { PlaceHierarchyService } from '@mm-services/place-hierarchy.service';
import { GlobalActions } from '@mm-actions/global';
import { SessionService } from '@mm-services/session.service';

describe('Facility Filter Component', () => {
  let component:FacilityFilterComponent;
  let fixture:ComponentFixture<FacilityFilterComponent>;
  let sessionService;

  let placeHierarchyService;

  beforeEach(waitForAsync(() => {
    placeHierarchyService = {
      get: sinon.stub(),
    };

    sessionService = {
      isOnlineOnly: sinon.stub().returns(true),
    };

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
          provideMockStore(),
          { provide: SessionService, useValue: sessionService },
          { provide: PlaceHierarchyService, useValue: placeHierarchyService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(FacilityFilterComponent);
        component = fixture.componentInstance;
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
      expect(component.facilities).excludingEvery('label').to.deep.equal([
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

      expect(component.flattenedFacilities).excludingEvery('label').to.have.deep.members([
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

  it('should return unique value when calling trackByFn', () => {
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

    component.select(null, facility, component.dropdownFilter);

    expect(dropdownFilterToggleSpy.callCount).to.equal(5);
    expect(dropdownFilterToggleSpy.args).to.deep.equal([
      [facility],
      [{ _id: 'child1', children: [{ _id: 'child3', children: [{ _id: 'child4' }] }] }],
      [{ _id: 'child3', children: [{ _id: 'child4' }] }],
      [{ _id: 'child4' }],
      [{ _id: 'child2' }],
    ]);
  });

  it('should toggle all children when toggling parent in inline filter', () => {
    const inlineFilterToggleSpy = sinon.spy(component.inlineFilter, 'toggle');
    const facility = {
      _id: 'parent',
      children: [
        { _id: 'child1', children: [{ _id: 'child3', children: [{ _id: 'child4' }] }] },
        { _id: 'child2' },
      ]
    };

    component.select(null, facility, component.inlineFilter);

    expect(inlineFilterToggleSpy.callCount).to.equal(5);
    expect(inlineFilterToggleSpy.args).to.deep.equal([
      [facility],
      [{ _id: 'child1', children: [{ _id: 'child3', children: [{ _id: 'child4' }] }] }],
      [{ _id: 'child3', children: [{ _id: 'child4' }] }],
      [{ _id: 'child4' }],
      [{ _id: 'child2' }],
    ]);
  });

  it('should toggle unselected children when toggling parent in inline filter', () => {
    const inlineFilterToggleSpy = sinon.spy(component.inlineFilter, 'toggle');
    const facility = {
      _id: 'parent',
      children: [
        { _id: 'child1', children: [{ _id: 'child3', children: [{ _id: 'child4' }] }] },
        { _id: 'child2' },
      ]
    };
    component.inlineFilter.selected.add(facility.children[0].children[0]);
    component.inlineFilter.selected.add(facility.children[1]);

    component.select(null, facility, component.inlineFilter);

    expect(inlineFilterToggleSpy.callCount).to.equal(3);
    expect(inlineFilterToggleSpy.args).to.deep.equal([
      [facility],
      [{ _id: 'child1', children: [{ _id: 'child3', children: [{ _id: 'child4' }] }] }],
      [{ _id: 'child4' }],
    ]);
  });

  describe('getLabel', () => {
    it('should return the facility name, if existent', async () => {
      const facility = { doc: { name: 'fancy' } };
      expect(await component.itemLabel(facility)).to.equal('fancy');
    });

    it('should return deleted for admins when name is not set', async () => {
      const facility = { doc: { _id: 'fancy' } };
      expect(await component.itemLabel(facility)).to.equal('place.deleted');
    });

    it('should return unavailable for offline users when name is not set', async() => {
      sessionService.isOnlineOnly.returns(false);
      component.ngOnInit();
      fixture.detectChanges();
      const facility = { doc: { _id: 'fancy' } };
      expect(await component.itemLabel(facility)).to.equal('place.unavailable');
    });
  });

  it('should clear dropdown filter', () => {
    const dropdownFilterClearSpy = sinon.spy(component.dropdownFilter, 'clear');
    component.clear();
    expect(dropdownFilterClearSpy.callCount).to.equal(1);
    expect(dropdownFilterClearSpy.args[0]).to.deep.equal([false]);
  });

  it('should clear inline filter', () => {
    const inlineFilterClearSpy = sinon.spy(component.inlineFilter, 'clear');
    component.inlineFilter.selected.add('place-1');
    component.inlineFilter.selected.add('place-2');
    component.inline = true;

    component.clear();

    expect(inlineFilterClearSpy.calledOnce).to.be.true;
    expect(component.inlineFilter.selected.size).to.equal(0);
  });

  it('should count selected items in inline filter', () => {
    const inlineFilterCountSelectedSpy = sinon.spy(component.inlineFilter, 'countSelected');
    component.inlineFilter.selected.add('place-1');
    component.inlineFilter.selected.add('place-2');
    component.inline = true;

    const result = component.countSelected();

    expect(inlineFilterCountSelectedSpy.calledOnce).to.be.true;
    expect(result).to.equal(2);
  });

  it('should set correct selected facility ids', () => {
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

  it('should do nothing if component is disabled', () => {
    const dropdownFilterClearSpy = sinon.spy(component.dropdownFilter, 'clear');
    const dropdownFilterToggleSpy = sinon.spy(component.dropdownFilter, 'toggle');
    const inlineFilterClearSpy = sinon.spy(component.inlineFilter, 'clear');
    const inlineFilterToggleSpy = sinon.spy(component.inlineFilter, 'toggle');
    const spySearch = sinon.spy(component.search, 'emit');
    const facilities = [{ _id: 'some', doc: { _id: 'some' } }];
    component.disabled = true;

    component.clear();
    component.applyFilter(facilities);
    component.select(null, facilities[0], component.dropdownFilter);
    component.select(null, facilities[0], component.inlineFilter);
    component.inline = true;
    component.clear();

    expect(dropdownFilterClearSpy.notCalled).to.be.true;
    expect(dropdownFilterToggleSpy.notCalled).to.be.true;
    expect(spySearch.notCalled).to.be.true;
    expect(inlineFilterClearSpy.notCalled).to.be.true;
    expect(inlineFilterToggleSpy.notCalled).to.be.true;
  });

  describe('setDefault', () => {
    it('should set default value to filter', fakeAsync(async () => {
      const facilities = [
        {
          _id: '1',
          doc: {  _id: '1', name: 'not_first', },
          children: [
            {
              _id: '1-1',
              doc: { _id: '1-1', name: 'some_child' },
              children: [
                { _id: '1-1-1', doc: { _id: '1-1-1', name: 'seven' } },
                { _id: '1-1-2', doc: { _id: '1-1-2', name: 'five' } },
              ]
            }
          ]
        },
        { _id: '2', doc: { name: 'first' } },
      ];
      placeHierarchyService.get.resolves(facilities);
      const searchSpy = sinon.spy(component.search, 'emit');
      const setFilterStub = sinon.stub(GlobalActions.prototype, 'setFilter');

      await component.loadFacilities();
      component.setDefault('1-1');
      flush();

      expect(searchSpy.calledOnce).to.be.true;
      expect(setFilterStub.calledOnce).to.be.true;
      expect(setFilterStub.args[0][0]).to.deep.equal({ facilities: { selected: [ '1-1', '1-1-2', '1-1-1' ] } });
    }));

    it('should not default value to filter when facility not found', fakeAsync(async () => {
      const facilities = [
        {
          _id: '1',
          doc: { name: 'not_first', },
          children: [
            {
              _id: '1-1',
              doc: { name: 'some_child' },
              children: [
                { _id: '1-1-1', doc: { name: 'seven' } },
                { _id: '1-1-2', doc: { name: 'five' } },
              ]
            }
          ]
        },
        { _id: '2', doc: { name: 'first' } },
      ];
      placeHierarchyService.get.resolves(facilities);
      const searchSpy = sinon.spy(component.search, 'emit');
      const setFilterStub = sinon.stub(GlobalActions.prototype, 'setFilter');

      await component.loadFacilities();
      component.setDefault('3-1');
      flush();

      expect(setFilterStub.notCalled).to.be.true;
      expect(searchSpy.notCalled).to.be.true;
    }));
  });
});
