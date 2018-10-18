const mutingUtils = require('../../../src/lib/muting_utils'),
      sinon = require('sinon'),
      chai = require('chai'),
      db = require('../../../src/db-pouch'),
      utils = require('../../../src/lib/utils');

let clock;

describe('mutingUtils', () => {
  beforeEach(() => {
    sinon.stub(utils, 'getReportsBySubject');
    sinon.stub(utils, 'muteScheduledMessages');
    sinon.stub(utils, 'unmuteScheduledMessages');
    sinon.stub(mutingUtils._lineage, 'fetchHydratedDoc');
    sinon.stub(db.medic, 'bulkDocs');
    sinon.stub(db.medic, 'query');
    sinon.stub(db.medic, 'allDocs');

    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('getContact', () => {
    it('should query allDocs with patient_id field', () => {
      const contact = { _id: 'my-contact-id', some: 'data' },
            doc = { fields: { patient_id: contact._id } };

      db.medic.allDocs.resolves({ rows: [{ id: contact._id }] });
      mutingUtils._lineage.fetchHydratedDoc.resolves(contact);

      return mutingUtils.getContact(doc).then(result => {
        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: contact._id }]);
        chai.expect(db.medic.query.callCount).to.equal(0);
        chai.expect(result).to.deep.equal(contact);
        chai.expect(mutingUtils._lineage.fetchHydratedDoc.callCount).to.equal(1);
        chai.expect(mutingUtils._lineage.fetchHydratedDoc.args[0]).to.deep.equal([contact._id]);
      });
    });

    it('should query allDocs with place_id field', () => {
      const contact = { _id: 'my-contact-id', some: 'data' },
            doc = { fields: { place_id: contact._id } };
      db.medic.allDocs.resolves({ rows: [{ id: contact._id }] });
      mutingUtils._lineage.fetchHydratedDoc.resolves(contact);

      return mutingUtils.getContact(doc).then(result => {
        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: contact._id }]);
        chai.expect(db.medic.query.callCount).to.equal(0);
        chai.expect(result).to.deep.equal(contact);
        chai.expect(mutingUtils._lineage.fetchHydratedDoc.callCount).to.equal(1);
        chai.expect(mutingUtils._lineage.fetchHydratedDoc.args[0]).to.deep.equal([contact._id]);
      });
    });

    it('should query allDocs with patient_uuid field', () => {
      const contact = { _id: 'my-contact-id', some: 'data' },
            doc = { fields: { patient_uuid: contact._id } };
      db.medic.allDocs.resolves({ rows: [{ id: contact._id }] });
      mutingUtils._lineage.fetchHydratedDoc.resolves(contact);

      return mutingUtils.getContact(doc).then(result => {
        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: contact._id }]);
        chai.expect(db.medic.query.callCount).to.equal(0);
        chai.expect(result).to.deep.equal(contact);
        chai.expect(mutingUtils._lineage.fetchHydratedDoc.callCount).to.equal(1);
        chai.expect(mutingUtils._lineage.fetchHydratedDoc.args[0]).to.deep.equal([contact._id]);
      });
    });

    it('should search by reference when not ID field', () => {
      const contact = { _id: 'my-contact-id', some: 'data', patient_id: 'patient_id' },
            doc = { fields: { patient_id: contact.patient_id } };
      db.medic.allDocs.resolves({ rows: [] });
      db.medic.query.resolves({ rows: [{ id: contact._id }] });
      mutingUtils._lineage.fetchHydratedDoc.resolves(contact);

      return mutingUtils.getContact(doc).then(result => {
        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ key: contact.patient_id }]);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0])
          .to.deep.equal(['medic-client/contacts_by_reference', { key: ['shortcode', contact.patient_id] }]);
        chai.expect(result).to.deep.equal(contact);
        chai.expect(mutingUtils._lineage.fetchHydratedDoc.callCount).to.equal(1);
        chai.expect(mutingUtils._lineage.fetchHydratedDoc.args[0]).to.deep.equal([contact._id]);
      });
    });

    it('should throw allDocs errors', () => {
      db.medic.allDocs.rejects({ some: 'error' });

      return mutingUtils
        .getContact({ fields: { patient_id: 'aaa' } })
        .then(() => chai.expect(true).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          chai.expect(db.medic.allDocs.callCount).to.equal(1);
        });
    });

    it('should throw query errors', () => {
      db.medic.allDocs.resolves({ rows: [] });
      db.medic.query.rejects({ some: 'error' });

      return mutingUtils
        .getContact({ fields: { patient_id: 'aaa' } })
        .then(() => chai.expect(true).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          chai.expect(db.medic.allDocs.callCount).to.equal(1);
          chai.expect(db.medic.query.callCount).to.equal(1);
        });
    });

    it('should throw lineage errors', () => {
      db.medic.allDocs.resolves({ rows: [{ id: 'a' }] });
      mutingUtils._lineage.fetchHydratedDoc.rejects({ some: 'error' });

      return mutingUtils
        .getContact({ fields: { patient_id: 'aaa' } })
        .then(() => chai.expect(true).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          chai.expect(db.medic.allDocs.callCount).to.equal(1);
          chai.expect(db.medic.query.callCount).to.equal(0);
        });
    });

    it('should throw when no contact is found', () => {
      db.medic.allDocs.resolves({ rows: [] });
      db.medic.query.resolves({ rows: [] });

      return mutingUtils
        .getContact({ fields: { patient_id: 'aaa' } })
        .then(() => chai.expect(true).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err.message).to.equal('contact_not_found');
          chai.expect(db.medic.allDocs.callCount).to.equal(1);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(mutingUtils._lineage.fetchHydratedDoc.callCount).to.equal(0);
        });
    });

    it('should fetch the first query result', () => {
      db.medic.allDocs.resolves({ rows: [] });
      db.medic.query.resolves({ rows: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
      mutingUtils._lineage.fetchHydratedDoc.resolves({ _id: 'a' });

      return mutingUtils.getContact({ fields: { patient_id: 'a' } }).then(result => {
        chai.expect(result).to.deep.equal({ _id: 'a' });
        chai.expect(mutingUtils._lineage.fetchHydratedDoc.args[0]).to.deep.equal(['a']);
      });
    });
  });

  describe('updateRegistrations', () => {
    it('should do nothing if no patientIds are supplied', () => {
      return mutingUtils.updateRegistrations([], true).then(result => {
        chai.expect(result).to.deep.equal([]);
        chai.expect(utils.getReportsBySubject.callCount).to.equal(0);
      });
    });

    it('should request registrations for provided patientIds', () => {
      const patientIds = ['1', '2', '3', '4'];
      utils.getReportsBySubject.resolves([]);

      return mutingUtils.updateRegistrations(patientIds, true).then(result => {
        chai.expect(result).to.deep.equal([]);
        chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
        chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal(patientIds);
      });
    });

    it('should mute scheduled messages in registrations', () => {
      utils.getReportsBySubject.resolves([
        { _id: 'r1', shouldUpdate: true },
        { _id: 'r2', shouldUpdate: false },
        { _id: 'r3', shouldUpdate: false },
        { _id: 'r4', shouldUpdate: true }
      ]);

      utils.muteScheduledMessages.callsFake(r => {
        r.willUpdate = true;
        return r.shouldUpdate;
      });

      db.medic.bulkDocs.resolves();

      return mutingUtils.updateRegistrations(['a'], true).then(result => {
        chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
        chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal(['a']);
        chai.expect(utils.muteScheduledMessages.callCount).to.equal(4);
        chai.expect(utils.muteScheduledMessages.args[0][0]._id).to.equal('r1');
        chai.expect(utils.muteScheduledMessages.args[1][0]._id).to.equal('r2');
        chai.expect(utils.muteScheduledMessages.args[2][0]._id).to.equal('r3');
        chai.expect(utils.muteScheduledMessages.args[3][0]._id).to.equal('r4');
        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id: 'r1', shouldUpdate: true, willUpdate: true },
          { _id: 'r4', shouldUpdate: true, willUpdate: true }
        ]]);

        chai.expect(result).to.deep.equal([
          { _id: 'r1', shouldUpdate: true, willUpdate: true },
          { _id: 'r4', shouldUpdate: true, willUpdate: true }
        ]);
      });
    });

    it('should unmute scheduled messages in registrations', () => {
      utils.getReportsBySubject.resolves([
        { _id: 'r1', shouldUpdate: true },
        { _id: 'r2', shouldUpdate: false },
        { _id: 'r3', shouldUpdate: false },
        { _id: 'r4', shouldUpdate: true }
      ]);

      utils.unmuteScheduledMessages.callsFake(r => {
        r.willUpdate = true;
        return r.shouldUpdate;
      });

      db.medic.bulkDocs.resolves();

      return mutingUtils.updateRegistrations(['a'], false).then(result => {
        chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
        chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal(['a']);
        chai.expect(utils.unmuteScheduledMessages.callCount).to.equal(4);
        chai.expect(utils.unmuteScheduledMessages.args[0][0]._id).to.equal('r1');
        chai.expect(utils.unmuteScheduledMessages.args[1][0]._id).to.equal('r2');
        chai.expect(utils.unmuteScheduledMessages.args[2][0]._id).to.equal('r3');
        chai.expect(utils.unmuteScheduledMessages.args[3][0]._id).to.equal('r4');
        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id: 'r1', shouldUpdate: true, willUpdate: true },
          { _id: 'r4', shouldUpdate: true, willUpdate: true }
        ]]);

        chai.expect(result).to.deep.equal([
          { _id: 'r1', shouldUpdate: true, willUpdate: true },
          { _id: 'r4', shouldUpdate: true, willUpdate: true }
        ]);
      });
    });

    it('should not call bulkDocs when no registrations need updating', () => {
      utils.getReportsBySubject.resolves([{ _id: 'r1' }, { _id: 'r2' }, { _id: 'r3' }, { _id: 'r4' }]);
      utils.muteScheduledMessages.returns(false);

      return mutingUtils.updateRegistrations(['a'], true).then(result => {
        chai.expect(result).to.deep.equal([]);
        chai.expect(db.medic.bulkDocs.callCount).to.equal(0);
        chai.expect(utils.muteScheduledMessages.callCount).to.equal(4);
        chai.expect(utils.muteScheduledMessages.args[0][0]._id).to.equal('r1');
        chai.expect(utils.muteScheduledMessages.args[1][0]._id).to.equal('r2');
        chai.expect(utils.muteScheduledMessages.args[2][0]._id).to.equal('r3');
        chai.expect(utils.muteScheduledMessages.args[3][0]._id).to.equal('r4');
      });
    });

    it('should throw bulkDocs errors', () => {
      utils.getReportsBySubject.resolves([{ _id: 'r1' }]);
      utils.muteScheduledMessages.returns(true);
      db.medic.bulkDocs.rejects({ some: 'err' });

      return mutingUtils.updateRegistrations(['a'], true)
        .then(() => chai.expect(false).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal(['a']);
          chai.expect(utils.muteScheduledMessages.callCount).to.equal(1);
          chai.expect(utils.muteScheduledMessages.args[0]).to.deep.equal([{ _id: 'r1' }]);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        });
    });
  });

  describe('updateContacts', () => {
    it('should update all contacts with mute state', () => {
      const timestamp = 2500;
      clock.tick(timestamp);

      const contacts = [ { _id:  'a' }, { _id:  'b' }, { _id:  'c' } ];
      db.medic.bulkDocs.resolves();
      return mutingUtils._updateContacts(contacts, true).then(() => {
        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id:  'a', muted: timestamp }, { _id:  'b', muted: timestamp }, { _id:  'c', muted: timestamp }
        ]]);
      });
    });

    it('should update all contacts with unmute state', () => {
      const contacts = [ { _id:  'a', muted: true }, { _id:  'b', muted: 123 }, { _id:  'c', muted: 'something' } ];
      db.medic.bulkDocs.resolves();
      return mutingUtils._updateContacts(contacts, false).then(() => {
        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id:  'a', muted: false }, { _id:  'b', muted: false }, { _id:  'c', muted: false }
        ]]);
      });
    });

    it('should only update contacts with different muted state', () => {
      const timestamp = 65000;
      clock.tick(timestamp);

      const contacts = [
        { _id: 'a' },
        { _id: 'b', muted: true },
        { _id: 'c', muted: null },
        { _id: 'd', muted: 0 },
        { _id: 'f', muted: 12354 }
      ];
      db.medic.bulkDocs.resolves();
      return mutingUtils._updateContacts(contacts, true).then(() => {
        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id:  'a', muted: timestamp },
          { _id:  'c', muted: timestamp },
          { _id:  'd', muted: timestamp }
        ]]);
      });
    });

    it('should only update contacts with different muted state', () => {
      const contacts = [
        { _id:  'a' },
        { _id:  'b', muted: true },
        { _id:  'c', muted: false },
        { _id:  'd', muted: null },
        { _id:  'e', muted: 123443 }
      ];
      db.medic.bulkDocs.resolves();
      return mutingUtils._updateContacts(contacts, false).then(() => {
        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id:  'b', muted: false },
          { _id:  'e', muted: false },
        ]]);
      });
    });

    it('should not call bulkDocs if contacts are empty', () => {
      chai.expect(mutingUtils._updateContacts([], true)).to.equal(undefined);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(0);
    });

    it('should not call bulkDocs if all contacts are in correct state', () => {
      const contacts = [ { _id:  'a' }, { _id:  'b' }, { _id:  'c', muted: false } ];
      chai.expect(mutingUtils._updateContacts(contacts, false)).to.equal(undefined);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(0);
    });

    it('should throw bulkDocs errors', () => {
      clock.tick(25);
      db.medic.bulkDocs.rejects({ some: 'error' });
      return mutingUtils._updateContacts([{ _id: 'a'}], true)
        .then(() => chai.expect(false).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[{ _id: 'a', muted: 25 }]]);
        });
    });
  });

  describe('updateMuteState', () => {
    it('should update all non-muted descendants when muting', () => {
      const timestamp = 456789;
      clock.tick(timestamp);
      const hydratedContact = {
        _id: 'my-place',
        muted: false,
        parent: { _id: 'p1', parent: { _id: 'p2' }}
      };

      const contacts = [
        { _id: 'my-place', muted: false, place_id: 'my-place-id'},
        { _id: 'my-place2', muted: false },
        { _id: 'my-place3', place_id: 'place3' },
        { _id: 'contact1', patient_id: 'patient1' },
        { _id: 'contact2', patient_id: 'patient2' },
        { _id: 'contact3', patient_id: 'patient3' },
        { _id: 'my-place4', muted: 657 },
        { _id: 'contact4', muted: 123 }
      ];

      db.medic.query.resolves({ rows: [
          { id: 'my-place', value: null },
          { id: 'my-place2', value: null },
          { id: 'my-place3', value: null },
          { id: 'my-place4', value: null },
          { id: 'contact1', value: 'patient1' },
          { id: 'contact2', value: 'patient2' },
          { id: 'contact3', value: 'patient3' },
          { id: 'contact4', value: 'patient4' },
        ]});

      db.medic.allDocs.resolves({ rows: contacts.map(doc => ({ id: doc._id, doc: doc }))});
      utils.getReportsBySubject.resolves([]);
      db.medic.bulkDocs.resolves();

      return mutingUtils.updateMuteState(hydratedContact, true).then(result => {
        chai.expect(result).to.equal(true);
        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id: 'my-place', muted: timestamp, place_id: 'my-place-id'},
          { _id: 'my-place2', muted: timestamp },
          { _id: 'my-place3', place_id: 'place3', muted: timestamp },
          { _id: 'contact1', patient_id: 'patient1', muted: timestamp },
          { _id: 'contact2', patient_id: 'patient2', muted: timestamp },
          { _id: 'contact3', patient_id: 'patient3', muted: timestamp }
        ]]);

        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['my-place'] }]);

        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{
          keys: [ 'my-place', 'my-place2', 'my-place3', 'my-place4', 'contact1', 'contact2', 'contact3', 'contact4' ],
          include_docs: true
        }]);
        chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
        chai.expect(utils.getReportsBySubject.args[0]).to.deep.equal([{
          db: db.medic,
          ids: [
            'my-place', 'my-place-id', 'my-place2', 'my-place3', 'place3',
            'contact1', 'patient1', 'contact2', 'patient2', 'contact3', 'patient3',
            'my-place4', 'contact4'
          ],
          registrations: true
        }]);
      });
    });

    it('should update all descendants when unmuting and no ancestors are muted', () => {
      const hydratedContact = {
        _id: 'my-place',
        muted: true,
        parent: { _id: 'p1', parent: { _id: 'p2' }}
      };

      const contacts = [
        { _id: 'my-place', muted: 123, place_id: 'my-place1' },
        { _id: 'my-place2', muted: 456 },
        { _id: 'my-place3' },
        { _id: 'contact1', patient_id: 'patient1' },
        { _id: 'contact2', patient_id: 'patient2' },
        { _id: 'contact3', patient_id: 'patient3' },
        { _id: 'my-place4', muted: 789 },
        { _id: 'contact4', muted: true, patient_id: 'patient4' }
      ];

      db.medic.query.resolves({ rows: [
          { id: 'my-place', value: null },
          { id: 'my-place2', value: null },
          { id: 'my-place3', value: null },
          { id: 'my-place4', value: null },
          { id: 'contact1', value: 'patient1' },
          { id: 'contact2', value: 'patient2' },
          { id: 'contact3', value: 'patient3' },
          { id: 'contact4', value: 'patient4' },
        ]});

      db.medic.allDocs.resolves({ rows: contacts.map(doc => ({ id: doc._id, doc: doc }))});
      utils.getReportsBySubject.resolves([]);
      db.medic.bulkDocs.resolves();

      return mutingUtils.updateMuteState(hydratedContact, false).then(result => {
        chai.expect(result).to.equal(true);

        chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
        chai.expect(utils.getReportsBySubject.args[0]).to.deep.equal([{
          db: db.medic,
          ids: [
            'my-place', 'my-place1', 'my-place2', 'my-place3',
            'contact1', 'patient1', 'contact2', 'patient2',
            'contact3', 'patient3', 'my-place4', 'contact4', 'patient4'
          ],
          registrations: true
        }]);

        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id: 'my-place', muted: false, place_id: 'my-place1' },
          { _id: 'my-place2', muted: false },
          { _id: 'my-place4', muted: false },
          { _id: 'contact4', muted: false, patient_id: 'patient4' }
        ]]);

        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['my-place'] }]);

        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{
          keys: [ 'my-place', 'my-place2', 'my-place3', 'my-place4', 'contact1', 'contact2', 'contact3', 'contact4' ],
          include_docs: true
        }]);
      });
    });

    it('should update all descendants of topmost muted ancestor when unmuting', () => {
      const hydratedPlace = {
        _id: 'my-place',
        muted: true,
        parent: {
          _id: 'p1',
          muted: true,
          parent: {
            _id: 'p2',
            muted: true,
            parent: {
              _id: 'p3'
            }
          }
        }
      };

      const contacts = [
        { _id: 'p2', muted: 123 },
        { _id: 'p1', muted: 456 },
        { _id: 'my-place', muted: true },
        { _id: 'contact1', muted: true, patient_id: 'patient1' },
        { _id: 'contact2', muted: true, patient_id: 'patient2' }
      ];

      db.medic.query.resolves({ rows: [
          { id: 'p2', value: null },
          { id: 'p1', value: null },
          { id: 'my-place', value: null },
          { id: 'contact1', value: 'patient1' },
          { id: 'contact2', value: 'patient2' }
        ]});

      db.medic.allDocs.resolves({ rows: contacts.map(doc => ({ id: doc._id, doc: doc }))});
      utils.getReportsBySubject.resolves([]);
      db.medic.bulkDocs.resolves();

      return mutingUtils.updateMuteState(hydratedPlace, false).then(result => {
        chai.expect(result).to.equal(true);

        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id: 'p2', muted: false },
          { _id: 'p1', muted: false },
          { _id: 'my-place', muted: false },
          { _id: 'contact1', muted: false, patient_id: 'patient1' },
          { _id: 'contact2', muted: false, patient_id: 'patient2' }
        ]]);

        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['p2'] }]);

        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{
          keys: [ 'p2', 'p1', 'my-place', 'contact1', 'contact2' ],
          include_docs: true
        }]);

        chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
        chai.expect(utils.getReportsBySubject.args[0]).to.deep.equal([{
          db: db.medic,
          ids: [ 'p2', 'p1', 'my-place', 'contact1', 'patient1', 'contact2', 'patient2' ],
          registrations: true
        }]);
      });
    });

    it('should update all descendants registrations', () => {
      clock.tick(100);

      const contact = {
        _id: 'contact',
        patient_id: 'patient'
      };

      db.medic.query.resolves({ rows: [{ id: 'contact' }] });
      db.medic.allDocs.resolves({ rows: [{ doc: contact }] });
      utils.getReportsBySubject.resolves([
        { _id: 'r1' },
        { _id: 'r2' },
        { _id: 'r3' }
      ]);
      utils.muteScheduledMessages.returns(true);
      db.medic.bulkDocs.resolves();

      return mutingUtils.updateMuteState(contact, true).then(result => {
        chai.expect(result).to.equal(true);

        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['contact'] }]);

        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{
          keys: [ 'contact' ],
          include_docs: true
        }]);

        chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
        chai.expect(utils.getReportsBySubject.args[0]).to.deep.equal([{
          db: db.medic,
          ids: [ 'contact', 'patient' ],
          registrations: true
        }]);

        chai.expect(db.medic.bulkDocs.callCount).to.equal(2);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[{
          _id: 'contact',
          patient_id: 'patient',
          muted: 100
        }]]);
        chai.expect(db.medic.bulkDocs.args[1]).to.deep.equal([[
          { _id: 'r1' },
          { _id: 'r2' },
          { _id: 'r3' }
        ]]);
      });
    });

    it('should throw db query errors', () => {
      db.medic.query.rejects({ some: 'err' });

      return mutingUtils
        .updateMuteState({ _id: 'contact' }, true)
        .then(() => chai.expect(false).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
          chai.expect(db.medic.allDocs.callCount).to.equal(0);
          chai.expect(db.medic.query.callCount).to.equal(1);
        });
    });

    it('should throw db all docs errors', () => {
      db.medic.query.resolves({ rows: [{ id: 'contact' }] });
      db.medic.allDocs.rejects({ some: 'error' });

      return mutingUtils
        .updateMuteState({ _id: 'contact' }, true)
        .then(() => chai.expect(false).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          chai.expect(db.medic.allDocs.callCount).to.equal(1);
          chai.expect(db.medic.query.callCount).to.equal(1);
        });
    });

    it('should throw utils.getReportsBySubject errors', () => {
      db.medic.query.resolves({ rows: [{ id: 'contact' }] });
      db.medic.allDocs.resolves({ rows: [{ doc: { _id: 'contact' } }]});
      utils.getReportsBySubject.rejects({ some: 'error' });

      return mutingUtils
        .updateMuteState({ _id: 'contact' }, true)
        .then(() => chai.expect(false).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          chai.expect(db.medic.allDocs.callCount).to.equal(1);
          chai.expect(db.medic.query.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
        });
    });
  });

  describe('updateMuteState batching', () => {
    it('should batch contacts and registrations updates', () => {
      const timestamp = 5000;
      clock.tick(timestamp);
      const contactIds = Array.apply(null, Array(135)).map((x, i) => `contact${i}`);
      db.medic.query.resolves({ rows: contactIds.map(id => ({ id })) });
      db.medic.allDocs
        .onCall(0)
        .resolves({ rows: [
          { doc: { _id: 'a' }},
          { doc: { _id: 'b' }},
          { doc: { _id: 'c' }}
        ]})
        .onCall(1)
        .resolves({ rows: [
            { doc: { _id: 'd' }},
            { doc: { _id: 'e' }},
            { doc: { _id: 'f' }}
          ]})
        .onCall(2)
        .resolves({ rows: [
            { doc: { _id: 'g' }},
            { doc: { _id: 'h' }},
            { doc: { _id: 'i' }}
          ]});
      db.medic.bulkDocs.resolves();
      utils.getReportsBySubject
        .onCall(0)
        .resolves([
          { _id: 'r1' },
          { _id: 'r2' },
          { _id: 'r3' },
        ])
        .onCall(1)
        .resolves([
          { _id: 'r4' },
          { _id: 'r5' },
          { _id: 'r6' },
        ])
        .onCall(2)
        .resolves([
          { _id: 'r7' },
          { _id: 'r8' },
          { _id: 'r9' },
        ]);

      utils.muteScheduledMessages.returns(true);

      return mutingUtils.updateMuteState({ _id: 'contact' }, true).then(result => {
        chai.expect(result).to.equal(true);
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.callCount).to.equal(3);
        chai.expect(db.medic.bulkDocs.callCount).to.equal(6);

        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{
          keys: contactIds.slice(0, 50),
          include_docs: true
        }]);

        chai.expect(db.medic.allDocs.args[1]).to.deep.equal([{
          keys: contactIds.slice(50, 100),
          include_docs: true
        }]);

        chai.expect(db.medic.allDocs.args[2]).to.deep.equal([{
          keys: contactIds.slice(100, 135),
          include_docs: true
        }]);

        const requestedContacts = [].concat(
          db.medic.allDocs.args[0][0].keys,
          db.medic.allDocs.args[1][0].keys,
          db.medic.allDocs.args[2][0].keys
        );
        chai.expect(requestedContacts).to.deep.equal(contactIds);

        chai.expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([
          { _id: 'a', muted: timestamp },
          { _id: 'b', muted: timestamp },
          { _id: 'c', muted: timestamp }
        ]);
        chai.expect(db.medic.bulkDocs.args[2][0]).to.deep.equal([
          { _id: 'd', muted: timestamp },
          { _id: 'e', muted: timestamp },
          { _id: 'f', muted: timestamp }
        ]);
        chai.expect(db.medic.bulkDocs.args[4][0]).to.deep.equal([
          { _id: 'g', muted: timestamp },
          { _id: 'h', muted: timestamp },
          { _id: 'i', muted: timestamp }
        ]);

        chai.expect(db.medic.bulkDocs.args[1][0]).to.deep.equal([
          { _id: 'r1' },
          { _id: 'r2' },
          { _id: 'r3' }
        ]);
        chai.expect(db.medic.bulkDocs.args[3][0]).to.deep.equal([
          { _id: 'r4' },
          { _id: 'r5' },
          { _id: 'r6' }
        ]);
        chai.expect(db.medic.bulkDocs.args[5][0]).to.deep.equal([
          { _id: 'r7' },
          { _id: 'r8' },
          { _id: 'r9' }
        ]);
      });
    });

    it('should throw an error when one of the batches fetching fails', () => {
      const timestamp = 5000;
      clock.tick(timestamp);
      const contactIds = Array.apply(null, Array(175)).map((x, i) => `contact${i}`);
      db.medic.query.resolves({ rows: contactIds.map(id => ({ id })) });
      db.medic.allDocs
        .onCall(0)
        .resolves({ rows: [
            { doc: { _id: 'a' }},
            { doc: { _id: 'b' }},
            { doc: { _id: 'c' }}
          ]})
        .onCall(1)
        .resolves({ rows: [
            { doc: { _id: 'd' }},
            { doc: { _id: 'e' }},
            { doc: { _id: 'f' }}
          ]})
        .onCall(2).rejects({ some: 'error' });

      db.medic.bulkDocs.resolves();
      utils.getReportsBySubject
        .onCall(0)
        .resolves([
          { _id: 'r1' },
          { _id: 'r2' },
          { _id: 'r3' },
        ])
        .onCall(1)
        .resolves([
          { _id: 'r4' },
          { _id: 'r5' },
          { _id: 'r6' },
        ]);

      utils.muteScheduledMessages.returns(true);

      return mutingUtils
        .updateMuteState({ _id: 'contact' }, true)
        .then(() => chai.expect(true).to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });

          chai.expect(db.medic.allDocs.callCount).to.equal(3);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(2);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(4);
        });
    });

    it('should throw an error when one of the batches saving fails', () => {
      const timestamp = 5000;
      clock.tick(timestamp);
      const contactIds = Array.apply(null, Array(175)).map((x, i) => `contact${i}`);
      db.medic.query.resolves({ rows: contactIds.map(id => ({ id })) });
      db.medic.allDocs
        .onCall(0)
        .resolves({ rows: [
            { doc: { _id: 'a' }},
            { doc: { _id: 'b' }},
            { doc: { _id: 'c' }}
          ]})
        .onCall(1)
        .resolves({ rows: [
            { doc: { _id: 'd' }},
            { doc: { _id: 'e' }},
            { doc: { _id: 'f' }}
          ]});

      db.medic.bulkDocs
        .onCall(0).resolves()
        .onCall(1).resolves()
        .onCall(2).rejects({ some: 'error' });

      utils.getReportsBySubject
        .onCall(0)
        .resolves([
          { _id: 'r1' },
          { _id: 'r2' },
          { _id: 'r3' },
        ])
        .onCall(1)
        .resolves([
          { _id: 'r4' },
          { _id: 'r5' },
          { _id: 'r6' },
        ]);

      utils.muteScheduledMessages.returns(true);

      return mutingUtils
        .updateMuteState({ _id: 'contact' }, true)
        .then(() => chai.expect(true).to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });

          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(2);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(4);
        });
    });
  });

  describe('getContactsAndSubjectIds', () => {
    it('should return all contacts and subjectIds', () => {
      const ids = ['1', '2', '3', '4'];
      db.medic.allDocs.resolves({ rows: [
          { doc: { _id: '1', place_id: 'place_1' } },
          { doc: { _id: '2', patient_id: 'patient_2' } },
          { doc: { _id: '3' } },
          { doc: { _id: '4', patient_id: 'patient_4' } }
        ]});

      return mutingUtils._getContactsAndSubjectIds(ids).then(result => {
        chai.expect(result.contacts).to.deep.equal([
          { _id: '1', place_id: 'place_1' },
          { _id: '2', patient_id: 'patient_2' },
          { _id: '3' },
          { _id: '4', patient_id: 'patient_4' }
        ]);
        chai.expect(result.subjectIds).to.deep.equal(['1', 'place_1', '2', 'patient_2', '3', '4', 'patient_4']);
        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ keys: ids, include_docs: true }]);
      });
    });

    it('should throw allDocs errors', () => {
      db.medic.allDocs.rejects({ some: 'error' });

      return mutingUtils
        ._getContactsAndSubjectIds(['a'])
        .then(() => chai.expect(true).to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          chai.expect(db.medic.allDocs.callCount).to.equal(1);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ keys: ['a'], include_docs: true }]);
        });
    });
  });

  describe('isMutedInLineage', () => {
    it('should return false when no doc or no parent', () => {
      mutingUtils.isMutedInLineage().should.equal(false);
      mutingUtils.isMutedInLineage({}).should.equal(false);
      mutingUtils.isMutedInLineage({ parent: false }).should.equal(false);
    });

    it('should return false when no parent is muted', () => {
      const doc = {
        _id: 1,
        parent: {
          _id: 2,
          parent: {
            _id: 3,
            parent: {
              _id: 4,
            }
          }
        }
      };

      mutingUtils.isMutedInLineage(doc).should.equal(false);
      doc.muted = true;
      mutingUtils.isMutedInLineage(doc).should.equal(false);
    });

    it('should return false when no parent is muted', () => {
      const doc1 = {
        _id: 1,
        parent: {
          muted: true,
          _id: 2,
          parent: {
            _id: 3,
            parent: {
              _id: 4,
            }
          }
        }
      };
      mutingUtils.isMutedInLineage(doc1).should.equal(true);

      const doc2 = {
        _id: 1,
        parent: {
          _id: 2,
          parent: {
            _id: 3,
            parent: {
              _id: 4,
              muted: true
            }
          }
        }
      };
      mutingUtils.isMutedInLineage(doc2).should.equal(true);
    });
  });

  describe('getSubjectIds', () => {
    it('should return correct values', () => {
      chai.expect(mutingUtils.getSubjectIds({})).to.deep.equal([]);
      chai.expect(mutingUtils.getSubjectIds({ _id: 'a' })).to.deep.equal(['a']);
      chai.expect(mutingUtils.getSubjectIds({ patient_id: 'b' })).to.deep.equal(['b']);
      chai.expect(mutingUtils.getSubjectIds({ place_id: 'c' })).to.deep.equal(['c']);
      chai.expect(mutingUtils.getSubjectIds({ _id: '' })).to.deep.equal(['']);
      chai.expect(mutingUtils.getSubjectIds({ patient_id: false })).to.deep.equal([false]);
      chai.expect(mutingUtils.getSubjectIds({ place_id: null })).to.deep.equal([null]);
      chai.expect(mutingUtils.getSubjectIds({ _id: 'a', patient_id: 'b' })).to.deep.equal(['a', 'b']);
      chai.expect(mutingUtils.getSubjectIds({ _id: 'b', place_id: 'c' })).to.deep.equal(['b', 'c']);
      chai.expect(mutingUtils.getSubjectIds({ _id: 'd', place_id: 'f', foo: 'bar' })).to.deep.equal(['d', 'f']);
    });
  });

  describe('updateContact', () => {
    it('set muted to false', () => {
      clock.tick(2000);
      chai.expect(mutingUtils.updateContact({}, false)).to.deep.equal({ muted: false });
    });

    it('set muted to current timestamp', () => {
      const timestamp = 5000;
      clock.tick(timestamp);
      chai.expect(mutingUtils.updateContact({}, true)).to.deep.equal({ muted: timestamp });
      clock.tick(timestamp);
      chai.expect(mutingUtils.updateContact({}, true)).to.deep.equal({ muted: timestamp + timestamp });
    });
  });
});
