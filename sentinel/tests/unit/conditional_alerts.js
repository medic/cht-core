var sinon = require('sinon'),
    assert = require('chai').assert,
    messages = require('../../src/lib/messages'),
    utils = require('../../src/lib/utils'),
    transition = require('../../src/transitions/conditional_alerts');

describe('conditional alerts', () => {
  afterEach(() => sinon.restore());

  it('when document type is unknown do not pass filter', () => {
      assert.equal(transition.filter({}), false);
  });

  it('when document type matches pass filter', () => {
      sinon.stub(transition, '_getConfig').returns([{form: 'STCK'}]);
      assert.equal(transition.filter({
          form: 'STCK',
          type: 'data_record'
      }), true);
  });

  it('when no alerts are registered do nothing', () => {
      sinon.stub(transition, '_getConfig').returns([]);
      transition.onMatch({}).then(changed => {
          assert.equal(changed, false);

      });
  });

  it('when no alerts match document do nothing', () => {
      sinon.stub(transition, '_getConfig').returns([{
          form: 'STCK',
          condition: 'false'
      }]);
      var doc = {
          form: 'PINK'
      };
      transition.onMatch({ doc: doc }).then(changed => {
          assert.equal(changed, false);

      });
  });

  it('when alert matches document send message', () => {
      sinon.stub(transition, '_getConfig').returns({
          '0': {
              form: 'STCK',
              condition: 'true',
              message: 'hello world',
              recipient: '+5555555'
          },
          '1': {
              form: 'XXXX',
              condition: 'true',
              message: 'goodbye world',
              recipient: '+6666666'
          }
      });
      var messageFn = sinon.spy(messages, 'addMessage');
      var doc = {
          form: 'STCK'
      };
      transition.onMatch({ doc: doc }).then(changed => {
          assert(messageFn.calledOnce);
          assert.equal(messageFn.args[0][0], doc);
          assert.equal(messageFn.args[0][1].message, 'hello world');
          assert.equal(messageFn.args[0][2], '+5555555');
          assert.equal(changed, true);

      });
  });

  it('when alert matches multiple documents send message multiple times', () => {
      sinon.stub(transition, '_getConfig').returns({
          '0': {
              form: 'STCK',
              condition: 'true',
              message: 'hello world',
              recipient: '+5555555'
          },
          '1': {
              form: 'STCK',
              condition: 'true',
              message: 'goodbye world',
              recipient: '+6666666'
          }
      });
      var messageFn = sinon.spy(messages, 'addMessage');
      var doc = {
          form: 'STCK'
      };
      transition.onMatch({ doc: doc }).then(changed => {
          assert(messageFn.calledTwice);
          assert.equal(messageFn.args[0][0], doc);
          assert.equal(messageFn.args[0][1].message, 'hello world');
          assert.equal(messageFn.args[0][2], '+5555555');
          assert.equal(messageFn.args[1][0], doc);
          assert.equal(messageFn.args[1][1].message, 'goodbye world');
          assert.equal(messageFn.args[1][2], '+6666666');
          assert.equal(changed, true);

      });
  });

  it('when alert matches document and condition is true send message', () => {
      sinon.stub(transition, '_getConfig').returns({
          '0': {
              form: 'STCK',
              condition: 'true',
              message: 'hello world',
              recipient: '+5555555'
          },
          '1': {
              form: 'STCK',
              condition: 'false',
              message: 'goodbye world',
              recipient: '+6666666'
          }
      });
      var messageFn = sinon.spy(messages, 'addMessage');
      var doc = {
          form: 'STCK'
      };
      transition.onMatch({ doc: doc }).then(changed => {
          assert(messageFn.calledOnce);
          assert.equal(messageFn.args[0][0], doc);
          assert.equal(messageFn.args[0][1].message, 'hello world');
          assert.equal(messageFn.args[0][2], '+5555555');
          assert.equal(changed, true);

      });
  });

  it('when recent form condition is true send message', () => {

      sinon.stub(transition, '_getConfig').returns({
          '0': {
              form: 'STCK',
              condition: 'STCK(0).s1_avail == 0',
              message: 'out of units',
              recipient: '+5555555'
          },
          '1': {
              form: 'STCK',
              condition: 'STCK(0).s1_avail == 1',
              message: 'exactly 1 unit available',
              recipient: '+5555555'
          }
      });

      sinon.stub(utils, 'getReportsWithSameClinicAndForm')
          .callsArgWith(1, null, [{
              reported_date: 1390427075750,
              doc: {
                  s1_avail: 0
              }
          }]);

      var messageFn = sinon.spy(messages, 'addMessage');

      var doc = {
          form: 'STCK'
      };
      transition.onMatch({ doc: doc }).then(changed => {
          assert.equal(messageFn.callCount, 1);
          assert.equal(messageFn.args[0][0], doc);
          assert.equal(messageFn.args[0][1].message, 'out of units');
          assert.equal(messageFn.args[0][2], '+5555555');
          assert.equal(changed, true);

      });
  });

  it('handle missing condition reference gracefully', () => {

      sinon.stub(transition, '_getConfig').returns({
          '0': {
              form: 'STCK',
              condition: 'STCK(1).s1_avail == 0',
              message: 'out of units',
              recipient: '+5555555'
          }
      });

      sinon.stub(utils, 'getReportsWithSameClinicAndForm')
          .callsArgWith(1, null, [{
              reported_date: 1390427075750,
              s1_avail: 0
          }]);

      var doc = {
          form: 'STCK'
      };

      return transition.onMatch({ doc: doc }).catch(err => {
          assert(err.match(/Cannot read property 's1_avail' of undefined/));
          assert.equal(!!err.changed, false);
      });
  });

  it('when complex condition is true send message', () => {

      sinon.stub(transition, '_getConfig').returns({
          '0': {
              form: 'STCK',
              condition: 'STCK(0).s1_avail < (STCK(0).s1_used + STCK(1).s1_used + STCK(2).s1_used ) / 3',
              message: 'low on units',
              recipient: '+5555555'
          }
      });

      sinon.stub(utils, 'getReportsWithSameClinicAndForm')
          .callsArgWith(1, null, [{
              reported_date: 1,
              doc: {
                  s1_avail: 9,
                  s1_used: 2
              }
          }, {
              reported_date: 2,
              doc: {
                  s1_avail: 7,
                  s1_used: 4
              }
          }, {
              reported_date: 3,
              doc: {
                  s1_avail: 3,
                  s1_used: 5
              }
          }]);

      var messageFn = sinon.spy(messages, 'addMessage');

      var doc = {
          form: 'STCK'
      };
      transition.onMatch({ doc: doc }).then(changed => {
          assert.equal(messageFn.callCount, 1);
          assert.equal(messageFn.args[0][0], doc);
          assert.equal(messageFn.args[0][1].message, 'low on units');
          assert.equal(messageFn.args[0][2], '+5555555');
          assert.equal(changed, true);

      });
  });

  it('database records are sorted before condition evaluation', () => {

      sinon.stub(transition, '_getConfig').returns({
          '0': {
              form: 'STCK',
              condition: 'STCK(0).s1_avail < (STCK(0).s1_used + STCK(1).s1_used + STCK(2).s1_used ) / 3',
              message: 'low on units',
              recipient: '+5555555'
          }
      });

      sinon.stub(utils, 'getReportsWithSameClinicAndForm')
          .callsArgWith(1, null, [{
              reported_date: 3,
              doc: {
                  s1_avail: 3,
                  s1_used: 5
              }
          }, {
              reported_date: 1,
              doc: {
                  s1_avail: 9,
                  s1_used: 2
              }
          }, {
              reported_date: 2,
              doc: {
                  s1_avail: 7,
                  s1_used: 4
              }
          }]);

      var messageFn = sinon.spy(messages, 'addMessage');
      var doc = {
          form: 'STCK'
      };
      transition.onMatch({ doc: doc }).then(changed => {
          assert.equal(messageFn.callCount, 1);
          assert.equal(messageFn.args[0][0], doc);
          assert.equal(messageFn.args[0][1].message, 'low on units');
          assert.equal(messageFn.args[0][2], '+5555555');
          assert.equal(changed, true);

      });
  });
});
