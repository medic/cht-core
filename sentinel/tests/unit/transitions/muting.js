const sinon = require('sinon'),
      config = require('../../../src/config'),
      chai = require('chai'),
      transitionUtils = require('../../../src/transitions/utils'),
      mutingUtils = require('../../../src/lib/muting_utils'),
      db = require('../../../src/db-pouch'),
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

    sinon.stub(mutingUtils, 'isMutedInLineage');
    sinon.stub(mutingUtils, 'updateContact');
    sinon.stub(mutingUtils, 'getSubjectIds');
    sinon.stub(mutingUtils, 'updateRegistrations');
    sinon.stub(mutingUtils, 'updateMuteState');
    sinon.stub(mutingUtils, 'getContact');
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

    it('should return false for invalid contacts', () => {
      mutingUtils.isMutedInLineage.returns(false);
      chai.expect(transition.filter({ muted: false }, {})).to.equal(false);
      chai.expect(transition.filter({ muted: false, type: 'something' }, {})).to.equal(false);
      chai.expect(transition.filter({ muted: false, type: 'person' }, {})).to.equal(false);
      chai.expect(transition.filter({ muted: false, type: 'clinic' }, {})).to.equal(false);
      chai.expect(mutingUtils.isMutedInLineage.callCount).to.equal(2);
      chai.expect(mutingUtils.isMutedInLineage.args).to.deep.equal([
        [{ muted: false, type: 'person' }],
        [{ muted: false, type: 'clinic' }]
      ]);
    });

    it('should return true for valid contacts', () => {
      mutingUtils.isMutedInLineage.returns(true);
      chai.expect(transition.filter({ muted: false, type: 'person' }, {})).to.equal(true);
      chai.expect(transition.filter({ muted: false, type: 'clinic' }, {})).to.equal(true);
      chai.expect(transition.filter({ muted: false, type: 'district_hospital' }, {})).to.equal(true);
      chai.expect(transition.filter({ muted: false, type: 'health_center' }, {})).to.equal(true);
      chai.expect(mutingUtils.isMutedInLineage.callCount).to.equal(4);
      chai.expect(mutingUtils.isMutedInLineage.args).to.deep.equal([
        [{ muted: false, type: 'person' }],
        [{ muted: false, type: 'clinic' }],
        [{ muted: false, type: 'district_hospital' }],
        [{ muted: false, type: 'health_center' }]
      ]);
    });

    it('should return false for old contacts', () => {
      mutingUtils.isMutedInLineage.returns(true);
      chai.expect(transition.filter({ muted: false, type: 'person' }, { _rev: '2-test' })).to.equal(false);
    });
  });

  describe('onMatch', () => {
    describe('new contacts', () => {
      it('should update the contact', () => {
        const doc = { _id: 'id', type: 'person', patient_id: 'patient' };
        mutingUtils.updateRegistrations.resolves();
        mutingUtils.getSubjectIds.returns(['id', 'patient']);

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(mutingUtils.updateContact.callCount).to.equal(1);
          chai.expect(mutingUtils.updateContact.args[0]).to.deep.equal([doc, true]);
          chai.expect(mutingUtils.getSubjectIds.callCount).to.equal(1);
          chai.expect(mutingUtils.getSubjectIds.args[0]).to.deep.equal([doc]);
          chai.expect(mutingUtils.updateRegistrations.callCount).to.equal(1);
          chai.expect(mutingUtils.updateRegistrations.args[0]).to.deep.equal([['id', 'patient'], true]);
        });
      });

      it('should throw updateRegistrations errors', () => {
        const doc = { _id: 'id', type: 'person', patient_id: 'patient' };
        mutingUtils.updateRegistrations.rejects({ some: 'error' });
        mutingUtils.getSubjectIds.returns(['id', 'patient']);

        return transition
          .onMatch({ doc })
          .then(() => chai.expect(true).to.equal('should have thrown'))
          .catch(err => {
            chai.expect(err).to.deep.equal({ some: 'error' });
            chai.expect(mutingUtils.updateContact.callCount).to.equal(1);
            chai.expect(mutingUtils.updateContact.args[0]).to.deep.equal([doc, true]);
            chai.expect(mutingUtils.getSubjectIds.callCount).to.equal(1);
            chai.expect(mutingUtils.getSubjectIds.args[0]).to.deep.equal([doc]);
            chai.expect(mutingUtils.updateRegistrations.callCount).to.equal(1);
            chai.expect(mutingUtils.updateRegistrations.args[0]).to.deep.equal([['id', 'patient'], true]);
          });
      });
    });

    describe('muting/unmuting', () => {
      const mutingConfig = {
        mute_forms: ['mute'],
        unmute_forms: ['unmute'],
        messages: [
          {
            event_type: 'contact_not_found',
            recipient: 'reporting_unit',
            message: [{
              locale: 'en',
              content: 'Contact was not found'
            }]
          }, {
            event_type: 'already_muted',
            recipient: 'reporting_unit',
            message: [{
              locale: 'en',
              content: 'Contact already muted'
            }]
          }, {
            event_type: 'already_unmuted',
            recipient: 'reporting_unit',
            message: [{
              locale: 'en',
              content: 'Contact already unmuted'
            }]
          }, {
            event_type: 'mute',
            recipient: 'reporting_unit',
            message: [{
              locale: 'en',
              content: 'Muting successful'
            }]
          }, {
            event_type: 'unmute',
            recipient: 'reporting_unit',
            message: [{
              locale: 'en',
              content: 'Unmuting successful'
            }]
          }
        ]
      };

      it('should load the contact', () => {
        const doc = { _id: 'report', type: 'data_record', patient_id: 'patient' },
              contact = { _id: 'contact', patient_id: 'patient' };
        mutingUtils.getContact.resolves(contact);
        config.get.returns(mutingConfig);

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(mutingUtils.getContact.callCount).to.equal(1);
          chai.expect(mutingUtils.getContact.args[0]).to.deep.equal([ doc ]);
          chai.expect(mutingUtils.updateMuteState.callCount).to.equal(0);
        });
      });

      it('should add an error when contact is not found', () => {
        const doc = { _id: 'report', type: 'data_record' };
        mutingUtils.getContact.rejects({ message: 'contact_not_found' });
        config.get.returns(mutingConfig);

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(mutingUtils.getContact.callCount).to.equal(1);
          chai.expect(mutingUtils.getContact.args[0]).to.deep.equal([ doc ]);
          chai.expect(doc.errors.length).to.equal(1);
          chai.expect(doc.errors[0].message).to.equal('Contact was not found');
          chai.expect(mutingUtils.updateMuteState.callCount).to.equal(0);
        });
      });

      it('should throw contact loading errors', () => {
        const doc = { _id: 'report', type: 'data_record' };
        mutingUtils.getContact.rejects({ some: 'error' });
        config.get.returns(mutingConfig);

        return transition
          .onMatch({ doc })
          .then(() => chai.expect(true).to.equal('should have thrown'))
          .catch(err => {
            chai.expect(err).to.deep.equal({ some: 'error' });
            chai.expect(mutingUtils.getContact.callCount).to.equal(1);
            chai.expect(mutingUtils.getContact.args[0]).to.deep.equal([ doc ]);
            chai.expect(mutingUtils.updateMuteState.callCount).to.equal(0);
          });
      });

      it('should add message if contact is already unmuted', () => {
        const doc = { _id: 'report', type: 'data_record', form: 'unmute' },
              contact = { _id: 'contact' };
        mutingUtils.getContact.resolves(contact);
        config.get.returns(mutingConfig);

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(mutingUtils.getContact.callCount).to.equal(1);
          chai.expect(mutingUtils.getContact.args[0]).to.deep.equal([ doc ]);
          chai.expect(mutingUtils.updateMuteState.callCount).to.equal(0);
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.tasks[0].messages[0].message).to.equal('Contact already unmuted');
        });
      });

      it('should add message if contact is already muted', () => {
        const doc = { _id: 'report', type: 'data_record', form: 'mute' },
              contact = { _id: 'contact', muted: 12345 };
        mutingUtils.getContact.resolves(contact);
        config.get.returns(mutingConfig);

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(mutingUtils.getContact.callCount).to.equal(1);
          chai.expect(mutingUtils.getContact.args[0]).to.deep.equal([ doc ]);
          chai.expect(mutingUtils.updateMuteState.callCount).to.equal(0);
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.tasks[0].messages[0].message).to.equal('Contact already muted');
        });
      });

      it('should add message when muting', () => {
        const doc = { _id: 'report', type: 'data_record', form: 'mute' },
              contact = { _id: 'contact' };

        mutingUtils.getContact.resolves(contact);
        config.get.returns(mutingConfig);
        mutingUtils.updateMuteState.resolves(true);

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(mutingUtils.getContact.callCount).to.equal(1);
          chai.expect(mutingUtils.getContact.args[0]).to.deep.equal([ doc ]);
          chai.expect(mutingUtils.updateMuteState.callCount).to.equal(1);
          chai.expect(mutingUtils.updateMuteState.args[0]).to.deep.equal([ contact, true ]);
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.tasks[0].messages[0].message).to.equal('Muting successful');
        });
      });

      it('should add message when unmuting', () => {
        const doc = { _id: 'report', type: 'data_record', form: 'unmute' },
              contact = { _id: 'contact', muted: 1234 };

        mutingUtils.getContact.resolves(contact);
        config.get.returns(mutingConfig);
        mutingUtils.updateMuteState.resolves(true);

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(mutingUtils.getContact.callCount).to.equal(1);
          chai.expect(mutingUtils.getContact.args[0]).to.deep.equal([ doc ]);
          chai.expect(mutingUtils.updateMuteState.callCount).to.equal(1);
          chai.expect(mutingUtils.updateMuteState.args[0]).to.deep.equal([ contact, false ]);
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.tasks[0].messages[0].message).to.equal('Unmuting successful');
        });
      });

      it('should throw updateMuteState errors', () => {
        const doc = { _id: 'report', type: 'data_record', form: 'unmute' },
              contact = { _id: 'contact', muted: 1234 };

        mutingUtils.getContact.resolves(contact);
        config.get.returns(mutingConfig);
        mutingUtils.updateMuteState.rejects({ some: 'error' });

        return transition
          .onMatch({ doc })
          .then(() => chai.expect(true).to.equal('should have thrown'))
          .catch(err => {
            chai.expect(err).to.deep.equal({ some: 'error' });
            chai.expect(mutingUtils.getContact.callCount).to.equal(1);
            chai.expect(mutingUtils.getContact.args[0]).to.deep.equal([ doc ]);
            chai.expect(mutingUtils.updateMuteState.callCount).to.equal(1);
            chai.expect(mutingUtils.updateMuteState.args[0]).to.deep.equal([ contact, false ]);
            chai.expect(doc.tasks).to.equal(undefined);
            chai.expect(doc.errors).to.equal(undefined);
          });
      });
    });
  });

  /*describe('onMatch', () => {
    describe('updating new contacts', () => {
      it('updates contact and reports', () => {
        const doc = {
          _id: 'my-contact',
          type: 'person',
          patient_id: 'patient'
        };

        utils.getReportsBySubject.resolves([{ _id: 'r1' }]);
        utils.muteScheduledMessages.returns(true);
        db.medic.bulkDocs.resolves();
        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(doc.muted).to.equal(true);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal(['my-contact', 'patient']);
          chai.expect(utils.muteScheduledMessages.callCount).to.equal(1);
          chai.expect(utils.muteScheduledMessages.args[0]).to.deep.equal([{ _id: 'r1' }]);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[{ _id: 'r1' }]]);
        });
      });
    });

    describe('loading contact', () => {
      it('should load and save person contact', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'mute',
          type: 'data_record',
          fields: {
            patient_id: 'contact_uuid'
          }
        };

        utils.getReportsBySubject.resolves([]);
        db.medic.allDocs
          .withArgs(sinon.match.has('key')).resolves({ rows: [{ id: 'contact_uuid' }] })
          .withArgs(sinon.match.has('keys')).resolves({ rows: [{ doc: { _id: 'contact_uuid', patient_id: 'patient' }}]});

        transition._lineage.fetchHydratedDoc.resolves({ _id: 'contact_uuid' });
        db.medic.bulkDocs.resolves();
        db.medic.query.resolves({ rows: [{ id: 'contact_uuid', value: 'patient' }] });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: 'contact_uuid' }]);
          chai.expect(db.medic.allDocs.args[1]).to.deep.equal([{ keys: ['contact_uuid'], include_docs: true }]);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['contact_uuid'] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['contact_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[{ _id: 'contact_uuid', muted: true, patient_id: 'patient' }]]);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal(['contact_uuid', 'patient']);
        });
      });

      it('should load and save patient contact', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'mute',
          type: 'data_record',
          fields: {
            patient_id: 'patient_id'
          }
        };

        utils.getReportsBySubject.resolves([]);
        db.medic.allDocs
          .withArgs(sinon.match.has('key')).resolves({ rows: [] })
          .withArgs(sinon.match.has('keys')).resolves({ rows: [{ doc: { _id: 'contact_uuid', patient_id: 'patient' }}] });

        transition._lineage.fetchHydratedDoc.resolves({ _id: 'contact_uuid' });
        db.medic.bulkDocs.resolves();
        db.medic.query
          .withArgs('medic-client/contacts_by_reference')
          .resolves({ rows: [{ id: 'contact_uuid', value: 'patient_id' }] });
        db.medic.query
          .withArgs('medic/contacts_by_depth')
          .resolves({ rows: [{ id: 'contact_uuid', value: 'patient' }] });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: 'patient_id' }]);
          chai.expect(db.medic.allDocs.args[1]).to.deep.equal([{ keys: ['contact_uuid'], include_docs: true }]);
          chai.expect(db.medic.query.callCount).to.equal(2);
          chai.expect(db.medic.query.args[0])
            .to.deep.equal(['medic-client/contacts_by_reference', { key: ['shortcode', 'patient_id'] }]);
          chai.expect(db.medic.query.args[1]).to.deep.equal(['medic/contacts_by_depth', { key: ['contact_uuid'] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['contact_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[{ _id: 'contact_uuid', muted: true, patient_id: 'patient' }]]);
        });
      });

      it('should load and save place contact', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'mute',
          type: 'data_record',
          fields: {
            place_id: 'place_uuid'
          }
        };

        utils.getReportsBySubject.resolves([]);
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
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['place_uuid'] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['place_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[{ _id: 'place_uuid', muted: true }]]);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal(['place_uuid']);
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
          type: 'data_record',
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
          type: 'data_record',
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
          chai.expect(db.medic.bulkDocs.callCount).to.equal(0);
          chai.expect(utils.muteScheduledMessages.callCount).to.equal(0);
          chai.expect(utils.unmuteScheduledMessages.callCount).to.equal(0);
        });
      });

      it('should save mute state in the doc', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'mute',
          type: 'data_record',
          fields: {
            place_id: 'place_uuid'
          }
        };

        utils.getReportsBySubject.resolves([]);
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
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['place_uuid'] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['place_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[{ _id: 'place_uuid', muted: true }]]);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal(['place_uuid']);
          chai.expect(utils.muteScheduledMessages.callCount).to.equal(0);
          chai.expect(utils.unmuteScheduledMessages.callCount).to.equal(0);
        });
      });

      it('should save mute state in all descendant contacts, except ones that are already muted', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'mute',
          type: 'data_record',
          fields: {
            place_id: 'place_uuid'
          }
        };

        utils.getReportsBySubject.resolves([]);
        db.medic.allDocs
          .withArgs(sinon.match.has('key')).resolves({ rows: [{ id: 'place_uuid' }] })
          .withArgs(sinon.match.has('keys')).resolves({ rows: [
            { doc: { _id: 'place_uuid', place_id: 'place_id' }},
            { doc: { _id: 'contact1', patient_id: 'patient1' } },
            { doc: { _id: 'contact2', patient_id: 'patient2' } },
            { doc: { _id: 'contact3', patient_id: 'patient3', muted: true } },
            { doc: { _id: 'contact4', patient_id: 'patient4' } },
            { doc: { _id: 'contact5', patient_id: 'patient5', muted: true } },
          ]});

        transition._lineage.fetchHydratedDoc.resolves({ _id: 'place_uuid' });
        db.medic.bulkDocs.resolves();
        db.medic.query.resolves({
          rows: [
            { id: 'place_uuid', value: null },
            { id: 'contact1', value: 'patient1' },
            { id: 'contact2', value: 'patient2' },
            { id: 'contact3', value: 'patient3' },
            { id: 'contact4', value: 'patient4' },
            { id: 'contact5', value: 'patient5' }
          ]
        });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: 'place_uuid' }]);
          chai.expect(db.medic.allDocs.args[1]).to.deep.equal([
            { keys: ['place_uuid', 'contact1', 'contact2', 'contact3', 'contact4', 'contact5'], include_docs: true }
          ]);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['place_uuid'] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['place_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
            { _id: 'place_uuid', muted: true, place_id: 'place_id' },
            { _id: 'contact1', patient_id: 'patient1', muted: true },
            { _id: 'contact2', patient_id: 'patient2', muted: true },
            { _id: 'contact4', patient_id: 'patient4', muted: true }
          ]]);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal([
            'place_uuid', 'place_id', 'contact1','patient1', 'contact2', 'patient2',
            'contact3', 'patient3', 'contact4', 'patient4','contact5', 'patient5'
          ]);
          chai.expect(utils.muteScheduledMessages.callCount).to.equal(0);
          chai.expect(utils.unmuteScheduledMessages.callCount).to.equal(0);
        });
      });

      it('should update all registrations that have affected scheduled tasks', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'mute',
          type: 'data_record',
          fields: {
            place_id: 'place_uuid'
          }
        };

        utils.getReportsBySubject.resolves([
          { _id: 'r1', hasTasks: true },
          { _id: 'r2', hasTasks: false },
          { _id: 'r3', hasTasks: true },
          { _id: 'r4', hasTasks: false },
          { _id: 'r5', hasTasks: true }
        ]);
        utils.muteScheduledMessages.callsFake(registration => {
          if (registration.hasTasks) {
            registration.mutedTasks = true;
            return true;
          }
        });
        db.medic.allDocs
          .withArgs(sinon.match.has('key')).resolves({ rows: [{ id: 'place_uuid' }] })
          .withArgs(sinon.match.has('keys')).resolves({ rows: [
            { doc: { _id: 'place_uuid', place_id: 'place_id' }},
            { doc: { _id: 'contact1', patient_id: 'patient1' } },
            { doc: { _id: 'contact2', patient_id: 'patient2' } }
          ]});

        transition._lineage.fetchHydratedDoc.resolves({ _id: 'place_uuid' });
        db.medic.bulkDocs.resolves();
        db.medic.query.resolves({
          rows: [
            { id: 'place_uuid', value: null },
            { id: 'contact1', value: 'patient1' },
            { id: 'contact2', value: 'patient2' }
          ]
        });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: 'place_uuid' }]);
          chai.expect(db.medic.allDocs.args[1]).to.deep.equal([
            { keys: ['place_uuid', 'contact1', 'contact2'], include_docs: true }
          ]);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['place_uuid'] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['place_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(2);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
            { _id: 'place_uuid', muted: true, place_id: 'place_id' },
            { _id: 'contact1', patient_id: 'patient1', muted: true },
            { _id: 'contact2', patient_id: 'patient2', muted: true },
          ]]);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal([
            'place_uuid', 'place_id', 'contact1', 'patient1', 'contact2', 'patient2'
          ]);
          chai.expect(db.medic.bulkDocs.args[1]).to.deep.equal([[
            { _id: 'r1', hasTasks: true, mutedTasks: true },
            { _id: 'r3', hasTasks: true, mutedTasks: true },
            { _id: 'r5', hasTasks: true, mutedTasks: true }
          ]]);
          chai.expect(utils.muteScheduledMessages.callCount).to.equal(5);
          chai.expect(utils.unmuteScheduledMessages.callCount).to.equal(0);
        });
      });

      it('should not update registrations if none are affected', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'mute',
          type: 'data_record',
          fields: {
            place_id: 'place_uuid'
          }
        };

        utils.getReportsBySubject.resolves([
          { _id: 'r1' },
          { _id: 'r2' },
          { _id: 'r3' },
          { _id: 'r4' },
          { _id: 'r5' }
        ]);
        utils.muteScheduledMessages.returns(false);
        db.medic.allDocs
          .withArgs(sinon.match.has('key')).resolves({ rows: [{ id: 'place_uuid' }] })
          .withArgs(sinon.match.has('keys')).resolves({ rows: [
            { doc: { _id: 'place_uuid' }},
            { doc: { _id: 'contact1', patient_id: 'patient1' } },
            { doc: { _id: 'contact2', patient_id: 'patient2' } }
          ]});

        transition._lineage.fetchHydratedDoc.resolves({ _id: 'place_uuid' });
        db.medic.bulkDocs.resolves();
        db.medic.query.resolves({
          rows: [
            { id: 'place_uuid', value: null },
            { id: 'contact1', value: 'patient1' },
            { id: 'contact2', value: 'patient2' }
          ]
        });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: 'place_uuid' }]);
          chai.expect(db.medic.allDocs.args[1]).to.deep.equal([
            { keys: ['place_uuid', 'contact1', 'contact2'], include_docs: true }
          ]);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['place_uuid'] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['place_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
            { _id: 'place_uuid', muted: true },
            { _id: 'contact1', patient_id: 'patient1', muted: true },
            { _id: 'contact2', patient_id: 'patient2', muted: true },
          ]]);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal([
            'place_uuid', 'contact1', 'patient1', 'contact2', 'patient2'
          ]);
          chai.expect(utils.muteScheduledMessages.callCount).to.equal(5);
          chai.expect(utils.unmuteScheduledMessages.callCount).to.equal(0);
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
          type: 'data_record',
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

      it('should save mute state in the doc', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'unmute',
          type: 'data_record',
          fields: {
            place_id: 'place_uuid'
          }
        };

        utils.getReportsBySubject.resolves([]);
        db.medic.allDocs
          .withArgs(sinon.match.has('key')).resolves({ rows: [{ id: 'place_uuid' }] })
          .withArgs(sinon.match.has('keys')).resolves({ rows: [{ doc: { _id: 'place_uuid', muted: true }}] });

        transition._lineage.fetchHydratedDoc.resolves({ _id: 'place_uuid', muted: true });
        db.medic.bulkDocs.resolves();
        db.medic.query.resolves({ rows: [{ id: 'place_uuid', value: null }] });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: 'place_uuid' }]);
          chai.expect(db.medic.allDocs.args[1]).to.deep.equal([{ keys: ['place_uuid'], include_docs: true }]);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['place_uuid'] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['place_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[{ _id: 'place_uuid', muted: false }]]);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal(['place_uuid']);
          chai.expect(utils.muteScheduledMessages.callCount).to.equal(0);
          chai.expect(utils.unmuteScheduledMessages.callCount).to.equal(0);
        });
      });

      it('should save mute state in all descendant contacts', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'unmute',
          type: 'data_record',
          fields: {
            place_id: 'place_uuid'
          }
        };

        utils.getReportsBySubject.resolves([]);
        db.medic.allDocs
          .withArgs(sinon.match.has('key')).resolves({ rows: [{ id: 'place_uuid' }] })
          .withArgs(sinon.match.has('keys')).resolves({ rows: [
            { doc: { _id: 'place_uuid', muted: true }},
            { doc: { _id: 'contact1', patient_id: 'patient1' } },
            { doc: { _id: 'contact2', patient_id: 'patient2' } },
            { doc: { _id: 'contact3', patient_id: 'patient3', muted: true } },
            { doc: { _id: 'contact4', patient_id: 'patient4' } },
            { doc: { _id: 'contact5', patient_id: 'patient5', muted: true } },
          ]});

        transition._lineage.fetchHydratedDoc.resolves({ _id: 'place_uuid', muted: true });
        db.medic.bulkDocs.resolves();
        db.medic.query.resolves({
          rows: [
            { id: 'place_uuid', value: null },
            { id: 'contact1', value: 'patient1' },
            { id: 'contact2', value: 'patient2' },
            { id: 'contact3', value: 'patient3' },
            { id: 'contact4', value: 'patient4' },
            { id: 'contact5', value: 'patient5' }
          ]
        });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: 'place_uuid' }]);
          chai.expect(db.medic.allDocs.args[1]).to.deep.equal([
            { keys: ['place_uuid', 'contact1', 'contact2', 'contact3', 'contact4', 'contact5'], include_docs: true }
          ]);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['place_uuid'] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['place_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
            { _id: 'place_uuid', muted: false },
            { _id: 'contact3', patient_id: 'patient3', muted: false },
            { _id: 'contact5', patient_id: 'patient5', muted: false }
          ]]);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal([
            'place_uuid', 'contact1', 'patient1', 'contact2', 'patient2',
            'contact3', 'patient3', 'contact4', 'patient4', 'contact5', 'patient5'
          ]);
          chai.expect(utils.muteScheduledMessages.callCount).to.equal(0);
          chai.expect(utils.unmuteScheduledMessages.callCount).to.equal(0);
        });
      });

      it('should update all registrations that have affected scheduled tasks', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'unmute',
          type: 'data_record',
          fields: {
            place_id: 'place_uuid'
          }
        };

        utils.getReportsBySubject.resolves([
          { _id: 'r1', hasTasks: true },
          { _id: 'r2', hasTasks: false },
          { _id: 'r3', hasTasks: true },
          { _id: 'r4', hasTasks: false },
          { _id: 'r5', hasTasks: true }
        ]);
        utils.unmuteScheduledMessages.callsFake(registration => {
          if (registration.hasTasks) {
            registration.unmutedTasks = true;
            return true;
          }
        });
        db.medic.allDocs
          .withArgs(sinon.match.has('key')).resolves({ rows: [{ id: 'place_uuid' }] })
          .withArgs(sinon.match.has('keys')).resolves({ rows: [
            { doc: { _id: 'place_uuid', muted: true }},
            { doc: { _id: 'contact1', patient_id: 'patient1', muted: true } },
            { doc: { _id: 'contact2', patient_id: 'patient2', muted: true } }
          ]});

        transition._lineage.fetchHydratedDoc.resolves({ _id: 'place_uuid', muted: true });
        db.medic.bulkDocs.resolves();
        db.medic.query.resolves({
          rows: [
            { id: 'place_uuid', value: null },
            { id: 'contact1', value: 'patient1', muted: true },
            { id: 'contact2', value: 'patient2', muted: true }
          ]
        });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: 'place_uuid' }]);
          chai.expect(db.medic.allDocs.args[1]).to.deep.equal([
            { keys: ['place_uuid', 'contact1', 'contact2'], include_docs: true }
          ]);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['place_uuid'] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['place_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(2);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
            { _id: 'place_uuid', muted: false },
            { _id: 'contact1', patient_id: 'patient1', muted: false },
            { _id: 'contact2', patient_id: 'patient2', muted: false },
          ]]);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal([
            'place_uuid', 'contact1', 'patient1', 'contact2', 'patient2'
          ]);
          chai.expect(db.medic.bulkDocs.args[1]).to.deep.equal([[
            { _id: 'r1', hasTasks: true, unmutedTasks: true },
            { _id: 'r3', hasTasks: true, unmutedTasks: true },
            { _id: 'r5', hasTasks: true, unmutedTasks: true }
          ]]);
          chai.expect(utils.muteScheduledMessages.callCount).to.equal(0);
          chai.expect(utils.unmuteScheduledMessages.callCount).to.equal(5);
        });
      });

      it('should not update registrations if none are affected', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'unmute',
          type: 'data_record',
          fields: {
            place_id: 'place_uuid'
          }
        };

        utils.getReportsBySubject.resolves([
          { _id: 'r1' },
          { _id: 'r2' },
          { _id: 'r3' },
          { _id: 'r4' },
          { _id: 'r5' }
        ]);
        utils.unmuteScheduledMessages.returns(false);
        db.medic.allDocs
          .withArgs(sinon.match.has('key')).resolves({ rows: [{ id: 'place_uuid' }] })
          .withArgs(sinon.match.has('keys')).resolves({ rows: [
            { doc: { _id: 'place_uuid', muted: true }},
            { doc: { _id: 'contact1', patient_id: 'patient1', muted: true } },
            { doc: { _id: 'contact2', patient_id: 'patient2', muted: true } }
          ]});

        transition._lineage.fetchHydratedDoc.resolves({ _id: 'place_uuid', muted: true });
        db.medic.bulkDocs.resolves();
        db.medic.query.resolves({
          rows: [
            { id: 'place_uuid', value: null },
            { id: 'contact1', value: 'patient1' },
            { id: 'contact2', value: 'patient2' }
          ]
        });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: 'place_uuid' }]);
          chai.expect(db.medic.allDocs.args[1]).to.deep.equal([
            { keys: ['place_uuid', 'contact1', 'contact2'], include_docs: true }
          ]);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['place_uuid'] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['place_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
            { _id: 'place_uuid', muted: false },
            { _id: 'contact1', patient_id: 'patient1', muted: false },
            { _id: 'contact2', patient_id: 'patient2', muted: false },
          ]]);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal([
            'place_uuid', 'contact1', 'patient1', 'contact2', 'patient2'
          ]);
          chai.expect(utils.muteScheduledMessages.callCount).to.equal(0);
          chai.expect(utils.unmuteScheduledMessages.callCount).to.equal(5);
        });
      });

      it('should cascade the unmuting upwards if target has muted lineage', () => {
        config.get.returns({ mute_forms: ['mute'], unmute_forms: ['unmute'] });
        const doc = {
          form: 'unmute',
          type: 'data_record',
          fields: {
            place_id: 'place_uuid'
          }
        };

        utils.getReportsBySubject.resolves([
          { _id: 'r1', hasTasks: true },
          { _id: 'r2', hasTasks: false },
          { _id: 'r3', hasTasks: true },
          { _id: 'r4', hasTasks: false },
          { _id: 'r5', hasTasks: true }
        ]);
        utils.unmuteScheduledMessages.callsFake(registration => {
          if (registration.hasTasks) {
            registration.unmutedTasks = true;
            return true;
          }
        });
        db.medic.allDocs
          .withArgs(sinon.match.has('key')).resolves({ rows: [{ id: 'place_uuid' }] })
          .withArgs(sinon.match.has('keys')).resolves({ rows: [
            { doc: { _id: 'p2', muted: true } },
            { doc: { _id: 'p1', muted: true } },
            { doc: { _id: 'place_uuid', muted: true, parent: { _id: 'p1' }}},
            { doc: { _id: 'sibling1', muted: true }},
            { doc: { _id: 'sibling2', muted: true }},
            { doc: { _id: 'contact1', patient_id: 'patient1', muted: true } },
            { doc: { _id: 'contact2', patient_id: 'patient2', muted: true } },
            { doc: { _id: 'contact3', patient_id: 'patient3', muted: true } },
          ]});

        transition._lineage.fetchHydratedDoc.resolves({
          _id: 'place_uuid',
          muted: true,
          parent: {
            _id: 'p1',
            muted: true,
            parent: {
              _id: 'p2',
              muted: true,
              parent: {
                _id: 'p3',
                parent: {
                  _id: 'p4'
                }
              }
            }
          }
        });

        db.medic.bulkDocs.resolves();
        db.medic.query.resolves({
          rows: [
            { id: 'p2', value: null },
            { id: 'p1', value: null },
            { id: 'place_uuid', value: null },
            { id: 'sibling1', value: null },
            { id: 'sibling2', value: null },
            { id: 'contact1', value: 'patient1' },
            { id: 'contact2', value: 'patient2' },
            { id: 'contact3', value: 'patient3' }
          ]
        });

        return transition.onMatch({ doc }).then(result => {
          chai.expect(result).to.equal(true);
          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: 'place_uuid' }]);
          chai.expect(db.medic.allDocs.args[1]).to.deep.equal([{
            keys: ['p2', 'p1', 'place_uuid', 'sibling1', 'sibling2', 'contact1', 'contact2', 'contact3'],
            include_docs: true
          }]);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['p2'] }]);
          chai.expect(transition._lineage.fetchHydratedDoc.callCount).to.equal(1);
          chai.expect(transition._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['place_uuid']);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(2);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
            { _id: 'p2', muted: false },
            { _id: 'p1', muted: false },
            { _id: 'place_uuid', muted: false, parent: { _id: 'p1' }},
            { _id: 'sibling1', muted: false },
            { _id: 'sibling2', muted: false },
            { _id: 'contact1', patient_id: 'patient1', muted: false },
            { _id: 'contact2', patient_id: 'patient2', muted: false },
            { _id: 'contact3', patient_id: 'patient3', muted: false },
          ]]);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal([
            'p2', 'p1', 'place_uuid', 'sibling1', 'sibling2',
            'contact1', 'patient1', 'contact2', 'patient2', 'contact3', 'patient3'
          ]);
          chai.expect(db.medic.bulkDocs.args[1]).to.deep.equal([[
            { _id: 'r1', hasTasks: true, unmutedTasks: true },
            { _id: 'r3', hasTasks: true, unmutedTasks: true },
            { _id: 'r5', hasTasks: true, unmutedTasks: true }
          ]]);
          chai.expect(utils.muteScheduledMessages.callCount).to.equal(0);
          chai.expect(utils.unmuteScheduledMessages.callCount).to.equal(5);
        });
      });
    });
  });*/
});
