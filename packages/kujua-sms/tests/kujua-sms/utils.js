var utils = require('kujua-sms/utils'),
    smsforms = require('views/lib/smsforms');

exports.getLabels = function(test) {
    var keys = [
        'facility_id',
        [
            'days_stocked_out', [
                'la_6x1',
                'la_6x2'
            ]
        ]
    ];
    
    var locale = 'en';
    
    test.same(
        utils.getLabels(keys, 'PSMS', locale),
        [
            'Health Facility Identifier',
            'LA 6x1: Days stocked out',
            'LA 6x2: Days stocked out'
        ]
    );
    
    test.done();
};

exports.getValues = function(test) {
    var keys = [
        'facility_id',
        [
            'quantity_dispensed', [
                'la_6x1'
            ]
        ],
        [
            'days_stocked_out', [
                'la_6x1',
                'la_6x2'
            ]
        ]
    ];
    
    var doc = {
        'facility_id': 1,
        'quantity_dispensed': {
            'la_6x1': 2
        },
        'days_stocked_out': {
            'la_6x1': 3,
            'la_6x2': 4        
        }        
    };
    
    test.same(
        utils.getValues(doc, keys),
        [
            1,
            2,
            3,
            4
        ]
    );
    
    test.done();
};

exports.getFormKeys = function(test) {
    test.same(
        utils.getFormKeys('PSMS'), 
        [
            'facility_id',
            'year',
            'month',
            [
                'quantity_dispensed', [
                    'la_6x1',
                    'la_6x2',
                    'cotrimoxazole',
                    'zinc',
                    'ors',
                    'eye_ointment'
                ]
            ],
            [
                'days_stocked_out', [
                    'la_6x1',
                    'la_6x2',
                    'cotrimoxazole',
                    'zinc',
                    'ors',
                    'eye_ointment'
                ]
            ]
        ]
    );
    
    test.done();
};