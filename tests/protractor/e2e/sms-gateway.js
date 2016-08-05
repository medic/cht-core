var utils = require('../utils');

describe('sms-gateway api', function() {

  'use strict';

  beforeEach(function(done) {
    browser.ignoreSynchronization = true;
    var content = JSON.stringify({ messages: [ {
      from: '+64271234567',
      content: 'hello',
      id: 'a'
    } ] });
    utils.request({
      method: 'POST',
      path: '/api/sms',
      body: content,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': content.length
      }
    })
      .then(done)
      .catch(done);
  });

  it('submits sms messages', function() {
    element(by.id('messages-tab')).click();

    // refresh - live list only updates on changes but changes are disabled for e2e
    browser.driver.navigate().refresh();
    browser.wait(function() {
      return browser.isElementPresent(by.css('#message-list li:first-child'));
    }, 10000);

    // LHS
    expect(element(by.css('#message-list li:first-child .name')).getText()).toBe('+64271234567');
    expect(element(by.css('#message-list li:first-child .description')).getText()).toBe('hello');
    
    // RHS
    element(by.css('#message-list li:first-child .name')).click();
    browser.wait(function() {
      return browser.isElementPresent(by.css('#message-content .body li.incoming:first-child .data p:first-child'));
    }, 10000);
    expect(element(by.css('#message-header .name')).getText()).toBe('+64271234567');
    expect(element(by.css('#message-content .body li.incoming:first-child .data p:first-child')).getText()).toBe('hello');
    expect(element(by.css('#message-content .body li.incoming:first-child .data .state.received')).getText()).toBe('received');
  });

  // TODO test updates
  // TODO test outgoing messages

});
