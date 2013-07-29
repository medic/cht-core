var _ = require('underscore'),
    clinics;

module.exports = {
    clinic_by_phone: function(params, callback) {
        var result = _.filter(clinics(), function(clinic) {
            return _.first(params.key) === clinic.contact.phone;
        });
        callback(null, {
            rows: _.map(result, function(row) {
                return { doc: row };
            })
        });
    },
    clinic_by_refid: function(params, callback) {
        var result = _.filter(clinics(), function(clinic) {
            return _.first(params.key) === clinic.contact.rc_code;
        });
        callback(null, {
            rows: _.map(result, function(row) {
                return { doc: row };
            })
        });
    },
    view: function(design, view, params, callback) {
        module.exports[view](params, callback);
    },
    saveDoc: function(doc, callback) {
        callback(null, {});
    },
    checkOHWDuplicates: function(options, callback) {
        callback(null, []);
    },
    getOHWRegistration: function(id, callback) {
        var registration;

        if (id === 'fake') {
            registration = false;
        } else {
            registration = {
                patient_id: "123",
                serial_number: "ABC",
                expected_date: 1381208400000, // Oct 08 2013 00:00:00 GMT-0500
                scheduled_tasks: [
                    {
                        messages: [ { message: 'foo' } ],
                        type: 'upcoming_delivery',
                        state: 'scheduled'
                    },
                    {
                        messages: [ { message: 'foo' } ],
                        type: 'upcoming_delivery',
                        state: 'scheduled'
                    },
                    {
                        messages: [ { message: 'foo' } ],
                        type: 'outcome_request',
                        state: 'scheduled'
                    }
                ]
            };
        }
        callback(null, registration);
    }
};


function clinics() {
   return [
        {
           "_id": "9ed7d9c6095cc0e37e4d3e94d3387ed9",
           "_rev": "6-e447d8801d7bed36614af92449586851",
           "type": "clinic",
           "name": "Clinic",
           "contact": {
               "name": "CCN",
               "phone": "+34567890123",
               "rc_code": "1000"
           },
           "parent": {
               "_id": "9ed7d9c6095cc0e37e4d3e94d33866f1",
               "_rev": "6-723dad2083c951501a1851fb88b6e3b5",
               "type": "health_center",
               "name": "Health Center",
               "contact": {
                   "name": "HCCN",
                   "phone": "+23456789012"
               },
               "parent": {
                   "_id": "9ed7d9c6095cc0e37e4d3e94d3384c8f",
                   "_rev": "4-6e5f394413e840c1f41bf9f471a91e04",
                   "type": "district_hospital",
                   "name": "District",
                   "parent": {
                   },
                   "contact": {
                       "name": "DCN",
                       "phone": "+12345678901"
                   }
               }
           }
        }
    ];
}
