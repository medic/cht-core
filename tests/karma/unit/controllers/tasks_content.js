describe('TasksContentCtrl', function() {
  beforeEach(module('inboxApp'));

  var $controller;

  beforeEach(inject(function(_$controller_){
    $controller = _$controller_;
  }));

  describe('$scope.performAction', function() {
    var $scope,
        task;

    var Enketo = {
      render: sinon.stub()
    };

    var createController = function() {
      $controller('TasksContentCtrl', {
        $scope: $scope,
        Enketo: Enketo
      });
    };

    beforeEach(function() {
      $scope = {
        $on: function() {},
        setSelected: function() {
          $scope.selected = task;
        }
      };
    });

    afterEach(function() {
      KarmaUtils.restore(Enketo.render);
    });

    it('loads form when task has one action', function() {
      task = {
        actions: [{
          type: 'report',
          form: 'A'
        }]
      };
      Enketo.render.returns(KarmaUtils.mockPromise());
      createController();
      chai.expect($scope.formId).to.equal('A');
      chai.expect($scope.loadingForm).to.equal(true);
      chai.expect(Enketo.render.callCount).to.equal(1);
      chai.expect(Enketo.render.getCall(0).args.length).to.equal(3);
    });

    it('does not load form when task has more than one action', function() {
      task = {
        actions: [{}, {}] // two forms
      };
      createController();
      chai.expect($scope.formId).to.equal(null);
      chai.expect($scope.loadingForm).to.equal(undefined);
      chai.expect(Enketo.render.callCount).to.equal(0);
    });
  });
});

