var proxyquire = require('proxyquire').noCallThru(),
    fakerequest = require('../../couch-fakerequest'),
    baseURL = 'BASEURL';

var info = proxyquire('../../../../packages/kujua-sms/views/lib/appinfo', {
    'cookies': {},
    'duality/utils': { getBaseURL: function() { return 'BASEURL'; } },
    'underscore': require('underscore')
});
var kujua_sms_utils = proxyquire('../../../../packages/kujua-sms/kujua-sms/utils', {
    'views/lib/objectpath': {}
});
var lists = proxyquire('../../../../packages/kujua-sms/kujua-sms/lists', {
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

exports['task history without duplication - task-utils integration test'] = function(test) {
  var req = {
    headers: { Host: 'localhost:5988' }
  };

  var expResp = {};

  expResp.payload = {
    success: true,
    task: 'send',
    secret: '',
    messages: [
      { to: '+123', message: 'bar1' },
      { to: '+456', message: 'bar2' },
      { to: '+456', message: 'bar3' },
      { to: '+123', message: 'foo1' },
      { to: '+789', message: 'foo2' },
      { to: '+789', message: 'foo3' },
    ]
  };

  var row1 = {
    doc: {
      _id: '0b5586',
      tasks: [
        {
          state: 'pending',
          timestamp: '0000',
          state_history: [{
            state: 'pending',
            timestamp: '0000'
          }],
          messages: [
            {
              to: '+123',
              message: 'bar1'
            }
          ]
        }, {
          state: 'pending',
          timestamp: '222',
          state_history: [{
            state: 'pending',
            timestamp: '222'
          }],
          messages: [
            {
              to: '+456',
              message: 'bar2'
            },
            {
              to: '+456',
              message: 'bar3'
            }
          ]
        }, {
          state: 'sent',
          timestamp: '444',
          state_history: [{
            state: 'sent',
            timestamp: '444'
          }],
          messages: [
            {
              to: '+123',
              message: 'bar3'
            }
          ]
        }
      ],
      scheduled_tasks: [
        {
          state: 'pending',
          timestamp: '111',
          state_history: [{
            state: 'pending',
            timestamp: '111'
          }],
          messages: [
            {
              to: '+123',
              message: 'foo1'
            }
          ]
        }, {
          state: 'pending',
          timestamp: '333',
          state_history: [{
            state: 'pending',
            timestamp: '333'
          }],
          messages: [
            {
              to: '+789',
              message: 'foo2'
            },
            {
              to: '+789',
              message: 'foo3'
            }
          ]
        }, {
          state: 'sent',
          timestamp: '555',
          state_history: [{
            state: 'sent',
            timestamp: '555'
          }],
          messages: [
            {
              to: '+123',
              message: 'foo3'
            }
          ]
        }
      ]
    },
  };

  var viewdata = { rows: [row1] };

  var resp = fakerequest.list(lists.tasks_pending, viewdata, req);

  var resp_body = JSON.parse(resp.body);
  var docs = resp_body.callback.data.docs;

  test.same(expResp.payload, resp_body.payload);
  test.equals(docs.length, 1);

  test.equals(docs[0].tasks[0].state, 'sent');
  test.notEqual(docs[0].tasks[0].timestamp, '0000');
  test.equals(docs[0].tasks[0].state_history.length, 2);
  test.same(docs[0].tasks[0].state_history[0], { state: 'pending', timestamp: '0000' });
  test.equal(docs[0].tasks[0].state_history[1].state, 'sent');

  test.equals(docs[0].tasks[1].state, 'sent');
  test.notEqual(docs[0].tasks[1].timestamp, '0000');
  test.equals(docs[0].tasks[1].state_history.length, 2);
  test.same(docs[0].tasks[1].state_history[0], { state: 'pending', timestamp: '222' });
  test.equal(docs[0].tasks[1].state_history[1].state, 'sent');

  test.equals(docs[0].tasks[2].state, 'sent');
  test.equal(docs[0].tasks[2].timestamp, '444');
  test.equals(docs[0].tasks[2].state_history.length, 1);
  test.same(docs[0].tasks[2].state_history[0], { state: 'sent', timestamp: '444' });

  test.equals(docs[0].scheduled_tasks[0].state, 'sent');
  test.notEqual(docs[0].scheduled_tasks[0].timestamp, '111');
  test.equals(docs[0].scheduled_tasks[0].state_history.length, 2);
  test.same(docs[0].scheduled_tasks[0].state_history[0], { state: 'pending', timestamp: '111' });
  test.equal(docs[0].scheduled_tasks[0].state_history[1].state, 'sent');

  test.equals(docs[0].scheduled_tasks[1].state, 'sent');
  test.notEqual(docs[0].scheduled_tasks[1].timestamp, '333');
  test.equals(docs[0].scheduled_tasks[1].state_history.length, 2);
  test.same(docs[0].scheduled_tasks[1].state_history[0], { state: 'pending', timestamp: '333' });
  test.equal(docs[0].scheduled_tasks[1].state_history[1].state, 'sent');

  test.equals(docs[0].scheduled_tasks[2].state, 'sent');
  test.equal(docs[0].scheduled_tasks[2].timestamp, '555');
  test.equals(docs[0].scheduled_tasks[2].state_history.length, 1);
  test.same(docs[0].scheduled_tasks[2].state_history[0], { state: 'sent', timestamp: '555' });

  test.done();
};
