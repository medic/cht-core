describe('Tasks controller', () => {
  const { expect } = chai;
  let
    getService,
    $ngRedux,
    $scope,
    Changes,
    db,
    LiveList,
    RulesEngine,
    Tour;

  beforeEach(async () => {
    Changes = sinon.stub();
    RulesEngine = {
      isEnabled: sinon.stub().resolves(true),
      fetchTaskDocsForAllContacts: sinon.stub().resolves([]),
    };

    Tour = sinon.stub();
    db = { get: sinon.stub().resolves({}) };

    module('inboxApp');
    module($provide => {
      $provide.value('Changes', () => {});
      $provide.factory('DB', KarmaUtils.mockDB(db));
      $provide.value('RulesEngine', RulesEngine);
      $provide.value('Tour', Tour);
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
          Tour,
        });
        sinon.stub(result, 'settingSelected');
        sinon.stub(result, 'setSelectedTask');
        sinon.stub(result, 'setTitle');
        sinon.stub(result, 'setShowContent');
        
        return result;
      };
    });
  });

  afterEach(() => {
    sinon.restore();
    KarmaUtils.restore(Changes, RulesEngine, Tour);
  });

  const deepCopy = obj => JSON.parse(JSON.stringify(obj));

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

  it('setSelected success without hydration', async () => {
    const taskDocs = [
      { _id: '1', emission: { _id: 'e1' }},
      { _id: '2', emission: { _id: 'e2', title: 'foo' }},
    ];
    RulesEngine.fetchTaskDocsForAllContacts.resolves(deepCopy(taskDocs));
    const service = getService();
    await $scope.setSelected('e2');
    expect(service.settingSelected.args).to.deep.eq([[false]]);
    expect(service.setSelectedTask.args).to.deep.eq([[taskDocs[1].emission]]);
    expect(service.setTitle.args).to.deep.eq([['foo']]);
    expect(service.setShowContent.args).to.deep.eq([[true]]);
  });

  it('setSelected hydration success', async () => {
    const taskDocs = [
      { _id: '2', emission: { _id: 'e2', title: 'foo', actions: [{ content: {  }}], forId: 'contactId' }},
    ];
    RulesEngine.fetchTaskDocsForAllContacts.resolves(deepCopy(taskDocs));
    const contact = { _id: 'contactId', foo: 'bar' };
    db.get.resolves(contact);
    const service = getService();
    await $scope.setSelected('e2');
    expect(service.settingSelected.args).to.deep.eq([[false]]);

    expect(service.setSelectedTask.callCount).to.eq(1);
    const [selected] = service.setSelectedTask.args[0];
    expect(selected.actions).deep.eq([{ content: { contact } }]);
  });

  it('setSelected hydration failure', async () => {
    const taskDocs = [
      { _id: '2', emission: { _id: 'e2', title: 'foo', actions: [{}], forId: 'contactId' }},
    ];
    RulesEngine.fetchTaskDocsForAllContacts.resolves(deepCopy(taskDocs));
    db.get.rejects('err');
    
    const service = getService();
    await $scope.setSelected('e2');
    expect(service.settingSelected.args).to.deep.eq([[false]]);
    expect(service.setSelectedTask.args).to.deep.eq([[taskDocs[0].emission]]);
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
});
