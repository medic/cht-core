const db = require('../../../src/db');
const sinon = require('sinon');
const config = require('../../../src/config');
const auth = require('../../../src/auth');
const tombstoneUtils = require('@medic/tombstone-utils');
const viewMapUtils = require('@medic/view-map-utils');
const rewire = require('rewire');
const service = rewire('../../../src/services/authorization');

const should = require('chai').should();
const userCtx = { name: 'user', contact_id: 'contact_id', facility_id: 'facility_id' };
const subjectIds = [1, 2, 3];

let contact;
let report;
let feed;
let viewResults;
let keysByDepth;

describe('Authorization service', () => {
  afterEach(() => sinon.restore());

  beforeEach(() => {
    sinon.stub(tombstoneUtils, 'extractStub').callsFake(t => ({ id: t.replace('tombstone', 'deleted')}));
    sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
    sinon.stub(config, 'get');
    sinon.stub(auth, 'hasAllPermissions');
    sinon.stub(viewMapUtils, 'getViewMapFn').returns(sinon.stub());
    sinon.stub(db.medic, 'query').resolves({ rows: [] });
  });

  describe('getDepth', () => {
    it('unlimited depth for no roles', () => {
      service.getDepth({}).should.equal(-1);
      service.getDepth({ name : 'a'}).should.equal(-1);
      service.getDepth({ roles: []}).should.equal(-1);
    });

    it('unlimited depth when no settings found', () => {
      config.get.returns(false);
      service.getDepth({ roles: ['some_role'] }).should.equal(-1);
    });

    it('unlimited depth when no settings for role is found, or settings depth is incorrect', () => {
      config.get.returns([ { role: 'role' }, { role: 'alpha' } ]);
      service.getDepth({ roles: ['some_role'] }).should.equal(-1);

      config.get.returns([ { role: 'some_role' } ]);
      service.getDepth({ roles: ['some_role'] }).should.equal(-1);

      config.get.returns([ { role: 'some_role', depth: 'aaa' } ]);
      service.getDepth({ roles: ['some_role'] }).should.equal(-1);
    });

    it('returns biggest value', () => {
      const settings = [
        { role: 'a', depth: 1 },
        { role: 'b', depth: 2 },
        { role: 'c', depth: 3 },
        { role: 'd', depth: 4 }
      ];

      config.get.returns(settings);
      service.getDepth({ roles: ['a', 'b', 'd'] }).should.equal(4);
    });
  });

  describe('getAuthorizationContext', () => {
    beforeEach(() => {
      sinon.stub(service, 'getDepth');
    });

    it('queries correct views with correct keys when depth is not infinite', () => {
      service.getDepth.returns(2);
      return service
        .getAuthorizationContext( {facility_id: 'facilityId' })
        .then(() => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0][0].should.equal('medic/contacts_by_depth');

          db.medic.query.args[0][1].should.deep.equal({
            keys: [[ 'facilityId', 0 ], [ 'facilityId', 1 ], [ 'facilityId', 2 ]]
          });
        });
    });

    it('queries with correct keys when depth is infinite', () => {
      service.getDepth.returns(-1);
      return service
        .getAuthorizationContext({ facility_id: 'facilityId' })
        .then(() => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0][0].should.equal('medic/contacts_by_depth');
          db.medic.query.args[0][1].should.deep.equal({ keys: [[ 'facilityId' ]] });
        });
    });

    it('extracts original docId from tombstone ID, pushes ids and values to subject list', () => {
      auth.hasAllPermissions.returns(false);
      config.get.returns(false);
      service.getDepth.returns(-1);
      tombstoneUtils.isTombstoneId.withArgs('tombstone-1').returns(true);
      tombstoneUtils.isTombstoneId.withArgs('tombstone-2').returns(true);
      tombstoneUtils.isTombstoneId.withArgs('tombstone-3').returns(true);

      db.medic.query.withArgs('medic/contacts_by_depth').resolves({
        rows: [
          { id: 1, key: 'key', value: 's1' },
          { id: 2, key: 'key', value: 's2' },
          { id: 'tombstone-1', key: 'key', value: 's3' },
          { id: 'tombstone-2', key: 'key', value: 's4' },
          { id: 'tombstone-3', key: 'key', value: 's5' }
        ]
      });

      return service
        .getAuthorizationContext({ facility_id: 'facilityId', name: 'username' })
        .then(result => {
          tombstoneUtils.extractStub.callCount.should.equal(3);
          tombstoneUtils.extractStub.args.should.deep.equal([
            ['tombstone-1'], ['tombstone-2'], ['tombstone-3']
          ]);
          result.subjectIds.should.have.members([
            1, 2, 'deleted-1', 'deleted-2', 'deleted-3', '_all',
            's1', 's2', 's3', 's4', 's5',
            'org.couchdb.user:username',
          ]);
        });
    });

    it('adds unassigned key if the user has required permissions', () => {
      auth.hasAllPermissions.returns(true);
      config.get.returns(true);

      return service
        .getAuthorizationContext({ facility_id: 'aaa', name: 'agatha' })
        .then(result => {
          result.subjectIds.should.have.members(['_all', '_unassigned', 'org.couchdb.user:agatha']);
        });
    });

    it('returns contactsByDepthKeys array', () => {
      db.medic.query.withArgs('medic/contacts_by_depth').resolves({
        rows: [{ id: 1, key: 'key', value: 's1' }, { id: 2, key: 'key', value: 's2' }]
      });
      service.getDepth.returns(2);
      auth.hasAllPermissions.returns(false);
      config.get.returns(false);
      return service
        .getAuthorizationContext({ facility_id: 'aaa', name: 'peter' })
        .then(result => {
          result.subjectIds.should.have.members([1, 2, '_all', 's1', 's2', 'org.couchdb.user:peter']);
          result.contactsByDepthKeys.should.deep.equal([['aaa', 0], ['aaa', 1], ['aaa', 2]]);
        });
    });
  });

  describe('getAllowedDocIds', () => {
    it('queries correct views with correct keys', () => {
      return service
        .getAllowedDocIds({ subjectIds, userCtx: { name: 'user' }})
        .then(result => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([ 'medic/docs_by_replication_key', { keys: subjectIds } ]);

          result.length.should.equal(2);
          result.should.deep.equal(['_design/medic-client', 'org.couchdb.user:user']);
        });
    });

    it('merges results from both view, except for sensitive ones, includes ddoc and user doc', () => {
      const subjectIds = [ 'sbj1', 'sbj2', 'sbj3', 'sbj4', 'facility_id', 'contact_id', 'c1', 'c2', 'c3', 'c4' ];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows: [
          { id: 'r1', key: 'sbj1', value: { submitter: 'c1' } },
          { id: 'r2', key: 'sbj3', value: { } },
          { id: 'r3', key: 'sbj2', value: { submitter: 'nurse'} },
          { id: 'r4', key: null, value: { submitter: 'c2' } },
          { id: 'r5', key: 'facility_id', value: {} },
          { id: 'r6', key: 'contact_id', value: {} },
          { id: 'r7', key: 'facility_id', value: { submitter: 'c-unknown' } }, //sensitive
          { id: 'r8', key: 'contact_id', value: { submitter: 'c-unknown' } }, //sensitive
          { id: 'r9', key: 'facility_id', value: { submitter: 'c3' } },
          { id: 'r10', key: 'contact_id', value: { submitter: 'c4' } },
          { id: 'r11', key: 'sbj3', value: { } },
          { id: 'r12', key: 'sbj4', value: { submitter: 'someone' } },
          { id: 'r13', key: false, value: { submitter: 'someone else' } }
        ]});

      return service
        .getAllowedDocIds({subjectIds, userCtx: { name: 'user', facility_id: 'facility_id', contact_id: 'contact_id' }})
        .then(result => {
          result.length.should.equal(15);
          result.should.deep.equal([
            '_design/medic-client', 'org.couchdb.user:user',
            'r1', 'r2', 'r3', 'r4',
            'r5', 'r6', 'r7', 'r8', 'r9', 'r10',
            'r11', 'r12', 'r13'
          ]);
        });
    });

    it('should skip tombstones of documents that were re-added', () => {
      const subjectIds = ['subject'];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows: [
          { id: 'r1', key: 'subject', value: {} },
          { id: 'r1_tombstone', key: 'subject', value: {} }, // skipped cause r1 winning is not deleted
          { id: 'r2', key: 'subject', value: {} },
          { id: 'r2_tombstone', key: 'subject', value: {} },  // skipped cause r2 winning is not deleted
          { id: 'r3_tombstone', key: 'subject', value: {} },
          { id: 'r4_tombstone', key: 'subject', value: {} },
        ]});

      tombstoneUtils.isTombstoneId.callsFake(id => id.indexOf('tombstone'));
      tombstoneUtils.extractStub.callsFake(id => ({ id: id.replace('_tombstone', '') }));

      return service
        .getAllowedDocIds({
          subjectIds,
          userCtx: { name: 'user', facility_id: 'facility_id', contact_id: 'contact_id' }
        })
        .then(result => {
          result.should.deep.equal([
            '_design/medic-client', 'org.couchdb.user:user',
            'r1', 'r2',
            'r3_tombstone', 'r4_tombstone'
          ]);
        });
    });

    it('should not return duplicates', () => {
      const subjectIds = ['subject', 'contact', 'parent'];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows: [
          { id: 'r1', key: 'subject', value: {} },
          { id: 'r1', key: 'contact', value: {} },
          { id: 'r1', key: 'parent', value: {} },
          { id: 'r2', key: 'subject', value: {} },  // skipped cause r2 winning is not deleted
          { id: 'r3', key: 'contact', value: {} },
          { id: 'r2', key: 'parent', value: {} },
        ]});

      tombstoneUtils.isTombstoneId.callsFake(id => id.indexOf('tombstone'));
      return service
        .getAllowedDocIds({
          subjectIds,
          userCtx: { name: 'user', facility_id: 'facility_id', contact_id: 'contact_id' }
        })
        .then(result => {
          result.should.deep.equal(['_design/medic-client', 'org.couchdb.user:user', 'r1', 'r2', 'r3']);
        });
    });
  });

  describe('getViewResults', () => {
    it('initializes view map functions if needed and returns view results', () => {
      const contactsByDepthStub = sinon.stub().returns('contactsByDepthStubResult');
      const docsByReplicationKeyStub = sinon.stub().returns('docsByReplicationKeyStubResult');
      const doc = { _id: 1, _rev: 1 };
      viewMapUtils.getViewMapFn
        .withArgs('medic', 'contacts_by_depth')
        .returns(contactsByDepthStub);
      viewMapUtils.getViewMapFn
        .withArgs('medic', 'docs_by_replication_key')
        .returns(docsByReplicationKeyStub);

      config.get.returns('config');
      const result = service.getViewResults(doc);
      viewMapUtils.getViewMapFn.callCount.should.equal(2);
      docsByReplicationKeyStub.callCount.should.equal(1);
      docsByReplicationKeyStub.args[0][0].should.deep.equal(doc);
      contactsByDepthStub.callCount.should.equal(1);
      contactsByDepthStub.args[0][0].should.deep.equal(doc);
      result.should.deep.equal({
        replicationKeys: 'docsByReplicationKeyStubResult',
        contactsByDepth: 'contactsByDepthStubResult',
        couchDbUser: false
      });
    });

    it('sets couchDBUser view value as true for user-settings docs', () => {
      const doc = {
        id: 'user',
        type: 'user-settings',
        contact_id: 'contact-id',
        facility_id: 'facility-id'
      };
      const result = service.getViewResults(doc);
      result.couchDbUser.should.deep.equal(true);
    });
  });

  describe('allowedDoc', () => {
    it('returns false when document does not generate a replication key', () => {
      service.allowedDoc(null, { userCtx }, { replicationKeys: null, contactsByDepth: null }).should.equal(false);
    });

    it('returns true for `allowed for all` docs', () => {
      service.allowedDoc(null, { userCtx }, { replicationKeys: [['_all', {}]], contactsByDepth: null })
        .should.equal(true);
    });

    it('returns true when it is main ddoc or user contact', () => {
      service
        .allowedDoc('_design/medic-client', { userCtx }, { replicationKeys: [['_all', {}]], contactsByDepth: null })
        .should.equal(true);
      service
        .allowedDoc('org.couchdb.user:' + userCtx.name, { userCtx }, { replicationKeys: null, contactsByDepth: null })
        .should.equal(true);
    });

    describe('allowedContact', () => {
      beforeEach(() => {
        viewResults = { replicationKeys: [[['a', {}]]], contactsByDepth: [['parent1'], 'patient_id'] };
        feed = { userCtx, contactsByDepthKeys: [[userCtx.facility_id]], subjectIds };
        keysByDepth = {
          0: [[userCtx.facility_id, 0]],
          1: [[userCtx.facility_id, 0], [userCtx.facility_id, 1]],
          2: [[userCtx.facility_id, 0], [userCtx.facility_id, 1], [userCtx.facility_id, 2]],
          3: [[userCtx.facility_id, 0], [userCtx.facility_id, 1], [userCtx.facility_id, 2], [userCtx.facility_id, 3]]
        };
        contact = 'contact';
      });

      it('returns true for valid contacts', () => {
        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 2], 'patient_id']
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);

        viewResults.contactsByDepth = [
          [[userCtx.facility_id], null], [[userCtx.facility_id, 0], null]
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 1], 'patient_id']
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
          [['parent2'], 'patient_id'], [['parent2', 2], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 3], 'patient_id']
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);
      });

      it('returns false for not allowed contacts', () => {
        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
          [['parent2'], 'patient_id'], [['parent2', 2], 'patient_id']
        ];
        service.allowedDoc(contact, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
        ];
        service.allowedDoc(contact, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
        ];
        service.allowedDoc(contact, feed, viewResults).should.equal(false);
      });

      it('respects depth', () => {
        viewResults.contactsByDepth = [
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id']
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[0] }, viewResults)
          .should.deep.equal(true);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[1] }, viewResults)
          .should.deep.equal(true);

        viewResults.contactsByDepth = [
          [['contact_id'], 'patient_id'], [['contact_id', 0], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 1], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 2], 'patient_id']
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[0] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[1] }, viewResults)
          .should.deep.equal(true);

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 2], 'patient_id'],
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[0] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[1] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[2] }, viewResults)
          .should.deep.equal(true);

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
          [['parent2'], 'patient_id'], [['parent2', 2], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 3], 'patient_id'],
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[0] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[1] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[2] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[3] }, viewResults)
          .should.deep.equal(true);
      });
    });

    describe('allowedReport', () => {
      beforeEach(() => {
        feed = { userCtx, contactsByDepthKeys: [[userCtx.facility_id]], subjectIds: []};
        report = 'report';
      });

      it('returns true for reports with unknown subject and allowed submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', 'submitter' ];
        viewResults = { replicationKeys: [[false, { submitter: 'submitter' }]], contactsByDepth: [] };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('returns false for reports with unknown subject and denied submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = { replicationKeys: [[false, { submitter: 'submitter' }]], contactsByDepth: [] };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('returns false for reports with denied subject and unknown submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = { replicationKeys: [['subject2', { }]], contactsByDepth: [] };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('returns false for reports with denied subject and allowed submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = { replicationKeys: [['subject2', { submitter: 'contact' }]], contactsByDepth: [] };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('returns true for reports with allowed subject and unknown submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = { replicationKeys: [['subject', { }]], contactsByDepth: false };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('returns true for reports with allowed subject, denied submitter and not sensitive', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = { replicationKeys: [['subject', { submitter: 'submitter' }]], contactsByDepth: [] };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('returns true for reports with allowed subject, allowed submitter and not sensitive', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = { replicationKeys: [['subject', { submitter: 'contact' }]], contactsByDepth: [] };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('returns false for reports with allowed subject, denied submitter and sensitive', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.contact_id ];
        viewResults = { replicationKeys: [[userCtx.contact_id, { submitter: 'submitter' }]], contactsByDepth: [] };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.facility_id ];
        viewResults = { replicationKeys: [[userCtx.facility_id, { submitter: 'submitter' }]], contactsByDepth: [] };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('returns true for reports with allowed subject, allowed submitter and about user`s contact or place', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.contact_id ];
        viewResults = { replicationKeys: [[userCtx.contact_id, { submitter: 'contact' }]], contactsByDepth: [] };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.facility_id ];
        viewResults = { replicationKeys: [[userCtx.facility_id, { submitter: 'contact' }]], contactsByDepth: [] };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });
    });

    describe('updateContext', () => {
      beforeEach(() => {
        viewResults = { contactsByDepth: [['parent1'], 'patient_id'] };
        feed = { userCtx, contactsByDepthKeys: [[userCtx.facility_id]], subjectIds };
        keysByDepth = {
          0: [[userCtx.facility_id, 0]],
          1: [[userCtx.facility_id, 0], [userCtx.facility_id, 1]],
          2: [[userCtx.facility_id, 0], [userCtx.facility_id, 1], [userCtx.facility_id, 2]],
          3: [[userCtx.facility_id, 0], [userCtx.facility_id, 1], [userCtx.facility_id, 2], [userCtx.facility_id, 3]]
        };
        contact = 'contact';
      });

      it('returns nbr of new subjects for allowed contacts', () => {
        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 2], 'patient_id']
        ];
        service.updateContext(true, feed, viewResults).should.equal(true);

        viewResults.contactsByDepth = [
          [[userCtx.facility_id], null], [[userCtx.facility_id, 0], null]
        ];
        service.updateContext(true, feed, viewResults).should.equal(true);

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 1], 'patient_id']
        ];
        service.updateContext(true, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
          [['parent2'], 'patient_id'], [['parent2', 2], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 3], 'patient_id']
        ];
        service.updateContext(true, feed, viewResults).should.equal(false);
      });

      it('returns false for not allowed contacts', () => {
        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
          [['parent2'], 'patient_id'], [['parent2', 2], 'patient_id']
        ];
        service.updateContext(false, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
        ];
        service.updateContext(false, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
        ];
        service.updateContext(false, feed, viewResults).should.equal(false);
      });

      it('adds valid contact _id and reference to subjects list, while keeping them unique', () => {
        feed.subjectIds = [];
        viewResults.contactsByDepth = [
          [['new_contact_id'], 'new_patient_id'], [['new_contact_id', 0], 'new_patient_id'],
          [[userCtx.facility_id], 'new_patient_id'], [[userCtx.facility_id, 1], 'new_patient_id']
        ];

        service.updateContext(true, feed, viewResults).should.equal(true);
        feed.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);

        service.updateContext(true, feed, viewResults).should.equal(false);
        feed.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);

        viewResults.contactsByDepth = [
          [['second_new_contact_id'], 'second_patient_id'], [['second_new_contact_id', 0], 'second_patient_id'],
          [['parent1'], 'second_patient_id'], [['parent1', 1], 'second_patient_id']
        ];
        service.updateContext(false, feed, viewResults).should.equal(false);
        feed.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);
      });

      it('removes invalid contact _id and reference from subjects list', () => {
        feed.subjectIds = ['person_id', 'person_id', 'contact_id', 'person_ref', 'contact_id', 'person_ref', 's'];

        viewResults.contactsByDepth = [
          [['person_id'], 'person_ref'], [['person_id', 0], 'person_ref'],
          [['parent1'], 'person_ref'], [['parent1', 1], 'person_ref']
        ];

        service.updateContext(false, feed, viewResults).should.equal(false);
        feed.subjectIds.should.deep.equal(['contact_id', 'contact_id', 's']);
      });
    });

    describe('isAuthChange', () => {
      it('returns true if doc is own user Settings doc, false otherwise', () => {
        const userCtx = { name: 'user', facility_id: 'facility_id', contact_id: 'contact_id' };

        service.isAuthChange('org.couchdb.user:user', userCtx, { couchDbUser: true }).should.equal(true);
        service.isAuthChange('org.couchdb.user:otheruser', userCtx, { couchDbUser: true }).should.equal(false);
        service.isAuthChange('org.couchdb.user:user', userCtx, { couchDbUser: false }).should.equal(false);
        service.isAuthChange('org.couchdb.user:user', userCtx, {}).should.equal(false);
        service.isAuthChange('org.couchdb.user:user', userCtx, { some: 'thing' }).should.equal(false);
        service.isAuthChange('org.couchdb.user:user', userCtx, { couchDbUser: undefined }).should.equal(false);
        service.isAuthChange('someid', userCtx, { couchDbUser: 'aaaa'}).should.equal(false);
      });
    });
  });

  describe('excludeTombstoneIds', () => {
    it('excludes tombstone IDS', () => {
      tombstoneUtils.isTombstoneId.callsFake(id => id.indexOf('tombstone') !== -1);
      service.excludeTombstoneIds(['1', '2', 'tombstone-a', 'b-tombstone', '3', '5'])
        .should.deep.equal(['1', '2', '3', '5']);
      tombstoneUtils.isTombstoneId.callCount.should.equal(6);
    });
  });

  describe('convertTombstoneIds', () => {
    it('converts tombstone ids to their corresponding doc ids', () => {
      tombstoneUtils.isTombstoneId.callsFake(id => id.indexOf('tombstone') !== -1);
      tombstoneUtils.extractStub.callsFake(id => ({ id: id.replace('tombstone','') }));

      service.convertTombstoneIds(['1', '2', 'tombstone-a', 'b-tombstone', '3', '5'])
        .should.deep.equal(['1', '2', '-a', 'b-', '3', '5']);
      tombstoneUtils.isTombstoneId.callCount.should.equal(6);
      tombstoneUtils.extractStub.callCount.should.equal(2);
    });
  });

  describe('filterAllowedDocs', () => {
    it('returns only allowed docs', () => {

      const docs = [
        { id: 1, viewResults: { replicationKeys: [['_all']] } },
        { id: 2, viewResults: { replicationKeys: [['_all']] } },
        { id: 3, viewResults: {} },
        { id: 4, viewResults: {} },
        { id: 5, viewResults: { replicationKeys: [['_all']] } }
      ];

      const results = service.filterAllowedDocs({ userCtx: {}, subjectIds: [ 1 ] }, docs);

      results.length.should.equal(3);
      results.should.deep.equal([
        { id: 1, viewResults: { replicationKeys: [['_all']] } },
        { id: 2, viewResults: { replicationKeys: [['_all']] } },
        { id: 5, viewResults: { replicationKeys: [['_all']] } }
      ]);
    });

    it('reiterates over remaining docs when authorization context receives new subjects', () => {
      const authzContext = {
        userCtx: {},
        subjectIds: [],
        contactsByDepthKeys: [['a']]
      };
      const docs = [
        { id: 6, viewResults: {} },
        { id: 7, viewResults: {} },
        { id: 8, viewResults: { replicationKeys: [['subject2', { submitter: 'a' }]], contactsByDepth: false } },
        { id: 4, viewResults: { replicationKeys: [[1, { submitter: 'b' }]], contactsByDepth: false } },
        { id: 5, viewResults: {} },
        { id: 2, viewResults: { replicationKeys: [['something']], contactsByDepth: [[[2, 0], 'subject2'], [['a']]] } },
        { id: 3, viewResults: { replicationKeys: [[ '_all' ]]} },
        { id: 1, viewResults: { replicationKeys: [['something']], contactsByDepth: [[[1], 'subject1'], [['a']]] } },
        { id: 9, viewResults: {}, allowed: true },
        { id: 11, viewResults: { replicationKeys: [['subject2', { submitter: 'a' }]], contactsByDepth: false } },
        { id: 10, viewResults: {} }
      ];

      const results = service.filterAllowedDocs(authzContext, docs);

      results.length.should.equal(7);
      results.should.deep.equal([
        { id: 2, viewResults: { replicationKeys: [['something']], contactsByDepth: [[[2, 0], 'subject2'], [['a']]] } },
        { id: 3, viewResults: { replicationKeys: [[ '_all' ]]} },
        { id: 1, viewResults: { replicationKeys: [['something']], contactsByDepth: [[[1], 'subject1'], [['a']]] } },
        { id: 9, viewResults: {}, allowed: true },
        { id: 11, viewResults: { replicationKeys: [['subject2', { submitter: 'a' }]], contactsByDepth: false } },
        { id: 8, viewResults: { replicationKeys: [['subject2', { submitter: 'a' }]], contactsByDepth: false } },
        { id: 4, viewResults: { replicationKeys: [[1, { submitter: 'b' }]], contactsByDepth: false } }
      ]);

      authzContext.subjectIds.should.deep.equal([ 'subject2', 2, 'subject1', 1 ]);
    });

    it('does not reiterate when context does not receive new subjects', () => {
      const authzContext = {
        userCtx: {},
        subjectIds: [2, 3, 'subject1', 'subject2'],
        contactsByDepthKeys: [[1]]
      };

      const docs = [
        { id: 4, viewResults: { replicationKeys: [[ '_all' ]] } },
        { id: 5, viewResults: {} },
        { id: 2, viewResults: { replicationKeys: [['something']], contactsByDepth: [[[1], 'subject1']] } },
        { id: 3, viewResults: { replicationKeys: [['something']], contactsByDepth: [[[1], 'subject2']] } },
        { id: 1, viewResults: { replicationKeys: [['subject2', { submitter: 'a' }]], contactsByDepth: false } }
      ];


      const results = service.filterAllowedDocs(authzContext, docs);

      results.length.should.equal(4);
      results.should.deep.equal([
        { id: 4, viewResults: { replicationKeys: [[ '_all' ]] } },
        { id: 2, viewResults: { replicationKeys: [['something']], contactsByDepth: [[[1], 'subject1']] } },
        { id: 3, viewResults: { replicationKeys: [['something']], contactsByDepth: [[[1], 'subject2']] } },
        { id: 1, viewResults: { replicationKeys: [['subject2', { submitter: 'a' }]], contactsByDepth: false } }
      ]);
    });

    it('takes doc.allowed into consideration', () => {
      const authzContext = {
        userCtx: {},
        subjectIds: [],
        contactsByDepthKeys: [[1]]
      };

      const docs = [
        { id: 4, viewResults: {} },
        { id: 5, viewResults: {}, allowed: true },
        { id: 2, viewResults: { replicationKeys: [['a']], contactsByDepth: [[[1], 'subject2']] }, allowed: false },
        { id: 3, viewResults: {} },
        { id: 1, viewResults: {}, allowed: true }
      ];

      const results = service.filterAllowedDocs(authzContext, docs);

      results.length.should.equal(3);
      results.should.deep.equal([
        { id: 5, viewResults: {}, allowed: true },
        { id: 2, viewResults: { replicationKeys: [['a']], contactsByDepth: [[[1], 'subject2']] }, allowed: false },
        { id: 1, viewResults: {}, allowed: true }
      ]);
    });
  });

  describe('getScopedAuthorizationContext', () => {
    it('should return default subject ids if no docs provided', () => {
      return service
        .getScopedAuthorizationContext(userCtx, [])
        .then(result => {
          result.should.deep.equal({
            userCtx,
            subjectIds: ['_all', 'org.couchdb.user:user'],
            contactsByDepthKeys: [ ['facility_id'] ]
          });
        });
    });

    it('should return default subject ids if only falsy docs are provided', () => {
      return service
        .getScopedAuthorizationContext(
          userCtx, [{ doc: false }, { doc: undefined }, { viewResults: {} }, false, undefined ]
        )
        .then(result => {
          result.should.deep.equal({
            userCtx,
            subjectIds: ['_all', 'org.couchdb.user:user'],
            contactsByDepthKeys: [ ['facility_id'] ]
          });
        });
    });

    it('should get view results if missing', () => {
      db.medic.query.resolves({ rows: [] });
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
      const contactsByDepth = sinon.stub();
      const docsByReplicationKey = sinon.stub();
      viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
      viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);
      const docs = [ { _id: 'doc1' }, { _id: 'doc2' }, { _id: 'doc3' } ];
      return service
        .getScopedAuthorizationContext(userCtx, [{ doc: docs[0] }, { doc: docs[1], viewResults: {} }, { doc: docs[2] }])
        .then(result => {
          result.subjectIds.should.deep.equal(['_all', 'org.couchdb.user:user']);
          contactsByDepth.callCount.should.equal(2);
          contactsByDepth.args.should.deep.equal([[docs[0]], [docs[2]]]);
          docsByReplicationKey.callCount.should.equal(2);
          docsByReplicationKey.args.should.deep.equal([[docs[0]], [docs[2]]]);
        });
    });

    it('should return correct subject ids with contact docs', () => {
      const c1 = {
        _id: 'c1', type: 'person',
        parent: { _id: 'p1', parent: { _id: 'facility_id' } }, patient_id: '123456'
      };
      const c2 = {
        _id: 'c2', type: 'person',
        parent: { _id: 'p3', parent: { _id: 'p4' } }, place_id: 'place1'
      };
      const c3 = {
        _id: 'c3', type: 'person',
        parent: { _id: 'p1', parent: { _id: 'facility_id' } }
      };
      const c4 = {
        _id: 'c4', type: 'person',
        parent: { _id: 'p3', parent: { _id: 'p4' } }
      };
      const c5 = {
        _id: 'c5', type: 'person',
        parent: { _id: 'p2', parent: { _id: 'facility_id' }, place_id: 'place5' }
      };
      const docObjs = [
        {
          doc: c1, // allowed
          viewResults: {
            contactsByDepth: [[['c1'], '123456'], [['p1'], '123456'], [['facility_id'], '123456']],
            replicationKeys: [['c1', {}]]
          }
        },
        {
          doc: c2, // denied
          viewResults: {
            contactsByDepth: [[['c2'], 'place1'], [['p3'], 'place1'], [['p4'], 'place1']],
            replicationKeys: [['c2', {}]]
          }
        },
        {
          doc: c3, // allowed
          viewResults: {
            contactsByDepth: [[['c3'], null], [['p1'], null], [['facility_id'], null]],
            replicationKeys: [['c3', {}]]
          }
        },
        {
          doc: c4, // denied
          viewResults: {
            contactsByDepth: [[['c4'], null], [['p3'], null], [['p4'], null]],
            replicationKeys: [['c4', {}]]
          }
        },
        {
          doc: c5, // allowed
          viewResults: {
            contactsByDepth: [[['c5'], 'place5'], [['p2'], 'place5'], [['facility_id'], 'place5']],
            replicationKeys: [['c5', {}]]
          }
        },
      ];

      db.medic.query.resolves({ rows: [] });
      sinon.stub(db.medic, 'allDocs');

      // no tombstones
      db.medic.allDocs.withArgs(sinon.match({ start_key: sinon.match.any })).resolves({ rows: [] });
      db.medic.allDocs
        .withArgs(sinon.match({ keys: sinon.match.array }))
        .resolves({ rows: [
          { id: 'c1', doc: c1 },
          { id: 'c2', doc: c2 },
          { id: 'c3', doc: c3 },
          { id: 'c4', doc: c4 },
          { id: 'c5', doc: c5 },
        ] });

      const contactsByDepth = sinon.stub();
      contactsByDepth.withArgs(c1).returns([[['c1'], '123456'], [['p1'], '123456'], [['facility_id'], '123456']]);
      contactsByDepth.withArgs(c2).returns([[['c2'], 'place1'], [['p3'], 'place1'], [['p4'], 'place1']]);
      contactsByDepth.withArgs(c3).returns([[['c3'], null], [['p1'], null], [['facility_id'], null]]);
      contactsByDepth.withArgs(c4).returns([[['c4'], null], [['p3'], null], [['p4'], null]]);
      contactsByDepth.withArgs(c5).returns([[['c5'], 'place5'], [['p2'], 'place5'], [['facility_id'], 'place5']]);
      const docsByReplicationKey = sinon.stub();
      docsByReplicationKey.withArgs(c1).returns([['c1', {}]]);
      docsByReplicationKey.withArgs(c2).returns([['c2', {}]]);
      docsByReplicationKey.withArgs(c3).returns([['c3', {}]]);
      docsByReplicationKey.withArgs(c4).returns([['c4', {}]]);
      docsByReplicationKey.withArgs(c5).returns([['c5', {}]]);

      viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
      viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);

      return service
        .getScopedAuthorizationContext(userCtx, docObjs)
        .then(result => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([
            'medic-client/contacts_by_reference',
            { keys: [
              ['shortcode', 'c1'], ['tombstone-shortcode', 'c1'],
              ['shortcode', 'c2'], ['tombstone-shortcode', 'c2'],
              ['shortcode', 'c3'], ['tombstone-shortcode', 'c3'],
              ['shortcode', 'c4'], ['tombstone-shortcode', 'c4'],
              ['shortcode', 'c5'], ['tombstone-shortcode', 'c5'],
            ] }
          ]);
          db.medic.allDocs.callCount.should.equal(6);
          db.medic.allDocs.args[0].should.deep.equal([{ keys: ['c1', 'c2', 'c3', 'c4', 'c5'], include_docs: true }]);
          ['c1', 'c2', 'c3', 'c4', 'c5'].forEach((id, idx) => {
            db.medic.allDocs.args[idx + 1]
              .should.deep.equal([{ start_key: `${id}____`, end_key: `${id}____\ufff0`, include_docs: true }]);
          });

          contactsByDepth.callCount.should.equal(5);
          contactsByDepth.args.should.deep.equal([ [c1], [c2], [c3], [c4], [c5]]);

          docsByReplicationKey.callCount.should.equal(5);
          docsByReplicationKey.args.should.deep.equal([ [c1], [c2], [c3], [c4], [c5]]);

          result.subjectIds.should.have.members([
            'c1', '123456', 'c3', 'c5', 'place5', '_all', 'org.couchdb.user:user'
          ]);
        });
    });

    it('should return correct subject ids with report docs', () => {
      const docObjs = [
        { // allowed
          doc: {
            _id: 'r1', type: 'data_record',
            contact: { _id: 'c1', parent: { _id: 'p1', parent: { _id: 'facility_id' } } },
            fields: { patient_id: 'patient1' }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [['patient1', { submitter: 'c1' }]]
          }
        },
        { // denied
          doc: {
            _id: 'r2', type: 'data_record', contact: { _id: 'c2', parent: { _id: 'p2', parent: { _id: 'p3' } } },
            fields: { patient_id: 'patient2' }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [['patient2', { submitter: 'c2' }]]
          }
        },
        { // allowed
          doc: {
            _id: 'r3', type: 'data_record', contact: { _id: 'c2', parent: { _id: 'p2', parent: { _id: 'p3' } } },
            fields: { patient_id: 'patient1' }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [['patient1', { submitter: 'c2' }]]
          }
        },
        { // allowed
          doc: {
            _id: 'r4', contact: { _id: 'c1', parent: { _id: 'p1', parent: { _id: 'facility_id' } } },
            fields: { patient_uuid: 'patient3doc' }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [['patient3doc', { submitter: 'c1' }]]
          }
        },
        { // denied
          doc: {
            _id: 'r5', type: 'data_record', contact: { _id: 'c3', parent: { _id: 'p2', parent: { _id: 'p3' } } },
            fields: { patient_uuid: 'patient4doc' }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [['patient4doc', { submitter: 'c3' }]]
          }
        },
      ];

      db.medic.query.resolves({ rows: [
        { id: 'patient1doc', key: ['shortcode', 'patient1'] },
        { id: 'patient2doc', key: ['shortcode', 'patient2'] },
      ] });
      sinon.stub(db.medic, 'allDocs');
      db.medic.allDocs.withArgs(sinon.match({ start_key: sinon.match.string })).resolves({ rows: [] });
      db.medic.allDocs
        .withArgs(sinon.match({ keys: sinon.match.array }))
        .resolves({ rows: [
          {
            id: 'c1', doc: { _id: 'c1', type: 'person', parent: { _id: 'p1', parent: { _id: 'facility_id' } } }
          },
          {
            id: 'patient1doc', doc: { _id: 'patient1doc', type: 'person', patient_id: 'patient1',
              parent: { _id: 'p1', parent: { _id: 'facility_id' } } }
          },
          {
            id: 'c2', doc: { _id: 'c2', type: 'person', parent: { _id: 'p2', parent: { _id: 'p3' } } } },
          {
            id: 'patient2doc', doc: { _id: 'patient2doc', type: 'person', patient_id: 'patient2',
              parent: { _id: 'p2', parent: { _id: 'p3' } } }
          },
          {
            id: 'c3', doc: { _id: 'c3', type: 'person', parent: { _id: 'p2', parent: { _id: 'p3' } } }
          },
          {
            id: 'patient3doc', doc: { _id: 'patient3doc', type: 'person', parent: { _id: 'facility_id' } }
          },
          {
            id: 'patient4doc', doc: { _id: 'patient4doc', type: 'person', parent: { _id: 'p3' } }
          },
        ]});

      const contactsByDepth = sinon.stub();
      contactsByDepth.withArgs(sinon.match({ _id: 'c1' }))
        .returns([[['c1'], null], [['p1'], null], [['facility_id'], null]]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient1doc' }))
        .returns([[['patient1doc'], 'patient1'], [['p1'], 'patient1'], [['facility_id'], 'patient1']]);
      contactsByDepth.withArgs(sinon.match({ _id: 'c2' }))
        .returns([[['c2'], null], [['p2'], null], [['p3'], null]]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient2doc' }))
        .returns([[['patient2doc'], 'patient1'], [['p2'], 'patient2'], [['p3'], 'patient2']]);
      contactsByDepth.withArgs(sinon.match({ _id: 'c3' }))
        .returns([[['c3'], null], [['p2'], null], [['p3'], null]]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient3doc' }))
        .returns([[['patient3doc'], null], [['facility_id'], null]]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient4doc' }))
        .returns([[['patient4doc'], null], [['p3'], null]]);
      const docsByReplicationKey = sinon.stub();
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c1' })).returns([['c1', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient1doc' })).returns([['patient1doc', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c2' })).returns([['c2', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient2doc' })).returns([['patient2doc', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c3' })).returns([['c3', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient3doc' })).returns([['patient3doc', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient4doc' })).returns([['patient4doc', {}]]);

      viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
      viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);

      return service
        .getScopedAuthorizationContext(userCtx, docObjs)
        .then(result => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([
            'medic-client/contacts_by_reference',
            { keys: [
              ['shortcode', 'patient1'], ['tombstone-shortcode', 'patient1'],
              ['shortcode', 'c1'], ['tombstone-shortcode', 'c1'],
              ['shortcode', 'patient2'], ['tombstone-shortcode', 'patient2'],
              ['shortcode', 'c2'], ['tombstone-shortcode', 'c2'],
              ['shortcode', 'patient3doc'], ['tombstone-shortcode', 'patient3doc'],
              ['shortcode', 'patient4doc'], ['tombstone-shortcode', 'patient4doc'],
              ['shortcode', 'c3'], ['tombstone-shortcode', 'c3'],
            ]}
          ]);
          db.medic.allDocs.callCount.should.equal(8);
          db.medic.allDocs.args[0].should.deep.equal([{
            keys: ['patient1doc', 'c1', 'patient2doc', 'c2', 'patient3doc', 'patient4doc', 'c3'],
            include_docs: true
          }]);
          [ 'patient1doc', 'c1', 'patient2doc', 'c2', 'patient3doc', 'patient4doc', 'c3'].forEach((id, idx) => {
            db.medic.allDocs.args[idx + 1]
              .should.deep.equal([{ start_key: `${id}____`, end_key: `${id}____\ufff0`, include_docs: true }]);
          });

          contactsByDepth.callCount.should.equal(7);
          docsByReplicationKey.callCount.should.equal(7);

          result.subjectIds.should.have.members([
            'c1', 'patient1doc', 'patient1', 'patient3doc', '_all', 'org.couchdb.user:user'
          ]);
        });
    });

    it('should return correct subject ids with report docs with needs_signoff', () => {
      const docObjs = [
        { // allowed
          doc: {
            _id: 'r1', type: 'data_record',
            contact: { _id: 'c1', parent: { _id: 'p1', parent: { _id: 'facility_id' } } },
            fields: { patient_id: 'patient1', needs_signoff: true }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [
              ['patient1', { submitter: 'c1' }], ['c1', { submitter: 'c1' }],
              ['p1', { submitter: 'c1' }], ['facility_id', { submitter: 'c1' }]
            ]
          }
        },
        { // denied
          doc: {
            _id: 'r2', type: 'data_record', contact: { _id: 'c2', parent: { _id: 'p2', parent: { _id: 'p3' } } },
            fields: { patient_uuid: 'patient2', needs_signoff: true }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [
              ['patient2', { submitter: 'c2' }], ['c2', { submitter: 'c2' }],
              ['p2', { submitter: 'c2' }], ['p3', { submitter: 'c2' }]
            ]
          }
        },
      ];

      db.medic.query.resolves({ rows: [
        { id: 'patient1doc', key: ['shortcode', 'patient1'] },
        { id: 'patient2doc', key: ['shortcode', 'patient2'] },
      ] });
      sinon.stub(db.medic, 'allDocs');
      db.medic.allDocs.withArgs(sinon.match({ start_key: sinon.match.string })).resolves({ rows: [] });
      db.medic.allDocs
        .withArgs(sinon.match({ keys: sinon.match.array }))
        .resolves({ rows: [
          { id: 'c1', doc: { _id: 'c1', type: 'person', parent: { _id: 'p1', parent: { _id: 'facility_id' } } } },
          {
            id: 'patient1doc', doc: { _id: 'patient1doc', type: 'person', patient_id: 'patient1',
              parent: { _id: 'p1', parent: { _id: 'facility_id' } } }
          },
          { id: 'c2', doc: { _id: 'c2', type: 'person', parent: { _id: 'p2', parent: { _id: 'p3' } } } },
          {
            id: 'patient2doc', doc: { _id: 'patient2doc', type: 'person', patient_id: 'patient2',
              parent: { _id: 'p2', parent: { _id: 'p3' } } }
          },
          { id: 'p1', doc: { _id: 'p1', type: 'clinic', parent: { _id: 'facility_id' } } },
          { id: 'facility_id', doc: { _id: 'facility_id', type: 'district_hospital' } },
          { id: 'p2', doc: { _id: 'p2', type: 'clinic', parent: { _id: 'p3' } } },
          { id: 'p3', doc: { _id: 'p3', type: 'district_hospital' } },
        ]});

      const contactsByDepth = sinon.stub();
      contactsByDepth.withArgs(
        sinon.match({ _id: 'c1' })).returns([[['c1'], null], [['p1'], null], [['facility_id'], null]]
      );
      contactsByDepth.withArgs(
        sinon.match({ _id: 'patient1doc' }))
        .returns([[['patient1doc'], 'patient1'], [['p1'], 'patient1'], [['facility_id'], 'patient1']]
        );
      contactsByDepth.withArgs(
        sinon.match({ _id: 'c2' })).returns([[['c2'], null], [['p2'], null], [['p3'], null]]
      );
      contactsByDepth.withArgs(
        sinon.match({ _id: 'patient2doc' }))
        .returns([[['patient2doc'], 'patient2'], [['p2'], 'patient2'], [['p3'], 'patient2']]
        );
      contactsByDepth.withArgs(
        sinon.match({ _id: 'p1' })).returns([[['p1'], null], [['facility_id'], null]]
      );
      contactsByDepth.withArgs(
        sinon.match({ _id: 'facility_id' })).returns([[['facility_id'], null]]
      );
      contactsByDepth.withArgs(
        sinon.match({ _id: 'p2' })).returns([[['p2'], null], [['p3'], null]]
      );
      contactsByDepth.withArgs(
        sinon.match({ _id: 'p3' })).returns([[['p3'], null]]
      );
      const docsByReplicationKey = sinon.stub();
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c1' })).returns([['c1', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient1doc' })).returns([['patient1doc', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c2' })).returns([['c2', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient2doc' })).returns([['patient2doc', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'p1' })).returns([['p1', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'facility_id' })).returns([['facility_id', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'p2' })).returns([['p2', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'p3' })).returns([['p3', {}]]);

      viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
      viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);

      return service
        .getScopedAuthorizationContext(userCtx, docObjs)
        .then(result => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([
            'medic-client/contacts_by_reference',
            { keys: [
              ['shortcode', 'patient1'], ['tombstone-shortcode', 'patient1'],
              ['shortcode', 'c1'], ['tombstone-shortcode', 'c1'],
              ['shortcode', 'p1'], ['tombstone-shortcode', 'p1'],
              ['shortcode', 'facility_id'], ['tombstone-shortcode', 'facility_id'],
              ['shortcode', 'patient2'], ['tombstone-shortcode', 'patient2'],
              ['shortcode', 'c2'], ['tombstone-shortcode', 'c2'],
              ['shortcode', 'p2'], ['tombstone-shortcode', 'p2'],
              ['shortcode', 'p3'], ['tombstone-shortcode', 'p3'],
            ]}
          ]);
          db.medic.allDocs.callCount.should.equal(9);
          db.medic.allDocs.args[0].should.deep.equal([{
            keys: ['patient1doc','c1', 'p1','facility_id', 'patient2doc', 'c2', 'p2', 'p3'],
            include_docs: true
          }]);
          ['patient1doc','c1', 'p1','facility_id', 'patient2doc', 'c2', 'p2', 'p3'].forEach((id, idx) => {
            db.medic.allDocs.args[idx + 1]
              .should.deep.equal([{ start_key: `${id}____`, end_key: `${id}____\ufff0`, include_docs: true }]);
          });

          contactsByDepth.callCount.should.equal(8);
          docsByReplicationKey.callCount.should.equal(8);

          result.subjectIds.should.have.members([
            'c1', 'patient1doc', 'patient1', 'p1', 'facility_id', '_all', 'org.couchdb.user:user'
          ]);
        });
    });

    it('should return correct subject ids with contact and report docs', () => {
      const docObjs = [
        { // allowed
          doc: {
            _id: 'c1', type: 'person', parent: { _id: 'p1', parent: { _id: 'facility_id' } }, patient_id: 'contact1'
          },
          viewResults: {
            contactsByDepth: [[['c1'], 'contact1'], [['p1'], 'contact1'], [['facility_id'], 'contact1']],
            replicationKeys: [['c1', {}]]
          },
        },
        { // denied
          doc: { _id: 'c2', type: 'person', parent: { _id: 'p2', parent: { _id: 'p3' } }, patient_id: 'contact2' },
          viewResults: {
            contactsByDepth: [[['c2'], 'contact2'], [['p2'], 'contact2'], [['p3'], 'contact2']],
            replicationKeys: [['c2', {}]]
          },
        },
        { // allowed
          doc: {
            _id: 'r1', contact: { _id: 'c1', parent: { _id: 'p1', parent: { _id: 'facility_id' } } },
            fields: { patient_id: 'patient1' }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [['patient1', { submitter: 'c1' }]]
          }
        },
        { // denied
          doc: {
            _id: 'r2', type: 'data_record', contact: { _id: 'c2', parent: { _id: 'p2', parent: { _id: 'p3' } } },
            fields: { patient_id: 'patient2' }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [['patient2', { submitter: 'c2' }]]
          }
        },
      ];

      db.medic.query.resolves({ rows: [
        { id: 'patient1doc', key: ['shortcode', 'patient1'] },
        { id: 'patient2doc', key: ['shortcode', 'patient2'] },
      ] });
      sinon.stub(db.medic, 'allDocs');
      db.medic.allDocs.withArgs(sinon.match({ start_key: sinon.match.string })).resolves({ rows: [] });
      db.medic.allDocs
        .withArgs(sinon.match({ keys: sinon.match.array }))
        .resolves({ rows: [
          {
            id: 'c1', doc: { _id: 'c1', type: 'person', parent: { _id: 'p1', parent: { _id: 'facility_id' } },
              patient_id: 'contact1' }
          },
          {
            id: 'patient1doc', doc: { _id: 'patient1doc', type: 'person',
              patient_id: 'patient1', parent: { _id: 'p1', parent: { _id: 'facility_id' } } }
          },
          {
            id: 'c2', doc: { _id: 'c2', type: 'person', parent: { _id: 'p2', parent: { _id: 'p3' } },
              patient_id: 'contact2' }
          },
          {
            id: 'patient2doc', doc: { _id: 'patient2doc', type: 'person',
              patient_id: 'patient2', parent: { _id: 'p2', parent: { _id: 'p3' } } }
          },
        ]});

      const contactsByDepth = sinon.stub();
      contactsByDepth.withArgs(sinon.match({ _id: 'c1' }))
        .returns([[['c1'], 'contact1'], [['p1'], 'contact1'], [['facility_id'], 'contact1']]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient1doc' }))
        .returns([[['patient1doc'], 'patient1'], [['p1'], 'patient1'], [['facility_id'], 'patient1']]);
      contactsByDepth.withArgs(sinon.match({ _id: 'c2' }))
        .returns([[['c2'], 'contact2'], [['p2'], 'contact2'], [['p3'], 'contact2']]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient2doc' }))
        .returns([[['patient2doc'], 'patient2'], [['p2'], 'patient2'], [['p3'], 'patient2']]);
      const docsByReplicationKey = sinon.stub();
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c1' })).returns([['c1', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient1doc' })).returns([['patient1doc', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c2' })).returns([['c2', {}]]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient2doc' })).returns([['patient2doc', {}]]);

      viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
      viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);

      return service
        .getScopedAuthorizationContext(userCtx, docObjs)
        .then(result => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([
            'medic-client/contacts_by_reference',
            { keys: [
              ['shortcode', 'c1'], ['tombstone-shortcode', 'c1'],
              ['shortcode', 'c2'], ['tombstone-shortcode', 'c2'],
              ['shortcode', 'patient1'], ['tombstone-shortcode', 'patient1'],
              ['shortcode', 'patient2'], ['tombstone-shortcode', 'patient2'],
            ]}
          ]);
          db.medic.allDocs.callCount.should.equal(5);
          db.medic.allDocs.args[0]
            .should.deep.equal([{ keys: ['c1', 'c2', 'patient1doc', 'patient2doc'], include_docs: true }]);
          ['c1', 'c2', 'patient1doc', 'patient2doc'].forEach((id, idx) => {
            db.medic.allDocs.args[idx + 1]
              .should.deep.equal([{ start_key: `${id}____`, end_key: `${id}____\ufff0`, include_docs: true }]);
          });

          contactsByDepth.callCount.should.equal(4);
          docsByReplicationKey.callCount.should.equal(4);

          result.subjectIds.should.have.members([
            'c1', 'contact1', 'patient1doc', 'patient1', '_all', 'org.couchdb.user:user'
          ]);
        });
    });

    describe('should return correct subject ids when dealing with tombstones', () => {
      it('deleted contacts', () => {
        const docObjs = [
          { // allowed with shortcode
            doc: {
              _id: 'c1', type: 'person', parent: { _id: 'p1', parent: { _id: 'facility_id' } },
              patient_id: 'contact1', _deleted: true
            },
            viewResults: {
              contactsByDepth: [[['c1'], 'contact1'], [['p1'], 'contact1'], [['facility_id'], 'contact1']],
              replicationKeys: [['c1', {}]]
            },
          },
          { // allowed without shortcode
            doc: { _id: 'c2', type: 'clinic', parent: { _id: 'p2', parent: { _id: 'facility_id' } }, _deleted: true },
            viewResults: {
              contactsByDepth: [[['c2'], undefined], [['p1'], undefined], [['facility_id'], undefined]],
              replicationKeys: [['c2', {}]]
            },
          },
          { // denied with shortcode
            doc: {
              _id: 'c3', type: 'person',
              parent: { _id: 'p4', parent: { _id: 'p3' } }, patient_id: 'contact3', _deleted: true
            },
            viewResults: {
              contactsByDepth: [[['c3'], 'contact3'], [['p2'], 'contact3'], [['p3'], 'contact3']],
              replicationKeys: [['c3', {}]]
            },
          },
          { // denied without shortcode
            doc: { _id: 'c4', type: 'person', parent: { _id: 'p5', parent: { _id: 'p3' } }, _deleted: true },
            viewResults: {
              contactsByDepth: [[['c4'], undefined], [['p2'], undefined], [['p3'], undefined]],
              replicationKeys: [['c4', {}]]
            },
          },
          { // not deleted allowed
            doc: { _id: 'c5', type: 'person', parent: { _id: 'p1', parent: { _id: 'facility_id' } }, },
            viewResults: {
              contactsByDepth: [[['c5'], undefined], [['p1'], undefined], [['facility_id'], undefined]],
              replicationKeys: [['c5', {}]]
            },
          },
        ];

        db.medic.query.resolves({ rows: [] });

        sinon.stub(db.medic, 'allDocs');
        db.medic.allDocs
          .withArgs(sinon.match({ start_key: 'c1____' }))
          .resolves({ rows: [
            {
              id: 'c1____rev____tombstone', doc: { _id: 'c1____rev____tombstone', type: 'tombstone',
                tombstone: { _id: 'c1', type: 'person', parent: { _id: 'p1',
                  parent: { _id: 'facility_id' } }, patient_id: 'contact1' } }
            },
          ]});
        db.medic.allDocs
          .withArgs(sinon.match({ start_key: 'c2____' }))
          .resolves({ rows: [
            // we might get more than one tombstone per doc. that's ok.
            // every one of these tombstones emit in `contacts_by_depth`
            {
              id: 'c2____rev____tombstone', doc: { _id: 'c2____rev____tombstone', type: 'tombstone',
                tombstone: { _id: 'c2', type: 'clinic', parent: { _id: 'p2',
                  parent: { _id: 'facility_id' } } } }
            },
            {
              id: 'c2____rev2____tombstone', doc: { _id: 'c2____rev2____tombstone', type: 'tombstone',
                tombstone: { _id: 'c2', _rev: 'rev2' , type: 'clinic',
                  parent: { _id: 'p2', parent: { _id: 'facility_id' } } } }
            },
          ]});
        db.medic.allDocs
          .withArgs(sinon.match({ start_key: 'c3____' }))
          .resolves({ rows: [
            {
              id: 'c3____rev____tombstone', doc: { _id: 'c3____rev____tombstone', type: 'tombstone',
                tombstone: { _id: 'c3', _rev: 'rev', type: 'person',
                  parent: { _id: 'p4', parent: { _id: 'p3' } }, patient_id: 'contact3' } }
            },
            {
              id: 'c3____rev2____tombstone', doc: { _id: 'c3____rev2____tombstone', type: 'tombstone',
                tombstone: { _id: 'c3', _rev: 'rev2', type: 'person',
                  parent: { _id: 'p4', parent: { _id: 'p3' } }, patient_id: 'contact3' } }
            },
          ]});
        db.medic.allDocs
          .withArgs(sinon.match({ start_key: 'c4____' }))
          .resolves({ rows: [
            {
              id: 'c4____rev____tombstone', doc: { _id: 'c4____rev____tombstone', type: 'tombstone',
                tombstone: { _id: 'c4', type: 'person', parent: { _id: 'p5', parent: { _id: 'p3' } } } }
            },
          ]});
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'c5____' })).resolves({ rows: []});
        db.medic.allDocs
          .withArgs(sinon.match({ keys: sinon.match.array }))
          .resolves({ rows: [
            { id: 'c1', key: 'c1', value: { deleted: true } },
            { id: 'c2', key: 'c2', error: 'not_found' },
            { id: 'c3', key: 'c3', value: { deleted: true } },
            { id: 'c4', key: 'c4', value: { deleted: true } },
            {
              id: 'c5', key: 'c4',
              doc: { _id: 'c5', type: 'person', parent: { _id: 'p1', parent: { _id: 'facility_id' } }, }
            },
          ]});

        const contactsByDepth = sinon.stub();
        contactsByDepth.withArgs(sinon.match({ _id: 'c1____rev____tombstone' }))
          .returns([[['c1'], 'contact1'], [['p1'], 'contact1'], [['facility_id'], 'contact1']]);
        contactsByDepth.withArgs(sinon.match({ _id: 'c2____rev____tombstone' }))
          .returns([[['c2'], undefined], [['p1'], undefined], [['facility_id'], undefined]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'c2____rev2____tombstone' }))
          .returns([[['c2'], undefined], [['p1'], undefined], [['facility_id'], undefined]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'c3____rev____tombstone' }))
          .returns([[['c3'], 'contact3'], [['p2'], 'contact3'], [['p3'], 'contact3']]);
        contactsByDepth.withArgs(sinon.match({ _id: 'c3____rev2____tombstone' }))
          .returns([[['c3'], 'contact3'], [['p2'], 'contact3'], [['p3'], 'contact3']]);
        contactsByDepth.withArgs(sinon.match({ _id: 'c4____rev____tombstone' }))
          .returns([[['c4'], undefined], [['p2'], undefined], [['p3'], undefined]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'c5' }))
          .returns([[['c5'], undefined], [['p1'], undefined], [['facility_id'], undefined]]);

        const docsByReplicationKey = sinon.stub();
        docsByReplicationKey.withArgs(sinon.match({ _id: 'c1____rev____tombstone' })).returns([['c1', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'c2____rev____tombstone' })).returns([['c2', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'c2____rev2____tombstone' })).returns([['c2', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'c3____rev____tombstone' })).returns([['c3', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'c3____rev2____tombstone' })).returns([['c3', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'c4____rev____tombstone' })).returns([['c4', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'c5' })).returns([['c5', {}]]);

        viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
        viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);

        tombstoneUtils.isTombstoneId.callsFake(id => id.endsWith('tombstone'));

        return service
          .getScopedAuthorizationContext(userCtx, docObjs)
          .then(result => {
            db.medic.query.callCount.should.equal(1);
            db.medic.query.args[0].should.deep.equal([
              'medic-client/contacts_by_reference',
              { keys: [
                ['shortcode', 'c1'], ['tombstone-shortcode', 'c1'],
                ['shortcode', 'c2'], ['tombstone-shortcode', 'c2'],
                ['shortcode', 'c3'], ['tombstone-shortcode', 'c3'],
                ['shortcode', 'c4'], ['tombstone-shortcode', 'c4'],
                ['shortcode', 'c5'], ['tombstone-shortcode', 'c5'],
              ]}
            ]);
            db.medic.allDocs.callCount.should.equal(6);
            db.medic.allDocs.args[0].should.deep.equal([{ keys: ['c1', 'c2', 'c3', 'c4', 'c5'], include_docs: true }]);
            ['c1', 'c2', 'c3', 'c4', 'c5'].forEach((id, idx) => {
              db.medic.allDocs.args[idx + 1]
                .should.deep.equal([{ start_key: `${id}____`, end_key: `${id}____\ufff0`, include_docs: true }]);
            });

            contactsByDepth.callCount.should.equal(7);
            docsByReplicationKey.callCount.should.equal(7);

            result.subjectIds.should.have.members(['c5', 'c1', 'contact1', 'c2', '_all', 'org.couchdb.user:user']);
          });
      });

      it('reports about deleted contacts submitted by deleted submitters', () => {
        const docObjs = [
          { // allowed
            doc: {
              _id: 'r1', type: 'data_record',
              contact: { _id: 'c1', parent: { _id: 'p1', parent: { _id: 'facility_id' } } },
              fields: { patient_id: 'patient1' }
            },
            viewResults: {
              contactsByDepth: [],
              replicationKeys: [['patient1', { submitter: 'c1' }]]
            }
          },
          { // denied
            doc: {
              _id: 'r2', type: 'data_record',
              contact: { _id: 'c2', parent: { _id: 'p2', parent: { _id: 'p3' } } }, fields: { patient_id: 'patient2' }
            },
            viewResults: {
              contactsByDepth: [],
              replicationKeys: [['patient2', { submitter: 'c2' }]]
            }
          },
          { // allowed
            doc: {
              _id: 'r3', type: 'data_record',
              contact: { _id: 'c2', parent: { _id: 'p2', parent: { _id: 'p3' } } }, fields: { patient_id: 'patient1' }
            },
            viewResults: {
              contactsByDepth: [],
              replicationKeys: [['patient1', { submitter: 'c2' }]]
            }
          },
          { // allowed
            doc: {
              _id: 'r4', contact: { _id: 'c1', parent: { _id: 'p1', parent: { _id: 'facility_id' } } },
              fields: { patient_uuid: 'patient3doc' }
            },
            viewResults: {
              contactsByDepth: [],
              replicationKeys: [['patient3doc', { submitter: 'c1' }]]
            }
          },
          { // denied
            doc: {
              _id: 'r5', type: 'data_record', contact: { _id: 'c3', parent: { _id: 'p2', parent: { _id: 'p3' } } },
              fields: { patient_uuid: 'patient4doc' }
            },
            viewResults: {
              contactsByDepth: [],
              replicationKeys: [['patient4doc', { submitter: 'c3' }]]
            }
          },
          { // allowed
            doc: {
              _id: 'r6', type: 'data_record', contact: { _id: 'c3', parent: { _id: 'p2', parent: { _id: 'p3' } } },
              fields: { patient_id: 'patient5' }
            },
            viewResults: {
              contactsByDepth: [],
              replicationKeys: [['patient5', { submitter: 'c3' }]]
            }
          },
        ];

        db.medic.query.resolves({ rows: [
          { id: 'patient1doc____rev____tombstone', key: ['tombstone-shortcode', 'patient1'] },
          { id: 'patient1doc____rev2____tombstone', key: ['tombstone-shortcode', 'patient1'] },
          { id: 'patient2doc____rev____tombstone', key: ['tombstone-shortcode', 'patient2'] },
          { id: 'patient5doc', key: ['shortcode', 'patient5'] },
        ] });
        sinon.stub(db.medic, 'allDocs');

        db.medic.allDocs.withArgs(sinon.match({ start_key: 'c1____' })).resolves({ rows: [
          {
            id: 'c1____rev____tombstone', doc: { _id: 'c1____rev____tombstone',
              tombstone: { _id: 'c1', type: 'person', parent: { _id: 'p1', parent: { _id: 'facility_id' } } } }
          },
        ] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'c2____' })).resolves({ rows: [] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'c3____' })).resolves({ rows: [
          {
            id: 'c3____rev____tombstone', doc: { _id: 'c3____rev____tombstone',
              tombstone: { _id: 'c3', type: 'person', parent: { _id: 'p2', parent: { _id: 'p3' } } } }
          },
        ] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'patient3doc____' })).resolves({ rows: [
          {
            id: 'patient3doc____rev____tombstone', doc: { _id: 'patient3doc____rev____tombstone',
              tombstone: { _id: 'patient3doc', type: 'person', parent: { _id: 'facility_id' } } }
          },
          {
            id: 'patient3doc____rev2____tombstone', doc: { _id: 'patient3doc____rev2____tombstone',
              tombstone: { _id: 'patient3doc', _rev: 'rev2', type: 'person', parent: { _id: 'facility_id' } } }
          },
        ] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'patient4doc____' })).resolves({ rows: [
          {
            id: 'patient4doc____rev____tombstone', doc: { _id: 'patient4doc____rev____tombstone',
              tombstone: { _id: 'patient4doc', type: 'person', parent: { _id: 'p3' } } }
          },
        ] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'patient5doc____' })).resolves({ rows: [] });
        db.medic.allDocs
          .withArgs(sinon.match({ keys: sinon.match.array }))
          .resolves({ rows: [
            {
              id: 'patient1doc____rev____tombstone', doc: { _id: 'patient1doc____rev____tombstone',
                tombstone: { _id: 'patient1doc', type: 'person', patient_id: 'patient1',
                  parent: { _id: 'p1', parent: { _id: 'facility_id' } } } }
            },
            {
              id: 'patient1doc____rev2____tombstone', doc: { _id: 'patient1doc____rev2____tombstone',
                tombstone: { _id: 'patient1doc', type: 'person', patient_id: 'patient1',
                  parent: { _id: 'p1', parent: { _id: 'facility_id' } } } }
            },
            {
              id: 'c1', key: 'c1', error: 'deleted'
            },
            {
              id: 'patient2doc____rev____tombstone', doc: { _id: 'patient2doc____rev____tombstone',
                tombstone: { _id: 'patient2doc', type: 'person', patient_id: 'patient2',
                  parent: { _id: 'p2', parent: { _id: 'p3' } } } }
            },
            {
              id: 'c2', doc: { _id: 'c2', type: 'person', parent: { _id: 'p2', parent: { _id: 'p3' } } }
            },
            {
              id: 'patient3doc', error: 'not_found', reason: 'deleted'
            },
            {
              id: 'patient4doc', value: { deleted: true }
            },
            {
              id: 'c3', value: { deleted: true }
            },
            {
              id: 'patient5doc', doc: { _id: 'patient5doc', type: 'person', parent: { _id: 'p3' } }
            },
          ]});

        const contactsByDepth = sinon.stub();
        contactsByDepth.withArgs(sinon.match({ _id: 'c1____rev____tombstone' }))
          .returns([[['c1'], null], [['p1'], null], [['facility_id'], null]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'c2' }))
          .returns([[['c2'], null], [['p2'], null], [['p3'], null]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'c3____rev____tombstone' }))
          .returns([[['c3'], null], [['p2'], null], [['p3'], null]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'patient1doc____rev____tombstone' }))
          .returns([[['patient1doc'], 'patient1'], [['p1'], 'patient1'], [['facility_id'], 'patient1']]);
        contactsByDepth.withArgs(sinon.match({ _id: 'patient1doc____rev2____tombstone' }))
          .returns([[['patient1doc'], 'patient1'], [['p1'], 'patient1'], [['facility_id'], 'patient1']]);
        contactsByDepth.withArgs(sinon.match({ _id: 'patient2doc____rev____tombstone' }))
          .returns([[['patient2doc'], 'patient1'], [['p2'], 'patient2'], [['p3'], 'patient2']]);
        contactsByDepth.withArgs(sinon.match({ _id: 'patient3doc____rev____tombstone' }))
          .returns([[['patient3doc'], null], [['facility_id'], null]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'patient3doc____rev2____tombstone' }))
          .returns([[['patient3doc'], null], [['facility_id'], null]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'patient4doc____rev____tombstone' }))
          .returns([[['patient4doc'], null], [['p3'], null]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'patient5doc' }))
          .returns([[['patient5doc'], null], [['p1'], null], [['facility_id'], null]]);
        const docsByReplicationKey = sinon.stub();
        docsByReplicationKey.withArgs(sinon.match({ _id: 'c1____rev____tombstone' }))
          .returns([['c1', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'c2' }))
          .returns([['c2', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'c3____rev____tombstone' }))
          .returns([['c3', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'patient1doc____rev____tombstone' }))
          .returns([['patient1doc', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'patient1doc____rev2____tombstone' }))
          .returns([['patient1doc', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'patient2doc____rev____tombstone' }))
          .returns([['patient2doc', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'patient3doc____rev____tombstone' }))
          .returns([['patient3doc', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'patient3doc____rev2____tombstone' }))
          .returns([['patient3doc', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'patient4doc____rev____tombstone' }))
          .returns([['patient4doc', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'patient5doc' }))
          .returns([['patient5doc', {}]]);

        viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth')
          .returns(contactsByDepth);
        viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key')
          .returns(docsByReplicationKey);

        tombstoneUtils.isTombstoneId.callsFake(id => id.endsWith('tombstone'));

        return service
          .getScopedAuthorizationContext(userCtx, docObjs)
          .then(result => {
            db.medic.query.callCount.should.equal(1);
            db.medic.query.args[0].should.deep.equal([
              'medic-client/contacts_by_reference',
              { keys: [
                ['shortcode', 'patient1'], ['tombstone-shortcode', 'patient1'],
                ['shortcode', 'c1'], ['tombstone-shortcode', 'c1'],
                ['shortcode', 'patient2'], ['tombstone-shortcode', 'patient2'],
                ['shortcode', 'c2'], ['tombstone-shortcode', 'c2'],
                ['shortcode', 'patient3doc'], ['tombstone-shortcode', 'patient3doc'],
                ['shortcode', 'patient4doc'], ['tombstone-shortcode', 'patient4doc'],
                ['shortcode', 'c3'], ['tombstone-shortcode', 'c3'],
                ['shortcode', 'patient5'], ['tombstone-shortcode', 'patient5'],
              ]}
            ]);
            db.medic.allDocs.callCount.should.equal(7);
            db.medic.allDocs.args[0].should.deep.equal([{
              include_docs: true,
              keys: [
                'patient1doc____rev____tombstone',
                'patient1doc____rev2____tombstone',
                'c1',
                'patient2doc____rev____tombstone',
                'c2',
                'patient3doc',
                'patient4doc',
                'c3',
                'patient5doc',
              ]
            }]);
            [ 'c1', 'c2', 'patient3doc', 'patient4doc', 'c3', 'patient5doc'].forEach((id, idx) => {
              db.medic.allDocs.args[idx + 1]
                .should.deep.equal([{ start_key: `${id}____`, end_key: `${id}____\ufff0`, include_docs: true }]);
            });

            contactsByDepth.callCount.should.equal(10);
            docsByReplicationKey.callCount.should.equal(10);

            result.subjectIds.should.have.members([
              'patient1doc', 'patient1', 'patient5doc', 'c1', 'patient3doc', '_all', 'org.couchdb.user:user'
            ]);
          });
      });

      it('reports about deleted contacts submitted by deleted submitters with needs_signoff', () => {
        const docObjs = [
          { // allowed
            doc: {
              _id: 'r1', type: 'data_record',
              contact: { _id: 'c1', parent: { _id: 'p1', parent: { _id: 'facility_id' } } },
              fields: { patient_id: 'patient1', needs_signoff: true }
            },
            viewResults: {
              contactsByDepth: [],
              replicationKeys: [
                [ 'patient1', { submitter: 'c1' }], ['c1', { submitter: 'c1' }],
                ['p1', { submitter: 'c1' }], ['facility_id', { submitter: 'c1' }]
              ]
            }
          },
          { // denied
            doc: {
              _id: 'r2', type: 'data_record',
              contact: { _id: 'c2', parent: { _id: 'p2', parent: { _id: 'p3' } } },
              fields: { patient_uuid: 'patient2', needs_signoff: true }
            },
            viewResults: {
              contactsByDepth: [],
              replicationKeys: [
                ['patient2', { submitter: 'c2' }], ['c2', { submitter: 'c2' }],
                ['p2', { submitter: 'c2' }], ['p3', { submitter: 'c2' }]
              ]
            }
          },
        ];

        db.medic.query.resolves({ rows: [
          { id: 'patient1doc____rev____tombstone', key: ['tombstone-shortcode', 'patient1'] },
          { id: 'patient2doc', key: ['shortcode', 'patient2'] },
        ] });
        sinon.stub(db.medic, 'allDocs');
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'patient2doc____' })).resolves({ rows: [] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'c1____' })).resolves({ rows: [
          {
            id: 'c1____rev____tombstone', doc: { _id: 'c1____rev____tombstone',
              tombstone: { _id: 'c1', type: 'person', parent: { _id: 'p1', parent: { _id: 'facility_id' } } } }
          },
          {
            id: 'c1____rev2____tombstone', doc: { _id: 'c1____rev2____tombstone',
              tombstone: { _id: 'c1', type: 'person', parent: { _id: 'p1', parent: { _id: 'facility_id' } } } }
          },
        ] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'c2____' })).resolves({ rows: [
          {
            id: 'c2____rev____tombstone', doc: { _id: 'c2____rev____tombstone',
              tombstone: { _id: 'c2', type: 'person', parent: { _id: 'p2', parent: { _id: 'p3' } } } }
          },
        ] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'p1____' })).resolves({ rows: [] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'facility_id____' })).resolves({ rows: [] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'p2____' })).resolves({ rows: [
          {
            id: 'p2____rev____tombstone', doc: { _id: 'p2____rev____tombstone',
              tombstone: { _id: 'p2', type: 'clinic', parent: { _id: 'p3' } } }
          },
        ] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'p3____' })).resolves({ rows: [] });

        db.medic.allDocs
          .withArgs(sinon.match({ keys: sinon.match.array }))
          .resolves({ rows: [
            { id: 'c1', value: { deleted: true } },
            {
              id: 'patient1doc____rev____tombstone',
              doc: { _id: 'patient1doc____rev____tombstone', tombstone: { _id: 'patient1doc', type: 'person',
                patient_id: 'patient1', parent: { _id: 'p1', parent: { _id: 'facility_id' } } } }
            },
            { id: 'c2', error: 'not_found' },
            {
              id: 'patient2doc',
              doc: { _id: 'patient2doc', type: 'person', patient_id: 'patient2',
                parent: { _id: 'p2', parent: { _id: 'p3' } } }
            },
            { id: 'p1', doc: { _id: 'p1', type: 'clinic', parent: { _id: 'facility_id' } } },
            { id: 'facility_id', doc: { _id: 'facility_id', type: 'district_hospital' } },
            { id: 'p2', error: 'not_found' },
            { id: 'p3', doc: { _id: 'p3', type: 'district_hospital' } },
          ]});

        const contactsByDepth = sinon.stub();
        contactsByDepth.withArgs(sinon.match({ _id: 'c1____rev____tombstone' }))
          .returns([[['c1'], null], [['p1'], null], [['facility_id'], null]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'c1____rev2____tombstone' }))
          .returns([[['c1'], null], [['p1'], null], [['facility_id'], null]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'patient1doc____rev____tombstone' }))
          .returns([[['patient1doc'], 'patient1'], [['p1'], 'patient1'], [['facility_id'], 'patient1']]);
        contactsByDepth.withArgs(sinon.match({ _id: 'c2____rev____tombstone' }))
          .returns([[['c2'], null], [['p2'], null], [['p3'], null]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'patient2doc' }))
          .returns([[['patient2doc'], 'patient2'], [['p2'], 'patient2'], [['p3'], 'patient2']]);
        contactsByDepth.withArgs(sinon.match({ _id: 'p1' }))
          .returns([[['p1'], null], [['facility_id'], null]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'facility_id' }))
          .returns([[['facility_id'], null]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'p2____rev____tombstone' }))
          .returns([[['p2'], null], [['p3'], null]]);
        contactsByDepth.withArgs(sinon.match({ _id: 'p3' }))
          .returns([[['p3'], null]]);
        const docsByReplicationKey = sinon.stub();
        docsByReplicationKey.withArgs(sinon.match({ _id: 'c1____rev____tombstone' }))
          .returns([['c1', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'c1____rev2____tombstone' }))
          .returns([['c1', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'patient1doc____rev____tombstone' }))
          .returns([['patient1doc', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'c2____rev____tombstone' }))
          .returns([['c2', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'patient2doc' }))
          .returns([['patient2doc', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'p1' }))
          .returns([['p1', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'facility_id' }))
          .returns([['facility_id', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'p2____rev____tombstone' }))
          .returns([['p2', {}]]);
        docsByReplicationKey.withArgs(sinon.match({ _id: 'p3' }))
          .returns([['p3', {}]]);

        viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
        viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);

        tombstoneUtils.isTombstoneId.callsFake(id => id.endsWith('tombstone'));

        return service
          .getScopedAuthorizationContext(userCtx, docObjs)
          .then(result => {
            db.medic.query.callCount.should.equal(1);
            db.medic.query.args[0].should.deep.equal([
              'medic-client/contacts_by_reference',
              { keys: [
                ['shortcode', 'patient1'], ['tombstone-shortcode', 'patient1'],
                ['shortcode', 'c1'], ['tombstone-shortcode', 'c1'],
                ['shortcode', 'p1'], ['tombstone-shortcode', 'p1'],
                ['shortcode', 'facility_id'], ['tombstone-shortcode', 'facility_id'],
                ['shortcode', 'patient2'], ['tombstone-shortcode', 'patient2'],
                ['shortcode', 'c2'], ['tombstone-shortcode', 'c2'],
                ['shortcode', 'p2'], ['tombstone-shortcode', 'p2'],
                ['shortcode', 'p3'], ['tombstone-shortcode', 'p3'],
              ]}
            ]);
            db.medic.allDocs.callCount.should.equal(8);
            db.medic.allDocs.args[0].should.deep.equal([{
              keys: ['patient1doc____rev____tombstone','c1', 'p1','facility_id', 'patient2doc', 'c2', 'p2', 'p3'],
              include_docs: true
            }]);
            ['c1', 'p1','facility_id', 'patient2doc', 'c2', 'p2', 'p3'].forEach((id, idx) => {
              db.medic.allDocs.args[idx + 1]
                .should.deep.equal([{ start_key: `${id}____`, end_key: `${id}____\ufff0`, include_docs: true }]);
            });

            contactsByDepth.callCount.should.equal(9);
            docsByReplicationKey.callCount.should.equal(9);

            result.subjectIds.should.have.members([
              'patient1doc', 'patient1', 'p1', 'facility_id', 'c1', '_all', 'org.couchdb.user:user'
            ]);
          });
      });
    });

    describe('getReplicationKeys', () => {
      const getReplicationKeys = service.__get__('getReplicationKeys');

      it('should return nothing with no input', () => {
        getReplicationKeys().should.deep.equal([]);
        getReplicationKeys(false).should.deep.equal([]);
        getReplicationKeys({}).should.deep.equal([]);
        getReplicationKeys({ a: 1 }).should.deep.equal([]);
        getReplicationKeys({ replicationKeys: [] }).should.deep.equal([]);
      });

      it('should return all emitted keys and values', () => {
        getReplicationKeys({ replicationKeys: [['patient_id', {}]] }).should.deep.equal(['patient_id']);
        getReplicationKeys({ replicationKeys: [['patient', { submitter: 'contact' }]] })
          .should.deep.equal(['patient', 'contact']);
        const manyReplicationKeys = [
          ['patient1', { submitter: 'contact1' }],
          ['patient2', { submitter: 'contact2' }],
          ['patient3', { submitter: 'contact3' }],
        ];
        getReplicationKeys({ replicationKeys: manyReplicationKeys })
          .should.deep.equal(['patient1', 'contact1', 'patient2', 'contact2', 'patient3', 'contact3']);
      });
    });

    describe('findContactsByReplicationKeys', () => {
      const findContactsByReplicationKeys = service.__get__('findContactsByReplicationKeys');

      it('should return nothing with no input', () => {
        return Promise
          .all([
            findContactsByReplicationKeys(),
            findContactsByReplicationKeys(false),
            findContactsByReplicationKeys([]),
          ])
          .then(results => {
            results.forEach(result => result.should.deep.equal([]));
          });
      });

      it('should execute query with unique subject ids', () => {
        db.medic.query.resolves({ rows: [] });
        sinon.stub(db.medic, 'allDocs');
        db.medic.allDocs.withArgs(sinon.match({ start_key: sinon.match.string })).resolves({ rows: [] });
        db.medic.allDocs.withArgs(sinon.match({ keys: sinon.match.array })).resolves({
          rows: [
            { id: 'a', doc: { _id: 'a' } },
            { id: 'b', doc: { _id: 'b' } }
          ]
        });
        return findContactsByReplicationKeys(['a', 'b', 'b', 'a', 'a']).then(result => {
          result.should.deep.equal([{ _id: 'a' }, { _id: 'b' }]);
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([
            'medic-client/contacts_by_reference',
            { keys: [
              ['shortcode', 'a'], ['tombstone-shortcode', 'a'], ['shortcode', 'b'], ['tombstone-shortcode', 'b']
            ] }
          ]);
          db.medic.allDocs.callCount.should.equal(3);
          db.medic.allDocs.args[0].should.deep.equal([{ keys: ['a', 'b'], include_docs: true }]);
          ['a', 'b'].forEach((id, idx) => {
            db.medic.allDocs.args[idx + 1]
              .should.deep.equal([{ start_key: `${id}____`, end_key: `${id}____\ufff0`, include_docs: true }]);
          });
        });
      });

      it('should request contacts with returned uuids', () => {
        db.medic.query.resolves({ rows: [
          { id: 'person1', key: ['shortcode', 'patient_1'] },
          { id: 'person2', key: ['shortcode', 'patient_2'] },
        ] });
        sinon.stub(db.medic, 'allDocs');
        db.medic.allDocs.withArgs(sinon.match({ start_key: sinon.match.string })).resolves({ rows: [] });
        db.medic.allDocs.withArgs(sinon.match({ keys: sinon.match.array })).resolves({ rows: [
          { id: 'contact1', key: 'contact1', doc: { _id: 'contact1' } },
          { id: 'person1', key: 'person1', doc: { _id: 'person1' } },
          { id: 'contact2', key: 'contact2', doc: { _id: 'contact2' } },
          { id: 'person2', key: 'person2', doc: { _id: 'person2' } },
          { key: 'patient_3', error: 'not_found' },
        ] });

        return findContactsByReplicationKeys([
          'contact1', 'patient_1', 'contact1', 'contact2', 'patient_2', 'patient_2', 'patient_3'
        ]).then(result => {
          result
            .should.deep.equal([ { _id: 'contact1' }, { _id: 'person1' }, { _id: 'contact2' }, { _id: 'person2' } ]);
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal(['medic-client/contacts_by_reference', {
            keys: [
              ['shortcode', 'contact1'], ['tombstone-shortcode', 'contact1'],
              ['shortcode', 'patient_1'], ['tombstone-shortcode', 'patient_1'],
              ['shortcode', 'contact2'], ['tombstone-shortcode', 'contact2'],
              ['shortcode', 'patient_2'], ['tombstone-shortcode', 'patient_2'],
              ['shortcode', 'patient_3'], ['tombstone-shortcode', 'patient_3'],
            ]
          }]);
          db.medic.allDocs.callCount.should.equal(6);
          db.medic.allDocs.args[0].should.deep.equal([{
            keys: ['contact1', 'person1', 'contact2', 'person2', 'patient_3'],
            include_docs: true,
          }]);
          ['contact1', 'person1', 'contact2', 'person2', 'patient_3'].forEach((id, idx) => {
            db.medic.allDocs.args[idx + 1]
              .should.deep.equal([{ start_key: `${id}____`, end_key: `${id}____\ufff0`, include_docs: true }]);
          });
        });
      });

      it('should request tombstones with and without shortcodes', () => {
        db.medic.query.resolves({ rows: [
          { id: 'person1', key: ['shortcode', 'patient1'] },
          { id: 'person2____rev____tombstone', key: ['tombstone-shortcode', 'patient2'] },
          { id: 'person3____rev____tombstone', key: ['tombstone-shortcode', 'patient3'] },
        ] });
        sinon.stub(db.medic, 'allDocs');
        db.medic.allDocs.withArgs(sinon.match({ keys: sinon.match.array })).resolves({ rows: [
          { id: 'contact1', key: 'contact1', doc: { _id: 'contact1' } },
          { id: 'person1', key: 'person1', doc: { _id: 'person1' } },
          { id: 'contact2', key: 'contact2', value: { deleted: true } },
          {
            id: 'person2____rev____tombstone', key: 'person2____rev____tombstone',
            doc: { _id: 'person2____rev____tombstone', tombstone: { _id: 'person2' } }
          },
          {
            id: 'person3____rev____tombstone', key: 'person3____rev____tombstone',
            doc: { _id: 'person3____rev____tombstone', tombstone: { _id: 'person3' } }
          },
          { id: 'contact3', key: 'contact3', value: { deleted: true } },
        ] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'contact1____' })).resolves({ rows: [] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'person1____' })).resolves({ rows: [] });
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'contact2____' })).resolves({ rows: [
          {
            id: 'contact2____rev____tombstone', key: 'contact2____rev____tombstone',
            doc: { _id: 'contact2____rev____tombstone', tombstone: { _id: 'contact2' } }
          }
        ]});
        db.medic.allDocs.withArgs(sinon.match({ start_key: 'contact3____' })).resolves({ rows: [
          {
            id: 'contact3____rev____tombstone', key: 'contact3____rev____tombstone',
            doc: { _id: 'contact3____rev____tombstone', tombstone: { _id: 'contact3' } }
          }
        ]});
        tombstoneUtils.isTombstoneId.callsFake(id => id.endsWith('tombstone'));

        return findContactsByReplicationKeys(
          ['contact1', 'patient1', 'contact2', 'patient2', 'patient3', 'contact3']
        ).then(result => {
          result.should.deep.equal([
            { _id: 'contact1' },
            { _id: 'person1' },
            { _id: 'person2____rev____tombstone', tombstone: { _id: 'person2' } },
            { _id: 'person3____rev____tombstone', tombstone: { _id: 'person3' } },
            { _id: 'contact2____rev____tombstone', tombstone: { _id: 'contact2' } },
            { _id: 'contact3____rev____tombstone', tombstone: { _id: 'contact3' } },
          ]);

          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal(['medic-client/contacts_by_reference', {
            keys: [
              ['shortcode', 'contact1'], ['tombstone-shortcode', 'contact1'],
              ['shortcode', 'patient1'], ['tombstone-shortcode', 'patient1'],
              ['shortcode', 'contact2'], ['tombstone-shortcode', 'contact2'],
              ['shortcode', 'patient2'], ['tombstone-shortcode', 'patient2'],
              ['shortcode', 'patient3'], ['tombstone-shortcode', 'patient3'],
              ['shortcode', 'contact3'], ['tombstone-shortcode', 'contact3'],
            ]
          }]);
          db.medic.allDocs.callCount.should.equal(5);
          db.medic.allDocs.args[0].should.deep.equal([{
            keys: [
              'contact1', 'person1', 'contact2', 'person2____rev____tombstone',
              'person3____rev____tombstone', 'contact3'
            ],
            include_docs: true,
          }]);
          ['contact1', 'person1', 'contact2', 'contact3'].forEach((id, idx) => {
            db.medic.allDocs.args[idx + 1]
              .should.deep.equal([{ start_key: `${id}____`, end_key: `${id}____\ufff0`, include_docs: true }]);
          });
        });
      });
    });

    describe('getPatientId', () => {
      const getContactShortcode = service.__get__('getContactShortcode');
      it('should not crash with incorrect input', () => {
        should.not.exist(getContactShortcode());
        getContactShortcode(false).should.equal(false);
        should.not.exist(getContactShortcode({}));
        should.not.exist(getContactShortcode({ contactsByDepth: [] }));
      });

      it('should return patient_id', () => {
        getContactShortcode({ contactsByDepth: [[['parent'], 'patient']] }).should.equal('patient');
        getContactShortcode({ contactsByDepth: [[['parent'], 'patient'], [['parent', 0], 'patient']] })
          .should.equal('patient');
      });
    });
  });
});

