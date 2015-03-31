describe('SendMessage service', function() {

  'use strict';

  var db, 
      service,
      $rootScope,
      recipients,
      count,
      settings,
      message = 'hello';

  beforeEach(function () {
    db = {};
    settings = {};
    count = 0;
    module('inboxApp');
    module(function ($provide) {
      $provide.value('db', db);
      $provide.value('User', function(callback) {
        callback(null, { phone: '+5551', name: 'jack' });
      });
      $provide.value('Settings', function(callback) {
        callback(null, settings);
      });
    });
    inject(function(_SendMessage_, _$rootScope_) {
      $rootScope = _$rootScope_;
      service = _SendMessage_;
    });
  });

  function assertMessage(task, expected) {
    chai.expect(task.state).to.equal('pending');
    chai.expect(task.messages.length).to.equal(1);
    var msg = task.messages[0];
    chai.expect(msg.from).to.equal(expected.from);
    chai.expect(msg.sent_by).to.equal(expected.sent_by);
    chai.expect(msg.to).to.equal(expected.to);
    chai.expect(msg.uuid).to.equal(expected.uuid);
    chai.expect(msg.facility).to.deep.equal(expected.facility);
  }

  it('create doc for one recipient', function(done) {

    db.newUUID = function(number, callback) {
      callback(null, count++);
    };

    db.saveDoc = function(message, callback) {
      chai.expect(message.tasks.length).to.equal(1);
      assertMessage(message.tasks[0], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5552',
        uuid: 0,
        facility: recipients[0].doc
      });
      callback(null);
    };

    recipients = [{
      doc: {
        _id: 'abc',
        contact: {
          phone: '+5552'
        }
      }
    }];

    service(recipients, message).then(
      function() {
        done();
      }
    );

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('normalizes phone numbers', function(done) {

    db.newUUID = function(number, callback) {
      callback(null, count++);
    };

    db.saveDoc = function(message, callback) {
      chai.expect(message.tasks.length).to.equal(1);
      assertMessage(message.tasks[0], {
        from: '+5551',
        sent_by: 'jack',
        to: '+2545552',
        uuid: 0
      });
      callback(null);
    };

    recipients = [{
      doc: {
        contact: {
          phone: '5552'
        }
      }
    }];

    settings = {
      default_country_code: 254
    };

    service(recipients, message).then(
      function() {
        done();
      }
    );

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('create doc for multiple recipients', function(done) {

    db.newUUID = function(number, callback) {
      callback(null, count++);
    };

    db.saveDoc = function(message, callback) {
      chai.expect(message.tasks.length).to.equal(2);
      assertMessage(message.tasks[0], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5552',
        uuid: 0,
        facility: recipients[0].doc
      });
      assertMessage(message.tasks[1], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5553',
        uuid: 1,
        facility: recipients[1].doc
      });
      callback(null);
    };

    recipients = [
      {
        doc: {
          _id: 'abc',
          contact: {
            phone: '+5552'
          }
        }
      },
      {
        doc: {
          _id: 'efg',
          contact: {
            phone: '+5553'
          }
        }
      }
    ];

    service(recipients, message).then(
      function() {
        done();
      }
    );

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('create doc for everyoneAt recipients', function(done) {

    db.newUUID = function(number, callback) {
      callback(null, count++);
    };

    db.saveDoc = function(message, callback) {
      chai.expect(message.tasks.length).to.equal(3);
      assertMessage(message.tasks[0], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5552',
        uuid: 0,
        facility: recipients[0].doc
      });
      assertMessage(message.tasks[1], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5553',
        uuid: 1,
        facility: recipients[1].descendants[0].doc
      });
      assertMessage(message.tasks[2], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5554',
        uuid: 2,
        facility: recipients[1].descendants[2].doc
      });
      callback(null);
    };

    recipients = [
      {
        doc: {
          _id: 'abc',
          contact: {
            phone: '+5552'
          }
        }
      }, 
      {
        everyoneAt: true,
        descendants: [
          {
            doc: {
              _id: 'efg',
              contact: {
                phone: '+5553'
              }
            }
          },
          {
            doc: {
              _id: 'hij',
              contact: {
                phone: '+5552' // duplicate phone number should be removed
              }
            }
          }, 
          {
            doc: {
              _id: 'klm',
              contact: {
                phone: '+5554'
              }
            }
          }
        ]
      }
    ];

    service(recipients, message).then(
      function() {
        done();
      }
    );

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('returns newUUID errors', function(done) {

    db.newUUID = function(number, callback) {
      callback('errcode1');
    };

    recipients = [{
      doc: {
        _id: 'abc',
        contact: {
          phone: '+5552'
        }
      }
    }];

    service(recipients, message).then(
      function() {
        chai.fail('success', 'error');
      },
      function(err) {
        chai.expect(err).to.equal('errcode1');
        done();
      }
    );

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('returns saveDoc errors', function(done) {

    db.newUUID = function(number, callback) {
      callback(null, count++);
    };

    db.saveDoc = function(message, callback) {
      callback('errcode2');
    };

    recipients = [{
      doc: {
        _id: 'abc',
        contact: {
          phone: '+5552'
        }
      }
    }];

    service(recipients, message).then(
      function() {
        chai.fail('success', 'error');
      },
      function(err) {
        chai.expect(err).to.equal('errcode2');
        done();
      }
    );

    // needed to resolve the promise
    $rootScope.$digest();
  });

});