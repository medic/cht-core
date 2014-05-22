var semver = require('semver');

/**
 * @typedef Migration
 * @type {object}
 * @property {string} version Must be a valid semver:
 *     http://semver.org/
 * @property {function} up Function to apply when migrating
 *     up to this version.
 * @property {function} down Function to apply when migrating 
 *     down from this version
 */

/**
 * @typedef Options
 * @type {object}
 * @property {string} [from] The version to migrate from.
 *      Must be a valid semver: http://semver.org/
 * @property {string} [to] The version to migrate to.
 *      Must be a valid semver: http://semver.org/
 */

/**
 * Migrate the given obj
 * 
 * @public
 * @param {object} obj The object to migrate
 * @param {Migration[]} migrations The migrations to apply
 *     if required
 * @param {Options} [options]
 */
exports.migrate = function(obj, migrations, options) {

  if (!obj || !migrations) {
    return { 
      error: false,
      result: obj 
    };
  }

  var from = options && options.from;
  var to = options && options.to;

  if (from && !semver.valid(from)) {
    return { error: 'Invalid from version provided' };
  }
  if (to && !semver.valid(to)) {
    return { error: 'Invalid to version provided' };
  }

  var up = !from || !to || semver.lte(from, to);

  var migrations = _sort(migrations);
  var output = {
    error: false,
    result: obj
  };
  migrations.forEach(function(_migration) {
    if (!output.error) {
      if (!_migration.version) {
        output.error = 'A migration is missing the required version property';
      } else if (!semver.valid(_migration.version)) {
        output.error = 'A migration has an invalid version property';
      } else {
        if (up && _migration.up && _apply(from, to, _migration)) {
          output = _migration.up(output.result);
        } else if (!up && _migration.down && _apply(to, from, _migration)) {
          output = _migration.down(output.result);
        }
      }
    }
  });
  return output;

};

var _sort = function(migrations) {
  return migrations.sort(function(_lhs, _rhs) {
    return semver.compare(_lhs.version, _rhs.version);
  });
};

var _apply = function(from, to, migration) {
  return (!from || semver.gt(migration.version, from))
      && (!to || semver.lte(migration.version, to));
};
