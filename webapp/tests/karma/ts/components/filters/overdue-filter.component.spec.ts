import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { OverdueFilterComponent } from '@mm-components/filters/overdue-filter/overdue-filter.component';
import { GlobalActions } from '@mm-actions/global';

describe('OverdueFilterComponent', () => {
  let component: OverdueFilterComponent;
  let fixture: ComponentFixture<OverdueFilterComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        OverdueFilterComponent,
      ],
      providers: [
        provideMockStore(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OverdueFilterComponent);
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

  it('should have overdue and not_overdue statuses', () => {
    expect(component.statuses).to.deep.equal(['overdue', 'not_overdue']);
  });

  it('should apply filter when overdue is selected', () => {
    const setFilterStub = sinon.stub(GlobalActions.prototype, 'setFilter');
    const searchEmitSpy = sinon.spy(component.search, 'emit');

    component.applyFilter(['overdue']);

    expect(setFilterStub.calledOnce).to.be.true;
    expect(setFilterStub.args[0][0]).to.deep.equal({ taskOverdue: true });
    expect(searchEmitSpy.calledOnce).to.be.true;
  });

  it('should apply filter when not_overdue is selected', () => {
    const setFilterStub = sinon.stub(GlobalActions.prototype, 'setFilter');
    const searchEmitSpy = sinon.spy(component.search, 'emit');

    component.applyFilter(['not_overdue']);

    expect(setFilterStub.calledOnce).to.be.true;
    expect(setFilterStub.args[0][0]).to.deep.equal({ taskOverdue: false });
    expect(searchEmitSpy.calledOnce).to.be.true;
  });

  it('should apply undefined filter when both are selected', () => {
    const setFilterStub = sinon.stub(GlobalActions.prototype, 'setFilter');

    component.applyFilter(['overdue', 'not_overdue']);

    expect(setFilterStub.calledOnce).to.be.true;
    expect(setFilterStub.args[0][0]).to.deep.equal({ taskOverdue: undefined });
  });

  it('should apply undefined filter when none are selected', () => {
    const setFilterStub = sinon.stub(GlobalActions.prototype, 'setFilter');

    component.applyFilter([]);

    expect(setFilterStub.calledOnce).to.be.true;
    expect(setFilterStub.args[0][0]).to.deep.equal({ taskOverdue: undefined });
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
    component.filter.selected.add('overdue');
    expect(component.countSelected()).to.equal(1);

    component.filter.selected.add('not_overdue');
    expect(component.countSelected()).to.equal(2);
  });
});
