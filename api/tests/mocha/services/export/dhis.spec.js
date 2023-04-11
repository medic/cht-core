const { expect } = require('chai');
const path = require('path');
const memdownMedic = require('@medic/memdown');
const moment = require('moment');
const sinon = require('sinon');

const defaultSettings = require('../../../../../config/default/app_settings.json');
const service = require('../../../../src/services/export/dhis');
const config = require('../../../../src/config');
const db = require('../../../../src/db');

const NOW = moment('2000-02-21');
const dataSet = 'VMuFODsyWaO';
const filterNow = { from: Date.now() };

describe('dhis export service', () => {
  let medic;

  beforeEach(async () => {
    sinon.useFakeTimers(NOW.valueOf());
    medic = await memdownMedic(path.resolve('.'));
    sinon.stub(db, 'medic').value(medic);
  });
  afterEach(() => sinon.restore());

  it('sums all dataElements for given interval', async () => {
    const chu1 = mockContact('chu1');
    const chu2 = mockContact('chu2');
    const chw = mockContact('chw', { dhis: undefined, parent: { _id: chu1._id } });

    sinon.stub(config, 'get').returns(defaultSettings);

    await medic.bulkDocs([
      chu1,
      chu2,
      chw,
      mockTargetDoc('ignore1', '2000-01'),
      mockTargetDoc('chw', '2000-02'),
      mockTargetDoc('chu1', '2000-02'),
      mockTargetDoc('chu2', '2000-02'),
      mockTargetDoc('ignore2', '2000-03'),
    ]);

    const actual = await service({
      date: {
        from: moment(NOW).valueOf(),
      },
      dataSet,
    });

    expect(actual).to.deep.eq({
      completeDate: '2000-02-21',
      dataSet,
      dataValues: [
        {
          dataElement: 'kB0ZBFisE0e',
          orgUnit: 'ou-chu1',
          value: 24,
        },
        {
          dataElement: 'e22tIwy1nKR',
          attributeOptionCombo: 'HllvX50cXC0',
          categoryOptionCombo: 'HllvX50cXC0',
          orgUnit: 'ou-chu1',
          value: 8,
        },
        {
          dataElement: 'kB0ZBFisE0e',
          orgUnit: 'ou-chu2',
          value: 12,
        },
        {
          dataElement: 'e22tIwy1nKR',
          attributeOptionCombo: 'HllvX50cXC0',
          categoryOptionCombo: 'HllvX50cXC0',
          orgUnit: 'ou-chu2',
          value: 4,
        },
      ],
      period: '200002',
    });
  });

  it('yields 0s for an orgunit without any target docs', async () => {
    const chu = mockContact('chu');
    sinon.stub(config, 'get').returns(defaultSettings);
    await medic.bulkDocs([chu]);
    const actual = await service({
      date: {
        from: moment(NOW).valueOf(),
      },
      dataSet,
    });

    expect(actual).to.deep.eq({
      completeDate: '2000-02-21',
      dataSet,
      dataValues: [
        {
          dataElement: 'kB0ZBFisE0e',
          orgUnit: 'ou-chu',
          value: 0,
        },
        {
          dataElement: 'e22tIwy1nKR',
          attributeOptionCombo: 'HllvX50cXC0',
          categoryOptionCombo: 'HllvX50cXC0',
          orgUnit: 'ou-chu',
          value: 0,
        },
      ],
      period: '200002',
    });
  });

  describe('human readable', () => {
    it('single dataSet, single orgUnit', async () => {
      const chu = mockContact('chu');
      sinon.stub(config, 'get').returns(defaultSettings);
      await medic.bulkDocs([
        chu,
        mockTargetDoc('chu', '2000-02'),
      ]);
      const actual = await service({
        date: {
          from: moment(NOW).valueOf(),
        },
        dataSet,
      }, { humanReadable: true });

      expect(actual.dataValues).to.deep.eq([
        {
          dataElement: 'births-this-month',
          orgUnit: 'chu',
          value: 12,
        },
        {
          dataElement: 'facility-deliveries',
          attributeOptionCombo: 'HllvX50cXC0',
          categoryOptionCombo: 'HllvX50cXC0',
          orgUnit: 'chu',
          value: 4,
        },
      ]);
    });

    it('contact with multiple orgUnits', async () => {
      const dhisConfig = [
        { orgUnit: 'ou-1', dataSet: 'ds-1' },
        { orgUnit: 'ou-2', dataSet: 'ds-2' },
      ];
      settingsWithMultipleDatasets();
      await medic.bulkDocs([
        mockContact('chu', { dhis: dhisConfig }),
      ]);

      const ds1 = await service({
        date: { from: moment(NOW).valueOf() },
        dataSet: 'ds-1',
      }, { humanReadable: true });
      expect(ds1).to.deep.eq({
        dataSet: 'dataset 1',
        completeDate: '2000-02-21',
        period: '200002',
        dataValues: [
          {
            dataElement: 'data element 1',
            arbitrary: 'yes',
            orgUnit: 'chu',
            value: 0
          },
          {
            dataElement: 'data element both',
            orgUnit: 'chu',
            value: 0
          }
        ]
      });
    });
  });

  it('filters data by orgUnit', async () => {
    const chu1 = mockContact('chu1');
    const chu2 = mockContact('chu2');
    const chw = mockContact('chw', { dhis: undefined, parent: { _id: chu1._id } });

    sinon.stub(config, 'get').returns(defaultSettings);
    await medic.bulkDocs([
      chu1,
      chu2,
      chw,
      mockTargetDoc('chw', '2000-02'),
      mockTargetDoc('chu1', '2000-02'),
      mockTargetDoc('chu2', '2000-02'),
    ]);

    const actual = await service({
      date: {
        from: moment(NOW).valueOf(),
      },
      dataSet,
      orgUnit: chu1.dhis.orgUnit,
    });

    expect(actual).to.deep.eq({
      completeDate: '2000-02-21',
      dataSet,
      dataValues: [
        {
          dataElement: 'kB0ZBFisE0e',
          orgUnit: 'ou-chu1',
          value: 24,
        },
        {
          dataElement: 'e22tIwy1nKR',
          attributeOptionCombo: 'HllvX50cXC0',
          categoryOptionCombo: 'HllvX50cXC0',
          orgUnit: 'ou-chu1',
          value: 8,
        },
      ],
      period: '200002',
    });
  });

  it('filtered data is empty when placeid has no contacts', async () => {
    sinon.stub(config, 'get').returns(defaultSettings);
    await medic.bulkDocs([
      mockContact('chu', { dhis: { orgUnit: 'ou', dataSet: 'other' }}),
    ]);
    const actual = await service({
      date: {
        from: moment(NOW).valueOf(),
      },
      dataSet,
      placeId: 'chu',
    });

    expect(actual.dataValues).to.deep.eq([]);
  });

  it('filtered data does not include contact when matching dataSet is not included', async () => {
    sinon.stub(config, 'get').returns(defaultSettings);
    await medic.bulkDocs([
      mockContact('chu', { dhis: { orgUnit: 'ou', dataSet: 'other' }}),
    ]);
    const actual = await service({
      date: {
        from: moment(NOW).valueOf(),
      },
      dataSet,
      placeId: 'chu',
    });

    expect(actual.dataValues).to.deep.eq([]);
  });

  it('filter data for contact with multiple orgUnits', async () => {
    const dhisConfig = [
      { orgUnit: 'ou-1', dataSet: 'ds-1' },
      { orgUnit: 'ou-2', dataSet: 'ds-2' },
    ];
    settingsWithMultipleDatasets();
    await medic.bulkDocs([
      mockContact('chu', { dhis: dhisConfig }),
      mockTargetDoc('chu', '2000-02', { targets: [
        {
          id: 'data element 1',
          value: { pass: 0, total: 1 },
        },
        {
          id: 'data element 2',
          value: { pass: 0, total: 2 },
        },
        {
          id: 'data element both',
          value: { pass: 0, total: 100 },
        },
      ] }),
    ]);

    const ds1 = await service({
      date: { from: moment(NOW).valueOf() },
      dataSet: 'ds-1',
    });
    expect(ds1).to.deep.eq({
      dataSet: 'ds-1',
      completeDate: '2000-02-21',
      period: '200002',
      dataValues: [
        {
          dataElement: 'de-1',
          arbitrary: 'yes',
          orgUnit: 'ou-1',
          value: 1
        },
        {
          dataElement: 'de-both',
          orgUnit: 'ou-1',
          value: 100
        }
      ]
    });

    const ds2 = await service({
      date: { from: moment(NOW).valueOf() },
      dataSet: 'ds-2',
    });
    expect(ds2).to.deep.eq({
      dataSet: 'ds-2',
      completeDate: '2000-02-21',
      period: '200002',
      dataValues: [
        {
          dataElement: 'de-2',
          orgUnit: 'ou-2',
          value: 2
        },
        {
          dataElement: 'de-both',
          orgUnit: 'ou-2',
          value: 100
        }
      ]
    });
  });

  it('filters data for single target doc with two org units in hierarchy', async () => {
    const hc = mockContact('hc', { dhis: { orgUnit: 'alt' } });
    const chu = mockContact('chu', { parent: { _id: hc._id }});
    const chw = mockContact('chw', { dhis: undefined, parent: { _id: chu._id, parent: chu.parent } });

    sinon.stub(config, 'get').returns(defaultSettings);
    await medic.bulkDocs([
      chw,
      chu,
      hc,
      mockTargetDoc('chw', '2000-02'),
      mockTargetDoc('hc', '2000-02'),
    ]);

    const actual = await service({
      date: {
        from: moment(NOW).valueOf(),
      },
      dataSet,
    });

    expect(actual).to.deep.eq({
      completeDate: '2000-02-21',
      dataSet,
      period: '200002',
      dataValues: [
        {
          dataElement: 'kB0ZBFisE0e',
          orgUnit: 'alt',
          value: 24,
        },
        {
          dataElement: 'e22tIwy1nKR',
          attributeOptionCombo: 'HllvX50cXC0',
          categoryOptionCombo: 'HllvX50cXC0',
          orgUnit: 'alt',
          value: 8,
        },
        {
          dataElement: 'kB0ZBFisE0e',
          orgUnit: 'ou-chu',
          value: 12,
        },
        {
          dataElement: 'e22tIwy1nKR',
          attributeOptionCombo: 'HllvX50cXC0',
          categoryOptionCombo: 'HllvX50cXC0',
          orgUnit: 'ou-chu',
          value: 4,
        },
      ],
    });
  });

  it('target definitions for other dataSets are not included', async () => {
    const dataSet = 'myDataSet';
    mockSettings(
      [{ id: dataSet, translation_key: 'my data set' }],
      [
        {
          id: 'relevant',
          dhis: {
            dataSet,
            dataElement: 'relevant',
          }
        },
        {
          id: 'irrelevant',
          dhis: {
            dataSet: 'other',
            dataElement: 'irrelevant',
          }
        },
      ],
    );
    await medic.bulkDocs([ mockContact('chu') ]);

    const actual = await service({ dataSet, date: filterNow });
    expect(actual.dataValues).to.deep.eq([{
      dataElement: 'relevant',
      orgUnit: 'ou-chu',
      value: 0
    }]);
  });

  it('throw on undefined dataset', async () => {
    sinon.stub(config, 'get').returns(defaultSettings);
    try {
      await service({
        dataSet: 'dne',
        date: filterNow,
      });
      expect.fail('should throw');
    } catch (err) {
      expect(err.message).to.include('is not defined');
    }
  });

  it('throw on dataset without dataElements', async () => {
    mockSettings(
      [{ id: 'myDataSet', translation_key: 'my data set' }],
      [{
        id: 'target',
        dhis: {
          dataSet: 'other',
          dataElement: 'de',
        }
      }]
    );

    try {
      await service({
        dataSet: 'myDataSet',
        date: filterNow,
      });
      expect.fail('should throw');
    } catch (err) {
      expect(err.message).to.include('has no dataElements');
    }
  });

  it('throw on absent target definitions', async () => {
    mockSettings([{ id: 'ds-1' }]);
    try {
      await service({ dataSet: 'ds-1', date: filterNow });
      expect.fail('should throw');
    } catch (err) {
      expect(err.message).to.include('has no dataElements');
    }
  });
});

const mockContact = (username, override) => Object.assign({
  _id: `${username}-guid`,
  type: 'contact',
  contact_type: 'person',
  name: username,
  dhis: {
    orgUnit: `ou-${username}`,
  }
}, override);

const mockTargetDoc = (username, interval, override) => Object.assign({
  _id: `target~${interval}~org.couchdb.user:${username}~${username}-guid`,
  type: 'target',
  owner: `${username}-guid`,
  user: `org.couchdb.user:${username}`,
  targets: [
    {
      id: 'births-this-month',
      value: {
        pass: 0,
        total: 12
      }
    },
    {
      id: 'facility-deliveries',
      value: {
        pass: 2,
        total: 4,
        percent: 50
      }
    },
  ]
}, override);

const mockSettings = (dataSets, targets) => {
  sinon.stub(config, 'get').returns({
    dhis_data_sets: dataSets,
    tasks: {
      targets: { items: targets }
    }
  });
};

const settingsWithMultipleDatasets = () => {
  mockSettings(
    [
      { id: 'ds-1', translation_key: 'dataset 1' },
      { id: 'ds-2', translation_key: 'dataset 2' },
    ],
    [
      {
        id: 'data element 1',
        dhis: {
          dataSet: 'ds-1',
          dataElement: 'de-1',
          arbitrary: 'yes',
        }
      },
      {
        id: 'data element 2',
        dhis: {
          dataSet: 'ds-2',
          dataElement: 'de-2',
        }
      },
      {
        id: 'data element both',
        dhis: {
          dataElement: 'de-both',
        }
      },
    ]
  );
};
