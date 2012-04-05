var utils = require('kujua-sms/utils'),
    smsforms = require('views/lib/smsforms');

exports.getLabels = function(test) {
    var keys = [
        'facility_id',
        [
            'related_entities', [
                'clinic', [
                    'contact',[
                        'name'
                    ]
                ]
            ]
        ],
        [
            'related_entities', [
                'clinic', [
                    'parent', [
                        'parent', [
                            'name'
                        ]
                    ]
                ]
            ]
        ],
        [
            "related_entities", [
                "clinic", [
                    "name"
                ]
            ]
        ],
        [
            "related_entities", [
                "clinic", [
                    "parent", [
                        "name"
                    ]
                ]
            ]
        ],
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
            'Name',
            'District',
            'Clinic',
            'Health Center',
            'LA 6x1: Days stocked out',
            'LA 6x2: Days stocked out'
        ]
    );
    
    test.done();
};

exports.getValues = function(test) {
    var keys = [
        "reported_date",
        "from",
        "facility_id",
        [
            "related_entities", [
                "clinic", [
                    "contact", [
                        "name"
                    ]
                ]
            ]
        ],        
        [
            "related_entities", [
                "clinic", [
                    "name"
                ]
            ]
        ],
        [
            "related_entities", [
                "clinic", [
                    "parent", [
                        "name"
                    ]
                ]
            ]
        ],
        [
            'related_entities', [
                'clinic', [
                    'parent', [
                        'parent', [
                            'name'
                        ]
                    ]
                ]
            ]
        ],
        "year",
        "month",
        [
            "quantity_dispensed", [
                "la_6x1",
                "la_6x2",
                "cotrimoxazole",
                "zinc",
                "ors",
                "eye_ointment"
            ]
        ],
        [
            "days_stocked_out", [
                "la_6x1",
                "la_6x2",
                "cotrimoxazole",
                "zinc",
                "ors",
                "eye_ointment"
            ]
        ]
    ];
    
    var doc = {
        "_id": "61716f96177206326cc07653ab9659c7",
        "_rev": "2-03adf0258d78fbbd831d35193c53ce0f",
        "type": "data_record_psi_malawi",
        "from": "+13125551212",
        "form": "PSMS",
        "related_entities": {
            "clinic": {
                "_id": "4a6399c98ff78ac7da33b639ed60f458",
                "_rev": "1-0b8990a46b81aa4c5d08c4518add3786",
                "type": "clinic",
                "name": "Example clinic 1",
                "contact": {
                    "name": "Sam Jones",
                    "phone": "+13125551212"
                },
                "parent": {
                    "type": "health_center",
                    "name": "HC1",
                    "contact": {
                        "name": "Neal Young",
                        "phone": "+17085551212"
                    },
                    "parent": {
                        "type": "district_hospital",
                        "name": "Zomba",
                        "contact": {
                            "name": "Bernie Mac",
                            "phone": "+14155551212"
                        }
                    }
                }
            }
        },
        "errors": [],
        "tasks": [],
        "facility_id": "facility",
        "year": "2011",
        "month": "11",
        "quantity_dispensed": {
            "la_6x1": 1,
            "la_6x2": 2,
            "cotrimoxazole": 3,
            "zinc": 4,
            "ors": 5,
            "eye_ointment": 6
        },
        "days_stocked_out": {
            "la_6x1": 9,
            "la_6x2": 8,
            "cotrimoxazole": 7,
            "zinc": 6,
            "ors": 5,
            "eye_ointment": 4
        },
        "sms_message": {
            "from": "+13125551212",
            "message": "1!PSMS!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4",
            "sent_timestamp": "1-19-12 18:45",
            "sent_to": "+15551212",
            "type": "sms_message",
            "locale": "en",
            "form": "PSMS"
        },
        "reported_date": 1331643982002
    };
    
    test.same(
        utils.getValues(doc, keys),
        [
            1331643982002,
            "+13125551212",
            "facility",
            "Sam Jones",
            "Example clinic 1",
            "HC1",
            "Zomba",
            "2011",
            "11",
            1,
            2,
            3,
            4,
            5,
            6,
            9,
            8,
            7,
            6,
            5,
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
