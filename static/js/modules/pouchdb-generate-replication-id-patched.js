'use strict';

/**
 * This is a patch for pouchdb which ignores the doc_ids when generating
 * the replication id.
 * https://github.com/medic/medic-webapp/issues/2404
 */

var _ = require('underscore'),
    original = require('pouchdb-generate-replication-id-original');

module.exports = function(src, target, opts) {
  opts = _.clone(opts);
  delete opts.doc_ids;
  return original(src, target, opts);
};