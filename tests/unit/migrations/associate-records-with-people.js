var sinon = require('sinon').sandbox.create(),
    db = require('../../../db'),
    migration = require('../../../migrations/associate-records-with-people');

exports.tearDown = function (callback) {
  sinon.restore();
  callback();
};

var clinic = {
  _id: 'eeb17d6d-5dde-c2c0-8049b4903e2fb0a5',
  name: 'Sagebush',
  parent: {
    _id: 'eeb17d6d-5dde-c2c0-2ecb7b280392fae8',
    name: 'Winternesse',
    parent: {
      _id: 'eeb17d6d-5dde-c2c0-8a899c4fe9db6ba9',
      name: 'District 1',
      parent: {},
      type: 'district_hospital',
      contact: {
        phone: '+2812635438',
        name: 'Thalia Timmins'
      }
    },
    type: 'health_center',
    contact: {
      phone: '+2834366793',
      name: 'Serina Scholz'
    }
  },
  type: 'clinic',
  contact: {
    phone: '+2875810113',
    name: 'Abram Alred'
  }
};

var contact = {
  _id: '0abf501d3fbeffaf98bae6c9d602dcad',
  _rev: '18-e29f1c960a0555eac80a5ecebb0f48fe',
  type: 'person',
  name: 'Abram Alred',
  phone: '+64274655536',
  parent: clinic
};

var outgoingMessage = {
  _id: '1a69cd4dabe1ad9387aeb4bc220607be',
  _rev: '1-e8e08a0b9ca35de453ea2f23b09df2b0',
  errors: [],
  form: null,
  from: '0211111111',
  reported_date: 1427403259117,
  related_entities: {},
  tasks: [
    {
      messages: [
        {
          from: '0211111111',
          sent_by: 'gareth',
          to: '+64274655536',
          facility: {
            _id: 'eeb17d6d-5dde-c2c0-8049b4903e2fb0a5',
            _rev: '3-844b233140608c7dfc14ee77a5f40739',
            type: 'clinic',
            name: 'Sagebush',
            contact: {
              _id: '0abf501d3fbeffaf98bae6c9d602dcad',
              _rev: '2-a4d5537f8c570ec59a2c23cf541f9fea',
              type: 'person',
              name: 'Abram Alred',
              phone: '+64274655536'
            },
            parent: {
              _id: 'eeb17d6d-5dde-c2c0-2ecb7b280392fae8',
              type: 'health_center',
              name: 'Winternesse',
              contact: {
                name: 'Serina Scholz',
                phone: '+2834366793'
              },
              parent: {
                _id: 'eeb17d6d-5dde-c2c0-8a899c4fe9db6ba9',
                type: 'district_hospital',
                name: 'District 1',
                contact: {
                  name: 'Thalia Timmins',
                  phone: '+2812635438'
                },
                parent: {}
              }
            }
          },
          message: 'hey',
          uuid: '1a69cd4d-abe1-ad93-87aeb4bc2202dae3'
        }
      ],
      state: 'pending',
      state_history: [
        {
          state: 'pending',
          timestamp: '2015-03-26T20:54:19.143Z'
        }
      ]
    }
  ],
  kujua_message: true,
  type: 'data_record',
  sent_by: 'gareth'
};

var outgoingMessageWithoutContactId = {
  _id: '1a69cd4dabe1ad9387aeb4bc220607be',
  _rev: '1-e8e08a0b9ca35de453ea2f23b09df2b0',
  errors: [],
  form: null,
  from: '0211111111',
  reported_date: 1427403259117,
  related_entities: {},
  tasks: [
    {
      messages: [
        {
          from: '0211111111',
          sent_by: 'gareth',
          to: '+64274655536',
          facility: {
            _id: 'eeb17d6d-5dde-c2c0-8049b4903e2fb0a5',
            _rev: '3-844b233140608c7dfc14ee77a5f40739',
            type: 'clinic',
            name: 'Sagebush',
            contact: {
              name: 'Abram Alred',
              phone: '+64274655536'
            }
          },
          message: 'hey',
          uuid: '1a69cd4d-abe1-ad93-87aeb4bc2202dae3'
        }
      ],
      state: 'pending',
      state_history: [
        {
          state: 'pending',
          timestamp: '2015-03-26T20:54:19.143Z'
        }
      ]
    }
  ],
  kujua_message: true,
  type: 'data_record',
  sent_by: 'gareth'
};

var outgoingMessageToPerson = {
  _id: 'b1d1f8691247be598cfd599a3b0dbcb7',
  _rev: '1-037f836d5fae91364ab88e671009c2c0',
  errors: [],
  form: null,
  from: '0211111111',
  reported_date: 1427830070763,
  related_entities: {},
  tasks: [
    {
      messages: [
        {
          from: '0211111111',
          sent_by: 'gareth',
          to: '+2849701090',
          facility: {
            _id: '0abf501d3fbeffaf98bae6c9d601afe6',
            _rev: '1-701dc5a2ea5e107aa9d0cbae01084a02',
            type: 'person',
            name: 'Flora Fulford',
            phone: '+2849701090',
            parent: {
              _id: 'eeb17d6d-5dde-c2c0-e2d64d11148d5d84',
              type: 'health_center',
              name: 'Easthedge',
              contact: {
                name: 'Flora Fulford',
                phone: '+2849701090'
              },
              parent: {
                _id: 'eeb17d6d-5dde-c2c0-a0f2a91e2d232c51',
                type: 'district_hospital',
                name: 'District 2',
                contact: {
                  name: 'Denise Degraffenreid',
                  phone: '+2884615402'
                },
                parent: {

                }
              }
            }
          },
          message: 'test',
          uuid: 'b1d1f869-1247-be59-8cfd599a3b0a6dd4'
        }
      ],
      state: 'pending',
      state_history: [
        {
          state: 'pending',
          timestamp: '2015-03-31T19:27:50.790Z'
        }
      ]
    }
  ],
  kujua_message: true,
  type: 'data_record',
  sent_by: 'gareth'
};

var incomingMessage = {
  _id: '7fd3a9e4a8089b42af94fed47a32ef71',
  _rev: '3-d2b108f1f628e82b62909f85b48cbb75',
  type: 'data_record',
  from: '+64274655536',
  related_entities: {
    clinic: {
      _id: 'eeb17d6d-5dde-c2c0-8049b4903e2fb0a5',
      _rev: '18-92bf8c4f048177171f8c6e3f7829e8c6',
      type: 'clinic',
      name: 'Sagebush',
      contact: {
        _id: '0abf501d3fbeffaf98bae6c9d602dcad',
        _rev: '17-0e13e75199e34c49c31dd3b0422172e8',
        type: 'person',
        name: 'Abram Alred',
        phone: '+64274655536'
      },
      parent: {
        _id: 'eeb17d6d-5dde-c2c0-2ecb7b280392fae8',
        type: 'health_center',
        name: 'Winternesse',
        contact: {
          name: 'Serina Scholz',
          phone: '+2834366793'
        },
        parent: {
          _id: 'eeb17d6d-5dde-c2c0-8a899c4fe9db6ba9',
          type: 'district_hospital',
          name: 'District 1',
          contact: {
            name: 'Thalia Timmins',
            phone: '+2812635438'
          },
          parent: {}
        }
      }
    }
  },
  errors: [],
  tasks: [],
  reported_date: 1429062964602,
  sms_message: {
    message_id: '2221',
    sent_timestamp: '1429062964602',
    message: 'incoming 2',
    from: '+64274655536',
    type: 'sms_message',
    form: 'INCOMING',
    locale: 'en'
  },
  sent_by: 'Abram Alred',
  transitions: {
    update_sent_by: {
      last_rev: 2,
      seq: 1394,
      ok: true
    },
    update_clinics: {
      last_rev: 2,
      seq: 1394,
      ok: true
    }
  }
};

var incomingReport = {
  _id: 'cafb2761e5a44ecc9d4559f73f6a9994',
  _rev: '10-20935d2ab5e1509b0fe658d59b5bef59',
  type: 'data_record',
  from: '+64274622666',
  form: 'ON',
  related_entities: {
    clinic: {
      _id: 'eeb17d6d-5dde-c2c0-2bb2c513294c945e',
      _rev: '15-23cbff19fc822b8c171064ee639c99f9',
      type: 'clinic',
      name: 'Aelhedge',
      contact: {
        _id: '0abf501d3fbeffaf98bae6c9d602dcad',
        _rev: '11-2a4c176bca6f6729dbdeabdc7e391ba4',
        type: 'person',
        name: '_Gareth',
        phone: '+64274622666'
      },
      parent: {
        _id: 'eeb17d6d-5dde-c2c0-48d80e8c2049f0f3',
        _rev: '3-6f2ec37b5d16959d1d66db19290ad099',
        type: 'health_center',
        name: 'Irondeer',
        contact: {
          name: 'Stefani Shisler',
          phone: '+2825898434',
          type: 'person',
          _id: '0abf501d3fbeffaf98bae6c9d6019bf6',
          _rev: '1-5887c16e7d75cbc5a61bf6a87fbcdfe4'
        },
        parent: {
          _id: 'eeb17d6d-5dde-c2c0-183a1e2943958f44',
          _rev: '3-86259bebde3347499894527a05053d6e',
          type: 'district_hospital',
          name: 'District 3',
          contact: {
            type: 'person',
            name: 'Joan Rivers',
            phone: '+64274622664',
            _id: '6ff3ddbfce1cea75213bd6ff2d04fe3e',
            _rev: '1-1ad9c9c81c54507e2788724169c11a93'
          },
          parent: null
        }
      }
    }
  },
  errors: [],
  tasks: [
    {
      messages: [
        {
          to: '+64274622666',
          message: 'Thank you _Gareth, record for archie (19446) has been reactivated. Notifications regarding this patient will resume.',
          uuid: '944f8526-d0fc-471f-a7f8-bb12f72f09c3'
        }
      ],
      state: 'pending',
      state_history: [
        {
          state: 'pending',
          timestamp: '2015-04-21T23:38:49.103Z'
        }
      ]
    }
  ],
  reported_date: 1429659528565,
  sms_message: {
    message_id: '55849',
    sent_timestamp: '1429659528565',
    message: '1!ON!19446#on',
    from: '+64274622666',
    type: 'sms_message',
    form: 'ON',
    locale: 'en'
  },
  patient_id: '19446',
  notes: 'on',
  transitions: {
    default_responses: {
      last_rev: 2,
      seq: 1832,
      ok: true
    },
    update_sent_by: {
      last_rev: 2,
      seq: 1832,
      ok: true
    },
    update_clinics: {
      last_rev: 2,
      seq: 1832,
      ok: true
    },
    update_notifications: {
      last_rev: 9,
      seq: 1854,
      ok: true
    }
  },
  sent_by: '_Gareth'
};

var incomingReportWithoutContactId = {
  _id: 'cafb2761e5a44ecc9d4559f73f6a9994',
  _rev: '10-20935d2ab5e1509b0fe658d59b5bef59',
  type: 'data_record',
  from: '+64274622666',
  form: 'ON',
  related_entities: {
    clinic: {
      _id: clinic._id,
      _rev: '15-23cbff19fc822b8c171064ee639c99f9',
      type: 'clinic',
      name: 'Aelhedge',
      contact: {
        name: '_Gareth',
        phone: '+64274622666'
      },
      parent: {
        _id: 'eeb17d6d-5dde-c2c0-48d80e8c2049f0f3',
        _rev: '3-6f2ec37b5d16959d1d66db19290ad099',
        type: 'health_center',
        name: 'Irondeer',
        contact: {
          name: 'Stefani Shisler',
          phone: '+2825898434',
        },
        parent: {
          _id: 'eeb17d6d-5dde-c2c0-183a1e2943958f44',
          _rev: '3-86259bebde3347499894527a05053d6e',
          type: 'district_hospital',
          name: 'District 3',
          contact: {
            type: 'person',
            name: 'Joan Rivers',
          },
          parent: null
        }
      }
    }
  },
  errors: [],
  tasks: [
    {
      messages: [
        {
          to: '+64274622666',
          message: 'Thank you _Gareth, record for archie (19446) has been reactivated. Notifications regarding this patient will resume.',
          uuid: '944f8526-d0fc-471f-a7f8-bb12f72f09c3'
        }
      ],
      state: 'pending',
      state_history: [
        {
          state: 'pending',
          timestamp: '2015-04-21T23:38:49.103Z'
        }
      ]
    }
  ],
  reported_date: 1429659528565,
  sms_message: {
    message_id: '55849',
    sent_timestamp: '1429659528565',
    message: '1!ON!19446#on',
    from: '+64274622666',
    type: 'sms_message',
    form: 'ON',
    locale: 'en'
  },
  patient_id: '19446',
  notes: 'on',
  transitions: {
    default_responses: {
      last_rev: 2,
      seq: 1832,
      ok: true
    },
    update_sent_by: {
      last_rev: 2,
      seq: 1832,
      ok: true
    },
    update_clinics: {
      last_rev: 2,
      seq: 1832,
      ok: true
    },
    update_notifications: {
      last_rev: 9,
      seq: 1854,
      ok: true
    }
  },
  sent_by: '_Gareth'
};

var clone = function(original) {
  return JSON.parse(JSON.stringify(original));
};

exports['run does nothing if no data records'] = function(test) {
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [] });
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['run does nothing if outgoing message already migrated'] = function(test) {
  var rows = [ { doc: { tasks: [ { messages: [ { contact: { _id: 'a' } } ] } ] } } ];
  var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 2);
    test.equals(getView.args[0][2].skip, 0);
    test.equals(getView.args[1][2].skip, 100);
    test.done();
  });
};

exports['run does nothing if outgoing message has no facility'] = function(test) {
  var rows = [ { doc: { tasks: [ { messages: [ { to: '+6427555', } ] } ] } } ];
  var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 2);
    test.done();
  });
};

exports['run migrates outgoing message'] = function(test) {
  var rows = [ { doc: clone(outgoingMessage) } ];
    var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  var getDoc = sinon.stub(db.medic, 'get').callsArgWith(1, null, contact);
  var bulk = sinon.stub(db.medic, 'bulk').callsArg(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 2);
    test.equals(getDoc.callCount, 1);
    test.equals(getDoc.args[0][0], contact._id);
    test.equals(bulk.callCount, 1);
    var message = bulk.args[0][0].docs[0].tasks[0].messages[0];
    test.equals(message.facility, null);
    test.deepEqual(message.contact, contact);
    test.done();
  });
};

exports['run migrates outgoing message to facility without contact id - #2545'] = function(test) {
  var rows = [ { doc: clone(outgoingMessageWithoutContactId) } ];
    var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  var getDoc = sinon.stub(db.medic, 'get').callsArgWith(1, null, clinic);
  var bulk = sinon.stub(db.medic, 'bulk').callsArg(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 2);
    test.equals(getDoc.callCount, 1);
    test.equals(getDoc.args[0][0], clinic._id);
    test.equals(bulk.callCount, 1);
    var message = bulk.args[0][0].docs[0].tasks[0].messages[0];
    test.equals(message.facility, null);
    test.deepEqual(message.contact.phone, clinic.contact.phone);
    test.deepEqual(message.contact.name, clinic.contact.name);
    test.deepEqual(message.contact.parent, clinic);
    test.done();
  });
};

exports['run migrates outgoing message to person'] = function(test) {
  var rows = [ { doc: clone(outgoingMessageToPerson) } ];
    var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  var bulk = sinon.stub(db.medic, 'bulk').callsArg(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 2);
    test.equals(bulk.callCount, 1);
    var message = bulk.args[0][0].docs[0].tasks[0].messages[0];
    test.equals(message.facility, null);
    test.deepEqual(message.contact, outgoingMessageToPerson.tasks[0].messages[0].facility);
    test.done();
  });
};

exports['run does nothing if incoming message already migrated'] = function(test) {
  var rows = [ { doc: { sms_message: { message: 'incoming', }, contact: { _id: 'a' } } } ];
    var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  var bulk = sinon.stub(db.medic, 'bulk');
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 2);
    test.equals(bulk.callCount, 0);
    test.done();
  });
};

exports['run does nothing if incoming message has no facility'] = function(test) {
  var rows = [ { doc: { sms_message: { message: 'incoming' } } } ];
    var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  var bulk = sinon.stub(db.medic, 'bulk');
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(bulk.callCount, 0);
    test.done();
  });
};

exports['run migrates incoming message'] = function(test) {
  var rows = [ { doc: clone(incomingMessage) } ];
    var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  var getDoc = sinon.stub(db.medic, 'get').callsArgWith(1, null, clone(contact));
  var bulk = sinon.stub(db.medic, 'bulk').callsArg(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getDoc.callCount, 1);
    test.equals(getDoc.args[0][0], contact._id);
    test.equals(bulk.callCount, 1);
    test.equals(bulk.args[0][0].docs[0].related_entities, null);
    test.deepEqual(bulk.args[0][0].docs[0].contact, contact);
    test.done();
  });
};

exports['run migrates incoming report'] = function(test) {
  var rows = [ { doc: clone(incomingReport) } ];
  var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  var getDoc = sinon.stub(db.medic, 'get').callsArgWith(1, null, clone(contact));
  var bulk = sinon.stub(db.medic, 'bulk').callsArg(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getDoc.callCount, 1);
    test.equals(getDoc.args[0][0], contact._id);
    test.equals(bulk.callCount, 1);
    test.equals(bulk.args[0][0].docs[0].related_entities, null);
    test.deepEqual(bulk.args[0][0].docs[0].contact, contact);
    test.done();
  });
};

exports['run migrates incoming report with no contact id - #2970'] = function(test) {
  var rows = [ { doc: clone(incomingReportWithoutContactId) } ];
  var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  var getDoc = sinon.stub(db.medic, 'get').callsArgWith(1, null, clone(clinic));
  var bulk = sinon.stub(db.medic, 'bulk').callsArg(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getDoc.callCount, 1);
    test.equals(getDoc.args[0][0], clinic._id);
    test.equals(bulk.callCount, 1);
    var report = bulk.args[0][0].docs[0];
    test.equals(report.related_entities, null);
    test.equals(report.contact.phone, clinic.contact.phone);
    test.equals(report.contact.name, clinic.contact.name);
    test.deepEqual(report.contact.parent, clinic);
    test.done();
  });
};

exports['run migrates multiple data records'] = function(test) {
  var rows = [
    { doc: clone(outgoingMessage) },
    { doc: clone(incomingMessage) },
    { doc: clone(incomingReport) }
  ];
  var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  var getDoc = sinon.stub(db.medic, 'get');
  getDoc.onCall(0).callsArgWith(1, null, contact);
  getDoc.onCall(1).callsArgWith(1, null, contact);
  getDoc.onCall(2).callsArgWith(1, null, contact);
  var bulk = sinon.stub(db.medic, 'bulk').callsArg(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getDoc.callCount, 3);
    test.equals(getDoc.args[0][0], contact._id);
    test.equals(getDoc.args[1][0], contact._id);
    test.equals(getDoc.args[2][0], contact._id);
    test.equals(bulk.callCount, 1);
    test.done();
  });
};

exports['run migrates outgoing message with deleted contact'] = function(test) {
  var rows = [ { doc: clone(outgoingMessage) } ];
  var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  var getDoc = sinon.stub(db.medic, 'get');
  getDoc.onCall(0).callsArgWith(1, { statusCode: 404 });
  getDoc.onCall(1).callsArgWith(1, null, clinic);
  var bulk = sinon.stub(db.medic, 'bulk').callsArg(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getDoc.callCount, 2);
    test.equals(getDoc.args[0][0], contact._id);
    test.equals(getDoc.args[1][0], clinic._id);
    test.equals(bulk.callCount, 1);
    var message = bulk.args[0][0].docs[0].tasks[0].messages[0];
    test.equals(message.facility, null);
    test.equals(message.contact.phone, clinic.contact.phone);
    test.equals(message.contact.name, clinic.contact.name);
    test.deepEqual(message.contact.parent, clinic);
    test.done();
  });
};

exports['run migrates incoming message with deleted contact and deleted clinic'] = function(test) {
  var rows = [ { doc: clone(incomingMessage) } ];
  var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  var getDoc = sinon.stub(db.medic, 'get');
  getDoc.onCall(0).callsArgWith(1, { statusCode: 404 });
  getDoc.onCall(1).callsArgWith(1, { statusCode: 404 });
  var bulk = sinon.stub(db.medic, 'bulk').callsArg(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getDoc.callCount, 2);
    test.equals(getDoc.args[0][0], contact._id);
    test.equals(getDoc.args[1][0], clinic._id);
    test.equals(bulk.callCount, 1);
    var message = bulk.args[0][0].docs[0];
    test.equals(message.related_entities, null);
    test.equals(message.contact, null);
    test.done();
  });
};

exports['run migrates incoming message with deleted contact and clinic has no contact'] = function(test) {
  var rows = [ { doc: clone(incomingMessage) } ];
  var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows });
  getView.onCall(1).callsArgWith(3, null, { rows: [] });
  var getDoc = sinon.stub(db.medic, 'get');
  getDoc.onCall(0).callsArgWith(1, { statusCode: 404 });
  getDoc.onCall(1).callsArgWith(1, null, { _id: 'a' });
  var bulk = sinon.stub(db.medic, 'bulk').callsArg(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getDoc.callCount, 2);
    test.equals(getDoc.args[0][0], contact._id);
    test.equals(getDoc.args[1][0], clinic._id);
    test.equals(bulk.callCount, 1);
    var message = bulk.args[0][0].docs[0];
    test.equals(message.related_entities, null);
    test.equals(message.contact, null);
    test.done();
  });
};

exports['run keeps iterating until the view returns no results'] = function(test) {
  var rows1 = [ { doc: clone(incomingMessage) } ];
  var rows2 = [ { doc: clone(outgoingMessage) } ];
  var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: rows1 });
  getView.onCall(1).callsArgWith(3, null, { rows: rows2 });
  getView.onCall(2).callsArgWith(3, null, { rows: [] });
  var getDoc = sinon.stub(db.medic, 'get');
  getDoc.onCall(0).callsArgWith(1, null, clone(contact));
  getDoc.onCall(1).callsArgWith(1, null, clone(contact));
  var bulk = sinon.stub(db.medic, 'bulk').callsArg(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 3);
    test.equals(bulk.callCount, 2);
    var message1 = bulk.args[0][0].docs[0];
    test.equals(message1.related_entities, null);
    test.deepEqual(message1.contact, contact);
    var message2 = bulk.args[1][0].docs[0].tasks[0].messages[0];
    test.equals(message2.facility, null);
    test.deepEqual(message2.contact, contact);
    test.done();
  });
};
