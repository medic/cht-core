const assert = require('chai').assert;
const transition = require('../../../src/transitions/resolve_pending');

describe('reminders', () => {
  it('filter fails on undefined tasks or scheduled_tasks', () => {
    assert.equal(transition.filter({ doc: {} }), false);
  });

  it('filter fails on empty tasks or scheduled_tasks', () => {
    assert.equal(transition.filter({
      doc: {
        tasks: [],
        scheduled_tasks: []
      }
    }), false);
  });

  it('filter fails if task object looks wrong', () => {
    assert.equal(transition.filter({
      doc: {
        tasks: ['foo']
      }
    }), false);
  });

  it('filter succeeds with message task', () => {
    assert.equal(transition.filter({
      doc: {
        tasks: [
          {
            messages: [
              {
                to: 'foo',
                message: 'foo',
              }
            ],
            state: 'pending'
          }
        ]
      }
    }), true);
  });

  it('filter succeeds with scheduled message tasks', () => {
    assert.equal(transition.filter({
      doc: {
        scheduled_tasks: [
          {
            messages: [
              {
                to: 'foo',
                message: 'foo',
              }
            ],
            state: 'pending'
          }
        ]
      }
    }), true);
  });

  it('filter fails with error and scheduled message task', () => {
    assert.equal(transition.filter({
      doc: {
        errors: ['foo'],
        scheduled_tasks: [
          {
            messages: [
              {
                to: 'foo',
                message: 'foo',
              }
            ],
            state: 'pending'
          }
        ]
      }
    }), false);
  });

  it('onMatch does not cause update if message is already sent', () => {
    const doc = {
      errors: ['foo'],
      scheduled_tasks: [{
        messages: [{
          to: 'foo',
          message: 'foo',
        }],
        state: 'sent'
      }]
    };
    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(changed, false);
    });
  });
});
