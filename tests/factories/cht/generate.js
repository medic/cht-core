const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const deliveryFactory = require('@factories/cht/reports/delivery');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const pregnancyVisitFactory = require('@factories/cht/reports/pregnancy-visit');
const immunizationFactory = require('@factories/cht/reports/inmunization');
const { faker } = require('@faker-js/faker');

// Fixed collection of real-world data
const PRIMARY_CONTACT_FIRST_NAMES = [
  'Amanda', 'Beatrice', 'Dana', 'Fatima',
  'Gina', 'Helen', 'Isabelle', 'Jessica',
  'Ivy', 'Sara'
];
const ADDITIONAL_PERSON_FIRST_NAMES = ['John', 'Hawa', 'Timmy', 'Ana'];
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
const AGES = [25, 2, 10, 7];
const DATE_OF_BIRTHS = AGES.map(calculateDateOfBirth);
calculateLastMenstrualPeriod = (date) => {
  PREGNANCY_DAYS = 252;
  date.setDate(date.getDate() - PREGNANCY_DAYS);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

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
      lmp_date_8601: LAST_MENSTRUAL_PERIOD,
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

const createAdditionalPersons = (nbrPersons, clinic) => {
  return Array
    .from({ length: nbrPersons - 1 })
    .map((_, i) => {
      const additionalPersonName = `${
        ADDITIONAL_PERSON_FIRST_NAMES[i % ADDITIONAL_PERSON_FIRST_NAMES.length]
      } ${clinic.last_name}`;
      const additionalPhoneNumber = PHONE_NUMBERS[i % PHONE_NUMBERS.length];
      return personFactory.build({
        parent: { _id: clinic._id, parent: clinic.parent },
        name: additionalPersonName,
        patient_id: PATIENT_IDS[i % PATIENT_IDS.length],
        phone: additionalPhoneNumber,
        date_of_birth: DATE_OF_BIRTHS[i % DATE_OF_BIRTHS.length],
      });
    });
};

const createReportsForPerson = (person, user) => {
  const reports = [];
  const isWoman = person.sex === 'female';
  const age = new Date().getFullYear() - new Date(person.date_of_birth).getFullYear();
  const isInPregnancyAgeRange = age >= 12 && age <= 49;
  if (isWoman && isInPregnancyAgeRange) {
    reports.push(
      pregnancyFactory.build(getReportContext(person, user)),
      pregnancyVisitFactory.build(getReportContext(person, user))
    );
  }
  const isChild = age < 5;
  if (isChild) {
    reports.push(
      immunizationFactory.build({ contact: user, patient: person })
    );
  }
  return reports;
};

const createDataWithRealNames = ({ healthCenter, user, nbrClinics = 10, nbrPersons = 10 }) => {
  const clinicsData = Array
    .from({ length: nbrClinics })
    .map((_, index) => {
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
  if (useRealNames) {
    return createDataWithRealNames({ healthCenter, user, nbrClinics, nbrPersons });
  }
  return createDataWithFixedData({ healthCenter, user, nbrClinics, nbrPersons });
};

const createHierarchy = ({ name, user = false, nbrClinics = 50, nbrPersons = 10, useRealNames = false }) => {
  const hierarchy = placeFactory.generateHierarchy();
  const healthCenter = hierarchy.get('health_center');
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
