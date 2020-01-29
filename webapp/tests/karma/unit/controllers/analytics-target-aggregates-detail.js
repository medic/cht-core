describe('AnalyticsTargetAggregatesCtrl Controller', () => {
  'use strict';

  let createController;
  let TargetAggregates;
  let $rootScope;
  let scope;
  let stateParams;
  let translate;
  let translateFrom;

  let getTitle;
  let getShowContent;
  let setAggregates;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject(function(_$rootScope_, $controller, $ngRedux, Selectors, TargetAggregatesActions) {
    $rootScope = _$rootScope_;
    TargetAggregates = { getAggregateDetails: sinon.stub() };
    scope = $rootScope.$new();
    getTitle = () => Selectors.getTitle($ngRedux.getState());
    getShowContent = () => Selectors.getShowContent($ngRedux.getState());
    setAggregates = (aggregates) => TargetAggregatesActions($ngRedux.dispatch).setTargetAggregates(aggregates);

    createController = function() {
      return $controller('AnalyticsTargetAggregatesDetailCtrl', {
        '$scope': scope,
        '$stateParams': stateParams,
        '$translate': translate,
        'TargetAggregates': TargetAggregates,
        'TranslateFrom': translateFrom,
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
    // aggregates are set in the parent "list" controller.
    // this controller is only loaded after the aggregates are loaded (via template ng-if)
    setAggregates(['aggregates']);
    stateParams = { id: 'target' };
    TargetAggregates.getAggregateDetails.returns(false);

    const ctrl = createController();
    chai.expect(getShowContent()).to.equal(true);
    chai.expect(ctrl.error.translationKey).to.equal('analytics.target.aggreagates.error.not.found');
    chai.expect(ctrl.selected).to.equal(null);
    chai.expect(TargetAggregates.getAggregateDetails.callCount).to.equal(1);
    chai.expect(TargetAggregates.getAggregateDetails.args[0]).to.deep.equal(['target', ['aggregates'] ]);
  });

  it('should set selected with translation key', () => {
    setAggregates(['aggregates']);
    stateParams = { id: 'target' };
    TargetAggregates.getAggregateDetails.returns({ an: 'aggregate', translation_key: 'the_title' });
    translate = { instant: sinon.stub().returns('the translated title') };

    const ctrl = createController();
    chai.expect(getShowContent()).to.equal(true);
    chai.expect(ctrl.error).to.equal(null);
    chai.expect(getTitle()).to.equal('the translated title');
    chai.expect(ctrl.selected).to.deep.equal({ an: 'aggregate', translation_key: 'the_title' });
    chai.expect(translate.instant.callCount).to.equal(1);
    chai.expect(translate.instant.args[0]).to.deep.equal(['the_title']);
  });

  it('should set selected with title', () => {
    setAggregates(['aggregates', ['more aggregates']]);
    stateParams = { id: 'target' };
    TargetAggregates.getAggregateDetails.returns({ an: 'aggregate', title: 'the_other_title' });
    translateFrom = sinon.stub().returns('the other translated title');

    const ctrl = createController();
    chai.expect(getShowContent()).to.equal(true);
    chai.expect(ctrl.error).to.equal(null);
    chai.expect(getTitle()).to.equal('the other translated title');
    chai.expect(ctrl.selected).to.deep.equal({ an: 'aggregate', title: 'the_other_title' });
    chai.expect(translateFrom.callCount).to.equal(1);
    chai.expect(translateFrom.args[0]).to.deep.equal(['the_other_title']);
    chai.expect(TargetAggregates.getAggregateDetails.args[0])
      .to.deep.equal(['target', ['aggregates', ['more aggregates']] ]);
  });
});
