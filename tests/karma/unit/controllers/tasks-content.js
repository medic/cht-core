describe('TasksContentCtrl', function() {
  beforeEach(module('inboxApp'));

  var $scope,
      task,
      watchCallback,
      createController,
      render;

  beforeEach(function() {
    render = sinon.stub();
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
    render.returns(KarmaUtils.mockPromise());
    inject(function($controller) {
      createController = function() {
        $controller('TasksContentCtrl', {
          $scope: $scope,
          Enketo: { render: render },
          DB: sinon.stub(),
          WatchDesignDoc: sinon.stub()
        });
      };
    });
  });

  afterEach(function() {
    KarmaUtils.restore(render);
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
    chai.expect(render.callCount).to.equal(1);
    chai.expect(render.getCall(0).args.length).to.equal(3);
  });

  it('does not load form when task has more than one action', function() {
    task = {
      actions: [{}, {}] // two forms
    };
    createController();
    chai.expect($scope.formId).to.equal(null);
    chai.expect($scope.loadingForm).to.equal(undefined);
    chai.expect(render.callCount).to.equal(0);
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
    chai.expect(render.callCount).to.equal(0);
  });

});
