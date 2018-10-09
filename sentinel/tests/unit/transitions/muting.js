const sinon = require('sinon'),
      config = require('../../../src/config'),
      chai = require('chai'),
      transitionUtils = require('../../../src/transitions/utils'),
      db = require('../../../src/db-pouch'),
      utils = require('../../../src/lib/utils'),
      transition = require('../../../src/transitions/muting');

describe('Muting transition', () => {
  afterEach(() => sinon.restore());
  beforeEach(() => {
    sinon.stub(config, 'get');
    sinon.stub(transitionUtils, 'hasRun');
    db.medic = {
      query: sinon.stub(),
      allDocs: sinon.stub(),
      bulkDocs: sinon.stub()
    };

    sinon.stub(utils, 'getRegistrations');
    sinon.stub(utils, 'muteScheduledMessages');
    sinon.stub(utils,  'unmuteScheduledMessages');
    sinon.stub(transition._lineage, 'fetchHydratedDoc');
  });

  describe('init', () => {
    it('should throw an error when config is incorrect', () => {
      config.get.returns({});
      chai.expect(transition.init).to.throw(Error, 'Configuration error');

      config.get.returns({ muting: {} });
      chai.expect(transition.init).to.throw('Configuration error');

      config.get.returns({ muting: { mute_forms: 'test' } });
      chai.expect(transition.init).to.throw('Configuration error');
    });

    it('should not throw an error when config is correct', () => {
      config.get.returns({ mute_forms: ['formA', 'formB'] });
      chai.expect(transition.init).to.not.throw();
      chai.expect(config.get.callCount).to.equal(1);
      chai.expect(config.get.args[0]).to.deep.equal(['muting']);
    });
  });

  describe('filter', () => {
    it('should return false for invalid docs', () => {
      config.get.returns({ mute_forms: ['formA', 'formB'], unmute_forms: ['formC', 'formD'] });
      transitionUtils.hasRun.returns(false);

      chai.expect(transition.filter()).to.equal(false);
      chai.expect(transition.filter({})).to.equal(false);
      chai.expect(transition.filter({ type: 'person' })).to.equal(false);
      chai.expect(transition.filter({ type: 'data_record' })).to.equal(false);
      chai.expect(transition.filter({ type: 'data_record', form: 'test' })).to.equal(false);
      chai.expect(transition.filter({ type: 'data_record', form: 'test', fields: {} })).to.equal(false);
      chai.expect(transition.filter({ type: 'data_record', form: 'test', fields: { patient_id: 'a'} })).to.equal(false);
      chai.expect(transition.filter({ type: 'data_record', form: 'test', fields: { place_id: 'a'} })).to.equal(false);
      chai.expect(transition.filter({ type: 'data_record', form: 'formA'})).to.equal(false);
      chai.expect(transition.filter({ type: 'data_record', form: 'formA'})).to.equal(false);
      chai.expect(transition.filter({ type: 'data_record', form: 'formC', fields: { a: 'b'}})).to.equal(false);
    });

    it('should return true for valid docs', () => {
      config.get.returns({ mute_forms: ['formA', 'formB'], unmute_forms: ['formC', 'formD'] });
      transitionUtils.hasRun.returns(false);

      chai.expect(transition.filter({ type: 'data_record', form: 'formA', fields: { patient_id: 'a' } })).to.equal(true);
      chai.expect(transition.filter({ type: 'data_record', form: 'formB', fields: { place_id: 'a' } })).to.equal(true);
      chai.expect(transition.filter({ type: 'data_record', form: 'formC', fields: { patient_id: 'a' } })).to.equal(true);
      chai.expect(transition.filter({ type: 'data_record', form: 'formD', fields: { place_id: 'a' } })).to.equal(true);
    });
  });

  describe('onMatch', () => {
    describe('loading contact', () => {
      it('should load and save person contact', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'mute',
          fields: {
            patient_id: 'contact_uuid'
          }
        };

        utils.getRegistrations.callsArgWith(1, null, []);
        db.medic.allDocs
          .withArgs(sinon.match.has('key')).resolves({ rows: [{ id: 'contact_uuid' }] })
          .withArgs(sinon.match.has('keys')).resolves({ rows: [{ doc: { _id: 'contact_uuid' }}] });

        transition._lineage.fetchHydratedDoc.resolves({ _id: 'contact_uuid' });
        db.medic.bulkDocs.resolves();
        db.medic.query.resolves({ rows: [{ id: 'contact_uuid', value: 'contact_patient_id' }] });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: 'contact_uuid' }]);
          chai.expect(db.medic.allDocs.args[1]).to.deep.equal([{ keys: ['contact_uuid'], include_docs: true }]);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { keys: [['contact_uuid']] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['contact_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[{ _id: 'contact_uuid', muted: true }]]);
          chai.expect(utils.getRegistrations.callCount).to.equal(1);
          chai.expect(utils.getRegistrations.args[0][0].ids).to.deep.equal(['contact_patient_id']);
        });
      });

      it('should load and save patient contact', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'mute',
          fields: {
            patient_id: 'patient_id'
          }
        };

        utils.getRegistrations.callsArgWith(1, null, []);
        db.medic.allDocs
          .withArgs(sinon.match.has('key')).resolves({ rows: [] })
          .withArgs(sinon.match.has('keys')).resolves({ rows: [{ doc: { _id: 'contact_uuid' }}] });

        transition._lineage.fetchHydratedDoc.resolves({ _id: 'contact_uuid' });
        db.medic.bulkDocs.resolves();
        db.medic.query
          .withArgs('medic-client/contacts_by_reference')
          .resolves({ rows: [{ id: 'contact_uuid', value: 'patient_id' }] });
        db.medic.query
          .withArgs('medic/contacts_by_depth')
          .resolves({ rows: [{ id: 'contact_uuid', value: 'contact_patient_id' }] });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: 'patient_id' }]);
          chai.expect(db.medic.allDocs.args[1]).to.deep.equal([{ keys: ['contact_uuid'], include_docs: true }]);
          chai.expect(db.medic.query.callCount).to.equal(2);
          chai.expect(db.medic.query.args[0])
            .to.deep.equal(['medic-client/contacts_by_reference', { key: ['shortcode', 'patient_id'] }]);
          chai.expect(db.medic.query.args[1]).to.deep.equal(['medic/contacts_by_depth', { keys: [['contact_uuid']] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['contact_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[{ _id: 'contact_uuid', muted: true }]]);
        });
      });

      it('should load and save place contact', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'mute',
          fields: {
            place_id: 'place_uuid'
          }
        };

        utils.getRegistrations.callsArgWith(1, null, []);
        db.medic.allDocs
          .withArgs(sinon.match.has('key')).resolves({ rows: [{ id: 'place_uuid' }] })
          .withArgs(sinon.match.has('keys')).resolves({ rows: [{ doc: { _id: 'place_uuid' }}] });

        transition._lineage.fetchHydratedDoc.resolves({ _id: 'place_uuid' });
        db.medic.bulkDocs.resolves();
        db.medic.query.resolves({ rows: [{ id: 'place_uuid', value: null }] });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: 'place_uuid' }]);
          chai.expect(db.medic.allDocs.args[1]).to.deep.equal([{ keys: ['place_uuid'], include_docs: true }]);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { keys: [['place_uuid']] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['place_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[{ _id: 'place_uuid', muted: true }]]);
          chai.expect(utils.getRegistrations.callCount).to.equal(0);
        });
      });

      it('should throw error when contact is not found', () => {
        config.get.returns({
          mute_forms: ['mute'],
          unmute_forms: ['unmute'],
          messages: [
            {
              event_type: 'contact_not_found',
              recipient: 'reporting_unit',
              message: [{
                locale: 'en',
                content: 'Contact not found'
              }]
            }
          ]
        });
        const doc = {
          form: 'mute',
          fields: {
            place_id: 'place_uuid'
          }
        };

        db.medic.allDocs.withArgs(sinon.match.has('key')).resolves({ rows: [] });
        db.medic.query.withArgs('medic-client/contacts_by_reference').resolves({ rows: [] });

        return transition.onMatch({ doc })
          .then(result => {
            chai.expect(result).to.equal('should have thrown');
          })
          .catch(err => {
            chai.expect(err.message).to.equal('Contact not found');
            chai.expect(doc.errors.length).to.equal(1);
            chai.expect(doc.errors[0].message).to.equal('Contact not found');
          });
      });
    });

    describe('muting', () => {
      it('should not mute already muted contacts', () => {
        config.get.returns({
          mute_forms: ['mute'],
          unmute_forms: ['unmute'],
          messages: [
            {
              event_type: 'already_muted',
              recipient: 'reporting_unit',
              message: [{
                locale: 'en',
                content: 'Contact is already muted'
              }]
            }
          ]
        });
        const doc = {
          form: 'mute',
          fields: {
            place_id: 'place_uuid'
          }
        };

        db.medic.allDocs.withArgs(sinon.match.has('key')).resolves({ rows: [{ id: 'place_uuid' }] });
        transition._lineage.fetchHydratedDoc.resolves({ _id: 'place_uuid', muted: true });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(doc.errors.length).to.equal(1);
          chai.expect(doc.errors[0].message).to.equal('Contact is already muted');
        });
      });
    });

    describe('unmuting', () => {
      it('should not unmute already unmuted contacts', () => {
        config.get.returns({
          mute_forms: ['mute'],
          unmute_forms: ['unmute'],
          messages: [
            {
              event_type: 'already_unmuted',
              recipient: 'reporting_unit',
              message: [{
                locale: 'en',
                content: 'Contact is already unmuted'
              }]
            }
          ]
        });
        const doc = {
          form: 'unmute',
          fields: {
            place_id: 'place_uuid'
          }
        };

        db.medic.allDocs.withArgs(sinon.match.has('key')).resolves({ rows: [{ id: 'place_uuid' }] });
        transition._lineage.fetchHydratedDoc.resolves({ _id: 'place_uuid' });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(doc.errors.length).to.equal(1);
          chai.expect(doc.errors[0].message).to.equal('Contact is already unmuted');
        });
      });
    });
  });
});
