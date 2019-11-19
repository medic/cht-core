describe('TasksContentCtrl', () => {
  const { expect } = chai;

  let $scope,
      tasksActions,
      getEnketoEditedStatus,
      task,
      ctrl,
      createController,
      render,
      XmlForms;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject(($controller, $ngRedux, TasksActions, Selectors) => {
    tasksActions = TasksActions($ngRedux.dispatch);
    render = sinon.stub();
    XmlForms = { get: sinon.stub() };
    $scope = {
      $on: () => {},
      setSelected: () => tasksActions.setSelectedTask(task)
    };
    getEnketoEditedStatus = () => Selectors.getEnketoEditedStatus($ngRedux.getState());
    render.resolves();
    createController = () => {
      ctrl = $controller('TasksContentCtrl', {
        $scope: $scope,
        $ngRedux: $ngRedux,
        $state: { params: { id: '123' } },
        $q: Q,
        Enketo: { render: render },
        DB: sinon.stub(),
        XmlForms: XmlForms,
        Telemetry: { record: sinon.stub() },
        LiveList: { tasks: {
          clearSelected: sinon.stub(),
          setSelected: sinon.stub(),
          getList: sinon.stub().returns([ task ])
        } }
      });
    };
  }));

  afterEach(() => {
    KarmaUtils.restore(render, XmlForms);
  });

  it('loads form when task has one action and no fields', done => {
    task = {
      _id: '123',
      actions: [{
        type: 'report',
        form: 'A',
        content: 'nothing'
      }]
    };
    const form = { _id: 'myform', title: 'My Form' };
    XmlForms.get.resolves(form);
    createController();
    expect(ctrl.formId).to.equal('A');
    setTimeout(() => {
      expect(render.callCount).to.equal(1);
      expect(render.getCall(0).args.length).to.equal(4);
      expect(render.getCall(0).args[0]).to.equal('#task-report');
      expect(render.getCall(0).args[1]).to.deep.equal(form);
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
    expect(ctrl.formId).to.equal(null);
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
    expect(ctrl.formId).to.equal(null);
    expect(ctrl.loadingForm).to.equal(undefined);
    expect(render.callCount).to.equal(0);
    done();
  });

  it('displays error if enketo fails to render', done => {
    render.rejects('foo');
    task = {
      _id: '123',
      actions: [{
        type: 'report',
        form: 'A',
        content: 'nothing'
      }]
    };
    XmlForms.get.resolves({ id: 'myform', doc: { title: 'My Form' } });
    createController();
    setTimeout(() => {
      expect(ctrl.loadingForm).to.equal(false);
      expect(ctrl.contentError).to.equal(true);
      done();
    });
  });
});
