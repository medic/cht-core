var updates = require('kujua-sms/updates'),
    querystring = require('querystring'),
    helpers = require('../../test-helpers/helpers'),
    fakerequest = require('couch-fakerequest');

exports.assert_month_is_integer = function(test) {
    test.expect(1);
    var req = {
        headers: { "Host": window.location.host },
        form: {
            "from":"+888",
            "message": '1!TEST!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4'
        }
    };
    var doc = updates.add_sms(null, req)[0];
    test.same(11, doc.month);
    test.done();
};
