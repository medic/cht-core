
// Example, mainly used for tests. Typically forms are defined in the JSON
// format and converted during the build process to be referenced from these
// exports.
exports['TEST'] = {
    meta: {code: "TEST", label: 'Test Monthly Report'},
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
    examples: {
         messages: {
             muvuku: '1!TEST!facility#2012#4#1#222#333#444#555#666#777#888#999#111#222#333#444',
             textforms: 'TEST HFI facility#RPY 2012#RPM 4#MSP 1#L1T 222# L2T 333#CDT 444#ZDT 555#ODT 666#EOT 777#L10 888#L20 999#CDO 111#ZDO 222#ODO 333#EDO 444'
         }
     }
};

