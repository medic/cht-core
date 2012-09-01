var updates = require('kujua-sms/updates'),
    querystring = require('querystring'),
    helpers = require('../../test-helpers/helpers'),
    fakerequest = require('couch-fakerequest');

exports.assert_month_is_integer = function(test) {
    test.expect(1);

    // Data parsed from a http POST
    var parsed_form = {
        message: '1!TEST!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4',
    };

    // request object
    var req = {
        headers: { Host: window.location.host },
        body: querystring.stringify(parsed_form),
        form: parsed_form
    };

    var resp = fakerequest.update(updates.add_sms, parsed_form, req),
        resp_body = JSON.parse(resp[1].body);

    test.same(11, resp_body.callback.data.month);
    test.done();
};
