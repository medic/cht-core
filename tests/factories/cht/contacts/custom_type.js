const Factory = require('rosie').Factory;

const custom_type_doctor = {
  id: 'doctor',
  name_key: 'contact.type.doctor',
  group_key: 'contact.type.doctor.plural',
  create_key: 'contact.type.doctor.new',
  edit_key: 'contact.type.doctor.edit',
  primary_contact_key: 'clinic.field.contact',
  parents: [
    'district_hospital',
    'health_center',
    'clinic',
    'ngo',
    'office',
    'family'
  ],
  icon: 'medic-person',
  create_form: 'form:contact:doctor:create',
  edit_form: 'form:contact:doctor:edit',
  person: true

};

// const customTypes = [
//   {
//     id: 'ngo',
//     name_key: 'contact.type.ngo',
//     group_key: 'contact.type.ngo.plural',
//     create_key: 'contact.type.ngo.new',
//     edit_key: 'contact.type.ngo.edit',
//     icon: 'medic - district - hospital',
//     create_form: 'form: contact: ngo: create',
//     edit_form: 'form: contact: ngo: edit'
//   },
//   {
//     id: 'office',
//     name_key: 'contact.type.office',
//     group_key: 'contact.type.office.plural',
//     create_key: 'contact.type.office.new',
//     edit_key: 'contact.type.place.edit',
//     icon: 'medic - district - hospital',
//     create_form: 'form: contact: office: create',
//     edit_form: 'form: contact: office: edit',
//     parents: [
//       'ngo',
//       'district_hospital'
//     ]
//   },
//   {
//     id: 'family',
//     name_key: 'contact.type.family',
//     group_key: 'contact.type.family.plural',
//     create_key: 'contact.type.family.new',
//     edit_key: 'contact.type.place.edit',
//     icon: 'medic - district - hospital',
//     create_form: 'form: contact: family: create',
//     edit_form: 'form: contact: family: edit',
//     parents: [
//       'health_center',
//       'office'
//     ]
//   },
//   {
//     id: 'doctor',
//     name_key: 'contact.type.doctor',
//     group_key: 'contact.type.doctor.plural',
//     create_key: 'contact.type.doctor.new',
//     edit_key: 'contact.type.doctor.edit',
//     primary_contact_key: 'clinic.field.contact',
//     parents: [
//       'district_hospital',
//       'health_center',
//       'clinic',
//       'ngo',
//       'office',
//       'family'
//     ],
//     icon: 'medic-person',
//     create_form: 'form:contact:doctor:create',
//     edit_form: 'form:contact:doctor:edit',
//     person: true
//   }];


const customType = () => {
  return new Factory()
    .attr('id', 'ngo')
    .attr('name_key', 'contact.type.ngo')
    .attr('group_key', 'contact.type.ngo.plural')
    .attr('create_key', 'contact.type.ngo.new')
    .attr('edit_key', 'contact.type.ngo.edit')
    .attr('primary_contact_key', '')
    .attr('parents', '')
    .attr('icon', 'medic-district-hospital' )
    .attr('create_form', 'form:contact:ngo:create')
    .attr('edit_form', 'form:contact:ngo:edit' )
    .attr('person', false);
};

const customTypes = () => {
  const types = [];
  types.push(customType().build());
  types.push(customType().build(custom_type_doctor));
  return types;
};




module.exports = {
  customType,
  customTypes
};
