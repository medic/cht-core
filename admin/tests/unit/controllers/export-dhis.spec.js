describe('dhis2 export controller', () => {
  const { expect } = chai;

  const dataSet = 'abc123';
  const dhisDataSets = [
    { id: dataSet, translation_key: 'dataset label' },
  ];

  const NOW = moment('2000-01-15').valueOf();

  let scope;
  let getService;
  let query;
  let Settings;

  beforeEach(() => {
    module('adminApp');
    sinon.useFakeTimers(NOW);
    Settings = sinon.stub().resolves({ dhis_data_sets: dhisDataSets });
    query = sinon.stub().resolves({ rows: [
      mockContact('p1'),
      mockContact('p2', { dhis: { orgUnit: 'ou-p2'}}),
      mockContact('p3', { dhis: [
        { orgUnit: 'ou-p3', dataSet },
        { orgUnit: 'ou-p3-other', dataSet: 'other' }
      ]}),
    ] });

    module($provide => {
      $provide.value('Settings', Settings);
      $provide.value('$scope', scope);
    });

    inject(($controller, _$rootScope_) => {
      scope = _$rootScope_.$new();
      getService = async () => {
        const result = $controller('ExportDhisCtrl', {
          $scope: scope,
          DB: () => ({ query }),
        });
        await Settings.returnValues[0];
        await query.returnValues[0];

        return result;
      };
    });
  });
  afterEach(() => {
    sinon.restore();
  });

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
