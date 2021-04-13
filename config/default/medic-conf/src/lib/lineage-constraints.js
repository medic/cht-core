const log = require('./log');
const { trace } = log;

const { pluckIdsFromLineage } = require('./lineage-manipulation');

const lineageConstraints = async (repository, parentDoc) => {
  let mapTypeToAllowedParents;
  try {
    const { settings } = await repository.get('settings');
    const { contact_types } = settings;

    if (Array.isArray(contact_types)) {
      trace('Found app_settings.contact_types. Configurable hierarchy constraints will be enforced.');
      mapTypeToAllowedParents = contact_types
        .filter(rule => rule)
        .reduce((agg, curr) => Object.assign(agg, { [curr.id]: curr.parents }), {});
    }
  } catch (err) {
    if (err.name !== 'not_found') {
      throw err;
    }
  }

  if (!mapTypeToAllowedParents) {
    trace('Default hierarchy constraints will be enforced.');
    mapTypeToAllowedParents = {
      district_hospital: [],
      health_center: ['district_hospital'],
      clinic: ['health_center'],
      person: ['district_hospital', 'health_center', 'clinic'],
    };
  }

  return {
    getHierarchyErrors: contactDoc => getHierarchyViolations(mapTypeToAllowedParents, contactDoc, parentDoc),
    getPrimaryContactViolations: (contactDoc, descendantDocs) => getPrimaryContactViolations(repository, contactDoc, parentDoc, descendantDocs),
  };
};

/*
Enforce the whitelist of allowed parents for each contact type
Ensure we are not creating a circular hierarchy
*/
const getHierarchyViolations = (mapTypeToAllowedParents, contactDoc, parentDoc) => {
  const getContactType = doc => doc && (doc.type === 'contact' ? doc.contact_type : doc.type);
  const contactType = getContactType(contactDoc);
  const parentType = getContactType(parentDoc);
  if (!contactType) return 'contact required attribute "type" is undefined';
  if (parentDoc && !parentType) return `parent contact "${parentDoc._id}" required attribute "type" is undefined`;
  if (!mapTypeToAllowedParents) return 'hierarchy constraints are undefined';

  const rulesForContact = mapTypeToAllowedParents[contactType];
  if (!rulesForContact) return `cannot move contact with unknown type '${contactType}'`;

  const isPermittedMoveToRoot = !parentDoc && rulesForContact.length === 0;
  if (!isPermittedMoveToRoot && !rulesForContact.includes(parentType)) return `contacts of type '${contactType}' cannot have parent of type '${parentType}'`;

  if (parentDoc && contactDoc._id) {
    const parentAncestry = [parentDoc._id, ...pluckIdsFromLineage(parentDoc.parent)];
    if (parentAncestry.includes(contactDoc._id)) {
      return `Circular hierarchy: Cannot set parent of contact '${contactDoc._id}' as it would create a circular hierarchy.`;
    }
  }
};

/*
A place's primary contact must be a descendant of that place.

1. Check to see which part of the contact's lineage will be removed
2. For each removed part of the contact's lineage, confirm that place's primary contact isn't being removed.
*/
const getPrimaryContactViolations = async (repository, contactDoc, parentDoc, descendantDocs) => {
  const safeGetLineageFromDoc = doc => doc ? pluckIdsFromLineage(doc.parent) : [];
  const contactsLineageIds = safeGetLineageFromDoc(contactDoc);
  const parentsLineageIds = safeGetLineageFromDoc(parentDoc);

  if (parentDoc) {
    parentsLineageIds.push(parentDoc._id);
  }

  const docIdsRemovedFromContactLineage = contactsLineageIds.filter(value => !parentsLineageIds.includes(value));
  const docsRemovedFromContactLineage = await repository.allDocs({
    keys: docIdsRemovedFromContactLineage,
    include_docs: true,
  });

  const primaryContactIds = docsRemovedFromContactLineage.rows
    .map(row => row.doc && row.doc.contact && row.doc.contact._id)
    .filter(id => id);
  
  return descendantDocs.find(descendant => primaryContactIds.some(primaryId => descendant._id === primaryId));
};

module.exports = lineageConstraints;
