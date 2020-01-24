const _ = require('lodash');
const moment = require('moment');

const db = require('../../db');
const settings = require('../settings');

/**
 * @param {string} filters.dataSet
 * @param {integer} filters.from
 * @param {string=} filters.placeId
 *
 * @param options.humanReadable
 */
module.exports = async (filters, options = {}) => {
  const { dataSet, placeId } = filters;
  const { from } = filters.date || {};
  if (!dataSet) {
    throw { code: 422, message: 'filter "dataSet" is required' };
  }

  if (!from) {
    throw { code: 422, message: 'filter "from" is required' };
  }

  const settingsDoc = await settings.get();
  const dataSetConfig = settingsDoc.dhisDataSets &&
    Array.isArray(settingsDoc.dhisDataSets) &&
    settingsDoc.dhisDataSets.find(dhisDataSet => dhisDataSet.guid === dataSet);
  if (!dataSetConfig) {
    throw { code: 422, message: `dataSet "${dataSet}" is not defined` };
  }
  
  const dhisTargetDefinitions = getDhisTargetDefinitions(dataSet, settingsDoc);
  if (dhisTargetDefinitions.length === 0) {
    throw { code: 422, message: `dataSet "${dataSet}" has no dataElements` };
  }
  
  const allTargetDocsAtInterval = await fetch.targetDocsAtInterval(from);
  const contactsUnderPlace = await fetch.contactsUnderPlace(placeId);
  const targetDocsInHierarchy = allTargetDocsAtInterval.filter(target => !placeId || contactsUnderPlace[target.owner]);
  const mapContactIdToOrgUnit = mapContactIdToOrgUnits(contactsUnderPlace, dataSet);
  const dataValues = buildDataValues(dhisTargetDefinitions, targetDocsInHierarchy, mapContactIdToOrgUnit);

  const result = {
    dataSet,
    completeDate: moment().format('YYYY-MM-DD'),
    period: moment(from).format('YYYYMM'),
    dataValues,
  };

  if (options.humanReadable) {
    makeHumanReadable(
      result,
      dataSetConfig,
      Object.values(dhisTargetDefinitions),
      Object.values(contactsUnderPlace)
    );
  }

  return result;
};

const fetch = {
  contactsUnderPlace: async placeId => {
    let fetched;
    if (placeId) {
      fetched = await db.medic.query('medic/contacts_by_depth', { key: [placeId], include_docs: true });
    } else {
      fetched = await db.medic.query('medic-client/contacts_by_type', { include_docs: true });
    }

    return fromEntries(fetched.rows.map(row => [row.id, row.doc]));
  },

  targetDocsAtInterval: async timestamp => {
    const interval = moment(timestamp).format('YYYY-MM');
    const result = await db.medic.allDocs({
      startkey: `target~${interval}~`,
      endkey: `target~${interval}~\ufff0`,
      include_docs: true,
    });

    return result.rows.map(row => row.doc);
  },
};

const getDhisTargetDefinitions = (dataSet, settingsDoc) => {
  const dhisTargets = settingsDoc.tasks &&
    settingsDoc.tasks.targets &&
    settingsDoc.tasks.targets.items &&
    settingsDoc.tasks.targets.items.filter(target =>
      target.dhis &&
      target.dhis.dataElement &&
      (!target.dhis.dataSet || target.dhis.dataSet === dataSet)
    ) || [];

  return dhisTargets;
};

/**
 * @param {Object} contacts A set of contacts stored as map from _id to contact document
 * @param {string} dataSet Dataset being exported
 * @returns {Object} The same contact id keys from @param contacts mapped to an array of orgUnits above them
 * in the hierarchy
 */
const mapContactIdToOrgUnits = (contacts, dataSet) => {
  const result = {};
  for (const contact of Object.values(contacts)) {
    let traverse = contact;
    while (traverse) {
      if (traverse.dhis) {
        const dhisConfigs = Array.isArray(traverse.dhis) ? traverse.dhis : [traverse.dhis];
        for (const dhisConfig of dhisConfigs) {
          const dataSetMatch = !dhisConfig.dataSet || dhisConfig.dataSet === dataSet;
          if (dhisConfig.orgUnit && dataSetMatch) {
            if (!result[contact._id]) {
              result[contact._id] = [];
            }

            result[contact._id].push(dhisConfig.orgUnit);
          }
        }
      }

      traverse = traverse.parent && contacts[traverse.parent._id];
    }
  }

  return result;
};

const buildDataValues = (targetDefinitions, targetDocs, orgUnits) => {
  const mapTargetIdToDhis = fromEntries(targetDefinitions.map(target => ([target.id, target.dhis])));
  const createEmptyValueSetFor = orgUnit => {
    const result = {};
    for (const target of targetDefinitions) {
      const { dataElement } = mapTargetIdToDhis[target.id];
      result[dataElement] = Object.assign(
        {},

        /*
        Copies any attribute defined in dhis config onto the dataValue
        Primary usecase is `categoryOptionCombo` and `attributeOptionCombo` but there are many others
        */
        mapTargetIdToDhis[target.id],
        { orgUnit, value: 0 },
      );
      delete result[dataElement].dataSet;
    }
    return result;
  };

  // all results start with 0s
  const dataValueSet = {};
  for (const contactOrgUnits of Object.values(orgUnits)) {
    for (const orgUnit of contactOrgUnits) {
      if (!dataValueSet[orgUnit]) {
        dataValueSet[orgUnit] = createEmptyValueSetFor(orgUnit);
      }
    }
  }

  // add relevant values onto the result
  for (const targetDoc of targetDocs) {
    const unitsOfOwner = orgUnits[targetDoc.owner];
    if (!unitsOfOwner) {
      continue;
    }

    for (const orgUnit of unitsOfOwner) {
      for (const target of targetDoc.targets) {
        const dataElement = mapTargetIdToDhis[target.id] && mapTargetIdToDhis[target.id].dataElement;
        if (dataElement) {
          const dataValueObj = dataValueSet[orgUnit][dataElement];
          if (dataValueObj) {
            dataValueObj.value += target.value.total;
          }
        }
      }
    }
  }

  return _.flatten(Object.values(dataValueSet).map(dataValueGroup => Object.values(dataValueGroup)));
};

const makeHumanReadable = (response, dataSetConfig, dhisTargetDefinitions, contacts) => {
  const { dataValues } = response;
  response.dataSet = dataSetConfig.label;

  const mapOrgUnitsToContact = {};
  for (const contact of contacts) {
    const dhisConfigs = Array.isArray(contact.dhis) ? contact.dhis : [contact.dhis];
    for (const dhisConfig of dhisConfigs) {
      mapOrgUnitsToContact[dhisConfig.orgUnit] = contact;
    }
  }

  const mapDataElementToTarget = fromEntries(dhisTargetDefinitions.map(target => ([target.dhis.dataElement, target])));

  for (const dataValue of dataValues) {
    dataValue.orgUnit = mapOrgUnitsToContact[dataValue.orgUnit].name;
    dataValue.dataElement = mapDataElementToTarget[dataValue.dataElement].id;
  }
};

// Object.fromEntries requires node 12
const fromEntries = entries => entries.reduce((agg, [index, val]) => {
  agg[index] = val;
  return agg;
}, {});
