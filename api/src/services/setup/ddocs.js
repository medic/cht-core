const DDOC_PREFIX = '_design/';
const STAGED_DDOC_PREFIX = `${DDOC_PREFIX}:staged:`;

/**
 * @typedef {Object} DesignDocument
 * @property {string} _id
 * @property {string} _rev
 * @property {string} version
 * @property {Object} views
 */

const isStaged = ddocId => ddocId.startsWith(STAGED_DDOC_PREFIX);
const getName = ddocId => ddocId.replace(STAGED_DDOC_PREFIX, '').replace(DDOC_PREFIX, '');
const getId = ddocName => `${DDOC_PREFIX}${ddocName}`;
const stageId = ddocId => ddocId.replace(DDOC_PREFIX, STAGED_DDOC_PREFIX);
const unstageId = ddocId => ddocId.replace(STAGED_DDOC_PREFIX, DDOC_PREFIX);

/**
 * @param {Database} database
 * @return {Promise<Array<DesignDocument>>}
 */
const getStagedDdocs = async (database) => {
  const result = await database.db.allDocs({
    startkey: STAGED_DDOC_PREFIX,
    endkey: `${STAGED_DDOC_PREFIX}\ufff0`,
    include_docs: true,
  });
  return result.rows.map(row => row.doc);
};

/**
 * @param {Database} database
 * @return {Promise<Array<DesignDocument>>}
 */
const getDdocs = async (database) => {
  const opts = { startkey: DDOC_PREFIX, endkey: `${DDOC_PREFIX}\ufff0`, include_docs: true };
  const result = await database.db.allDocs(opts);
  return result.rows.map(row => row.doc);
};

/**
 * Compares a list of bundled ddocs with a list of uploaded ddocs.
 * Returns a list of missing ddocs ids and a list of different ddocs ids.
 * A ddoc is missing if it is bundled and not uploaded.
 * A ddoc is different the version of the bundled ddoc is different from the version of the uploaded ddoc.
 * @param {Array<{ _id, version: string }>} bundled Array of bundled ddocs
 * @param {Array<{ _id, version: string }>} uploaded Array of uploaded ddocs
 * @return {{missing: Array<string>, different: Array<string>}}
 */
const compareDdocs = (bundled, uploaded) => {
  const missing = [];
  const different = [];

  const findCorrespondingDdoc = (ddocA, ddocsB) => {
    const ddocAName = getName(ddocA._id);
    return ddocsB.find(ddocB => getName(ddocB._id) === ddocAName);
  };

  bundled.forEach(bundledDdoc => {
    const uploadedDdoc = findCorrespondingDdoc(bundledDdoc, uploaded);
    if (!uploadedDdoc) {
      missing.push(bundledDdoc._id);
      return;
    }

    if (bundledDdoc.version !== uploadedDdoc.version) {
      different.push(bundledDdoc._id);
    }
  });

  return { missing, different };
};

module.exports = {
  isStaged,
  getName,
  getId,
  stageId,
  unstageId,
  compareDdocs,

  getStagedDdocs,
  getDdocs,
};
