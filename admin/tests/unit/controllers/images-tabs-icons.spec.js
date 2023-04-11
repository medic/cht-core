describe('Images header-tabs controller', () => {
  let scope;
  let getController;
  let Settings;
  let HeaderTabs;
  let ResourceIcons;
  let UpdateSettings;

  beforeEach(() => {
    module('adminApp');

    Settings = sinon.stub().resolves();
    HeaderTabs = sinon.stub();
    ResourceIcons = { getDocResourcesByMimeType: sinon.stub().resolves() };
    UpdateSettings = sinon.stub();

    module($provide => {
      $provide.value('Settings', Settings);
      $provide.value('HeaderTabs', HeaderTabs);
      $provide.value('ResourceIcons', ResourceIcons);
      $provide.value('UpdateSettings', UpdateSettings);
      $provide.value('$scope', scope);
    });

    inject(($controller, _$rootScope_) => {
      scope = _$rootScope_.$new();
      getController = () => {
        const result = $controller('ImagesTabsIconsCtrl', {
          $q: Q,
          $scope: scope,
          ResourceIcons,
          HeaderTabs,
          UpdateSettings,
        });

        return result.getSetupPromiseForTesting();
      };
    });
  });
  afterEach(() => {
    sinon.restore();
  });

  it('should load settings, tabs and resource icons', () => {
    const tabs = [
      { name: 'tab1', icon: 'fa-1' },
      { name: 'tab2', icon: 'fa-2' },
      { name: 'tab3', icon: 'fa-3' },
      { name: 'tab4', icon: 'fa-4' },
      { name: 'tab5', icon: 'fa-5' },
    ];
    const icons = ['icon1', 'icon2', 'icon3', 'icon4'];
    const headerTabsSettings = {
      header_tabs: {
        tab2: { },
        tab3: { icon: 'fa-33' },
        tab4: { resource_icon: 'icon3' },
        tab5: { icon: 'fa-55', resource_icon: 'icon3' },
      }
    };
    ResourceIcons.getDocResourcesByMimeType.resolves(icons);
    Settings.resolves(headerTabsSettings);
    HeaderTabs.returns(tabs);
    return getController().then(() => {
      chai.expect(scope.resourceIcons).to.deep.equal(icons);
      chai.expect(scope.tabs).to.deep.equal(tabs);
      chai.expect(scope.tabsConfig).to.deep.equal(headerTabsSettings.header_tabs);

      chai.expect(HeaderTabs.callCount).to.equal(1);
      chai.expect(HeaderTabs.args[0]).to.deep.equal([]);

      chai.expect(ResourceIcons.getDocResourcesByMimeType.callCount).to.equal(1);
      chai.expect(ResourceIcons.getDocResourcesByMimeType.args[0]).to.deep.equal(['resources', 'image/svg+xml']);

      chai.expect(Settings.callCount).to.equal(1);

      chai.expect(scope.loading).to.equal(false);
      chai.expect(scope.error).to.equal(null);
    });
  });

  it('should have correct default values', () => {
    ResourceIcons.getDocResourcesByMimeType.resolves();
    Settings.resolves();
    HeaderTabs.returns([]);

    return getController().then(() => {
      chai.expect(scope.resourceIcons).to.deep.equal([]);
      chai.expect(scope.tabs).to.deep.equal([]);
      chai.expect(scope.tabsConfig).to.deep.equal({});
    });
  });

  it('should remove configs with invalid resource icons', () => {
    const tabs = [
      { name: 'tab1', icon: 'fa-1' },
      { name: 'tab2', icon: 'fa-2' },
      { name: 'tab3', icon: 'fa-3' },
      { name: 'tab4', icon: 'fa-4' },
      { name: 'tab5', icon: 'fa-5' },
    ];
    const icons = ['icon1', 'icon2', 'icon3', 'icon4'];
    const headerTabsSettings = {
      header_tabs: {
        tab2: { },
        tab3: { icon: 'fa-33' },
        tab4: { resource_icon: 'icon44' },
        tab5: { icon: 'fa-55', resource_icon: 'icon55' },
      }
    };
    ResourceIcons.getDocResourcesByMimeType.resolves(icons);
    Settings.resolves(headerTabsSettings);
    HeaderTabs.returns(tabs);
    return getController().then(() => {
      chai.expect(scope.resourceIcons).to.deep.equal(icons);
      chai.expect(scope.tabs).to.deep.equal(tabs);
      chai.expect(scope.tabsConfig).to.deep.equal({
        tab2: { },
        tab3: { icon: 'fa-33' },
        tab4: { resource_icon: '' },
        tab5: { icon: 'fa-55', resource_icon: '' },
      });

      chai.expect(HeaderTabs.callCount).to.equal(1);
      chai.expect(HeaderTabs.args[0]).to.deep.equal([]);

      chai.expect(ResourceIcons.getDocResourcesByMimeType.callCount).to.equal(1);
      chai.expect(ResourceIcons.getDocResourcesByMimeType.args[0]).to.deep.equal(['resources', 'image/svg+xml']);

      chai.expect(Settings.callCount).to.equal(1);

      chai.expect(scope.loading).to.equal(false);
      chai.expect(scope.error).to.equal(null);
    });
  });

  it('should catch Settings errors', () => {
    ResourceIcons.getDocResourcesByMimeType.resolves(['icon']);
    Settings.rejects({ err: 'omg' });
    HeaderTabs.returns([{ name: 'tab' }]);

    return getController().then(() => {
      chai.expect(scope.resourceIcons).to.deep.equal(null);
      chai.expect(scope.tabs).to.deep.equal([{ name: 'tab' }]);
      chai.expect(scope.tabsConfig).to.deep.equal(null);

      chai.expect(scope.error).to.equal(true);
      chai.expect(scope.loading).to.equal(false);
    });
  });

  it('should catch resource icons errors', () => {
    ResourceIcons.getDocResourcesByMimeType.rejects({ err: 'omg' });
    Settings.resolves({ });
    HeaderTabs.returns([{ name: 'tab' }]);

    return getController().then(() => {
      chai.expect(scope.resourceIcons).to.deep.equal(null);
      chai.expect(scope.tabs).to.deep.equal([{ name: 'tab' }]);
      chai.expect(scope.tabsConfig).to.deep.equal(null);

      chai.expect(scope.error).to.equal(true);
      chai.expect(scope.loading).to.equal(false);
    });
  });

  it('should submit settings correctly', () => {
    ResourceIcons.getDocResourcesByMimeType.resolves(['icon']);
    Settings.resolves({ header_tabs: { 'tab': { icon: 'fa-test' } }});
    HeaderTabs.returns([{ name: 'tab' }]);
    UpdateSettings.resolves();

    return getController()
      .then(() => {
        chai.expect(UpdateSettings.callCount).to.equal(0);
        chai.expect(scope.tabsConfig).to.deep.equal({ 'tab': { icon: 'fa-test' }});
        chai.expect(scope.submitted).to.equal(undefined);
        chai.expect(scope.submitting).to.equal(false);
        chai.expect(scope.submitError).to.equal(false);

        scope.tabsConfig.tab.resource_icon = 'icon';
        const promise = scope.submit();
        chai.expect(scope.submitted).to.equal(undefined);
        chai.expect(scope.submitting).to.equal(true);
        chai.expect(scope.submitError).to.equal(false);
        return promise;
      })
      .then(() => {
        chai.expect(scope.submitted).to.equal(true);
        chai.expect(scope.submitting).to.equal(false);
        chai.expect(scope.submitError).to.equal(false);

        chai.expect(UpdateSettings.callCount).to.equal(1);
        chai.expect(UpdateSettings.args[0]).to.deep.equal([{
          header_tabs: { 'tab': { icon: 'fa-test', resource_icon: 'icon' }}
        }]);
        chai.expect(UpdateSettings.args[0]).to.deep.equal([{ header_tabs: scope.tabsConfig }]);
      });
  });

  it('should catch submit errors correctly', () => {
    ResourceIcons.getDocResourcesByMimeType.resolves(['icon']);
    Settings.resolves({ header_tabs: { 'tab': { icon: 'fa-test' } }});
    HeaderTabs.returns([{ name: 'tab' }]);
    UpdateSettings.rejects({});

    return getController()
      .then(() => {
        const promise = scope.submit();
        chai.expect(scope.submitted).to.equal(undefined);
        chai.expect(scope.submitting).to.equal(true);
        chai.expect(scope.submitError).to.equal(false);
        return promise;
      })
      .then(() => {
        chai.expect(scope.submitted).to.equal(undefined);
        chai.expect(scope.submitting).to.equal(false);
        chai.expect(scope.submitError).to.equal(true);
      });
  });
});
