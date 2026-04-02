const { expect } = require('chai');
const sinon = require('sinon');
const { queryView, VIEW_REGISTRY } = require('../src/mongo/mongo-views');

const createMockCollection = (docs = []) => {
  const cursor = {
    sort: sinon.stub().returnsThis(),
    limit: sinon.stub().returnsThis(),
    toArray: sinon.stub().resolves(docs),
  };
  return {
    find: sinon.stub().returns(cursor),
    aggregate: sinon.stub().returns({ toArray: sinon.stub().resolves([]) }),
    _cursor: cursor,
  };
};

describe('mongo-views', () => {
  afterEach(() => sinon.restore());

  it('should have all registered views', () => {
    expect(Object.keys(VIEW_REGISTRY).length).to.be.greaterThan(10);
  });

  it('should return empty results for unregistered view with no design doc', async () => {
    const col = createMockCollection();
    col.findOne = sinon.stub().resolves(null);
    const result = await queryView('unknown/view', col);
    expect(result.rows).to.deep.equal([]);
  });

  describe('medic/contacts_by_depth', () => {
    it('should emit rows for matching contacts with parent hierarchy', async () => {
      const docs = [
        { _id: 'clinic1', type: 'clinic', parent: { _id: 'hc1', parent: { _id: 'district1' } },
          contact: { _id: 'person1' } },
        { _id: 'person1', type: 'person', parent: { _id: 'clinic1', parent: { _id: 'hc1' } }, patient_id: 'P001' },
      ];
      const col = createMockCollection(docs);

      const result = await queryView('medic/contacts_by_depth', col, { keys: [['hc1'], ['hc1', 0], ['hc1', 1]] });

      expect(result.rows.length).to.be.greaterThan(0);
      const clinicRows = result.rows.filter(r => r.id === 'clinic1');
      expect(clinicRows.some(r => JSON.stringify(r.key) === JSON.stringify(['hc1']))).to.be.true;
    });
  });

  describe('medic/contacts_by_primary_contact', () => {
    it('should return contacts whose primary contact matches keys', async () => {
      const docs = [
        { _id: 'clinic1', type: 'clinic', contact: { _id: 'chw1' } },
        { _id: 'clinic2', type: 'clinic', contact: 'chw2' },
      ];
      const col = createMockCollection(docs);

      const result = await queryView('medic/contacts_by_primary_contact', col, {
        keys: ['chw1', 'chw2'],
        include_docs: true,
      });

      expect(result.rows).to.have.length(2);
      expect(result.rows[0].key).to.equal('chw1');
      expect(result.rows[0].doc._id).to.equal('clinic1');
      expect(result.rows[1].key).to.equal('chw2');
    });
  });

  describe('medic-client/contacts_by_type', () => {
    it('should return counts grouped by type with reduce', async () => {
      const col = createMockCollection();
      col.aggregate.returns({
        toArray: sinon.stub().resolves([
          { _id: 'person', count: 50 },
          { _id: 'clinic', count: 10 },
        ]),
      });

      const result = await queryView('medic-client/contacts_by_type', col, { reduce: true, group: true });

      expect(result.rows).to.have.length(2);
      expect(result.rows[0]).to.deep.equal({ key: ['person'], value: 50 });
      expect(result.rows[1]).to.deep.equal({ key: ['clinic'], value: 10 });
    });

    it('should return contacts without reduce', async () => {
      const docs = [
        { _id: 'p1', type: 'person', name: 'Alice' },
      ];
      const col = createMockCollection(docs);

      const result = await queryView('medic-client/contacts_by_type', col, { reduce: false, include_docs: true });

      expect(result.rows).to.have.length(1);
      expect(result.rows[0].key).to.deep.equal(['person']);
      expect(result.rows[0].doc._id).to.equal('p1');
    });
  });

  describe('medic-client/reports_by_form', () => {
    it('should return counts grouped by form with reduce', async () => {
      const col = createMockCollection();
      col.aggregate.returns({
        toArray: sinon.stub().resolves([
          { _id: 'pregnancy', count: 100 },
          { _id: 'delivery', count: 25 },
        ]),
      });

      const result = await queryView('medic-client/reports_by_form', col, { reduce: true, group: true });

      expect(result.rows).to.have.length(2);
      expect(result.rows[0]).to.deep.equal({ key: ['pregnancy'], value: 100 });
    });

    it('should return reports without reduce', async () => {
      const docs = [
        { _id: 'r1', type: 'data_record', form: 'visit', reported_date: 1000 },
      ];
      const col = createMockCollection(docs);

      const result = await queryView('medic-client/reports_by_form', col, {});

      expect(result.rows).to.have.length(1);
      expect(result.rows[0]).to.deep.equal({ id: 'r1', key: ['visit'], value: 1000 });
    });
  });

  describe('medic-client/doc_by_type', () => {
    it('should filter docs by type key', async () => {
      const docs = [{ _id: 'm1', type: 'meta' }];
      const col = createMockCollection(docs);

      const result = await queryView('medic-client/doc_by_type', col, { key: ['meta'], include_docs: true });

      expect(result.rows).to.have.length(1);
      expect(result.rows[0].doc._id).to.equal('m1');
      expect(col.find.args[0][0].type).to.equal('meta');
    });
  });

  describe('medic/messages_by_state', () => {
    it('should return pending-or-forwarded messages within range', async () => {
      const docs = [{
        _id: 'r1',
        tasks: [{
          state: 'pending',
          due: 500,
          messages: [{ uuid: 'msg1', to: '+1234', message: 'hello' }],
        }],
      }];
      const col = createMockCollection(docs);

      const result = await queryView('medic/messages_by_state', col, {
        startkey: ['pending-or-forwarded', 0],
        endkey: ['pending-or-forwarded', '\ufff0'],
        limit: 25,
      });

      expect(result.rows.length).to.be.greaterThan(0);
      const row = result.rows.find(r => r.key[0] === 'pending-or-forwarded');
      expect(row).to.exist;
      expect(row.value.id).to.equal('msg1');
    });
  });

  describe('medic-sms/messages_by_gateway_ref', () => {
    it('should find messages by gateway ref', async () => {
      const docs = [{
        _id: 'r1',
        tasks: [{
          gateway_ref: 'gw-123',
          messages: [{ uuid: 'msg1' }],
        }],
      }];
      const col = createMockCollection(docs);

      const result = await queryView('medic-sms/messages_by_gateway_ref', col, { keys: ['gw-123'] });

      expect(result.rows).to.have.length(1);
      expect(result.rows[0].key).to.equal('gw-123');
      expect(result.rows[0].value).to.equal('msg1');
    });

    it('should find incoming messages by gateway ref', async () => {
      const docs = [{
        _id: 'r2',
        type: 'data_record',
        sms_message: { gateway_ref: 'gw-456', uuid: 'msg2' },
      }];
      const col = createMockCollection(docs);

      const result = await queryView('medic-sms/messages_by_gateway_ref', col, { keys: ['gw-456'] });

      expect(result.rows).to.have.length(1);
      expect(result.rows[0].value).to.equal('msg2');
    });
  });

  describe('medic-sms/messages_by_uuid', () => {
    it('should find docs containing messages with given UUIDs', async () => {
      const docs = [{
        _id: 'r1',
        tasks: [{ messages: [{ uuid: 'u1' }, { uuid: 'u2' }] }],
      }];
      const col = createMockCollection(docs);

      const result = await queryView('medic-sms/messages_by_uuid', col, { keys: ['u1'] });

      expect(result.rows).to.have.length(1);
      expect(result.rows[0].key).to.equal('u1');
    });
  });

  describe('medic-conflicts/conflicts', () => {
    it('should return 0 conflicts with reduce', async () => {
      const col = createMockCollection();
      const result = await queryView('medic-conflicts/conflicts', col, { reduce: true });

      expect(result.rows).to.deep.equal([{ key: null, value: 0 }]);
    });

    it('should return empty rows without reduce', async () => {
      const col = createMockCollection();
      const result = await queryView('medic-conflicts/conflicts', col, {});

      expect(result.rows).to.deep.equal([]);
    });
  });

  describe('medic-admin/message_queue', () => {
    it('should return counts by state category with group_level 1', async () => {
      const docs = [{
        _id: 'r1',
        tasks: [{
          state: 'pending',
          due: 1000,
          messages: [{ uuid: 'm1', to: '+1', message: 'hi' }],
        }],
        scheduled_tasks: [{
          state: 'delivered',
          due: 2000,
          messages: [{ uuid: 'm2', to: '+2', message: 'bye' }],
        }],
      }];
      const col = createMockCollection(docs);

      const result = await queryView('medic-admin/message_queue', col, { reduce: true, group_level: 1 });

      expect(result.rows.length).to.be.greaterThan(0);
      const deliveredRow = result.rows.find(r => r.key[0] === 'delivered');
      expect(deliveredRow).to.exist;
      expect(deliveredRow.value).to.equal(1);
    });

    it('should count messages in state range', async () => {
      const docs = [{
        _id: 'r1',
        tasks: [{
          state: 'delivered',
          due: 1500,
          messages: [{ uuid: 'm1', to: '+1', message: 'hi' }],
        }],
      }];
      const col = createMockCollection(docs);

      const result = await queryView('medic-admin/message_queue', col, {
        reduce: true,
        start_key: ['delivered', 1000],
        end_key: ['delivered', 2000],
      });

      expect(result.rows).to.have.length(1);
      expect(result.rows[0].value).to.equal(1);
    });
  });

  describe('medic-admin/contacts_by_dhis_orgunit', () => {
    it('should find contacts by DHIS org unit', async () => {
      const docs = [
        { _id: 'hc1', type: 'health_center', dhis: { orgUnit: 'OU-123' } },
      ];
      const col = createMockCollection(docs);

      const result = await queryView('medic-admin/contacts_by_dhis_orgunit', col, {
        key: 'OU-123',
        include_docs: true,
      });

      expect(result.rows).to.have.length(1);
      expect(result.rows[0].key).to.equal('OU-123');
      expect(result.rows[0].doc._id).to.equal('hc1');
    });

    it('should handle array dhis config', async () => {
      const docs = [
        { _id: 'hc2', type: 'clinic', dhis: [{ orgUnit: 'OU-A' }, { orgUnit: 'OU-B' }] },
      ];
      const col = createMockCollection(docs);

      const result = await queryView('medic-admin/contacts_by_dhis_orgunit', col, { key: 'OU-B' });

      expect(result.rows).to.have.length(1);
      expect(result.rows[0].key).to.equal('OU-B');
    });
  });
});
