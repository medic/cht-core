var safe_redirect = require('../safe-redirect'),
    _ = require('underscore'),

    APP_PREFIX = '/medic/_design/medic/_rewrite';

_.forEach([
    '',
    null,
    'http://example.com',
    '%22%3E%3Cscript%3Ealert%28%27hello%27%29%3C/script%3E',
    'https://app.medicmobile.org/wrong/path',
    'http://app.medicmobile.org/medic/_design/medic/_rewrite', // wrong protocol
], function(requested) {
  exports['Bad redirect ' + requested + ' should redirect as ' + APP_PREFIX] = function(test) {
    // when
    var actual = safe_redirect(APP_PREFIX, requested);

    // then
    test.same(actual, APP_PREFIX);

    test.done();
  };
});

_.forEach([
    '/medic/_design/medic/_rewrite',
    '/medic/_design/medic/_rewrite#fragment',
    '/medic/_design/medic/_rewrite#path/fragment',
    '/medic/_design/medic/_rewrite/long/path',
], function(requested) {
  exports['Good redirect ' + requested + ' should redirect unchanged'] = function(test) {
    // when
    var actual = safe_redirect(APP_PREFIX, requested);

    // then
    test.same(requested, actual);

    test.done();
  };
});
