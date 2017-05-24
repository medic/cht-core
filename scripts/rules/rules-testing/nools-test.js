var fs = require('fs');
var _ = require('underscore');
var assert = require('chai').assert;
var Nools = require('nools');
var nootils = require('../../../static/js/modules/nootils');

function traverse(keys, element) {
  var keys = keys.slice(0);
  var key = keys.shift();
  if(!key || typeof element === 'undefined') return element;
  if(key === '*') {
    return _.map(element, function(e) { return traverse(keys, e); });
  }
  return traverse(keys, element[key]);
}

NoolsTest = module.exports = (function() {
  function parseRules(rulesetFilePath, scheduleFilePath, additionalScope) {
    var rawSchedules = fs.readFileSync(scheduleFilePath, { encoding:'utf-8' });
    var schedules = JSON.parse('{' + rawSchedules + '}').schedules;
    var settings = { tasks: { schedules: schedules } };
    var Utils = nootils(settings);
    var scope = Object.assign({}, additionalScope, { Utils:Utils });

    var rawRules = fs.readFileSync(rulesetFilePath, { encoding:'utf-8' });
    var flow = Nools.compile(rawRules, { name:'test', scope:scope });
    var session = flow.getSession();

    session.expectEmits = (key, ...expectedEmits) => {
      if(typeof key !== 'string') {
        expectedEmits.unshift(key);
        key = '*';
      }
      if(key === '*') expectedEmits = expectedEmits[0];

      var actualEmits = [];

      var keys = key ? key.split('.') : null;
      session.on('task', (task) => actualEmits.push(traverse(keys, task)));

      return session.match()
        .then(() => assert.deepEqual(actualEmits, expectedEmits));
    };

    return { flow:flow, session:session, utils:Utils };
  }

  return {
    parseRules: parseRules,
  };
}());
