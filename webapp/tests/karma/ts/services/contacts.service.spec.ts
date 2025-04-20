import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { ContactsService } from '@mm-services/contacts.service';
import { DbService } from '@mm-services/db.service';
import { CacheService } from '@mm-services/cache.service';
import { ContactTypesService } from '@mm-services/contact-types.service';


describe('Contacts Service', () => {
  let service: ContactsService;
  let dbService;
  let cacheService;
  let contactTypesService;
  let query;

  beforeEach(() => {
    query = sinon.stub();
    dbService = { get: () => ({ query }) };
    cacheService = { register: sinon.stub().callsFake(options => options.get) };
    const placeTypes = [
      { id: 'district_hospital' },
      { id: 'health_center' },
      { id: 'clinic' }
    ];
    contactTypesService = {
      getPlaceTypes: sinon.stub().resolves(placeTypes),
      getTypeId: sinon.stub(),
      get: sinon.stub
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: CacheService, useValue: cacheService },
        { provide: ContactTypesService, useValue: contactTypesService },
      ]
    });

    service = TestBed.inject(ContactsService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns errors from request', () => {
    query.rejects('boom');
    return service
      .get(['district_hospital'])
      .then(() => assert.fail('expected error to be thrown'))
      .catch(err => {
        expect(err.name).to.equal('boom');
      });
  });

  it('returns zero when no facilities', () => {
    query.resolves({ rows: [] });
    return service.get(['district_hospital']).then(actual => {
      expect(actual).to.deep.equal([]);
    });
  });

  it('returns all clinics when no user district', () => {

    const clinicA = {
      _id: '920a7f6a-d01d-5cfe-7c9182fe6551322a',
      _rev: '2-55151d808dacc7f12fdd1513f2eddc75',
      type: 'clinic',
      name: 'Maori Hill',
      parent: {
        _id: 'a301463e-74ba-6e2a-3424d30ef5089a7f',
        _rev: '6-ef6e63875cb6322e48e3f964f460bd7a',
        type: 'health_center',
        name: 'Dunedin',
        parent: {
          _id: 'a301463e-74ba-6e2a-3424d30ef5087d1c',
          _rev: '3-42c1cfd045c5d80dd98ccc85c47f44ae',
          type: 'district_hospital',
          name: 'Otago',
          parent: {},
          contact: {
            name: 'Ralph',
            phone: '555'
          }
        },
        contact: {
          name: 'Sharon',
          phone: '556'
        }
      }
    };

    const clinicB = {
      _id: 'a301463e-74ba-6e2a-3424d30ef508a488',
      _rev: '74-30d4791ba64f13592f86023344fa9449',
      type: 'clinic',
      name: 'Andy Bay',
      contact: {
        name: 'Gareth',
        phone: '557557557'
      },
      parent: {
        _id: 'a301463e-74ba-6e2a-3424d30ef5089a7f',
        _rev: '6-ef6e63875cb6322e48e3f964f460bd7a',
        type: 'health_center',
        name: 'Dunedin',
        parent: {
          _id: 'a301463e-74ba-6e2a-3424d30ef5087d1c',
          _rev: '3-42c1cfd045c5d80dd98ccc85c47f44ae',
          type: 'district_hospital',
          name: 'Otago',
          parent: {},
          contact: {
            name: 'Ralph',
            phone: '555'
          }
        },
        contact: {
          name: 'Sharon',
          phone: '556'
        }
      },
      sent_forms: {
        R: '2014-07-10T02:10:28.776Z',
        STCK: '2014-07-09T23:28:45.949Z',
        XXXXXXX: '2014-07-01T00:46:24.362Z',
        '\u00e0\u00a4\u2014': '2014-07-02T02:06:32.270Z',
        ANCR: '2014-07-10T02:58:53.095Z'
      }
    };

    const healthCenter = {
      _id: '920a7f6a-d01d-5cfe-7c9182fe65516194',
      _rev: '4-d7d7e3ab5276fbd1bc9c9ca6b10f4ee1',
      type: 'health_center',
      name: 'Sumner',
      parent: {
        _id: '920a7f6a-d01d-5cfe-7c9182fe6551510e',
        _rev: '2-5b71b72299224c2500389db753116155',
        type: 'district_hospital',
        name: 'Christchurch',
        sent_forms: {
          R: '2014-06-30T04:08:06.657Z'
        }
      }
    };

    query
      .withArgs('medic-client/contacts_by_type', { include_docs: true, key: ['clinic'] })
      .resolves({ rows: [{ doc: clinicA }, { doc: clinicB }] });
    query
      .withArgs('medic-client/contacts_by_type', { include_docs: true, key: ['health_center'] })
      .resolves({ rows: [{ doc: healthCenter }] });

    return service.get(['clinic']).then(actual => {
      expect(actual).to.deep.equal([clinicA, clinicB]);
    });
  });

  it('should bust cache by correct type', async () => {
    query.resolves({ rows: [] });

    await service.get(['clinic']);

    expect(contactTypesService.getPlaceTypes.callCount).to.equal(1);
    expect(cacheService.register.callCount).to.equal(3);

    const forDistrictHospital = cacheService.register.args[0][0];
    const forHealthCenter = cacheService.register.args[1][0];
    const forClinic = cacheService.register.args[2][0];

    const doc = { _id: 'someDoc', type: 'something', contact_type: 'otherthing' };
    contactTypesService.getTypeId.withArgs(doc).returns('the correct type');

    expect(forDistrictHospital.invalidate({ doc })).to.equal(false);
    expect(forHealthCenter.invalidate({ doc })).to.equal(false);
    expect(forClinic.invalidate({ doc })).to.equal(false);

    expect(contactTypesService.getTypeId.callCount).to.equal(3);
    expect(contactTypesService.getTypeId.args).to.deep.equal([[doc], [doc], [doc],]);

    sinon.resetHistory();

    const otherDoc = { _id: 'someDoc', type: 'something', contact_type: 'otherthing' };
    contactTypesService.getTypeId.withArgs(otherDoc).returns('district_hospital');

    expect(forDistrictHospital.invalidate({ doc: otherDoc })).to.equal(true);
    expect(forHealthCenter.invalidate({ doc: otherDoc })).to.equal(false);
    expect(forClinic.invalidate({ doc: otherDoc })).to.equal(false);

    expect(contactTypesService.getTypeId.callCount).to.equal(3);
    expect(contactTypesService.getTypeId.args).to.deep.equal([[otherDoc], [otherDoc], [otherDoc],]);

    sinon.resetHistory();

    const thirdDoc = { _id: 'someDoc', type: 'something', contact_type: 'otherthing' };
    contactTypesService.getTypeId.withArgs(thirdDoc).returns('clinic');

    expect(forDistrictHospital.invalidate({ doc: thirdDoc })).to.equal(false);
    expect(forHealthCenter.invalidate({ doc: thirdDoc })).to.equal(false);
    expect(forClinic.invalidate({ doc: thirdDoc })).to.equal(true);

    expect(contactTypesService.getTypeId.callCount).to.equal(3);
    expect(contactTypesService.getTypeId.args).to.deep.equal([[thirdDoc], [thirdDoc], [thirdDoc],]);
  });

  it('should get siblings filtered by parent and contact type', async function () {
    query.resolves({
      offset: 0,
      rows: [
        { id: 'sib1', doc: { _id: 'sib1', name: 'Sibling1', parent: { _id: 'parent1' }, contact_type: 'some_type' } },
        { id: 'sib2', doc: { _id: 'sib2', name: 'Sibling2', parent: { _id: 'parent1' }, contact_type: 'some_type' } },
      ],
      total_rows: 6
    });
    const doc = {
      _id: '123',
      _rev: '1',
      contact_type: 'some_type',
      parent: { _id: 'parent1' },
      type: '',
    };
    contactTypesService.getTypeId.withArgs(doc).returns('some_type');
    const siblings = await service.getSiblings(doc);
    expect(siblings.length).to.equal(2);
    expect(siblings).to.deep.equal([
      { _id: 'sib1', name: 'Sibling1', parent: { _id: 'parent1' }, contact_type: 'some_type' },
      { _id: 'sib2', name: 'Sibling2', parent: { _id: 'parent1' }, contact_type: 'some_type' },
    ]);
  });

  it('should get siblings filtered by contact type', async function () {
    const districtHospitalA = {
      _id: '920a7f6a-d01d-5cfe-7c9182fe6551510e',
      _rev: '2-5b71b72299224c2500389db753116155',
      type: 'district_hospital',
      name: 'Christchurch',
      sent_forms: {
        R: '2014-06-30T04:08:06.657Z'
      }
    };

    const districtHospitalB = {
      _id: '3020c2a8-2074-4df5-a5ef-0c8f77ff336',
      _rev: '4-5b71b72299224c2500389db451239867',
      type: 'district_hospital',
      name: 'Saint Johns',
      sent_forms: {
        R: '2014-06-30T04:08:08.657Z'
      }
    };

    query.resolves({ rows: [{ doc: districtHospitalA }, { doc: districtHospitalB }] });
    const doc = {
      _id: '123',
      _rev: '1',
      contact_type: 'district_hospital',
      parent: undefined,
      type: ''
    };
    contactTypesService.getTypeId.withArgs(doc).returns('clinic');
    contactTypesService.get = (_) => {
      return {
        create_form: 'form:contact:district_hospital:create',
        create_key: 'contact.type.district_hospital.new',
        edit_form: 'form:contact:district_hospital:edit',
        edit_key: 'contact.type.place.edit',
        group_key: 'contact.type.district_hospital.plural',
        icon: 'medic-district-hospital',
        id: 'district_hospital',
        name_key: 'contact.type.district_hospital'
      };
    };
    const siblings = await service.getSiblings(doc);
    expect(siblings.length).to.equal(2);
    expect(siblings).to.deep.equal([districtHospitalA, districtHospitalB]);
  });

  it('should return no siblings if the doc is not a top-level contact type and should have a parent',
    async function () {
      const clinicA = {
        _id: '920a7f6a-d01d-5cfe-7c9182fe6551322a',
        _rev: '2-55151d808dacc7f12fdd1513f2eddc75',
        type: 'clinic',
        name: 'Maori Hill',
        parent: {
          _id: 'a301463e-74ba-6e2a-3424d30ef5089a7f',
          _rev: '6-ef6e63875cb6322e48e3f964f460bd7a',
          type: 'health_center',
          name: 'Dunedin',
          parent: {
            _id: 'a301463e-74ba-6e2a-3424d30ef5087d1c',
            _rev: '3-42c1cfd045c5d80dd98ccc85c47f44ae',
            type: 'district_hospital',
            name: 'Otago',
            parent: {},
            contact: {
              name: 'Ralph',
              phone: '555'
            }
          },
          contact: {
            name: 'Sharon',
            phone: '556'
          }
        }
      };

      const clinicB = {
        _id: 'a301463e-74ba-6e2a-3424d30ef508a488',
        _rev: '74-30d4791ba64f13592f86023344fa9449',
        type: 'clinic',
        name: 'Andy Bay',
        contact: {
          name: 'Gareth',
          phone: '557557557'
        },
        parent: {
          _id: 'a301463e-74ba-6e2a-3424d30ef5089a7f',
          _rev: '6-ef6e63875cb6322e48e3f964f460bd7a',
          type: 'health_center',
          name: 'Dunedin',
          parent: {
            _id: 'a301463e-74ba-6e2a-3424d30ef5087d1c',
            _rev: '3-42c1cfd045c5d80dd98ccc85c47f44ae',
            type: 'district_hospital',
            name: 'Otago',
            parent: {},
            contact: {
              name: 'Ralph',
              phone: '555'
            }
          },
          contact: {
            name: 'Sharon',
            phone: '556'
          }
        },
        sent_forms: {
          R: '2014-07-10T02:10:28.776Z',
          STCK: '2014-07-09T23:28:45.949Z',
          XXXXXXX: '2014-07-01T00:46:24.362Z',
          '\u00e0\u00a4\u2014': '2014-07-02T02:06:32.270Z',
          ANCR: '2014-07-10T02:58:53.095Z'
        }
      };

      query.resolves({ rows: [{ doc: clinicA }, { doc: clinicB }] });
      const doc = {
        _id: '123',
        _rev: '1',
        contact_type: 'clinic',
        parent: undefined,
        type: ''
      };
      contactTypesService.getTypeId.withArgs(doc).returns('clinic');
      // What we want it to look like for a top level place
      contactTypesService.get = (_) => {
        return {
          id: 'person',
          name_key: 'contact.type.person',
          group_key: 'contact.type.person.plural',
          create_key: 'contact.type.person.new',
          edit_key: 'contact.type.person.edit',
          primary_contact_key: 'clinic.field.contact',
          parents: [
            'district_hospital'
          ],
          icon: 'medic-person',
          create_form: 'form:contact:person:create',
          edit_form: 'form:contact:person:edit',
          person: true
        };
      };
      const siblings = await service.getSiblings(doc);
      expect(siblings.length).to.equal(0);
      expect(siblings).to.deep.equal([]);
    });

  it('should return no siblings', async function () {
    query.resolves({
      offset: 0,
      rows: [
        { id: 'sib1', doc: { _id: 'sib1', name: 'Sibling1', parent: { _id: 'parent1' }, contact_type: 'some_type' } },
        { id: 'sib2', doc: { _id: 'sib2', name: 'Sibling2', parent: { _id: 'parent1' }, contact_type: 'some_type' } },
      ],
      total_rows: 6
    });
    contactTypesService.getTypeId.withArgs({}).returns(undefined);
    const siblings = await service.getSiblings({} as any);
    expect(siblings).to.deep.equal([]);
  });
});
