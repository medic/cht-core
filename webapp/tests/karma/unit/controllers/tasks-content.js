describe('TasksContentCtrl', () => {
  const { expect } = chai;

  let $scope;
  let tasksActions;
  let getEnketoEditedStatus;
  let task;
  let ctrl;
  let createController;
  let render;
  let get;
  let XmlForms;
  let getList;
  let tasksLoadedPromise;

  beforeEach(() => {
    module('inboxApp');
    getList = sinon.stub();
    tasksLoadedPromise = Promise.resolve().then(() => getList.returns([task]));
    KarmaUtils.setupMockStore({
      tasks: {
        loaded: tasksLoadedPromise,
      }
    });
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

    get = sinon.stub().resolves({ _id: 'contact' });
    render.resolves();
    createController = () => {
      ctrl = $controller('TasksContentCtrl', {
        $scope,
        $ngRedux,
        $state: { params: { id: '123' } },
        $q: Q,
        Enketo: { render },
        DB: () => ({ get }),
        XmlForms,
        Telemetry: { record: sinon.stub() },
        LiveList: {
          tasks: {
            clearSelected: sinon.stub(),
            setSelected: sinon.stub(),
            getList: getList,
          },
        }
      });
    };
  }));

  afterEach(() => {
    KarmaUtils.restore(render, get, XmlForms);
  });

  it('loads form when task has one action and no fields (without hydration)', done => {
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
    setTimeout(() => {
      expect(ctrl.formId).to.equal('A');

      expect(render.callCount).to.equal(1);
      expect(render.getCall(0).args.length).to.equal(5);
      expect(render.getCall(0).args[0]).to.equal('#task-report');
      expect(render.getCall(0).args[1]).to.deep.equal(form);
      expect(render.getCall(0).args[2]).to.equal('nothing');
      expect(get.callCount).to.eq(0);
      expect(getEnketoEditedStatus()).to.equal(false);
      done();
    });
  });

  it('successful hydration', done => {
    task = {
      _id: '123',
      forId: 'contact',
      actions: [{
        type: 'report',
        form: 'A',
        content: {
          something: 'nothing',
        },
      }]
    };
    const form = { _id: 'myform', title: 'My Form' };
    XmlForms.get.resolves(form);
    createController();
    setTimeout(() => {
      expect(get.callCount).to.eq(1);
      expect(get.args).to.deep.eq([['contact']]);

      expect(render.callCount).to.eq(1);
      expect(render.args[0][2]).to.deep.eq({
        contact: { _id: 'contact' },
        something: 'nothing',
      });
      done();
    });
  });

  it('unsuccessful hydration', done => {
    get.rejects({ status: 404 });
    task = {
      _id: '123',
      forId: 'dne',
      actions: [{
        type: 'report',
        form: 'A',
      }]
    };
    const form = { _id: 'myform', title: 'My Form' };
    XmlForms.get.resolves(form);
    createController();
    setTimeout(() => {
      expect(get.callCount).to.eq(1);
      expect(get.args).to.deep.eq([['dne']]);

      expect(render.callCount).to.eq(1);
      expect(render.args[0][2]).to.deep.eq({ contact: { _id: 'dne' } });
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
    setTimeout(() => {
      expect(ctrl.formId).to.equal(null);
      expect(ctrl.loadingForm).to.equal(undefined);
      expect(render.callCount).to.equal(0);
      done();
    });
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

  it('should wait for the tasks to load before setting selected task', (done) => {
    const notTask = {
      _id: '123',
      forId: 'contact',
      actions: [{
        type: 'report',
        form: 'A',
        content: {
          something: 'other',
        },
      }]
    };
    const form = { _id: 'myform', title: 'My Form' };
    XmlForms.get.resolves(form);
    const someFn = sinon.stub();
    tasksLoadedPromise = Promise.resolve().then(() => {
      someFn();
      getList.returns([notTask]);
    });
    createController();
    setTimeout(() => {
      expect(render.args[0][2]).to.deep.eq({
        contact: { _id: 'contact' },
        something: 'other',
      });
      expect(someFn.callCount).to.equal(1);
      done();
    });
  });
});
