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
const PRIMARY_CONTACT_FIRST_NAMES = [
  'Amanda', 'Beatrice', 'Dana', 'Fatima',
  'Gina', 'Helen', 'Isabelle', 'Jessica',
  'Ivy', 'Sara'
];
const ADDITIONAL_KID_FIRST_NAMES = ['John', 'Timmy', 'Elias'];
const ADDITIONAL_WOMAN_FIRST_NAMES = ['Hawa', 'Ana', 'Tania'];
const FAMILY_LAST_NAMES = [
  'Allen', 'Bass', 'Dearborn', 'Flair',
  'Gorman', 'Hamburg', 'Ivanas', 'James',
  'Moore', 'Taylor'
];
const PHONE_NUMBERS = [
  '+256414345783', '+256414345784', '+256414345785',
  '+256414345786', '+256414345787', '+256414345788',
  '+256414345789', '+256414345790', '+256414345791',
  '+256414345792'
];
const PATIENT_IDS = [65421, 65422, 65423, 65424, 65425, 65426, 65427, 65428, 65429, 65430];

const calculateDateOfBirth = (age) => {
  const today = new Date();
  const birthYear = today.getFullYear() - age;
  const birthMonth = today.getMonth() + 1;
  const birthDay = today.getDate();
  return `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
};
const KIDS_AGES = [2, 7, 10];
const ADULTS_AGES = [25, 35];
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
  const firstName = PRIMARY_CONTACT_FIRST_NAMES[index % PRIMARY_CONTACT_FIRST_NAMES.length];
  const lastName = FAMILY_LAST_NAMES[index % FAMILY_LAST_NAMES.length];
  const personName = `${firstName} ${lastName}`;
  const personPhoneNumber = PHONE_NUMBERS[index % PHONE_NUMBERS.length];

  const primaryContact = personFactory.build({
    name: personName,
    phone: personPhoneNumber,
    patient_id: PATIENT_IDS[0],
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

const createAdditionalPersons = (nbrPersons, clinic, nameList, dateOfBirthList) => {
  return Array
    .from({ length: nbrPersons })
    .map((_, i) => {
      const additionalPhoneNumber = PHONE_NUMBERS[i % PHONE_NUMBERS.length];
      const name = nameList[i % nameList.length];
      const date_of_birth = dateOfBirthList[i % dateOfBirthList.length];
      return personFactory.build({
        parent: { _id: clinic._id, parent: clinic.parent },
        name: `${name} ${clinic.last_name}`,
        patient_id: PATIENT_IDS[i % PATIENT_IDS.length],
        phone: additionalPhoneNumber,
        date_of_birth: date_of_birth,
      });
    });
};

const createAdditionalKid = (nbrPersons, clinic) => {
  return createAdditionalPersons(
    nbrPersons,
    clinic,
    ADDITIONAL_KID_FIRST_NAMES,
    DATE_OF_BIRTHS_KIDS
  );
};

const createAdditionalWoman = (nbrPersons, clinic) => {
  return createAdditionalPersons(
    nbrPersons,
    clinic,
    ADDITIONAL_WOMAN_FIRST_NAMES,
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
    .map((_, index) => {
      const { clinic, primaryContact } = createClinic(index, healthCenter);

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
