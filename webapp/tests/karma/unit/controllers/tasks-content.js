describe('TasksContentCtrl', function() {
  var $scope,
      tasksActions,
      getEnketoEditedStatus,
      task,
      watchCallback,
      ctrl,
      createController,
      render,
      XmlForm;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject(function($controller, $ngRedux, TasksActions, Selectors) {
    tasksActions = TasksActions($ngRedux.dispatch);
    render = sinon.stub();
    XmlForm = sinon.stub();
    $scope = {
      $on: function() {},
      $watch: function(prop, cb) {
        watchCallback = cb;
      },
      setSelected: () => tasksActions.setSelectedTask(task)
    };
    getEnketoEditedStatus = () => Selectors.getEnketoEditedStatus($ngRedux.getState());
    render.returns(Promise.resolve());
    createController = function() {
      ctrl = $controller('TasksContentCtrl', {
        $scope: $scope,
        $q: Q,
        Enketo: { render: render },
        DB: sinon.stub(),
        XmlForm: XmlForm,
        Telemetry: { record: sinon.stub() }
      });
    };
  }));

  afterEach(function() {
    KarmaUtils.restore(render, XmlForm);
  });

  it('loads form when task has one action and no fields', function(done) {
    task = {
      actions: [{
        type: 'report',
        form: 'A',
        content: 'nothing'
      }]
    };
    XmlForm.returns(Promise.resolve({ id: 'myform', doc: { title: 'My Form' } }));
    createController();
    watchCallback();
    chai.expect($scope.formId).to.equal('A');
    setTimeout(function() {
      chai.expect(render.callCount).to.equal(1);
      chai.expect(render.getCall(0).args.length).to.equal(4);
      chai.expect(render.getCall(0).args[0]).to.equal('#task-report');
      chai.expect(render.getCall(0).args[1]).to.equal('myform');
      chai.expect(render.getCall(0).args[2]).to.equal('nothing');
      chai.expect(getEnketoEditedStatus()).to.equal(false);
      done();
    });
  });

  it('does not load form when task has more than one action', function(done) {
    task = {
      actions: [{}, {}] // two forms
    };
    createController();
    chai.expect($scope.formId).to.equal(null);
    chai.expect(ctrl.loadingForm).to.equal(undefined);
    chai.expect(render.callCount).to.equal(0);
    done();
  });

  it('does not load form when task has fields (e.g. description)', function(done) {
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
    chai.expect(ctrl.loadingForm).to.equal(undefined);
    chai.expect(render.callCount).to.equal(0);
    done();
  });

  it('displays error if enketo fails to render', done => {
    render.throws('err');
    task = {
      actions: [{
        type: 'report',
        form: 'A',
        content: 'nothing'
      }]
    };
    XmlForm.returns(Promise.resolve({ id: 'myform', doc: { title: 'My Form' } }));
    createController();
    watchCallback();
    setTimeout(function() {
      chai.expect($scope.loadingForm).to.equal(false);
      chai.expect($scope.contentError).to.equal(true);
      done();
    });
  });
});
