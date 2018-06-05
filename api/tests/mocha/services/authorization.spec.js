const db = require('../../../src/db-pouch'),
      sinon = require('sinon').sandbox.create(),
      config = require('../../../src/config'),
      auth = require('../../../src/auth'),
      tombstoneUtils = require('@shared-libs/tombstone-utils'),
      viewMapUtils = require('@shared-libs/view-map-utils'),
      service = require('../../../src/services/authorization');

require('chai').should();
const userCtx = { name: 'user', contact_id: 'contact_id', facility_id: 'facility_id' },
      subjectIds = [1, 2, 3];

let contact,
    report,
    feed,
    viewResults,
    keysByDepth;

describe('Authorization service', () => {
  afterEach(function() {
    sinon.restore();
  });

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

  describe('getUserAuthorizationData', () => {
    beforeEach(() => {
      sinon.stub(service, 'getDepth');
    });

    it('queries correct views with correct keys when depth is not infinite', () => {
      service.getDepth.returns(2);
      return service
        .getUserAuthorizationData( {facility_id: 'facilityId' })
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
        .getUserAuthorizationData({ facility_id: 'facilityId' })
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
        .getUserAuthorizationData({facility_id: 'facilityId' })
        .then(result => {
          tombstoneUtils.extractStub.callCount.should.equal(3);
          tombstoneUtils.extractStub.args.should.deep.equal([
            ['tombstone-1'], ['tombstone-2'], ['tombstone-3']
          ]);
          result.subjectIds.sort().should.deep.equal([
            1, 2, 'deleted-1', 'deleted-2', 'deleted-3', '_all',
            's1', 's2', 's3', 's4', 's5'
          ].sort());
        });
    });

    it('adds unassigned key if the user has required permissions', () => {
      auth.hasAllPermissions.returns(true);
      config.get.returns(true);

      return service
        .getUserAuthorizationData({ userCtx: { facility_id: 'aaa' }})
        .then(result => {
          result.subjectIds.should.deep.equal(['_all', '_unassigned']);
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
        .getUserAuthorizationData({ facility_id: 'aaa' })
        .then(result => {
          result.subjectIds.sort().should.deep.equal([1, 2, '_all', 's1', 's2']);
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
          result.length.should.equal(13);
          result.should.deep.equal([
            '_design/medic-client', 'org.couchdb.user:user',
            'r1', 'r2', 'r3', 'r4',
            'r5', 'r6', 'r9', 'r10',
            'r11', 'r12', 'r13'
          ]);
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

    it('extracts correct information for user-settings docs', () => {
      const doc = {
        id: 'user',
        type: 'user-settings',
        contact_id: 'contact-id',
        facility_id: 'facility-id'
      };
      const result = service.getViewResults(doc);
      result.couchDbUser.should.deep.equal({ contact_id: 'contact-id', facility_id: 'facility-id' });
    });
  });

  describe('allowedDoc', () => {
    it('returns false when document does not generate a replication key', () => {
      service.allowedDoc(null, { userCtx }, { replicationKeys: null, contactsByDepth: null }).should.equal(false);
    });

    it('returns true for `allowed for all` docs', () => {
      service.allowedDoc(null, { userCtx }, { replicationKeys: [['_all', {}]], contactsByDepth: null }).should.equal(true);
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

      it('returns object containing nbr of new subjects for valid contacts', () => {
        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 2], 'patient_id']
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal({ newSubjects: 2 });

        viewResults.contactsByDepth = [
          [[userCtx.facility_id], null], [[userCtx.facility_id, 0], null]
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal({ newSubjects: 1 });

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 1], 'patient_id']
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal({ newSubjects: 0 });

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
          [['parent2'], 'patient_id'], [['parent2', 2], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 3], 'patient_id']
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal({ newSubjects: 0 });
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
        service.allowedDoc(contact, feed, viewResults).should.deep.equal({ newSubjects: 0 });
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[0] }, viewResults)
          .should.deep.equal({ newSubjects: 0 });
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[1] }, viewResults)
          .should.deep.equal({ newSubjects: 0 });

        viewResults.contactsByDepth = [
          [['contact_id'], 'patient_id'], [['contact_id', 0], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 1], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 2], 'patient_id']
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal({ newSubjects: 0 });
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[0] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[1] }, viewResults)
          .should.deep.equal({ newSubjects: 0 });

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 2], 'patient_id'],
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal({ newSubjects: 0 });
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[0] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[1] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[2] }, viewResults)
          .should.deep.equal({ newSubjects: 0 });

        viewResults.contactsByDepth = [
          [['contact'], 'patient_id'], [['contact', 0], 'patient_id'],
          [['parent1'], 'patient_id'], [['parent1', 1], 'patient_id'],
          [['parent2'], 'patient_id'], [['parent2', 2], 'patient_id'],
          [[userCtx.facility_id], 'patient_id'], [[userCtx.facility_id, 3], 'patient_id'],
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal({ newSubjects: 0 });
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
          .should.deep.equal({ newSubjects: 0 });
      });

      it('adds valid contact _id and reference to subjects list, while keeping them unique', () => {
        feed.subjectIds = [];
        feed.validatedIds = [];
        viewResults = {
          replicationKeys: [['a', {}]],
          contactsByDepth: [
            [['new_contact_id'], 'new_patient_id'], [['new_contact_id', 0], 'new_patient_id'],
            [[userCtx.facility_id], 'new_patient_id'], [[userCtx.facility_id, 1], 'new_patient_id']
          ]};

        service.allowedDoc('new_contact_id', feed, viewResults).should.deep.equal({ newSubjects: 2 });
        feed.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);

        service.allowedDoc('new_contact_id', feed, viewResults).should.deep.equal({ newSubjects: 0 });
        feed.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);

        viewResults = {
          replicationKeys: [['a', {}]],
          contactsByDepth: [
            [['second_new_contact_id'], 'second_patient_id'], [['second_new_contact_id', 0], 'second_patient_id'],
            [['parent1'], 'second_patient_id'], [['parent1', 1], 'second_patient_id']
          ]};
        service.allowedDoc('second_new_contact_id', feed, viewResults).should.equal(false);
        feed.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);
      });

      it('removes invalid contact _id and reference from subjects list', () => {
        feed.subjectIds = ['person_id', 'person_id', 'contact_id', 'person_ref', 'contact_id', 'person_ref', 's'];

        viewResults = {
          replicationKeys: [['a', {}]],
          contactsByDepth: [
            [['person_id'], 'person_ref'], [['person_id', 0], 'person_ref'],
            [['parent1'], 'person_ref'], [['parent1', 1], 'person_ref']
          ]};

        service.allowedDoc('person_id', feed, viewResults).should.equal(false);
        feed.subjectIds.should.deep.equal(['contact_id', 'contact_id', 's']);
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
        service.allowedDoc(report, feed, viewResults).should.equal(false);

        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.facility_id ];
        viewResults = { replicationKeys: [[userCtx.facility_id, { submitter: 'submitter' }]], contactsByDepth: [] };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
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

    describe('isAuthChange', () => {
      it('returns true if change affects user contact or facility, false otherwise', () => {
        const userCtx = { name: 'user', facility_id: 'facility_id', contact_id: 'contact_id' };
        let viewResults = { couchDbUser: { facility_id: 'new_facility_id', contact_id: 'contact_id' }};
        service.isAuthChange('org.couchdb.user:user', userCtx, viewResults).should.equal(true);

        viewResults = { couchDbUser: { facility_id: 'new_facility_id', contact_id: 'new_contact_id' }};
        service.isAuthChange('org.couchdb.user:user', userCtx, viewResults).should.equal(true);

        viewResults = { couchDbUser: { facility_id: 'facility_id', contact_id: 'contact_id' }};
        service.isAuthChange('org.couchdb.user:user', userCtx, viewResults).should.equal(false);

        viewResults = { couchDbUser: false };
        service.isAuthChange('someId', userCtx, viewResults).should.equal(false);
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
});

