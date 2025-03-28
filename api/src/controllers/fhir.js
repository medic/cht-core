const { Person, Qualifier } = require('@medic/cht-datasource');
const auth = require('../auth');
const ctx = require('../services/data-context');
const { isPatient, mapToFhirPatient } = require('@medic/cht-fhir');
const config = require('../config');

const checkUserPermissions = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx) || !auth.hasAllPermissions(userCtx, 'can_view_contacts')) {
    return Promise.reject({ code: 403, message: 'Insufficient privileges' });
  }
};
const getPerson = ctx.bind(Person.v1.get);

module.exports = {
  patient: {
    get: async (req, res) => {
      await checkUserPermissions(req);
      const patientId = req.params.id;
      const patient = await getPerson(Qualifier.byUuid(patientId));
      const fhirConfig = config.get('fhir');

      if (!fhirConfig || !fhirConfig?.patient?.filter || !fhirConfig?.patient?.fields) {
        return res.status(404).json({ message: 'FHIR mapping is not setup for patients' });
      }

      if (!patient) {
        return res.status(404).json({ message: 'Patient not found.' });
      }

      if (!isPatient(patient, fhirConfig.patient.filter)) {
        return res.status(404).json({ message: 'Contact is not a patient.' });
      }

      const fhirPatient = mapToFhirPatient(patient, fhirConfig.patient.fields);
      
      res.status(200).json(fhirPatient);
    },
  }
};
