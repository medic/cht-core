const sinon = require('sinon');
const assert = require('chai').assert;
const messages = require('../../../src/lib/messages');
const utils = require('../../../src/lib/utils');
const config = require('../../../src/config');

describe('conditional alerts', () => {
  let transition;

  beforeEach(() => {
    config.init({ getAll: sinon.stub(), });
    transition = require('../../../src/transitions/conditional_alerts');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('when document type is unknown do not pass filter', () => {
    assert.equal(transition.filter({ doc: {} }), false);
  });

  it('when invalid submission do not pass filter', () => {
    sinon.stub(transition, '_getConfig').returns([{form: 'STCK'}]);
    sinon.stub(utils, 'isValidSubmission').returns(false);
    assert.equal(transition.filter({
      doc: {
        form: 'STCK',
        type: 'data_record'
      },
      info: {}
    }), false);
    assert.equal(utils.isValidSubmission.callCount, 1);
    assert.deepEqual(utils.isValidSubmission.args[0], [{ form: 'STCK',  type: 'data_record' }]);
  });

  it('when document type matches pass filter', () => {
    sinon.stub(transition, '_getConfig').returns([{form: 'STCK'}]);
    sinon.stub(utils, 'isValidSubmission').returns(true);
    assert.equal(transition.filter({
      doc: {
        form: 'STCK',
        type: 'data_record'
      },
      info: {}
    }), true);
    assert.equal(utils.isValidSubmission.callCount, 1);
    assert.deepEqual(utils.isValidSubmission.args[0], [{ form: 'STCK',  type: 'data_record' }]);
  });

  it('when no alerts are registered do nothing', () => {
    sinon.stub(transition, '_getConfig').returns([]);
    return transition.onMatch({}).then(changed => {
      assert.equal(changed, false);
    });
  });

  it('when no alerts match document do nothing', () => {
    sinon.stub(transition, '_getConfig').returns([{
      form: 'STCK',
      condition: 'false'
    }]);
    const doc = {
      form: 'PINK'
    };
    return transition.onMatch({ doc: doc }).then(changed => {
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
    const messageFn = sinon.spy(messages, 'addMessage');
    const doc = {
      form: 'STCK'
    };
    return transition.onMatch({ doc: doc }).then(changed => {
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
    const messageFn = sinon.spy(messages, 'addMessage');
    const doc = {
      form: 'STCK'
    };
    return transition.onMatch({ doc: doc }).then(changed => {
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
    const messageFn = sinon.spy(messages, 'addMessage');
    const doc = {
      form: 'STCK'
    };
    return transition.onMatch({ doc: doc }).then(changed => {
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
        condition: 'STCK(1).s1_avail <= STCK(0).s1_used',
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

    sinon.stub(utils, 'getReportsWithSameParentAndForm').resolves([{
      doc: {
        reported_date: 1390427075750,
        form: 'STCK',
        s1_avail: 5
      }
    }]);

    const messageFn = sinon.spy(messages, 'addMessage');

    const doc = {
      reported_date: 1390427075751,
      form: 'STCK',
      s1_used: 6
    };
    return transition.onMatch({ doc: doc }).then(changed => {
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

    sinon.stub(utils, 'getReportsWithSameParentAndForm').resolves([{
      key: 'somekey',
      doc: {
        reported_date: 1390427075750,
        s1_avail_bis: 0
      }
    }]);

    const doc = {
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

    sinon.stub(utils, 'getReportsWithSameParentAndForm').resolves([{
      key: 'somekey',
      doc: {
        s1_avail: 9,
        s1_used: 2,
        reported_date: 1,
      }
    }, {
      key: 'somekey',
      doc: {
        s1_avail: 7,
        s1_used: 4,
        reported_date: 2,
      }
    }]);

    const messageFn = sinon.spy(messages, 'addMessage');

    const doc = {
      form: 'STCK',
      s1_avail: 3,
      s1_used: 5,
      reported_date: 3,
    };
    return transition.onMatch({ doc: doc }).then(changed => {
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

    sinon.stub(utils, 'getReportsWithSameParentAndForm').resolves([{
      key: 'something',
      doc: {
        s1_avail: 9,
        s1_used: 2,
        reported_date: 1,
      }
    }, {
      key: 'aaa',
      doc: {
        s1_avail: 7,
        s1_used: 4,
        reported_date: 2,
      }
    }]);

    const messageFn = sinon.spy(messages, 'addMessage');
    const doc = {
      form: 'STCK',
      s1_avail: 3,
      s1_used: 5,
      reported_date: 4,
    };
    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(messageFn.callCount, 1);
      assert.equal(messageFn.args[0][0], doc);
      assert.equal(messageFn.args[0][1].message, 'low on units');
      assert.equal(messageFn.args[0][2], '+5555555');
      assert.equal(changed, true);

    });
  });

  it('form reports includes the report that triggered the transition', () => {

    sinon.stub(transition, '_getConfig').returns({
      '0': {
        form: 'STCK',
        condition: 'STCK(0).s1_avail < STCK(0).s1_used',
        message: 'low on units',
        recipient: '+5555555'
      }
    });

    sinon.stub(utils, 'getReportsWithSameParentAndForm').resolves([]);

    const messageFn = sinon.spy(messages, 'addMessage');
    const doc = {
      form: 'STCK',
      s1_avail: 3,
      s1_used: 4
    };
    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(messageFn.callCount, 1);
      assert.equal(messageFn.args[0][0], doc);
      assert.equal(messageFn.args[0][1].message, 'low on units');
      assert.equal(messageFn.args[0][2], '+5555555');
      assert.equal(changed, true);
    });
  });

  it('form reports includes the report that triggered the transition even if it has a db id', () => {

    sinon.stub(transition, '_getConfig').returns({
      '0': {
        form: 'STCK',
        condition: 'STCK(0).s1_avail < STCK(0).s1_used',
        message: 'low on units',
        recipient: '+5555555'
      }
    });

    sinon.stub(utils, 'getReportsWithSameParentAndForm').resolves([]);

    const messageFn = sinon.spy(messages, 'addMessage');
    const doc = {
      _id: 'a',
      form: 'STCK',
      s1_avail: 3,
      s1_used: 4
    };
    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(messageFn.callCount, 1);
      assert.equal(messageFn.args[0][0], doc);
      assert.equal(messageFn.args[0][1].message, 'low on units');
      assert.equal(messageFn.args[0][2], '+5555555');
      assert.equal(changed, true);
    });
  });

  it('form reports only includes one copy of the report that triggered the transition', () => {

    sinon.stub(transition, '_getConfig').returns({
      '0': {
        form: 'STCK',
        condition: 'STCK(0).avail < STCK(1).avail',
        message: 'low on units',
        recipient: '+5555555'
      }
    });
    sinon.stub(utils, 'getReportsWithSameParentAndForm').resolves([
      {
        key: 'a',
        doc: {
          _id: 'a',
          form: 'STCK',
          reported_date: 1,
          avail: 6
        }
      },
      {
        key: 'b',
        doc: {
          _id: 'b',
          form: 'STCK',
          reported_date: 2,
          avail: 7
        }
      }
    ]);

    const messageFn = sinon.spy(messages, 'addMessage');
    const doc = {
      _id: 'a',
      form: 'STCK',
      reported_date: 0,
      avail: 8 // different avail should end up replacing the old 'a' doc
    };
    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(messageFn.callCount, 1);
      assert.equal(messageFn.args[0][0], doc);
      assert.equal(messageFn.args[0][1].message, 'low on units');
      assert.equal(messageFn.args[0][2], '+5555555');
      assert.equal(changed, true);
    });
  });

});
