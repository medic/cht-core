describe('TasksContentCtrl', function() {
  beforeEach(module('inboxApp'));

  var $controller;

  beforeEach(inject(function(_$controller_){
    $controller = _$controller_;
  }));

  describe('$scope.performAction', function() {
    var $scope,
        task,
        watchCallback;

    var Enketo = {
      render: sinon.stub()
    };

    var createController = function() {
      $controller('TasksContentCtrl', {
        $scope: $scope,
        Enketo: Enketo,
        DB: sinon.stub(),
        WatchDesignDoc: sinon.stub()
      });
    };

    beforeEach(function() {
      $scope = {
        $on: function() {},
        $watch: function(prop, cb) {
          watchCallback = cb;
        },
        setCancelTarget: function() {},
        setSelected: function() {
          $scope.selected = task;
        }
      };
      Enketo.render.returns(KarmaUtils.mockPromise());
    });

    afterEach(function() {
      KarmaUtils.restore(Enketo.render);
    });

    it('loads form when task has one action and no fields', function() {
      task = {
        actions: [{
          type: 'report',
          form: 'A'
        }]
      };
      createController();
      watchCallback();
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

    it('does not load form when task has fields (e.g. description)', function() {
      task = {
        actions: [{
          type: 'report',
          form: 'B'
        }],
        fields: [{
          label: [{
            content: 'Description',
            locale: 'en'
          }],
          value: [{
            content: '{{contact.name}} survey due',
            locale: 'en'
          }]
        }]
      };
      createController();
      chai.expect($scope.formId).to.equal(null);
      chai.expect($scope.loadingForm).to.equal(undefined);
      chai.expect(Enketo.render.callCount).to.equal(0);
    });

  });
});

