const utils = require('../../../utils');

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

describe('messages controller', () => {

  let data_record_rev;

  beforeEach(done =>
    utils.saveDoc(data_record)
    .then(result => {
      data_record_rev = result.rev;
    })
    .then(done));

  afterEach(utils.afterEach);

  it('should fetch all messages', () =>
    utils.request('/api/v1/messages')
      .then((result) => {
        // TODO stop emitting everything twice : https://github.com/medic/medic-webapp/issues/3400
        // assert.equal(result.length, 3);
        expect(result.length).toBe(6);
      }));

  it('should fetch messages in ascending order', () =>
    utils.request('/api/v1/messages')
      .then((result) => {
        assertSortedByAscendingDate(result);
      }));

  it('should fetch messages in descending order', () =>
    utils.request('/api/v1/messages?descending=true')
    .then((result) => {
      assertSortedByDescendingDate(result);
    }));

  it('should fetch messages by state', () =>
    utils.request('/api/v1/messages?state=pending')
      .then((result) => {
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(pendingId);
      }));

  it('should fetch messages by multiple states', () =>
    utils.request('/api/v1/messages?states=pending&states=sent')
      .then((result) => {
        expect(result.length).toBe(3); // fetches all
      }));

  it('should fetch messages by state in descending order', () =>
    utils.request('/api/v1/messages?state=pending&descending=true')
      .then((result) => {
        assertSortedByDescendingDate(result);
      }));

  it('should fetch messages by multiple states in descending order', () =>
    utils.request('/api/v1/messages?states=pending&states=sent&descending=true')
      .then((result) => {
        assertSortedByDescendingDate(result);
      }));

  const assertSortedByDescendingDate = arr => {
    for (let i = 1; i < arr.length; i++) {
      expect(
        arr[i - 1].sending_due_date >=
        arr[i].sending_due_date).toBeTruthy();
    }
  };

  const assertSortedByAscendingDate = arr => {
    for (let i = 1; i < arr.length; i++) {
      expect(
        arr[i - 1].sending_due_date <=
        arr[i].sending_due_date).toBeTruthy();
    }
  };
});
