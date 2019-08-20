/**
 * @module lineage
 */

const { minify, minifyLineage } = require('./minification');
const { fetchLineageByIds } = require('./lineage');
const { fetchHydratedDoc, hydrateDocs } = require('./hydration');

module.exports = function(Promise, DB) {
  return {
    /**
     * Remove all hydrated items and leave just the ids
     * @param {Object} doc The doc to minify
     */
    minify,
    minifyLineage,

    /**
     * Fetches the lineages for a collection of document ids
     * @param {String[]} ids The ids of a document to fetch
     * @returns {Object[][]} An array of lineages. Lineages are represented by the order set: [doc, parent1, parent2, ...]
     */
    fetchLineageByIds: ids => fetchLineageByIds(DB, ids),

    /**
     * Given a doc id get a doc and all parents, contact (and parents) and
     * patient (and parents)
     * @param {String} id The id of the doc
     * @returns {Promise} A promise to return the hydrated doc.
     */
    fetchHydratedDoc: id => fetchHydratedDoc(DB, id),

    /**
     * Given an array of minified docs bind the parents, contacts (and parents) and
     * patient (and parents)
     * @param {Object[]} docs The array of docs to hydrate
     * @returns {Promise} A promise to return the fetched hydrated docs.
     */
    hydrateDocs: docs => hydrateDocs(DB, docs),
  };
};
