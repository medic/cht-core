const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const deliveryFactory = require('@factories/cht/reports/delivery');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const pregnancyVisitFactory = require('@factories/cht/reports/pregnancy-visit');
const Faker = require('@faker-js/faker');
const phoneNumber = '+256414345783';

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
  // Create clinics with a primary contact and a matching name
  const personPhoneNumber = phoneNumber;

  const clinics = Array.from({ length: nbrClinics }).map(() => {
    // Generate the primary person's name
    const firstName = Faker.faker.person.firstName();
    const lastName = Faker.faker.person.lastName();
    const personName = `${firstName} ${lastName}`;
    //Create primary contact
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
      name: personName, // Primary person name matches clinic name
      phone: personPhoneNumber
    });

    return { clinic, primaryPerson };
  });

  // Create additional persons for each clinic (excluding the primary contact)
  const persons = clinics.flatMap(({ clinic }) => Array.from({ length: nbrPersons - 1 }).map(() => {
    const additionalPersonName = `${Faker.faker.person.firstName('female')} ${Faker.faker.person.lastName()}`;
    return personFactory.build({
      parent: { _id: clinic._id, parent: clinic.parent },
      name: additionalPersonName, // Additional persons get unique names
      patient_id: 65421,
      phone: personPhoneNumber
    });
  }));

  // Include the primary contacts in the persons list
  const allPersons = [
    ...clinics.map(({ primaryPerson }) => primaryPerson),
    ...persons
  ];

  // Generate reports for each person
  const reports = allPersons.flatMap(person => [
    deliveryFactory.build(getReportContext(person, user)),
    pregnancyFactory.build(getReportContext(person, user)),
    pregnancyVisitFactory.build(getReportContext(person, user)),
  ]);

  // Extract clinic objects separately
  const clinicList = clinics.map(({ clinic }) => clinic);

  return { clinics: clinicList, reports, persons: allPersons };
};

const createHierarchy = ({ name, user=false, nbrClinics=50, nbrPersons=10 }) => {
  const hierarchy = placeFactory.generateHierarchy();
  const healthCenter = hierarchy.get('health_center');
  const contact = {
    _id: 'fixture:user:user1',
    name: `${name}`,
    phone: '+12068881234'
  };
  user = user && userFactory.build({ place: healthCenter._id, roles: ['chw'], contact: contact});

  const places = [...hierarchy.values()].map(place => {
    place.name = `${name} ${place.type}`;
    return place;
  });

  healthCenter.name = `${name}'s Area`;
  healthCenter.contact = contact;
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
