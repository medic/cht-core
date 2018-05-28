var sinon = require('sinon').sandbox.create(),
    lib = require('../src/tombstone-utils'),
    expect = require('chai').expect,
    DB;

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
      var doc = { _id: 'some_tombstone', tombstone: { _id: 'some', foo: 'bar' } };
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
      var person = { _id: 'personId', _rev: 'personRev', type: 'person' };
      var clinic = { _id: 'clinicId', _rev: 'clinicRev', type: 'clinic' };
      var districtHospital = { _id: 'districtHospitalId', _rev: 'districtHospitalRev', type: 'district_hospital' };
      var healthCenter = { _id: 'healthCenterId', _rev: 'healthCenterRev', type: 'health_center' };
      var report = { _id: 'reportId', _rev: 'reportRev', type: 'data_record' };

      DB.get.withArgs(person._id).resolves(person);
      DB.get.withArgs(clinic._id).resolves(clinic);
      DB.get.withArgs(districtHospital._id).resolves(districtHospital);
      DB.get.withArgs(healthCenter._id).resolves(healthCenter);
      DB.get.withArgs(report._id).resolves(report);

      DB.put.resolves();
      var personChange = { id: 'personId', deleted: true, changes: [{ rev: 'personRev' }] };
      var clinicChange = { id: 'clinicId', deleted: true, changes: [{ rev: 'clinicRev' }] };
      var districtHospitalChange = { id: 'districtHospitalId', deleted: true, changes: [{ rev: 'districtHospitalRev' }] };
      var healthCenterChange = { id: 'healthCenterId', deleted: true, changes: [{ rev: 'healthCenterRev' }] };
      var reportChange = { id: 'reportId', deleted: true, changes: [{ rev: 'reportRev' }] };

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
          expect(DB.get.args[0]).to.deep.equal([ 'personId', { rev: 'personRev' } ]);
          expect(DB.get.args[1]).to.deep.equal([ 'clinicId', { rev: 'clinicRev' } ]);
          expect(DB.get.args[2]).to.deep.equal([ 'districtHospitalId', { rev: 'districtHospitalRev' } ]);
          expect(DB.get.args[3]).to.deep.equal([ 'healthCenterId', { rev: 'healthCenterRev' } ]);
          expect(DB.get.args[4]).to.deep.equal([ 'reportId', { rev: 'reportRev' } ]);

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
      var notype = {_id: 'doc1', _rev: 'doc1Rev'};
      var form = {_id: 'form', _rev: 'formRev', type: 'form'};
      var feedback = {_id: 'feedback', _rev: 'feedbackRev', type: 'feedback'};
      var info = {_id: 'info', _rev: 'infoRev', type: 'info'};
      var tombstone = {_id: 'tombstone', _rev: 'tombstoneRev', type: 'tombstone'};
      var translation = {_id: 'translation', _rev: 'translationRev', type: 'translations'};

      DB.get.withArgs(notype._id).resolves(notype);
      DB.get.withArgs(form._id).resolves(form);
      DB.get.withArgs(feedback._id).resolves(feedback);
      DB.get.withArgs(info._id).resolves(info);
      DB.get.withArgs(tombstone._id).resolves(tombstone);
      DB.get.withArgs(translation._id).resolves(translation);

      DB.put.resolves();
      var notypeChange = {id: 'doc1', deleted: true, changes: [{rev: 'doc1Rev'}]};
      var formChange = {id: 'form', deleted: true, changes: [{rev: 'formRev'}]};
      var feedbackChange = {id: 'feedback', deleted: true, changes: [{rev: 'feedbackRev'}]};
      var infoChange = {id: 'info', deleted: true, changes: [{rev: 'infoRev'}]};
      var tombstoneChange = {id: 'tombstone', deleted: true, changes: [{rev: 'tombstoneRev'}]};
      var translationChange = {id: 'translation', deleted: true, changes: [{rev: 'translationRev'}]};

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
          expect(DB.get.args[0]).to.deep.equal(['doc1', {rev: 'doc1Rev'}]);
          expect(DB.get.args[1]).to.deep.equal(['form', {rev: 'formRev'}]);
          expect(DB.get.args[2]).to.deep.equal(['feedback', {rev: 'feedbackRev'}]);
          expect(DB.get.args[3]).to.deep.equal(['info', {rev: 'infoRev'}]);
          expect(DB.get.args[4]).to.deep.equal(['tombstone', {rev: 'tombstoneRev'}]);
          expect(DB.get.args[5]).to.deep.equal(['translation', {rev: 'translationRev'}]);

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
      var change = { id: 'id', deleted: true, changes: [{ rev: 'rev' }] };
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
      var change = { id: 'id', deleted: true, changes: [{ rev: 'rev' }] };
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
      var change = { id: 'id', deleted: true, changes: [{ rev: 'rev' }] };
      return lib
        .processChange(Promise, DB, change)
        .then(function() {
          throw new Error('was supposed to throw an error');
        })
        .catch(function(err) {
          expect(err.name).to.equal('some other error');
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

      var changeWithDoc = {
        id: 'id____rev____tombstone',
        doc: {
          _id:'id____rev____tombstone',
          tombstone: { _id: 'id', _rev: 'rev' }
        }
      };
      expect(lib.generateChangeFromTombstone(changeWithDoc))
        .to.deep.equal({ id: 'id', changes:[{ rev: 'rev' }], deleted: true, seq: undefined });
      expect(lib.generateChangeFromTombstone(changeWithDoc, true))
        .to.deep.equal({ id: 'id', changes:[{ rev: 'rev' }], deleted: true, seq: undefined, doc: { _id: 'id', _rev: 'rev' }});
    });
  });
});
