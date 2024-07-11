const db = require('../../../src/db');
const sinon = require('sinon');
const config = require('../../../src/config');
const auth = require('../../../src/auth');
const viewMapUtils = require('@medic/view-map-utils');
const rewire = require('rewire');
const service = rewire('../../../src/services/authorization');

const should = require('chai').should();
const { assert } = require('chai');
const userCtx = {
  name: 'user',
  contact_id: 'contact_id',
  facility_id: ['facility_id'],
  contact: { _id: 'contact_id', patient_id: 'contact_shortcode', name: 'contact', type: 'person' },
  facility: [{ _id: 'facility_id', place_id: 'facility_shortcode', name: 'health center', type: 'health_center' }],
};
const userCtxMultiFacility = {
  name: 'user',
  contact_id: 'contact_id',
  facility_id: ['facility1', 'facility2'],
  contact: { _id: 'contact_id', patient_id: 'contact_shortcode', name: 'contact', type: 'person' },
  facility: [
    { _id: 'facility1', place_id: 'fac1', name: 'health center', type: 'health_center' },
    { _id: 'facility2', place_id: 'fac2', name: 'health center', type: 'health_center' }
  ],
};
const subjectIds = [1, 2, 3];

let contact;
let report;
let feed;
let viewResults;
let keysByDepth;

describe('Authorization service', () => {
  afterEach(() => sinon.restore());

  beforeEach(() => {
    sinon.stub(config, 'get');
    sinon.stub(auth, 'hasAllPermissions');
    sinon.stub(viewMapUtils, 'getViewMapFn').returns(sinon.stub());
    sinon.stub(db.medic, 'query').resolves({ rows: [] });
  });

  describe('getDepth', () => {
    it('unlimited depth for no roles', () => {
      service.__get__('getDepth')({}).should.deep.equal({ contactDepth: -1, reportDepth: -1 });
      service.__get__('getDepth')({ name: 'a'}).should.deep.equal({ contactDepth: -1, reportDepth: -1 });
      service.__get__('getDepth')({ roles: []}).should.deep.equal({ contactDepth: -1, reportDepth: -1 });
    });

    it('unlimited depth when no settings found', () => {
      config.get.returns(false);
      service.__get__('getDepth')({ roles: ['some_role'] }).should.deep.equal({ contactDepth: -1, reportDepth: -1 });
    });

    it('unlimited depth when no settings for role is found, or settings depth is incorrect', () => {
      config.get.returns([ { role: 'role' }, { role: 'alpha' } ]);
      service.__get__('getDepth')({ roles: ['some_role'] }).should.deep.equal({ contactDepth: -1, reportDepth: -1 });

      config.get.returns([ { role: 'some_role' } ]);
      service.__get__('getDepth')({ roles: ['some_role'] }).should.deep.equal({ contactDepth: -1, reportDepth: -1 });

      config.get.returns([ { role: 'some_role', depth: 'aaa' } ]);
      service.__get__('getDepth')({ roles: ['some_role'] }).should.deep.equal({ contactDepth: -1, reportDepth: -1 });
    });

    it('returns biggest value', () => {
      const settings = [
        { role: 'a', depth: 1 },
        { role: 'b', depth: 2 },
        { role: 'c', depth: 3 },
        { role: 'd', depth: 4 }
      ];

      config.get.returns(settings);
      service.__get__('getDepth')({ roles: ['a', 'b', 'd'] }).should.deep.equal({ contactDepth: 4, reportDepth: -1 });
    });

    it('should return report depth associated with selected depth', () => {
      const settings1 = [
        { role: 'a', depth: 1, report_depth: 0 },
        { role: 'b', depth: 2, report_depth: 1 },
        { role: 'c', report_depth: 3 },
        { role: 'd', report_depth: 4 },
      ];

      config.get.returns(settings1);
      service.__get__('getDepth')({ roles: ['a', 'b', 'd'] }).should.deep.equal({ contactDepth: 2, reportDepth: 1 });

      const settings2 = [
        { role: 'a', depth: 1, report_depth: 0 },
        { role: 'b', depth: 2, report_depth: 1 },
        { role: 'c', depth: 3 },
        { role: 'd', depth: 4 },
      ];

      config.get.returns(settings2);
      service.__get__('getDepth')({ roles: ['a', 'b', 'd'] }).should.deep.equal({ contactDepth: 4, reportDepth: -1 });
    });
  });

  describe('getAuthorizationContext', () => {
    let revertDepth;

    beforeEach(() => {
      revertDepth = service.__set__('getDepth', sinon.stub());
    });
    afterEach(() => {
      revertDepth();
    });

    it('queries correct views with correct keys when depth is not infinite', () => {
      service.__get__('getDepth').returns({ contactDepth: 2, reportDepth: -1 });
      return service
        .getAuthorizationContext( {facility_id: ['facilityId'] })
        .then(() => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0][0].should.equal('medic/contacts_by_depth');

          db.medic.query.args[0][1].should.deep.equal({
            keys: [[ 'facilityId', 0 ], [ 'facilityId', 1 ], [ 'facilityId', 2 ]]
          });
        });
    });

    it('queries correct views with correct keys when depth is not infinite with multiple facilities', () => {
      service.__get__('getDepth').returns({ contactDepth: 2, reportDepth: -1 });
      return service
        .getAuthorizationContext( {facility_id: ['a', 'b', 'c'] })
        .then(() => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0][0].should.equal('medic/contacts_by_depth');

          db.medic.query.args[0][1].should.deep.equal({
            keys: [
              [ 'a', 0 ], [ 'a', 1 ], [ 'a', 2 ],
              [ 'b', 0 ], [ 'b', 1 ], [ 'b', 2 ],
              [ 'c', 0 ], [ 'c', 1 ], [ 'c', 2 ],
            ]
          });
        });
    });

    it('queries with correct keys when depth is infinite', () => {
      service.__get__('getDepth').returns({ contactDepth: -1, reportDepth: -1 });
      return service
        .getAuthorizationContext({ facility_id: ['facilityId'] })
        .then(() => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0][0].should.equal('medic/contacts_by_depth');
          db.medic.query.args[0][1].should.deep.equal({ keys: [[ 'facilityId' ]] });
        });
    });

    it('queries with correct keys when depth is infinite with multiple facilities', () => {
      service.__get__('getDepth').returns({ contactDepth: -1, reportDepth: -1 });
      return service
        .getAuthorizationContext({ facility_id: ['a', 'b', 'c'] })
        .then(() => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0][0].should.equal('medic/contacts_by_depth');
          db.medic.query.args[0][1].should.deep.equal({ keys: [[ 'a' ], [ 'b' ], [ 'c' ]] });
        });
    });

    it('adds unassigned key if the user has required permissions', () => {
      auth.hasAllPermissions.returns(true);
      config.get.returns(true);
      service.__get__('getDepth').returns({ contactDepth: -1, reportDepth: -1 });

      return service
        .getAuthorizationContext({ facility_id: 'aaa', name: 'agatha' })
        .then(result => {
          result.subjectIds.should.have.members(['_all', '_unassigned', 'org.couchdb.user:agatha']);
        });
    });

    it('returns contactsByDepthKeys array, contact and report depths', () => {
      db.medic.query.withArgs('medic/contacts_by_depth').resolves({
        rows: [{ id: 1, key: 'key', value: 's1' }, { id: 2, key: 'key', value: 's2' }]
      });
      service.__get__('getDepth').returns({ contactDepth: 2, reportDepth: -1 });
      auth.hasAllPermissions.returns(false);
      config.get.returns(false);
      return service
        .getAuthorizationContext({ facility_id: ['aaa'], name: 'peter' })
        .then(result => {
          result.subjectIds.should.have.members([1, 2, '_all', 's1', 's2', 'org.couchdb.user:peter']);
          result.contactsByDepthKeys.should.deep.equal([['aaa', 0], ['aaa', 1], ['aaa', 2]]);
          result.should.deep.include({
            contactDepth: 2,
            reportDepth: -1,
            subjectsDepth: {},
          });
        });
    });

    it('returns contactsByDepthKeys array, contact and report depths with multiple facilities', () => {
      db.medic.query.withArgs('medic/contacts_by_depth').resolves({
        rows: [{ id: 1, key: 'key', value: 's1' }, { id: 2, key: 'key', value: 's2' }]
      });
      service.__get__('getDepth').returns({ contactDepth: 2, reportDepth: -1 });
      auth.hasAllPermissions.returns(false);
      config.get.returns(false);
      return service
        .getAuthorizationContext({ facility_id: ['a', 'b'], name: 'peter' })
        .then(result => {
          result.subjectIds.should.have.members([1, 2, '_all', 's1', 's2', 'org.couchdb.user:peter']);
          result.contactsByDepthKeys.should.deep.equal([
            ['a', 0], ['a', 1], ['a', 2], ['b', 0], ['b', 1], ['b', 2]
          ]);
          result.should.deep.include({
            contactDepth: 2,
            reportDepth: -1,
            subjectsDepth: {},
          });
        });
    });

    it('should compile subjectsDepth when using reportDepth', () => {
      db.medic.query.withArgs('medic/contacts_by_depth').resolves({
        rows: [
          { id: 'aaa', key: ['aaa', 0], value: 'aaa' },
          { id: '1', key: ['aaa', 1], value: 's1' },
          { id: '2', key: ['aaa', 2], value: 's2' },
          { id: '3', key: ['aaa', 2], value: '3' },
        ]
      });
      service.__get__('getDepth').returns({ contactDepth: 2, reportDepth: 1 });
      auth.hasAllPermissions.returns(false);
      config.get.returns(false);
      return service
        .getAuthorizationContext({ facility_id: ['aaa'], name: 'peter' })
        .then(result => {
          result.subjectIds.should.have.members(['1', '2', '3', '_all', 's1', 's2', 'org.couchdb.user:peter', 'aaa']);
          result.contactsByDepthKeys.should.deep.equal([['aaa', 0], ['aaa', 1], ['aaa', 2]]);
          result.should.deep.include({
            contactDepth: 2,
            reportDepth: 1,
            subjectsDepth: {
              'aaa': 0,
              '1': 1,
              '2': 2,
              '3': 2,
              's1': 1,
              's2': 2,
            },
          });
        });
    });

    it('should compile subjectsDepth when using reportDepth and multiple facility', () => {
      db.medic.query.withArgs('medic/contacts_by_depth').resolves({
        rows: [
          { id: 'aaa', key: ['aaa', 0], value: 'aaa' },
          { id: '1', key: ['aaa', 1], value: 's1' },
          { id: '2', key: ['aaa', 2], value: 's2' },
          { id: '3', key: ['aaa', 2], value: '3' },
          { id: 'bbb', key: ['bbb', 0], value: 'bbb' },
          { id: '11', key: ['bbb', 1], value: 's11' },
          { id: '22', key: ['bbb', 2], value: 's22' },
          { id: '33', key: ['bbb', 2], value: '33' },
        ]
      });
      service.__get__('getDepth').returns({ contactDepth: 2, reportDepth: 1 });
      auth.hasAllPermissions.returns(false);
      config.get.returns(false);
      return service
        .getAuthorizationContext({ facility_id: ['aaa', 'bbb'], name: 'peter' })
        .then(result => {
          result.subjectIds.should.have.members([
            'org.couchdb.user:peter', '_all',
            '1', '2', '3', 's1', 's2', 'aaa',
            '11', '22', '33', 's11', 's22', 'bbb',
          ]);
          result.contactsByDepthKeys.should.deep.equal([
            ['aaa', 0], ['aaa', 1], ['aaa', 2],
            ['bbb', 0], ['bbb', 1], ['bbb', 2]
          ]);
          result.should.deep.include({
            contactDepth: 2,
            reportDepth: 1,
            subjectsDepth: {
              'aaa': 0,
              '1': 1,
              '2': 2,
              '3': 2,
              's1': 1,
              's2': 2,
              'bbb': 0,
              '11': 1,
              '22': 2,
              '33': 2,
              's11': 1,
              's22': 2,
            },
          });
        });
    });

    it('should compile subjectsDepth when user has access to unassigned', () => {
      db.medic.query.withArgs('medic/contacts_by_depth').resolves({
        rows: [
          { id: 'aaa', key: ['aaa', 0], value: 'aaa' },
          { id: '1', key: ['aaa', 1], value: 's1' },
          { id: '2', key: ['aaa', 2], value: 's2' },
        ]
      });
      service.__get__('getDepth').returns({ contactDepth: 3, reportDepth: 2 });
      auth.hasAllPermissions.returns(true);
      config.get.returns(true);
      return service
        .getAuthorizationContext({ facility_id: ['aaa'], name: 'peter' })
        .then(result => {
          result.subjectIds.should.have.members([
            '1', '2', '_unassigned', '_all', 's1', 's2', 'org.couchdb.user:peter', 'aaa'
          ]);
          result.contactsByDepthKeys.should.deep.equal([['aaa', 0], ['aaa', 1], ['aaa', 2], ['aaa', 3]]);
          result.should.deep.include({
            contactDepth: 3,
            reportDepth: 2,
            subjectsDepth: {
              'aaa': 0,
              '1': 1,
              '2': 2,
              's1': 1,
              's2': 2,
              '_unassigned': 0,
            },
          });
        });
    });

    it('should compile subjectsDepth when user has access to unassigned with multiple facilities', () => {
      db.medic.query.withArgs('medic/contacts_by_depth').resolves({
        rows: [
          { id: 'aaa', key: ['aaa', 0], value: 'aaa' },
          { id: '1', key: ['aaa', 1], value: 's1' },
          { id: '2', key: ['aaa', 2], value: 's2' },
          { id: 'bbb', key: ['bbb', 0], value: 'bbb' },
          { id: '11', key: ['bbb', 1], value: 's11' },
          { id: '22', key: ['bbb', 2], value: 's22' },
        ]
      });
      service.__get__('getDepth').returns({ contactDepth: 3, reportDepth: 2 });
      auth.hasAllPermissions.returns(true);
      config.get.returns(true);
      return service
        .getAuthorizationContext({ facility_id: ['aaa', 'bbb'], name: 'peter' })
        .then(result => {
          result.subjectIds.should.have.members([
            '_unassigned', '_all', 'org.couchdb.user:peter',
            '1', '2', 's1', 's2', 'aaa',
            '11', '22', 's11', 's22', 'bbb'
          ]);
          result.contactsByDepthKeys.should.deep.equal([
            ['aaa', 0], ['aaa', 1], ['aaa', 2], ['aaa', 3],
            ['bbb', 0], ['bbb', 1], ['bbb', 2], ['bbb', 3]
          ]);
          result.should.deep.include({
            contactDepth: 3,
            reportDepth: 2,
            subjectsDepth: {
              'aaa': 0,
              '1': 1,
              '2': 2,
              's1': 1,
              's2': 2,
              'bbb': 0,
              '11': 1,
              '22': 2,
              's11': 1,
              's22': 2,
              '_unassigned': 0,
            },
          });
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
      const subjectIds = [
        'sbj1', 'sbj2', 'sbj3', 'sbj4', 'facility_id', 'contact_id', 'c1', 'c2', 'c3', 'c4',
        'facility_sh', 'contact_sh',
      ];
      const userCtx = {
        name: 'user',
        facility_id: ['facility_id'],
        contact_id: 'contact_id',
        facility: [{ _id: 'facility_id', place_id: 'facility_sh' }],
        contact: { _id: 'contact_id', patient_id: 'contact_sh' },
      };
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows: [
          { id: 'r1', key: 'sbj1', value: { submitter: 'c1' } },
          { id: 'r2', key: 'sbj3', value: { } },
          { id: 'r3', key: 'sbj2', value: { submitter: 'nurse'} },
          { id: 'r4', key: null, value: { submitter: 'c2' } },
          { id: 'r5', key: 'facility_id', value: {} },
          { id: 'r6', key: 'contact_id', value: {} },
          { id: 'r7', key: 'facility_id', value: { submitter: 'c-unknown', private: true } }, //sensitive
          { id: 'r8', key: 'contact_id', value: { submitter: 'c-unknown', private: 'something' } }, //sensitive
          { id: 'r7', key: 'facility_sh', value: { submitter: 'c-unknown', private: true } }, //sensitive
          { id: 'r8', key: 'contact_sh', value: { submitter: 'c-unknown', private: 'something' } }, //sensitive
          { id: 'r9', key: 'facility_id', value: { submitter: 'c3' } },
          { id: 'r10', key: 'contact_id', value: { submitter: 'c4' } },
          { id: 'r11', key: 'sbj3', value: { } },
          { id: 'r12', key: 'sbj4', value: { submitter: 'someone' } },
          { id: 'r13', key: false, value: { submitter: 'someone else' } },
          { id: 'r14', key: 'contact_id', value: { submitter: 'c-unknown', private: false } }, // not sensitive
        ]});

      return service
        .getAllowedDocIds({ subjectIds, userCtx })
        .then(result => {
          result.should.have.members([
            '_design/medic-client', 'org.couchdb.user:user',
            'r1', 'r2', 'r3', 'r4',
            'r5', 'r6', 'r9', 'r10',
            'r11', 'r12', 'r13', 'r14'
          ]);
        });
    });

    it('merges results from view, except for sensitive, includes ddoc and user doc with multiple facilities', () => {
      const subjectIds = [
        'sbj1', 'sbj2', 'sbj3', 'sbj4', 'facility_id', 'contact_id', 'c1', 'c2', 'c3', 'c4',
        'facility_sh', 'contact_sh',
      ];
      const userCtx = {
        name: 'user',
        facility_id: ['f1', 'f2'],
        contact_id: 'contact_id',
        facility: [{ _id: 'f1', place_id: 'f1_sh' }, { _id: 'f2', place_id: 'f2_sh' }],
        contact: { _id: 'contact_id', patient_id: 'contact_sh' },
      };
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows: [
          { id: 'r1', key: 'sbj1', value: { submitter: 'c1' } },
          { id: 'r2', key: 'sbj3', value: { } },
          { id: 'r3', key: 'sbj2', value: { submitter: 'nurse'} },
          { id: 'r4', key: null, value: { submitter: 'c2' } },
          { id: 'r5', key: 'f1', value: {} },
          { id: 'r55', key: 'f2', value: {} },
          { id: 'r6', key: 'contact_id', value: {} },
          { id: 'r7', key: 'f1', value: { submitter: 'c-unknown', private: true } }, //sensitive
          { id: 'r77', key: 'f2', value: { submitter: 'c-unknown', private: true } }, //sensitive
          { id: 'r8', key: 'contact_id', value: { submitter: 'c-unknown', private: 'something' } }, //sensitive
          { id: 'r7', key: 'f1_sh', value: { submitter: 'c-unknown', private: true } }, //sensitive
          { id: 'r77', key: 'f1_sh', value: { submitter: 'c-unknown', private: true } }, //sensitive
          { id: 'r8', key: 'contact_sh', value: { submitter: 'c-unknown', private: 'something' } }, //sensitive
          { id: 'r9', key: 'f1', value: { submitter: 'c3' } },
          { id: 'r99', key: 'f2', value: { submitter: 'c3' } },
          { id: 'r10', key: 'contact_id', value: { submitter: 'c4' } },
          { id: 'r11', key: 'sbj3', value: { } },
          { id: 'r12', key: 'sbj4', value: { submitter: 'someone' } },
          { id: 'r13', key: false, value: { submitter: 'someone else' } },
          { id: 'r14', key: 'contact_id', value: { submitter: 'c-unknown', private: false } }, // not sensitive
        ]});

      return service
        .getAllowedDocIds({ subjectIds, userCtx })
        .then(result => {
          result.should.have.members([
            '_design/medic-client', 'org.couchdb.user:user',
            'r1', 'r2', 'r3', 'r4',
            'r5', 'r55', 'r6', 'r9', 'r99', 'r10',
            'r11', 'r12', 'r13', 'r14'
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

      return service
        .getAllowedDocIds({
          subjectIds,
          userCtx: { name: 'user', facility_id: ['facility_id'], contact_id: 'contact_id' }
        })
        .then(result => {
          result.should.deep.equal(['_design/medic-client', 'org.couchdb.user:user', 'r1', 'r2', 'r3']);
        });
    });

    it('should add all reports when reportDepth is not used', () => {
      const subjectIds = ['subject', 'contact', 'parent'];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows:
            [
              { id: 'r1', key: 'subject', value: { submitter: null, type: 'data_record' } },
              { id: 'r2', key: 'contact', value: { type: 'data_record' } },
              { id: 'r3', key: 'parent', value: { type: 'task' } },
              { id: 'r4', key: 'contact', value: { type: 'target' } },
              { id: 'r5', key: 'parent', value: { type: 'contact' } },
              { id: 'r6', key: 'subject', value: { type: 'data_record', submitter: 'some_person' } },
            ]
        });

      return service
        .getAllowedDocIds({
          subjectIds,
          userCtx: { name: 'user', facility_id: ['facility_id'], contact_id: 'contact_id' },
          contactDepth: 3,
          reportDepth: -1,
          subjectsDepth: {},
        })
        .then(result => {
          result.should.have.members([
            '_design/medic-client', 'org.couchdb.user:user',
            'r1', 'r2', 'r3', 'r4', 'r5', 'r6'
          ]);
        });
    });

    it('should only add valid depth reports when reportDepth is used', () => {
      const subjectIds = ['subject', 'contact', 'parent'];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows:
            [
              { id: 'r1', key: 'subject', value: { submitter: null, type: 'data_record' } }, // depth 2
              { id: 'r2', key: 'contact', value: { type: 'data_record' } }, // depth 1
              { id: 'r3', key: 'parent', value: { type: 'task' } }, // not a report, but depth 0
              { id: 'r4', key: 'contact', value: { type: 'target' } },  // not a report, but depth 1
              { id: 'r5', key: 'parent', value: { type: 'contact' } },  // not a report, but depth 0
              { id: 'r6', key: 'subject', value: { type: 'data_record', submitter: 'some_person' } }, // depth 2
              { id: 'r7', key: 'contact', value: { type: 'data_record', submitter: 'some_person' } }, // depth 1
              { id: 'r8', key: 'subject', value: { type: 'target' } },  // not a report, but depth 2
              { id: 'r9', key: 'subject', value: { type: 'data_record', submitter: 'contact_id' } }, // depth 2, self
            ]
        });

      return service
        .getAllowedDocIds({
          subjectIds,
          userCtx: { name: 'user', facility_id: ['facility_id'], contact_id: 'contact_id' },
          contactDepth: 2,
          reportDepth: 1,
          subjectsDepth: { 'parent': 0, 'contact': 1, 'subject': 2 },
        })
        .then(result => {
          result.should.have.members([
            '_design/medic-client', 'org.couchdb.user:user',
            'r2', 'r3', 'r4', 'r5', 'r7', 'r8', 'r9'
          ]);
        });
    });

    it('should check all entries for a report to verify valid depth', () => {
      const subjectIds = ['contact', 'parent', 'place'];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows:
            [
              { id: 'r1', key: 'place', value: { submitter: 'p', type: 'data_record' } }, // depth 1
              { id: 'r1', key: 'parent', value: { submitter: 'p', type: 'data_record' } }, // depth 0
              { id: 'r2', key: 'place', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
              { id: 'r2', key: 'parent', value: { submitter: 'contact', type: 'data_record' } }, // depth 0
              { id: 'r3', key: 'contact', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
              { id: 'r4', key: 'place', value: { submitter: 'p', type: 'data_record' } }, // depth 1
              { id: 'r5', key: 'place', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
            ]
        });

      return service
        .getAllowedDocIds({
          subjectIds,
          userCtx: { name: 'user', facility_id: ['parent'], contact_id: 'contact' },
          contactDepth: 1,
          reportDepth: 0,
          subjectsDepth: { 'parent': 0, 'contact': 1, 'place': 1 },
        })
        .then(result => {
          result.should.have.members([
            '_design/medic-client', 'org.couchdb.user:user',
            'r1', 'r2', 'r3', 'r5'
          ]);
        });
    });

    it('should exclude tasks if param is passed', () => {
      const subjectIds = ['contact', 'parent', 'place'];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows:
            [
              { id: 'r1', key: 'place', value: { submitter: 'p', type: 'data_record' } },
              { id: 'task1', key: 'org.couchdb.user:user', value: { type: 'task' } },
              { id: 'ts-r2', key: 'place', value: { submitter: 'contact', type: 'data_record' } },
              { id: 'ts-task3', key: 'org.couchdb.user:user', value: { type: 'task' } },
              { id: 'r3', key: 'contact', value: { type: 'person' } },
              { id: 'task2', key: 'org.couchdb.user:user', value: { type: 'task' } },
              { id: 'ts-r5', key: 'place', value: { type: 'clinic' } },
            ]
        });

      const ctx = {
        subjectIds,
        userCtx: { name: 'user', facility_id: ['parent'], contact_id: 'contact' },
        subjectsDepth: { 'parent': 0, 'contact': 1, 'place': 1 },
      };

      return service
        .getAllowedDocIds(ctx, { includeTasks: false })
        .then(result => {
          result.should.have.members([
            '_design/medic-client', 'org.couchdb.user:user',
            'r1', 'ts-r2', 'r3', 'ts-r5',
          ]);
        });
    });
  });

  describe('getDocsByReplicationKey', () => {
    it('should throw query errors', () => {
      db.medic.query.rejects({ some: 'error' });
      return service
        .getDocsByReplicationKey({ subjectIds, userCtx: { name: 'user' }})
        .then(() => assert.fail('should have thrown'))
        .catch(err => {
          err.should.deep.equal({ some: 'error' });
        });
    });

    it('queries correct views with correct keys', () => {
      return service
        .getDocsByReplicationKey({ subjectIds, userCtx: { name: 'user' }})
        .then(result => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([ 'medic/docs_by_replication_key', { keys: subjectIds } ]);

          result.length.should.equal(0);
        });
    });

    it('merges results from both view, except for sensitive ones, includes ddoc and user doc', () => {
      const subjectIds = [ 'sbj1', 'sbj2', 'sbj3', 'sbj4', 'facility_id', 'contact_id', 'c1', 'c2', 'c3', 'c4' ];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({
          rows: [
            { id: 'r1', key: 'sbj1', value: { submitter: 'c1' } },
            { id: 'r2', key: 'sbj3', value: { } },
            { id: 'r3', key: 'sbj2', value: { submitter: 'nurse'} },
            { id: 'r4', key: null, value: { submitter: 'c2' } },
            { id: 'r5', key: 'facility_id', value: {} },
            { id: 'r6', key: 'contact_id', value: {} },
            { id: 'r7', key: 'facility_id', value: { submitter: 'c-unknown', private: true } }, //sensitive
            { id: 'r8', key: 'contact_id', value: { submitter: 'c-unknown', private: 'something' } }, //sensitive
            { id: 'r9', key: 'facility_id', value: { submitter: 'c3' } },
            { id: 'r10', key: 'contact_id', value: { submitter: 'c4' } },
            { id: 'r11', key: 'sbj3', value: { } },
            { id: 'r12', key: 'sbj4', value: { submitter: 'someone' } },
            { id: 'r13', key: false, value: { submitter: 'someone else' } },
            { id: 'r14', key: 'contact_id', value: { submitter: 'c-unknown', private: false } }, // not sensitive
          ]
        });

      const ctx = { subjectIds, userCtx: { name: 'user', facility_id: ['facility_id'], contact_id: 'contact_id' }};
      return service
        .getDocsByReplicationKey(ctx)
        .then(result => {
          result.length.should.equal(12);
          result.should.deep.equal([
            { id: 'r1', key: 'sbj1', value: { submitter: 'c1' } },
            { id: 'r2', key: 'sbj3', value: { } },
            { id: 'r3', key: 'sbj2', value: { submitter: 'nurse'} },
            { id: 'r4', key: null, value: { submitter: 'c2' } },
            { id: 'r5', key: 'facility_id', value: {} },
            { id: 'r6', key: 'contact_id', value: {} },
            { id: 'r9', key: 'facility_id', value: { submitter: 'c3' } },
            { id: 'r10', key: 'contact_id', value: { submitter: 'c4' } },
            { id: 'r11', key: 'sbj3', value: { } },
            { id: 'r12', key: 'sbj4', value: { submitter: 'someone' } },
            { id: 'r13', key: false, value: { submitter: 'someone else' } },
            { id: 'r14', key: 'contact_id', value: { submitter: 'c-unknown', private: false } }, // not sensitive
          ]);
        });
    });

    it('merges results from view, except for sensitive, includes ddoc and user doc with multi-facility', () => {
      const subjectIds = [ 'sbj1', 'sbj2', 'sbj3', 'sbj4', 'f1', 'f2', 'contact_id', 'c1', 'c2', 'c3', 'c4' ];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({
          rows: [
            { id: 'r1', key: 'sbj1', value: { submitter: 'c1' } },
            { id: 'r2', key: 'sbj3', value: { } },
            { id: 'r3', key: 'sbj2', value: { submitter: 'nurse'} },
            { id: 'r4', key: null, value: { submitter: 'c2' } },
            { id: 'r5', key: 'f1', value: {} },
            { id: 'r55', key: 'f2', value: {} },
            { id: 'r6', key: 'contact_id', value: {} },
            { id: 'r7', key: 'f1', value: { submitter: 'c-unknown', private: true } }, //sensitive
            { id: 'r77', key: 'f2', value: { submitter: 'c-unknown', private: true } }, //sensitive
            { id: 'r8', key: 'contact_id', value: { submitter: 'c-unknown', private: 'something' } }, //sensitive
            { id: 'r9', key: 'f1', value: { submitter: 'c3' } },
            { id: 'r99', key: 'f2', value: { submitter: 'c3' } },
            { id: 'r10', key: 'contact_id', value: { submitter: 'c4' } },
            { id: 'r11', key: 'sbj3', value: { } },
            { id: 'r12', key: 'sbj4', value: { submitter: 'someone' } },
            { id: 'r13', key: false, value: { submitter: 'someone else' } },
            { id: 'r14', key: 'contact_id', value: { submitter: 'c-unknown', private: false } }, // not sensitive
          ]
        });

      const ctx = { subjectIds, userCtx: { name: 'user', facility_id: ['f1', 'f2'], contact_id: 'contact_id' }};
      return service
        .getDocsByReplicationKey(ctx)
        .then(result => {
          result.should.have.deep.members([
            { id: 'r1', key: 'sbj1', value: { submitter: 'c1' } },
            { id: 'r2', key: 'sbj3', value: { } },
            { id: 'r3', key: 'sbj2', value: { submitter: 'nurse'} },
            { id: 'r4', key: null, value: { submitter: 'c2' } },
            { id: 'r5', key: 'f1', value: {} },
            { id: 'r55', key: 'f2', value: {} },
            { id: 'r6', key: 'contact_id', value: {} },
            { id: 'r9', key: 'f1', value: { submitter: 'c3' } },
            { id: 'r99', key: 'f2', value: { submitter: 'c3' } },
            { id: 'r10', key: 'contact_id', value: { submitter: 'c4' } },
            { id: 'r11', key: 'sbj3', value: { } },
            { id: 'r12', key: 'sbj4', value: { submitter: 'someone' } },
            { id: 'r13', key: false, value: { submitter: 'someone else' } },
            { id: 'r14', key: 'contact_id', value: { submitter: 'c-unknown', private: false } }, // not sensitive
          ]);
        });
    });

    it('should add all reports when reportDepth is not used', () => {
      const subjectIds = ['subject', 'contact', 'parent'];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows:
            [
              { id: 'r1', key: 'subject', value: { submitter: null, type: 'data_record' } },
              { id: 'r2', key: 'contact', value: { type: 'data_record' } },
              { id: 'r3', key: 'parent', value: { type: 'task' } },
              { id: 'r4', key: 'contact', value: { type: 'target' } },
              { id: 'r5', key: 'parent', value: { type: 'contact' } },
              { id: 'r6', key: 'subject', value: { type: 'data_record', submitter: 'some_person' } },
            ]
        });

      return service
        .getDocsByReplicationKey({
          subjectIds,
          userCtx: { name: 'user', facility_id: ['facility_id'], contact_id: 'contact_id' },
          contactDepth: 3,
          reportDepth: -1,
          subjectsDepth: {},
        })
        .then(result => {
          result.should.deep.equal([
            { id: 'r1', key: 'subject', value: { submitter: null, type: 'data_record' } },
            { id: 'r2', key: 'contact', value: { type: 'data_record' } },
            { id: 'r3', key: 'parent', value: { type: 'task' } },
            { id: 'r4', key: 'contact', value: { type: 'target' } },
            { id: 'r5', key: 'parent', value: { type: 'contact' } },
            { id: 'r6', key: 'subject', value: { type: 'data_record', submitter: 'some_person' } },
          ]);
        });
    });

    it('should only add valid depth reports when reportDepth is used', () => {
      const subjectIds = ['subject', 'contact', 'parent'];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows:
            [
              { id: 'r1', key: 'subject', value: { submitter: null, type: 'data_record' } }, // depth 2
              { id: 'r2', key: 'contact', value: { type: 'data_record' } }, // depth 1
              { id: 'r3', key: 'parent', value: { type: 'task' } }, // not a report, but depth 0
              { id: 'r4', key: 'contact', value: { type: 'target' } },  // not a report, but depth 1
              { id: 'r5', key: 'parent', value: { type: 'contact' } },  // not a report, but depth 0
              { id: 'r6', key: 'subject', value: { type: 'data_record', submitter: 'some_person' } }, // depth 2
              { id: 'r7', key: 'contact', value: { type: 'data_record', submitter: 'some_person' } }, // depth 1
              { id: 'r8', key: 'subject', value: { type: 'target' } },  // not a report, but depth 2
              { id: 'r9', key: 'subject', value: { type: 'data_record', submitter: 'contact_id' } }, // depth 2, self
            ]
        });

      return service
        .getDocsByReplicationKey({
          subjectIds,
          userCtx: { name: 'user', facility_id: ['facility_id'], contact_id: 'contact_id' },
          contactDepth: 2,
          reportDepth: 1,
          subjectsDepth: { 'parent': 0, 'contact': 1, 'subject': 2 },
        })
        .then(result => {
          result.should.have.deep.members([
            { id: 'r2', key: 'contact', value: { type: 'data_record' } }, // depth 1
            { id: 'r3', key: 'parent', value: { type: 'task' } }, // not a report, but depth 0
            { id: 'r4', key: 'contact', value: { type: 'target' } },  // not a report, but depth 1
            { id: 'r5', key: 'parent', value: { type: 'contact' } },  // not a report, but depth 0
            { id: 'r7', key: 'contact', value: { type: 'data_record', submitter: 'some_person' } }, // depth 1
            { id: 'r8', key: 'subject', value: { type: 'target' } },  // not a report, but depth 2
            { id: 'r9', key: 'subject', value: { type: 'data_record', submitter: 'contact_id' } }, // depth 2, self
          ]);
        });
    });

    it('should check all entries for a report to verify valid depth', () => {
      const subjectIds = ['contact', 'parent', 'place'];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows:
            [
              { id: 'r1', key: 'place', value: { submitter: 'p', type: 'data_record' } }, // depth 1
              { id: 'r1', key: 'parent', value: { submitter: 'p', type: 'data_record' } }, // depth 0
              { id: 'r2', key: 'place', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
              { id: 'r2', key: 'parent', value: { submitter: 'contact', type: 'data_record' } }, // depth 0
              { id: 'r3', key: 'contact', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
              { id: 'r4', key: 'place', value: { submitter: 'p', type: 'data_record' } }, // depth 1
              { id: 'r5', key: 'place', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
            ]
        });

      return service
        .getDocsByReplicationKey({
          subjectIds,
          userCtx: { name: 'user', facility_id: ['parent'], contact_id: 'contact' },
          contactDepth: 1,
          reportDepth: 0,
          subjectsDepth: { 'parent': 0, 'contact': 1, 'place': 1 },
        })
        .then(result => {
          result.should.have.deep.members([
            { id: 'r1', key: 'place', value: { submitter: 'p', type: 'data_record' } }, // depth 1
            { id: 'r1', key: 'parent', value: { submitter: 'p', type: 'data_record' } }, // depth 0
            { id: 'r2', key: 'place', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
            { id: 'r2', key: 'parent', value: { submitter: 'contact', type: 'data_record' } }, // depth 0
            { id: 'r3', key: 'contact', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
            { id: 'r5', key: 'place', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
          ]);
        });
    });

    it('should check all entries for a report to verify valid depth multi-facility', () => {
      const subjectIds = ['contact', 'facility1', 'facility2', 'place'];
      db.medic.query
        .withArgs('medic/docs_by_replication_key')
        .resolves({ rows:
            [
              { id: 'r1', key: 'place', value: { submitter: 'p', type: 'data_record' } }, // depth 1
              { id: 'r1', key: 'facility1', value: { submitter: 'p', type: 'data_record' } }, // depth 0
              { id: 'r11', key: 'place', value: { submitter: 'p', type: 'data_record' } }, // depth 1
              { id: 'r11', key: 'facility2', value: { submitter: 'p', type: 'data_record' } }, // depth 0
              { id: 'r2', key: 'place', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
              { id: 'r2', key: 'facility1', value: { submitter: 'contact', type: 'data_record' } }, // depth 0
              { id: 'r22', key: 'place', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
              { id: 'r22', key: 'facility2', value: { submitter: 'contact', type: 'data_record' } }, // depth 0
              { id: 'r3', key: 'contact', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
              { id: 'r4', key: 'place', value: { submitter: 'p', type: 'data_record' } }, // depth 1
              { id: 'r5', key: 'place', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
            ]
        });

      return service
        .getDocsByReplicationKey({
          subjectIds,
          userCtx: { name: 'user', facility_id: ['facility1', 'facility2'], contact_id: 'contact' },
          contactDepth: 1,
          reportDepth: 0,
          subjectsDepth: { 'facility1': 0, 'facility2': 0, 'contact': 1, 'place': 1 },
        })
        .then(result => {
          result.should.have.deep.members([
            { id: 'r1', key: 'place', value: { submitter: 'p', type: 'data_record' } }, // depth 1
            { id: 'r1', key: 'facility1', value: { submitter: 'p', type: 'data_record' } }, // depth 0
            { id: 'r11', key: 'place', value: { submitter: 'p', type: 'data_record' } }, // depth 1
            { id: 'r11', key: 'facility2', value: { submitter: 'p', type: 'data_record' } }, // depth 0
            { id: 'r2', key: 'place', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
            { id: 'r2', key: 'facility1', value: { submitter: 'contact', type: 'data_record' } }, // depth 0
            { id: 'r22', key: 'place', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
            { id: 'r22', key: 'facility2', value: { submitter: 'contact', type: 'data_record' } }, // depth 0
            { id: 'r3', key: 'contact', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
            { id: 'r5', key: 'place', value: { submitter: 'contact', type: 'data_record' } }, // depth 1
          ]);
        });
    });
  });

  describe('filterAllowedDocIds', () => {
    it('should return medic-client and user-settings doc', () => {
      const authCtx = { userCtx: { name: 'joe' } };
      service.filterAllowedDocIds(authCtx, []).should.deep.equal([
        '_design/medic-client', 'org.couchdb.user:joe'
      ]);
    });

    it('should not return duplicates', () => {
      const docsByReplicationKey = [
        { id: 'r1', key: 'subject', value: {} },
        { id: 'r1', key: 'contact', value: {} },
        { id: 'r1', key: 'parent', value: {} },
        { id: 'r2', key: 'subject', value: {} },  // skipped cause r2 winning is not deleted
        { id: 'r3', key: 'contact', value: {} },
        { id: 'r2', key: 'parent', value: {} },
      ];
      const result = service.filterAllowedDocIds({ userCtx: { name: 'user' } }, docsByReplicationKey);
      result.should.deep.equal(['_design/medic-client', 'org.couchdb.user:user', 'r1', 'r2', 'r3']);
    });

    it('should include tasks if no options are passed', () => {
      const docsByReplicationKey = [
        { id: 'r1', key: 'place', value: { submitter: 'p', type: 'data_record' } },
        { id: 'task1', key: 'org.couchdb.user:user', value: { type: 'task' } },
        { id: 'r3', key: 'contact', value: { type: 'person' } },
        { id: 'task2', key: 'org.couchdb.user:user', value: { type: 'task' } },
      ];

      const result = service.filterAllowedDocIds({ userCtx: { name: 'user' } }, docsByReplicationKey);
      result.should.have.members([
        '_design/medic-client', 'org.couchdb.user:user',
        'r1', 'task1', 'r3', 'task2'
      ]);
    });

    it('should exclude tasks if param is passed', () => {
      const docsByRepKey = [
        { id: 'r1', key: 'place', value: { submitter: 'p', type: 'data_record' } },
        { id: 'task1', key: 'org.couchdb.user:user', value: { type: 'task' } },
        { id: 'ts-r2', key: 'place', value: { submitter: 'contact', type: 'data_record' } },
        { id: 'ts-task3', key: 'org.couchdb.user:user', value: { type: 'task' } },
        { id: 'r3', key: 'contact', value: { type: 'person' } },
        { id: 'task2', key: 'org.couchdb.user:user', value: { type: 'task' } },
        { id: 'ts-r5', key: 'place', value: { type: 'clinic' } },
      ];

      const ctx = { userCtx: { name: 'user' } };
      const result = service.filterAllowedDocIds(ctx, docsByRepKey, { includeTasks: false });
      result.should.have.members([
        '_design/medic-client', 'org.couchdb.user:user',
        'r1', 'ts-r2', 'r3', 'ts-r5',
      ]);
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
        facility_id: ['facility-id']
      };
      const result = service.getViewResults(doc);
      result.couchDbUser.should.deep.equal(true);
    });
  });

  describe('allowedDoc', () => {
    it('returns false when document does not generate a replication key', () => {
      service.allowedDoc(null, { userCtx }, { replicationKeys: null, contactsByDepth: null }).should.equal(false);
      service
        .allowedDoc(null, { userCtx: userCtxMultiFacility }, { replicationKeys: null, contactsByDepth: null })
        .should.equal(false);
    });

    it('returns true for `allowed for all` docs', () => {
      service
        .allowedDoc(null, { userCtx }, { replicationKeys: [{ key: '_all', value: null }], contactsByDepth: null })
        .should.equal(true);
      service
        .allowedDoc(
          null,
          { userCtx: userCtxMultiFacility },
          { replicationKeys: [{ key: '_all', value: null }], contactsByDepth: null }
        )
        .should.equal(true);
    });

    it('returns true when it is main ddoc or user contact', () => {
      service
        .allowedDoc(
          '_design/medic-client',
          { userCtx },
          { replicationKeys: [{ key: '_all', value: null}], contactsByDepth: null}
        )
        .should.equal(true);
      service
        .allowedDoc('org.couchdb.user:' + userCtx.name, { userCtx }, { replicationKeys: null, contactsByDepth: null })
        .should.equal(true);

      service
        .allowedDoc(
          '_design/medic-client',
          { userCtx: userCtxMultiFacility },
          { replicationKeys: [{ key: '_all', value: null}], contactsByDepth: null}
        )
        .should.equal(true);
      service
        .allowedDoc(
          'org.couchdb.user:' + userCtx.name,
          { userCtx: userCtxMultiFacility },
          { replicationKeys: null, contactsByDepth: null }
        )
        .should.equal(true);
    });

    describe('allowedContact', () => {
      let facility;
      beforeEach(() => {
        viewResults = {
          replicationKeys: [{ key: 'a', value: {} }],
          contactsByDepth: [{ key: ['parent1'], value: 'patient_id' }],
        };
        facility = userCtx.facility_id[0];
        feed = { userCtx, contactsByDepthKeys: [[facility]], subjectIds };
        keysByDepth = {
          0: [[facility, 0]],
          1: [[facility, 0], [facility, 1]],
          2: [[facility, 0], [facility, 1], [facility, 2]],
          3: [[facility, 0], [facility, 1], [facility, 2], [facility, 3]]
        };
        contact = 'contact';
      });

      it('returns true for valid contacts', () => {
        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: [facility], value: 'patient_id' }, { key: [facility, 2], value: 'patient_id' }
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: [facility], value: null }, { key: [facility, 0], value: null }
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: [facility], value: 'patient_id' }, { key: [facility, 1], value: 'patient_id' }
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: ['parent2'], value: 'patient_id' }, { key: ['parent2', 2], value: 'patient_id' },
          { key: [facility], value: 'patient_id' }, { key: [facility, 3], value: 'patient_id' }
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);
      });

      it('returns false for not allowed contacts', () => {
        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: ['parent2'], value: 'patient_id' }, { key: ['parent2', 2], value: 'patient_id' }
        ];
        service.allowedDoc(contact, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
        ];
        service.allowedDoc(contact, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
        ];
        service.allowedDoc(contact, feed, viewResults).should.equal(false);
      });

      it('respects depth', () => {
        viewResults.contactsByDepth = [
          { key: [facility], value: 'patient_id' }, { key: [facility, 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' }
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[0] }, viewResults)
          .should.deep.equal(true);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[1] }, viewResults)
          .should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact_id'], value: 'patient_id' }, { key: ['contact_id', 0], value: 'patient_id' },
          { key: [facility], value: 'patient_id' }, { key: [facility, 1], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 2], value: 'patient_id' }
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[0] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { userCtx, subjectIds, contactsByDepthKeys: keysByDepth[1] }, viewResults)
          .should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: [facility], value: 'patient_id' }, { key: [facility, 2], value: 'patient_id' },
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
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: ['parent2'], value: 'patient_id' }, { key: ['parent2', 2], value: 'patient_id' },
          { key: [facility], value: 'patient_id' }, { key: [facility, 3], value: 'patient_id' },
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

      it('should ignore report depth', () => {
        viewResults.contactsByDepth = [
          { key: [facility], value: 'patient_id' }, { key: [facility, 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
        ];
        const ctx = { userCtx, subjectIds, contactsByDepthKeys: [[facility]], reportDepth: 0 };

        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(true);

        ctx.contactsByDepthKeys = keysByDepth[0];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(true);
        ctx.contactsByDepthKeys = keysByDepth[1];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact_id'], value: 'patient_id' }, { key: ['contact_id', 0], value: 'patient_id' },
          { key: [facility], value: 'patient_id' }, { key: [facility, 1], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 2], value: 'patient_id' },
        ];

        ctx.contactsByDepthKeys = keysByDepth[0];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(false);
        ctx.contactsByDepthKeys = keysByDepth[1];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(true);
        ctx.contactsByDepthKeys = keysByDepth[2];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: [facility], value: 'patient_id' }, { key: [facility, 2], value: 'patient_id' },
        ];

        ctx.contactsByDepthKeys = keysByDepth[0];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(false);
        ctx.contactsByDepthKeys = keysByDepth[1];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(false);
        ctx.contactsByDepthKeys = keysByDepth[2];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(true);
      });
    });

    describe('allowedContact multi-facility', () => {
      let facility1;
      let facility2;
      beforeEach(() => {
        viewResults = {
          replicationKeys: [{ key: 'a', value: {} }],
          contactsByDepth: [{ key: ['parent1'], value: 'patient_id' }],
        };
        facility1 = userCtxMultiFacility.facility_id[0];
        facility2 = userCtxMultiFacility.facility_id[1];
        feed = { userCtx: userCtxMultiFacility, contactsByDepthKeys: [[facility1], [facility2]], subjectIds };
        keysByDepth = {
          0: [[facility1, 0], [facility2, 0]],
          1: [[facility1, 0], [facility1, 1], [facility2, 0], [facility2, 1]],
          2: [[facility1, 0], [facility1, 1], [facility1, 2], [facility2, 0], [facility2, 1], [facility2, 2]],
          3: [
            [facility1, 0], [facility1, 1], [facility1, 2], [facility1, 3],
            [facility2, 0], [facility2, 1], [facility2, 2], [facility2, 3]
          ]
        };
        contact = 'contact';
      });

      it('returns true for valid contacts', () => {
        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: [facility1], value: 'patient_id' }, { key: [facility1, 2], value: 'patient_id' },
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: [facility1], value: null }, { key: [facility1, 0], value: null }
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: [facility2], value: 'patient_id' }, { key: [facility2, 1], value: 'patient_id' }
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: ['parent2'], value: 'patient_id' }, { key: ['parent2', 2], value: 'patient_id' },
          { key: [facility2], value: 'patient_id' }, { key: [facility2, 3], value: 'patient_id' }
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);
      });

      it('returns false for not allowed contacts', () => {
        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: ['parent2'], value: 'patient_id' }, { key: ['parent2', 2], value: 'patient_id' }
        ];
        service.allowedDoc(contact, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
        ];
        service.allowedDoc(contact, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
        ];
        service.allowedDoc(contact, feed, viewResults).should.equal(false);
      });

      it('respects depth', () => {
        viewResults.contactsByDepth = [
          { key: [facility1], value: 'patient_id' }, { key: [facility1, 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' }
        ];
        const ctx = { userCtx: userCtxMultiFacility, subjectIds };
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);
        service
          .allowedDoc(contact, { ...ctx, contactsByDepthKeys: keysByDepth[0] }, viewResults)
          .should.deep.equal(true);
        service
          .allowedDoc(contact, { ...ctx, contactsByDepthKeys: keysByDepth[1] }, viewResults)
          .should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact_id'], value: 'patient_id' }, { key: ['contact_id', 0], value: 'patient_id' },
          { key: [facility2], value: 'patient_id' }, { key: [facility2, 1], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 2], value: 'patient_id' }
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);
        service
          .allowedDoc(contact, { ...ctx, contactsByDepthKeys: keysByDepth[0] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { ...ctx, contactsByDepthKeys: keysByDepth[1] }, viewResults)
          .should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: [facility1], value: 'patient_id' }, { key: [facility1, 2], value: 'patient_id' },
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);
        service
          .allowedDoc(contact, { ...ctx, contactsByDepthKeys: keysByDepth[0] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { ...ctx, contactsByDepthKeys: keysByDepth[1] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { ...ctx, contactsByDepthKeys: keysByDepth[2] }, viewResults)
          .should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: ['parent2'], value: 'patient_id' }, { key: ['parent2', 2], value: 'patient_id' },
          { key: [facility2], value: 'patient_id' }, { key: [facility2, 3], value: 'patient_id' },
        ];
        service.allowedDoc(contact, feed, viewResults).should.deep.equal(true);
        service
          .allowedDoc(contact, { ...ctx, contactsByDepthKeys: keysByDepth[0] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { ...ctx, contactsByDepthKeys: keysByDepth[1] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { ...ctx, contactsByDepthKeys: keysByDepth[2] }, viewResults)
          .should.equal(false);
        service
          .allowedDoc(contact, { ...ctx, contactsByDepthKeys: keysByDepth[3] }, viewResults)
          .should.deep.equal(true);
      });

      it('should ignore report depth', () => {
        viewResults.contactsByDepth = [
          { key: [facility1], value: 'patient_id' }, { key: [facility1, 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
        ];
        const ctx = {
          userCtx: userCtxMultiFacility,
          subjectIds,
          contactsByDepthKeys: [[facility1], [facility2]],
          reportDepth: 0
        };

        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(true);

        ctx.contactsByDepthKeys = keysByDepth[0];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(true);
        ctx.contactsByDepthKeys = keysByDepth[1];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact_id'], value: 'patient_id' }, { key: ['contact_id', 0], value: 'patient_id' },
          { key: [facility1], value: 'patient_id' }, { key: [facility1, 1], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 2], value: 'patient_id' },
        ];

        ctx.contactsByDepthKeys = keysByDepth[0];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(false);
        ctx.contactsByDepthKeys = keysByDepth[1];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(true);
        ctx.contactsByDepthKeys = keysByDepth[2];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: [facility2], value: 'patient_id' }, { key: [facility2, 2], value: 'patient_id' },
        ];

        ctx.contactsByDepthKeys = keysByDepth[0];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(false);
        ctx.contactsByDepthKeys = keysByDepth[1];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(false);
        ctx.contactsByDepthKeys = keysByDepth[2];
        service.allowedDoc(contact, ctx, viewResults).should.deep.equal(true);
      });
    });

    describe('allowedReport', () => {
      let facility;
      beforeEach(() => {
        facility = userCtx.facility_id[0];
        feed = { userCtx, contactsByDepthKeys: [[facility]], subjectIds: [], reportDepth: -1 };
        report = 'report';
      });

      it('returns true for reports with unknown subject and allowed submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', 'submitter' ];
        viewResults = {
          replicationKeys: [{ key: false, value: { submitter: 'submitter', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('returns false for reports with unknown subject and denied submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = {
          replicationKeys: [{ key: false, value: { submitter: 'submitter', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('returns false for reports with denied subject and unknown submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = {
          replicationKeys: [{ key: 'subject2', value: { type: 'data_record' }}],
          contactsByDepth: []
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('returns false for reports with denied subject and allowed submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = {
          replicationKeys: [{ key: 'subject2', value: { submitter: 'contact', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('returns true for reports with allowed subject and unknown submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = {
          replicationKeys: [{ key: 'subject', value: { type: 'data_record' }}],
          contactsByDepth: false,
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('returns true for reports with allowed subject, denied submitter and not sensitive', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = {
          replicationKeys: [{ key: 'subject', value: { submitter: 'submitter', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('returns true for reports with allowed subject, allowed submitter and not sensitive', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = {
          replicationKeys: [{ key: 'subject', value: { submitter: 'contact', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('returns false for reports with allowed subject, denied submitter and sensitive', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.contact_id ];
        viewResults = {
          replicationKeys: [{
            key: userCtx.contact_id,
            value: { submitter: 'submitter', type: 'data_record', private: true }
          }],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);

        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.contact.patient_id ];
        viewResults = {
          replicationKeys: [{
            key: userCtx.contact.patient_id,
            value: { submitter: 'submitter', type: 'data_record', private: true }
          }],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);

        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', ...userCtx.facility_id ];
        viewResults = {
          replicationKeys: [{
            key: userCtx.facility_id,
            value: { submitter: 'submitter', type: 'data_record', private: true }
          }],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);

        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.facility[0].place_id ];
        viewResults = {
          replicationKeys: [{
            key: userCtx.facility[0].place_id,
            value: { submitter: 'submitter', type: 'data_record', private: true }
          }],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('returns true for reports with allowed subject, allowed submitter and about user`s contact or place', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.contact_id ];
        viewResults = {
          replicationKeys: [{ key: userCtx.contact_id, value: { submitter: 'contact', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.contact.patient_id ];
        viewResults = {
          replicationKeys: [{ key: userCtx.contact.patient_id, value: { submitter: 'contact', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', ...userCtx.facility_id ];
        viewResults = {
          replicationKeys: [{ key: facility, value: { submitter: 'contact', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        const facilityShortcode = userCtx.facility[0].place_id;
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', facilityShortcode ];
        viewResults = {
          replicationKeys: [{ key: facilityShortcode, value: { submitter: 'contact', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('should return true for report over under replication depth', () => {
        feed.reportDepth = 2;
        feed.subjectIds = [ 'facility_id', 'contact_id', 'place', 'chw', 'patient' ];
        feed.subjectsDepth = { parent: 0, contact: 1, place: 1, chw: 2, patient: 3 };

        viewResults = {
          // depth 0
          replicationKeys: [{ key: facility, value: { submitter: 'contact_id', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        viewResults = {
          // depth 1
          replicationKeys: [{ key: 'place', value: { submitter: 'submitter', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        viewResults = {
          replicationKeys: [{ key: 'chw', value: { submitter: 'submitter', type: 'data_record' }}], // depth 2
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('should return false for report over replication depth', () => {
        feed.reportDepth = 2;
        feed.subjectIds = [ 'facility_id', 'contact_id', 'place', 'chw', 'patient' ];
        feed.subjectsDepth = { facility_id: 0, contact_id: 1, place: 1, chw: 2, patient: 3 };

        viewResults = {
          replicationKeys: [{ key: 'patient', value: { submitter: 'submitter', type: 'data_record' }}], // depth 3
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('should return true for report over replication depth submitted by user', () => {
        feed.reportDepth = 2;
        feed.subjectIds = [ 'facility_id', 'contact_id', 'place', 'chw', 'patient' ];
        feed.subjectsDepth = { facility_id: 0, contact_id: 1, place: 1, chw: 2, patient: 3 };

        viewResults = {
          replicationKeys: [{ key: 'patient', value: { submitter: 'contact_id', type: 'data_record' }}], // depth 3
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('should return true for report with needs_signoff', () => {
        feed.reportDepth = 0;
        feed.subjectIds = [ 'facility_id', 'contact_id', 'place' ];
        feed.subjectsDepth = { facility_id: 0, contact_id: 1, place: 1 };

        viewResults = {
          replicationKeys: [
            // depth 1
            { key: 'place', value: { submitter: 'some_submitter', type: 'data_record' }},
            // depth 0 but "sensitive"
            { key: 'facility_id', value: { submitter: 'some_submitter', type: 'data_record' }},
          ],
          contactsByDepth: [],
        };

        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });
    });

    describe('allowedReport multi-facility', () => {
      let facility1;
      let facility2;
      beforeEach(() => {
        facility1 = userCtxMultiFacility.facility_id[0];
        facility2 = userCtxMultiFacility.facility_id[2];
        feed = {
          userCtx: userCtxMultiFacility,
          contactsByDepthKeys: [[facility1], [facility2]],
          subjectIds: [],
          reportDepth: -1
        };
        report = 'report';
      });

      it('returns true for reports with unknown subject and allowed submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', 'submitter' ];
        viewResults = {
          replicationKeys: [{ key: false, value: { submitter: 'submitter', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('returns false for reports with unknown subject and denied submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = {
          replicationKeys: [{ key: false, value: { submitter: 'submitter', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('returns false for reports with denied subject and unknown submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = {
          replicationKeys: [{ key: 'subject2', value: { type: 'data_record' }}],
          contactsByDepth: []
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('returns false for reports with denied subject and allowed submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = {
          replicationKeys: [{ key: 'subject2', value: { submitter: 'contact', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('returns true for reports with allowed subject and unknown submitter', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = {
          replicationKeys: [{ key: 'subject', value: { type: 'data_record' }}],
          contactsByDepth: false,
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('returns true for reports with allowed subject, denied submitter and not sensitive', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = {
          replicationKeys: [{ key: 'subject', value: { submitter: 'submitter', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('returns true for reports with allowed subject, allowed submitter and not sensitive', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact' ];
        viewResults = {
          replicationKeys: [{ key: 'subject', value: { submitter: 'contact', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('returns false for reports with allowed subject, denied submitter and sensitive', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.contact_id ];
        viewResults = {
          replicationKeys: [{
            key: userCtx.contact_id,
            value: { submitter: 'submitter', type: 'data_record', private: true }
          }],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);

        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.contact.patient_id ];
        viewResults = {
          replicationKeys: [{
            key: userCtx.contact.patient_id,
            value: { submitter: 'submitter', type: 'data_record', private: true }
          }],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);

        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', ...userCtx.facility_id ];
        viewResults = {
          replicationKeys: [{
            key: userCtx.facility_id,
            value: { submitter: 'submitter', type: 'data_record', private: true }
          }],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);

        const facility1sh = userCtxMultiFacility.facility[0].place_id;
        const facility2sh = userCtxMultiFacility.facility[0].place_id;
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', facility1sh, facility2sh ];
        viewResults = {
          replicationKeys: [{
            key: facility1sh,
            value: { submitter: 'submitter', type: 'data_record', private: true }
          }],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);

        viewResults = {
          replicationKeys: [{
            key: facility2sh,
            value: { submitter: 'submitter', type: 'data_record', private: true }
          }],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('returns true for reports with allowed subject, allowed submitter and about user`s contact or place', () => {
        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.contact_id ];
        viewResults = {
          replicationKeys: [{ key: userCtx.contact_id, value: { submitter: 'contact', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', userCtx.contact.patient_id ];
        viewResults = {
          replicationKeys: [{ key: userCtx.contact.patient_id, value: { submitter: 'contact', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', facility1, facility2 ];
        viewResults = {
          replicationKeys: [{ key: facility1, value: { submitter: 'contact', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        const facility1sh = userCtxMultiFacility.facility[0].place_id;
        const facility2sh = userCtxMultiFacility.facility[0].place_id;

        feed.subjectIds = [ 'subject1', 'contact1', 'subject', 'contact', facility1sh, facility2sh ];
        viewResults = {
          replicationKeys: [{ key: facility1sh, value: { submitter: 'contact', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        viewResults = {
          replicationKeys: [{ key: facility2sh, value: { submitter: 'contact', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('should return true for report over under replication depth', () => {
        feed.reportDepth = 2;
        feed.subjectIds = [ facility1, facility2, 'contact_id', 'place', 'chw', 'patient' ];
        feed.subjectsDepth = { parent: 0, contact: 1, place: 1, chw: 2, patient: 3, [facility1]: 0, [facility2]: 0 };

        viewResults = {
          // depth 0
          replicationKeys: [{ key: facility1, value: { submitter: 'contact_id', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        viewResults = {
          // depth 0
          replicationKeys: [{ key: facility2, value: { submitter: 'contact_id', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        viewResults = {
          // depth 1
          replicationKeys: [{ key: 'place', value: { submitter: 'submitter', type: 'data_record' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        viewResults = {
          replicationKeys: [{ key: 'chw', value: { submitter: 'submitter', type: 'data_record' }}], // depth 2
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('should return false for report over replication depth', () => {
        feed.reportDepth = 2;
        feed.subjectIds = [ facility1, facility2, 'contact_id', 'place', 'chw', 'patient' ];
        feed.subjectsDepth = { [facility1]: 0, [facility2]: 0, contact_id: 1, place: 1, chw: 2, patient: 3 };

        viewResults = {
          replicationKeys: [{ key: 'patient', value: { submitter: 'submitter', type: 'data_record' }}], // depth 3
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('should return true for report over replication depth submitted by user', () => {
        feed.reportDepth = 2;
        feed.subjectIds = [ facility1, facility2, 'contact_id', 'place', 'chw', 'patient' ];
        feed.subjectsDepth = { [facility1]: 0, [facility2]: 0, contact_id: 1, place: 1, chw: 2, patient: 3 };

        viewResults = {
          replicationKeys: [{ key: 'patient', value: { submitter: 'contact_id', type: 'data_record' }}], // depth 3
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('should return true for report with needs_signoff', () => {
        feed.reportDepth = 0;
        feed.subjectIds = [ facility1, facility2, 'contact_id', 'place' ];
        feed.subjectsDepth = { [facility1]: 0, [facility2]: 0, contact_id: 1, place: 1 };

        viewResults = {
          replicationKeys: [
            // depth 1
            { key: 'place', value: { submitter: 'some_submitter', type: 'data_record' }},
            // depth 0 but "sensitive"
            { key: facility1, value: { submitter: 'some_submitter', type: 'data_record' }},
          ],
          contactsByDepth: [],
        };

        service.allowedDoc(report, feed, viewResults).should.equal(true);

        viewResults = {
          replicationKeys: [
            // depth 1
            { key: 'place', value: { submitter: 'some_submitter', type: 'data_record' }},
            // depth 0 but "sensitive"
            { key: facility2, value: { submitter: 'some_submitter', type: 'data_record' }},
          ],
          contactsByDepth: [],
        };

        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });
    });

    describe('other types of docs', () => {
      it('should return true for own task', () => {
        feed.subjectIds = [ 'facility_id', 'contact_id', 'org.couchdb.user:user' ];
        viewResults = {
          replicationKeys: [{ key: 'org.couchdb.user:user', value: { type: 'task' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);
      });

      it('should return false for unowned task', () => {
        feed.subjectIds = [ 'facility_id', 'contact_id', 'org.couchdb.user:user' ];
        viewResults = {
          replicationKeys: [{ key: 'org.couchdb.user:otheruser', value: { type: 'task' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);
      });

      it('should return true for known contacts targets', () => {
        feed.subjectIds = [ 'facility_id', 'contact_id', 'org.couchdb.user:user', 'chw1', 'chw2' ];
        viewResults = {
          replicationKeys: [{ key: 'contact_id', value: { type: 'target' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        viewResults = {
          replicationKeys: [{ key: 'chw1', value: { type: 'target' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(true);

        viewResults = {
          replicationKeys: [{ key: 'chw2', value: { type: 'target' }}],
          contactsByDepth: [],
        };
        const ctx = Object.assign(
          { reportDepth: 0, subjectsDepth: { 'facility_id': 0, 'contact_id': 1, 'chw1': 2, 'chw2': 3 }},
          feed
        );
        service.allowedDoc(report, ctx, viewResults).should.equal(true);
      });

      it('should return false for unknown contacts targets', () => {
        feed.subjectIds = [ 'facility_id', 'contact_id', 'org.couchdb.user:user', 'chw1', 'chw2' ];
        viewResults = {
          replicationKeys: [{ key: 'omg1', value: { type: 'target' }}],
          contactsByDepth: [],
        };
        service.allowedDoc(report, feed, viewResults).should.equal(false);

        viewResults = {
          replicationKeys: [{ key: 'omg2', value: { type: 'target' }}],
          contactsByDepth: [],
        };
        const ctx = Object.assign(
          { reportDepth: 0, subjectsDepth: { 'facility_id': 0, 'contact_id': 1, 'chw1': 2, 'chw2': 3 }},
          feed
        );
        service.allowedDoc(report, ctx, viewResults).should.equal(false);
      });
    });

    describe('updateContext', () => {
      let facility;
      beforeEach(() => {
        facility = userCtx.facility_id[0];
        viewResults = { contactsByDepth: [{ key: ['parent1'], value: 'patient_id'}] };
        feed = { userCtx, contactsByDepthKeys: [[facility]], subjectIds, subjectsDepth: {} };
        keysByDepth = {
          0: [[facility, 0]],
          1: [[facility, 0], [facility, 1]],
          2: [[facility, 0], [facility, 1], [facility, 2]],
          3: [[facility, 0], [facility, 1], [facility, 2], [facility, 3]]
        };
        contact = 'contact';
      });

      it('returns nbr of new subjects for allowed contacts', () => {
        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: [facility], value: 'patient_id' }, { key: [facility, 2], value: 'patient_id' },
        ];
        service.updateContext(true, feed, viewResults).should.equal(true);

        viewResults.contactsByDepth = [
          { key: [facility], value: null },
          { key: [facility, 0], value: null },
        ];
        service.updateContext(true, feed, viewResults).should.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: [facility], value: 'patient_id'}, { key: [facility, 1], value: 'patient_id' },
        ];
        service.updateContext(true, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: ['parent2'], value: 'patient_id' }, { key: ['parent2', 2], value: 'patient_id' },
          { key: [facility], value: 'patient_id' }, { key: [facility, 3], value: 'patient_id' },
        ];
        service.updateContext(true, feed, viewResults).should.equal(false);
      });

      it('returns false for not allowed contacts', () => {
        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: ['parent2'], value: 'patient_id' }, { key: ['parent2', 2], value: 'patient_id' },
        ];
        service.updateContext(false, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
        ];
        service.updateContext(false, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
        ];
        service.updateContext(false, feed, viewResults).should.equal(false);
      });

      it('adds valid contact _id and reference to subjects list, while keeping them unique', () => {
        feed.subjectIds = [];
        viewResults.contactsByDepth = [
          { key: ['new_contact_id'], value: 'new_patient_id' },
          { key: ['new_contact_id', 0], value: 'new_patient_id' },
          { key: [facility], value: 'new_patient_id' },
          { key: [facility, 1], value: 'new_patient_id' }
        ];

        service.updateContext(true, feed, viewResults).should.equal(true);
        feed.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);
        feed.subjectsDepth.should.deep.equal({ new_patient_id: 1, new_contact_id: 1 });

        service.updateContext(true, feed, viewResults).should.equal(false);
        feed.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);
        feed.subjectsDepth.should.deep.equal({ new_patient_id: 1, new_contact_id: 1 });

        viewResults.contactsByDepth = [
          { key: ['second_new_contact_id'], value: 'second_patient_id' },
          { key: ['second_new_contact_id', 0], value: 'second_patient_id' },
          { key: ['parent1'], value: 'second_patient_id' },
          { key: ['parent1', 1], value: 'second_patient_id' },
        ];
        service.updateContext(false, feed, viewResults).should.equal(false);
        feed.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);
        feed.subjectsDepth.should.deep.equal({ new_patient_id: 1, new_contact_id: 1 });
      });

      it('removes invalid contact _id and reference from subjects list', () => {
        feed.subjectIds = ['person_id', 'person_id', 'contact_id', 'person_ref', 'contact_id', 'person_ref', 's'];

        viewResults.contactsByDepth = [
          { key: ['person_id'], value: 'person_ref' },
          { key: ['person_id', 0], value: 'person_ref' },
          { key: ['parent1'], value: 'person_ref' },
          { key: ['parent1', 1], value: 'person_ref' },
        ];

        service.updateContext(false, feed, viewResults).should.equal(false);
        feed.subjectIds.should.deep.equal(['contact_id', 'contact_id', 's']);
      });

      it('should assign correct depth to new subjects', () => {
        feed.subjectIds = [];

        viewResults.contactsByDepth = [
          { key: ['person_id'], value: 'person_ref' },
          { key: ['person_id', 0], value: 'person_ref' },
          { key: ['clinic_id'], value: 'person_ref' },
          { key: ['clinic_id', 1], value: 'person_ref' },
          { key: ['hc_id'], value: 'person_ref' },
          { key: ['hc_id', 2], value: 'person_ref' },
          { key: ['facility_id'], value: 'person_ref' },
          { key: ['facility_id', 3], value: 'person_ref' },
        ];
        service.updateContext(true, feed, viewResults).should.equal(true);
        feed.subjectIds.should.have.deep.members(['person_id', 'person_ref']);
        feed.subjectsDepth.should.deep.equal({ person_id: 3, person_ref: 3 });

        viewResults.contactsByDepth = [
          { key: ['clinic_id'], value: 'clinic_ref' },
          { key: ['clinic_id', 0], value: 'clinic_ref' },
          { key: ['hc_id'], value: 'clinic_ref' },
          { key: ['hc_id', 1], value: 'clinic_ref' },
          { key: ['facility_id'], value: 'clinic_ref' },
          { key: ['facility_id', 2], value: 'clinic_ref' },
        ];
        service.updateContext(true, feed, viewResults).should.equal(true);
        feed.subjectIds.should.have.deep.members(['person_id', 'person_ref', 'clinic_id', 'clinic_ref']);
        feed.subjectsDepth.should.deep.equal({
          person_id: 3, person_ref: 3,
          clinic_id: 2, clinic_ref: 2,
        });

        viewResults.contactsByDepth = [
          { key: ['hc_id'], value: 'hc_ref' },
          { key: ['hc_id', 0], value: 'hc_ref' },
          { key: ['facility_id'], value: 'hc_ref' },
          { key: ['facility_id', 1], value: 'hc_ref' },
        ];
        service.updateContext(true, feed, viewResults).should.equal(true);
        feed.subjectIds.should.have.deep.members([
          'person_id', 'person_ref', 'clinic_id', 'clinic_ref', 'hc_id', 'hc_ref'
        ]);
        feed.subjectsDepth.should.deep.equal({
          person_id: 3, person_ref: 3,
          clinic_id: 2, clinic_ref: 2,
          hc_id: 1, hc_ref: 1,
        });
      });
    });

    describe('updateContext multi-facility', () => {
      let facility1;
      let facility2;
      beforeEach(() => {
        facility1 = userCtxMultiFacility.facility_id[0];
        facility2 = userCtxMultiFacility.facility_id[1];
        viewResults = { contactsByDepth: [{ key: ['parent1'], value: 'patient_id'}] };
        feed = {
          userCtx: userCtxMultiFacility,
          contactsByDepthKeys: [[facility1], [facility2]],
          subjectIds: [1, 2, 3],
          subjectsDepth: {}
        };
        keysByDepth = {
          0: [[facility1, 0], [facility2, 0]],
          1: [[facility1, 0], [facility1, 1], [facility2, 0], [facility2, 1]],
          2: [[facility1, 0], [facility1, 1], [facility1, 2], [facility2, 0], [facility2, 1], [facility2, 2]],
          3: [
            [facility1, 0], [facility1, 1], [facility1, 2], [facility1, 3],
            [facility2, 0], [facility2, 1], [facility2, 2], [facility2, 3]
          ]
        };
        contact = 'contact';
      });

      it('returns nbr of new subjects for allowed contacts', () => {
        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: [facility1], value: 'patient_id' }, { key: [facility1, 2], value: 'patient_id' },
        ];
        service.updateContext(true, feed, viewResults).should.equal(true);

        viewResults.contactsByDepth = [
          { key: [facility1], value: null },
          { key: [facility1, 0], value: null },
          { key: [facility2], value: null },
          { key: [facility2, 0], value: null },
        ];
        service.updateContext(true, feed, viewResults).should.equal(true);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: [facility1], value: 'patient_id'}, { key: [facility1, 1], value: 'patient_id' },
        ];
        service.updateContext(true, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: ['parent2'], value: 'patient_id' }, { key: ['parent2', 2], value: 'patient_id' },
          { key: [facility2], value: 'patient_id' }, { key: [facility2, 3], value: 'patient_id' },
        ];
        service.updateContext(true, feed, viewResults).should.equal(false);
      });

      it('returns false for not allowed contacts', () => {
        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
          { key: ['parent2'], value: 'patient_id' }, { key: ['parent2', 2], value: 'patient_id' },
        ];
        service.updateContext(false, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
        ];
        service.updateContext(false, feed, viewResults).should.equal(false);

        viewResults.contactsByDepth = [
          { key: ['contact'], value: 'patient_id' }, { key: ['contact', 0], value: 'patient_id' },
          { key: ['parent1'], value: 'patient_id' }, { key: ['parent1', 1], value: 'patient_id' },
        ];
        service.updateContext(false, feed, viewResults).should.equal(false);
      });

      it('adds valid contact _id and reference to subjects list, while keeping them unique', () => {
        feed.subjectIds = [];
        viewResults.contactsByDepth = [
          { key: ['new_contact_id'], value: 'new_patient_id' },
          { key: ['new_contact_id', 0], value: 'new_patient_id' },
          { key: [facility1], value: 'new_patient_id' },
          { key: [facility1, 1], value: 'new_patient_id' }
        ];

        service.updateContext(true, feed, viewResults).should.equal(true);
        feed.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);
        feed.subjectsDepth.should.deep.equal({ new_patient_id: 1, new_contact_id: 1 });

        service.updateContext(true, feed, viewResults).should.equal(false);
        feed.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);
        feed.subjectsDepth.should.deep.equal({ new_patient_id: 1, new_contact_id: 1 });

        viewResults.contactsByDepth = [
          { key: ['second_new_contact_id'], value: 'second_patient_id' },
          { key: ['second_new_contact_id', 0], value: 'second_patient_id' },
          { key: ['parent1'], value: 'second_patient_id' },
          { key: ['parent1', 1], value: 'second_patient_id' },
        ];
        service.updateContext(false, feed, viewResults).should.equal(false);
        feed.subjectIds.should.deep.equal(['new_patient_id', 'new_contact_id']);
        feed.subjectsDepth.should.deep.equal({ new_patient_id: 1, new_contact_id: 1 });
      });

      it('removes invalid contact _id and reference from subjects list', () => {
        feed.subjectIds = ['person_id', 'person_id', 'contact_id', 'person_ref', 'contact_id', 'person_ref', 's'];

        viewResults.contactsByDepth = [
          { key: ['person_id'], value: 'person_ref' },
          { key: ['person_id', 0], value: 'person_ref' },
          { key: ['parent1'], value: 'person_ref' },
          { key: ['parent1', 1], value: 'person_ref' },
        ];

        service.updateContext(false, feed, viewResults).should.equal(false);
        feed.subjectIds.should.deep.equal(['contact_id', 'contact_id', 's']);
      });

      it('should assign correct depth to new subjects', () => {
        feed.subjectIds = [];

        viewResults.contactsByDepth = [
          { key: ['person_id'], value: 'person_ref' },
          { key: ['person_id', 0], value: 'person_ref' },
          { key: ['clinic_id'], value: 'person_ref' },
          { key: ['clinic_id', 1], value: 'person_ref' },
          { key: ['hc_id'], value: 'person_ref' },
          { key: ['hc_id', 2], value: 'person_ref' },
          { key: [facility1], value: 'person_ref' },
          { key: [facility1, 3], value: 'person_ref' },
        ];
        service.updateContext(true, feed, viewResults).should.equal(true);
        feed.subjectIds.should.have.deep.members(['person_id', 'person_ref']);
        feed.subjectsDepth.should.deep.equal({ person_id: 3, person_ref: 3 });

        viewResults.contactsByDepth = [
          { key: ['clinic_id'], value: 'clinic_ref' },
          { key: ['clinic_id', 0], value: 'clinic_ref' },
          { key: ['hc_id'], value: 'clinic_ref' },
          { key: ['hc_id', 1], value: 'clinic_ref' },
          { key: [facility2], value: 'clinic_ref' },
          { key: [facility2, 2], value: 'clinic_ref' },
        ];
        service.updateContext(true, feed, viewResults).should.equal(true);
        feed.subjectIds.should.have.deep.members(['person_id', 'person_ref', 'clinic_id', 'clinic_ref']);
        feed.subjectsDepth.should.deep.equal({
          person_id: 3, person_ref: 3,
          clinic_id: 2, clinic_ref: 2,
        });

        viewResults.contactsByDepth = [
          { key: ['hc_id'], value: 'hc_ref' },
          { key: ['hc_id', 0], value: 'hc_ref' },
          { key: [facility2], value: 'hc_ref' },
          { key: [facility2, 1], value: 'hc_ref' },
        ];
        service.updateContext(true, feed, viewResults).should.equal(true);
        feed.subjectIds.should.have.deep.members([
          'person_id', 'person_ref', 'clinic_id', 'clinic_ref', 'hc_id', 'hc_ref'
        ]);
        feed.subjectsDepth.should.deep.equal({
          person_id: 3, person_ref: 3,
          clinic_id: 2, clinic_ref: 2,
          hc_id: 1, hc_ref: 1,
        });
      });
    });
  });

  describe('filterAllowedDocs', () => {
    it('returns only allowed docs', () => {

      const docs = [
        { id: 1, viewResults: { replicationKeys: [{ key: '_all' }] } },
        { id: 2, viewResults: { replicationKeys: [{ key: '_all' }] } },
        { id: 3, viewResults: {} },
        { id: 4, viewResults: {} },
        { id: 5, viewResults: { replicationKeys: [{ key: '_all' }] } }
      ];

      const results = service.filterAllowedDocs({ userCtx: {}, subjectIds: [ 1 ] }, docs);

      results.length.should.equal(3);
      results.should.deep.equal([
        { id: 1, viewResults: { replicationKeys: [{ key: '_all' }] } },
        { id: 2, viewResults: { replicationKeys: [{ key: '_all' }] } },
        { id: 5, viewResults: { replicationKeys: [{ key: '_all' }] } }
      ]);
    });

    it('reiterates over remaining docs when authorization context receives new subjects', () => {
      const authzContext = {
        userCtx: { facility_id: ['a'] },
        subjectIds: [],
        contactsByDepthKeys: [['a']],
        subjectsDepth: {},
      };
      const docs = [
        { id: 6, viewResults: {} },
        { id: 7, viewResults: {} },
        {
          id: 8,
          viewResults: {
            replicationKeys: [{ key: 'subject2', value: { submitter: 'a' }}],
            contactsByDepth: false,
          },
        },
        {
          id: 4,
          viewResults: {
            replicationKeys: [{ key: 1, value: { submitter: 'b' }}],
            contactsByDepth: false,
          },
        },
        { id: 5, viewResults: {} },
        {
          id: 2,
          viewResults: {
            replicationKeys: [{ key: 'something', value: null }],
            contactsByDepth: [{ key: [2, 0], value: 'subject2' }, { key: ['a'], value: null }],
          },
        },
        { id: 3, viewResults: { replicationKeys: [{ key: '_all', value: null }] } },
        {
          id: 1,
          viewResults: {
            replicationKeys: [{ key: 'something', value: null }],
            contactsByDepth: [{ key: [1], value: 'subject1' }, { key: ['a'], value: null }],
          },
        },
        { id: 9, viewResults: {}, allowed: true },
        {
          id: 11,
          viewResults: {
            replicationKeys: [{ key: 'subject2', value: { submitter: 'a' }}],
            contactsByDepth: false,
          },
        },
        { id: 10, viewResults: {} }
      ];

      const results = service.filterAllowedDocs(authzContext, docs);

      results.length.should.equal(7);
      results.should.deep.equal([
        {
          id: 2,
          viewResults: {
            replicationKeys: [{ key: 'something', value: null }],
            contactsByDepth: [{ key: [2, 0], value: 'subject2'}, { key: ['a'], value: null }],
          },
        },
        { id: 3, viewResults: { replicationKeys: [{ key: '_all', value: null }]} },
        {
          id: 1,
          viewResults: {
            replicationKeys: [{ key: 'something', value: null }],
            contactsByDepth: [{ key: [1], value: 'subject1' }, { key: ['a'], value: null }],
          },
        },
        { id: 9, viewResults: {}, allowed: true },
        {
          id: 11,
          viewResults: {
            replicationKeys: [{ key: 'subject2', value: { submitter: 'a' }}],
            contactsByDepth: false,
          },
        },
        {
          id: 8,
          viewResults: {
            replicationKeys: [{ key: 'subject2', value: { submitter: 'a' }}],
            contactsByDepth: false,
          },
        },
        {
          id: 4,
          viewResults: {
            replicationKeys: [{ key: 1, value: { submitter: 'b' }}],
            contactsByDepth: false,
          },
        },
      ]);

      authzContext.subjectIds.should.deep.equal([ 'subject2', 2, 'subject1', 1 ]);
    });

    it('does not reiterate when context does not receive new subjects', () => {
      const authzContext = {
        userCtx: {},
        subjectIds: [2, 3, 'subject1', 'subject2'],
        contactsByDepthKeys: [[1]],
        subjectsDepth: {},
      };

      const docs = [
        { id: 4, viewResults: { replicationKeys: [{ key: '_all' }] } },
        { id: 5, viewResults: {} },
        {
          id: 2,
          viewResults: {
            replicationKeys: [{ key: 'something', value: null }],
            contactsByDepth: [{ key: [1], value: 'subject1' }],
          },
        },
        {
          id: 3,
          viewResults: {
            replicationKeys: [{ key: 'something', value: null }],
            contactsByDepth: [{ key: [1], value: 'subject2' }],
          },
        },
        {
          id: 1,
          viewResults: {
            replicationKeys: [{ key: 'subject2', value: { submitter: 'a' }}],
            contactsByDepth: false,
          },
        },
      ];


      const results = service.filterAllowedDocs(authzContext, docs);

      results.length.should.equal(4);
      results.should.deep.equal([
        { id: 4, viewResults: { replicationKeys: [{ key: '_all' }] } },
        {
          id: 2,
          viewResults: {
            replicationKeys: [{ key: 'something', value: null }],
            contactsByDepth: [{ key: [1], value: 'subject1' }],
          },
        },
        {
          id: 3,
          viewResults: {
            replicationKeys: [{ key: 'something', value: null, }],
            contactsByDepth: [{ key: [1], value: 'subject2' }],
          },
        },
        {
          id: 1,
          viewResults: {
            replicationKeys: [{ key: 'subject2', value: { submitter: 'a' }}],
            contactsByDepth: false,
          },
        },
      ]);
    });

    it('takes doc.allowed into consideration', () => {
      const authzContext = {
        userCtx: {},
        subjectIds: [],
        contactsByDepthKeys: [[1]],
        subjectsDepth: {},
      };

      const docs = [
        { id: 4, viewResults: {} },
        { id: 5, viewResults: {}, allowed: true },
        {
          id: 2,
          viewResults: {
            replicationKeys: [{ key: 'a', value: null }],
            contactsByDepth: [{ key: [1], value: 'subject2' }]
          },
          allowed: false
        },
        { id: 3, viewResults: {} },
        { id: 1, viewResults: {}, allowed: true }
      ];

      const results = service.filterAllowedDocs(authzContext, docs);

      results.length.should.equal(3);
      results.should.deep.equal([
        { id: 5, viewResults: {}, allowed: true },
        {
          id: 2,
          viewResults: {
            replicationKeys: [{ key: 'a', value: null }],
            contactsByDepth: [{ key: [1], value: 'subject2' }],
          },
          allowed: false,
        },
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
            contactsByDepthKeys: [ ['facility_id'] ],
            subjectsDepth: {},
            contactDepth: -1,
            reportDepth: -1,
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
            contactsByDepthKeys: [ ['facility_id'] ],
            subjectsDepth: {},
            contactDepth: -1,
            reportDepth: -1,
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
            contactsByDepth: [
              { key: ['c1'], value: '123456' },
              { key: ['p1'], value: '123456' },
              { key: ['facility_id'], value: '123456' },
            ],
            replicationKeys: [{ key: 'c1', value: { type: 'contact' }}],
          }
        },
        {
          doc: c2, // denied
          viewResults: {
            contactsByDepth: [
              { key: ['c2'], value: 'place1' },
              { key: ['p3'], value: 'place1' },
              { key: ['p4'], value: 'place1' },
            ],
            replicationKeys: [{ key: 'c2', value: { type: 'contact' }}],
          }
        },
        {
          doc: c3, // allowed
          viewResults: {
            contactsByDepth: [
              { key: ['c3'], value: null },
              { key: ['p1'], value: null },
              { key: ['facility_id'], value: null },
            ],
            replicationKeys: [{ key: 'c3', value: { type: 'contact' }}]
          },
        },
        {
          doc: c4, // denied
          viewResults: {
            contactsByDepth: [
              { key: ['c4'], value: null },
              { key: ['p3'], value: null },
              { key: ['p4'], value: null },
            ],
            replicationKeys: [{ key: 'c4', value: { type: 'contact' }}],
          },
        },
        {
          doc: c5, // allowed
          viewResults: {
            contactsByDepth: [
              { key: ['c5'], value: 'place5' },
              { key: ['p2'], value: 'place5' },
              { key: ['facility_id'], value: 'place5' },
            ],
            replicationKeys: [{ key: 'c5', value: { type: 'contact' }}],
          },
        },
      ];

      db.medic.query.resolves({ rows: [] });
      sinon.stub(db.medic, 'allDocs');

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
      contactsByDepth.withArgs(c1).returns([
        { key: ['c1'], value: '123456' },
        { key: ['p1'], value: '123456' },
        { key: ['facility_id'], value: '123456' },
      ]);
      contactsByDepth.withArgs(c2).returns([
        { key: ['c2'], value: 'place1' },
        { key: ['p3'], value: 'place1' },
        { key: ['p4'], value: 'place1' },
      ]);
      contactsByDepth.withArgs(c3).returns([
        { key: ['c3'], value: null },
        { key: ['p1'], value: null },
        { key: ['facility_id'], value: null },
      ]);
      contactsByDepth.withArgs(c4).returns([
        { key: ['c4'], value: null },
        { key: ['p3'], value: null },
        { key: ['p4'], value: null },
      ]);
      contactsByDepth.withArgs(c5).returns([
        { key: ['c5'], value: 'place5' },
        { key: ['p2'], value: 'place5' },
        { key: ['facility_id'], value: 'place5' },
      ]);
      const docsByReplicationKey = sinon.stub();
      docsByReplicationKey.withArgs(c1).returns([{ key: 'c1', value: {  type: 'contact'  }}]);
      docsByReplicationKey.withArgs(c2).returns([{ key: 'c2', value: {  type: 'contact'  }}]);
      docsByReplicationKey.withArgs(c3).returns([{ key: 'c3', value: {  type: 'contact'  }}]);
      docsByReplicationKey.withArgs(c4).returns([{ key: 'c4', value: {  type: 'contact'  }}]);
      docsByReplicationKey.withArgs(c5).returns([{ key: 'c5', value: {  type: 'contact'  }}]);

      viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
      viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);

      return service
        .getScopedAuthorizationContext(userCtx, docObjs)
        .then(result => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([
            'medic-client/contacts_by_reference',
            { keys: [
              ['shortcode', 'c1'],
              ['shortcode', 'c2'],
              ['shortcode', 'c3'],
              ['shortcode', 'c4'],
              ['shortcode', 'c5'],
            ] }
          ]);
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0].should.deep.equal([{ keys: ['c1', 'c2', 'c3', 'c4', 'c5'], include_docs: true }]);

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
            replicationKeys: [{ key: 'patient1', value: {  submitter: 'c1'  }}]
          }
        },
        { // denied
          doc: {
            _id: 'r2', type: 'data_record', contact: { _id: 'c2', parent: { _id: 'p2', parent: { _id: 'p3' } } },
            fields: { patient_id: 'patient2' }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [{ key: 'patient2', value: {  submitter: 'c2', type: 'data_record'  }}]
          }
        },
        { // allowed
          doc: {
            _id: 'r3', type: 'data_record', contact: { _id: 'c2', parent: { _id: 'p2', parent: { _id: 'p3' } } },
            fields: { patient_id: 'patient1' }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [{ key: 'patient1', value: {  submitter: 'c2', type: 'data_record'  }}]
          }
        },
        { // allowed
          doc: {
            _id: 'r4', contact: { _id: 'c1', parent: { _id: 'p1', parent: { _id: 'facility_id' } } },
            fields: { patient_uuid: 'patient3doc' }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [{ key: 'patient3doc', value: {  submitter: 'c1', type: 'data_record'  }}]
          }
        },
        { // denied
          doc: {
            _id: 'r5', type: 'data_record', contact: { _id: 'c3', parent: { _id: 'p2', parent: { _id: 'p3' } } },
            fields: { patient_uuid: 'patient4doc' }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [{ key: 'patient4doc', value: {  submitter: 'c3', type: 'data_record'  }}]
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
      contactsByDepth.withArgs(sinon.match({ _id: 'c1' })).returns([
        { key: ['c1'], value: null }, { key: ['p1'], value: null }, { key: ['facility_id'], value: null },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient1doc' })).returns([
        { key: ['patient1doc'], value: 'patient1' },
        { key: ['p1'], value: 'patient1' },
        { key: ['facility_id'], value: 'patient1' },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'c2' })).returns([
        { key: ['c2'], value: null }, { key: ['p2'], value: null }, { key: ['p3'], value: null },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient2doc' })).returns([
        { key: ['patient2doc'], value: 'patient1' },
        { key: ['p2'], value: 'patient2' },
        { key: ['p3'], value: 'patient2' },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'c3' })).returns([
        { key: ['c3'], value: null }, { key: ['p2'], value: null }, { key: ['p3'], value: null },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient3doc' })).returns([
        { key: ['patient3doc'], value: null }, { key: ['facility_id'], value: null },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient4doc' })).returns([
        { key: ['patient4doc'], value: null }, { key: ['p3'], value: null },
      ]);
      const docsByReplicationKey = sinon.stub();
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c1' })).returns([
        { key: 'c1', value: { type: 'contact' }},
      ]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient1doc' })).returns([
        { key: 'patient1doc', value: { type: 'contact' }},
      ]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c2' })).returns([
        { key: 'c2', value: { type: 'contact' }},
      ]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient2doc' })).returns([
        { key: 'patient2doc', value: { type: 'contact' }},
      ]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c3' })).returns([{ key: 'c3', value: {  type: 'contact'  }}]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient3doc' })).returns([
        { key: 'patient3doc', value: { type: 'contact' }},
      ]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient4doc' })).returns([
        { key: 'patient4doc', value: { type: 'contact' }},
      ]);

      viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
      viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);

      return service
        .getScopedAuthorizationContext(userCtx, docObjs)
        .then(result => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([
            'medic-client/contacts_by_reference',
            { keys: [
              ['shortcode', 'patient1'],
              ['shortcode', 'c1'],
              ['shortcode', 'patient2'],
              ['shortcode', 'c2'],
              ['shortcode', 'patient3doc'],
              ['shortcode', 'patient4doc'],
              ['shortcode', 'c3'],
            ]}
          ]);
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0].should.deep.equal([{
            keys: ['patient1doc', 'c1', 'patient2doc', 'c2', 'patient3doc', 'patient4doc', 'c3'],
            include_docs: true
          }]);

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
              { key: 'patient1', value: {  submitter: 'c1', type: 'data_record'  }},
              { key: 'c1', value: {  submitter: 'c1', type: 'data_record'  }},
              { key: 'p1', value: {  submitter: 'c1', type: 'data_record'  }},
              { key: 'facility_id', value: {  submitter: 'c1', type: 'data_record'  }},
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
              { key: 'patient2', value: {  submitter: 'c2', type: 'data_record'  }},
              { key: 'c2', value: {  submitter: 'c2', type: 'data_record'  }},
              { key: 'p2', value: {  submitter: 'c2', type: 'data_record'  }},
              { key: 'p3', value: {  submitter: 'c2', type: 'data_record'  }}
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
      contactsByDepth.withArgs(sinon.match({ _id: 'c1' })).returns([
        { key: ['c1'], value: null }, { key: ['p1'], value: null }, { key: ['facility_id'], value: null },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient1doc' })).returns([
        { key: ['patient1doc'], value: 'patient1' },
        { key: ['p1'], value: 'patient1' },
        { key: ['facility_id'], value: 'patient1' },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'c2' })).returns([
        { key: ['c2'], value: null }, { key: ['p2'], value: null }, { key: ['p3'], value: null },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient2doc' })).returns([
        { key: ['patient2doc'], value: 'patient2' },
        { key: ['p2'], value: 'patient2' },
        { key: ['p3'], value: 'patient2' },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'p1' })).returns([
        { key: ['p1'], value: null }, { key: ['facility_id'], value: null },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'facility_id' })).returns([{ key: ['facility_id'], value: null }]);
      contactsByDepth.withArgs(sinon.match({ _id: 'p2' })).returns([
        { key: ['p2'], value: null }, { key: ['p3'], value: null },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'p3' })).returns([{ key: ['p3'], value: null }]);

      const docsByReplicationKey = sinon.stub();
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c1' })).returns([{ key: 'c1', value: {  type: 'contact'  }}]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient1doc' })).returns([
        { key: 'patient1doc', value: { type: 'contact' }},
      ]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c2' })).returns([{ key: 'c2', value: { type: 'contact' }}]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'patient2doc' })).returns([
        { key: 'patient2doc', value: { type: 'contact' }},
      ]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'p1' })).returns([{ key: 'p1', value: { type: 'contact' }}]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'facility_id' })).returns([
        { key: 'facility_id', value: { type: 'contact' }},
      ]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'p2' })).returns([{ key: 'p2', value: { type: 'contact' }}]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'p3' })).returns([{ key: 'p3', value: { type: 'contact' }}]);

      viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
      viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);

      return service
        .getScopedAuthorizationContext(userCtx, docObjs)
        .then(result => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([
            'medic-client/contacts_by_reference',
            { keys: [
              ['shortcode', 'patient1'],
              ['shortcode', 'c1'],
              ['shortcode', 'p1'],
              ['shortcode', 'facility_id'],
              ['shortcode', 'patient2'],
              ['shortcode', 'c2'],
              ['shortcode', 'p2'],
              ['shortcode', 'p3'],
            ]}
          ]);
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0].should.deep.equal([{
            keys: ['patient1doc', 'c1', 'p1', 'facility_id', 'patient2doc', 'c2', 'p2', 'p3'],
            include_docs: true
          }]);

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
            contactsByDepth: [
              { key: ['c1'], value: 'contact1' },
              { key: ['p1'], value: 'contact1' },
              { key: ['facility_id'], value: 'contact1' },
            ],
            replicationKeys: [{ key: 'c1', value: {  type: 'contact'  }}]
          },
        },
        { // denied
          doc: { _id: 'c2', type: 'person', parent: { _id: 'p2', parent: { _id: 'p3' } }, patient_id: 'contact2' },
          viewResults: {
            contactsByDepth: [
              { key: ['c2'], value: 'contact2' },
              { key: ['p2'], value: 'contact2' },
              { key: ['p3'], value: 'contact2' },
            ],
            replicationKeys: [{ key: 'c2', value: {  type: 'contact'  }}]
          },
        },
        { // allowed
          doc: {
            _id: 'r1', contact: { _id: 'c1', parent: { _id: 'p1', parent: { _id: 'facility_id' } } },
            fields: { patient_id: 'patient1' }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [{ key: 'patient1', value: {  submitter: 'c1', type: 'data_record'  }}]
          }
        },
        { // denied
          doc: {
            _id: 'r2', type: 'data_record', contact: { _id: 'c2', parent: { _id: 'p2', parent: { _id: 'p3' } } },
            fields: { patient_id: 'patient2' }
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [{ key: 'patient2', value: {  submitter: 'c2', type: 'data_record'  }}]
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
      contactsByDepth.withArgs(sinon.match({ _id: 'c1' })).returns([
        { key: ['c1'], value: 'contact1' },
        { key: ['p1'], value: 'contact1' },
        { key: ['facility_id'], value: 'contact1' },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient1doc' })).returns([
        { key: ['patient1doc'], value: 'patient1' },
        { key: ['p1'], value: 'patient1' },
        { key: ['facility_id'], value: 'patient1' },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'c2' })).returns([
        { key: ['c2'], value: 'contact2' },
        { key: ['p2'], value: 'contact2' },
        { key: ['p3'], value: 'contact2' },
      ]);
      contactsByDepth.withArgs(sinon.match({ _id: 'patient2doc' })).returns([
        { key: ['patient2doc'], value: 'patient2' },
        { key: ['p2'], value: 'patient2' },
        { key: ['p3'], value: 'patient2' },
      ]);
      const docsByReplicationKey = sinon.stub();
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c1' })).returns([{ key: 'c1', value: {  type: 'contact'  }}]);
      docsByReplicationKey
        .withArgs(sinon.match({ _id: 'patient1doc' }))
        .returns([{ key: 'patient1doc', value: { type: 'contact' }}, ]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c2' })).returns([{ key: 'c2', value: { type: 'contact' }}]);
      docsByReplicationKey
        .withArgs(sinon.match({ _id: 'patient2doc' }))
        .returns([{ key: 'patient2doc', value: { type: 'contact' }}]);

      viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
      viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);

      return service
        .getScopedAuthorizationContext(userCtx, docObjs)
        .then(result => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([
            'medic-client/contacts_by_reference',
            { keys: [
              ['shortcode', 'c1'],
              ['shortcode', 'c2'],
              ['shortcode', 'patient1'],
              ['shortcode', 'patient2'],
            ]}
          ]);
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0]
            .should.deep.equal([{ keys: ['c1', 'c2', 'patient1doc', 'patient2doc'], include_docs: true }]);

          contactsByDepth.callCount.should.equal(4);
          docsByReplicationKey.callCount.should.equal(4);

          result.subjectIds.should.have.members([
            'c1', 'contact1', 'patient1doc', 'patient1', '_all', 'org.couchdb.user:user'
          ]);
        });
    });

    it('adds unassigned key if the user has required permissions', () => {
      auth.hasAllPermissions.returns(true);
      config.get.returns(true);

      const docObjs = [
        { // unallocated
          doc: {
            _id: 'unallocated', type: 'data_record',
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [{ key: '_unassigned', value: {  type: 'data_record'  }}]
          },
        },
      ];

      return service
        .getScopedAuthorizationContext(userCtx, docObjs)
        .then(result => {
          result.subjectIds.should.have.members(['_all', '_unassigned', 'org.couchdb.user:user']);
        });
    });

    it('should not add unassigned key if the user does not have required permissions', () => {
      auth.hasAllPermissions.returns(false);
      config.get.returns(true);

      const docObjs = [
        { // unallocated
          doc: {
            _id: 'unallocated', type: 'data_record',
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [{ key: '_unassigned', value: {  type: 'data_record'  }}]
          },
        },
      ];

      return service
        .getScopedAuthorizationContext(userCtx, docObjs)
        .then(result => {
          result.subjectIds.should.have.members(['_all', 'org.couchdb.user:user']);
        });
    });

    it('should assign correct subject depth with report ', () => {
      const docObjs = [
        {
          doc: {
            _id: 'r1', type: 'data_record',
            contact: { _id: 'c1', parent: { _id: 'p1', parent: { _id: 'facility_id' } } },
            fields: { patient_id: 'patient1' },
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [ { key: 'patient1', value: {  submitter: 'c1'  }} ]
          }
        },
      ];

      db.medic.query.resolves({ rows: [ { id: 'patient1doc', key: ['shortcode', 'patient1'] } ] });
      sinon.stub(db.medic, 'allDocs');
      db.medic.allDocs.withArgs(sinon.match({ start_key: sinon.match.string })).resolves({ rows: [] });
      db.medic.allDocs
        .withArgs(sinon.match({ keys: sinon.match.array }))
        .resolves({ rows: [
          { id: 'c1', doc: { _id: 'c1', type: 'person', parent: { _id: 'p1', parent: { _id: 'facility_id' } } } },
          {
            id: 'patient1doc',
            doc: {
              _id: 'patient1doc',
              type: 'person',
              patient_id: 'patient1',
              parent: { _id: 'p1', parent: { _id: 'facility_id' } }
            }
          },
        ]});

      const contactsByDepth = sinon.stub();
      contactsByDepth
        .withArgs(sinon.match({ _id: 'c1' }))
        .returns([
          { key: ['c1'], value: null },
          { key: ['c1', 0], value: null },
          { key: ['facility_id'], value: null },
          { key: ['facility_id', 1], value: null },
        ]);
      contactsByDepth
        .withArgs(sinon.match({ _id: 'patient1doc' }))
        .returns([
          { key: ['patient1doc'], value: 'patient1' },
          { key: ['patient1doc', 0], value: 'patient1' },
          { key: ['p1'], value: 'patient1' },
          { key: ['p1', 1], value: 'patient1' },
          { key: ['facility_id'], value: 'patient1' },
          { key: ['facility_id', 2], value: 'patient1' }
        ]);
      const docsByReplicationKey = sinon.stub();
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c1' })).returns([{ key: 'c1', value: {  type: 'contact'  }}]);
      docsByReplicationKey
        .withArgs(sinon.match({ _id: 'patient1doc' }))
        .returns([ { key: 'patient1doc', value: { type: 'contact' }}, ]);

      viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
      viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);

      return service
        .getScopedAuthorizationContext(userCtx, docObjs)
        .then(result => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([
            'medic-client/contacts_by_reference',
            { keys: [
              ['shortcode', 'patient1'],
              ['shortcode', 'c1'],
            ]}
          ]);
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0].should.deep.equal([{
            keys: ['patient1doc', 'c1'],
            include_docs: true
          }]);

          contactsByDepth.callCount.should.equal(2);
          docsByReplicationKey.callCount.should.equal(2);

          result.subjectIds.should.have.members([
            'c1', 'patient1doc', 'patient1', '_all', 'org.couchdb.user:user'
          ]);
          result.subjectsDepth.should.deep.equal({
            'c1': 1,
            'patient1': 2,
            'patient1doc': 2,
          });
        });
    });

    it('should assign correct subject depth with report with needs signoff', () => {
      const docObjs = [
        {
          doc: {
            _id: 'r1', type: 'data_record',
            contact: { _id: 'c1', parent: { _id: 'p1', parent: { _id: 'facility_id' } } },
            fields: { patient_id: 'patient1' },
          },
          viewResults: {
            contactsByDepth: [],
            replicationKeys: [
              { key: 'patient1', value: {  submitter: 'c1', type: 'data_record'  }},
              { key: 'c1', value: {  submitter: 'c1', type: 'data_record'  }},
              { key: 'p1', value: {  submitter: 'c1', type: 'data_record'  }},
              { key: 'facility_id', value: {  submitter: 'c1', type: 'data_record'  }},
            ]
          }
        },
      ];

      db.medic.query.resolves({ rows: [ { id: 'patient1doc', key: ['shortcode', 'patient1'] } ] });
      sinon.stub(db.medic, 'allDocs');
      db.medic.allDocs.withArgs(sinon.match({ start_key: sinon.match.string })).resolves({ rows: [] });
      db.medic.allDocs
        .withArgs(sinon.match({ keys: sinon.match.array }))
        .resolves({ rows: [
          { id: 'c1', doc: { _id: 'c1', type: 'person', parent: { _id: 'p1', parent: { _id: 'facility_id' } } } },
          {
            id: 'patient1doc',
            doc: {
              _id: 'patient1doc',
              type: 'person',
              patient_id: 'patient1', parent: { _id: 'p1', parent: { _id: 'facility_id' } }
            }},
          { id: 'p1', doc: { _id: 'p1', type: 'clinic', parent: { _id: 'facility_id' } } },
          { id: 'facility_id', doc: { _id: 'facility_id', type: 'district_hospital' } },
        ]});

      const contactsByDepth = sinon.stub();
      contactsByDepth
        .withArgs(sinon.match({ _id: 'c1' }))
        .returns([
          { key: ['c1'], value: null },
          { key: ['c1', 0], value: null },
          { key: ['facility_id'], value: null },
          { key: ['facility_id', 1], value: null },
        ]);
      contactsByDepth
        .withArgs(sinon.match({ _id: 'patient1doc' }))
        .returns([
          { key: ['patient1doc'], value: 'patient1' },
          { key: ['patient1doc', 0], value: 'patient1' },
          { key: ['p1'], value: 'patient1' },
          { key: ['p1', 1], value: 'patient1' },
          { key: ['facility_id'], value: 'patient1' },
          { key: ['facility_id', 2], value: 'patient1' }
        ]);
      contactsByDepth
        .withArgs(sinon.match({ _id: 'p1' }))
        .returns([
          { key: ['p1'], value: null },
          { key: ['p1', 0], value: null },
          { key: ['facility_id'], value: null },
          { key: ['facility_id', 1], value: null }
        ]);
      contactsByDepth
        .withArgs(sinon.match({ _id: 'facility_id' }))
        .returns([
          { key: ['facility_id'], value: null },
          { key: ['facility_id', 0], value: null }
        ]);
      const docsByReplicationKey = sinon.stub();
      docsByReplicationKey.withArgs(sinon.match({ _id: 'c1' })).returns([{ key: 'c1', value: {  type: 'contact'  }}]);
      docsByReplicationKey
        .withArgs(sinon.match({ _id: 'patient1doc' }))
        .returns([ { key: 'patient1doc', value: { type: 'contact' }}, ]);
      docsByReplicationKey.withArgs(sinon.match({ _id: 'p1' })).returns([{ key: 'p1', value: { type: 'contact' }}]);
      docsByReplicationKey
        .withArgs(sinon.match({ _id: 'facility_id' }))
        .returns([ { key: 'facility_id', value: { type: 'contact' }}, ]);

      viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
      viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);

      return service
        .getScopedAuthorizationContext(userCtx, docObjs)
        .then(result => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([
            'medic-client/contacts_by_reference',
            { keys: [
              ['shortcode', 'patient1'],
              ['shortcode', 'c1'],
              ['shortcode', 'p1'],
              ['shortcode', 'facility_id'],
            ]}
          ]);
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0].should.deep.equal([{
            keys: ['patient1doc', 'c1', 'p1', 'facility_id'],
            include_docs: true
          }]);

          contactsByDepth.callCount.should.equal(4);
          docsByReplicationKey.callCount.should.equal(4);

          result.subjectIds.should.have.members([
            'c1', 'patient1doc', 'patient1', 'p1', 'facility_id', '_all', 'org.couchdb.user:user'
          ]);
          result.subjectsDepth.should.deep.equal({
            'c1': 1,
            'patient1': 2,
            'patient1doc': 2,
            'p1': 1,
            'facility_id': 0,
          });
        });
    });

    it('should assign correct subject depth with contact', () => {
      const c1 = {
        _id: 'c1', type: 'person',
        parent: { _id: 'p1', parent: { _id: 'facility_id' } }, patient_id: '123456'
      };
      const c2 = {
        _id: 'c2', type: 'person',
        parent: { _id: 'p3', parent: { _id: 'p4' } }, place_id: 'place1'
      };
      const docObjs = [
        {
          doc: c1, // allowed
          viewResults: {
            contactsByDepth: [
              { key: ['c1'], value: '123456' },
              { key: ['c1', 0], value: '123456' },
              { key: ['p1'], value: '123456' },
              { key: ['p1', 1], value: '123456' },
              { key: ['facility_id'], value: '123456' },
              { key: ['facility_id', 2], value: '123456' }
            ],
            replicationKeys: [{ key: 'c1', value: {  type: 'contact'  }}]
          }
        },
        {
          doc: c2, // denied
          viewResults: {
            contactsByDepth: [
              { key: ['c2'], value: 'place1' },
              { key: ['c2', 0], value: 'place1' },
              { key: ['p3'], value: 'place1' },
              { key: ['p3', 1], value: 'place1' },
              { key: ['p4'], value: 'place1' },
              { key: ['p4', 2], value: 'place1' },
            ],
            replicationKeys: [{ key: 'c2', value: {  type: 'contact'  }}]
          }
        },
      ];

      db.medic.query.resolves({ rows: [] });
      sinon.stub(db.medic, 'allDocs');

      db.medic.allDocs.withArgs(sinon.match({ start_key: sinon.match.any })).resolves({ rows: [] });
      db.medic.allDocs
        .withArgs(sinon.match({ keys: sinon.match.array }))
        .resolves({ rows: [ { id: 'c1', doc: c1 }, { id: 'c2', doc: c2 } ] });

      const contactsByDepth = sinon.stub();
      contactsByDepth.withArgs(c1).returns([
        { key: ['c1'], value: '123456' },
        { key: ['c1', 0], value: '123456' },
        { key: ['p1'], value: '123456' },
        { key: ['p1', 1], value: '123456' },
        { key: ['facility_id'], value: '123456' },
        { key: ['facility_id', 2], value: '123456' },
      ]);
      contactsByDepth.withArgs(c2).returns([
        { key: ['c2'], value: 'place1' },
        { key: ['c2', 0], value: 'place1' },
        { key: ['p3'], value: 'place1' },
        { key: ['p3', 1], value: 'place1' },
        { key: ['p4'], value: 'place1' },
        { key: ['p4', 2], value: 'place1' },
      ]);
      const docsByReplicationKey = sinon.stub();
      docsByReplicationKey.withArgs(c1).returns([{ key: 'c1', value: {  type: 'contact'  }}]);
      docsByReplicationKey.withArgs(c2).returns([{ key: 'c2', value: {  type: 'contact'  }}]);

      viewMapUtils.getViewMapFn.withArgs('medic', 'contacts_by_depth').returns(contactsByDepth);
      viewMapUtils.getViewMapFn.withArgs('medic', 'docs_by_replication_key').returns(docsByReplicationKey);

      return service
        .getScopedAuthorizationContext(userCtx, docObjs)
        .then(result => {
          db.medic.query.callCount.should.equal(1);
          db.medic.query.args[0].should.deep.equal([
            'medic-client/contacts_by_reference',
            { keys: [
              ['shortcode', 'c1'],
              ['shortcode', 'c2'],
            ] }
          ]);
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0].should.deep.equal([{ keys: ['c1', 'c2'], include_docs: true }]);

          contactsByDepth.callCount.should.equal(2);
          contactsByDepth.args.should.deep.equal([ [c1], [c2] ]);

          docsByReplicationKey.callCount.should.equal(2);
          docsByReplicationKey.args.should.deep.equal([ [c1], [c2]]);

          result.subjectIds.should.have.members([ 'c1', '123456', '_all', 'org.couchdb.user:user' ]);
          result.subjectsDepth.should.deep.equal({
            'c1': 2,
            '123456': 2,
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
        getReplicationKeys({ replicationKeys: [{ key: 'patient_id', value: {  }}] }).should.deep.equal(['patient_id']);
        getReplicationKeys({ replicationKeys: [{ key: 'patient', value: {  submitter: 'contact'  }}] })
          .should.deep.equal(['patient', 'contact']);
        const manyReplicationKeys = [
          { key: 'patient1', value: {  submitter: 'contact1'  }},
          { key: 'patient2', value: {  submitter: 'contact2'  }},
          { key: 'patient3', value: {  submitter: 'contact3'  }},
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
              ['shortcode', 'a'], ['shortcode', 'b'],
            ] }
          ]);
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0].should.deep.equal([{ keys: ['a', 'b'], include_docs: true }]);
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
              ['shortcode', 'contact1'],
              ['shortcode', 'patient_1'],
              ['shortcode', 'contact2'],
              ['shortcode', 'patient_2'],
              ['shortcode', 'patient_3'],
            ]
          }]);
          db.medic.allDocs.callCount.should.equal(1);
          db.medic.allDocs.args[0].should.deep.equal([{
            keys: ['contact1', 'person1', 'contact2', 'person2', 'patient_3'],
            include_docs: true,
          }]);
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
        getContactShortcode({ contactsByDepth: [{ key: ['parent'], value: 'patient' }] }).should.equal('patient');
        getContactShortcode(
          { contactsByDepth: [{ key: ['parent'], value: 'patient' }, { key: ['parent', 0], value: 'patient' }] }
        ).should.equal('patient');
      });
    });
  });

  describe('isAllowedDepth', () => {
    it('should return true when not using report replication depth', () => {
      service.__get__('isAllowedDepth')({}, []).should.equal(true);
      service.__get__('isAllowedDepth')({ reportDepth: -1 }, []).should.equal(true);
    });

    it('should return true when docType is not data_record', () => {
      let replicationKeys = [{ key: 'contact_id', value: { type: 'contact'  }}];
      service.__get__('isAllowedDepth')({ reportDepth: 1 }, replicationKeys).should.equal(true);

      replicationKeys = [{ key: 'targetID', value: { type: 'target'  }}];
      service.__get__('isAllowedDepth')({ reportDepth: 2 }, replicationKeys).should.equal(true);

      replicationKeys = [{ key: 'taskID', value: { type: 'task'  }}];
      service.__get__('isAllowedDepth')({ reportDepth: 3 }, replicationKeys).should.equal(true);

      replicationKeys = [{ key: 'anyid', value: { type: 'anything'  }}];
      service.__get__('isAllowedDepth')({ reportDepth: 0 }, replicationKeys).should.equal(true);
    });

    it('should return true when the depth is correct', () => {
      const authCtx = {
        subjectsDepth: { 'patient': 1, 'clinic': 0 },
        userCtx: { contact_id: 'user' },
        reportDepth: 2
      };

      let replicationKeys = [{ key: 'patient', value: { type: 'data_record', submitter: 'chw'  }}];
      service.__get__('isAllowedDepth')(authCtx, replicationKeys).should.equal(true);

      authCtx.reportDepth = 1;
      service.__get__('isAllowedDepth')(authCtx, replicationKeys).should.equal(true);

      replicationKeys = [{ key: 'clinic', value: { type: 'data_record', submitter: 'chw'  }}];
      service.__get__('isAllowedDepth')(authCtx, replicationKeys).should.equal(true);
    });

    it('should return true when submitter is logged in user', () => {
      const authCtx = {
        subjectsDepth: { 'patient': 2, 'clinic': 1, 'chw': 1, 'facility': 0 },
        reportDepth: 1,
        userCtx: { contact_id: 'chw' }
      };

      let replicationKeys = [{ key: 'patient', value: { type: 'data_record', submitter: 'chw'  }}];
      service.__get__('isAllowedDepth')(authCtx, replicationKeys).should.equal(true);

      replicationKeys = [
        { key: 'unknown', value: { type: 'data_record', submitter: 'chw'  }},
        { key: 'chw', value: { type: 'data_record', submitter: 'chw'  }},
        { key: 'facility', value: { type: 'data_record', submitter: 'chw'  }},
      ];
      authCtx.reportDepth = 0;
      service.__get__('isAllowedDepth')(authCtx, replicationKeys).should.equal(true);
    });

    it('should return false when report is outside of depth', () => {
      const authCtx = {
        subjectsDepth: { 'patient': 2, 'clinic': 1, 'chw': 1, 'facility': 0 },
        reportDepth: 1,
        userCtx: { contact_id: 'chw' }
      };
      const replicationKeys = [{ key: 'patient', value: { type: 'data_record', submitter: 'other'  }}];
      service.__get__('isAllowedDepth')(authCtx, replicationKeys).should.equal(false);

      authCtx.reportDepth = 0;
      service.__get__('isAllowedDepth')(authCtx, replicationKeys).should.equal(false);


      authCtx.reportDepth = 2;
      service.__get__('isAllowedDepth')(authCtx, replicationKeys).should.equal(true);
    });
  });

  describe('isSensitive', () => {
    const returnsTrue = sinon.stub().returns(true);
    const returnsFalse = sinon.stub().returns(false);

    it('should return false when there is no subject, no submitter or doc is not private', () => {
      service.__get__('isSensitive')().should.equal(false);
      service.__get__('isSensitive')({}, 'subj').should.equal(false);
      service.__get__('isSensitive')({}, 'subj', 'subm').should.equal(false);
      service.__get__('isSensitive')({}, 'subj', 'subm', false).should.equal(false);
    });

    it('should return false when subject is not sensitive', () => {
      const userCtx = {
        name: 'user',
        facility_id: ['my_facility'],
        contact_id: 'my_contact',
        facility: [{ _id: 'my_facility', place_id: 'facility_shortcode' }],
        contact: { _id: 'my_contact', patient_id: 'patient_shortcode' },
      };

      service.__get__('isSensitive')(userCtx, 'subj', 'subm', true).should.equal(false);
      service.__get__('isSensitive')(userCtx, 'other', 'subm', true).should.equal(false);
      service.__get__('isSensitive')(userCtx, 'subj', 'subm', true, true).should.equal(false);
      service.__get__('isSensitive')(userCtx, 'other', 'subm', true, false).should.equal(false);
      service.__get__('isSensitive')(userCtx, 'subj', 'subm', true, returnsTrue).should.equal(false);
      service.__get__('isSensitive')(userCtx, 'other', 'subm', true, returnsFalse).should.equal(false);
    });

    describe('when subject is sensitive', () => {
      let userCtx;

      beforeEach(() => {
        userCtx = {
          name: 'user',
          facility_id: ['my_facility'],
          contact_id: 'my_contact',
          facility: [{ _id: 'my_facility', place_id: 'facility_shortcode' }],
          contact: { _id: 'my_contact', patient_id: 'patient_shortcode' },
        };
      });

      it('when subject is facility id', () => {
        // with not allowed submitter
        service.__get__('isSensitive')(userCtx, 'my_facility', 'subm', true, returnsFalse).should.equal(true);
        service.__get__('isSensitive')(userCtx, 'my_facility', 'subm', true, false).should.equal(true);
        // with allowed submitter
        service.__get__('isSensitive')(userCtx, 'my_facility', 'subm', true, returnsTrue).should.equal(false);
        service.__get__('isSensitive')(userCtx, 'my_facility', 'subm', true, true).should.equal(false);

        delete userCtx.facility;

        // with not allowed submitter
        service.__get__('isSensitive')(userCtx, 'my_facility', 'subm', true, returnsFalse).should.equal(true);
        service.__get__('isSensitive')(userCtx, 'my_facility', 'subm', true, false).should.equal(true);
        // with allowed submitter
        service.__get__('isSensitive')(userCtx, 'my_facility', 'subm', true, returnsTrue).should.equal(false);
        service.__get__('isSensitive')(userCtx, 'my_facility', 'subm', true, true).should.equal(false);
      });

      it('when subject is facility shortcode', () => {
        // with not allowed submitter
        service.__get__('isSensitive')(userCtx, 'facility_shortcode', 'subm', true, returnsFalse).should.equal(true);
        service.__get__('isSensitive')(userCtx, 'facility_shortcode', 'subm', true, false).should.equal(true);
        // with allowed submitter
        service.__get__('isSensitive')(userCtx, 'facility_shortcode', 'subm', true, returnsTrue).should.equal(false);
        service.__get__('isSensitive')(userCtx, 'facility_shortcode', 'subm', true, true).should.equal(false);

        delete userCtx.facility; // no longer have facility_shortcode available

        // with not allowed submitter
        service.__get__('isSensitive')(userCtx, 'facility_shortcode', 'subm', true, returnsFalse).should.equal(false);
        service.__get__('isSensitive')(userCtx, 'facility_shortcode', 'subm', true, false).should.equal(false);
        // with allowed submitter
        service.__get__('isSensitive')(userCtx, 'facility_shortcode', 'subm', true, returnsTrue).should.equal(false);
        service.__get__('isSensitive')(userCtx, 'facility_shortcode', 'subm', true, true).should.equal(false);
      });

      it('when subject is contact id', () => {
        // with not allowed submitter
        service.__get__('isSensitive')(userCtx, 'my_contact', 'subm', true, returnsFalse).should.equal(true);
        service.__get__('isSensitive')(userCtx, 'my_contact', 'subm', true, false).should.equal(true);
        // with allowed submitter
        service.__get__('isSensitive')(userCtx, 'my_contact', 'subm', true, returnsTrue).should.equal(false);
        service.__get__('isSensitive')(userCtx, 'my_contact', 'subm', true, true).should.equal(false);

        delete userCtx.contact;

        // with not allowed submitter
        service.__get__('isSensitive')(userCtx, 'my_contact', 'subm', true, returnsFalse).should.equal(true);
        service.__get__('isSensitive')(userCtx, 'my_contact', 'subm', true, false).should.equal(true);
        // with allowed submitter
        service.__get__('isSensitive')(userCtx, 'my_contact', 'subm', true, returnsTrue).should.equal(false);
        service.__get__('isSensitive')(userCtx, 'my_contact', 'subm', true, true).should.equal(false);
      });

      it('when subject is contact shortcode', () => {
        // with not allowed submitter
        service.__get__('isSensitive')(userCtx, 'patient_shortcode', 'subm', true, returnsFalse).should.equal(true);
        service.__get__('isSensitive')(userCtx, 'patient_shortcode', 'subm', true, false).should.equal(true);
        // with allowed submitter
        service.__get__('isSensitive')(userCtx, 'patient_shortcode', 'subm', true, returnsTrue).should.equal(false);
        service.__get__('isSensitive')(userCtx, 'patient_shortcode', 'subm', true, true).should.equal(false);

        delete userCtx.contact;

        // with not allowed submitter
        service.__get__('isSensitive')(userCtx, 'patient_shortcode', 'subm', true, returnsFalse).should.equal(false);
        service.__get__('isSensitive')(userCtx, 'patient_shortcode', 'subm', true, false).should.equal(false);
        // with allowed submitter
        service.__get__('isSensitive')(userCtx, 'patient_shortcode', 'subm', true, returnsTrue).should.equal(false);
        service.__get__('isSensitive')(userCtx, 'patient_shortcode', 'subm', true, true).should.equal(false);
      });
    });
  });
});

