var utils = require('../utils');

var messageId1 = '00f237ab-dd34-44a8-9f17-caaa022be947';
var messageId2 = '40cb5078-57da-427c-b3a9-b76ae581e5da';
var messageId3 = '121a9fe4-2da0-49c1-a0cf-13f2554d7430';
var messageTo1 = '+64275555556';
var messageContent1 = 'Thank you for registering Shannon. Their pregnancy ID is 28551, and EDD is Sun, Dec 18th, 2016';
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
          to: '+64275555556',
          message: 'Please remind Shannon (28551) to visit the health facility for ANC visit this week. When she does let us know with "V 28551". Thanks!',
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

  describe('submits new sms messages', function() {

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

    it('shows content', function() {
      element(by.id('messages-tab')).click();

      // refresh - live list only updates on changes but changes are disabled for e2e
      browser.driver.navigate().refresh();

      // LHS
      browser.wait(function() {
        return browser.isElementPresent(by.css('#message-list li:first-child'));
      }, 10000);
      expect(element(by.css('#message-list li:first-child .name')).getText()).toBe('+64271234567');
      expect(element(by.css('#message-list li:first-child .description')).getText()).toBe('hello');

      // RHS
      element(by.css('#message-list li:first-child .name')).click();
      browser.wait(function() {
        return browser.isElementPresent(by.css('#message-content .body li.incoming:first-child .data p:first-child'));
      }, 10000);
      browser.sleep(250); // without this the elements are found to be detached...

      expect(element(by.css('#message-header .name')).getText()).toBe('+64271234567');
      expect(element(by.css('#message-content .body li.incoming:first-child .data p:first-child')).getText()).toBe('hello');
      expect(element(by.css('#message-content .body li.incoming:first-child .data .state.received')).getText()).toBe('received');
    });

  });

  describe('submits sms status updates', function() {

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

/*    it('shows content', function() {
      element(by.id('reports-tab')).click();

      // refresh - live list only updates on changes but changes are disabled for e2e
      browser.driver.navigate().refresh();

      browser.wait(function() {
        return browser.isElementPresent(by.css('#reports-list li:first-child'));
      }, 10000);
      element(by.css('#reports-list li:first-child .description')).click();
      browser.wait(function() {
        return browser.isElementPresent(by.css('#reports-content .body .item-summary .icon'));
      }, 10000);

      browser.sleep(100); // without this the elements are found to be detached...

      // tasks
      expect(element(by.css('#reports-content .details > ul .task-list .task-state .state')).getText()).toBe('sent');

      // scheduled tasks
      expect(element(by.css('#reports-content .scheduled-tasks > ul > li:nth-child(1) > ul > li:nth-child(1) .task-state .state')).getText()).toBe('delivered');
      expect(element(by.css('#reports-content .scheduled-tasks > ul > li:nth-child(1) > ul > li:nth-child(2) .task-state .state')).getText()).toBe('scheduled'); // unchanged
      expect(element(by.css('#reports-content .scheduled-tasks > ul > li:nth-child(2) > ul > li:nth-child(1) .task-state .state')).getText()).toBe('failed');

    });
  });*/

  describe('returns list of pending messages', function() {

    var savedDoc;
    var response;

    beforeEach(function(done) {
      browser.ignoreSynchronization = true;

      utils.saveDoc(report)
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

    it('returns list and updates state', function() {
      expect(response.messages.length).toBe(1);
      expect(response.messages[0].id).toBe(messageId1);
      expect(response.messages[0].to).toBe(messageTo1);
      expect(response.messages[0].content).toBe(messageContent1);
      expect(response.messages[0].state).toBe('forwarded-to-gateway');

      element(by.id('reports-tab')).click();

      // refresh - live list only updates on changes but changes are disabled for e2e
      browser.driver.navigate().refresh();

      browser.wait(function() {
        return browser.isElementPresent(by.css('#reports-list li:first-child'));
      }, 10000);
      element(by.css('#reports-list li:first-child .description')).click();
      browser.wait(function() {
        return browser.isElementPresent(by.css('#reports-content .body .item-summary .icon'));
      }, 10000);

      browser.sleep(100); // without this the elements are found to be detached...

      // tasks
      expect(element(by.css('#reports-content .details > ul .task-list .task-state .state')).getText())
          .toBe('forwarded to gateway');

    });

    it('returns both pending and forwarded-to-gateway messages', function(done) {
      const testResponse = (response) => {
        expect(response.messages.length).toBe(1);
        expect(response.messages[0].id).toBe(messageId1);
        expect(response.messages[0].state).toBe('forwarded-to-gateway');
      };

      // Gateway has polled. The message state has been changed to 'forwarded-to-gateway'.
      testResponse(response);

      // Gateway polls again. Same message is returned again, still has 'forwarded-to-gateway'.
      pollSmsApi({}).then(function(secondResponse) {
        testResponse(secondResponse);
        done();
      });
    });

  });
});
