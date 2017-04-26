const assert = require('chai').assert,
  utils = require('../utils');

const pendingId = 'ff827d04-7083-4ff3-e53807a03a54d8af';

const data_record = {
  _id: 'my_data_record',
  errors: [],
  form: null,
  from: '0211111111',
  reported_date: 1432801258088,
  tasks: [{
    state: 'sent',
    state_history: [{
      state: 'pending',
      timestamp: '2015-10-21T07:29:54.493Z'
    }, {
      state: 'sent',
      timestamp: '2015-10-21T13:30:21.294Z'
    }],
    messages: [{
      to: '+254718930649',
      message: 'Thank you Gareth-the-CHW for registering The Best Patient Ever. Patient ID is 41919. You will receive clinic visit reminders as per child\'s DOB.',
      uuid: '30956597-0a1c-47a8-9210-56e1f681cae7'
    }]
  }],
  read: ['gareth'],
  kujua_message: true,
  type: 'data_record',
  sent_by: 'gareth',
  scheduled_tasks: [{
    timestamp: '2017-02-21T12:40:20.616Z',
    state: 'sent',
    due: '2017-01-30T12:09:04.137Z',
    type: 'ReferralHighP',
    group: 1,
    state_history: [{
      timestamp: '2017-01-30T11:54:08.256Z',
      state: 'scheduled'
    }, {
      timestamp: '2017-01-30T12:14:00.098Z',
      state: 'pending'
    }, {
      timestamp: '2017-02-21T12:40:20.616Z',
      state: 'sent'
    }],
    messages: [{
      message: 'Thank you for submitting the Referral Form for Michael Jackson .',
      to: '+254222222222',
      uuid: 'ff827d04-7083-4ff3-e53807a03a54cae8'
    }]
  }, {
    timestamp: '2017-01-30T12:19:00.136Z',
    state: 'pending',
    due: '2017-01-30T12:14:04.137Z',
    type: 'ReferralHighP',
    group: 1,
    state_history: [{
      timestamp: '2017-01-30T11:54:08.257Z',
      state: 'scheduled'
    }, {
      timestamp: '2017-01-30T12:19:00.136Z',
      state: 'pending'
    }],
    messages: [{
      message: 'A vulnerable child has been referred to you. (High Priority)',
      to: '0222222222',
      uuid: pendingId
    }]
  }]
};

describe('messages controller', function() {
  var data_record_rev;
  beforeEach(function(done) {
    utils.cleanDb()
      .then(() => utils.adminDb.put(data_record))
      .then((result) => {
        data_record_rev = result.rev;
        done();
      })
      .catch(done);
  });

  afterEach(function(done) {
    utils.adminDb.remove(data_record._id, data_record_rev)
      .then(() => done())
      .catch(done);
  });

  it('should fetch all messages', function(done) {
    utils.apiRequest('/api/v1/messages')
      .then((result) => {
        // TODO stop emitting everything twice : https://github.com/medic/medic-webapp/issues/3400
        // assert.equal(result.length, 3);
        assert.equal(result.length, 6);
        done();
      })
      .catch(done);
  });

  it('should fetch messages in ascending order', function(done) {
    utils.apiRequest('/api/v1/messages')
      .then((result) => {
        assertSortedByAscendingDate(result);
        done();
      })
      .catch(done);
  });

  it('should fetch messages in descending order', function(done) {
    utils.apiRequest('/api/v1/messages', {
        descending: true
      })
      .then((result) => {
        assertSortedByDescendingDate(result);
        done();
      })
      .catch(done);
  });

  it('should fetch messages by state', function(done) {
    utils.apiRequest('/api/v1/messages', {
        state: 'pending'
      })
      .then((result) => {
        assert.equal(result.length, 1);
        assert.equal(result[0].id, pendingId);
        done();
      })
      .catch(done);
  });

  it('should fetch messages by multiple states', function(done) {
    utils.apiRequest('/api/v1/messages', {
        states: ['pending', 'sent']
      })
      .then((result) => {
        assert.equal(result.length, 3); // fetches all
        done();
      })
      .catch(done);
  });

  it('should fetch messages by state in descending order', function(done) {
    utils.apiRequest('/api/v1/messages', {
        state: 'pending',
        descending: true
      })
      .then((result) => {
        assertSortedByDescendingDate(result);
        done();
      })
      .catch(done);
  });

  it('should fetch messages by multiple states in descending order', function(done) {
    utils.apiRequest('/api/v1/messages', {
        states: ['pending', 'sent'],
        descending: true
      })
      .then((result) => {
        assertSortedByDescendingDate(result);
        done();
      })
      .catch(done);
  });

  var assertSortedByDescendingDate = (arr) => {
    for (let i = 1; i < arr.length; i++) {
      assert.ok(
        arr[i - 1].sending_due_date >=
        arr[i].sending_due_date,
        'Expected ' + arr[i - 1].sending_due_date + ' >= ' + arr[i].sending_due_date);
    }
  };

  var assertSortedByAscendingDate = (arr) => {
    for (let i = 1; i < arr.length; i++) {
      assert.ok(
        arr[i - 1].sending_due_date <=
        arr[i].sending_due_date,
        'Expected ' + arr[i - 1].sending_due_date + ' <= ' + arr[i].sending_due_date);
    }
  };

});