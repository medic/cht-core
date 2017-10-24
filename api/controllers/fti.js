var nodeUtils = require('util'),
    queryGenerator = require('lucene-query-generator'),
    config = require('../config'),
    utils = require('./utils'),
    dateRegex = /_date$/;

var addDistrict = function(district, query, allocatedOnly) {
  if (district) {
    if (!allocatedOnly && config.get('district_admins_access_unallocated_messages')) {
      district = [ district, 'none' ];
    }
    return {
      $operands: [
        { district: district },
        query
      ]
    };
  }
  return query;
};

var getType = function(key, value) {
  if (dateRegex.test(key)) {
    return 'date';
  }
  if (typeof value === 'number') {
    return 'int';
  }
};

var extractKeys = function(operand, schema) {
  if (typeof operand === 'object') {
    Object.keys(operand).forEach(function(key) {
      var value = operand[key];
      if (nodeUtils.isArray(value)) {
        value = operand[key][0];
      }
      var type = getType(key, value);
      if (type) {
        schema[key] = type;
      }
    });
  }
};

// because our index is dynamically generated from the form fields
// we have to dynamically generate the schema using similar logic
var buildSchema = function(operands, schema) {
  if (nodeUtils.isArray(operands)) {
    operands.forEach(function(operand) {
      if (operand.$operands) {
        buildSchema(operand.$operands, schema);
      } else {
        extractKeys(operand, schema);
      }
    });
  } else {
    extractKeys(operands, schema);
  }
};

module.exports = {
  get: function(index, options, district, callback) {
    var query,
        schema;
    if (options.q) {
      try {
        query = JSON.parse(options.q);
        if (options.schema) {
          schema = JSON.parse(options.schema);
        }
      } catch(e) {
        return callback({ code: 503, message: e });
      }
      if (!schema) {
        schema = {};
        buildSchema(query.$operands, schema);
      }
      query = addDistrict(district, query, options.allocatedOnly);
      options.q = queryGenerator.convert(query, { schema: schema });
    }
    utils.fti(index, options, function(err, result) {
      if (err) {
        return callback({ code: 503, message: err });
      }
      callback(null, result);
    });
  }
};
