import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { PlaceHierarchyService } from '@mm-services/place-hierarchy.service';
import { ContactsService } from '@mm-services/contacts.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SettingsService } from '@mm-services/settings.service';
import { DbService } from '@mm-services/db.service';

describe('PlaceHierarchy Service', () => {
  let service:PlaceHierarchyService;
  let contactService;
  let contactTypesService;
  let settingsService;
  let medicDb;
  let dbService;

  beforeEach(() => {
    const placeTypes = [
      { id: 'district_hospital' },
      { id: 'health_center', parents: [ 'district_hospital' ] },
      { id: 'clinic', parents: [ 'health_center' ] }
    ];
    contactTypesService = { getPlaceTypes: sinon.stub().resolves(placeTypes) };
    settingsService =  { get: sinon.stub().resolves({}) };
    contactService = { get: sinon.stub() };
    medicDb = { query: sinon.stub() };
    dbService = {
      get: sinon
        .stub()
        .returns(medicDb)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ContactsService, useValue: contactService },
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: SettingsService, useValue: settingsService },
        { provide: DbService, useValue: dbService },
      ]
    });

    service = TestBed.inject(PlaceHierarchyService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns errors from Contacts service', () => {
    contactService.get.rejects('boom');
    return service
      .get()
      .then(() => assert.fail('error expected'))
      .catch(err => {
        expect(err.name).to.equal('boom');
      });
  });

  it('returns errors from Contacts service', () => {
    contactService.get.rejects('boom');
    return service
      .get()
      .then(() => assert.fail('error expected'))
      .catch(err => {
        expect(err.name).to.equal('boom');
      });
  });

  it('builds empty hierarchy when no facilities', () => {
    contactService.get.resolves([]);
    return service.get().then(actual => {
      expect(actual.length).to.equal(0);
    });
  });

  it('builds hierarchy for facilities', () => {
    const a = { _id: 'a', parent: { _id: 'b', parent: { _id: 'c' } } };
    const b = { _id: 'b', parent: { _id: 'c' } };
    const c = { _id: 'c' };
    const d = { _id: 'd', parent: { _id: 'b', parent: { _id: 'c' } } };
    const e = { _id: 'e', parent: { _id: 'x' } };
    const f = { _id: 'f' };
    contactService.get.resolves([ a, b, c, d, e, f ]);
    return service.get().then(actual => {
      expect(contactService.get.callCount).to.equal(1);
      expect(contactService.get.args[0][0]).to.deep.equal([ 'district_hospital', 'health_center' ]);
      expect(actual).to.deep.equal([
        {
          doc: c,
          children: [
            {
              doc: b,
              children: [
                {
                  doc: a,
                  children: []
                },
                {
                  doc: d,
                  children: []
                }
              ]
            }
          ]
        },
        {
          doc: {
            _id: 'x',
            stub: true
          },
          children: [{
            doc: e,
            children: []
          }]
        },
        {
          doc: f,
          children: []
        }
      ]);
    });
  });

  it('pulls the hierarchy level from config', () => {
    const placeHierarchyTypes = ['a', 'b', 'c'];
    contactService.get.resolves([]);
    settingsService.get.resolves({ place_hierarchy_types: placeHierarchyTypes });

    return service.get().then(() => {
      expect(contactService.get.args[0][0]).to.deep.equal(placeHierarchyTypes);
    });
  });

  it('supports hoisting restricted hierarchies', () => {
    // Use case: a CHW with only access to their own clinic
    const clinic = { _id: 'clinic', parent: {_id: 'health_center', parent: {_id: 'district_hospital'}}};
    contactService.get.resolves([clinic]);
    return service.get().then(actual => {
      expect(actual).to.deep.equal([{
        doc: clinic,
        children: []
      }]);
    });
  });

  it('only hoists when there is one stub child', () => {
    const clinic1 = { _id: 'clinic', parent: {_id: 'health_center', parent: {_id: 'district_hospital'}}};
    const clinic2 = { _id: 'clinic2', parent: {_id: 'health_center2', parent: {_id: 'district_hospital'}}};
    const health_center = {_id: 'health_center', parent: {_id: 'district_hospital'}};

    contactService.get.resolves([clinic1, clinic2, health_center]);
    return service.get().then(actual => {
      expect(actual).to.deep.equal([{
        doc: health_center,
        children: [{
          doc: clinic1,
          children: []
        }]
      }, {
        doc: {
          _id: 'health_center2',
          stub: true
        },
        children: [{
          doc: clinic2,
          children: []
        }]
      }]);
    });
  });
});

/*
[
          'medic-client/contacts_by_place',
          { key: ['patient'], include_docs: true },
        ]
 */
