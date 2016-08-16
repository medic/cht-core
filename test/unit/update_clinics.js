var sinon = require('sinon'),
    fakedb = require('../fake-db'),
    fakeaudit = require('../fake-audit'),
    transition = require('../../transitions/update_clinics'),
    phone = '+34567890123';

exports.setUp = function(callback) {
  process.env.TEST_ENV = true;
  callback();
};

exports.tearDown = function(callback) {
  if (fakedb.medic.view.restore) {
    fakedb.medic.view.restore();
  }
  if (fakedb.medic.get.restore) {
    fakedb.medic.get.restore();
  }
  callback();
};

exports['filter includes docs with no clinic'] = function(test) {
  var doc = {
    from: phone
  };
  test.ok(transition.filter(doc));
  test.done();
};

exports['filter out docs which already have a clinic'] = function(test) {
  var doc = {
    from: phone,
    contact: {
      parent: { name: 'some clinic' }
    }
  };
  test.ok(!transition.filter(doc));
  test.done();
};

exports['should update clinic by phone'] = function(test) {
  var doc = {
    from: phone,
    contact: {
      parent: null
    }
  };
  sinon.stub(fakedb.medic, 'view').callsArgWith(3, null, {rows: [{ doc: {
    _id: '9ed7d9c6095cc0e37e4d3e94d3387ed9',
    _rev: '6-e447d8801d7bed36614af92449586851',
    type: 'clinic',
    name: 'Clinic',
    contact: {
      name: 'CCN',
      phone: '+34567890123',
      rc_code: '1000'
    },
    parent: {
      _id: '9ed7d9c6095cc0e37e4d3e94d33866f1',
      _rev: '6-723dad2083c951501a1851fb88b6e3b5',
      type: 'health_center',
      name: 'Health Center',
      contact: {
        name: 'HCCN',
        phone: '+23456789012'
      },
      parent: {
        _id: '9ed7d9c6095cc0e37e4d3e94d3384c8f',
        _rev: '4-6e5f394413e840c1f41bf9f471a91e04',
        type: 'district_hospital',
        name: 'District',
        parent: {
        },
        contact: {
          name: 'DCN',
          phone: '+12345678901'
        }
      }
    }
  }}]});
  transition.onMatch({
    doc: doc
  }, fakedb, fakeaudit, function(err, complete) {
    test.ok(complete);
    test.ok(doc.contact);
    test.equal(doc.contact.phone, phone);
    test.done();
  });
};

exports['should not update clinic with wrong phone'] = function(test) {
  var doc = {
    from: 'WRONG'
  };
  sinon.stub(fakedb.medic, 'view').callsArgWith(3, null, {rows: []});
  transition.onMatch({
    doc: doc
  }, fakedb, fakeaudit, function(err, complete) {
    test.ok(!complete);
    test.ok(!doc.contact);
    test.done();
  });
};

exports['handles clinic ref id not found - medic/medic-webapp#2636'] = function(test) {
  var doc = {
    from: '+12345',
    refid: '1000'
  };
  sinon.stub(fakedb.medic, 'view').callsArgWith(3, null, {rows: []});
  transition.onMatch({
    doc: doc
  }, fakedb, fakeaudit, function(err, complete) {
    test.ok(!complete);
    test.ok(!doc.contact);
    test.done();
  });
};

exports['should update clinic by refid and fix number'] = function(test) {
  var doc = {
    from: '+12345',
    refid: '1000'
  };
  sinon.stub(fakedb.medic, 'view').callsArgWith(3, null, {rows: [{ doc: {
    _id: '9ed7d9c6095cc0e37e4d3e94d3387ed9',
    _rev: '6-e447d8801d7bed36614af92449586851',
    type: 'clinic',
    name: 'Clinic',
    contact: {
      name: 'CCN',
      phone: '+34567890123',
      rc_code: '1000'
    },
    parent: {
      _id: '9ed7d9c6095cc0e37e4d3e94d33866f1',
      _rev: '6-723dad2083c951501a1851fb88b6e3b5',
      type: 'health_center',
      name: 'Health Center',
      contact: {
        name: 'HCCN',
        phone: '+23456789012'
      },
      parent: {
        _id: '9ed7d9c6095cc0e37e4d3e94d3384c8f',
        _rev: '4-6e5f394413e840c1f41bf9f471a91e04',
        type: 'district_hospital',
        name: 'District',
        parent: {
        },
        contact: {
          name: 'DCN',
          phone: '+12345678901'
        }
      }
    }
  }}]});
  transition.onMatch({
    doc: doc
  }, fakedb, fakeaudit, function(err, complete) {
    test.ok(complete);
    test.ok(doc.contact);
    test.equal(doc.contact.phone, '+12345');
    test.done();
  });
};

exports['should update clinic by refid and get latest contact'] = function(test) {
  var doc = {
    from: '+12345',
    refid: '1000'
  };
  var clinic = {
    _id: '9ed7d9c6095cc0e37e4d3e94d3387ed9',
    _rev: '6-e447d8801d7bed36614af92449586851',
    type: 'clinic',
    name: 'Clinic',
    contact: {
      _id: 'z'
    },
    parent: {
      _id: '9ed7d9c6095cc0e37e4d3e94d33866f1',
      _rev: '6-723dad2083c951501a1851fb88b6e3b5',
      type: 'health_center',
      name: 'Health Center',
      contact: {
        name: 'HCCN',
        phone: '+23456789012'
      },
      parent: {
        _id: '9ed7d9c6095cc0e37e4d3e94d3384c8f',
        _rev: '4-6e5f394413e840c1f41bf9f471a91e04',
        type: 'district_hospital',
        name: 'District',
        parent: {
        },
        contact: {
          name: 'DCN',
          phone: '+12345678901'
        }
      }
    }
  };
  var contact = {
    _id: 'z',
    _rev: '2',
    name: 'zenith',
    phone: '+12345'
  };
  sinon.stub(fakedb.medic, 'view').callsArgWith(3, null, { rows: [{ doc: clinic }] });
  sinon.stub(fakedb.medic, 'get').callsArgWith(1, null, contact);
  transition.onMatch({
    doc: doc
  }, fakedb, fakeaudit, function(err, complete) {
    test.equal(err, null);
    test.ok(complete);
    test.ok(doc.contact);
    test.equal(doc.contact._rev, '2');
    test.equal(doc.contact.name, 'zenith');
    test.done();
  });
};

/*
 * Since the facilities index uses strings for the reference value we need to
 * always query with strings too.
 */
exports['refid field is cast to a string in view query'] = function(test) {
  test.expect(1);
  var change = {
    doc: {
      refid: 123
    }
  };
  var db = {
    medic: {
      view: function(ddoc, view, q) {
        test.ok(q.key[0] === '123');
        test.done();
      }
    }
  };
  transition.onMatch(change, db, {}, function(){});
};

exports['from field is cast to string in view query'] = function(test) {
  test.expect(1);
  var change = {
    doc: {
      from: 123
    }
  };
  var db = {
    medic: {
      view: function(ddoc, view, q) {
        test.ok(q.key[0] === '123');
        test.done();
      }
    }
  };
  transition.onMatch(change, db, {}, function(){});
};
