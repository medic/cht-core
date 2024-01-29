const _ = require('lodash');
const moment = require('moment');

const db = require('../../db');
const config = require('../../config');
const logger = require('../../logger');

/**
 * @param {string} filters.dataSet
 * @param {integer} filters.date.from
 * @param {string=} filters.orgUnit
 *
 * @param options.humanReadable
 */
module.exports = async (filters, options = {}) => {
  const { dataSet, orgUnit } = filters;
  const { from } = filters.date || {};
  if (!dataSet) {
    throw err('filter "dataSet" is required');
  }

  if (!from) {
    throw err('filter "from" is required');
  }

  const settings = config.get();
  const dataSetConfig = Array.isArray(settings.dhis_data_sets) &&
    settings.dhis_data_sets.find(dhisDataSet => dhisDataSet.id === dataSet);
  if (!dataSetConfig) {
    throw err(`dataSet "${dataSet}" is not defined`);
  }

  const dhisTargetDefinitions = getDhisTargetDefinitions(dataSet, settings);
  if (dhisTargetDefinitions.length === 0) {
    throw err(`dataSet "${dataSet}" has no dataElements`);
  }

  const targetDocsInMonth = await fetch.targetDocsInMonth(from);
  const contactsWithOrgUnits = await fetch.contactsWithOrgUnits(orgUnit);
  const targetOwnerIds = _.uniq(targetDocsInMonth.map(target => target.owner));
  const targetOwners = await fetch.docsWithId(targetOwnerIds);
  const mapContactIdToOrgUnit = mapContactIdToOrgUnits(dataSet, targetOwners, contactsWithOrgUnits);
  const targetDocsInHierarchy = targetDocsInMonth.filter(target => !orgUnit || mapContactIdToOrgUnit[target.owner]);

  const result = {
    dataSet,
    completeDate: moment().format('YYYY-MM-DD'),
    period: moment(from).format('YYYYMM'),
    dataValues: buildDataValues(dhisTargetDefinitions, targetDocsInHierarchy, mapContactIdToOrgUnit),
  };

  if (options.humanReadable) {
    makeHumanReadable(
      result,
      dataSetConfig,
      Object.values(dhisTargetDefinitions),
      Object.values(contactsWithOrgUnits)
    );
  }

  return result;
};

const err = message => {
  logger.error(message);
  return { code: 400, message };
};

const fetch = {
  docsWithId: async ids => {
    const fetched = await db.medic.allDocs({ keys: ids, include_docs: true });
    return fetched.rows.map(row => row.doc);
  },

  contactsWithOrgUnits: async orgUnit => {
    const fetched = await db.medic.query('medic-admin/contacts_by_dhis_orgunit', { key: orgUnit, include_docs: true });
    return _.uniqBy(fetched.rows.map(row => row.doc), '_id');
  },

  targetDocsInMonth: async timestamp => {
    const interval = moment(timestamp).format('YYYY-MM');
    const result = await db.medic.allDocs({
      startkey: `target~${interval}~`,
      endkey: `target~${interval}~\ufff0`,
      include_docs: true,
    });

    return result.rows.map(row => row.doc);
  },
};

const getDhisTargetDefinitions = (dataSet, settings) => {
  const dhisTargets = settings?.tasks?.targets?.items?.filter(target => {
    return target.dhis?.dataElement && (!target.dhis?.dataSet || target.dhis?.dataSet === dataSet);
  });

  return dhisTargets || [];
};

/**
 * @param {string} dataSet The dataset being exported. It acts as a filter for relevant orgUnits
 * @param {Object[]} contacts The set of contact documents relevant to the calculation
 * @returns {Object} The @param contacts _id values mapped to an array of orgUnits above them in the hierarchy
 */
const mapContactIdToOrgUnits = (dataSet, contacts, contactsWithOrgUnits) => {
  const result = {};
  for (const contact of contactsWithOrgUnits) {
    const dhisConfigs = Array.isArray(contact.dhis) ? contact.dhis : [contact.dhis];
    for (const dhisConfig of dhisConfigs) {
      const dataSetMatch = !dhisConfig.dataSet || dhisConfig.dataSet === dataSet; // optional
      if (dhisConfig.orgUnit && dataSetMatch) {
        if (!result[contact._id]) {
          result[contact._id] = [];
        }

        result[contact._id].push(dhisConfig.orgUnit);
      }
    }
  }

  for (const contact of contacts) {
    let traverse = contact;
    while (traverse) {
      if (result[traverse._id]) {
        const existing = result[contact._id] || [];
        result[contact._id] = _.uniq([...existing, ...result[traverse._id]]);
      }

      traverse = traverse.parent;
    }
  }

  return result;
};

const buildDataValues = (targetDefinitions, targetDocs, orgUnits) => {
  const mapTargetIdToDhis = ObjectFromEntries(targetDefinitions.map(target => ([target.id, target.dhis])));
  const createEmptyValueSetFor = orgUnit => {
    const result = {};
    for (const target of targetDefinitions) {
      const { dataElement } = target.dhis;
      result[dataElement] = Object.assign(
        {},

        /*
        Copies any attribute defined in dhis config onto the dataValue
        Primary usecase is `categoryOptionCombo` and `attributeOptionCombo` but there are many others
        */
        target.dhis,
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
    const orgUnitsOfOwner = orgUnits[targetDoc.owner];
    if (!orgUnitsOfOwner) {
      continue;
    }

    for (const target of targetDoc.targets) {
      const dataElement = mapTargetIdToDhis[target.id] && mapTargetIdToDhis[target.id].dataElement;
      if (dataElement) {
        for (const orgUnit of orgUnitsOfOwner) {
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

/**
 * Adjusts the data in @param dhisResult to replace hashes with human readable descriptions.
 * The dataSet hash, orgUnit hashes, and dataElement hashes are updated.
 */
const makeHumanReadable = (dhisResult, dataSetConfig, dhisTargetDefinitions, contacts) => {
  const { dataValues } = dhisResult;
  dhisResult.dataSet = config.translate(dataSetConfig.translation_key);

  const mapOrgUnitsToContact = {};
  for (const contact of contacts) {
    const dhisConfigs = Array.isArray(contact.dhis) ? contact.dhis : [contact.dhis];
    for (const dhisConfig of dhisConfigs) {
      mapOrgUnitsToContact[dhisConfig.orgUnit] = contact;
    }
  }

  const entries = dhisTargetDefinitions.map(target => ([target.dhis.dataElement, target]));
  const mapDataElementToTarget = ObjectFromEntries(entries);

  for (const dataValue of dataValues) {
    dataValue.orgUnit = mapOrgUnitsToContact[dataValue.orgUnit].name;
    dataValue.dataElement = mapDataElementToTarget[dataValue.dataElement].id;
  }
};

// Object.fromEntries requires node 12
const ObjectFromEntries = entries => entries.reduce((agg, [index, val]) => {
  agg[index] = val;
  return agg;
}, {});
