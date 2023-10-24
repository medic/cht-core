import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { DbService } from '@mm-services/db.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { ContactMutedService } from '@mm-services/contact-muted.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { MutingTransition } from '@mm-services/transitions/muting.transition';
import { ValidationService } from '@mm-services/validation.service';
import { PlaceHierarchyService } from '@mm-services/place-hierarchy.service';

describe('Muting Transition', () => {
  let transition:MutingTransition;
  let dbService;
  let lineageModelGenerator;
  let contactMutedService;
  let contactTypesService;
  let validationService;
  let placeHierarchyService;
  let clock;

  beforeEach(() => {
    dbService = { get: sinon.stub(), query: sinon.stub() };
    lineageModelGenerator = { docs: sinon.stub() };
    contactMutedService = { getMutedDoc: sinon.stub(), getMuted: sinon.stub() };
    contactTypesService = { includes: sinon.stub() };
    validationService = { validate: sinon.stub() };
    placeHierarchyService = { getDescendants: sinon.stub() };

    contactTypesService.includes.withArgs(sinon.match({ type: 'person' })).returns(true);
    contactTypesService.includes.withArgs(sinon.match({ type: 'clinic' })).returns(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => dbService } },
        { provide: LineageModelGeneratorService, useValue: lineageModelGenerator },
        { provide: ContactMutedService, useValue: contactMutedService },
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: ValidationService, useValue: validationService },
        { provide: PlaceHierarchyService, useValue: placeHierarchyService },
      ],
    });
    transition = TestBed.inject(MutingTransition);
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('init', () => {
    it('should return false when no settings', () => {
      expect(transition.init(undefined)).to.equal(false);
      expect(transition.init(false)).to.equal(false);
      expect(transition.init({ })).to.equal(false);
      expect(transition.init({ settings: 'yes' })).to.equal(false);
      expect(transition.init({ not_muting: 'yes' })).to.equal(false);
    });

    it('should return false with incomplete config', () => {
      const settings = {
        muting: {
          unmute_forms: ['unmute'],
        }
      };
      expect(transition.init(settings)).to.equal(false);
    });

    it('should return true with valid config', () => {
      const settings = {
        muting: {
          mute_forms: ['mute'],
          unmute_forms: ['unmute'],
        }
      };
      expect(transition.init(settings)).to.equal(true);
    });
  });

  describe('isUnmuteForm', () => {
    it('should return false when no configuration', () => {
      expect(transition.isUnmuteForm('aaa')).to.equal(false);
      expect(transition.isUnmuteForm(undefined)).to.equal(false);
    });

    it('should return false when argument is not a unmute form with inited config', () => {
      transition.init({ muting: { unmute_forms: ['a', 'b'] } });
      expect(transition.isUnmuteForm('form')).to.equal(false);
      expect(transition.isUnmuteForm('c')).to.equal(false);
      expect(transition.isUnmuteForm('')).to.equal(false);
    });

    it('should return false when argument is not a unmute form with inlined config', () => {
      const settings = { muting: { unmute_forms: ['a', 'b'] } };
      expect(transition.isUnmuteForm('form', settings)).to.equal(false);
      expect(transition.isUnmuteForm('c', settings)).to.equal(false);
      expect(transition.isUnmuteForm('', settings)).to.equal(false);
    });

    it('should return true when argument is a unmute form with inited config', () => {
      transition.init({ muting: { unmute_forms: ['unmute1', 'unmute2'] } });
      expect(transition.isUnmuteForm('unmute1')).to.equal(true);
      expect(transition.isUnmuteForm('unmute2')).to.equal(true);
    });

    it('should return true when argument is a unmute form with inlined config', () => {
      const settings = { muting: { unmute_forms: ['unmute1', 'unmute2'] } };
      expect(transition.isUnmuteForm('unmute1', settings)).to.equal(true);
      expect(transition.isUnmuteForm('unmute2', settings)).to.equal(true);

      transition.init({});
      expect(transition.isUnmuteForm('unmute1', settings)).to.equal(true);
      expect(transition.isUnmuteForm('unmute2', settings)).to.equal(true);
    });

  });

  describe('filter', () => {
    beforeEach(async () => {
      const settings = {
        muting: {
          mute_forms: ['mute'],
          unmute_forms: ['unmute'],
        }
      };

      transition.init(settings);
    });
    it('should return false when there are no relevant docs', async () => {
      const editMutingReport = [ { _id: 'existent_report', _rev: '1', type: 'data_record', form: 'mute' }, ];
      expect(transition.filter(editMutingReport)).to.equal(false);

      const editUnmuteReport = [ { _id: 'existent_report', _rev: '1', type: 'data_record', form: 'unmute' }, ];
      expect(transition.filter(editUnmuteReport)).to.equal(false);

      const editContacts = [
        { _id: 'contact1', _rev: 'value', type: 'person' },
        { _id: 'contact2', _rev: 'value', type: 'person' },
        { _id: 'contact3', _rev: 'value', type: 'clinic' },
      ];
      expect(transition.filter(editContacts)).to.equal(false);

      const docs = [
        { _id: 'report1', type: 'data_record' },
        { _id: 'report2', type: 'data_record', form: 'something' },
        { _id: 'contact3', _rev: 'value', type: 'clinic' },
        { _id: 'existent_report', _rev: '1', type: 'data_record', form: 'mute' },
      ];

      expect(transition.filter(docs)).to.equal(false);
    });

    it('should return true when one report is relevant', () => {
      const docs = [
        { _id: 'existent_contact', _rev: 'aaa', type: 'person' },
        { _id: 'new_report', type: 'data_record', form: 'mute' }, // new mute report
        { _id: 'existent_report', _rev: '1', type: 'data_record', form: 'mute' },
      ];
      expect(transition.filter(docs)).to.equal(true);
    });

    it('should return true when one contact is relevant', () => {
      const docs = [
        { _id: 'new_report', type: 'data_record', form: 'someform' },
        { _id: 'existent_report', _rev: '1', type: 'data_record', form: 'mute' },
        { _id: 'new_contact', type: 'person' },
      ];
      expect(transition.filter(docs)).to.equal(true);
    });

    it('should return true when multiple contacts are relevant', () => {
      const docs = [
        { _id: 'new_report', type: 'data_record', form: 'someform' },
        { _id: 'existent_report', _rev: '1', type: 'data_record', form: 'mute' },
        { _id: 'new_contact', type: 'person' },
        { _id: 'new_contact', type: 'clinic' },
      ];
      expect(transition.filter(docs)).to.equal(true);
    });
  });

  it('run should do nothing when not inited', async () => {
    const docs = [{ _id: 'new_report', type: 'data_record', form: 'unmute' }];

    const updatedDocs = await transition.run(docs);
    expect(updatedDocs).to.deep.equal([{ _id: 'new_report', type: 'data_record', form: 'unmute' }]);

    expect(lineageModelGenerator.docs.callCount).to.equal(0);
  });

  describe('run', () => {
    let settings;
    beforeEach(async () => {
      settings = {
        muting: {
          mute_forms: ['mute'],
          unmute_forms: ['unmute'],
        }
      };

      transition.init(settings);
    });

    it('should do nothing when inited with invalid config', async () => {
      transition.init({ muting: { unmute_forms: ['unmute'] } });
      const docs = [{ _id: 'new_report', type: 'data_record', form: 'unmute' }];

      const updatedDocs = await transition.run(docs);
      expect(updatedDocs).to.deep.equal([{ _id: 'new_report', type: 'data_record', form: 'unmute' }]);

      expect(lineageModelGenerator.docs.callCount).to.equal(0);
    });

    describe('new reports', () => {
      it('should mute a person', async () => {
        const now = 12345;
        clock.tick(now);
        const docs = [{
          _id: 'new_report',
          type: 'data_record',
          form: 'mute',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: 'shortcode',
          }
        }];

        const hydratedReport = {
          _id: 'new_report',
          type: 'data_record',
          form: 'mute',
          fields: {
            patient_id: 'shortcode',
          },
          patient: {
            _id: 'patient',
            name: 'patient name',
            type: 'person',
            parent: {
              _id: 'parent',
              name: 'parent',
            },
            patient_id: 'shortcode',
          },
        };
        const minifiedPatient = {
          _id: 'patient',
          name: 'patient name',
          type: 'person',
          parent: { _id: 'parent' },
          patient_id: 'shortcode',
        };

        lineageModelGenerator.docs.resolves([hydratedReport]);
        placeHierarchyService.getDescendants.resolves([]);
        dbService.get.withArgs('patient').resolves(minifiedPatient);
        contactMutedService.getMuted.returns(false);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([[docs[0]]]);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(dbService.get.args[0]).to.deep.equal(['patient']);
        expect(contactMutedService.getMuted.callCount).to.equal(1);
        expect(contactMutedService.getMuted.args[0]).to.deep.equal([hydratedReport.patient]);


        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            contact: { _id: 'contact_id' },
            fields: {
              patient_id: 'shortcode',
            },
            client_side_transitions: { muting: true },
          },
          {
            _id: 'patient',
            name: 'patient name',
            type: 'person',
            parent: { _id: 'parent' },
            patient_id: 'shortcode',
            muted: new Date(now).toISOString(),
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{
                muted: true,
                date: new Date(now).toISOString(),
                report_id: 'new_report'
              }]
            },
          }
        ]);
      });

      it('should unmute a person', async () => {
        const now = 5000;
        clock.tick(now);
        const docs = [{
          _id: 'a_report',
          type: 'data_record',
          form: 'unmute',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: 'shortcode',
          }
        }];

        const hydratedReport = {
          _id: 'a_report',
          type: 'data_record',
          form: 'unmute',
          fields: {
            patient_id: 'shortcode',
          },
          patient: {
            _id: 'patient',
            name: 'patient name',
            type: 'person',
            muted: 6000,
            patient_id: 'shortcode',
            parent: {
              _id: 'parent',
              name: 'parent',
            }
          },
        };
        lineageModelGenerator.docs.resolves([hydratedReport]);
        placeHierarchyService.getDescendants.resolves([]);
        dbService.get.withArgs('patient').resolves({
          _id: 'patient',
          name: 'patient name',
          type: 'person',
          muted: 6000,
          patient_id: 'shortcode',
          parent: { _id: 'parent' },
        });
        contactMutedService.getMuted.returns(true);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([[docs[0]]]);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(dbService.get.args[0]).to.deep.equal(['patient']);
        expect(contactMutedService.getMuted.callCount).to.equal(1);
        expect(contactMutedService.getMuted.args[0]).to.deep.equal([hydratedReport.patient]);

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'a_report',
            type: 'data_record',
            form: 'unmute',
            contact: { _id: 'contact_id' },
            fields: {
              patient_id: 'shortcode',
            },
            client_side_transitions: { muting: true },
          },
          {
            _id: 'patient',
            name: 'patient name',
            type: 'person',
            parent: { _id: 'parent' },
            patient_id: 'shortcode',
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 6000 },
              client_side: [{
                muted: false,
                date: new Date(now).toISOString(),
                report_id: 'a_report'
              }]
            },
          }
        ]);
      });

      it('should do nothing when subject is not found', async () => {
        const docs = [{
          _id: 'a_report',
          type: 'data_record',
          form: 'unmute',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: 'shortcode',
          }
        }];

        lineageModelGenerator.docs.resolves([{
          _id: 'a_report',
          type: 'data_record',
          form: 'unmute',
          fields: {
            patient_id: 'shortcode',
          },
        }]);
        contactMutedService.getMuted.returns(true);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([[docs[0]]]);
        expect(dbService.query.callCount).to.equal(0);
        expect(dbService.get.callCount).to.equal(0);

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'a_report',
            type: 'data_record',
            form: 'unmute',
            contact: { _id: 'contact_id' },
            fields: {
              patient_id: 'shortcode',
            },
          },
        ]);
      });

      it('should do nothing if contact is already muted', async() => {
        const docs = [{
          _id: 'new_report',
          type: 'data_record',
          form: 'mute',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: 'shortcode',
          }
        }];

        lineageModelGenerator.docs.resolves([{
          _id: 'new_report',
          type: 'data_record',
          form: 'mute',
          fields: {
            patient_id: 'shortcode',
          },
          patient: {
            _id: 'patient',
            name: 'patient name',
            type: 'person',
            muted: 6582,
            parent: {
              _id: 'parent',
              name: 'parent',
            },
            patient_id: 'shortcode',
          },
        }]);
        contactMutedService.getMuted.returns(true);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([[docs[0]]]);
        expect(dbService.query.callCount).to.equal(0);
        expect(dbService.get.callCount).to.equal(0);

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            contact: { _id: 'contact_id' },
            fields: {
              patient_id: 'shortcode',
            },
          },
        ]);
      });

      it('should do nothing if contact is already unmuted', async () => {
        const now = 5000;
        clock.tick(now);
        const docs = [{
          _id: 'a_report',
          type: 'data_record',
          form: 'unmute',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: 'shortcode',
          }
        }];

        lineageModelGenerator.docs.resolves([{
          _id: 'a_report',
          type: 'data_record',
          form: 'unmute',
          fields: {
            patient_id: 'shortcode',
          },
          patient: {
            _id: 'patient',
            name: 'patient name',
            type: 'person',
            patient_id: 'shortcode',
            parent: {
              _id: 'parent',
              name: 'parent',
            }
          },
        }]);

        contactMutedService.getMuted.returns(false);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(dbService.query.callCount).to.equal(0);
        expect(dbService.get.callCount).to.equal(0);

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'a_report',
            type: 'data_record',
            form: 'unmute',
            contact: { _id: 'contact_id' },
            fields: {
              patient_id: 'shortcode',
            },
          },
        ]);
      });

      it('should cascade muting to all descendents', async () => {
        const now = 158742118;
        clock.tick(now);

        const docs = [{
          _id: 'report',
          type: 'data_record',
          form: 'mute',
          contact: { _id: 'contact_id' },
          fields: {
            place_id: 'place_id',
          }
        }];

        const hydratedDocs = [{
          _id: 'report',
          type: 'data_record',
          form: 'mute',
          fields: {
            place_id: 'place_id',
          },
          place: {
            _id: 'place',
            name: 'place name',
            type: 'health_center',
            contact: { _id: 'chw', name: 'chw' },
            parent: {
              _id: 'parent',
              name: 'parent',
            },
            place_id: 'place_id',
          },
        }];

        lineageModelGenerator.docs.resolves(hydratedDocs);

        placeHierarchyService.getDescendants.resolves([
          {
            id: 'contact1',
            doc: {
              _id: 'contact1',
              type: 'person',
              parent: { _id: 'place', parent: { _id: 'parent' } },
            },
          },
          {
            id: 'clinic1',
            doc: {
              _id: 'clinic1',
              contact: { _id: 'othercontact' },
              type: 'clinic',
              parent: { _id: 'place', parent: { _id: 'parent' } },
            }
          },
          {
            id: 'patient1',
            doc: {
              _id: 'patient1',
              type: 'person',
              parent: { _id: 'clinic1', parent: { _id: 'place', parent: { _id: 'parent' } } },
            }
          },
          {
            id: 'clinic2',
            doc: {
              _id: 'clinic2',
              type: 'clinic',
              parent: { _id: 'place', parent: { _id: 'parent' } },
            }
          },
          {
            id: 'patient2',
            doc: {
              _id: 'patient2',
              type: 'person',
              parent: { _id: 'clinic2', parent: { _id: 'place', parent: { _id: 'parent' } } },
            }
          }
        ]);
        dbService.get.withArgs('place').resolves({
          _id: 'place',
          name: 'place name',
          type: 'health_center',
          contact: { _id: 'chw' },
          parent: { _id: 'parent' },
          place_id: 'place_id',
        });
        contactMutedService.getMuted.returns(false);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([[docs[0]]]);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(dbService.get.args[0]).to.deep.equal(['place']);
        expect(contactMutedService.getMuted.callCount).to.equal(1);
        expect(contactMutedService.getMuted.args[0]).to.deep.equal([hydratedDocs[0].place]);

        const mutingDate = new Date(now).toISOString();

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'report',
            type: 'data_record',
            form: 'mute',
            contact: { _id: 'contact_id' },
            fields: {
              place_id: 'place_id',
            },
            client_side_transitions: { muting: true },
          },
          {
            _id: 'contact1',
            type: 'person',
            parent: { _id: 'place', parent: { _id: 'parent' } },
            muted: mutingDate,
            muting_history: {
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'report' }],
              last_update: 'client_side',
            },
          },
          {
            _id: 'clinic1',
            contact: { _id: 'othercontact' },
            type: 'clinic',
            parent: { _id: 'place', parent: { _id: 'parent' } },
            muted: mutingDate,
            muting_history: {
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'report' }],
              last_update: 'client_side',
            },
          },
          {
            _id: 'patient1',
            type: 'person',
            parent: { _id: 'clinic1', parent: { _id: 'place', parent: { _id: 'parent' } } },
            muted: mutingDate,
            muting_history: {
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'report' }],
              last_update: 'client_side',
            },
          },
          {
            _id: 'clinic2',
            type: 'clinic',
            parent: { _id: 'place', parent: { _id: 'parent' } },
            muted: mutingDate,
            muting_history: {
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'report' }],
              last_update: 'client_side',
            },
          },
          {
            _id: 'patient2',
            type: 'person',
            parent: { _id: 'clinic2', parent: { _id: 'place', parent: { _id: 'parent' } } },
            muted: mutingDate,
            muting_history: {
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'report' }],
              last_update: 'client_side',
            },
          },
          {
            _id: 'place',
            name: 'place name',
            type: 'health_center',
            contact: { _id: 'chw' },
            parent: { _id: 'parent' },
            place_id: 'place_id',
            muted: mutingDate,
            muting_history: {
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'report' }],
              last_update: 'client_side',
            },
          },
        ]);
      });

      it('should cascade unmuting to all ancestors', async () => {
        const now = 158742118;
        clock.tick(now);

        const docs = [{
          _id: 'record',
          type: 'data_record',
          form: 'unmute',
          contact: { _id: 'contact_id' },
          fields: {
            place_id: 'place_id',
          },
        }];

        const hydratedReport = {
          _id: 'record',
          type: 'data_record',
          form: 'unmute',
          fields: {
            place_id: 'place_id',
          },
          place: {
            _id: 'place',
            place_id: 'place_id',
            muted: 1234,
            type: 'clinic',
            contact: { _id: 'chw' },
            parent: {
              _id: 'parent',
              type: 'health_center',
              contact: { _id: 'chw' },
              muted: 1234,
              parent: {
                _id: 'grandparent',
                contact: { _id: 'chw' },
                type: 'district_hospital'
              },
            },
          },
        };
        lineageModelGenerator.docs.resolves([hydratedReport]);

        placeHierarchyService.getDescendants.resolves([
          {
            id: 'place',
            doc: {
              _id: 'place',
              type: 'clinic',
              muted: 1234,
              contact: { _id: 'chw' },
              parent: { _id: 'parent', parent: { _id: 'grandparent' } },
            }
          },
          {
            id: 'other_place',
            doc: {
              _id: 'other_place',
              type: 'clinic',
              muted: 65478,
              contact: { _id: 'other_chw' },
              parent: { _id: 'parent', parent: { _id: 'grandparent' } },
            },
          },
          {
            id: 'contact1',
            doc: {
              _id: 'contact1',
              type: 'person',
              muted: 9999,
              parent: { _id: 'parent', parent: { _id: 'grandparent' } },
            }
          },
          {
            id: 'contact2',
            doc: {
              _id: 'contact2',
              type: 'person',
              muted: 98412,
              parent: {
                _id: 'place',
                parent: { _id: 'parent', parent: { _id: 'grandparent' } },
              },
            },
          },
          {
            id: 'contact3',
            doc: {
              _id: 'contact3',
              type: 'person',
              muted: 87488,
              parent: {
                _id: 'other_place',
                parent: { _id: 'parent', parent: { _id: 'grandparent' } },
              },
            },
          },
        ]);
        dbService.get.withArgs('parent').resolves({
          _id: 'parent',
          type: 'health_center',
          contact: { _id: 'chw' },
          muted: 1234,
          parent: { _id: 'grandparent' },
        });
        contactMutedService.getMuted.returns(true);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([[docs[0]]]);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(dbService.get.args[0]).to.deep.equal(['parent']);
        expect(contactMutedService.getMuted.callCount).to.equal(1);
        expect(contactMutedService.getMuted.args[0]).to.deep.equal([hydratedReport.place]);

        const mutingDate = new Date(now).toISOString();

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'record',
            type: 'data_record',
            form: 'unmute',
            contact: { _id: 'contact_id' },
            fields: { place_id: 'place_id' },
            client_side_transitions: { muting: true },
          },
          {
            _id: 'place',
            type: 'clinic',
            contact: { _id: 'chw' },
            parent: { _id: 'parent', parent: { _id: 'grandparent' } },
            muting_history: {
              server_side: { muted: true, date: 1234 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'record' }],
              last_update: 'client_side',
            },
          },
          {
            _id: 'other_place',
            type: 'clinic',
            contact: { _id: 'other_chw' },
            parent: { _id: 'parent', parent: { _id: 'grandparent' } },
            muting_history: {
              server_side: { muted: true, date: 65478 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'record' }],
              last_update: 'client_side',
            },
          },
          {
            _id: 'contact1',
            type: 'person',
            parent: { _id: 'parent', parent: { _id: 'grandparent' } },
            muting_history: {
              server_side: { muted: true, date: 9999 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'record' }],
              last_update: 'client_side',
            },
          },
          {
            _id: 'contact2',
            type: 'person',
            parent: {
              _id: 'place',
              parent: { _id: 'parent', parent: { _id: 'grandparent' } },
            },
            muting_history: {
              server_side: { muted: true, date: 98412 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'record' }],
              last_update: 'client_side',
            },
          },
          {
            _id: 'contact3',
            type: 'person',
            parent: {
              _id: 'other_place',
              parent: { _id: 'parent', parent: { _id: 'grandparent' } },
            },
            muting_history: {
              server_side: { muted: true, date: 87488 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'record' }],
              last_update: 'client_side',
            },
          },
          {
            _id: 'parent',
            type: 'health_center',
            contact: { _id: 'chw' },
            parent: { _id: 'grandparent' },
            muting_history: {
              server_side: { muted: true, date: 1234 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'record' }],
              last_update: 'client_side',
            },
          }
        ]);
      });

      it('should add entry to client_side muting history', async () => {
        const now = 5000;
        clock.tick(now);
        const docs = [{
          _id: 'a_report',
          type: 'data_record',
          form: 'mute',
          contact: { _id: 'contact_id' },
          fields: {
            place_id: 'place_shortcode',
          }
        }];

        lineageModelGenerator.docs.resolves([{
          _id: 'a_report',
          type: 'data_record',
          form: 'unmute',
          fields: {
            patient_id: 'shortcode',
          },
          place: {
            _id: 'place_uuid',
            name: 'place name',
            type: 'clinic',
            place_id: 'place_shortcode',
            parent: {
              _id: 'parent',
              name: 'parent',
            },
            muting_history: {
              last_update: 'server_side',
              server_side: { muted: false, date: undefined },
              client_side: [
                { muted: false, date: 100, report_id: 'a' },
                { muted: true, date: 200, report_id: 'b' },
                { muted: false, date: 300, report_id: 'c' },
              ]
            },
          },
        }]);
        placeHierarchyService.getDescendants.resolves([
          {
            id: 'patient',
            doc: {
              _id: 'patient_uuid',
              type: 'person',
              parent: { _id: 'place_uuid', parent: { _id: 'parent' } },
              muting_history: {
                last_update: 'client_side',
                server_side: { muted: false, date: undefined },
                client_side: [
                  { muted: false, date: 100, report_id: 'aaaa' },
                ]
              },
            }
          }
        ]);
        dbService.get.withArgs('place_uuid').resolves({
          _id: 'place_uuid',
          name: 'place name',
          type: 'clinic',
          place_id: 'place_shortcode',
          parent: { _id: 'parent' },
          muting_history: {
            last_update: 'server_side',
            server_side: { muted: false, date: undefined },
            client_side: [
              { muted: false, date: 100, report_id: 'a' },
              { muted: true, date: 200, report_id: 'b' },
              { muted: false, date: 300, report_id: 'c' },
            ]
          },
        });
        contactMutedService.getMuted.returns(false);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([[docs[0]]]);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(dbService.get.args[0]).to.deep.equal(['place_uuid']);
        expect(updatedDocs).to.deep.equal([
          {
            _id: 'a_report',
            type: 'data_record',
            form: 'mute',
            contact: { _id: 'contact_id' },
            fields: {
              place_id: 'place_shortcode',
            },
            client_side_transitions: { muting: true },
          },
          {
            _id: 'patient_uuid',
            type: 'person',
            parent: { _id: 'place_uuid', parent: { _id: 'parent' } },
            muted: new Date(now).toISOString(),
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [
                { muted: false, date: 100, report_id: 'aaaa' },
                { muted: true, date: new Date(now).toISOString(), report_id: 'a_report' },
              ]
            },
          },
          {
            _id: 'place_uuid',
            name: 'place name',
            type: 'clinic',
            place_id: 'place_shortcode',
            parent: { _id: 'parent' },
            muted: new Date(now).toISOString(),
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [
                { muted: false, date: 100, report_id: 'a' },
                { muted: true, date: 200, report_id: 'b' },
                { muted: false, date: 300, report_id: 'c' },
                { muted: true, date: new Date(now).toISOString(), report_id: 'a_report' },
              ]
            },
          },
        ]);
      });
    });

    describe('new contacts', () => {
      it('should mute a person under a muted parent', async () => {
        const now = 457385943;
        clock.tick(now);
        const docs = [
          {
            _id: 'new_contact',
            name: 'contact',
            type: 'person',
            parent: { _id: 'parent', parent: { _id: 'grandparent' }}
          }
        ];

        const hydratedContact = {
          _id: 'new_contact',
          name: 'contact',
          type: 'person',
          parent: {
            _id: 'parent',
            type: 'clinic',
            muted: 1000,
            parent: {
              _id: 'grandparent',
              type: 'health_center',
            }
          }
        };
        lineageModelGenerator.docs.resolves([ hydratedContact ]);
        contactMutedService.getMutedDoc.returns(hydratedContact.parent);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([docs]);
        expect(contactMutedService.getMutedDoc.callCount).to.equal(1);
        expect(contactMutedService.getMutedDoc.args[0]).to.deep.equal([
          hydratedContact,
          [hydratedContact.parent, hydratedContact.parent.parent],
        ]);

        const muteTime = new Date(now).toISOString();
        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_contact',
            name: 'contact',
            type: 'person',
            parent: { _id: 'parent', parent: { _id: 'grandparent' }},
            muted: muteTime,
            muting_history: {
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: muteTime, report_id: undefined }],
              last_update: 'client_side',
            }
          },
        ]);
      });

      it('should mute a person under a muted parent with broken muting history', async () => {
        const now = 457385943;
        clock.tick(now);
        const docs = [
          {
            _id: 'new_contact',
            name: 'contact',
            type: 'person',
            parent: { _id: 'parent', parent: { _id: 'grandparent' }}
          }
        ];

        const hydratedContact = {
          _id: 'new_contact',
          name: 'contact',
          type: 'person',
          parent: {
            _id: 'parent',
            type: 'clinic',
            muted: 1000,
            muting_history: {
              last_update: 'client_side',
            },
            parent: {
              _id: 'grandparent',
              type: 'health_center',
            }
          }
        };
        lineageModelGenerator.docs.resolves([ hydratedContact ]);
        contactMutedService.getMutedDoc.returns(hydratedContact.parent);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([docs]);
        expect(contactMutedService.getMutedDoc.callCount).to.equal(1);
        expect(contactMutedService.getMutedDoc.args[0]).to.deep.equal([
          hydratedContact,
          [hydratedContact.parent, hydratedContact.parent.parent],
        ]);

        const muteTime = new Date(now).toISOString();
        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_contact',
            name: 'contact',
            type: 'person',
            parent: { _id: 'parent', parent: { _id: 'grandparent' }},
            muted: muteTime,
            muting_history: {
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: muteTime, report_id: undefined }],
              last_update: 'client_side',
            }
          },
        ]);
      });


      it('should not mute a contact under an unmuted parent', async () => {
        const docs = [
          {
            _id: 'new_contact',
            name: 'contact',
            type: 'person',
            parent: { _id: 'parent', parent: { _id: 'grandparent' }}
          }
        ];

        const hydratedContact = {
          _id: 'new_contact',
          name: 'contact',
          type: 'person',
          parent: {
            _id: 'parent',
            type: 'clinic',
            parent: {
              _id: 'grandparent',
              type: 'health_center',
            }
          }
        };
        lineageModelGenerator.docs.resolves([ hydratedContact ]);
        contactMutedService.getMutedDoc.returns(false);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([docs]);
        expect(contactMutedService.getMutedDoc.callCount).to.equal(1);
        expect(contactMutedService.getMutedDoc.args[0]).to.deep.equal([
          hydratedContact,
          [ hydratedContact.parent, hydratedContact.parent.parent ],
        ]);

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_contact',
            name: 'contact',
            type: 'person',
            parent: { _id: 'parent', parent: { _id: 'grandparent' }},
          },
        ]);
      });

      it('should copy client_side muting report in history if it exists', async () => {
        const now = 32131;
        clock.tick(now);
        const docs = [
          {
            _id: 'new_contact',
            name: 'contact',
            type: 'person',
            parent: { _id: 'parent', parent: { _id: 'grandparent' }}
          }
        ];

        const hydratedContact = {
          _id: 'new_contact',
          name: 'contact',
          type: 'person',
          parent: {
            _id: 'parent',
            type: 'clinic',
            muted: 1000,
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: 1000, report_id: 'server_report' },
              client_side: [
                { muted: true, date: 100, report_id: 'client1' },
                { muted: false, date: 200, report_id: 'client2' },
                { muted: true, date: 300, report_id: 'client3' },
              ]
            },
            parent: {
              _id: 'grandparent',
              type: 'health_center',
            }
          }
        };
        lineageModelGenerator.docs.resolves([ hydratedContact ]);
        contactMutedService.getMutedDoc.returns(hydratedContact.parent);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([docs]);
        expect(contactMutedService.getMutedDoc.callCount).to.equal(1);
        expect(contactMutedService.getMutedDoc.args[0]).to.deep.equal([
          hydratedContact,
          [hydratedContact.parent, hydratedContact.parent.parent],
        ]);

        const muteTime = new Date(now).toISOString();
        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_contact',
            name: 'contact',
            type: 'person',
            parent: { _id: 'parent', parent: { _id: 'grandparent' }},
            muted: muteTime,
            muting_history: {
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: muteTime, report_id: 'client3' }],
              last_update: 'client_side',
            }
          },
        ]);
      });

      it('should mute multiple contacts under muted parent', async () => {
        const now = 457385943;
        clock.tick(now);
        const docs = [
          {
            _id: 'new_clinic',
            name: 'clinic',
            type: 'clinic',
            parent: { _id: 'hc', parent: { _id: 'district' } },
          },
          {
            _id: 'new_person',
            name: 'contact',
            type: 'person',
            parent: { _id: 'new_clinic', parent: { _id: 'hc', parent: { _id: 'district' } } },
          }
        ];

        const hydratedContacts = [
          {
            _id: 'new_clinic',
            name: 'clinic',
            type: 'clinic',
            parent: {
              _id: 'hc',
              name: 'hc',
              type: 'hc',
              muted: 4000,
              parent: {
                _id: 'district',
                name: 'district',
                type: 'district',
                muted: 1230,
              },
            },
          },
          {
            _id: 'new_person',
            name: 'contact',
            type: 'person',
            parent: {
              _id: 'new_clinic',
              name: 'clinic',
              type: 'clinic',
              parent: {
                _id: 'hc',
                name: 'hc',
                type: 'hc',
                muted: 4000,
                parent: {
                  _id: 'district',
                  name: 'district',
                  type: 'district',
                  muted: 1230,
                },
              },
            },
          },
        ];

        lineageModelGenerator.docs.resolves(hydratedContacts);
        contactMutedService.getMutedDoc.returns(hydratedContacts[0].parent);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([docs]);
        expect(contactMutedService.getMutedDoc.callCount).to.equal(2);
        expect(contactMutedService.getMutedDoc.args[0][0]).to.deep.include(hydratedContacts[0]);
        expect(contactMutedService.getMutedDoc.args[1][0]).to.deep.include(hydratedContacts[1]);

        const muteTime = new Date(now).toISOString();
        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_clinic',
            name: 'clinic',
            type: 'clinic',
            parent: { _id: 'hc', parent: { _id: 'district' } },
            muted: muteTime,
            muting_history: {
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: muteTime, report_id: undefined }],
              last_update: 'client_side',
            },
          },
          {
            _id: 'new_person',
            name: 'contact',
            type: 'person',
            parent: { _id: 'new_clinic', parent: { _id: 'hc', parent: { _id: 'district' } } },
            muted: muteTime,
            muting_history: {
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: muteTime, report_id: undefined }],
              last_update: 'client_side',
            },
          },
        ]);
      });
    });

    describe('filtering', () => {
      let validMutingReport;
      let validHydratedReport;
      let minifiedPatient;
      let transitionedValidMutingReport;
      let transitionedPatient;

      beforeEach(() => {
        validMutingReport = {
          _id: 'new_report',
          type: 'data_record',
          form: 'mute',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: 'patient1',
          }
        };

        validHydratedReport = {
          _id: 'new_report',
          type: 'data_record',
          form: 'mute',
          fields: {
            patient_id: 'patient1',
          },
          patient: {
            _id: 'patient',
            name: 'patient name',
            type: 'person',
            parent: {
              _id: 'parent',
              name: 'parent',
            },
            patient_id: 'patient1',
          },
        };

        minifiedPatient = {
          _id: 'patient',
          name: 'patient name',
          type: 'person',
          parent: { _id: 'parent' },
          patient_id: 'patient1',
        };

        transitionedValidMutingReport = {
          _id: 'new_report',
          type: 'data_record',
          form: 'mute',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: 'patient1',
          },
          client_side_transitions: { muting: true },
        };

        transitionedPatient = (now) => ({
          _id: 'patient',
          name: 'patient name',
          type: 'person',
          parent: { _id: 'parent' },
          patient_id: 'patient1',
          muted: new Date(now).toISOString(),
          muting_history: {
            last_update: 'client_side',
            server_side: { muted: false, date: undefined },
            client_side: [{
              muted: true,
              date: new Date(now).toISOString(),
              report_id: 'new_report'
            }]
          },
        });
      });

      it('should skip edited reports', async () => {
        const now = 12345;
        clock.tick(now);

        const oldReport = {
          _id: 'old_report',
          _rev: '1-32v',
          type: 'data_record',
          form: 'mute',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: 'patient2',
          }
        };

        const docs = [ validMutingReport, oldReport ];

        lineageModelGenerator.docs.resolves([validHydratedReport]);
        placeHierarchyService.getDescendants.resolves([]);
        dbService.get.withArgs(minifiedPatient._id).resolves(minifiedPatient);
        contactMutedService.getMuted.returns(false);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([[validMutingReport]]);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(dbService.get.args[0]).to.deep.equal([minifiedPatient._id]);
        expect(contactMutedService.getMuted.callCount).to.equal(1);
        expect(contactMutedService.getMuted.args[0]).to.deep.equal([validHydratedReport.patient]);

        expect(updatedDocs).to.deep.equal([
          transitionedValidMutingReport,
          {
            _id: 'old_report',
            _rev: '1-32v',
            type: 'data_record',
            form: 'mute',
            contact: { _id: 'contact_id' },
            fields: {
              patient_id: 'patient2',
            }
          },
          transitionedPatient(now),
        ]);
      });

      it('should skip reports that are not muting/unmuting reports', async () => {
        const now = 12345;
        clock.tick(now);
        const nonMutingReport = {
          _id: 'new_non_mute',
          type: 'data_record',
          form: 'definitely-not-mute',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: 'patient2',
          }
        };
        const docs = [ validMutingReport, nonMutingReport ];

        lineageModelGenerator.docs.resolves([validHydratedReport]);
        placeHierarchyService.getDescendants.resolves([]);
        dbService.get.withArgs(minifiedPatient._id).resolves(minifiedPatient);
        contactMutedService.getMuted.returns(false);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([[validMutingReport]]);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(dbService.get.args[0]).to.deep.equal([minifiedPatient._id]);
        expect(contactMutedService.getMuted.callCount).to.equal(1);
        expect(contactMutedService.getMuted.args[0]).to.deep.equal([validHydratedReport.patient]);

        expect(updatedDocs).to.deep.equal([
          transitionedValidMutingReport,
          {
            _id: 'new_non_mute',
            type: 'data_record',
            form: 'definitely-not-mute',
            contact: { _id: 'contact_id' },
            fields: {
              patient_id: 'patient2',
            }
          },
          transitionedPatient(now),
        ]);
      });

      it('should skip invalid reports', async () => {
        const now = 12345;
        clock.tick(now);
        const invalidMutingReport = {
          _id: 'new_invalid_mute',
          type: 'data_record',
          form: 'mute',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: 'patient2',
          }
        };
        const invalidHydratedReport = {
          _id: 'new_invalid_mute',
          type: 'data_record',
          form: 'mute',
          contact: { _id: 'contact_id' },
          fields: {
            patient_id: 'patient2',
          },
          patient: {
            name: 'the patient 2',
            patient_id: 'patient2',
          }
        };

        const docs = [ validMutingReport, invalidMutingReport ];
        lineageModelGenerator.docs.resolves([validHydratedReport, invalidHydratedReport]);
        placeHierarchyService.getDescendants.resolves([]);
        dbService.get.withArgs(minifiedPatient._id).resolves(minifiedPatient);
        contactMutedService.getMuted.returns(false);
        validationService.validate.withArgs(invalidHydratedReport).returns([{ code: 'error', message: 'message' }]);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([[ validMutingReport, invalidMutingReport ]]);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(dbService.get.args[0]).to.deep.equal([minifiedPatient._id]);
        expect(contactMutedService.getMuted.callCount).to.equal(1);
        expect(contactMutedService.getMuted.args[0]).to.deep.equal([validHydratedReport.patient]);
        expect(validationService.validate.callCount).to.equal(2);
        expect(validationService.validate.args).to.deep.equal([
          [ validHydratedReport, settings.muting, { patient: validHydratedReport.patient, place: undefined } ],
          [ invalidHydratedReport, settings.muting, { patient: invalidHydratedReport.patient, place: undefined } ],
        ]);

        expect(updatedDocs).to.deep.equal([
          transitionedValidMutingReport,
          {
            _id: 'new_invalid_mute',
            type: 'data_record',
            form: 'mute',
            contact: { _id: 'contact_id' },
            fields: {
              patient_id: 'patient2',
            },
            errors: [{ code: 'error', message: 'message' }],
          },
          transitionedPatient(now),
        ]);
      });

      it('should pass correct context to validation when muting places', async () => {
        const now = 12345;
        clock.tick(now);
        const invalidMutingReport = {
          _id: 'new_invalid_mute',
          type: 'data_record',
          form: 'mute',
          contact: { _id: 'contact_id' },
          fields: {
            place_id: 'place2',
          }
        };
        const invalidHydratedReport = {
          _id: 'new_invalid_mute',
          type: 'data_record',
          form: 'mute',
          contact: { _id: 'contact_id' },
          fields: {
            place_id: 'place2',
          },
          place: {
            name: 'the place 2',
            place_id: 'place2',
          }
        };
        const docs = [ validMutingReport, invalidMutingReport ];

        lineageModelGenerator.docs.resolves([validHydratedReport, invalidHydratedReport]);
        placeHierarchyService.getDescendants.resolves([]);
        dbService.get.withArgs(minifiedPatient._id).resolves(minifiedPatient);
        contactMutedService.getMuted.returns(false);
        validationService.validate.withArgs(invalidHydratedReport).returns([{ code: 'error', message: 'message' }]);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([[ validMutingReport, invalidMutingReport ]]);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(dbService.get.args[0]).to.deep.equal([minifiedPatient._id]);
        expect(contactMutedService.getMuted.callCount).to.equal(1);
        expect(contactMutedService.getMuted.args[0]).to.deep.equal([validHydratedReport.patient]);
        expect(validationService.validate.callCount).to.equal(2);
        expect(validationService.validate.args).to.deep.equal([
          [ validHydratedReport, settings.muting, { patient: validHydratedReport.patient, place: undefined } ],
          [ invalidHydratedReport, settings.muting, { patient: undefined, place: invalidHydratedReport.place } ],
        ]);

        expect(updatedDocs).to.deep.equal([
          transitionedValidMutingReport,
          {
            _id: 'new_invalid_mute',
            type: 'data_record',
            form: 'mute',
            contact: { _id: 'contact_id' },
            fields: {
              place_id: 'place2',
            },
            errors: [{ code: 'error', message: 'message' }],
          },
          transitionedPatient(now),
        ]);
      });

      it('should skip edited contacts', async () => {
        const now = 457385943;
        clock.tick(now);
        const docs = [
          {
            _id: 'new_clinic',
            name: 'clinic',
            type: 'clinic',
            parent: { _id: 'hc', parent: { _id: 'district' } },
          },
          {
            _id: 'old_person',
            _rev: '12-fdsfs',
            name: 'contact',
            type: 'person',
            parent: { _id: 'hc', parent: { _id: 'district' } },
          }
        ];

        const hydratedContacts = [
          {
            _id: 'new_clinic',
            name: 'clinic',
            type: 'clinic',
            parent: {
              _id: 'hc',
              name: 'hc',
              type: 'hc',
              muted: 4000,
              parent: {
                _id: 'district',
                name: 'district',
                type: 'district',
                muted: 1230,
              },
            },
          },
        ];

        lineageModelGenerator.docs.resolves(hydratedContacts);
        contactMutedService.getMutedDoc.returns(hydratedContacts[0].parent);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([[docs[0]]]);
        expect(contactMutedService.getMutedDoc.callCount).to.equal(1);
        expect(contactMutedService.getMutedDoc.args[0]).to.deep.equal([
          hydratedContacts[0],
          [hydratedContacts[0].parent, hydratedContacts[0].parent.parent],
        ]);

        const muteTime = new Date(now).toISOString();
        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_clinic',
            name: 'clinic',
            type: 'clinic',
            parent: { _id: 'hc', parent: { _id: 'district' } },
            muted: muteTime,
            muting_history: {
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: muteTime, report_id: undefined }],
              last_update: 'client_side',
            },
          },
          {
            _id: 'old_person',
            _rev: '12-fdsfs',
            name: 'contact',
            type: 'person',
            parent: { _id: 'hc', parent: { _id: 'district' } },
          },
        ]);
      });
    });

    describe('weird cases', () => {
      beforeEach(() => {
        contactMutedService.getMutedDoc.callsFake((contact, lineage) => {
          if (contact.muted) {
            return contact;
          }

          if (lineage) {
            return lineage.find(parent => parent.muted);
          }

          let parent = contact;
          while (parent) {
            if (parent.muted) {
              return parent;
            }
            parent = parent.parent;
          }
        });
      });

      it('should only unmute when both mute and unmute forms exist in the same batch', async () => {
        const now = 5000;
        clock.tick(now);
        const docs = [
          {
            _id: 'a_report',
            type: 'data_record',
            form: 'unmute',
            contact: { _id: 'contact_id' },
            fields: {
              patient_id: 'shortcode',
            }
          },
          {
            _id: 'b_report',
            type: 'data_record',
            form: 'mute',
            contact: { _id: 'contact_id' },
            fields: {
              patient_id: 'shortcode',
            }
          },
        ];

        const hydratedReport = {
          _id: 'a_report',
          type: 'data_record',
          form: 'unmute',
          fields: {
            patient_id: 'shortcode',
          },
          patient: {
            _id: 'patient',
            name: 'patient name',
            type: 'person',
            muted: 6000,
            patient_id: 'shortcode',
            parent: {
              _id: 'parent',
              name: 'parent',
            }
          },
        };
        const minifiedPatient = {
          _id: 'patient',
          name: 'patient name',
          type: 'person',
          muted: 6000,
          patient_id: 'shortcode',
          parent: { _id: 'parent' },
        };
        lineageModelGenerator.docs.resolves([hydratedReport]);
        placeHierarchyService.getDescendants.resolves([]);
        dbService.get.withArgs('patient').resolves(minifiedPatient);
        contactMutedService.getMuted.returns(true);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);

        expect(lineageModelGenerator.docs.args[0]).to.deep.equal([[docs[0]]]);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(dbService.get.args[0]).to.deep.equal(['patient']);
        expect(contactMutedService.getMuted.callCount).to.equal(1);
        expect(contactMutedService.getMuted.args[0]).to.deep.equal([hydratedReport.patient]);

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'a_report',
            type: 'data_record',
            form: 'unmute',
            contact: { _id: 'contact_id' },
            fields: {
              patient_id: 'shortcode',
            },
            client_side_transitions: { muting: true },
          },
          {
            _id: 'b_report',
            type: 'data_record',
            form: 'mute',
            contact: { _id: 'contact_id' },
            fields: {
              patient_id: 'shortcode',
            }
          },
          {
            _id: 'patient',
            name: 'patient name',
            type: 'person',
            parent: { _id: 'parent' },
            patient_id: 'shortcode',
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 6000 },
              client_side: [{
                muted: false,
                date: new Date(now).toISOString(),
                report_id: 'a_report'
              }]
            },
          }
        ]);
      });

      it('create new place + new person in place + mute place', async () => {
        const date = 123456;
        clock.tick(date);
        const docs = [
          {
            _id: 'new_place',
            type: 'clinic',
            name: 'clinic',
            parent: { _id: 'parent' },
          },
          {
            _id: 'new_person',
            type: 'person',
            name: 'person',
            parent: { _id: 'new_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { place_id: 'new_place' },
          },
        ];

        const hydratedDocs = [
          {
            _id: 'new_place',
            type: 'clinic',
            name: 'clinic',
            parent: { _id: 'parent', type: 'hc' },
          },
          {
            _id: 'new_person',
            type: 'person',
            name: 'person',
            parent: {
              _id: 'new_place',
              type: 'clinic',
              name: 'clinic',
              parent: { _id: 'parent', type: 'hc' },
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { place_id: 'new_place' },
            place: {
              _id: 'new_place',
              type: 'clinic',
              name: 'clinic',
              parent: { _id: 'parent', type: 'hc' },
            },
          }
        ];

        lineageModelGenerator.docs.resolves(hydratedDocs);
        placeHierarchyService.getDescendants.resolves([]);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(0);

        const mutingDate = new Date(date).toISOString();

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_place',
            type: 'clinic',
            name: 'clinic',
            parent: { _id: 'parent' },
            muted: mutingDate,
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'new_person',
            type: 'person',
            name: 'person',
            parent: { _id: 'new_place', parent: { _id: 'parent' } },
            muted: mutingDate,
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { place_id: 'new_place' },
            client_side_transitions: { muting: true },
          },
        ]);
      });

      it('create new place + new persons in place + mute place', async () => {
        const date = 123456;
        clock.tick(date);
        const docs = [
          {
            _id: 'new_place',
            type: 'clinic',
            name: 'clinic',
            parent: { _id: 'parent' },
          },
          {
            _id: 'new_person1',
            type: 'person',
            name: 'person',
            parent: { _id: 'new_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_person2',
            type: 'person',
            name: 'person',
            parent: { _id: 'new_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { place_id: 'new_place' },
          },
        ];

        const hydratedDocs = [
          {
            _id: 'new_place',
            type: 'clinic',
            name: 'clinic',
            parent: { _id: 'parent', type: 'hc' },
          },
          {
            _id: 'new_person1',
            type: 'person',
            name: 'person',
            parent: {
              _id: 'new_place',
              type: 'clinic',
              name: 'clinic',
              parent: { _id: 'parent', type: 'hc' },
            },
          },
          {
            _id: 'new_person2',
            type: 'person',
            name: 'person',
            parent: {
              _id: 'new_place',
              type: 'clinic',
              name: 'clinic',
              parent: { _id: 'parent', type: 'hc' },
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { place_id: 'new_place' },
            place: {
              _id: 'new_place',
              type: 'clinic',
              name: 'clinic',
              parent: { _id: 'parent', type: 'hc' },
            },
          }
        ];

        lineageModelGenerator.docs.resolves(hydratedDocs);
        placeHierarchyService.getDescendants.resolves([]);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(0);

        const mutingDate = new Date(date).toISOString();

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_place',
            type: 'clinic',
            name: 'clinic',
            parent: { _id: 'parent' },
            muted: mutingDate,
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'new_person1',
            type: 'person',
            name: 'person',
            parent: { _id: 'new_place', parent: { _id: 'parent' } },
            muted: mutingDate,
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'new_person2',
            type: 'person',
            name: 'person',
            parent: { _id: 'new_place', parent: { _id: 'parent' } },
            muted: mutingDate,
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { place_id: 'new_place' },
            client_side_transitions: { muting: true },
          },
        ]);
      });

      it('should create new place, new person in place, new person in other place, and mute place', async () => {
        const date = 123456;
        clock.tick(date);
        const docs = [
          {
            _id: 'new_place',
            type: 'clinic',
            name: 'clinic',
            parent: { _id: 'parent' },
          },
          {
            _id: 'new_person1',
            type: 'person',
            name: 'person',
            parent: { _id: 'new_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_person2',
            type: 'person',
            name: 'person',
            parent: { _id: 'old_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { place_id: 'new_place' },
          },
        ];

        const hydratedDocs = [
          {
            _id: 'new_place',
            type: 'clinic',
            name: 'clinic',
            parent: { _id: 'parent', type: 'hc' },
          },
          {
            _id: 'new_person1',
            type: 'person',
            name: 'person',
            parent: {
              _id: 'new_place',
              type: 'clinic',
              name: 'clinic',
              parent: { _id: 'parent', type: 'hc' },
            },
          },
          {
            _id: 'new_person2',
            type: 'person',
            name: 'person',
            parent: {
              _id: 'old_place',
              type: 'clinic',
              name: 'clinic',
              parent: { _id: 'parent', type: 'hc' },
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { place_id: 'new_place' },
            place: {
              _id: 'new_place',
              type: 'clinic',
              name: 'clinic',
              parent: { _id: 'parent', type: 'hc' },
            },
          }
        ];

        lineageModelGenerator.docs.resolves(hydratedDocs);
        placeHierarchyService.getDescendants.resolves([]);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(0);

        const mutingDate = new Date(date).toISOString();

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_place',
            type: 'clinic',
            name: 'clinic',
            parent: { _id: 'parent' },
            muted: mutingDate,
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'new_person1',
            type: 'person',
            name: 'person',
            parent: { _id: 'new_place', parent: { _id: 'parent' } },
            muted: mutingDate,
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'new_person2',
            type: 'person',
            name: 'person',
            parent: { _id: 'old_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { place_id: 'new_place' },
            client_side_transitions: { muting: true },
          },
        ]);
      });

      it('should create new person and mute person\'s parent', async () => {
        const date = 123456;
        clock.tick(date);
        const docs = [
          {
            _id: 'new_person',
            type: 'person',
            name: 'person',
            parent: { _id: 'old_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { place_id: 'old_place' },
          },
        ];

        const hydratedDocs = [
          {
            _id: 'new_person',
            type: 'person',
            name: 'person',
            parent: {
              _id: 'old_place',
              type: 'clinic',
              name: 'clinic',
              parent: { _id: 'parent', type: 'hc' },
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { place_id: 'old_place' },
            place: {
              _id: 'old_place',
              type: 'clinic',
              name: 'clinic',
              parent: { _id: 'parent', type: 'hc' },
            },
          }
        ];

        lineageModelGenerator.docs.resolves(hydratedDocs);
        contactMutedService.getMuted.returns(false);
        placeHierarchyService.getDescendants.resolves([
          { id: 'old_person1', doc: { _id: 'old_person1', parent: { _id: 'old_place' }, type: 'person' } },
          { id: 'old_person2', doc: { _id: 'old_person2', parent: { _id: 'old_place' }, type: 'person' } },
        ]);
        dbService.get.withArgs('old_place').resolves({
          _id: 'old_place',
          type: 'clinic',
          name: 'clinic',
          parent: { _id: 'parent' },
        });

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);

        const mutingDate = new Date(date).toISOString();

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_person',
            type: 'person',
            name: 'person',
            parent: { _id: 'old_place', parent: { _id: 'parent' } },
            muted: mutingDate,
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { place_id: 'old_place' },
            client_side_transitions: { muting: true },
          },
          {
            _id: 'old_person1',
            parent: { _id: 'old_place' },
            type: 'person',
            muted: mutingDate,
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'old_person2',
            parent: { _id: 'old_place' },
            type: 'person',
            muted: mutingDate,
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'old_place',
            type: 'clinic',
            name: 'clinic',
            parent: { _id: 'parent' },
            muted: mutingDate,
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'new_report' }],
            },
          }
        ]);
      });

      it('create new person and mute person', async () => {
        const date = 123456;
        clock.tick(date);
        const docs = [
          {
            _id: 'new_person',
            type: 'person',
            name: 'person',
            parent: { _id: 'old_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { patient_uuid: 'new_person' },
          },
        ];

        const hydratedDocs = [
          {
            _id: 'new_person',
            type: 'person',
            name: 'person',
            parent: {
              _id: 'old_place',
              type: 'clinic',
              name: 'clinic',
              parent: { _id: 'parent', type: 'hc' },
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { place_id: 'old_place' },
            patient: {
              _id: 'new_person',
              type: 'person',
              name: 'person',
              parent: {
                _id: 'old_place',
                type: 'clinic',
                name: 'clinic',
                parent: { _id: 'parent', type: 'hc' },
              },
            },
          }
        ];

        lineageModelGenerator.docs.resolves(hydratedDocs);
        contactMutedService.getMuted.returns(false);
        placeHierarchyService.getDescendants.resolves([]);

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(0);

        const mutingDate = new Date(date).toISOString();

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_person',
            type: 'person',
            name: 'person',
            parent: { _id: 'old_place', parent: { _id: 'parent' } },
            muted: mutingDate,
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: true, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'mute',
            fields: { patient_uuid: 'new_person' },
            client_side_transitions: { muting: true },
          },
        ]);
      });

      it('create new person in muted place and unmute person', async () => {
        const date = 123456;
        clock.tick(date);

        const docs = [
          {
            _id: 'new_person',
            type: 'person',
            parent: { _id: 'old_place', parent: { _id: 'district' } },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { patient_uuid: 'new_person' },
          },
        ];

        const hydratedDocs = [
          {
            _id: 'new_person',
            type: 'person',
            name: 'person',
            parent: {
              _id: 'old_place',
              type: 'clinic',
              muted: 100,
              parent: {
                _id: 'district',
                type: 'district',
                muted: 100,
              },
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { patient_uuid: 'new_person' },
            patient: {
              _id: 'new_person',
              type: 'person',
              name: 'person',
              parent: {
                _id: 'old_place',
                type: 'clinic',
                muted: 100,
                parent: {
                  _id: 'district',
                  type: 'district',
                  muted: 100,
                },
              },
            },
          }
        ];

        lineageModelGenerator.docs.resolves(hydratedDocs);
        contactMutedService.getMuted.returns(true);
        placeHierarchyService.getDescendants.resolves([
          { id: 'old_place', doc: { _id: 'old_place', type: 'clinic', muted: 100, parent: { _id: 'district' } } },
          { id: 'contact1', doc: { _id: 'contact1', type: 'person', muted: 100, parent: { _id: 'district' } } },
          { id: 'old_place2', doc: { _id: 'old_place2', type: 'clinic', muted: 100, parent: { _id: 'district' } } },
        ]);
        dbService.get.withArgs('district').resolves({
          _id: 'district',
          type: 'district',
          muted: 100,
        });

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);

        const mutingDate = new Date(date).toISOString();
        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_person',
            type: 'person',
            parent: { _id: 'old_place', parent: { _id: 'district' } },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { patient_uuid: 'new_person' },
            client_side_transitions: { muting: true },
          },
          {
            _id: 'old_place',
            type: 'clinic',
            parent: { _id: 'district' },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 100 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'contact1',
            type: 'person',
            parent: { _id: 'district' },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 100 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'old_place2',
            type: 'clinic',
            parent: { _id: 'district' },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 100 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'district',
            type: 'district',
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 100 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          }
        ]);
      });

      it('should create new person in muted place and unmute place', async () => {
        const date = 123456;
        clock.tick(date);

        const docs = [
          {
            _id: 'new_person',
            type: 'person',
            parent: { _id: 'old_place', parent: { _id: 'district' } },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { place_id: 'old_place' },
          },
        ];

        const hydratedDocs = [
          {
            _id: 'new_person',
            type: 'person',
            name: 'person',
            parent: {
              _id: 'old_place',
              type: 'clinic',
              muted: 100,
              parent: {
                _id: 'district',
                type: 'district',
                muted: 100,
              },
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { patient_uuid: 'new_person' },
            patient: {
              _id: 'new_person',
              type: 'person',
              name: 'person',
              parent: {
                _id: 'old_place',
                type: 'clinic',
                muted: 100,
                parent: {
                  _id: 'district',
                  type: 'district',
                  muted: 100,
                },
              },
            },
          }
        ];

        lineageModelGenerator.docs.resolves(hydratedDocs);
        contactMutedService.getMuted.returns(true);
        placeHierarchyService.getDescendants.resolves([
          { id: 'old_place', doc: { _id: 'old_place', type: 'clinic', muted: 100, parent: { _id: 'district' } } },
          { id: 'contact1', doc: { _id: 'contact1', type: 'person', muted: 100, parent: { _id: 'district' } } },
          { id: 'old_place2', doc: { _id: 'old_place2', type: 'clinic', muted: 100, parent: { _id: 'district' } } },
        ]);
        dbService.get.withArgs('district').resolves({
          _id: 'district',
          type: 'district',
          muted: 100,
        });

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);

        const mutingDate = new Date(date).toISOString();
        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_person',
            type: 'person',
            parent: { _id: 'old_place', parent: { _id: 'district' } },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { place_id: 'old_place' },
            client_side_transitions: { muting: true },
          },
          {
            _id: 'old_place',
            type: 'clinic',
            parent: { _id: 'district' },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 100 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'contact1',
            type: 'person',
            parent: { _id: 'district' },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 100 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'old_place2',
            type: 'clinic',
            parent: { _id: 'district' },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 100 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'district',
            type: 'district',
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 100 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          }
        ]);
      });

      it('create new place + new person under muted place and unmute new person', async () => {
        const date = 698841265;
        clock.tick(date);
        const mutingDate = new Date(date).toISOString();

        const docs = [
          {
            _id: 'new_person',
            type: 'person',
            parent: { _id: 'new_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_place',
            type: 'clinic',
            parent: { _id: 'parent' },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { patient_uuid: 'new_person' },
          },
        ];

        const hydratedDocs = [
          {
            _id: 'new_person',
            type: 'person',
            parent: {
              _id: 'new_place',
              type: 'clinic',
              parent: { _id: 'parent', muted: 400, type: 'district' },
            },
          },
          {
            _id: 'new_place',
            type: 'clinic',
            parent: { _id: 'parent', muted: 400, type: 'district' },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { patient_uuid: 'new_person' },
            patient: {
              _id: 'new_person',
              type: 'person',
              parent: {
                _id: 'new_place',
                type: 'clinic',
                parent: { _id: 'parent', muted: 400, type: 'district' },
              },
            },
          },
        ];

        lineageModelGenerator.docs.resolves(hydratedDocs);
        contactMutedService.getMuted.returns(true);
        placeHierarchyService.getDescendants.resolves([
          { id: 'old_contact', doc: { _id: 'old_contact', type: 'person', muted: 400, parent: { _id: 'parent' } } },
        ]);
        dbService.get.withArgs('parent').resolves({
          _id: 'parent',
          type: 'district',
          muted: 400,
        });

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_person',
            type: 'person',
            parent: { _id: 'new_place', parent: { _id: 'parent' } },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'new_place',
            type: 'clinic',
            parent: { _id: 'parent' },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { patient_uuid: 'new_person' },
            client_side_transitions: { muting: true },
          },
          {
            _id: 'old_contact',
            type: 'person',
            parent: { _id: 'parent' },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 400 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'parent',
            type: 'district',
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 400 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
        ]);

      });

      it('create new place + new person under muted place and unmute old place', async () => {
        const date = 698841265;
        clock.tick(date);
        const mutingDate = new Date(date).toISOString();

        const docs = [
          {
            _id: 'new_person',
            type: 'person',
            parent: { _id: 'new_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_place',
            type: 'clinic',
            parent: { _id: 'parent' },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { place_id: 'parent' },
          },
        ];

        const hydratedDocs = [
          {
            _id: 'new_person',
            type: 'person',
            parent: {
              _id: 'new_place',
              type: 'clinic',
              parent: { _id: 'parent', muted: 400, type: 'district' },
            },
          },
          {
            _id: 'new_place',
            type: 'clinic',
            parent: { _id: 'parent', muted: 400, type: 'district' },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { place_id: 'parent' },
            place: { _id: 'parent', muted: 400, type: 'district' },
          },
        ];

        lineageModelGenerator.docs.resolves(hydratedDocs);
        contactMutedService.getMuted.returns(true);
        placeHierarchyService.getDescendants.resolves([
          { id: 'old_contact', doc: { _id: 'old_contact', type: 'person', muted: 400, parent: { _id: 'parent' } } },
        ]);
        dbService.get.withArgs('parent').resolves({
          _id: 'parent',
          type: 'district',
          muted: 400,
        });

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_person',
            type: 'person',
            parent: { _id: 'new_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_place',
            type: 'clinic',
            parent: { _id: 'parent' },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { place_id: 'parent' },
            client_side_transitions: { muting: true },
          },
          {
            _id: 'old_contact',
            type: 'person',
            parent: { _id: 'parent' },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 400 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'parent',
            type: 'district',
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 400 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
        ]);
      });

      it('create two new persons under muted place and unmute one of them', async () => {
        const date = 698841265;
        clock.tick(date);
        const mutingDate = new Date(date).toISOString();

        const docs = [
          {
            _id: 'new_person1',
            type: 'person',
            parent: { _id: 'old_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_person2',
            type: 'person',
            parent: { _id: 'old_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { patient_uuid: 'new_person2' },
          },
        ];

        const hydratedDocs = [
          {
            _id: 'new_person1',
            type: 'person',
            parent: {
              _id: 'old_place',
              muted: 500,
              parent: {
                _id: 'parent'
              },
            },
          },
          {
            _id: 'new_person2',
            type: 'person',
            parent: {
              _id: 'old_place',
              muted: 500,
              parent: {
                _id: 'parent'
              },
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { patient_uuid: 'new_person2' },
            patient: {
              _id: 'new_person2',
              type: 'person',
              parent: {
                _id: 'old_place',
                muted: 500,
                parent: {
                  _id: 'parent'
                },
              },
            },
          },
        ];

        lineageModelGenerator.docs.resolves(hydratedDocs);
        contactMutedService.getMuted.returns(true);
        placeHierarchyService.getDescendants.resolves([
          { id: 'old_contact', doc: { _id: 'old_contact', type: 'person', muted: 400, parent: { _id: 'old_place' } } }
        ]);
        dbService.get.withArgs('old_place').resolves({
          _id: 'old_place',
          muted: 500,
          parent: { _id: 'parent' },
        });

        const updatedDocs = await transition.run(docs);

        expect(lineageModelGenerator.docs.callCount).to.equal(1);
        expect(placeHierarchyService.getDescendants.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);

        expect(updatedDocs).to.deep.equal([
          {
            _id: 'new_person1',
            type: 'person',
            parent: { _id: 'old_place', parent: { _id: 'parent' } },
          },
          {
            _id: 'new_person2',
            type: 'person',
            parent: { _id: 'old_place', parent: { _id: 'parent' } },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: false, date: undefined },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'new_report',
            type: 'data_record',
            form: 'unmute',
            fields: { patient_uuid: 'new_person2' },
            client_side_transitions: { muting: true },
          },
          {
            _id: 'old_contact',
            type: 'person',
            parent: { _id: 'old_place' },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 400 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
          {
            _id: 'old_place',
            parent: { _id: 'parent' },
            muting_history: {
              last_update: 'client_side',
              server_side: { muted: true, date: 500 },
              client_side: [{ muted: false, date: mutingDate, report_id: 'new_report' }],
            },
          },
        ]);
      });
    });
  });
});
