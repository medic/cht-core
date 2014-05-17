var updates = require('app-settings/updates');

exports['no ddoc found'] = function(test) {
  var result = updates.update_config(null, {});
  test.deepEqual(
    JSON.parse(result[1]), 
    { success: false, error: 'Design document not found' }
  );
  test.done();
};

exports['body not valid json'] = function(test) {
  var result = updates.update_config({ app_settings: {} }, 'malformed');
  test.deepEqual(
    JSON.parse(result[1]), 
    { success: false, error: 'Request body must be valid JSON' }
  );
  test.done();
};

exports['missing settings are added'] = function(test) {
  _exec(
    test,
    { one: "1" },
    { two: "2" },
    { one: "1", two: "2" }
  );
  test.done();
};

exports['existing settings are updated'] = function(test) {
  _exec(
    test,
    { one: "1" },
    { one: "2" },
    { one: "2" }
  );
  test.done();
};

exports['nested settings are merged'] = function(test) {
  _exec(
    test,
    { parent: { one: "a", two: "b" } },
    { parent: { one: "d", three: "c" } },
    { parent: { one: "d", two: "b", three: "c" } }
  );
  test.done();
};

exports['array settings are replaced'] = function(test) {
  _exec(
    test,
    { arrrray: ['p','i','r','a','t','e'] },
    { arrrray: ['n','i','n','j','a'] },
    { arrrray: ['n','i','n','j','a'] }
  );
  test.done();
};

var _exec = function(test, _existing, _updates, _expected) {
  var ddoc = { app_settings: _existing };
  var req = { body: JSON.stringify(_updates) };
  var result = updates.update_config(ddoc, req);
  var status = JSON.parse(result[1]);
  test.equals(status.success, true);
  test.deepEqual(result[0].app_settings, _expected);
};
