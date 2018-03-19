const sinon = require('sinon').sandbox.create(),
      db = require('../../db'),
      transitions = require('../../transitions/index');

exports.tearDown = function(callback) {
    sinon.restore();
    callback();
};

exports['save not called if transition results are null'] = test => {
  const doc = { _rev: '1' };
  const audit = sinon.stub(db.audit, 'saveDoc');
  transitions.finalize({
    change: { doc: doc },
    results: null
  }, () => {
    test.equals(audit.callCount, 0);
    test.done();
  });
};

exports['save is called if transition results have changes'] = test => {
  const doc = { _rev: '1' };
  const audit = sinon.stub(db.audit, 'saveDoc').callsArg(1);
  transitions.finalize({
    change: { doc: doc },
    results: [null,null,true]
  }, () => {
    test.equals(audit.callCount, 1);
    test.ok(audit.args[0][0]._rev);
    test.done();
  });
};

exports['applyTransition creates transitions property'] = test => {
  test.expect(7);
  const doc = { _rev: '1' };
  const info = {};
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
      info: info,
      seq: 1
    },
    transition: transition,
    audit: audit
  }, (err, changed) => {
    test.ok(!err);
    test.ok(changed);
    test.ok(info.transitions.x.ok);
    test.ok(info.transitions.x.last_rev);
    test.ok(info.transitions.x.seq);
    test.equals(doc.errors, undefined);
    test.equals(doc.foo, 'bar');
    test.done();
  });
};

exports['applyTransition adds errors to doc but does not return errors'] = test => {
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
    test.ok(!err);
    test.ok(!changed);
    test.equals(doc.transitions, undefined); // don't save the transition or it won't run next time
    test.ok(doc.errors.length === 1);
    // error message contains error
    test.equals(doc.errors[0].message, 'Transition error on x: oops');
    test.done();
  });
};
