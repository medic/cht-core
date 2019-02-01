const mutingUtils = require('../../../src/lib/muting_utils'),
      sinon = require('sinon'),
      chai = require('chai'),
      db = require('../../../src/db-pouch'),
      utils = require('../../../src/lib/utils'),
      moment = require('moment'),
      infodoc = require('../../../src/lib/infodoc');

let clock;

describe('mutingUtils', () => {
  beforeEach(() => {
    sinon.stub(utils, 'getReportsBySubject');
    sinon.stub(utils, 'setTasksStates');
    sinon.stub(mutingUtils._lineage, 'fetchHydratedDoc');
    sinon.stub(db.medic, 'bulkDocs');
    sinon.stub(db.medic, 'query');
    sinon.stub(db.medic, 'allDocs');
  });
  afterEach(() => sinon.restore());

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

    it('should throw when doc has no fields property', () => {
      return mutingUtils.getContact({})
        .then(() => chai.expect(true).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err.message).to.equal('contact_not_found');
          chai.expect(db.medic.allDocs.callCount).to.equal(0);
          chai.expect(db.medic.query.callCount).to.equal(0);
          chai.expect(mutingUtils._lineage.fetchHydratedDoc.callCount).to.equal(0);
        });
    });

    it('should throw when doc has no id field', () => {
      return mutingUtils.getContact({ fields: {} })
        .then(() => chai.expect(true).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err.message).to.equal('contact_not_found');
          chai.expect(db.medic.allDocs.callCount).to.equal(0);
          chai.expect(db.medic.query.callCount).to.equal(0);
          chai.expect(mutingUtils._lineage.fetchHydratedDoc.callCount).to.equal(0);
        });
    });
  });

  describe('updateRegistrations', () => {
    it('should do nothing if no patientIds are supplied', () => {
      return mutingUtils.updateRegistrations([], true).then(() => {
        chai.expect(utils.getReportsBySubject.callCount).to.equal(0);
      });
    });

    it('should request registrations for provided patientIds', () => {
      const patientIds = ['1', '2', '3', '4'];
      utils.getReportsBySubject.resolves([]);

      return mutingUtils.updateRegistrations(patientIds, true).then(() => {
        chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
        chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal(patientIds);
      });
    });

    it('should mute scheduled messages in registrations', () => {
      const registrations = [
        { _id: 'r1', shouldUpdate: true },
        { _id: 'r2', shouldUpdate: false },
        { _id: 'r3', shouldUpdate: false },
        { _id: 'r4', shouldUpdate: true }
      ];
      utils.getReportsBySubject.resolves(registrations);
      utils.setTasksStates.callsFake(r => {
        r.willUpdate = true;
        return r.shouldUpdate;
      });

      db.medic.bulkDocs.resolves();

      return mutingUtils.updateRegistrations(['a'], true).then(() => {
        chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
        chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal(['a']);
        chai.expect(utils.setTasksStates.callCount).to.equal(4);
        chai.expect(utils.setTasksStates.args[0][0]._id).to.equal('r1');
        chai.expect(utils.setTasksStates.args[0][1]).to.equal('muted');
        chai.expect(utils.setTasksStates.args[1][0]._id).to.equal('r2');
        chai.expect(utils.setTasksStates.args[1][1]).to.equal('muted');
        chai.expect(utils.setTasksStates.args[2][0]._id).to.equal('r3');
        chai.expect(utils.setTasksStates.args[2][1]).to.equal('muted');
        chai.expect(utils.setTasksStates.args[3][0]._id).to.equal('r4');
        chai.expect(utils.setTasksStates.args[3][1]).to.equal('muted');
        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id: 'r1', shouldUpdate: true, willUpdate: true },
          { _id: 'r4', shouldUpdate: true, willUpdate: true }
        ]]);
      });
    });

    it('should unmute scheduled messages in registrations', () => {
      utils.getReportsBySubject.resolves([
        { _id: 'r1', shouldUpdate: true },
        { _id: 'r2', shouldUpdate: false },
        { _id: 'r3', shouldUpdate: false },
        { _id: 'r4', shouldUpdate: true }
      ]);

      utils.setTasksStates.callsFake(r => {
        r.willUpdate = true;
        return r.shouldUpdate;
      });

      db.medic.bulkDocs.resolves();

      return mutingUtils.updateRegistrations(['a'], false).then(() => {
        chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
        chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal(['a']);
        chai.expect(utils.setTasksStates.callCount).to.equal(4);
        chai.expect(utils.setTasksStates.args[0][0]._id).to.equal('r1');
        chai.expect(utils.setTasksStates.args[0][1]).to.equal('scheduled');
        chai.expect(utils.setTasksStates.args[1][0]._id).to.equal('r2');
        chai.expect(utils.setTasksStates.args[1][1]).to.equal('scheduled');
        chai.expect(utils.setTasksStates.args[2][0]._id).to.equal('r3');
        chai.expect(utils.setTasksStates.args[2][1]).to.equal('scheduled');
        chai.expect(utils.setTasksStates.args[3][0]._id).to.equal('r4');
        chai.expect(utils.setTasksStates.args[3][1]).to.equal('scheduled');
        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id: 'r1', shouldUpdate: true, willUpdate: true },
          { _id: 'r4', shouldUpdate: true, willUpdate: true }
        ]]);
      });
    });

    it('should not call bulkDocs when no registrations need updating', () => {
      utils.getReportsBySubject.resolves([{ _id: 'r1' }, { _id: 'r2' }, { _id: 'r3' }, { _id: 'r4' }]);
      utils.setTasksStates.returns(false);

      return mutingUtils.updateRegistrations(['a'], true).then(() => {
        chai.expect(db.medic.bulkDocs.callCount).to.equal(0);
        chai.expect(utils.setTasksStates.callCount).to.equal(4);
        chai.expect(utils.setTasksStates.args[0][0]._id).to.equal('r1');
        chai.expect(utils.setTasksStates.args[0][1]).to.equal('muted');
        chai.expect(utils.setTasksStates.args[1][0]._id).to.equal('r2');
        chai.expect(utils.setTasksStates.args[1][1]).to.equal('muted');
        chai.expect(utils.setTasksStates.args[2][0]._id).to.equal('r3');
        chai.expect(utils.setTasksStates.args[2][1]).to.equal('muted');
        chai.expect(utils.setTasksStates.args[3][0]._id).to.equal('r4');
        chai.expect(utils.setTasksStates.args[3][1]).to.equal('muted');
      });
    });

    it('should throw bulkDocs errors', () => {
      utils.getReportsBySubject.resolves([{ _id: 'r1' }]);
      utils.setTasksStates.returns(true);
      db.medic.bulkDocs.rejects({ some: 'err' });

      return mutingUtils.updateRegistrations(['a'], true)
        .then(() => chai.expect(false).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
          chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
          chai.expect(utils.getReportsBySubject.args[0][0].ids).to.deep.equal(['a']);
          chai.expect(utils.setTasksStates.callCount).to.equal(1);
          chai.expect(utils.setTasksStates.args[0][0]).to.deep.equal({ _id: 'r1' });
          chai.expect(utils.setTasksStates.args[0][1]).to.equal('muted');
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        });
    });
  });

  describe('updateContacts', () => {
    it('should update all contacts with muted state', () => {
      const timestamp = 2500;
      const contacts = [ { _id:  'a' }, { _id:  'b' }, { _id:  'c' } ];
      db.medic.bulkDocs.resolves();
      return mutingUtils._updateContacts(contacts, timestamp).then(() => {
        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id:  'a', muted: timestamp }, { _id:  'b', muted: timestamp }, { _id:  'c', muted: timestamp }
        ]]);
      });
    });

    it('should delete muted property when unmuting', () => {
      const contacts = [ { _id:  'a', muted: true }, { _id:  'b', muted: 123 }, { _id:  'c', muted: 'something' } ];
      db.medic.bulkDocs.resolves();
      return mutingUtils._updateContacts(contacts, false).then(() => {
        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id:  'a' }, { _id:  'b' }, { _id:  'c' }
        ]]);
      });
    });

    it('should not call bulkDocs if contacts are empty', () => {
      return mutingUtils._updateContacts([], true).then(result => {
        chai.expect(result).to.equal(undefined);
        chai.expect(db.medic.bulkDocs.callCount).to.equal(0);
      });
    });

    it('should throw bulkDocs errors', () => {
      const timestamp = 25;
      db.medic.bulkDocs.rejects({ some: 'error' });
      return mutingUtils._updateContacts([{ _id: 'a'}], timestamp)
        .then(() => chai.expect(false).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
          chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[{ _id: 'a', muted: timestamp }]]);
        });
    });
  });

  describe('updateMuteState', () => {
    beforeEach(() => clock = sinon.useFakeTimers());
    afterEach(() => clock.restore());

    it('should update all non-muted descendants when muting', () => {
      const timestamp = 456789;
      clock.tick(timestamp);
      const hydratedContact = {
        _id: 'my-place',
        muted: false,
        parent: { _id: 'p1', parent: { _id: 'p2' }}
      };

      sinon.stub(infodoc, 'bulkGet').resolves([]);
      sinon.stub(infodoc, 'bulkUpdate').resolves();

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
      db.medic.bulkDocs.resolves([]);

      return mutingUtils.updateMuteState(hydratedContact, true).then(result => {
        chai.expect(!!result).to.equal(true);
        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id: 'my-place', muted: moment(), place_id: 'my-place-id'},
          { _id: 'my-place2', muted: moment() },
          { _id: 'my-place3', place_id: 'place3', muted: moment() },
          { _id: 'contact1', patient_id: 'patient1', muted: moment() },
          { _id: 'contact2', patient_id: 'patient2', muted: moment() },
          { _id: 'contact3', patient_id: 'patient3', muted: moment() }
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
          ids: [
            'my-place', 'my-place-id', 'my-place2', 'my-place3', 'place3',
            'contact1', 'patient1', 'contact2', 'patient2', 'contact3', 'patient3'
          ],
          registrations: true
        }]);

        chai.expect(infodoc.bulkGet.callCount).to.equal(1);
        chai.expect(infodoc.bulkGet.args[0]).to.deep.equal([[
          { id: 'my-place' },
          { id: 'my-place2' },
          { id: 'my-place3' },
          { id: 'contact1' },
          { id: 'contact2' },
          { id: 'contact3' }
        ]]);
        chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
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
      sinon.stub(infodoc, 'bulkGet').resolves([]);
      sinon.stub(infodoc, 'bulkUpdate').resolves();

      return mutingUtils.updateMuteState(hydratedContact, false).then(result => {
        chai.expect(!!result).to.equal(true);

        chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
        chai.expect(utils.getReportsBySubject.args[0]).to.deep.equal([{
          ids: [
            'my-place', 'my-place1', 'my-place2', 'my-place4', 'contact4', 'patient4'
          ],
          registrations: true
        }]);

        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id: 'my-place', place_id: 'my-place1' },
          { _id: 'my-place2' },
          { _id: 'my-place4' },
          { _id: 'contact4', patient_id: 'patient4' }
        ]]);

        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['my-place'] }]);

        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{
          keys: [ 'my-place', 'my-place2', 'my-place3', 'my-place4', 'contact1', 'contact2', 'contact3', 'contact4' ],
          include_docs: true
        }]);

        chai.expect(infodoc.bulkGet.callCount).to.equal(1);
        chai.expect(infodoc.bulkGet.args[0]).to.deep.equal([[
          { id: 'my-place' },
          { id: 'my-place2' },
          { id: 'my-place4' },
          { id: 'contact4' }
        ]]);
        chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
      });
    });

    it('should update all descendants of topmost muted ancestor when unmuting', () => {
      const hydratedPlace = {
        _id: 'my-place',
        muted: true,
        parent: {
          _id: 'p1',
          muted: false, // simulate incorrect data
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
      sinon.stub(infodoc, 'bulkGet').resolves([]);
      sinon.stub(infodoc, 'bulkUpdate').resolves();

      return mutingUtils.updateMuteState(hydratedPlace, false).then(result => {
        chai.expect(!!result).to.equal(true);

        chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[
          { _id: 'p2' },
          { _id: 'p1' },
          { _id: 'my-place' },
          { _id: 'contact1', patient_id: 'patient1' },
          { _id: 'contact2', patient_id: 'patient2' }
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
          ids: [ 'p2', 'p1', 'my-place', 'contact1', 'patient1', 'contact2', 'patient2' ],
          registrations: true
        }]);

        chai.expect(infodoc.bulkGet.callCount).to.equal(1);
        chai.expect(infodoc.bulkGet.args[0]).to.deep.equal([[
          { id: 'p2' },
          { id: 'p1' },
          { id: 'my-place' },
          { id: 'contact1' },
          { id: 'contact2' }
        ]]);
        chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
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
      utils.setTasksStates.returns(true);
      db.medic.bulkDocs.resolves();
      sinon.stub(infodoc, 'bulkGet').resolves([]);
      sinon.stub(infodoc, 'bulkUpdate').resolves();

      return mutingUtils.updateMuteState(contact, true).then(result => {
        chai.expect(!!result).to.equal(true);

        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal(['medic/contacts_by_depth', { key: ['contact'] }]);

        chai.expect(db.medic.allDocs.callCount).to.equal(1);
        chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{
          keys: [ 'contact' ],
          include_docs: true
        }]);

        chai.expect(utils.getReportsBySubject.callCount).to.equal(1);
        chai.expect(utils.getReportsBySubject.args[0]).to.deep.equal([{
          ids: [ 'contact', 'patient' ],
          registrations: true
        }]);

        chai.expect(db.medic.bulkDocs.callCount).to.equal(2);
        chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([[{
          _id: 'contact',
          patient_id: 'patient',
          muted: moment()
        }]]);
        chai.expect(db.medic.bulkDocs.args[1]).to.deep.equal([[
          { _id: 'r1' },
          { _id: 'r2' },
          { _id: 'r3' }
        ]]);

        chai.expect(infodoc.bulkGet.callCount).to.equal(1);
        chai.expect(infodoc.bulkGet.args[0]).to.deep.equal([[ { id: 'contact' } ]]);
        chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
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
      sinon.stub(infodoc, 'bulkGet').resolves([]);
      sinon.stub(infodoc, 'bulkUpdate').resolves();

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

    it('should throw infodoc.bulkGet errors', () => {
      db.medic.query.resolves({ rows: [{ id: 'contact' }] });
      db.medic.allDocs.resolves({ rows: [{ doc: { _id: 'contact' } }]});
      utils.getReportsBySubject.resolves([]);
      sinon.stub(infodoc, 'bulkGet').rejects({ some: 'error' });
      sinon.stub(infodoc, 'bulkUpdate').resolves();

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

    it('should throw infodoc.bulkUpdate errors', () => {
      db.medic.query.resolves({ rows: [{ id: 'contact' }] });
      db.medic.allDocs.resolves({ rows: [{ doc: { _id: 'contact' } }]});
      utils.getReportsBySubject.resolves([]);
      sinon.stub(infodoc, 'bulkGet').resolves([]);
      sinon.stub(infodoc, 'bulkUpdate').rejects({ some: 'error' });

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
    beforeEach(() => clock = sinon.useFakeTimers());
    afterEach(() => clock.restore());

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

      utils.setTasksStates.returns(true);
      sinon.stub(infodoc, 'bulkGet').resolves([]);
      sinon.stub(infodoc, 'bulkUpdate').resolves();

      return mutingUtils.updateMuteState({ _id: 'contact' }, true).then(result => {
        chai.expect(!!result).to.equal(true);
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
          { _id: 'a', muted: moment() },
          { _id: 'b', muted: moment() },
          { _id: 'c', muted: moment() }
        ]);
        chai.expect(db.medic.bulkDocs.args[2][0]).to.deep.equal([
          { _id: 'd', muted: moment() },
          { _id: 'e', muted: moment() },
          { _id: 'f', muted: moment() }
        ]);
        chai.expect(db.medic.bulkDocs.args[4][0]).to.deep.equal([
          { _id: 'g', muted: moment() },
          { _id: 'h', muted: moment() },
          { _id: 'i', muted: moment() }
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

        chai.expect(infodoc.bulkGet.callCount).to.equal(3);
        chai.expect(infodoc.bulkGet.args[0]).to.deep.equal([[
          { id: 'a' },
          { id: 'b' },
          { id: 'c' }
        ]]);

        chai.expect(infodoc.bulkGet.args[1]).to.deep.equal([[
          { id: 'd' },
          { id: 'e' },
          { id: 'f' }
        ]]);

        chai.expect(infodoc.bulkGet.args[2]).to.deep.equal([[
          { id: 'g' },
          { id: 'h' },
          { id: 'i' }
        ]]);
        chai.expect(infodoc.bulkUpdate.callCount).to.equal(3);
      });
    });

    it('should throw an error when one of the batches fetching fails', () => {
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

      utils.setTasksStates.returns(true);
      sinon.stub(infodoc, 'bulkGet').resolves([]);
      sinon.stub(infodoc, 'bulkUpdate').resolves();

      return mutingUtils
        .updateMuteState({ _id: 'contact' }, true)
        .then(() => chai.expect(true).to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });

          chai.expect(db.medic.allDocs.callCount).to.equal(3);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(2);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(4);
          chai.expect(infodoc.bulkGet.callCount).to.equal(2);
          chai.expect(infodoc.bulkUpdate.callCount).to.equal(2);
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

      utils.setTasksStates.returns(true);
      sinon.stub(infodoc, 'bulkGet').resolves([]);
      sinon.stub(infodoc, 'bulkUpdate').resolves();

      return mutingUtils
        .updateMuteState({ _id: 'contact' }, true)
        .then(() => chai.expect(true).to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });

          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(2);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(4);
          chai.expect(infodoc.bulkGet.callCount).to.equal(2);
          chai.expect(infodoc.bulkUpdate.callCount).to.equal(2);
        });
    });

    it('should throw an error when one of the batches infodocs.bulkGet fails', () => {
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

      utils.setTasksStates.returns(true);
      sinon.stub(infodoc, 'bulkGet')
        .onCall(0).resolves([])
        .onCall(1).rejects({ some: 'error' });
      sinon.stub(infodoc, 'bulkUpdate').resolves();

      return mutingUtils
        .updateMuteState({ _id: 'contact' }, true)
        .then(() => chai.expect(true).to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });

          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(2);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(4);
          chai.expect(infodoc.bulkGet.callCount).to.equal(2);
          chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
        });
    });

    it('should throw an error when one of the batches infodocs.bulkUpdate fails', () => {
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

      utils.setTasksStates.returns(true);
      sinon.stub(infodoc, 'bulkGet').resolves([]);
      sinon.stub(infodoc, 'bulkUpdate')
        .onCall(0).resolves()
        .onCall(1).rejects({ some: 'error' });

      return mutingUtils
        .updateMuteState({ _id: 'contact' }, true)
        .then(() => chai.expect(true).to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });

          chai.expect(db.medic.allDocs.callCount).to.equal(2);
          chai.expect(utils.getReportsBySubject.callCount).to.equal(2);
          chai.expect(db.medic.bulkDocs.callCount).to.equal(4);
          chai.expect(infodoc.bulkGet.callCount).to.equal(2);
          chai.expect(infodoc.bulkUpdate.callCount).to.equal(2);
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

      return mutingUtils._getContactsAndSubjectIds(ids, new Date()).then(result => {
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

    it('should only return contacts and subjects with different muted state', () => {
      const ids = ['1', '2', '3', '4', '5', '6'];
      db.medic.allDocs.resolves({ rows: [
          { doc: { _id: '1', place_id: 'place_1' } },
          { doc: { _id: '2', patient_id: 'patient_2', muted: true } },
          { doc: { _id: '3', muted: null } },
          { doc: { _id: '4', patient_id: 'patient_4', muted: 0 } },
          { key: '5', error: 'not_found' },
          { doc: { _id: '6', patient_id: 'patient_6', muted: 123 } }
        ]});

      return mutingUtils._getContactsAndSubjectIds(ids, new Date()).then(result => {
        chai.expect(result.contacts).to.deep.equal([
          { _id: '1', place_id: 'place_1' },
          { _id: '3', muted: null },
          { _id: '4', patient_id: 'patient_4', muted: 0 }
        ]);
        chai.expect(result.subjectIds).to.deep.equal(['1', 'place_1', '3', '4', 'patient_4']);
      });
    });

    it('should only return contacts and subjects with different muted state', () => {
      const ids = ['1', '2', '3', '4', '5', '6', '7'];
      db.medic.allDocs.resolves({ rows: [
          { doc: { _id: '1', place_id: 'place_1', muted: 1234 } },
          { doc: { _id: '2', patient_id: 'patient_2', muted: false } },
          { doc: { _id: '3', muted: null } },
          { doc: { _id: '4', patient_id: 'patient_4', muted: 0 } },
          { key: '5', error: 'not_found' },
          { doc: { _id: '6', patient_id: 'patient_6' } },
          { doc: { _id: '7', patient_id: 'patient_7', muted: true } },
        ]});

      return mutingUtils._getContactsAndSubjectIds(ids, false).then(result => {
        chai.expect(result.contacts).to.deep.equal([
          { _id: '1', place_id: 'place_1', muted: 1234 } ,
          { _id: '7', patient_id: 'patient_7', muted: true }
        ]);
        chai.expect(result.subjectIds).to.deep.equal(['1', 'place_1', '7', 'patient_7']);
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
      mutingUtils.isMutedInLineage(doc1).should.equal(2);

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

      mutingUtils.isMutedInLineage(doc2).should.equal(4);
    });
  });

  describe('updateContact', () => {
    it('should remove muted property when unmuting', () => {
      chai.expect(mutingUtils.updateContact({}, false)).to.deep.equal({ });
      chai.expect(mutingUtils.updateContact({ muted: 'something' }, false)).to.deep.equal({ });
      chai
        .expect(mutingUtils.updateContact({ _id: 'a', patient_id: 'b', muted: 'something' }, false))
        .to.deep.equal({ _id: 'a', patient_id: 'b' });
    });

    it('set muted to received value', () => {
      const timestamp = 5000;
      chai.expect(mutingUtils.updateContact({}, timestamp)).to.deep.equal({ muted: timestamp });
      chai.expect(mutingUtils.updateContact({}, timestamp + timestamp)).to.deep.equal({ muted: timestamp + timestamp });
    });
  });

  describe('muteUnsentMessages', () => {
    it('calls setTasksStates with correct arguments', () => {
      const doc = { _id: 'a' };
      utils.setTasksStates.returns(2);
      chai.expect(mutingUtils.muteUnsentMessages(doc)).to.equal(2);

      chai.expect(utils.setTasksStates.callCount).to.equal(1);
      chai.expect(utils.setTasksStates.args[0][0]).to.deep.equal(doc);
      chai.expect(utils.setTasksStates.args[0][1]).to.equal('muted');
    });

    it('filter function should only return true for pending and scheduled tasks', () => {
      utils.setTasksStates.returns();
      mutingUtils.muteUnsentMessages({});

      const filterFn = utils.setTasksStates.args[0][2];
      chai.expect(filterFn({})).to.equal(false);
      chai.expect(filterFn({ state: 'scheduled' })).to.equal(true);
      chai.expect(filterFn({ state: 'pending' })).to.equal(true);
      chai.expect(filterFn({ state: 'sent' })).to.equal(false);
      chai.expect(filterFn({ state: 'duplicate' })).to.equal(false);
      chai.expect(filterFn({ state: 'delivered' })).to.equal(false);
      chai.expect(filterFn({ state: 'anything' })).to.equal(false);
    });

    it('returns the number of tasks that were updated', () => {
      const unchangedDoc = { nbr: 0 };
      const changedDoc = { nbr: 2 };
      const changedDoc2 = { nbr: 4 };

      utils.setTasksStates.callsFake(doc => doc.nbr);

      mutingUtils.muteUnsentMessages(unchangedDoc).should.equal(0);
      mutingUtils.muteUnsentMessages(changedDoc).should.equal(2);
      mutingUtils.muteUnsentMessages(changedDoc2).should.equal(4);
    });
  });

  describe('unmuteMessages', () => {
    it('calls setTasksStates with correct arguments', () => {
      const doc = { _id: 'a' };
      utils.setTasksStates.returns();
      mutingUtils.unmuteMessages(doc);

      chai.expect(utils.setTasksStates.callCount).to.equal(1);
      chai.expect(utils.setTasksStates.args[0][0]).to.deep.equal(doc);
      chai.expect(utils.setTasksStates.args[0][1]).to.equal('scheduled');
    });

    it('filter function should only return true for muted tasks with a date in the future', () => {
      utils.setTasksStates.returns();
      mutingUtils.unmuteMessages({});

      const filterFn = utils.setTasksStates.args[0][2];
      chai.expect(filterFn({})).to.equal(false);
      chai.expect(filterFn({ state: 'scheduled' })).to.equal(false);
      chai.expect(filterFn({ state: 'pending' })).to.equal(false);
      chai.expect(filterFn({ state: 'sent' })).to.equal(false);
      chai.expect(filterFn({ state: 'duplicate' })).to.equal(false);
      chai.expect(filterFn({ state: 'delivered' })).to.equal(false);
      chai.expect(filterFn({ state: 'anything' })).to.equal(false);
      chai.expect(filterFn({ state: 'muted' })).to.equal(true);
      chai.expect(filterFn({ state: 'muted', due: moment().subtract(10, 'days').valueOf() })).to.equal(false);
      chai.expect(filterFn({ state: 'muted', due: moment().valueOf() })).to.equal(true);
      chai.expect(filterFn({ state: 'muted', due: moment().add(1, 'year') })).to.equal(true);
    });

    it('returns the number of tasks that were updated', () => {
      const unchangedDoc = { nbr: 0 };
      const changedDoc = { nbr: 2 };
      const changedDoc2 = { nbr: 4 };

      utils.setTasksStates.callsFake(doc => doc.nbr);

      mutingUtils.unmuteMessages(unchangedDoc).should.equal(0);
      mutingUtils.unmuteMessages(changedDoc).should.equal(2);
      mutingUtils.unmuteMessages(changedDoc2).should.equal(4);
    });
  });

  describe('updateMutingHistory', () => {
    beforeEach(() => {
      clock = sinon.useFakeTimers();
      sinon.stub(infodoc, 'bulkGet');
      sinon.stub(infodoc, 'bulkUpdate');
    });
    afterEach(() => clock.restore());

    it('should add muting history property and push the current state', () => {
      const info = {
        _id: 'contact-info',
        doc_id: 'contact',
        type: 'info',
        transitions: {}
      };
      const parentInfo = {
        _id: 'parent-info',
        doc_id: 'parent',
        type: 'info',
        muting_history: [
          { muted: true, report_id: 'report1' },
          { muted: false, report_id: 'report2' },
          { muted: true, report_id: 'report3' }
        ]
      };
      const contact = {
        _id: 'contact',
        parent: {
          _id: 'a',
          parent: {
            _id: 'parent',
            muted: 'sometime this year'
          }
        }
      };

      infodoc.bulkGet
        .onCall(0).resolves([ parentInfo ])
        .onCall(1).resolves([ info ]);
      infodoc.bulkUpdate.resolves();

      return mutingUtils.updateMutingHistory(contact, moment(1234)).then(() => {
        chai.expect(infodoc.bulkGet.callCount).to.equal(2);
        chai.expect(infodoc.bulkGet.args[0]).to.deep.equal([[ { id: 'parent' } ]]);
        chai.expect(infodoc.bulkGet.args[1]).to.deep.equal([[ { id: 'contact' } ]]);
        chai.expect(infodoc.bulkUpdate.args[0]).to.deep.equal([[{
          _id: 'contact-info',
          doc_id: 'contact',
          type: 'info',
          transitions: {},
          muting_history: [{
            muted: true,
            date: moment(1234),
            report_id: 'report3'
          }]
        }]]);
      });
    });

    it('should add new entry in muting history with current state', () => {
      const info = {
        _id: 'contact-info',
        doc_id: 'contact',
        type: 'info',
        transitions: {},
        muting_history: [
          {
            muted: true,
            date: 'some date',
            report_id: 'report_id'
          }
        ]
      };
      const parentInfo = {
        _id: 'parent-info',
        doc_id: 'parent',
        type: 'info',
        muting_history: [
          { muted: true, report_id: 'report1' },
          { muted: false, report_id: 'report2' },
          { muted: true, report_id: 'report3' },
          { muted: false, report_id: 'report4' }
        ]
      };
      const contact = {
        _id: 'contact',
        parent: {
          _id: 'a',
          parent: {
            _id: 'b',
            parent: {
              _id: 'parent',
              muted: 'sometime this year'
            }
          }
        }
      };

      infodoc.bulkGet
        .onCall(0).resolves([ parentInfo ])
        .onCall(1).resolves([ info ]);
      infodoc.bulkUpdate.resolves();

      return mutingUtils.updateMutingHistory(contact, false).then(() => {
        chai.expect(infodoc.bulkGet.callCount).to.equal(2);
        chai.expect(infodoc.bulkGet.args[0]).to.deep.equal([[ { id: 'parent' } ]]);
        chai.expect(infodoc.bulkGet.args[1]).to.deep.equal([[ { id: 'contact' } ]]);
        chai.expect(infodoc.bulkUpdate.args[0]).to.deep.equal([[{
          _id: 'contact-info',
          doc_id: 'contact',
          type: 'info',
          transitions: {},
          muting_history: [
            {
              muted: true,
              date: 'some date',
              report_id: 'report_id'
            },
            {
              muted: false,
              date: moment(),
              report_id: 'report4'
            }
          ]
        }]]);
      });
    });

    it('should save provided muted value when truthy', () => {
      const contact = {
        _id: 'a',
        parent: {
          _id: 'b',
          muted: 'aaa'
        }
      };

      infodoc.bulkGet.resolves([{}]);
      infodoc.bulkUpdate.resolves();

      return mutingUtils.updateMutingHistory(contact, 'something').then(() => {
        chai.expect(infodoc.bulkGet.callCount).to.equal(2);
        chai.expect(infodoc.bulkGet.args[0]).to.deep.equal([[ { id: 'b' } ]]);
        chai.expect(infodoc.bulkGet.args[1]).to.deep.equal([[ { id: 'a' } ]]);
        chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
        chai.expect(infodoc.bulkUpdate.args[0]).to.deep.equal([[{
          muting_history: [
            {
              muted: true,
              date: 'something',
              report_id: undefined
            }
          ]
        }]]);
      });
    });

    it('should save current date when falsy', () => {
      const contact = {
        _id: 'a',
        parent: {
          _id: 'b',
          muted: 'aaa'
        }
      };

      infodoc.bulkGet.resolves([{}]);
      infodoc.bulkUpdate.resolves();

      return mutingUtils.updateMutingHistory(contact, undefined).then(() => {
        chai.expect(infodoc.bulkGet.callCount).to.equal(2);
        chai.expect(infodoc.bulkGet.args[0]).to.deep.equal([[ { id: 'b' } ]]);
        chai.expect(infodoc.bulkGet.args[1]).to.deep.equal([[ { id: 'a' } ]]);
        chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
        chai.expect(infodoc.bulkUpdate.args[0]).to.deep.equal([[{
          muting_history: [
            {
              muted: false,
              date: moment(),
              report_id: undefined
            }
          ]
        }]]);
      });
    });

    it('should throw infodoc.bulkGet errors', () => {
      infodoc.bulkGet.rejects({ some: 'error' });
      infodoc.bulkUpdate.resolves();

      return mutingUtils
        .updateMutingHistory({ _id: 'a' }, false)
        .then(() => chai.expect(false).to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          chai.expect(infodoc.bulkGet.callCount).to.equal(1);
          chai.expect(infodoc.bulkUpdate.callCount).to.equal(0);
        });
    });

    it('should throw infodoc.bulkGet errors', () => {
      infodoc.bulkGet.resolves([{}]);
      infodoc.bulkUpdate.rejects({ some: 'error' });

      return mutingUtils
        .updateMutingHistory({ _id: 'a' }, false)
        .then(() => chai.expect(false).to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          chai.expect(infodoc.bulkGet.callCount).to.equal(2);
          chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
        });
    });
  });

  describe('updateMuteHistories', () => {
    beforeEach(() => {
      clock = sinon.useFakeTimers();
      sinon.stub(infodoc, 'bulkGet');
      sinon.stub(infodoc, 'bulkUpdate');
    });
    afterEach(() => clock.restore());

    it('should do nothing if contacts list is empty', () => {
      return mutingUtils._updateMuteHistories([]).then(() => {
        chai.expect(infodoc.bulkGet.callCount).to.equal(0);
        chai.expect(infodoc.bulkUpdate.callCount).to.equal(0);
      });
    });

    it('should get all info docs and update them when muting', () => {
      const contacts = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }];
      infodoc.bulkGet.resolves([
        { _id: 'a-info', type: 'info', _rev: '1' },
        { _id: 'b-info', type: 'info' },
        { _id: 'c-info', type: 'info', _rev: '2', muting_history: [{ muted: true }, { muted: false }] }
      ]);
      infodoc.bulkUpdate.resolves();

      return mutingUtils._updateMuteHistories(contacts, moment(1234), 'reportId').then(() => {
        chai.expect(infodoc.bulkGet.callCount).to.equal(1);
        chai.expect(infodoc.bulkGet.args[0]).to.deep.equal([[ { id: 'a' }, { id: 'b' }, { id: 'c' } ]]);

        chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
        chai.expect(infodoc.bulkUpdate.args[0]).to.deep.equal([[
          {
            _id: 'a-info',
            type: 'info',
            _rev: '1',
            muting_history: [{
              muted: true,
              date: moment(1234),
              report_id: 'reportId'
            }]
          },
          {
            _id: 'b-info',
            type: 'info',
            muting_history: [{
              muted: true,
              date: moment(1234),
              report_id: 'reportId'
            }]
          },
          {
            _id: 'c-info',
            type: 'info',
            _rev: '2',
            muting_history: [
              { muted: true },
              { muted: false },
              {
                muted: true,
                date: moment(1234),
                report_id: 'reportId'
              }
            ]
          }
        ]]);
      });
    });

    it('should get all info docs and update them when unmuting', () => {
      const contacts = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }];
      infodoc.bulkGet.resolves([
        { _id: 'a-info', type: 'info', _rev: '1' },
        { _id: 'b-info', type: 'info' },
        { _id: 'c-info', type: 'info', _rev: '2', muting_history: [{ muted: true }] }
      ]);
      infodoc.bulkUpdate.resolves();

      return mutingUtils._updateMuteHistories(contacts, false, 'reportId').then(() => {
        chai.expect(infodoc.bulkGet.callCount).to.equal(1);
        chai.expect(infodoc.bulkGet.args[0]).to.deep.equal([[ { id: 'a' }, { id: 'b' }, { id: 'c' } ]]);

        chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
        chai.expect(infodoc.bulkUpdate.args[0]).to.deep.equal([[
          {
            _id: 'a-info',
            type: 'info',
            _rev: '1',
            muting_history: [{
              muted: false,
              date: moment(),
              report_id: 'reportId'
            }]
          },
          {
            _id: 'b-info',
            type: 'info',
            muting_history: [{
              muted: false,
              date: moment(),
              report_id: 'reportId'
            }]
          },
          {
            _id: 'c-info',
            type: 'info',
            _rev: '2',
            muting_history: [
              { muted: true },
              {
                muted: false,
                date: moment(),
                report_id: 'reportId'
              }
            ]
          }
        ]]);
      });
    });

    it('should throw infodoc.bulkget errors', () => {
      infodoc.bulkGet.rejects({ some: 'error' });

      return mutingUtils
        ._updateMuteHistories([{ _id: 'c' }])
        .then(() => chai.expect(true).to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          chai.expect(infodoc.bulkUpdate.callCount).to.equal(0);
        });
    });

    it('should throw infodoc.bulkUpdate errors', () => {
      infodoc.bulkGet.resolves([{ _id: 'a-info' }]);
      infodoc.bulkUpdate.rejects({ some: 'error' });

      return mutingUtils
        ._updateMuteHistories([{ _id: 'a' }])
        .then(() => chai.expect(true).to.equal('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          chai.expect(infodoc.bulkGet.callCount).to.equal(1);
          chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
        });
    });
  });
});
