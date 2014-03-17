var lists = require('kujua-sms/lists'),
    moment = require('moment'),
    fakerequest = require('couch-fakerequest'),
    helpers = require('../../test-helpers/helpers');

exports['requesting messages export fails if no user'] = function(test) {
    test.expect(2);
    var req = {
        query: {
            startkey: 'foo',
            endkey: 'bar',
            form: 'MSBC'
        },
        method: "GET"
    };

    var resp = fakerequest.list(lists.export_messages, {rows: []}, req);
    test.same(403, resp.code);
    test.same(undefined, resp.body);
    test.done();
}

exports['requesting messages export fails if user does not have perms'] = function(test) {
    test.expect(2);
    var req = {
        query: {
            startkey: 'foo',
            endkey: 'bar',
            form: 'MSBC'
        },
        method: "GET",
        userCtx: {
            roles: ['just_some_dude']
        }
    };

    var resp = fakerequest.list(lists.export_messages, {rows: []}, req);
    test.same(403, resp.code);
    test.same(undefined, resp.body);
    test.done();
}

exports['requesting messages export succeeds if user is national administrator'] = function(test) {
    test.expect(1);

    var reportedDate = 1331503842461;
    var taskTimestamp = 1331503843461;

    var expected = '"Record UUID","Reported Date","Reported From","Clinic Contact Name","Clinic Name","Health Center Contact Name","Health Center Name","District Hospital Name","Message Type","Message State","Message Timestamp/Due","Message UUID","Sent By","To Phone","Message Body"\n"abc123z","' + moment(reportedDate).format('DD, MMM YYYY, HH:mm:ss Z') + '","+12229990000","Paul","Clinic 1","Eric","Health Center 1","District 1","Test","Pending","' + moment(taskTimestamp).format('DD, MMM YYYY, HH:mm:ss Z') + '"\n';

    var req = {
        query: {
            startkey: 'foo',
            endkey: 'bar',
            form: 'MSBC'
        },
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
            _id: 'abc123z',
            reported_date: reportedDate,
            from: '+12229990000',
            form: "MSBC",
            related_entities: {
                clinic: {
                    name: "Clinic 1",
                    contact: { name:"Paul", phone: "" },
                    parent: {
                        name: "Health Center 1",
                        contact: { name: "Eric" },
                        parent: { name: "District 1" }
                    }
                }
            },
            tasks: [{
                type: 'Test',
                state: 'Pending',
                timestamp: taskTimestamp
            }]
        }
    }]};

    var resp = fakerequest.list(lists.export_messages, viewdata, req);
    test.same(expected, resp.body);
    test.done();
}
