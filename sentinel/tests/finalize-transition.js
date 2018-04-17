const sinon = require('sinon').sandbox.create(),
      assert = require('chai').assert,
      db = require('../db-nano'),
      transitions = require('../transitions/index');

describe('finalize transition', () => {
  afterEach(() => sinon.restore());

  it('save not called if transition results are null', () => {
    const doc = { _rev: '1' };
    const audit = sinon.stub(db.audit, 'saveDoc');
    transitions.finalize({
      change: { doc: doc },
      results: null
    }, () => {
      assert.equal(audit.callCount, 0);
    });
  });

  it('save is called if transition results have changes', () => {
    const doc = { _rev: '1' };
    const audit = sinon.stub(db.audit, 'saveDoc').callsArg(1);
    transitions.finalize({
      change: { doc: doc },
      results: [null,null,true]
    }, () => {
      assert.equal(audit.callCount, 1);
      assert(audit.args[0][0]._rev);
    });
  });

  it('applyTransition creates transitions property', done => {
    const doc = { _rev: '1' };
    const audit = sinon.stub(db.audit, 'saveDoc').callsArg(1);
    const transition = {
      onMatch: change => {
        change.doc.foo = 'bar';
        return Promise.resolve(true);
      }
    };
    transitions.applyTransition({
      key: 'x',
      change: {
        doc: doc,
        seq: 1
      },
      transition: transition,
      audit: audit
    }, (err, changed) => {
      assert(!err);
      assert(changed);
      assert(doc.transitions.x.ok);
      assert(doc.transitions.x.last_rev);
      assert(doc.transitions.x.seq);
      assert.equal(doc.errors, undefined);
      assert.equal(doc.foo, 'bar');
      done();
    });
  });

  it('applyTransition adds errors to doc but does not return errors', () => {
    const doc = { _rev: '1' };
    const audit = sinon.stub(db.audit, 'saveDoc').callsArg(1);
    var transition = {
      onMatch: () => Promise.reject({ changed: false, message: 'oops' })
    };
    transitions.applyTransition({
      key: 'x',
      change: {
        doc: doc
      },
      transition: transition,
      audit: audit
    }, (err, changed) => {
      assert(!err);
      assert(!changed);
      assert.equal(doc.transitions, undefined); // don't save the transition or it won't run next time
      assert(doc.errors.length === 1);
      // error message contains error
      assert.equal(doc.errors[0].message, 'Transition error on x: oops');
    });
  });
});
