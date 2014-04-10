var lists = require('kujua-sms/lists'),
    moment = require('moment'),
    fakerequest = require('couch-fakerequest'),
    helpers = require('../../test-helpers/helpers');

exports['requesting audit export fails if no user'] = function(test) {
    test.expect(2);
    var req = {
        query: {},
        method: "GET"
    };

    var resp = fakerequest.list(lists.export_audit, {rows: []}, req);
    test.same(403, resp.code);
    test.same(undefined, resp.body);
    test.done();
}

exports['requesting audit export fails if user does not have perms'] = function(test) {
    test.expect(2);
    var req = {
        query: {},
        method: "GET",
        userCtx: {
            roles: ['just_some_dude']
        }
    };

    var resp = fakerequest.list(lists.export_audit, {rows: []}, req);
    test.same(403, resp.code);
    test.same(undefined, resp.body);
    test.done();
}

exports['requesting audit export succeeds if user is national administrator'] = function(test) {
    test.expect(1);

    var createdTimestamp = 1331503842461;
    var updatedTimestamp = 1331503843461;

    var expected = '"Record UUID","Type","Timestamp","Author","Action","Document"\n' + 
        '"abc123z","","' + moment(createdTimestamp).format('DD, MMM YYYY, HH:mm:ss Z') + '","james","create","{""foo"":""bar""}"\n' + 
        '"abc123z","","' + moment(updatedTimestamp).format('DD, MMM YYYY, HH:mm:ss Z') + '","jack","update","{""foo"":""baz""}"\n';

    var req = {
        query: {},
        method: "GET",
        userCtx: {
            roles: ['national_admin']
        }
    };

    // mockup the view data
    var viewdata = {rows: [{
        "key": [ true, "MSBC", 1331503842461 ],
        "value": 1,
        "doc": {
            record_id: 'abc123z',
            type: 'data_record',
            history: [
                {
                    timestamp: createdTimestamp,
                    user: 'james',
                    action: 'create',
                    doc: {foo: 'bar'}
                },
                {
                    timestamp: updatedTimestamp,
                    user: 'jack',
                    action: 'update',
                    doc: {foo: 'baz'}
                }
            ]
        }
    }]};

    var resp = fakerequest.list(lists.export_audit, viewdata, req);
    test.same(expected, resp.body);
    test.done();
}
