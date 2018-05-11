var sinon = require('sinon').sandbox.create(),
    chai = require('chai'),
    lib = require('../src/tombstone-utils');
require('chai').should();

var DB,
    initedLib;

describe('Tombstone Utils Lib', function() {
  'use strict';

  afterEach(function() {
    sinon.restore();
  });

  beforeEach(function() {
    DB = { get: sinon.stub(), put: sinon.stub() };
    initedLib = lib(Promise, DB);
  });

  describe('extractDocId', function() {
    it('extracts docID from tombstoneID, if it matches the format, otherwise null', function() {
      initedLib.extractDocId('docid____rev____tombstone').should.equal('docid');
      chai.expect(initedLib.extractDocId('000011111')).to.equal(null);
    });
  });

  describe('extractRev', function() {
    it('extracts rev from tombstoneID, if it matches the format, otherwise null', function() {
      initedLib.extractRev('docid____rev____tombstone').should.equal('rev');
      chai.expect(initedLib.extractRev('Friday')).to.equal(null);
    });
  });

  describe('extractDoc', function() {
    it('returns tombstone property contents', function() {
      var doc = { _id: 'some_tombstone', tombstone: { _id: 'some', foo: 'bar' } };
      initedLib.extractDoc(doc).should.deep.equal({ _id: 'some', foo: 'bar' });
      chai.expect(initedLib.extractDoc({})).to.equal(undefined);
      chai.expect(initedLib.extractDoc(33)).to.equal(undefined);
    });
  });

  describe('isTombstoneId', function() {
    it('returns true for strings that match, false otherwise', function() {
      initedLib.isTombstoneId('aaaa').should.equal(false);
      initedLib.isTombstoneId('doc____rev____tombstone').should.equal(true);
      initedLib.isTombstoneId('doc-rev-tombstone').should.equal(false);
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
          initedLib.processChange(personChange),
          initedLib.processChange(clinicChange),
          initedLib.processChange(districtHospitalChange),
          initedLib.processChange(healthCenterChange),
          initedLib.processChange(reportChange)
        ])
        .then(function() {
          DB.get.callCount.should.equal(5);
          DB.get.args[0].should.deep.equal([ 'personId', { rev: 'personRev' } ]);
          DB.get.args[1].should.deep.equal([ 'clinicId', { rev: 'clinicRev' } ]);
          DB.get.args[2].should.deep.equal([ 'districtHospitalId', { rev: 'districtHospitalRev' } ]);
          DB.get.args[3].should.deep.equal([ 'healthCenterId', { rev: 'healthCenterRev' } ]);
          DB.get.args[4].should.deep.equal([ 'reportId', { rev: 'reportRev' } ]);

          DB.put.callCount.should.equal(5);
          DB.put.args[0].should.deep.equal([{
            _id: 'personId____personRev____tombstone',
            type: 'tombstone',
            tombstone: person
          }]);
          DB.put.args[1].should.deep.equal([{
            _id: 'clinicId____clinicRev____tombstone',
            type: 'tombstone',
            tombstone: clinic
          }]);
          DB.put.args[2].should.deep.equal([{
            _id: 'districtHospitalId____districtHospitalRev____tombstone',
            type: 'tombstone',
            tombstone: districtHospital
          }]);
          DB.put.args[3].should.deep.equal([{
            _id: 'healthCenterId____healthCenterRev____tombstone',
            type: 'tombstone',
            tombstone: healthCenter
          }]);
          DB.put.args[4].should.deep.equal([{
            _id: 'reportId____reportRev____tombstone',
            type: 'tombstone',
            tombstone: report
          }]);
        });
    });

    it('does not save tombstone when doc is not contact or data_record', function() {
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
          initedLib.processChange(notypeChange),
          initedLib.processChange(formChange),
          initedLib.processChange(feedbackChange),
          initedLib.processChange(infoChange),
          initedLib.processChange(tombstoneChange),
          initedLib.processChange(translationChange)
        ])
        .then(function () {
          DB.get.callCount.should.equal(6);
          DB.get.args[0].should.deep.equal(['doc1', {rev: 'doc1Rev'}]);
          DB.get.args[1].should.deep.equal(['form', {rev: 'formRev'}]);
          DB.get.args[2].should.deep.equal(['feedback', {rev: 'feedbackRev'}]);
          DB.get.args[3].should.deep.equal(['info', {rev: 'infoRev'}]);
          DB.get.args[4].should.deep.equal(['tombstone', {rev: 'tombstoneRev'}]);
          DB.get.args[5].should.deep.equal(['translation', {rev: 'translationRev'}]);

          DB.put.callCount.should.equal(0);
        });
    });

    it('throws error when reading the change doc fails', function() {
      DB.get.rejects('some error');
      var change = { id: 'id', deleted: true, changes: [{ rev: 'rev' }] };
      return initedLib
        .processChange(change)
        .then(function() {
          throw new Error('was supposed to throw an error');
        })
        .catch(function(err) {
          err.name.should.deep.equal('some error');
        });
    });

    it('does not throw if the tombstone already exists', function() {
      DB.get.resolves({ _id: 'id', type: 'person', _rev: 'rev' });
      DB.put.rejects({ status: 409, reason: 'document update conflict' });
      var change = { id: 'id', deleted: true, changes: [{ rev: 'rev' }] };
      return initedLib
        .processChange(change)
        .then(function() {
          DB.put.callCount.should.equal(1);
          DB.put.args[0].should.deep.equal([{
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
      return initedLib
        .processChange(change)
        .then(function() {
          throw new Error('was supposed to throw an error');
        })
        .catch(function(err) {
          err.name.should.equal('some other error');
        });
    });
  });
});
