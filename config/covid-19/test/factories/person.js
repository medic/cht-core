const Factory = require('rosie').Factory;
const uuid = require('uuid');

const parent = {
  _id: 'clinic1',
  parent: {
    _id: 'hc1',
    parent: {
      _id: 'dist1'
    }
  }
};

const ephemeral_dob = {
  dob_calendar: '2000-02-01',
  ephemeral_months: 3,
  ephemeral_years: 2021,
  dob_approx: '2021-03-30',
  dob_raw: '2000-02-01',
  dob_iso: '2000-02-01'
};

module.exports = new Factory()
  .sequence('_id', uuid.v4)
  .attr('parent', parent)
  .attr('type', 'person')
  .attr('name', 'Mary Smith')
  .attr('short_name', '')
  .attr('date_of_birth_method', 'approx')
  .attr('date_of_birth', '2000-02-01')
  .attr('ephemeral_dob', ephemeral_dob)
  .attr('sex', 'female')
  .attr('phone', '+1123123123')
  .attr('phone_alternate', '+1123123144')
  .attr('patient_id', 'test_woman_1')
  .attr('external_id', 'CHW-01')
  .attr('address', '1 Willy ST, Emery Town, NY. 10001')
  .attr('notes', 'CHW-01 has special training')
  .attr('reported_date', () => new Date());
