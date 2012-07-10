
// Example, mainly used for tests. Typically forms are defined in the JSON
// format and converted during the build process to be referenced from these
// exports.
exports['TEST'] = {
    meta: {code: "TEST", label: 'Test Monthly Report'},
    fields: {
        facility_id: {
            labels: 'Health Facility Identifier',
            type: 'string',
            required: true
        },
         year: {
             labels: 'Report Year',
             type: 'integer',
             validate: {is_numeric_year: true},
             required: true
         },
         month: {
             labels: 'Report Month',
             type: 'integer',
             validate: {is_numeric_month: true},
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
             ]
         },
         misoprostol_administered: {
            type: "boolean",
            labels: {
               short: {
                  en: "Misoprostol?"
               },
               description: {
                  en: "Was misoprostol administered?"
               }
            }
         },
         'quantity_dispensed.la_6x1': {
             labels: 'LA 6x1: Dispensed total', type: 'integer'},
         'quantity_dispensed.la_6x2': {
             labels: 'LA 6x2: Dispensed total', type: 'integer'},
         'quantity_dispensed.cotrimoxazole': {
             labels: 'Cotrimoxazole: Dispensed total', type: 'integer'},
         'quantity_dispensed.zinc': {
             labels: 'Zinc: Dispensed total', type: 'integer'},
         'quantity_dispensed.ors': {
             labels: 'ORS: Dispensed total', type: 'integer'},
         'quantity_dispensed.eye_ointment': {
             labels: 'Eye Ointment: Dispensed total', type: 'integer'},
         'days_stocked_out.la_6x1': {
             labels: 'LA 6x1: Days stocked out', type: 'integer'},
         'days_stocked_out.la_6x2': {
             labels: 'LA 6x2: Days stocked out', type: 'integer'},
         'days_stocked_out.cotrimoxazole': {
             labels: 'Cotrimoxazole: Days stocked out', type: 'integer'},
         'days_stocked_out.zinc': {
             labels: 'Zinc: Days stocked out', type: 'integer'},
         'days_stocked_out.ors': {
             labels: 'ORS: Days stocked out', type: 'integer'},
         'days_stocked_out.eye_ointment': {
             labels: 'Eye Ointment: Days stocked out', type: 'integer'}
    },
    autoreply: "Zikomo!",
    data_record_merge: "/:form/data_record/merge/:year/:month/:clinic_id",
    examples: {
         messages: {
             muvuku: '1!TEST!facility#2012#4#222#333#444#555#666#777#888#999#111#222#333#444'
         }
     }
};

