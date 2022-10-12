const sinon = require('sinon');
const assert = require('chai').assert;
const db = require('../../../src/db');
const config = require('../../../src/config');
const utils = require('../../../src/lib/utils');
const phone = '+34567890123';

let transition;
let lineageStub;

describe('update clinic', () => {
  beforeEach(() => {
    config.init({
      getAll: sinon.stub().returns({}),
      get: sinon.stub(),
      getTranslations: sinon.stub().returns({})
    });
    transition = require('../../../src/transitions/update_clinics');
    lineageStub = sinon.stub(transition._lineage, 'fetchHydratedDoc');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('filter includes docs with no clinic', () => {
    const doc = {
      type: 'data_record',
      from: phone,
    };
    assert(transition.filter(doc));
  });

  it('filter out docs which already have a clinic', () => {
    const doc = {
      from: phone,
      type: 'data_record',
      contact: {
        parent: { name: 'some clinic' },
      },
    };
    assert(!transition.filter(doc));
  });

  it('should not update clinic by phone', () => {
    const doc = {
      from: phone,
      type: 'data_record',
    };

    const contact = {
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

    sinon.stub(db.medic, 'query').resolves({ rows: [{ id: contact._id }] });
    lineageStub.resolves(contact);

    return transition.onMatch({ doc: doc }).then(changed => {
      assert(changed);
      assert(doc.contact);
      assert(!doc.contact.phone);
    });
  });

  it('should not update clinic with wrong phone', () => {
    const doc = {
      type: 'data_record',
      from: 'WRONG',
      content_type: 'xml'
    };
    sinon.stub(db.medic, 'query').resolves({ rows: [] });
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(!changed);
      assert(!doc.contact);
    });
  });

  it('handles clinic ref id not found - medic/medic#2636', () => {
    const doc = {
      type: 'data_record',
      from: '+12345',
      refid: '1000',
      content_type: 'xml'
    };
    sinon.stub(db.medic, 'query').resolves({ rows: [] });
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(!changed);
      assert(!doc.contact);
    });
  });

  it('should update clinic by refid and fix number', () => {
    const doc = {
      type: 'data_record',
      from: '+12345',
      refid: '1000',
    };

    const contact = {
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

    config.getAll.returns({ contact_types: [ { id: 'clinic' } ] });
    sinon.stub(db.medic, 'query').resolves({ rows: [{ doc: contact }] });
    lineageStub.returns(Promise.resolve(contact));
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(changed);
      assert(doc.contact);
      assert.deepEqual(doc.contact, contact.contact);
    });
  });

  it('should update clinic by refid and get latest contact', () => {
    const doc = {
      from: '+12345',
      refid: '1000',
      type: 'data_record',
    };
    const clinic = {
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
    const contact = {
      _id: 'z',
      _rev: '2',
      name: 'zenith',
      phone: '+12345',
    };
    config.getAll.returns({ contact_types: [ { id: 'clinic' } ] });
    sinon.stub(db.medic, 'query').resolves({ rows: [{ doc: clinic }] });
    lineageStub.resolves(contact);
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
    const change = {
      doc: {
        refid: 123,
        type: 'data_record',
      },
    };
    const view = sinon.stub(db.medic, 'query').resolves({ rows: [] });
    return transition.onMatch(change).then(() => {
      assert.equal(view.args[0][1].key[0], 'external');
      assert.equal(view.args[0][1].key[1], '123');
    });
  });

  it('from field is cast to string in view query', () => {
    const change = {
      doc: {
        from: 123,
        type: 'data_record',
      },
    };
    const view = sinon.stub(db.medic, 'query').resolves({ rows: [] });
    return transition.onMatch(change).then(() => {
      assert.equal(view.args[0][1].key, '123');
    });
  });

  it('handles lineage rejection properly', () => {
    const doc = {
      from: '123',
      type: 'data_record',
    };

    sinon.stub(db.medic, 'query').resolves({ rows: [{ id: 'someID' }] });
    lineageStub.withArgs('someID').rejects('some error');

    return transition.onMatch({ doc: doc }).catch(err => {
      assert.equal(err, 'some error');
    });
  });

  it('should add sys.facility_not_found when no form', () => {
    const doc = {
      from: '123',
      type: 'data_record',
    };

    sinon.stub(db.medic, 'query').resolves({ rows: [{ key: '123' }] });
    return transition.onMatch({ doc }).then(changed => {
      assert(changed);
      assert(!doc.contact);
      assert.equal(doc.errors.length, 1);
      assert.equal(doc.errors[0].code, 'sys.facility_not_found');
    });
  });

  it('should add sys.facility_not_found when form not found', () => {
    const doc = {
      from: '123',
      type: 'data_record',
      form: 'someForm'
    };

    sinon.stub(db.medic, 'query').resolves({ rows: [{ key: '123' }] });
    config.get.withArgs('forms').returns({ 'other': {} });

    return transition.onMatch({ doc }).then(changed => {
      assert(changed);
      assert(!doc.contact);
      assert.equal(doc.errors.length, 1);
      assert.equal(doc.errors[0].code, 'sys.facility_not_found');
      assert.equal(config.get.withArgs('forms').callCount, 1);
    });
  });

  it('should add sys.facility_not_found when form not public and translates message', () => {
    const doc = {
      from: '123',
      type: 'data_record',
      form: 'someForm'
    };

    sinon.stub(db.medic, 'query').resolves({ rows: [{ key: '123' }] });
    const stubbedConfig = config.get;
    stubbedConfig.returns([ {
      form: 'someForm',
      messages: [
        {
          event_type: 'sys.facility_not_found',
          recipient: 'reporting_unit',
          translation_key: 'sys.facility_not_found',
        }
      ],
    }]);
    stubbedConfig.withArgs('forms').returns({ 'someForm': {} });
    sinon.stub(utils, 'translate').returns('translated');
    sinon.stub(utils, 'getLocale').returns('locale');

    return transition.onMatch({ doc }).then(changed => {
      assert(changed);
      assert(!doc.contact);
      assert.equal(doc.errors.length, 1);
      assert.deepEqual(doc.errors[0], {
        code: 'sys.facility_not_found',
        message: 'translated'
      });
      assert.equal(utils.translate.callCount, 2); // called by messages.addMessage and messages.getMessage
      assert.deepEqual(utils.translate.args[0], ['sys.facility_not_found', 'locale']);
      assert.deepEqual(utils.translate.args[1], ['sys.facility_not_found', 'en']); // defaults to en locale
      assert.equal(doc.tasks.length, 1);
      assert.equal(doc.tasks[0].messages[0].to, '123');
      assert.equal(doc.tasks[0].messages[0].message, 'translated');
    });
  });

  it('should send a message when form is not public', () => {
    const doc = {
      from: '123',
      type: 'data_record',
      form: 'someForm'
    };

    sinon.stub(db.medic, 'query').resolves({ rows: [{ key: '123' }] });
    sinon.stub(utils, 'translate').returns('facility not found');
    const stubbedConfig = config.get;
    stubbedConfig.returns([ {
      form: 'someForm',
      messages: [
        {
          event_type: 'sys.facility_not_found',
          recipient: 'reporting_unit',
          translation_key: 'sys.facility_not_found_key',
        }
      ],
    }]);
    stubbedConfig.withArgs('forms').returns({ 'someForm': {} });
    sinon.stub(utils, 'getLocale').returns('locale');

    return transition.onMatch({ doc }).then(changed => {
      assert(changed);
      assert(!doc.contact);
      assert.equal(doc.tasks.length, 1);
      assert.equal(doc.tasks[0].messages[0].to, '123');
      assert.equal(doc.tasks[0].messages[0].message, 'facility not found');
      assert.equal(utils.translate.callCount, 2);
      assert.deepEqual(utils.translate.args[0], ['sys.facility_not_found_key', 'locale']);
      assert.deepEqual(utils.translate.args[1], ['sys.facility_not_found_key', 'en']);
    });
  });

  it('should handle a non-public form with no config', () => {
    const doc = {
      from: '123',
      type: 'data_record',
      form: 'someForm'
    };

    sinon.stub(db.medic, 'query').resolves({ rows: [{ key: '123' }] });
    config.get.withArgs('forms').returns({ 'someForm': {} });
    sinon.stub(utils, 'translate').returns('facility not found');

    return transition.onMatch({ doc }).then(changed => {
      assert(changed);
      assert(!doc.contact);
      assert.equal(doc.errors.length, 1);
      assert.equal(doc.errors[0].code, 'sys.facility_not_found');
      assert.equal(doc.tasks.length, 1);
      assert.equal(doc.tasks[0].messages[0].to, '123');
      assert.equal(doc.tasks[0].messages[0].message, 'facility not found');
      assert.equal(utils.translate.callCount, 2);
      assert.deepEqual(utils.translate.args[0], ['messages.generic.sys.facility_not_found', 'en']);
    });
  });

  it('should not send a message when form is not found', () => {
    const doc = {
      from: '123',
      type: 'data_record',
      form: 'someForm'
    };

    sinon.stub(db.medic, 'query').resolves({ rows: [{ key: '123' }] });
    config.get.withArgs('forms').returns({ 'other': {} });

    return transition.onMatch({ doc }).then(changed => {
      assert(changed);
      assert(!doc.contact);
      assert.equal(doc.errors.length, 1);
      assert.equal(doc.errors[0].code, 'sys.facility_not_found');
      assert.notExists(doc.tasks);
    });
  });

  it('should not add sys.facility_not_found when xml', () => {
    const doc = {
      from: '123',
      type: 'data_record',
      form: 'someForm',
      content_type: 'xml'
    };

    sinon.stub(db.medic, 'query').resolves({ rows: [{ key: '123' }] });

    return transition.onMatch({ doc }).then(changed => {
      assert(!changed);
      assert(!doc.contact);
      assert(!doc.errors);
    });
  });

  it('should not add sys.facility_not_found when form is public', () => {
    const doc = {
      from: '123',
      type: 'data_record',
      form: 'someForm',
    };

    sinon.stub(db.medic, 'query').resolves({ rows: [{ key: '123' }] });
    config.get.withArgs('forms').returns({ 'someForm': { public_form: true } });

    return transition.onMatch({ doc }).then(changed => {
      assert(!changed);
      assert(!doc.contact);
      assert(!doc.errors);
    });
  });

  it('should handle contacts of hardcoded type with a contact_type property', () => {
    const doc = {
      type: 'data_record',
      from: '+12345',
      refid: '1000',
    };

    const contact = {
      type: 'clinic',
      contact_type: 'soemthing',
      name: 'Clinic',
      place_id: '1000',
      contact: {
        name: 'CCN',
        phone: '+34567890123',
      },
      parent: {
        type: 'health_center',
        name: 'Health Center',
        contact: {
          name: 'HCCN',
          phone: '+23456789012',
        },
        parent: {
          type: 'district_hospital',
          name: 'District',
          contact: {
            name: 'DCN',
            phone: '+12345678901',
          },
        },
      },
    };

    config.getAll.returns({ contact_types: [ { id: 'clinic' } ] });
    sinon.stub(db.medic, 'query').resolves({ rows: [{ doc: contact }] });
    lineageStub.resolves(contact);
    return transition.onMatch({ doc: doc }).then(changed => {
      assert(changed);
      assert(doc.contact);
      assert.deepEqual(doc.contact, contact.contact);
    });
  });

});
