const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const deliveryFactory = require('@factories/cht/reports/delivery');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const pregnancyVisitFactory = require('@factories/cht/reports/pregnancy-visit');
const immunizationFactory = require('@factories/cht/reports/inmunization');
const { faker } = require('@faker-js/faker');
const { CONTACT_TYPES } = require('@medic/constants');

// Fixed collection of real-world data
const FIRST_NAMES = [
  'Abigail', 'Amanda', 'Ana', 'Andrew', 'Beatrice',
  'Catherine', 'Charity', 'Dana', 'Daniel', 'David',
  'Elias', 'Esther', 'Faith', 'Fatima', 'Florence',
  'Gina', 'Grace', 'Hawa', 'Helen', 'Hope',
  'Isabelle', 'Ivy', 'James', 'Jessica', 'John',
  'Joseph', 'Joy', 'Leah', 'Lydia', 'Margaret',
  'Martha', 'Mary', 'Mercy', 'Miriam', 'Moses',
  'Naomi', 'Patricia', 'Peter', 'Philip', 'Priscilla',
  'Rachel', 'Rose', 'Ruth', 'Samuel', 'Sara',
  'Simon', 'Tania', 'Timmy'
];

const LAST_NAMES = [
  'Akinyi', 'Allen', 'Barasa', 'Bass',
  'Chebet', 'Dearborn', 'Flair', 'Gorman',
  'Hamburg', 'Ivanas', 'James', 'Kamau',
  'Kariuki', 'Kimani', 'Kipchoge', 'Moore',
  'Muthoni', 'Mutua', 'Mwangi', 'Ndungu',
  'Njoroge', 'Nyambura', 'Ochieng', 'Oduya',
  'Onyango', 'Otieno', 'Taylor', 'Waithera',
  'Wambui', 'Wanjiku'
];

const PATIENT_IDS = Array.from({ length: 1000 }, (_, i) => 123456 + i);
const PHONE_NUMBERS = Array.from({ length: 1000 }, (_, i) => `+25641434${i.toString().padStart(4, '0')}`);

const element = (array) => array[Math.floor(Math.random() * array.length)];

const calculateDateOfBirth = (age) => {
  const today = new Date();
  const birthYear = today.getFullYear() - age;
  const birthMonth = today.getMonth() + 1;
  const birthDay = today.getDate();
  return `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
};
const KIDS_AGES = Array.from({ length: 10 }, (_, i) => i + 1);
const ADULTS_AGES = Array.from({ length: 20 }, (_, i) => i + 25);
const DATE_OF_BIRTHS_KIDS = KIDS_AGES.map(calculateDateOfBirth);
const DATE_OF_BIRTHS_ADULTS = ADULTS_AGES.map(calculateDateOfBirth);

const calculateLastMenstrualPeriod = (date) => {
  const PREGNANCY_DAYS = 252;
  date.setDate(date.getDate() - PREGNANCY_DAYS);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

const getReportContext = (patient, submitter) => {
  const daysAgo = faker.number.int({ min: 1, max: 10 });
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - daysAgo);
  const lastMestrualPeriod = calculateLastMenstrualPeriod(new Date());
  const context = {
    fields: {
      patient_id: patient._id,
      patient_uuid: patient._id,
      patient_name: patient.name,
      visited_contact_uuid: patient.parent._id,
      visited_date: currentDate,
      lmp_date_8601: lastMestrualPeriod,
    },
  };
  if (submitter) {
    context.contact = {
      _id: submitter.contact._id,
      parent: submitter.contact.parent || patient.parent,
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

const createClinic = (healthCenter) => {
  const firstName = element(FIRST_NAMES);
  const lastName = element(LAST_NAMES);
  const personName = `${firstName} ${lastName}`;

  const primaryContact = personFactory.build({
    name: personName,
    phone: element(PHONE_NUMBERS),
    patient_id: element(PATIENT_IDS),
  });

  const clinic = placeFactory.place().build({
    type: 'clinic',
    parent: { _id: healthCenter._id, parent: healthCenter.parent },
    name: `${personName} Family`,
    last_name: lastName,
    contact: primaryContact
  });

  primaryContact.parent = { _id: clinic._id, parent: clinic.parent };

  return { clinic, primaryContact };
};

const createAdditionalPersons = (nbrPersons, clinic, dateOfBirthList) => {
  return Array
    .from({ length: nbrPersons })
    .map(() => {
      const additionalPhoneNumber = element(PHONE_NUMBERS);
      const name = element(FIRST_NAMES);
      const date_of_birth = element(dateOfBirthList);
      return personFactory.build({
        parent: { _id: clinic._id, parent: clinic.parent },
        name: `${name} ${clinic.last_name}`,
        patient_id: element(PATIENT_IDS),
        phone: additionalPhoneNumber,
        date_of_birth: date_of_birth,
      });
    });
};

const createAdditionalKid = (nbrPersons, clinic) => {
  return createAdditionalPersons(
    nbrPersons,
    clinic,
    DATE_OF_BIRTHS_KIDS
  );
};

const createAdditionalWoman = (nbrPersons, clinic) => {
  return createAdditionalPersons(
    nbrPersons,
    clinic,
    DATE_OF_BIRTHS_ADULTS,
  );
};

const createReportsForWoman = (person, user) => {
  return [
    pregnancyFactory.build(getReportContext(person, user)),
    pregnancyVisitFactory.build(getReportContext(person, user)),
  ];
};

const createReportsForKid = (person, user) => {
  return [
    immunizationFactory.build({ contact: user, patient: person })
  ];
};

const createDataWithRealNames = ({ healthCenter, user, nbrClinics = 10, nbrPersons = 10 }) => {
  const clinicsData = Array
    .from({ length: nbrClinics })
    .map(() => {
      const { clinic, primaryContact } = createClinic(healthCenter);

      const kids = createAdditionalKid( Math.floor(nbrPersons / 2), clinic);
      const adults = createAdditionalWoman( Math.floor(nbrPersons / 2), clinic);
      adults.unshift(primaryContact);

      return { clinic, kids, adults };
    });

  const allPersons = clinicsData.flatMap(data => ([...data.kids, ...data.adults]));
  const clinicList = clinicsData.map(data => data.clinic);

  const reportsForKids = clinicsData
    .flatMap(data => data.kids)
    .flatMap(person => createReportsForKid(person, user));
  const reportsForWoman = clinicsData
    .flatMap(data => data.adults)
    .flatMap(person => createReportsForWoman(person, user));

  return {
    clinics: clinicList,
    reports: [...reportsForKids, ...reportsForWoman],
    persons: [...allPersons]
  };
};

const createData = ({ healthCenter, user, nbrClinics, nbrPersons, useRealNames = false }) => {
  if (useRealNames) {
    return createDataWithRealNames({ healthCenter, user, nbrClinics, nbrPersons });
  }
  return createDataWithFixedData({ healthCenter, user, nbrClinics, nbrPersons });
};

const createHierarchy = ({ name, user = false, nbrClinics = 50, nbrPersons = 10, useRealNames = false }) => {
  const hierarchy = placeFactory.generateHierarchy();
  const healthCenter = hierarchy.get(CONTACT_TYPES.HEALTH_CENTER);
  healthCenter.name = `${name}'s Area`;
  const branch = hierarchy.get('district_hospital');
  branch.name = 'Kiambu Branch';
  const branchContact = {
    _id: 'fixture:user:user2',
    name: 'Manager Ann',
    phone: '+123456789'
  };
  branch.contact = branchContact;
  const contact = {
    _id: 'fixture:user:user1',
    name: name,
    phone: '+12068881234'
  };
  healthCenter.contact = contact;

  user = user && userFactory.build({ place: healthCenter._id, roles: ['chw'], contact: contact });

  const places = [...hierarchy.values()].map(place => {
    if (place.type === 'clinic') {
      place.name = `${name} ${place.type}`;
    }
    return place;
  });

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
  PATIENT_IDS,
};
