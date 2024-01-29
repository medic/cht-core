const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const deliveryFactory = require('@factories/cht/reports/delivery');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const pregnancyVisitFactory = require('@factories/cht/reports/pregnancy-visit');
const getReportContext = (patient, submitter) => {
  const context = {
    fields:
      {
        patient_id: patient._id,
        patient_uuid: patient._id,
        patient_name: patient.name,
      },
  };
  if (submitter) {
    context.contact = {
      _id: submitter.contact._id,
      parent: submitter.contact.parent,
    };
  }
  return context;
};

const createData = ({ healthCenter, user, nbrClinics=10, nbrPersons=10 }) => {
  const clinics = Array
    .from({ length: nbrClinics })
    .map((_, idx) => placeFactory.place().build({
      type: 'clinic',
      parent: { _id: healthCenter._id, parent: healthCenter.parent },
      name: `clinic_${idx}`
    }));

  const persons = [
    ...clinics.map(clinic => Array
      .from({ length: nbrPersons })
      .map((_, idx) => personFactory.build({
        parent: { _id: clinic._id, parent: clinic.parent },
        name: `person_${clinic.name}_${idx}`,
      }))),
  ].flat();

  const reports = [
    ...persons.map(person => [
      deliveryFactory.build(getReportContext(person, user)),
      pregnancyFactory.build(getReportContext(person, user)),
      pregnancyVisitFactory.build(getReportContext(person, user)),
    ]),
  ].flat();

  return { clinics, reports, persons };
};

const createHierarchy = ({ name, user=false, nbrClinics=50, nbrPersons=10 }) => {
  const hierarchy = placeFactory.generateHierarchy();
  const healthCenter = hierarchy.get('health_center');
  user = user && userFactory.build({ place: healthCenter._id, roles: ['chw'] });

  const places = [...hierarchy.values()].map(place => {
    place.name = `${name} ${place.type}`;
    return place;
  });

  const { clinics, reports, persons } = createData({ healthCenter, nbrClinics, nbrPersons, user });

  return {
    user,
    healthCenter,
    places,
    clinics,
    persons,
    reports,
  };
};

module.exports = {
  createHierarchy,
  createData,
  ids: docs => docs.map(doc => doc._id || doc.id),
};
