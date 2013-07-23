var utils = require('kujua-sms/utils'),
    jsonforms = require('views/lib/jsonforms');

utils.info = require('views/lib/appinfo').getAppInfo.call(this);

var example_doc = {
    "_id": "61716f96177206326cc07653ab9659c7",
    "_rev": "2-03adf0258d78fbbd831d35193c53ce0f",
    "type": "data_record",
    "from": "+13125551212",
    "form": "YYYY",
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
    "misoprostol_administered": false,
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
        "message": "1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4",
        "sent_timestamp": "1-19-12 18:45",
        "sent_to": "+15551212",
        "type": "sms_message",
        "locale": "en",
        "form": "YYYY"
    },
    "reported_date": 1331643982002
};

exports.getLabels = function(test) {
    test.expect(2);
    var keys = [
        'reported_date',
        'from',
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

    // english locale
    test.same(
        utils.getLabels(keys, 'YYYY', 'en'),
        [
            'Reported Date',
            'From',
            'Health Facility Identifier',
            'Clinic Contact Name',
            'District Hospital Name',
            'Clinic Name',
            'Health Center Name',
            'LA 6x1: Days stocked out',
            'LA 6x2: Days stocked out'
        ]
    );

    // french locale
    test.same(
        utils.getLabels(keys, 'YYYY', 'fr'),
        [
            "Date envoyé",
            "Envoyé par",
            "Health Facility Identifier",
            "Personne-ressource Clinique",
            "Nom de l'hôpital de district",
            "Villages",
            "Nom du centre de santé",
            "LA 6x1: Days stocked out",
            "LA 6x2: Days stocked out"
        ]
    );

    test.done();
};

exports.getValues_no_clinic = function(test) {
    test.expect(2);
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
    ];

    var example_doc = {
        reported_date: 1331643982002,
        from: "+13125551212",
        facility_id: "facility",
        related_entities: {
            clinic: null,
            health_center: {
                name: "Health Center One",
                type: "health_center",
                parent: {
                    name: "District One",
                    type: "district_hospital"
                }
            }
        }
    };

    // catch case where getValues returns extra undefined value for deep keys
    var actual = utils.getValues(example_doc, keys),
        expected = [
            1331643982002,
            "+13125551212",
            "facility",
            null,
            null,
            null,
            null
        ];

    test.same(actual.length, expected.length);
    test.same(actual, expected);
    test.done();
};

exports.getValuesUnits = function(test) {
    test.expect(8);

    var keys1 = ['foo', 'bar', 'baz'],
        doc1 = {foo: 1, bar: 2, baz: 3};
    test.same(
        utils.getValues(doc1, keys1),
        [1, 2, 3]
    );

    // check falsey values correctly pass through
    var keys1p1 = ['foo', 'bar', 'baz'],
        doc1p1 = {foo: 1, bar: 0, baz: false};
    test.same(
        utils.getValues(doc1p1, keys1p1),
        [1, 0, false]
    );

    // check true values correctly pass through
    var keys1p2 = ['foo', 'bar', 'baz'],
        doc1p2 = {foo: 1, bar: 0, baz: true};
    test.same(
        utils.getValues(doc1p2, keys1p2),
        [1, 0, true]
    );

    var keys2 = [['foo', ['bar', ['baz']]]],
        doc2 = {foo: { bar: { baz: 3}}};
    test.same(
        utils.getValues(doc2, keys2),
        [3]
    );

    // return single null value for array based key with broken path
    var keys2p1 = [['foo', ['bar', ['baz']]]],
        doc2p1 = {foo: { giraffe: { baz: 3}}};
    test.same(
        utils.getValues(doc2p1, keys2p1),
        [null]
    );

    // return null values for keys when sub-object is null
    var keys2p2 = [
        'foo',
        ['animals', ['narwhal', ['weight']]],
        ['animals', ['narwhal', ['horns']]]
    ];
    var doc2p2 = {
        animals: { narwhal: null },
        foo: 'bar'
    };
    test.same(
        utils.getValues(doc2p2, keys2p2),
        ['bar', null, null]
    );

    // return values for array of sub-object keys
    var keys3 = [['foo', ['bar', 'baz']]],
        doc3 = {foo: { bar: 1, baz: 2}};
    test.same(
        utils.getValues(doc3, keys3),
        [1 ,2]
    );

    // return null for array of sub-object key that is undefined
    var keys4 = [['foo', ['bar', 'giraffe']]],
        doc4 = {foo: { bar: 1, baz: 2}};
    test.same(
        utils.getValues(doc4, keys4),
        [1, null]
    );

    test.done();
};

exports.getValues = function(test) {
    test.expect(1);
    var keys = [
        "reported_date",
        "from",
        "facility_id",
        "misoprostol_administered",
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

    test.same(
        utils.getValues(example_doc, keys),
        [
            1331643982002,
            "+13125551212",
            "facility",
            false,
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
    test.expect(1);
    test.same(
        utils.getFormKeys('YYYY'),
        [
            'facility_id',
            'year',
            'month',
            'misoprostol_administered',
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


exports.fieldsToHtml = function(test) {
    test.expect(1);
    var keys = utils.getFormKeys('YYYY'),
        labels = utils.getLabels(keys, 'YYYY'),
        data_records = require('lib/data_records');



    var expected = {
      "headers": [
        {
          "head": "Health Facility Identifier"
        },
        {
          "head": "Report Year"
        },
        {
          "head": "Report Month"
        },
        {
          "head": "Misoprostol?"
        },
        {
          "head": "Quantity Dispensed"
        },
        {
          "head": "Days Stocked Out"
        }
      ],
      "data": [
        {
          "isArray": false,
          "value": "facility",
          "label": "Health Facility Identifier"
        },
        {
          "isArray": false,
          "value": "2011",
          "label": "Report Year"
        },
        {
          "isArray": false,
          "value": "11",
          "label": "Report Month"
        },
        {
          "isArray": false,
          "value": "False",
          "label": "Misoprostol?"
        },
        {
          "headers": [
            {
              "head": "LA 6x1: Dispensed total"
            },
            {
              "head": "LA 6x2: Dispensed total"
            },
            {
              "head": "Cotrimoxazole: Dispensed total"
            },
            {
              "head": "Zinc: Dispensed total"
            },
            {
              "head": "ORS: Dispensed total"
            },
            {
              "head": "Eye Ointment: Dispensed total"
            }
          ],
          "data": [
            {
              "isArray": false,
              "value": 1,
              "label": "LA 6x1: Dispensed total"
            },
            {
              "isArray": false,
              "value": 2,
              "label": "LA 6x2: Dispensed total"
            },
            {
              "isArray": false,
              "value": 3,
              "label": "Cotrimoxazole: Dispensed total"
            },
            {
              "isArray": false,
              "value": 4,
              "label": "Zinc: Dispensed total"
            },
            {
              "isArray": false,
              "value": 5,
              "label": "ORS: Dispensed total"
            },
            {
              "isArray": false,
              "value": 6,
              "label": "Eye Ointment: Dispensed total"
            }
          ],
          "isArray": true
        },
        {
          "headers": [
            {
              "head": "LA 6x1: Days stocked out"
            },
            {
              "head": "LA 6x2: Days stocked out"
            },
            {
              "head": "Cotrimoxazole: Days stocked out"
            },
            {
              "head": "Zinc: Days stocked out"
            },
            {
              "head": "ORS: Days stocked out"
            },
            {
              "head": "Eye Ointment: Days stocked out"
            }
          ],
          "data": [
            {
              "isArray": false,
              "value": 9,
              "label": "LA 6x1: Days stocked out"
            },
            {
              "isArray": false,
              "value": 8,
              "label": "LA 6x2: Days stocked out"
            },
            {
              "isArray": false,
              "value": 7,
              "label": "Cotrimoxazole: Days stocked out"
            },
            {
              "isArray": false,
              "value": 6,
              "label": "Zinc: Days stocked out"
            },
            {
              "isArray": false,
              "value": 5,
              "label": "ORS: Days stocked out"
            },
            {
              "isArray": false,
              "value": 4,
              "label": "Eye Ointment: Days stocked out"
            }
          ],
          "isArray": true
        }
      ]
    };

    var out = utils.fieldsToHtml(keys, labels, example_doc);
    test.same(expected, out);
    test.done();
};

exports.messages_invalid_custom = function (test) {
    test.expect(1);

    var err = {code:"sys.form_invalid_custom", form:"FOO", message:"Arg."};

    var resp = "The form sent 'FOO' was not properly completed. "
        + "Please complete it and resend. If this problem persists "
        + "contact your supervisor."

    test.same(utils.info.translate(err.code.replace('sys.','')), resp);
    test.done();
};
