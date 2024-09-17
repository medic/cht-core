const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const deliveryFactory = require('@factories/cht/reports/delivery');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const pregnancyVisitFactory = require('@factories/cht/reports/pregnancy-visit');

// Fixed collection of real-world data
const firstNames = ['Amanda', 'Beatrice', 'Dana', 'Fatima', 'Gina', 'Helen', 'Isabelle', 'Jessica', 'Ivy', 'Sara'];
const lastNames = ['Allen', 'Bass', 'Dearborn', 'Flair', 'Gorman', 'Hamburg', 'Ivanas', 'James', 'Moore', 'Taylor'];
const phoneNumbers = [
  '+256414345783', '+256414345784', '+256414345785',
  '+256414345786', '+256414345787', '+256414345788',
  '+256414345789', '+256414345790', '+256414345791',
  '+256414345792'
];

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
  const clinics = Array.from({ length: nbrClinics }).map((_, idx) => placeFactory.place().build({
    type: 'clinic',
    parent: { _id: healthCenter._id, parent: healthCenter.parent },
    name: `clinic_${idx}`
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

const createDataWithRealNames = ({ healthCenter, user, nbrClinics = 10, nbrPersons = 10 }) => {
  const clinics = Array.from({ length: nbrClinics }).map((_, index) => {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[index % lastNames.length];
    const personName = `${firstName} ${lastName}`;
    const personPhoneNumber = phoneNumbers[index % phoneNumbers.length];

    // Create primary contact
    const contact = {
      _id: 'fixture:primary:person',
      name: personName,
      phone: personPhoneNumber
    };

    // Create the clinic with the name based on the primary person's name
    const clinic = placeFactory.place().build({
      type: 'clinic',
      parent: { _id: healthCenter._id, parent: healthCenter.parent },
      name: `${personName} Family`,
      contact: contact
    });

    // Create the primary contact for this clinic
    const primaryPerson = personFactory.build({
      parent: { _id: clinic._id, parent: clinic.parent },
      name: personName,
      phone: personPhoneNumber
    });

    return { clinic, primaryPerson };
  });

  const persons = clinics.flatMap(({ clinic }) => Array.from({ length: nbrPersons - 1 }).map((_, index) => {
    const additionalPersonName = `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;
    const additionalPhoneNumber = phoneNumbers[index % phoneNumbers.length];
    return personFactory.build({
      parent: { _id: clinic._id, parent: clinic.parent },
      name: additionalPersonName,
      patient_id: 65421,
      phone: additionalPhoneNumber
    });
  }));

  const allPersons = [
    ...clinics.map(({ primaryPerson }) => primaryPerson),
    ...persons
  ];

  const reports = allPersons.flatMap(person => [
    deliveryFactory.build(getReportContext(person, user)),
    pregnancyFactory.build(getReportContext(person, user)),
    pregnancyVisitFactory.build(getReportContext(person, user)),
  ]);

  const clinicList = clinics.map(({ clinic }) => clinic);

  return { clinics: clinicList, reports, persons: allPersons };
};

const createData = ({ healthCenter, user, nbrClinics, nbrPersons, useRealNames = false }) => {
  const createDataFunc = useRealNames ? createDataWithRealNames : createDataWithFixedNames;
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
