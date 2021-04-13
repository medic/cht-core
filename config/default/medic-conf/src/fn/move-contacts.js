const minimist = require('minimist');
const path = require('path');
const userPrompt = require('../lib/user-prompt');

const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const lineageManipulation = require('../lib/lineage-manipulation');
const lineageConstraints = require('../lib/lineage-constraints');
const pouch = require('../lib/db');
const { warn, trace, info, error } = require('../lib/log');

const HIERARCHY_ROOT = 'root';

module.exports = {
  requiresInstance: true,
  execute: () => {
    const args = parseExtraArgs(environment.pathToProject, environment.extraArgs);
    const db = pouch();
    prepareDocumentDirectory(args);
    return updateLineagesAndStage(args, db);
  }
};

const prettyPrintDocument = doc => `'${doc.name}' (${doc._id})`;
const updateLineagesAndStage = async (options, db) => {
  trace(`Fetching contact details for parent: ${options.parentId}`);
  const parentDoc = await fetch.contact(db, options.parentId);

  const constraints = await lineageConstraints(db, parentDoc);
  const contactDocs = await fetch.contactList(db, options.contactIds);
  await validateContacts(contactDocs, constraints);

  let affectedContactCount = 0, affectedReportCount = 0;
  const replacementLineage = lineageManipulation.createLineageFromDoc(parentDoc);
  for (let contactId of options.contactIds) {
    const contactDoc = contactDocs[contactId];
    const descendantsAndSelf = await fetch.descendantsOf(db, contactId);

    // Check that primary contact is not removed from areas where they are required
    const invalidPrimaryContactDoc = await constraints.getPrimaryContactViolations(contactDoc, descendantsAndSelf);
    if (invalidPrimaryContactDoc) {
      throw Error(`Cannot remove contact ${prettyPrintDocument(invalidPrimaryContactDoc)} from the hierarchy for which they are a primary contact.`);
    }

    trace(`Considering lineage updates to ${descendantsAndSelf.length} descendant(s) of contact ${prettyPrintDocument(contactDoc)}.`);
    const updatedDescendants = replaceLineageInContacts(descendantsAndSelf, replacementLineage, contactId);

    const ancestors = await fetch.ancestorsOf(db, contactDoc);
    trace(`Considering primary contact updates to ${ancestors.length} ancestor(s) of contact ${prettyPrintDocument(contactDoc)}.`);
    const updatedAncestors = replaceLineageInAncestors(descendantsAndSelf, ancestors);

    const reportsCreatedByDescendants = await fetch.reportsCreatedBy(db, descendantsAndSelf.map(descendant => descendant._id));
    trace(`${reportsCreatedByDescendants.length} report(s) created by these affected contact(s) will update`);
    const updatedReports = replaceLineageInReports(reportsCreatedByDescendants, replacementLineage, contactId);

    [...updatedDescendants, ...updatedReports, ...updatedAncestors].forEach(updatedDoc => {
      lineageManipulation.minifyLineagesInDoc(updatedDoc);
      writeDocumentToDisk(options, updatedDoc);
    });

    affectedContactCount += updatedDescendants.length + updatedAncestors.length;
    affectedReportCount += updatedReports.length;

    info(`Staged updates to ${prettyPrintDocument(contactDoc)}. ${updatedDescendants.length} contact(s) and ${updatedReports.length} report(s).`);
  }

  info(`Staged changes to lineage information for ${affectedContactCount} contact(s) and ${affectedReportCount} report(s).`);
};

/*
Checks for any errors which this will create in the hierarchy (hierarchy schema, circular hierarchies)
Confirms the list of contacts are possible to move
*/
const validateContacts = async (contactDocs, constraints) => {
  Object.values(contactDocs).forEach(doc => {
    const hierarchyError = constraints.getHierarchyErrors(doc);
    if (hierarchyError) {
      throw Error(`Hierarchy Constraints: ${hierarchyError}`);
    }
  });

  /*
  It is nice that the tool can move lists of contacts as one operation, but strange things happen when two contactIds are in the same lineage.
  For example, moving a district_hospital and moving a contact under that district_hospital to a new clinic causes multiple colliding writes to the same json file.
  */
  const contactIds = Object.keys(contactDocs);
  Object.values(contactDocs)
    .forEach(doc => {
      const parentIdsOfDoc = (doc.parent && lineageManipulation.pluckIdsFromLineage(doc.parent)) || [];
      const violatingParentId = parentIdsOfDoc.find(parentId => contactIds.includes(parentId));
      if (violatingParentId) {
        throw Error(`Unable to move two documents from the same lineage: '${doc._id}' and '${violatingParentId}'`);
      }
    });
};

// Parses extraArgs and asserts if required parameters are not present
const parseExtraArgs = (projectDir, extraArgs = []) => {
  const args = minimist(extraArgs, { boolean: true });

  const contactIds = (args.contacts || args.contact || '')
    .split(',')
    .filter(id => id);

  if (contactIds.length === 0) {
    usage();
    throw Error('Action "move-contacts" is missing required list of contact_id to be moved');
  }

  if (!args.parent) {
    usage();
    throw Error('Action "move-contacts" is missing required parameter parent');
  }

  return {
    parentId: args.parent,
    contactIds,
    docDirectoryPath: path.resolve(projectDir, args.docDirectoryPath || 'json_docs'),
    force: !!args.force,
  };
};

const prepareDocumentDirectory = ({ docDirectoryPath, force }) => {
  if (!fs.exists(docDirectoryPath)) {
    fs.mkdir(docDirectoryPath);
  } else if (!force && fs.recurseFiles(docDirectoryPath).length > 0) {
    warn(`The document folder '${docDirectoryPath}' already contains files. It is recommended you start with a clean folder. Do you want to delete the contents of this folder and continue?`);
    if(userPrompt.keyInYN()) {
      fs.deleteFilesInFolder(docDirectoryPath);
    } else {
      error('User failed to confirm action.');
      process.exit(-1);
    }
  }
};

const usage = () => {
  const bold = text => `\x1b[1m${text}\x1b[0m`;
  info(`
${bold('medic-conf\'s move-contacts action')}
When combined with 'upload-docs' this action effectively moves a contact from one place in the hierarchy to another.

${bold('USAGE')}
medic-conf --local move-contacts -- --contactIds=<id1>,<id2> --parent=<parent_id>

${bold('OPTIONS')}
--contacts=<id1>,<id2>
  A comma delimited list of ids of contacts to be moved.

--parent=<parent_id>
  Specifies the ID of the new parent. Use '${HIERARCHY_ROOT}' to identify the top of the hierarchy (no parent).

--docDirectoryPath=<path to stage docs>
  Specifies the folder used to store the documents representing the changes in hierarchy.
`);
};

const writeDocumentToDisk = ({ docDirectoryPath }, doc) => {
  const destinationPath = path.join(docDirectoryPath, `${doc._id}.doc.json`);
  if (fs.exists(destinationPath)) {
    warn(`File at ${destinationPath} already exists and is being overwritten.`);
  }

  trace(`Writing updated document to ${destinationPath}`);
  fs.writeJson(destinationPath, doc);
};

const fetch = {
  /*
  Fetches all of the documents associated with the "contactIds" and confirms they exist.
  */
  contactList: async (db, ids) => {
    const contactDocs = await db.allDocs({
      keys: ids,
      include_docs: true,
    });

    const missingContactErrors = contactDocs.rows.filter(row => !row.doc).map(row => `Contact with id '${row.key}' could not be found.`);
    if (missingContactErrors.length > 0) {
      throw Error(missingContactErrors);
    }

    return contactDocs.rows.reduce((agg, curr) => Object.assign(agg, { [curr.doc._id]: curr.doc }), {});
  },

  contact: async (db, id) => {
    try {
      if (id === HIERARCHY_ROOT) {
        return undefined;
      }

      return await db.get(id);
    } catch (err) {
      if (err.name !== 'not_found') {
        throw err;
      }

      throw Error(`Contact with id '${id}' could not be found`);
    }
  },

  /*
  Given a contact's id, obtain the documents of all descendant contacts
  */
  descendantsOf: async (db, contactId) => {
    const descendantDocs = await db.query('medic/contacts_by_depth', {
      key: [contactId],
      include_docs: true,
    });

    return descendantDocs.rows
      .map(row => row.doc)
      /* We should not move or update tombstone documents */
      .filter(doc => doc && doc.type !== 'tombstone');
  },

  reportsCreatedBy: async (db, contactIds) => {
    const reports = await db.query('medic-client/reports_by_freetext', {
      keys: contactIds.map(id => [`contact:${id}`]),
      include_docs: true,
    });

    return reports.rows.map(row => row.doc);
  },

  ancestorsOf: async (db, contactDoc) => {
    const ancestorIds = lineageManipulation.pluckIdsFromLineage(contactDoc.parent);
    const ancestors = await db.allDocs({
      keys: ancestorIds,
      include_docs: true,
    });

    const ancestorIdsNotFound = ancestors.rows.filter(ancestor => !ancestor.doc).map(ancestor => ancestor.key);
    if (ancestorIdsNotFound.length > 0) {
      throw Error(`Contact '${prettyPrintDocument(contactDoc)} has parent id(s) '${ancestorIdsNotFound.join(',')}' which could not be found.`);
    }

    return ancestors.rows.map(ancestor => ancestor.doc);
  },
};

const replaceLineageInReports = (reportsCreatedByDescendants, replaceWith, startingFromIdInLineage) => reportsCreatedByDescendants.reduce((agg, doc) => {
  if (lineageManipulation.replaceLineage(doc, 'contact', replaceWith, startingFromIdInLineage)) {
    agg.push(doc);
  }
  return agg;
}, []);

const replaceLineageInContacts = (descendantsAndSelf, replacementLineage, contactId) => descendantsAndSelf.reduce((agg, doc) => {
  const startingFromIdInLineage = doc._id === contactId ? undefined : contactId;
  const parentWasUpdated = lineageManipulation.replaceLineage(doc, 'parent', replacementLineage, startingFromIdInLineage);
  const contactWasUpdated = lineageManipulation.replaceLineage(doc, 'contact', replacementLineage, contactId);
  if (parentWasUpdated || contactWasUpdated) {
    agg.push(doc);
  }
  return agg;
}, []);

const replaceLineageInAncestors = (descendantsAndSelf, ancestors) => ancestors.reduce((agg, ancestor) => {
  let result = agg;
  const primaryContact = descendantsAndSelf.find(descendant => ancestor.contact && descendant._id === ancestor.contact._id);
  if (primaryContact) {
    ancestor.contact = lineageManipulation.createLineageFromDoc(primaryContact);
    result = [ancestor, ...result];
  }

  return result;
}, []);
