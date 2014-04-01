var lists = require('kujua-sms/lists'),
    moment = require('moment'),
    fakerequest = require('couch-fakerequest'),
    helpers = require('../../test-helpers/helpers');

var headers = '"Record UUID","Reported Date","Reported From","Clinic Contact Name","Clinic Name","Health Center Contact Name","Health Center Name","District Hospital Name","Message Type","Message State","Sent Timestamp","Pending Timestamp","Scheduled Timestamp","Cleared Timestamp","Muted Timestamp","Message UUID","Sent By","To Phone","Message Body"\n';

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

exports['requesting messages export handles no state_history'] = function(test) {
    test.expect(1);

    var reportedDate = 1331503842461;
    var taskTimestamp = 1331503843461;

    var expected = headers + '"abc123z","' + moment(reportedDate).format('DD, MMM YYYY, HH:mm:ss Z') + '","+12229990000","Paul","Clinic 1","Eric","Health Center 1","District 1","Test","Pending","","","","",""\n';

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


exports['requesting messages export succeeds if user is national administrator'] = function(test) {
    test.expect(1);

    var reportedDate = 1331503842461;
    var taskTimestamp = 1331503843461;
    var pendingTimestamp = 1331503844461;
    var scheduledTimestamp = 1331503845461;
    var sentTimestamp = 1331503846461;
    var clearedTimestamp = 1331503885461;
    var mutedTimestamp = 1331503895461;

    var expected = headers + '"abc123z","' + moment(reportedDate).format('DD, MMM YYYY, HH:mm:ss Z') + '","+12229990000","Paul","Clinic 1","Eric","Health Center 1","District 1","Test","Pending","' + moment(sentTimestamp).format('DD, MMM YYYY, HH:mm:ss Z') + '","' + moment(pendingTimestamp).format('DD, MMM YYYY, HH:mm:ss Z') + '","' + moment(scheduledTimestamp).format('DD, MMM YYYY, HH:mm:ss Z') + '","' + moment(clearedTimestamp).format('DD, MMM YYYY, HH:mm:ss Z') + '","' + moment(mutedTimestamp).format('DD, MMM YYYY, HH:mm:ss Z') + '"\n';

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
                timestamp: taskTimestamp,
                state_history: [
                    {
                        state: 'pending',
                        timestamp: '1'
                    },
                    {
                        state: 'pending',
                        timestamp: pendingTimestamp
                    },
                    {
                        state: 'scheduled',
                        timestamp: scheduledTimestamp
                    },
                    {
                        state: 'muted',
                        timestamp: mutedTimestamp
                    },
                    {
                        state: 'sent',
                        timestamp: sentTimestamp
                    },
                    {
                        state: 'cleared',
                        timestamp: clearedTimestamp
                    }
                ]
            }]
        }
    }]};

    var resp = fakerequest.list(lists.export_messages, viewdata, req);
    test.same(expected, resp.body);
    test.done();
}

exports['requesting messages export in xml'] = function(test) {
    test.expect(1);

    var reportedDate = 1331503842461;
    var taskTimestamp = 1331503843461;
    var pendingTimestamp = 1331503844461;
    var scheduledTimestamp = 1331503845461;
    var sentTimestamp = 1331503846461;
    var clearedTimestamp = 1331503885461;
    var mutedTimestamp = 1331503895461;

    var expected = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><Worksheet ss:Name="Messages"><Table>' + 
        '<Row><Cell><Data ss:Type="String">Record UUID</Data></Cell><Cell><Data ss:Type="String">Reported Date</Data></Cell><Cell><Data ss:Type="String">Reported From</Data></Cell><Cell><Data ss:Type="String">Clinic Contact Name</Data></Cell><Cell><Data ss:Type="String">Clinic Name</Data></Cell><Cell><Data ss:Type="String">Health Center Contact Name</Data></Cell><Cell><Data ss:Type="String">Health Center Name</Data></Cell><Cell><Data ss:Type="String">District Hospital Name</Data></Cell><Cell><Data ss:Type="String">Message Type</Data></Cell><Cell><Data ss:Type="String">Message State</Data></Cell><Cell><Data ss:Type="String">Sent Timestamp</Data></Cell><Cell><Data ss:Type="String">Pending Timestamp</Data></Cell><Cell><Data ss:Type="String">Scheduled Timestamp</Data></Cell><Cell><Data ss:Type="String">Cleared Timestamp</Data></Cell><Cell><Data ss:Type="String">Muted Timestamp</Data></Cell><Cell><Data ss:Type="String">Message UUID</Data></Cell><Cell><Data ss:Type="String">Sent By</Data></Cell><Cell><Data ss:Type="String">To Phone</Data></Cell><Cell><Data ss:Type="String">Message Body</Data></Cell></Row>' + 
        '<Row><Cell><Data ss:Type="String">abc123z</Data></Cell><Cell><Data ss:Type="String">' + moment(reportedDate).format('DD, MMM YYYY, HH:mm:ss Z') + '</Data></Cell><Cell><Data ss:Type="String">+12229990000</Data></Cell><Cell><Data ss:Type="String">Paul</Data></Cell><Cell><Data ss:Type="String">Clinic 1</Data></Cell><Cell><Data ss:Type="String">Eric</Data></Cell><Cell><Data ss:Type="String">Health Center 1</Data></Cell><Cell><Data ss:Type="String">District 1</Data></Cell><Cell><Data ss:Type="String">Test</Data></Cell><Cell><Data ss:Type="String">Pending</Data></Cell><Cell><Data ss:Type="String">' + moment(sentTimestamp).format('DD, MMM YYYY, HH:mm:ss Z') + '</Data></Cell><Cell><Data ss:Type="String">' + moment(pendingTimestamp).format('DD, MMM YYYY, HH:mm:ss Z') + '</Data></Cell><Cell><Data ss:Type="String">' + moment(scheduledTimestamp).format('DD, MMM YYYY, HH:mm:ss Z') + '</Data></Cell><Cell><Data ss:Type="String">' + moment(clearedTimestamp).format('DD, MMM YYYY, HH:mm:ss Z') + '</Data></Cell><Cell><Data ss:Type="String">' + moment(mutedTimestamp).format('DD, MMM YYYY, HH:mm:ss Z') + '</Data></Cell></Row></Table></Worksheet></Workbook>'

    var req = {
        query: {
            startkey: 'foo',
            endkey: 'bar',
            form: 'MSBC',
            format: 'xml'
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
                timestamp: taskTimestamp,
                state_history: [
                    {
                        state: 'pending',
                        timestamp: '1'
                    },
                    {
                        state: 'pending',
                        timestamp: pendingTimestamp
                    },
                    {
                        state: 'scheduled',
                        timestamp: scheduledTimestamp
                    },
                    {
                        state: 'muted',
                        timestamp: mutedTimestamp
                    },
                    {
                        state: 'sent',
                        timestamp: sentTimestamp
                    },
                    {
                        state: 'cleared',
                        timestamp: clearedTimestamp
                    }
                ]
            }]
        }
    }]};


    var resp = fakerequest.list(lists.export_messages, viewdata, req);
    test.same(expected, resp.body.replace(/\n/g, ''));
    test.done();
}
