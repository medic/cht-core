var proxyquire = require('proxyquire').noCallThru(),
    fakerequest = require('../../couch-fakerequest'),
    baseURL = 'BASEURL';

var info = proxyquire('../../../../packages/kujua-sms/views/lib/appinfo', {
    'cookies': {},
    'duality/utils': { getBaseURL: function() { return 'BASEURL'; } },
    'underscore': require('underscore')
});
var kujua_utils = proxyquire('../../../../packages/kujua-utils/kujua-utils', {
    'cookies': {}
});
var kujua_sms_utils = proxyquire('../../../../packages/kujua-sms/kujua-sms/utils', {
    'kujua-utils': kujua_utils,
    'views/lib/objectpath': {}
});
var lists = proxyquire('../../../../packages/kujua-sms/kujua-sms/lists', {
    'kujua-utils': kujua_utils,
    './utils': kujua_sms_utils,
    'views/lib/appinfo': info,
    'duality/core': { getDBURL: function() { return 'BASEURL/_db'; } }
});


var host = function() {
    return 'localhost';
};

var port = function() {
    return '5988';
};

exports.tasks_pending_callback = function(test) {
    test.expect(3);
    var req = {
        headers: { Host: 'localhost:5988' }
    };

    var tasks = [{
      state: 'pending',
      messages: [
        {
          to: '+123',
          message: 'Bam'
        }
      ]
    }];

    var viewdata = {
        rows: [
            {
                doc: { _id: '0b5586', tasks: tasks }
            }
        ]
    };

    var expResp = {};
    expResp.callback = {
        options:{
            host: host(),
            port: port(),
            path: baseURL + '/_db/_bulk_docs',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        },
        data:{
            docs: [{
                _id: '0b5586',
                tasks:[{
                    state: 'sent',
                    state_history: [
                        {
                            state: 'sent'
                        }
                    ],
                    messages: [
                        {
                            to: '+123',
                            message: 'Bam'
                        }
                    ]
                }]
            }]
        }
    };

    var resp = fakerequest.list(lists.tasks_pending, viewdata, req);
    var resp_body = JSON.parse(resp.body);

    // remove timestamp for this test
    delete resp_body.callback.data.docs[0].tasks[0].timestamp;
    delete resp_body.callback.data.docs[0].tasks[0].state_history[0].timestamp;

    test.same(expResp.callback.data, resp_body.callback.data);
    test.same(expResp.callback.options, resp_body.callback.options);
    test.same(expResp.callback, resp_body.callback);
    test.done();
};

exports.tasks_pending_payload = function(test) {

    test.expect(1);
    var req = {
        headers: { Host: 'localhost:5988' }
    };

    var expResp = {};

    expResp.payload = {
        success: true,
        task: 'send',
        secret: '',
        messages: [
            {
                to: '+333',
                message: 'Bar'
            }
        ]
    };

    var tasks = [
        {
          state: 'pending',
          messages: [
            {
              to: '+333',
              message: 'Bar'
            }
          ]
        }
    ];

    var viewdata = {
        rows: [{
            doc: { _id: '0b5586', tasks: tasks }
        }]
    };

    var resp = fakerequest.list(lists.tasks_pending, viewdata, req);
    var resp_body = JSON.parse(resp.body);

    test.same(expResp.payload, resp_body.payload);
    test.done();
};

exports['do not process scheduled messages on docs with errors'] = function(test) {
    test.expect(1);

    var req = {
        headers: { Host: 'localhost:5988' }
    };

    var expResp = {};

    expResp.payload = {
        success: true,
        task: 'send',
        secret: '',
        messages: [
            {
                to: '+123',
                message: 'foo'
            },
            {
                to: '+456',
                message: 'try again'
            }
        ]
    };

    var row1 = {
        doc: {
            _id: '0b5586', 
            scheduled_tasks: [
                {
                  state: 'pending',
                  messages: [
                    {
                      to: '+123',
                      message: 'foo'
                    }
                  ]
                }
            ]
        },
    };

    var row2 = {
        doc: {
            _id: '0b4883', 
            errors:['no go'], 
            tasks: [{
                state: 'pending',
                messages: [
                    {
                      to: '+456',
                      message: 'try again'
                    }
                ]
            }],
            scheduled_tasks: [
                {
                  state: 'pending',
                  messages: [
                    {
                      to: '+789',
                      message: 'baz'
                    }
                  ]
                }
            ]
        }
    };

    var viewdata = { rows: [row1, row2] };

    var resp = fakerequest.list(lists.tasks_pending, viewdata, req);
    var resp_body = JSON.parse(resp.body);
    test.same(expResp.payload, resp_body.payload);
    test.done();
};
