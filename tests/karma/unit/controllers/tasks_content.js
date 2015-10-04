describe('TasksContentCtrl', function() {
  beforeEach(module('inboxApp'));

  var $controller;

  beforeEach(inject(function(_$controller_){
    $controller = _$controller_;
  }));

  describe('$scope.performAction', function() {
    var $scope,
        controller,
        task;

    beforeEach(function() {
      $scope = {
        $on: function() {},
        setSelected: function() {
          $scope.selected = task;
        }
      };
      controller = $controller('TasksContentCtrl', {
        $scope: $scope,
        Enketo: sinon.stub()
      });
    });

    it('loads form when task has one action', function() {
      task = {
        actions: [{
          type: 'report',
          form: 'A'
        }]
      };
      chai.expect($scope.formId).to.equal('A');
      chai.expect($scope.loadingForm).to.equal(true);
    });

    it('does not load form when task has more than one action', function() {
      task = {
        actions: [{}, {}] // two forms
      };
      chai.expect($scope.formId).to.equal(null);
      chai.expect($scope.loadingForm).to.equal(undefined);
    });
  });
});
