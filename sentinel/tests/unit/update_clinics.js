const sinon = require('sinon'),
  assert = require('chai').assert,
  db = require('../../src/db-nano'),
  dbPouch = require('../../src/db-pouch'),
  transition = require('../../src/transitions/update_clinics'),
  phone = '+34567890123';

let lineageStub;

describe('update clinic', () => {
  beforeEach(() => {
    process.env.TEST_ENV = true;
    lineageStub = sinon.stub(transition._lineage, 'fetchHydratedDoc');
  });

  afterEach(() => sinon.restore());

  it('filter includes docs with no clinic', () => {
    var doc = {
      type: 'data_record',
      from: phone,
    };
    assert(transition.filter(doc));
  });

  it('filter out docs which already have a clinic', () => {
    var doc = {
      from: phone,
      type: 'data_record',
      contact: {
        parent: { name: 'some clinic' },
      },
    };
    assert(!transition.filter(doc));
  });

  it('should update clinic by phone', () => {
    var doc = {
      from: phone,
      type: 'data_record',
      contact: {
        parent: null,
      },
    };

    var contact = {
      _id: '9ed7d9c6095cc0e37e4d3e94d3387ed9',
      _rev: '6-e447d8801d7bed36614af92449586851',
      type: 'clinic',
      name: 'Clinic',
      place_id: '1000',
      contact: {
        name: 'CCN',
        phone: '+34567890123',
      },
      parent: {
        _id: '9ed7d9c6095cc0e37e4d3e94d33866f1',
        _rev: '6-723dad2083c951501a1851fb88b6e3b5',
        type: 'health_center',
        name: 'Health Center',
        contact: {
          name: 'HCCN',
          phone: '+23456789012',
        },
        parent: {
          _id: '9ed7d9c6095cc0e37e4d3e94d3384c8f',
          _rev: '4-6e5f394413e840c1f41bf9f471a91e04',
          type: 'district_hospital',
          name: 'District',
          parent: {},
          contact: {
            name: 'DCN',
            phone: '+12345678901',
          },
        },
      },
    };

    sinon
      .stub(db.medic, 'view')
      .callsArgWith(3, null, { rows: [{ id: contact._id }] });
    sinon.stub(dbPouch.medic, 'put').callsArg(1);
    lineageStub.returns(Promise.resolve(contact));

    return transition.onMatch({ doc: doc }).then(changed => {
      assert(changed);
      assert(doc.contact);
      assert.equal(doc.contact.phone, phone);
    });
  });

  it('should not update clinic with wrong phone', () => {
    var doc = {
      type: 'data_record',
      from: 'WRONG',
    };
    sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [] });
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(!changed);
      assert(!doc.contact);
    });
  });

  it('handles clinic ref id not found - medic/medic-webapp#2636', () => {
    var doc = {
      type: 'data_record',
      from: '+12345',
      refid: '1000',
    };
    sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [] });
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(!changed);
      assert(!doc.contact);
    });
  });

  it('should update clinic by refid and fix number', () => {
    var doc = {
      type: 'data_record',
      from: '+12345',
      refid: '1000',
    };

    var contact = {
      _id: '9ed7d9c6095cc0e37e4d3e94d3387ed9',
      _rev: '6-e447d8801d7bed36614af92449586851',
      type: 'clinic',
      name: 'Clinic',
      place_id: '1000',
      contact: {
        name: 'CCN',
        phone: '+34567890123',
      },
      parent: {
        _id: '9ed7d9c6095cc0e37e4d3e94d33866f1',
        _rev: '6-723dad2083c951501a1851fb88b6e3b5',
        type: 'health_center',
        name: 'Health Center',
        contact: {
          name: 'HCCN',
          phone: '+23456789012',
        },
        parent: {
          _id: '9ed7d9c6095cc0e37e4d3e94d3384c8f',
          _rev: '4-6e5f394413e840c1f41bf9f471a91e04',
          type: 'district_hospital',
          name: 'District',
          parent: {},
          contact: {
            name: 'DCN',
            phone: '+12345678901',
          },
        },
      },
    };

    lineageStub.returns(Promise.resolve(contact));
    sinon
      .stub(db.medic, 'view')
      .callsArgWith(3, null, { rows: [{ doc: contact }] });
    sinon.stub(dbPouch.medic, 'put').callsArg(1);
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(changed);
      assert(doc.contact);
      assert.equal(doc.contact.phone, '+12345');
    });
  });

  it('should update clinic by refid and get latest contact', () => {
    var doc = {
      from: '+12345',
      refid: '1000',
      type: 'data_record',
    };
    var clinic = {
      _id: '9ed7d9c6095cc0e37e4d3e94d3387ed9',
      _rev: '6-e447d8801d7bed36614af92449586851',
      type: 'clinic',
      name: 'Clinic',
      contact: {
        _id: 'z',
      },
      parent: {
        _id: '9ed7d9c6095cc0e37e4d3e94d33866f1',
        _rev: '6-723dad2083c951501a1851fb88b6e3b5',
        type: 'health_center',
        name: 'Health Center',
        contact: {
          name: 'HCCN',
          phone: '+23456789012',
        },
        parent: {
          _id: '9ed7d9c6095cc0e37e4d3e94d3384c8f',
          _rev: '4-6e5f394413e840c1f41bf9f471a91e04',
          type: 'district_hospital',
          name: 'District',
          parent: {},
          contact: {
            name: 'DCN',
            phone: '+12345678901',
          },
        },
      },
    };
    var contact = {
      _id: 'z',
      _rev: '2',
      name: 'zenith',
      phone: '+12345',
    };
    sinon
      .stub(db.medic, 'view')
      .callsArgWith(3, null, { rows: [{ doc: clinic }] });
    sinon.stub(db.medic, 'get').callsArgWith(1, null, contact);
    sinon.stub(dbPouch.medic, 'put').callsArg(1);
    lineageStub.returns(Promise.resolve(contact));
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(changed);
      assert(doc.contact);
      assert.equal(doc.contact._rev, '2');
      assert.equal(doc.contact.name, 'zenith');
    });
  });

  /*
   * Since the facilities index uses strings for the reference value we need to
   * always query with strings too.
   */
  it('refid field is cast to a string in view query', () => {
    var change = {
      doc: {
        refid: 123,
        type: 'data_record',
      },
    };
    const view = sinon
      .stub(db.medic, 'view')
      .callsArgWith(3, null, { rows: [] });
    return transition.onMatch(change).then(() => {
      assert.equal(view.args[0][2].key[0], 'external');
      assert.equal(view.args[0][2].key[1], '123');
    });
  });

  it('from field is cast to string in view query', () => {
    var change = {
      doc: {
        from: 123,
        type: 'data_record',
      },
    };
    const view = sinon
      .stub(db.medic, 'view')
      .callsArgWith(3, null, { rows: [] });
    return transition.onMatch(change).then(() => {
      assert.equal(view.args[0][2].key, '123');
    });
  });

  it('handles lineage rejection properly', () => {
    var doc = {
      from: '123',
      type: 'data_record',
    };

    sinon
      .stub(db.medic, 'view')
      .callsArgWith(3, null, { rows: [{ id: 'someID' }] });
    lineageStub.withArgs('someID').returns(Promise.reject('some error'));

    return transition.onMatch({ doc: doc }).catch(err => {
      assert.equal(err, 'some error');
    });
  });
});
