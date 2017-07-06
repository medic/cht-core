var utils = require('../utils');

var messageId1 = '00f237ab-dd34-44a8-9f17-caaa022be947';
var messageId2 = '40cb5078-57da-427c-b3a9-b76ae581e5da';
var messageId3 = '121a9fe4-2da0-49c1-a0cf-13f2554d7430';
var messageTo1 = '+64275555556';
var messageContent1 = 'Thank you for registering Shannon. Their pregnancy ID is 28551, and EDD is Sun, Dec 18th, 2016';
var messageContent2 = 'Please remind Shannon (28551) to visit the health facility for ANC visit this week. When she does let us know with "V 28551". Thanks!';
var messageTo2 = '+64275555556';
var report = {
  type: 'data_record',
  from: '+64275555556',
  form: 'P',
  errors: [],
  tasks: [
    {
      messages: [
        {
          to: messageTo1,
          message: messageContent1,
          uuid: messageId1
        }
      ],
      state: 'pending',
      state_history: [
        {
          state: 'pending',
          timestamp: '2016-08-04T02:24:48.578Z'
        }
      ]
    }
  ],
  fields: {
    last_menstrual_period: 20,
    patient_name: 'Shannon'
  },
  reported_date: 1470277478632,
  sms_message: {
    message_id: '4490',
    sent_timestamp: '1470277478632',
    message: '1!P!20#Shannon',
    from: '+64275555556',
    type: 'sms_message',
    form: 'P',
    locale: 'en'
  },
  read: [],
  patient_id: '28551',
  lmp_date: '2016-03-12T11:00:00.000Z',
  expected_date: '2016-12-17T11:00:00.000Z',
  scheduled_tasks: [
    {
      due: '2016-08-28T21:00:00.000Z',
      messages: [
        {
          to: messageTo2,
          message: messageContent2,
          uuid: messageId2
        }
      ],
      state: 'scheduled',
      state_history: [
        {
          state: 'scheduled',
          timestamp: '2016-08-04T02:24:48.569Z'
        }
      ],
      group: 2,
      type: 'ANC Reminders LMP'
    },
    {
      due: '2016-09-04T22:00:00.000Z',
      messages: [
        {
          to: '+64275555556',
          message: 'Did Shannon attend her ANC visit? When she does, respond with "V 28551". Thank you!',
          uuid: '2ca2e79b-4971-4619-bd8b-7324d30bc060'
        }
      ],
      state: 'scheduled',
      state_history: [
        {
          state: 'scheduled',
          timestamp: '2016-08-04T02:24:48.570Z'
        }
      ],
      group: 2,
      type: 'ANC Reminders LMP'
    },
    {
      due: '2016-10-23T20:00:00.000Z',
      messages: [
        {
          to: '+64275555556',
          message: 'Please remind Shannon (28551) to visit the health facility for ANC visit this week. When she does let us know with "V 28551". Thanks!',
          uuid: messageId3
        }
      ],
      state: 'scheduled',
      state_history: [
        {
          state: 'scheduled',
          timestamp: '2016-08-04T02:24:48.570Z'
        }
      ],
      group: 3,
      type: 'ANC Reminders LMP'
    }
  ],
  contact: {
    _id: 'c49385b3594af7025ef097114104dd97',
    _rev: '1-6f271bce3935ae5a336bdfc15edf313a',
    name: 'John',
    date_of_birth: '',
    phone: '+64275555556',
    alternate_phone: '',
    notes: '',
    type: 'person',
    reported_date: 1469578114398
  }
};

describe('sms-gateway api', function() {

  'use strict';

  var pollSmsApi = function(body) {
    var content = JSON.stringify(body);
    return utils.request({
      method: 'POST',
      path: '/api/sms',
      body: content,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': content.length
      }
    });
  };

  describe('- gateway submits new WT sms messages', function() {

    beforeEach(function(done) {
      browser.ignoreSynchronization = true;
      var body = {
        messages: [ {
          from: '+64271234567',
          content: 'hello',
          id: 'a'
        } ]
      };
      pollSmsApi(body).then(done).catch(done);
    });

    it('- shows content', function() {
      element(by.id('messages-tab')).click();

      // refresh - live list only updates on changes but changes are disabled for e2e
      browser.driver.navigate().refresh();

      // LHS
      browser.wait(function() {
        return element(by.css('#message-list li:first-child')).isPresent();
      }, 10000);
      expect(element(by.css('#message-list li:first-child .name')).getText()).toBe('+64271234567');
      expect(element(by.css('#message-list li:first-child .description')).getText()).toBe('hello');

      // RHS
      element(by.css('#message-list li:first-child .name')).click();
      browser.wait(function() {
        return element(by.css('#message-content .body li.incoming:first-child .data p:first-child')).isPresent();
      }, 10000);
      browser.sleep(250); // without this the elements are found to be detached...

      expect(element(by.css('#message-header .name')).getText()).toBe('+64271234567');
      expect(element(by.css('#message-content .body li.incoming:first-child .data p:first-child')).getText()).toBe('hello');
      expect(element(by.css('#message-content .body li.incoming:first-child .data .state.received')).getText()).toBe('received');
    });

  });

  describe('- gateway submits WT sms status updates', function() {

    var savedDoc;

    beforeEach(function(done) {
      browser.ignoreSynchronization = true;

      utils.saveDoc(report)
        .then(function(result) {
          savedDoc = result.id;
          var body = {
            updates: [
              { id: messageId1, status: 'SENT' },
              { id: messageId2, status: 'DELIVERED' },
              { id: messageId3, status: 'FAILED', reason: 'Insufficient credit' }
            ]
          };
          pollSmsApi(body).then(done).catch(done);
        })
        .catch(done);
    });

    afterEach(function(done) {
      utils.deleteDoc(savedDoc).then(done).catch(done);
    });

    it('- shows content', function() {
      element(by.id('reports-tab')).click();

      // refresh - live list only updates on changes but changes are disabled for e2e
      browser.driver.navigate().refresh();

      browser.wait(function() {
        return element(by.css('#reports-list li:first-child')).isPresent();
      }, 10000);
      element(by.css('#reports-list li:first-child .description')).click();
      browser.wait(function() {
        return element(by.css('#reports-content .body .item-summary .icon')).isPresent();
      }, 10000);

      browser.sleep(100); // without this the elements are found to be detached...

      // tasks
      expect(element(by.css('#reports-content .details > ul .task-list .task-state .state')).getText()).toBe('sent');

      // scheduled tasks
      expect(element(by.css('#reports-content .scheduled-tasks > ul > li:nth-child(1) > ul > li:nth-child(1) .task-state .state')).getText()).toBe('delivered');
      expect(element(by.css('#reports-content .scheduled-tasks > ul > li:nth-child(1) > ul > li:nth-child(2) .task-state .state')).getText()).toBe('scheduled'); // unchanged
      expect(element(by.css('#reports-content .scheduled-tasks > ul > li:nth-child(2) > ul > li:nth-child(1) .task-state .state')).getText()).toBe('failed');

    });
  });

  describe('- api returns list of pending WO messages', function() {

    var savedDoc;
    var response;

    beforeEach(function(done) {
      browser.ignoreSynchronization = true;

      var reportWithTwoMessagesToSend = JSON.parse(JSON.stringify(report));
      // First scheduled message is in forwarded-to-gateway state.
      reportWithTwoMessagesToSend.scheduled_tasks[0].state = 'forwarded-to-gateway';
      reportWithTwoMessagesToSend.scheduled_tasks[0].state_history.push(
        { state: 'forwarded-to-gateway', timestamp: '2016-08-05T02:24:48.569Z' }
      );

      utils.saveDoc(reportWithTwoMessagesToSend)
        .then(function(result) {
          savedDoc = result.id;
          return pollSmsApi({}).then(function(res) {
            response = res;
            done();
          });
        })
        .catch(done);
    });

    afterEach(function(done) {
      utils.deleteDoc(savedDoc).then(done).catch(done);
    });

    it('- returns list and updates state', function() {

      // TEMP: This is a flaky test, because sometimes there are more messages
      //       than the 2 that we expect there to be. Outputting so when it
      //       flakes we can see which messages they are and work out where
      //       they came from
      //  For reference, when running this locally with I got:
      // [
      //     {
      //         "content": "Thank you for registering Shannon. Their pregnancy ID is 28551, and EDD is Sun, Dec 18th, 2016",
      //         "id": "00f237ab-dd34-44a8-9f17-caaa022be947",
      //         "to": "+64275555556"
      //     },
      //     {
      //         "content": "Please remind Shannon (28551) to visit the health facility for ANC visit this week. When she does let us know with \"V 28551\". Thanks!",
      //         "id": "40cb5078-57da-427c-b3a9-b76ae581e5da",
      //         "to": "+64275555556"
      //     }
      // ]
      console.log('Messages currently present');
      console.log(JSON.stringify(response.messages));

      expect(response.messages.length).toBe(2);
      expect(response.messages[0].id).toBe(messageId1);
      expect(response.messages[0].to).toBe(messageTo1);
      expect(response.messages[0].content).toBe(messageContent1);
      expect(response.messages[1].id).toBe(messageId2);
      expect(response.messages[1].to).toBe(messageTo2);
      expect(response.messages[1].content).toBe(messageContent2);

      element(by.id('reports-tab')).click();

      // refresh - live list only updates on changes but changes are disabled for e2e
      browser.driver.navigate().refresh();

      browser.wait(function() {
        return element(by.css('#reports-list li:first-child')).isPresent();
      }, 10000);
      element(by.css('#reports-list li:first-child .description')).click();
      browser.wait(function() {
        return element(by.css('#reports-content .body .item-summary .icon')).isPresent();
      }, 10000);

      browser.sleep(100); // without this the elements are found to be detached...

      // tasks
      // State for messageId1 has been updated from pending to forwarded-to-gateway.
      expect(element(by.css('#reports-content .details > ul .task-list .task-state .state')).getText())
          .toBe('forwarded to gateway');

      // scheduled tasks
      // State for messageId2 is still forwarded-to-gateway
      expect(element(by.css('#reports-content .scheduled-tasks > ul > li:nth-child(1) > ul > li:nth-child(1) .task-state .state'))
          .getText()).toBe('forwarded to gateway');
    });
  });
});
