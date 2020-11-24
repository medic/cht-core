import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { DbService } from '@mm-services/db.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { UpdateFacilityService } from '@mm-services/update-facility.service';

describe('UpdateFacility service', () => {
  let service;
  let get;
  let put;

  beforeEach(() => {
    get = sinon.stub();
    put = sinon.stub();

    TestBed.configureTestingModule({
      providers: [
        ExtractLineageService,
        { provide: DbService, useValue: { get: () => ({ get, put }) } },
      ],
    });

    service = TestBed.inject(UpdateFacilityService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('updates the facility', () => {
    const message = {
      _id: 'abc',
      _rev: 1,
      errors: [
        { code: 'sys.facility_not_found' },
        { code: 'other error' }
      ]
    };
    const facility = { _id: 'xyz' };
    const expected = {
      _id: 'abc',
      _rev: 1,
      errors: [
        { code: 'other error' }
      ],
      contact: {
        _id: 'xyz'
      }
    };

    get
      .onFirstCall().resolves(message)
      .onSecondCall().resolves(facility);
    put.resolves({ _id: message._id, _rev: 2 });

    return service
      .update('abc', 'xyz')
      .then(() => {
        expect(put.calledOnce).to.equal(true);
        expect(put.args[0][0]).to.deep.equal(expected);
      });
  });

  it('should extract lineage', () => {
    const message = {
      _id: 'abc',
      contact: { _id: 'old_contact' },
      fields: { patient_id: 'aaa', some: 'field' },
    };
    const facility = {
      _id: 'facility',
      name: 'facility_name',
      phone: 'value',
      parent: {
        _id: 'parent',
        name: 'parent_name',
        phone: '123',
        parent: { _id: 'grandparent' },
      },
    };

    get
      .onCall(0).resolves(message)
      .onCall(1).resolves(facility);
    put.resolves({ _id: message._id, _rev: 2 });

    return service
      .update('abc', 'facility')
      .then(result => {
        expect(result).to.deep.equal({ _id: message._id, _rev: 2 });
        expect(get.callCount).to.equal(2);
        expect(get.args[0]).to.deep.equal(['abc']);
        expect(get.args[1]).to.deep.equal(['facility']);
        expect(put.callCount).to.equal(1);
        expect(put.args[0]).to.deep.equal([{
          _id: 'abc',
          contact: {
            _id: 'facility',
            parent: {
              _id: 'parent',
              parent: {
                _id: 'grandparent',
              },
            },
          },
          errors: [],
          fields: { patient_id: 'aaa', some: 'field' },
        }]);
      });
  });

  it('returns db errors', () => {
    get
      .onFirstCall().rejects('errcode1')
      .onSecondCall().resolves({});
    return service
      .update('abc', 'xyz')
      .then(() => {
        assert.fail('expected error to be thrown');
      })
      .catch((err) => {
        expect(err.name).to.equal('errcode1');
      });
  });

  it('returns db errors from second call', () => {
    get
      .onFirstCall().resolves({})
      .onSecondCall().rejects('errcode2');
    return service
      .update('abc', 'xyz')
      .then(() => {
        assert.fail('expected error to be thrown');
      })
      .catch((err) => {
        expect(err.name).to.equal('errcode2');
      });
  });

  it('returns save errors', () => {
    get
      .onFirstCall().resolves({})
      .onSecondCall().resolves({});
    put.rejects('errcode3');
    return service
      .update('abc', 'xyz')
      .then(() => {
        assert.fail('expected error to be thrown');
      })
      .catch((err) => {
        expect(err.name).to.equal('errcode3');
      });
  });

});
