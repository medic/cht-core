
//
// Forms for tests, YYY* form code space is reserved for test forms.
//

exports['YYYY'] = {
    meta: {code: "YYYY", label: 'Test Monthly Report'},
    fields: {
        facility_id: {
            labels: {
                short: 'Health Facility Identifier',
                tiny: 'HFI'
            },
            type: 'string',
            required: true
        },
         year: {
             labels: {
                 short: 'Report Year',
                 tiny: 'RPY'
             },
             type: 'integer',
             validate: {is_numeric_year: true},
             required: true
         },
         month: {
             labels: {
                 short: 'Report Month',
                 tiny: 'RPM'
             },
             type: 'integer',
             validations: {is_numeric_month: true},
             list: [
                [ 1, { "en": "January" } ],
                [ 2, { "en": "February" } ],
                [ 3, { "en": "March" } ],
                [ 4, { "en": "April" } ],
                [ 5, { "en": "May" } ],
                [ 6, { "en": "June" } ],
                [ 7, { "en": "July" } ],
                [ 8, { "en": "August" } ],
                [ 9, { "en": "September" } ],
                [ 10, { "en": "October" } ],
                [ 11, { "en": "November" } ],
                [ 12, { "en": "December" } ]
             ],
             required: true
         },
         misoprostol_administered: {
            type: 'boolean',
            labels: {
               short: {
                  en: 'Misoprostol?'
               },
               tiny: {
                  en: 'MSP'
               },
               description: {
                  en: 'Was misoprostol administered?'
               }
            }
         },
         'quantity_dispensed.la_6x1': {
             labels: {
                 short: 'LA 6x1: Dispensed total',
                 tiny: 'L1T'
             },
             type: 'integer'
         },
         'quantity_dispensed.la_6x2': {
             labels: {
                 short: 'LA 6x2: Dispensed total',
                 tiny: 'L2T'
             },
             type: 'integer'
         },
         'quantity_dispensed.cotrimoxazole': {
             labels: {
                 short: 'Cotrimoxazole: Dispensed total',
                 tiny: 'CDT'
             },
             type: 'integer'
         },
         'quantity_dispensed.zinc': {
             labels: {
                 short: 'Zinc: Dispensed total',
                 tiny: 'ZDT'
             },
             type: 'integer'
         },
         'quantity_dispensed.ors': {
             labels: {
                 short: 'ORS: Dispensed total',
                 tiny: 'ODT'
             },
             type: 'integer'
         },
         'quantity_dispensed.eye_ointment': {
             labels: {
                 short: 'Eye Ointment: Dispensed total',
                 tiny: 'EOT'
             },
             type: 'integer'
         },
         'days_stocked_out.la_6x1': {
             labels: {
                 short: 'LA 6x1: Days stocked out',
                 tiny: 'L1O'
             },
             type: 'integer'
         },
         'days_stocked_out.la_6x2': {
             labels: {
                 short: 'LA 6x2: Days stocked out',
                 tiny: 'L2O'
             },
             type: 'integer'},
         'days_stocked_out.cotrimoxazole': {
             labels: {
                 short: 'Cotrimoxazole: Days stocked out',
                 tiny: 'CDO'
             },
             type: 'integer'},
         'days_stocked_out.zinc': {
             labels: {
                 short: 'Zinc: Days stocked out',
                 tiny: 'ZDO'
             },
             type: 'integer'},
         'days_stocked_out.ors': {
             labels: {
                 short: 'ORS: Days stocked out',
                 tiny: 'ODO'
             },
             type: 'integer'},
         'days_stocked_out.eye_ointment': {
             labels: {
                 short: 'Eye Ointment: Days stocked out',
                 tiny: 'EDO'
             },
             type: 'integer'}
    },
    autoreply: "Zikomo!",
    data_record_merge: "/:form/data_record/merge/:year/:month/:clinic_id",
    facility_reference: "facility_id",
    /*
     * messages_task is a function returns array of message objects,
     * e.g: [{to: '+123', message: 'foo'},...]
     * context includes: phone, clinic, keys, labels, values
     * Health Center -> Hospital
     */
    messages_task: "function() {var msg = [], ignore = [], dh_ph = clinic && clinic.parent && clinic.parent.parent && clinic.parent.parent.contact && clinic.parent.parent.contact.phone; keys.forEach(function(key) { if (ignore.indexOf(key) === -1) { msg.push(labels.shift() + ': ' + values.shift()); } else { labels.shift(); values.shift(); } }); return {to:dh_ph, message:msg.join(', ')}; }",
    examples: {
         messages: {
             muvuku: '1!YYYY!facility#2012#4#1#222#333#444#555#666#777#888#999#111#222#333#444',
             textforms: 'YYYY HFI facility#RPY 2012#RPM 4#MSP 1#L1T 222# L2T 333#CDT 444#ZDT 555#ODT 666#EOT 777#L10 888#L20 999#CDO 111#ZDO 222#ODO 333#EDO 444'
         }
     }
};

exports['YYYZ'] = {
    meta: {code: "YYYZ", label: 'Test Form - Required fields'},
    fields: {
        one: {
            labels: {
                short: 'One',
                tiny: 'one'
            },
            type: 'string',
            required: true
        },
        two: {
            labels: {
                short: 'Two',
                tiny: 'two'
            },
            type: 'string',
            required: true
        },
        birthdate: {
             labels: {
                 short: 'Birth Date',
                 tiny: 'BIR'
             },
             type: 'date'
        }
    }
};

exports['YYYX'] = {
    meta: {code: "YYYX", label: 'Test Form - Required Facility'},
    fields: {
        id: {
            labels: {
                short: 'ID'
            },
            type: 'string',
            required: true
        },
        foo: {
            labels: {
                short: 'Foo'
            },
            type: 'string',
            required: true
        }
    },
    facility_reference: "id",
    facility_required: true
};
