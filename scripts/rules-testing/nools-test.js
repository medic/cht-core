var fs = require('fs');
var _ = require('underscore');
var assert = require('chai').assert;
var Nools = require('nools');
var nootils = require('../../static/js/modules/nootils');

// TODO i would expect this function to return the same for the key '*' as i would for an empty key (undefined, null, or '').  But this does not seem to be the case currently.
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
  function parseRules(rulesetFilePath, scheduleFilePath) {
    var rawSchedules = fs.readFileSync(scheduleFilePath, { encoding:'utf-8' });
    var schedules = JSON.parse('{' + rawSchedules + '}').schedules; // TODO work out why this file doesn't contain real JSON
    var settings = { tasks: { schedules: schedules } };
    var Utils = nootils(settings);

    var rawRules = fs.readFileSync(rulesetFilePath, { encoding:'utf-8' });
    var flow = Nools.compile(rawRules, { name:'test', scope:{ Utils:Utils } });
    var session = flow.getSession();

    session.expectEmits = function(key) {
      skip = 1;
      if(typeof key !== 'string') {
        skip = 0;
        key = null;
      }

      var expectedEmits = Array.prototype.slice.call(arguments, skip);
      var actualEmits = [];

      var keys = key ? key.split('.') : null;
      session.on('task', function() { // TODO we may not want to hard code this to listen for tasks here
        var args = Array.prototype.slice.call(arguments, 0);

        if(keys) actualEmits.push(traverse(keys, args[0]));
        else throw new Error('This is not currently handled correctly :-(  Please use \'*\' matcher.');
      });

      return session.match()
        .then(function() {
          assert.deepEqual(actualEmits, expectedEmits);
        });
    };

    return { flow:flow, session:session };
  }

  return {
    parseRules: parseRules,
  };
}());
