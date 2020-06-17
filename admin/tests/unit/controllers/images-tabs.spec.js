describe('Images header-tabs controller', () => {
  let scope;
  let getService;
  let query;
  let Settings;
  let HeaderTabs;
  let ResourceIcons;
  let UpdateSettings;

  beforeEach(() => {
    module('adminApp');

    Settings = sinon.stub().resolves({ });
    HeaderTabs = sinon.stub();
    ResourceIcons = { getDocResourcesByMimeType: sinon.stub() };
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
      getService = async () => {
        const result = $controller('ImagesTabsCtrl', {
          $scope: scope,
          DB: () => ({ query }),
        });
        await Settings.returnValues[0];
        await query.returnValues[0];

        return result;
      };
    });
  });
  afterEach(() => { sinon.restore(); });

  it('loads scope for valid config', async () => {
    await getService();
    expect(scope.dataSets).to.deep.eq(dhisDataSets);
    expect(scope.periods.map(period => period.description)).to.deep.eq([
      'January, 2000',
      'December, 1999',
      'November, 1999',
      'October, 1999',
      'September, 1999',
      'August, 1999',
    ]);

    expect(scope.places).to.deep.eq({
      '_all_': [{ id: 'ou-p2', name: 'p2' }],
      [dataSet]: [
        { id: 'ou-p1', name: 'p1' },
        { id: 'ou-p3', name: 'p3' }
      ],
      other: [{ id: 'ou-p3-other', name: 'p3' }],
    });

    expect(scope.selected).to.deep.eq({ dataSet });
  });

  it('loads defaults when there is no dhis configuration', async () => {
    Settings.resolves({});
    await getService();
    expect(!!scope.dataSets).to.be.false;
  });

  const mockContact = (name, assign) => ({
    id: `contact-${name}`,
    doc: Object.assign({
      _id: `contact-${name}`,
      type: 'contact',
      contact_type: 'person',
      name,
      dhis: {
        dataSet,
        orgUnit: `ou-${name}`,
      },
    }, assign),
  });

});
