const sinon = require('sinon');
const lib = require('../src/tombstone-utils');
const expect = require('chai').expect;
let DB;

describe('Tombstone Utils Lib', function() {
  'use strict';

  afterEach(function() {
    sinon.restore();
  });

  beforeEach(function() {
    DB = { get: sinon.stub(), put: sinon.stub() };
  });

  describe('extractStub', function() {
    it('extracts doc stub from tombstoneID, if it matches the format, otherwise null', function() {
      expect(lib.extractStub('docid____rev____tombstone')).to.deep.equal({ id: 'docid', rev: 'rev' });
      expect(lib.extractStub('000011111')).to.equal(null);
    });
  });

  describe('extractDoc', function() {
    it('returns tombstone property contents', function() {
      const doc = { _id: 'some_tombstone', tombstone: { _id: 'some', foo: 'bar' } };
      expect(lib.extractDoc(doc)).to.deep.equal({ _id: 'some', foo: 'bar' });
      expect(lib.extractDoc({})).to.equal(undefined);
      expect(lib.extractDoc(33)).to.equal(undefined);
    });
  });

  describe('isTombstoneId', function() {
    it('returns true for strings that match, false otherwise', function() {
      expect(lib.isTombstoneId('aaaa')).to.equal(false);
      expect(lib.isTombstoneId('doc____rev____tombstone')).to.equal(true);
      expect(lib.isTombstoneId('doc-rev-tombstone')).to.equal(false);
    });
  });

  describe('processChange', function() {
    it('saves a tombstone doc for a deleted contact or report', function() {
      const person = { _id: 'personId', _rev: 'personRev', type: 'person' };
      const clinic = { _id: 'clinicId', _rev: 'clinicRev', type: 'clinic' };
      const districtHospital = { _id: 'districtHospitalId', _rev: 'districtHospitalRev', type: 'district_hospital' };
      const healthCenter = { _id: 'healthCenterId', _rev: 'healthCenterRev', type: 'health_center' };
      const report = { _id: 'reportId', _rev: 'reportRev', type: 'data_record' };

      DB.get.withArgs(person._id).resolves(Object.assign({ _revisions: 'something' }, person));
      DB.get.withArgs(clinic._id).resolves(Object.assign({ _revisions: 'something' }, clinic));
      DB.get.withArgs(districtHospital._id).resolves(Object.assign({ _revisions: 'something' }, districtHospital));
      DB.get.withArgs(healthCenter._id).resolves(Object.assign({ _revisions: 'something' }, healthCenter));
      DB.get.withArgs(report._id).resolves(Object.assign({ _revisions: 'something' }, report));

      DB.put.resolves();
      const personChange = { id: 'personId', deleted: true, changes: [{ rev: 'personRev' }] };
      const clinicChange = { id: 'clinicId', deleted: true, changes: [{ rev: 'clinicRev' }] };
      const districtHospitalChange = {
        id: 'districtHospitalId', deleted: true, changes: [{ rev: 'districtHospitalRev' }]
      };
      const healthCenterChange = { id: 'healthCenterId', deleted: true, changes: [{ rev: 'healthCenterRev' }] };
      const reportChange = { id: 'reportId', deleted: true, changes: [{ rev: 'reportRev' }] };

      return Promise
        .all([
          lib.processChange(Promise, DB, personChange),
          lib.processChange(Promise, DB, clinicChange),
          lib.processChange(Promise, DB, districtHospitalChange),
          lib.processChange(Promise, DB, healthCenterChange),
          lib.processChange(Promise, DB, reportChange)
        ])
        .then(function() {
          expect(DB.get.callCount).to.equal(5);
          expect(DB.get.args[0]).to.deep.equal([ 'personId', { rev: 'personRev', revs: true } ]);
          expect(DB.get.args[1]).to.deep.equal([ 'clinicId', { rev: 'clinicRev', revs: true } ]);
          expect(DB.get.args[2]).to.deep.equal([ 'districtHospitalId', { rev: 'districtHospitalRev', revs: true } ]);
          expect(DB.get.args[3]).to.deep.equal([ 'healthCenterId', { rev: 'healthCenterRev', revs: true } ]);
          expect(DB.get.args[4]).to.deep.equal([ 'reportId', { rev: 'reportRev', revs: true } ]);

          expect(DB.put.callCount).to.equal(5);
          expect(DB.put.args[0]).to.deep.equal([{
            _id: 'personId____personRev____tombstone',
            type: 'tombstone',
            tombstone: person
          }]);
          expect(DB.put.args[1]).to.deep.equal([{
            _id: 'clinicId____clinicRev____tombstone',
            type: 'tombstone',
            tombstone: clinic
          }]);
          expect(DB.put.args[2]).to.deep.equal([{
            _id: 'districtHospitalId____districtHospitalRev____tombstone',
            type: 'tombstone',
            tombstone: districtHospital
          }]);
          expect(DB.put.args[3]).to.deep.equal([{
            _id: 'healthCenterId____healthCenterRev____tombstone',
            type: 'tombstone',
            tombstone: healthCenter
          }]);
          expect(DB.put.args[4]).to.deep.equal([{
            _id: 'reportId____reportRev____tombstone',
            type: 'tombstone',
            tombstone: report
          }]);
        });
    });

    it('saves a tombstone for any deleted document, except for tombstones!', function() {
      const notype = {_id: 'doc1', _rev: 'doc1Rev'};
      const form = {_id: 'form', _rev: 'formRev', type: 'form'};
      const feedback = {_id: 'feedback', _rev: 'feedbackRev', type: 'feedback'};
      const info = {_id: 'info', _rev: 'infoRev', type: 'info'};
      const tombstone = {_id: 'tombstone', _rev: 'tombstoneRev', type: 'tombstone'};
      const translation = {_id: 'translation', _rev: 'translationRev', type: 'translations'};

      DB.get.withArgs(notype._id).resolves(Object.assign({ _revisions: 'something' }, notype));
      DB.get.withArgs(form._id).resolves(Object.assign({ _revisions: 'something' }, form));
      DB.get.withArgs(feedback._id).resolves(Object.assign({ _revisions: 'something' }, feedback));
      DB.get.withArgs(info._id).resolves(Object.assign({ _revisions: 'something' }, info));
      DB.get.withArgs(tombstone._id).resolves(Object.assign({ _revisions: 'something' }, tombstone));
      DB.get.withArgs(translation._id).resolves(Object.assign({ _revisions: 'something' }, translation));

      DB.put.resolves();
      const notypeChange = {id: 'doc1', deleted: true, changes: [{rev: 'doc1Rev'}]};
      const formChange = {id: 'form', deleted: true, changes: [{rev: 'formRev'}]};
      const feedbackChange = {id: 'feedback', deleted: true, changes: [{rev: 'feedbackRev'}]};
      const infoChange = {id: 'info', deleted: true, changes: [{rev: 'infoRev'}]};
      const tombstoneChange = {id: 'tombstone', deleted: true, changes: [{rev: 'tombstoneRev'}]};
      const translationChange = {id: 'translation', deleted: true, changes: [{rev: 'translationRev'}]};

      return Promise
        .all([
          lib.processChange(Promise, DB, notypeChange),
          lib.processChange(Promise, DB, formChange),
          lib.processChange(Promise, DB, feedbackChange),
          lib.processChange(Promise, DB, infoChange),
          lib.processChange(Promise, DB, tombstoneChange),
          lib.processChange(Promise, DB, translationChange)
        ])
        .then(function () {
          expect(DB.get.callCount).to.equal(6);
          expect(DB.get.args[0]).to.deep.equal(['doc1', {rev: 'doc1Rev', revs: true}]);
          expect(DB.get.args[1]).to.deep.equal(['form', {rev: 'formRev', revs: true}]);
          expect(DB.get.args[2]).to.deep.equal(['feedback', {rev: 'feedbackRev', revs: true}]);
          expect(DB.get.args[3]).to.deep.equal(['info', {rev: 'infoRev', revs: true}]);
          expect(DB.get.args[4]).to.deep.equal(['tombstone', {rev: 'tombstoneRev', revs: true}]);
          expect(DB.get.args[5]).to.deep.equal(['translation', {rev: 'translationRev', revs: true}]);

          expect(DB.put.callCount).to.equal(5);
          expect(DB.put.args[0]).to.deep.equal([{
            _id: 'doc1____doc1Rev____tombstone',
            type: 'tombstone',
            tombstone: notype
          }]);
          expect(DB.put.args[1]).to.deep.equal([{
            _id: 'form____formRev____tombstone',
            type: 'tombstone',
            tombstone: form
          }]);
          expect(DB.put.args[2]).to.deep.equal([{
            _id: 'feedback____feedbackRev____tombstone',
            type: 'tombstone',
            tombstone: feedback
          }]);
          expect(DB.put.args[3]).to.deep.equal([{
            _id: 'info____infoRev____tombstone',
            type: 'tombstone',
            tombstone: info
          }]);
          expect(DB.put.args[4]).to.deep.equal([{
            _id: 'translation____translationRev____tombstone',
            type: 'tombstone',
            tombstone: translation
          }]);
        });
    });

    it('throws error when reading the change doc fails', function() {
      DB.get.rejects('some error');
      const change = { id: 'id', deleted: true, changes: [{ rev: 'rev' }] };
      return lib
        .processChange(Promise, DB, change)
        .then(function() {
          throw new Error('was supposed to throw an error');
        })
        .catch(function(err) {
          expect(err.name).to.deep.equal('some error');
        });
    });

    it('does not throw if the tombstone already exists', function() {
      DB.get.resolves({ _id: 'id', type: 'person', _rev: 'rev' });
      DB.put.rejects({ status: 409, reason: 'document update conflict' });
      const change = { id: 'id', deleted: true, changes: [{ rev: 'rev' }] };
      return lib
        .processChange(Promise, DB, change)
        .then(function() {
          expect(DB.put.callCount).to.equal(1);
          expect(DB.put.args[0]).to.deep.equal([{
            _id: 'id____rev____tombstone',
            type: 'tombstone',
            tombstone: { _id: 'id', type: 'person', _rev: 'rev' }
          }]);
        });
    });

    it('throws an error when saving the tombstone fails of something other than doc conflicts', function() {
      DB.get.resolves({ _id: 'id', type: 'person' });
      DB.put.rejects('some other error');
      const change = { id: 'id', deleted: true, changes: [{ rev: 'rev' }] };
      return lib
        .processChange(Promise, DB, change)
        .then(function() {
          throw new Error('was supposed to throw an error');
        })
        .catch(function(err) {
          expect(err.name).to.equal('some other error');
        });
    });

    it('saves change.doc if provided', function() {
      const change = {
        id: 'id',
        deleted: true,
        changes: [{ rev: '2' }], doc: { _id: 'id', _rev: '2', some: 'thing', _deleted: true }
      };
      DB.put.resolves();

      return lib
        .processChange(Promise, DB, change)
        .then(function() {
          expect(DB.get.callCount).to.equal(0);
          expect(DB.put.callCount).to.equal(1);
          expect(DB.put.args[0]).to.deep.equal([{
            _id: 'id____2____tombstone',
            type: 'tombstone',
            tombstone: { _id: 'id', _rev: '2', some: 'thing' }
          }]);
        });
    });

    describe('for CouchDB tombstone stubs', function() {
      it('saves previous version of doc content for CouchDB generated tombstones', function() {
        const doc = [ { _id: 'id', _rev: '5-rev', _deleted: true }, { _id: 'id', _rev: '4-prev', 'some': 'thing' } ];
        const revisions = { start: 5, ids: ['rev', 'prev', '1', '2', '3'] };
        const change = { id: 'id', deleted: true, changes: [{ rev: '5-rev' }, { rev: '3-1' }] };

        DB.put.resolves();
        DB.get
          .withArgs('id', { rev: '5-rev', revs: true })
          .resolves(Object.assign({ _revisions: revisions }, doc[0]));
        DB.get
          .withArgs('id', { rev: '4-prev' })
          .resolves(doc[1]);
        return lib
          .processChange(Promise, DB, change)
          .then(function() {
            expect(DB.get.callCount).to.equal(2);
            expect(DB.get.args[0]).to.deep.equal([ 'id', { rev: '5-rev', revs: true } ]);
            expect(DB.get.args[1]).to.deep.equal([ 'id', { rev: '4-prev' } ]);
            expect(DB.put.callCount).to.equal(1);
            expect(DB.put.args[0]).to.deep.equal([{
              _id: 'id____5-rev____tombstone',
              type: 'tombstone',
              tombstone: { _id: 'id', _rev: '4-prev', 'some': 'thing' }
            }]);
          });
      });

      it('saves original version when no previous revisions are available for some reason', function() {
        const change = { id: 'id', deleted: true, changes: [{ rev: '2-rev' }] };
        DB.get
          .withArgs('id', { rev: '2-rev', revs: true })
          .resolves({ _id: 'id', _rev: '2-rev', _deleted: true, _revisions: false });
        DB.put.resolves();

        return lib
          .processChange(Promise, DB, change)
          .then(function() {
            expect(DB.get.callCount).to.equal(1);
            expect(DB.get.args[0]).to.deep.equal([ 'id', { rev: '2-rev', revs: true } ]);
            expect(DB.put.callCount).to.equal(1);
            expect(DB.put.args[0]).to.deep.equal([{
              _id: 'id____2-rev____tombstone',
              type: 'tombstone',
              tombstone: { _id: 'id', _rev: '2-rev' }
            }]);
          });
      });

      it('saves previous version of doc when change doc is a couchdb tombstone', function() {
        const doc = [ { _id: 'id', _rev: '5-rev', _deleted: true }, { _id: 'id', _rev: '4-prev', 'some': 'thing' } ];
        const revisions = { start: 5, ids: ['rev', 'prev', '1', '2', '3'] };
        const change = { id: 'id', deleted: true, changes: [{ rev: '5-rev' }, { rev: '3-1' }], doc: doc[0] };

        DB.put.resolves();
        DB.get
          .withArgs('id', { rev: '5-rev', revs: true })
          .resolves(Object.assign({ _revisions: revisions }, doc[0]));
        DB.get
          .withArgs('id', { rev: '4-prev' })
          .resolves(doc[1]);
        return lib
          .processChange(Promise, DB, change)
          .then(function() {
            expect(DB.get.callCount).to.equal(2);
            expect(DB.get.args[0]).to.deep.equal([ 'id', { rev: '5-rev', revs: true } ]);
            expect(DB.get.args[1]).to.deep.equal([ 'id', { rev: '4-prev' } ]);
            expect(DB.put.callCount).to.equal(1);
            expect(DB.put.args[0]).to.deep.equal([{
              _id: 'id____5-rev____tombstone',
              type: 'tombstone',
              tombstone: { _id: 'id', _rev: '4-prev', 'some': 'thing' }
            }]);
          });
      });
    });
  });

  describe('generateChangeFromTombstone', function() {
    it('extracts accurate information', function() {
      expect(lib.generateChangeFromTombstone({ id: 'id____rev____tombstone' }))
        .to.deep.equal({ id: 'id', changes:[{ rev: 'rev' }], deleted: true, seq: undefined });
      expect(lib.generateChangeFromTombstone({ id: 'id____rev____tombstone', seq: 'aaa' }))
        .to.deep.equal({ id: 'id', changes:[{ rev: 'rev' }], deleted: true, seq: 'aaa' });
    });

    it('only includes doc if it exists and is requested', function() {
      expect(lib.generateChangeFromTombstone({ id: 'id____rev____tombstone' }, true))
        .to.deep.equal({ id: 'id', changes:[{ rev: 'rev' }], deleted: true, seq: undefined });

      const changeWithDoc = {
        id: 'id____rev____tombstone',
        doc: {
          _id:'id____rev____tombstone',
          tombstone: { _id: 'id', _rev: 'rev' }
        }
      };
      expect(lib.generateChangeFromTombstone(changeWithDoc))
        .to.deep.equal({ id: 'id', changes:[{ rev: 'rev' }], deleted: true, seq: undefined });
      expect(lib.generateChangeFromTombstone(changeWithDoc, true)).to.deep.equal(
        { id: 'id', changes:[{ rev: 'rev' }], deleted: true, seq: undefined, doc: { _id: 'id', _rev: 'rev' }}
      );
    });
  });

  describe('isDeleteStub', function() {
    it('returns false for docs that have properties', function() {
      expect(lib._isDeleteStub({ _id: 'a', some: 'thing' })).to.equal(false);
      expect(lib._isDeleteStub({ _id: 'a', some: 'thing', _rev: '1' })).to.equal(false);
    });

    it('returns false for docs that are not deleted', function() {
      expect(lib._isDeleteStub({ _id: 'a', _rev: 'thing' })).to.equal(false);
      expect(lib._isDeleteStub({ _id: 'a', _rev: 'thing', _deleted: false })).to.equal(false);
    });

    it('returns true for couchDB tombstones', function() {
      const doc = {
        _id: 'id',
        _rev: 'rev',
        _revisions: 'a',
        _attachments: 'b',
        _conflicts: 'c',
        _deleted: true
      };

      expect(lib._isDeleteStub(doc)).to.equal(true);
      doc._deleted = false;
      expect(lib._isDeleteStub(doc)).to.equal(false);
      doc._deleted = true;
      doc.a = 'something';
      expect(lib._isDeleteStub(doc)).to.equal(false);
    });
  });

  describe('getPreviousRev', function() {
    it('returns false when rev is missing', function() {
      expect(lib._getPreviousRev(false)).to.equal(false);
      expect(lib._getPreviousRev(undefined)).to.equal(false);
      expect(lib._getPreviousRev({})).to.equal(false);
      expect(lib._getPreviousRev({ start: 1 })).to.equal(false);
      expect(lib._getPreviousRev({ start: 2 })).to.equal(false);
      expect(lib._getPreviousRev({ start: 2, ids: [] })).to.equal(false);
      expect(lib._getPreviousRev({ start: 2, ids: ['a'] })).to.equal(false);
      expect(lib._getPreviousRev({ start: 1, ids: ['a', 'b', 'c'] })).to.equal(false);
    });

    it('returns previous rev', function() {
      expect(lib._getPreviousRev({ start: 2, ids: ['a', 'b'] })).to.equal('1-b');
      expect(lib._getPreviousRev({ start: 720, ids: ['a', 'b', 'c', 'd', 'e', 'f'] })).to.equal('719-b');
      expect(lib._getPreviousRev({ start: 10, ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })).to.equal('9-2');
      expect(lib._getPreviousRev({ start: 500, ids: [500, 499, 498, 497, 496, 495, 494, 493] })).to.equal('499-499');
    });
  });

  describe('getTombstonePrefix', () => {
    it('should return correct value', () => {
      expect(lib.getTombstonePrefix('myid')).to.equal('myid____');
      expect(lib.getTombstonePrefix()).to.equal('undefined____');
      expect(lib.getTombstonePrefix(0)).to.equal('0____');
    });
  });
});
