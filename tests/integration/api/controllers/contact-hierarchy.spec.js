const utils = require('@utils');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const { expect } = require('chai');
const { USER_ROLES } = require('@medic/constants');

describe('Contact hierarchy API', () => {
  const endpoint = '/api/v1/contact';

  // Shared ancestors that should never be touched by a delete.
  const district = utils.deepFreeze(placeFactory.place().build({
    _id: 'ch-district',
    type: 'district_hospital',
    name: 'CH District',
    parent: '',
  }));
  const healthCenter = utils.deepFreeze(placeFactory.place().build({
    _id: 'ch-hc',
    type: 'health_center',
    name: 'CH Health Center',
    parent: { _id: district._id },
  }));

  const hcLineage = { _id: healthCenter._id, parent: { _id: district._id } };

  // Builds a minimal report whose subject is the given person. reports_by_subject
  // indexes fields.patient_uuid and fields.patient_id, which is how the delete
  // service finds a contact's reports.
  const reportForPatient = (patient) => ({
    _id: `report-${patient._id}`,
    type: 'data_record',
    form: 'immunization_visit',
    reported_date: new Date().toISOString(),
    contact: { _id: patient._id, parent: patient.parent },
    fields: {
      patient_uuid: patient._id,
      patient_id: patient.patient_id,
    },
  });

  // Scenario A: a clinic with two children and a report each, deleted recursively.
  const aClinic = utils.deepFreeze(placeFactory.place().build({
    _id: 'ch-a-clinic',
    type: 'clinic',
    name: 'A Clinic',
    parent: hcLineage,
    contact: { _id: 'ch-a-p1' },
  }));
  const aClinicLineage = { _id: aClinic._id, parent: hcLineage };
  const aPerson1 = utils.deepFreeze(personFactory.build({
    _id: 'ch-a-p1', patient_id: 'CH-A1', name: 'A Person 1', parent: aClinicLineage,
  }));
  const aPerson2 = utils.deepFreeze(personFactory.build({
    _id: 'ch-a-p2', patient_id: 'CH-A2', name: 'A Person 2', parent: aClinicLineage,
  }));
  const aReport1 = utils.deepFreeze(reportForPatient(aPerson1));
  const aReport2 = utils.deepFreeze(reportForPatient(aPerson2));

  // Scenario B: a leaf person who is the primary contact of a surviving clinic.
  const bClinic = utils.deepFreeze(placeFactory.place().build({
    _id: 'ch-b-clinic',
    type: 'clinic',
    name: 'B Clinic',
    parent: hcLineage,
    contact: { _id: 'ch-b-p1' },
  }));
  const bPerson1 = utils.deepFreeze(personFactory.build({
    _id: 'ch-b-p1', patient_id: 'CH-B1', name: 'B Person 1', parent: { _id: bClinic._id, parent: hcLineage },
  }));
  const bReport1 = utils.deepFreeze(reportForPatient(bPerson1));

  // Scenario C: a clinic with a child, used to assert the non-recursive guard.
  const cClinic = utils.deepFreeze(placeFactory.place().build({
    _id: 'ch-c-clinic',
    type: 'clinic',
    name: 'C Clinic',
    parent: hcLineage,
    contact: { _id: 'ch-c-p1' },
  }));
  const cPerson1 = utils.deepFreeze(personFactory.build({
    _id: 'ch-c-p1', patient_id: 'CH-C1', name: 'C Person 1', parent: { _id: cClinic._id, parent: hcLineage },
  }));

  const onlineNoPerms = utils.deepFreeze(userFactory.build({
    username: 'ch-online-no-perms',
    place: healthCenter._id,
    contact: { _id: 'fixture:user:ch-online-no-perms', name: 'CH Online No Perms' },
    roles: [USER_ROLES.ONLINE],
  }));
  // chw has can_delete_contacts but is offline, so it isolates the online-only check.
  const offlineWithPerms = utils.deepFreeze(userFactory.build({
    username: 'ch-offline',
    place: healthCenter._id,
    contact: { _id: 'fixture:user:ch-offline', name: 'CH Offline' },
    roles: ['chw'],
  }));

  const allDocs = [
    district, healthCenter,
    aClinic, aPerson1, aPerson2, aReport1, aReport2,
    bClinic, bPerson1, bReport1,
    cClinic, cPerson1,
  ];

  before(async () => {
    await utils.saveDocs(allDocs);
    await utils.createUsers([onlineNoPerms, offlineWithPerms]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([onlineNoPerms, offlineWithPerms]);
  });

  describe('DELETE /api/v1/contact/:uuid', () => {
    it('recursively deletes a contact, its descendants and their reports', async () => {
      const result = await utils.request({
        path: `${endpoint}/${aClinic._id}`,
        method: 'DELETE',
        qs: { recursive: true },
      });

      expect(result).to.deep.equal({ deleted_contacts: 3, deleted_reports: 2, errors: [] });

      await expect(utils.getDoc(aClinic._id)).to.be.rejected;
      await expect(utils.getDoc(aPerson1._id)).to.be.rejected;
      await expect(utils.getDoc(aPerson2._id)).to.be.rejected;
      await expect(utils.getDoc(aReport1._id)).to.be.rejected;
      await expect(utils.getDoc(aReport2._id)).to.be.rejected;

      // Ancestors are left untouched.
      const survivingHc = await utils.getDoc(healthCenter._id);
      expect(survivingHc._id).to.equal(healthCenter._id);
    });

    it('deletes a leaf contact and clears its parent\'s primary-contact reference', async () => {
      const result = await utils.request({
        path: `${endpoint}/${bPerson1._id}`,
        method: 'DELETE',
      });

      expect(result).to.deep.equal({ deleted_contacts: 1, deleted_reports: 1, errors: [] });

      await expect(utils.getDoc(bPerson1._id)).to.be.rejected;
      await expect(utils.getDoc(bReport1._id)).to.be.rejected;

      const survivingClinic = await utils.getDoc(bClinic._id);
      expect(survivingClinic.contact).to.be.null;
    });

    it('rejects a non-recursive delete of a contact that has descendants', async () => {
      await expect(utils.request({
        path: `${endpoint}/${cClinic._id}`,
        method: 'DELETE',
      })).to.be.rejectedWith(
        '400 - {"code":400,"error":"Contact has descendants. ' +
        'Pass recursive=true to delete the whole hierarchy."}'
      );

      // Nothing was deleted.
      const untouched = await utils.getDoc(cClinic._id);
      expect(untouched._id).to.equal(cClinic._id);
    });

    it('returns 404 for an unknown contact id', async () => {
      await expect(utils.request({
        path: `${endpoint}/ch-does-not-exist`,
        method: 'DELETE',
      })).to.be.rejectedWith(
        '404 - {"code":404,"error":"Contact with id \'ch-does-not-exist\' could not be found"}'
      );
    });

    it('returns 403 when the user lacks delete permissions', async () => {
      await expect(utils.request({
        path: `${endpoint}/${cPerson1._id}`,
        method: 'DELETE',
        auth: { username: onlineNoPerms.username, password: onlineNoPerms.password },
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('returns 403 for an offline user because the endpoint is online-only', async () => {
      await expect(utils.request({
        path: `${endpoint}/${cPerson1._id}`,
        method: 'DELETE',
        auth: { username: offlineWithPerms.username, password: offlineWithPerms.password },
      })).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });
  });
});
