describe('DataContext service', () => {
  const { DOC_IDS } = require('@medic/constants');
  let service;
  let Location;
  let Settings;
  let Changes;
  let $log;
  let changesOptions;
  const settings = { hello: 'settings' };

  beforeEach(() => {
    Location = { rootUrl: 'ftp//myhost:21' };
    Settings = sinon.stub().resolves(settings);
    changesOptions = null;
    Changes = sinon.stub().callsFake(options => {
      changesOptions = options;
      return { unsubscribe: sinon.stub() };
    });
    $log = { error: sinon.stub() };
    module('adminApp');
    module($provide => {
      $provide.value('Location', Location);
      $provide.value('Settings', Settings);
      $provide.value('Changes', Changes);
      $provide.value('$log', $log);
    });
  });

  const initService = () => inject(_DataContext_ => {
    service = _DataContext_;
  });

  it('resolves to a data context bound to the loaded settings', async () => {
    initService();
    const dataContext = await service;

    chai.expect(Settings.calledOnce).to.be.true;
    chai.expect(dataContext.url).to.equal(Location.rootUrl);
    chai.expect(dataContext.settings.getAll()).to.equal(settings);
    const dataSource = dataContext.getDatasource();
    chai.expect(dataSource).to.haveOwnProperty('v1');
  });

  it('rejects when the initial Settings() call fails', async () => {
    const error = new Error('initial settings failed');
    Settings.rejects(error);
    initService();

    let caught;
    try {
      await service;
    } catch (err) {
      caught = err;
    }
    chai.expect(caught).to.equal(error);
    chai.expect(Changes.called).to.be.false;
  });

  it('binds the given function to the data context', async () => {
    initService();
    const innerFn = sinon.stub();
    const outerFn = sinon.stub().returns(innerFn);

    const dataContext = await service;
    const result = dataContext.bind(outerFn);

    chai.expect(result).to.equal(innerFn);
    chai.expect(outerFn.calledOnce).to.be.true;
    chai.expect(innerFn.notCalled).to.be.true;
  });

  it('subscribes to settings-doc changes and refreshes the cached settings', async () => {
    initService();
    const dataContext = await service;

    chai.expect(Changes.calledOnce).to.be.true;
    chai.expect(changesOptions.key).to.equal('data-context-settings');
    chai.expect(changesOptions.filter({ id: DOC_IDS.SETTINGS })).to.be.true;
    chai.expect(changesOptions.filter({ id: 'something-else' })).to.be.false;

    const updatedSettings = { hello: 'updated' };
    Settings.resolves(updatedSettings);
    await changesOptions.callback();

    chai.expect(Settings.callCount).to.equal(2);
    chai.expect(dataContext.settings.getAll()).to.equal(updatedSettings);
  });

  it('logs and keeps the cached settings when refresh fails in the Changes callback', async () => {
    initService();
    const dataContext = await service;

    const refreshError = new Error('refresh failed');
    Settings.rejects(refreshError);
    await changesOptions.callback();

    chai.expect(Settings.callCount).to.equal(2);
    chai.expect(dataContext.settings.getAll()).to.equal(settings);
    chai.expect($log.error.calledOnce).to.be.true;
    chai.expect($log.error.firstCall.args).to.deep.equal(['Failed to refresh settings', refreshError]);
  });
});
