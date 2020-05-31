describe('AnalyticsTargetAggregatesCtrl Controller', () => {
  'use strict';

  let createController;
  let TargetAggregates;
  let $rootScope;
  let scope;
  let stateParams;
  let translateInstant;

  let getTitle;
  let getShowContent;
  let setAggregates;
  let setError;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject(function(_$rootScope_, $controller, $ngRedux, $translate, Selectors, TargetAggregatesActions) {
    $rootScope = _$rootScope_;
    TargetAggregates = { getAggregateDetails: sinon.stub() };
    scope = $rootScope.$new();
    getTitle = () => Selectors.getTitle($ngRedux.getState());
    getShowContent = () => Selectors.getShowContent($ngRedux.getState());
    setAggregates = (aggregates) => TargetAggregatesActions($ngRedux.dispatch).setTargetAggregates(aggregates);
    setError = (error) => TargetAggregatesActions($ngRedux.dispatch).setError(error);
    translateInstant = sinon.stub($translate, 'instant');

    createController = function() {
      return $controller('AnalyticsTargetAggregatesDetailCtrl', {
        '$scope': scope,
        '$stateParams': stateParams,
        'TargetAggregates': TargetAggregates,
      });
    };
  }));

  afterEach(function() {
    sinon.restore();
  });

  it('should set correct scope when no item is selected', () => {
    stateParams = {};
    const ctrl = createController();
    chai.expect(getShowContent()).to.equal(false);
    chai.expect(ctrl.selected).to.equal(null);
    chai.expect(TargetAggregates.getAggregateDetails.callCount).to.equal(0);
  });

  it('should set error when aggregate is not found', () => {
    // aggregates and error are set in the parent "list" controller.
    // this controller is only loaded after the aggregates are loaded (via template ng-if)
    setAggregates(['aggregates']);
    setError(null);
    stateParams = { id: 'target' };
    TargetAggregates.getAggregateDetails.returns(false);

    const ctrl = createController();
    chai.expect(getShowContent()).to.equal(true);
    chai.expect(ctrl.error).to.equal(null);
    chai.expect(ctrl.selected.error.translationKey).to.equal('analytics.target.aggregates.error.not.found');
    chai.expect(TargetAggregates.getAggregateDetails.callCount).to.equal(1);
    chai.expect(TargetAggregates.getAggregateDetails.args[0]).to.deep.equal(['target', ['aggregates'] ]);
  });

  it('should set title', () => {
    setAggregates(['aggregates']);
    setError(null);
    stateParams = { id: 'target' };
    TargetAggregates.getAggregateDetails.returns({
      an: 'aggregate',
      translation_key: 'the_title',
      heading: 'the translated title'
    });
    translateInstant.returns('target aggregate');

    const ctrl = createController();
    chai.expect(getShowContent()).to.equal(true);
    chai.expect(ctrl.error).to.equal(null);
    chai.expect(getTitle()).to.equal('target aggregate');
    chai.expect(ctrl.selected).to.deep.equal({
      an: 'aggregate',
      translation_key: 'the_title',
      heading: 'the translated title',
    });
    chai.expect(translateInstant.callCount).to.equal(1);
    chai.expect(translateInstant.args[0]).to.deep.equal(['analytics.target.aggregates']);
  });
});
