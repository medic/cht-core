const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const deliveryFactory = require('@factories/cht/reports/delivery');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const pregnancyVisitFactory = require('@factories/cht/reports/pregnancy-visit');

// Fixed collection of real-world data
const FIRST_NAMES = ['Amanda', 'Beatrice', 'Dana', 'Fatima', 'Gina', 'Helen', 'Isabelle', 'Jessica', 'Ivy', 'Sara'];
const LAST_NAMES = ['Allen', 'Bass', 'Dearborn', 'Flair', 'Gorman', 'Hamburg', 'Ivanas', 'James', 'Moore', 'Taylor'];
const PHONE_NUMBERS = [
  '+256414345783', '+256414345784', '+256414345785',
  '+256414345786', '+256414345787', '+256414345788',
  '+256414345789', '+256414345790', '+256414345791',
  '+256414345792'
];
const PATIENT_IDS = [65421, 65422, 65423, 65424, 65425, 65426, 65427, 65428, 65429, 65430];

const getReportContext = (patient, submitter) => {
  const context = {
    fields: {
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

const createDataWithFixedData = ({ healthCenter, user, nbrClinics = 10, nbrPersons = 10 }) => {
  const clinics = Array
    .from({ length: nbrClinics })
    .map((_, idx) => placeFactory.place().build({
      type: 'clinic',
      parent: { _id: healthCenter._id, parent: healthCenter.parent },
      name: `clinic_${idx}`,
    }));

  const persons = [
    ...clinics.map(clinic => Array.from({ length: nbrPersons }).map((_, idx) => personFactory.build({
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

const createClinic = (index, healthCenter) => {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[index % LAST_NAMES.length];
  const personName = `${firstName} ${lastName}`;
  const personPhoneNumber = PHONE_NUMBERS[index % PHONE_NUMBERS.length];

  const primaryContact = personFactory.build({
    name: personName,
    phone: personPhoneNumber
  });

  const clinic = placeFactory.place().build({
    type: 'clinic',
    parent: { _id: healthCenter._id, parent: healthCenter.parent },
    name: `${personName} Family`,
    contact: primaryContact
  });

  primaryContact.parent = { _id: clinic._id, parent: clinic.parent };

  return { clinic, primaryContact };
};

const createAdditionalPersons = (nbrPersons, clinic) => {
  return Array.from({ length: nbrPersons - 1 }).map((_, i) => {
    const additionalPersonName = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`;
    const additionalPhoneNumber = PHONE_NUMBERS[i % PHONE_NUMBERS.length];
    return personFactory.build({
      parent: { _id: clinic._id, parent: clinic.parent },
      name: additionalPersonName,
      patient_id: PATIENT_IDS[i % PATIENT_IDS.length],
      phone: additionalPhoneNumber
    });
  });
};

const createReportsForPerson = (person, user) => {
  return [
    deliveryFactory.build(getReportContext(person, user)),
    pregnancyFactory.build(getReportContext(person, user)),
    pregnancyVisitFactory.build(getReportContext(person, user))
  ];
};

const createDataWithRealNames = ({ healthCenter, user, nbrClinics = 10, nbrPersons = 10 }) => {
  const clinicsData = Array.from({ length: nbrClinics }).map((_, index) => {
    const { clinic, primaryContact } = createClinic(index, healthCenter);

    const additionalPersons = createAdditionalPersons(nbrPersons, clinic);

    const allPersons = [primaryContact, ...additionalPersons];

    return { clinic, persons: allPersons };
  });

  const allPersons = clinicsData.flatMap(data => data.persons);
  const clinicList = clinicsData.map(data => data.clinic);

  const reports = allPersons.flatMap(person => createReportsForPerson(person, user));

  return { clinics: clinicList, reports, persons: allPersons };
};

const createData = ({ healthCenter, user, nbrClinics, nbrPersons, useRealNames = false }) => {
  const createDataFunc = useRealNames ? createDataWithRealNames : createDataWithFixedData;
  return createDataFunc({ healthCenter, user, nbrClinics, nbrPersons });
};

const createHierarchy = ({ name, user = false, nbrClinics = 50, nbrPersons = 10, useRealNames = false }) => {
  const hierarchy = placeFactory.generateHierarchy();
  const healthCenter = hierarchy.get('health_center');
  user = user && userFactory.build({ place: healthCenter._id, roles: ['chw'] });

  const places = [...hierarchy.values()].map(place => {
    place.name = `${name} ${place.type}`;
    return place;
  });

  healthCenter.name = `${name}'s Area`;
  const { clinics, reports, persons } = createData({ healthCenter, nbrClinics, nbrPersons, user, useRealNames });

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
