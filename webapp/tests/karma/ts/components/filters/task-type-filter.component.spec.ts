import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { TaskTypeFilterComponent } from '@mm-components/filters/task-type-filter/task-type-filter.component';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';

describe('TaskTypeFilterComponent', () => {
  let component: TaskTypeFilterComponent;
  let fixture: ComponentFixture<TaskTypeFilterComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        TaskTypeFilterComponent,
      ],
      providers: [
        provideMockStore({
          selectors: [
            { selector: Selectors.getTasksList, value: [] },
          ],
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskTypeFilterComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should create', () => {
    expect(component).to.exist;
  });

  it('should extract task types from tasks list', () => {
    store.overrideSelector(Selectors.getTasksList, [
      { _id: '1', title: 'Follow up', resolved: 'follow_up' },
      { _id: '2', title: 'Vaccination', resolved: 'vaccination' },
      { _id: '3', title: 'Follow up', resolved: 'follow_up' },
    ]);
    store.refreshState();
    fixture.detectChanges();

    expect(component.taskTypes.length).to.equal(2);
    expect(component.taskTypes).to.include.members(['Follow up', 'Vaccination']);
  });

  it('should apply filter when task types are selected', () => {
    const setFilterStub = sinon.stub(GlobalActions.prototype, 'setFilter');
    const searchEmitSpy = sinon.spy(component.search, 'emit');

    component.applyFilter(['follow_up', 'vaccination']);

    expect(setFilterStub.calledOnce).to.be.true;
    expect(setFilterStub.args[0][0]).to.deep.equal({ taskTypes: { selected: ['follow_up', 'vaccination'] } });
    expect(searchEmitSpy.calledOnce).to.be.true;
  });

  it('should apply undefined filter when none are selected', () => {
    const setFilterStub = sinon.stub(GlobalActions.prototype, 'setFilter');

    component.applyFilter([]);

    expect(setFilterStub.calledOnce).to.be.true;
    expect(setFilterStub.args[0][0]).to.deep.equal({ taskTypes: undefined });
  });

  it('should clear filter', () => {
    const clearSpy = sinon.spy(component.filter, 'clear');

    component.clear();

    expect(clearSpy.calledOnce).to.be.true;
  });

  it('should not clear filter when disabled', () => {
    component.disabled = true;
    const clearSpy = sinon.spy(component.filter, 'clear');

    component.clear();

    expect(clearSpy.called).to.be.false;
  });

  it('should count selected', () => {
    component.filter.selected.add('follow_up');
    expect(component.countSelected()).to.equal(1);

    component.filter.selected.add('vaccination');
    expect(component.countSelected()).to.equal(2);
  });

  it('should unsubscribe on destroy', () => {
    const unsubscribeSpy = sinon.spy(component['subscriptions'], 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribeSpy.calledOnce).to.be.true;
  });
});
