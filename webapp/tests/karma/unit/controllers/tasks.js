describe('Tasks controller', () => {
  const { expect } = chai;
  let getService;
  let $ngRedux;
  let $scope;
  let Changes;
  let db;
  let LiveList;
  let RulesEngine;
  let Telemetry;
  let Tour;
  let Debounce;

  beforeEach(async () => {
    Changes = sinon.stub();
    RulesEngine = {
      isEnabled: sinon.stub().resolves(true),
      fetchTaskDocsForAllContacts: sinon.stub().resolves([]),
    };

    Tour = sinon.stub();
    db = { get: sinon.stub().resolves({}) };
    Telemetry = { record: sinon.stub() };
    Debounce = sinon.stub().callsFake(() => {
      const debounced = sinon.stub();
      debounced.cancel = sinon.stub();
      return debounced;
    });

    module('inboxApp');
    module($provide => {
      $provide.value('Changes', () => {});
      $provide.factory('DB', KarmaUtils.mockDB(db));
      $provide.value('RulesEngine', RulesEngine);
      $provide.value('Tour', Tour);
      $provide.value('Telemetry', Telemetry);
      $provide.value('Debounce', Debounce);
    });

    inject((_$rootScope_, _$ngRedux_, _LiveList_, _LiveListConfig_, $controller) => {
      const $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      $scope.clearSelected = sinon.stub();

      sinon.stub(_$ngRedux_, 'dispatch').returns();
      $ngRedux = _$ngRedux_;
      LiveList = _LiveList_;

      _LiveListConfig_($scope);

      getService = () => {
        const result = $controller('TasksCtrl', {
          $log: { error: () => {}},
          $q: Q,
          $scope,
          $ngRedux,
          Changes,
          LiveList,
          LiveListConfig: _LiveListConfig_,
          RulesEngine,
          Telemetry,
          Tour,
        });
        sinon.stub(result, 'setSelectedTask');

        return result;
      };
    });
  });

  afterEach(() => {
    sinon.restore();
    KarmaUtils.restore(Changes, RulesEngine, Tour);
  });

  it('initial state before resolving tasks', () => {
    RulesEngine.isEnabled = () => new Promise(() => {});
    const service = getService();
    expect(service.loading).to.be.true;
    expect(!!service.hasTasks).to.be.false;
    expect(!!service.error).to.be.false;
    expect(!!service.tasksDisabled).to.be.false;

    expect(Tour.callCount).to.eq(0);
  });

  it('task engine is disabled', async () => {
    RulesEngine.isEnabled.resolves(false);
    let service;
    await new Promise(resolve => {
      sinon.stub(LiveList.tasks, 'set').callsFake(resolve);
      service = getService();
    });
    expect(service.loading).to.be.false;
    expect(!!service.hasTasks).to.be.false;
    expect(!!service.error).to.be.false;
    expect(service.tasksDisabled).to.be.true;
  });

  it('task engine throws in initialization', async () => {
    RulesEngine.isEnabled.rejects('error');
    let service;
    await new Promise(resolve => {
      sinon.stub(LiveList.tasks, 'set').callsFake(resolve);
      service = getService();
    });
    expect(service.loading).to.be.false;
    expect(!!service.hasTasks).to.be.false;
    expect(service.error).to.be.true;
    expect(!!service.tasksDisabled).to.be.false;
    expect(LiveList.tasks.set.args).to.deep.eq([[[]]]);
  });

  it('tasks render via livelist', async () => {
    const taskDocs = [
      { _id: '1', emission: { _id: 'e1' }},
      { _id: '2', emission: { _id: 'e2' }},
    ];
    RulesEngine.fetchTaskDocsForAllContacts.resolves(taskDocs);

    let service;
    await new Promise(resolve => {
      sinon.stub(LiveList.tasks, 'set').callsFake(resolve);
      service = getService();
    });
    expect(service.loading).to.be.false;
    expect(service.tasksDisabled).to.be.false;
    expect(service.hasTasks).to.be.true;
    expect(!!service.error).to.be.false;
    expect(LiveList.tasks.set.args).to.deep.eq([[[{ _id: 'e1' }, { _id: 'e2' }]]]);
  });

  it('rules engine yields no tasks', async () => {
    let service;
    await new Promise(resolve => {
      sinon.stub(LiveList.tasks, 'set').callsFake(resolve);
      service = getService();
    });
    expect(service.loading).to.be.false;
    expect(service.tasksDisabled).to.be.false;
    expect(service.hasTasks).to.be.false;
    expect(!!service.error).to.be.false;
    expect(RulesEngine.fetchTaskDocsForAllContacts.callCount).to.eq(1);
    expect(LiveList.tasks.set.args).to.deep.eq([[[]]]);
  });

  it('changes feed', async () => {
    await new Promise(resolve => {
      sinon.stub(LiveList.tasks, 'set').callsFake(resolve);
      getService();
    });

    const changesFeed = Changes.args[0][0];
    expect(!!changesFeed.filter({})).to.be.false;
    expect(changesFeed.filter({ id: 'person', doc: { _id: 'person', type: 'person' }})).to.be.true;
    expect(changesFeed.filter({ id: 'clinic', doc: { _id: 'clinic', type: 'clinic' }})).to.be.true;
    expect(changesFeed.filter({ id: 'report', doc: { _id: 'report', type: 'data_record', form: 'form' }})).to.be.true;
    expect(changesFeed.filter({ id: 'task', doc: { _id: 'task', type: 'task' }})).to.be.true;

    expect(changesFeed.filter({ id: 'foo', doc: { _id: 'a', type: 'data_record', form: undefined }})).to.be.false;
  });

  it('should record telemetry on initial load', async () => {
    await new Promise(resolve => {
      sinon.stub(LiveList.tasks, 'set').callsFake(resolve);
      getService();
    });

    expect(RulesEngine.fetchTaskDocsForAllContacts.callCount).to.eq(1);
    expect(Telemetry.record.callCount).to.equal(1);
    expect(Telemetry.record.args[0][0]).to.equal('tasks:load');
  });

  it('should should record telemetry on refresh', async () => {
    await new Promise(resolve => {
      sinon.stub(LiveList.tasks, 'set').callsFake(resolve);
      getService();
    });

    const changesArgs = Changes.args[0][0];
    const change = { doc: { type: 'task' } };
    changesArgs.callback(change);
    const refresh = Debounce.args[0][0];
    await refresh();

    expect(RulesEngine.fetchTaskDocsForAllContacts.callCount).to.eq(2);
    expect(Telemetry.record.callCount).to.equal(2);
    expect(Telemetry.record.args[0][0]).to.equal('tasks:load');
    expect(Telemetry.record.args[1][0]).to.equal('tasks:refresh');
  });

});
