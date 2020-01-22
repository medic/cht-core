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

  const allTargetDocsAtInterval = await fetch.targetDocsAtInterval(from);
  const contactsUnderPlace = await fetch.contactsUnderPlace(placeId);
  const targetDocsInHierarchy = allTargetDocsAtInterval.filter(target => !placeId || contactsUnderPlace[target.owner]);
  const mapContactIdToOrgUnit = mapContactIdToOrgUnits(contactsUnderPlace, dataSet);

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
    let result;
    if (placeId) {
      result = await db.medic.query('medic/contacts_by_depth', { key: [placeId], include_docs: true });
    } else {
      result = await db.medic.query('medic-client/contacts_by_type', { include_docs: true });
    }

    return result.rows.reduce((agg, curr) => {
      agg[curr.id] = curr.doc;
      return agg;
    }, {});
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
const mapContactIdToOrgUnits = (contacts, dataSet) => (
  Object.values(contacts).reduce((agg, curr) => {
    let contact = curr;
    while (contact) {
      if (contact.dhis) {
        const dhisConfigs = Array.isArray(contact.dhis) ? contact.dhis : [contact.dhis];
        for (const dhisConfig of dhisConfigs) {
          const dataSetMatch = !dhisConfig.dataSet || dhisConfig.dataSet === dataSet;
          if (dhisConfig.orgUnit && dataSetMatch) {
            if (!agg[curr._id]) {
              agg[curr._id] = [];
            }

            agg[curr._id].push(dhisConfig.orgUnit);
          }
        }
      }

      contact = contact.parent && contacts[contact.parent._id];
    }

    return agg;
  }, {})
);

const buildDataValues = (targetDefinitions, targetDocs, orgUnits) => {
  const mapTargetIdToDataElement = targetDefinitions.reduce((agg, curr) => {
    agg[curr.id] = curr.dhis.dataElement;
    return agg;
  }, {});

  const dataValueSet = {};
  // all results start with 0s
  for (const contactId of Object.keys(orgUnits)) {
    for (const orgUnit of orgUnits[contactId]) {
      if (!dataValueSet[orgUnit]) {
        dataValueSet[orgUnit] = targetDefinitions.reduce((agg, target) => {
          const dataElement = mapTargetIdToDataElement[target.id];
          agg[dataElement] = { dataElement, orgUnit, value: 0 };
          return agg;
        }, {});
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
        const dataElement = mapTargetIdToDataElement[target.id];
        const dataValueObj = dataValueSet[orgUnit][dataElement];
        if (dataValueObj) {
          dataValueObj.value += target.value.total;
        }
      }
    }
  }

  return _.flatten(Object.values(dataValueSet).map(dataValueGroup => Object.values(dataValueGroup)));
};

const makeHumanReadable = (response, dataSetConfig, dhisTargetDefinitions, contacts) => {
  const { dataValues } = response;
  response.dataSet = dataSetConfig.label;

  const mapOrgUnitsToContact = contacts.reduce((agg, contact) => {
    const dhisConfigs = Array.isArray(contact.dhis) ? contact.dhis : [contact.dhis];
    for (const dhisConfig of dhisConfigs) {
      agg[dhisConfig.orgUnit] = contact;
    }
    return agg;
  }, {});
  const mapDataElementToTarget = dhisTargetDefinitions.reduce((agg, target) => {
    agg[target.dhis.dataElement] = target;
    return agg;
  }, {});

  for (const dataValue of dataValues) {
    dataValue.orgUnit = mapOrgUnitsToContact[dataValue.orgUnit].name;
    dataValue.dataElement = mapDataElementToTarget[dataValue.dataElement].id;
  }
};
