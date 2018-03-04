const sinon = require('sinon').sandbox.create(),
      db = require('../../db'),
      transition = require('../../transitions/update_sent_by');

exports.setUp = function(callback) {
  process.env.TEST_ENV = true;
  callback();
};

exports.tearDown = function(callback) {
  sinon.restore();
  callback();
};

exports['updates sent_by to clinic name if contact name'] = function(test) {
  var doc = { from: '+34567890123' };
  var dbView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { doc: { name: 'Clinic' } } ] } );
  transition.onMatch({ doc: doc }).then(changed => {
    test.ok(changed);
    test.equal(doc.sent_by, 'Clinic');
    test.ok(dbView.calledOnce);
    test.done();
  });
};

exports['sent_by untouched if nothing available'] = function(test) {
  var doc = { from: 'unknown number' };
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {});
  transition.onMatch({ doc: doc }).then(changed => {
    test.ok(!changed);
    test.strictEqual(doc.sent_by, undefined);
    test.done();
  });
};
