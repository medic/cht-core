const sinon = require('sinon').sandbox.create(),
      db = require('../../db'),
      transition = require('../../transitions/update_clinics'),
      lineage = require('lineage'),
      phone = '+34567890123';

let lineageStub;

exports.setUp = function(callback) {
  process.env.TEST_ENV = true;
  lineageStub = sinon.stub(lineage, 'fetchHydratedDoc');
  callback();
};

exports.tearDown = function(callback) {
  sinon.restore();
  callback();
};

exports['filter includes docs with no clinic'] = function(test) {
  var doc = {
    type: 'data_record',
    from: phone
  };
  test.ok(transition.filter(doc));
  test.done();
};

exports['filter out docs which already have a clinic'] = function(test) {
  var doc = {
    from: phone,
    type: 'data_record',
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
    type: 'data_record',
    contact: {
      parent: null
    }
  };

  var contact = {
    _id: '9ed7d9c6095cc0e37e4d3e94d3387ed9',
    _rev: '6-e447d8801d7bed36614af92449586851',
    type: 'clinic',
    name: 'Clinic',
    place_id: '1000',
    contact: {
      name: 'CCN',
      phone: '+34567890123'
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

  sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: [{ id: contact._id }]});
  sinon.stub(db.audit, 'saveDoc').callsArg(1);
  lineageStub.returns(Promise.resolve(contact));

  transition.onMatch({ doc: doc }).then(changed => {
    test.ok(changed);
    test.ok(doc.contact);
    test.equal(doc.contact.phone, phone);
    test.done();
  });
};

exports['should not update clinic with wrong phone'] = function(test) {
  var doc = {
    type: 'data_record',
    from: 'WRONG'
  };
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: []});
  transition.onMatch({ doc: doc }).then(changed => {
    test.ok(!changed);
    test.ok(!doc.contact);
    test.done();
  });
};

exports['handles clinic ref id not found - medic/medic-webapp#2636'] = function(test) {
  var doc = {
    type: 'data_record',
    from: '+12345',
    refid: '1000'
  };
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: []});
  transition.onMatch({ doc: doc }).then(changed => {
    test.ok(!changed);
    test.ok(!doc.contact);
    test.done();
  });
};

exports['should update clinic by refid and fix number'] = function(test) {
  var doc = {
    type: 'data_record',
    from: '+12345',
    refid: '1000'
  };

  var contact = {
    _id: '9ed7d9c6095cc0e37e4d3e94d3387ed9',
    _rev: '6-e447d8801d7bed36614af92449586851',
    type: 'clinic',
    name: 'Clinic',
    place_id: '1000',
    contact: {
      name: 'CCN',
      phone: '+34567890123'
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

  lineageStub.returns(Promise.resolve(contact));
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: [{ doc: contact}]});
  sinon.stub(db.audit, 'saveDoc').callsArg(1);
  transition.onMatch({ doc: doc }).then(changed => {
    test.ok(changed);
    test.ok(doc.contact);
    test.equal(doc.contact.phone, '+12345');
    test.done();
  });
};

exports['should update clinic by refid and get latest contact'] = function(test) {
  var doc = {
    from: '+12345',
    refid: '1000',
    type: 'data_record'
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
  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [{ doc: clinic }] });
  sinon.stub(db.medic, 'get').callsArgWith(1, null, contact);
  sinon.stub(db.audit, 'saveDoc').callsArg(1);
  lineageStub.returns(Promise.resolve(contact));
  transition.onMatch({ doc: doc }).then(changed => {
    test.ok(changed);
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
  test.expect(2);
  var change = {
    doc: {
      refid: 123,
      type: 'data_record'
    }
  };
  const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [] });
  transition.onMatch(change).then(() => {
    test.equals(view.args[0][2].key[0], 'external');
    test.equals(view.args[0][2].key[1], '123');
    test.done();
  });
};

exports['from field is cast to string in view query'] = function(test) {
  test.expect(1);
  var change = {
    doc: {
      from: 123,
      type: 'data_record'
    }
  };
  const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [] });
  transition.onMatch(change).then(() => {
    test.equals(view.args[0][2].key, '123');
    test.done();
  });
};

exports['handles lineage rejection properly'] = function(test) {
  var doc = {
    from: '123',
    type: 'data_record'
  };

  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [{id: 'someID'}] });
  lineageStub.withArgs('someID').returns(Promise.reject('some error'));

  transition.onMatch({ doc: doc }).catch(err => {
    test.equal(err, 'some error');
    test.done();
  });
};
