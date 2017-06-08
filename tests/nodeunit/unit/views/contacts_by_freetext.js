const _ = require('underscore'),
    utils = require('./utils');

const doc = {
  _id: '3c0c4575468bc9b7ce066a279b022e8e',
  _rev: '2-5fb6ead9b03232a4cf1e0171c5434469',
  name: 'Test Contact of Clinic',
  date_of_birth: '',
  phone: '+13125551212',
  alternate_phone: '',
  notes: '',
  type: 'person',
  reported_date: 1491910934051,
  transitions: {
    maintain_info_document: {
      last_rev: 2,
      seq: '241-g1AAAACbeJzLYWBgYMpgTmEQTM4vTc5ISXLIyU9OzMnILy7JAUklMiTV____PyuDOdE1FyjAnpRikZxsaYpNAx5j8liAJEMDkPoPNW0N2LQ0S_PkNNM0bPqyAMhOMjM',
      ok: true
    }
  }
};

const nonAsciiDoc = {
  _id: '3e32235b-7111-4a69-a0a1-b3094f257891',
  _rev: '1-e19cb2355b26c5f71abd1cc67b4b1bc0',
  name: 'बुद्ध Élève',
  date_of_birth: '',
  phone: '+254777444333',
  alternate_phone: '',
  notes: '',
  parent: {
    _id: 'd978f02c-093b-4266-81cd-3983749f9c99'
  },
  type: 'person',
  reported_date: 1496068842996
};

exports['indexes doc name'] = function(test) {
  // given
  const map = utils.loadMedicClientView('contacts_by_freetext');

  // when
  const emitted = map(doc);

  // then
  // Keys are arrays, so flatten the array of arrays for easier asserts.
  var flattened = _.flatten(emitted);
  test.ok(flattened.includes('test'));
  test.ok(flattened.includes('clinic'));
  test.ok(flattened.includes('contact'));
  test.done();
};

exports['indexes non-ascii doc name'] = function(test) {
  // given
  const map = utils.loadMedicClientView('contacts_by_freetext');

  // when
  const emitted = map(nonAsciiDoc);

  // then
  // Keys are arrays, so flatten the array of arrays for easier asserts.
  var flattened = _.flatten(emitted);
  test.ok(flattened.includes('बुद्ध'));
  test.ok(flattened.includes('élève'));
  test.done();
};

exports['does not index words of less than 3 chars'] = function(test) {
  // given
  const map = utils.loadMedicClientView('contacts_by_freetext');

  // when
  const emitted = map(doc);

  // then
  // Keys are arrays, so flatten the array of arrays for easier asserts.
  var flattened = _.flatten(emitted);
  test.ok(!flattened.includes('of'));
  test.done();
};

exports['does not index non-contact docs'] = function(test) {
  // given
  const map = utils.loadMedicClientView('contacts_by_freetext');

  // when
  const emitted = map({ type: 'data_record', name: 'do not index me'});

  // then
  // Keys are arrays, so flatten the array of arrays for easier asserts.
  test.ok(emitted.length === 0);
  test.done();
};
