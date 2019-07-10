describe('TasksContentCtrl', () => {
  const { expect } = chai;

  let $scope,
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

  beforeEach(inject(($controller, $ngRedux, TasksActions, Selectors) => {
    tasksActions = TasksActions($ngRedux.dispatch);
    render = sinon.stub();
    XmlForm = sinon.stub();
    $scope = {
      $on: () => {},
      $watch: (prop, cb) => {
        watchCallback = cb;
      },
      setSelected: () => tasksActions.setSelectedTask(task)
    };
    getEnketoEditedStatus = () => Selectors.getEnketoEditedStatus($ngRedux.getState());
    render.resolves();
    createController = () => {
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

  afterEach(() => {
    KarmaUtils.restore(render, XmlForm);
  });

  it('loads form when task has one action and no fields', done => {
    task = {
      actions: [{
        type: 'report',
        form: 'A',
        content: 'nothing'
      }]
    };
    XmlForm.resolves({ id: 'myform', doc: { title: 'My Form' } });
    createController();
    watchCallback();
    expect($scope.formId).to.equal('A');
    setTimeout(() => {
      expect(render.callCount).to.equal(1);
      expect(render.getCall(0).args.length).to.equal(4);
      expect(render.getCall(0).args[0]).to.equal('#task-report');
      expect(render.getCall(0).args[1]).to.equal('myform');
      expect(render.getCall(0).args[2]).to.equal('nothing');
      expect(getEnketoEditedStatus()).to.equal(false);
      done();
    });
  });

  it('does not load form when task has more than one action', done => {
    task = {
      actions: [{}, {}] // two forms
    };
    createController();
    expect($scope.formId).to.equal(null);
    expect(ctrl.loadingForm).to.equal(undefined);
    expect(render.callCount).to.equal(0);
    done();
  });

  it('does not load form when task has fields (e.g. description)', done => {
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
    expect($scope.formId).to.equal(null);
    expect(ctrl.loadingForm).to.equal(undefined);
    expect(render.callCount).to.equal(0);
    done();
  });

  it('displays error if enketo fails to render', done => {
    render.rejects('foo');
    task = {
      actions: [{
        type: 'report',
        form: 'A',
        content: 'nothing'
      }]
    };
    XmlForm.resolves({ id: 'myform', doc: { title: 'My Form' } });
    createController();
    watchCallback();
    setTimeout(() => {
      expect(ctrl.loadingForm).to.equal(false);
      expect($scope.contentError).to.equal(true);
      done();
    });
  });
});
