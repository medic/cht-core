var _ = require('underscore'),
    proxyquire = require('proxyquire').noCallThru(),
    definitions = require('../../form_definitions');

var info = proxyquire('../../../../packages/kujua-sms/views/lib/appinfo', {
    'cookies': {},
    'views/lib/app_settings': require('../../../../packages/kujua-sms/views/lib/app_settings'),
    'duality/utils': { getBaseURL: function() {} },
    'underscore': _
});
var kujua_utils = proxyquire('../../../../packages/kujua-utils/kujua-utils', {
    'cookies': {}
});
var utils = proxyquire('../../../../packages/kujua-sms/kujua-sms/utils', {
    'kujua-utils': kujua_utils,
    'views/lib/objectpath': {},
    'views/lib/appinfo': info
});

var example_doc = {
    _id: '61716f96177206326cc07653ab9659c7',
    _rev: '2-03adf0258d78fbbd831d35193c53ce0f',
    type: 'data_record',
    from: '+13125551212',
    form: 'YYYY',
    related_entities: {
        clinic: {
            _id: '4a6399c98ff78ac7da33b639ed60f458',
            _rev: '1-0b8990a46b81aa4c5d08c4518add3786',
            type: 'clinic',
            name: 'Example clinic 1',
            contact: {
                name: 'Sam Jones',
                phone: '+13125551212'
            },
            parent: {
                type: 'health_center',
                name: 'HC1',
                contact: {
                    name: 'Neal Young',
                    phone: '+17085551212'
                },
                parent: {
                    type: 'district_hospital',
                    name: 'Zomba',
                    contact: {
                        name: 'Bernie Mac',
                        phone: '+14155551212'
                    }
                }
            }
        }
    },
    errors: [],
    tasks: [],
    scheduled_tasks: [],
    fields: {
        facility_id: 'facility',
        year: '2011',
        month: '11',
        misoprostol_administered: false,
        quantity_dispensed: {
            la_6x1: 1,
            la_6x2: 2,
            cotrimoxazole: 3,
            zinc: 4,
            ors: 5,
            eye_ointment: 6
        },
        days_stocked_out: {
            la_6x1: 9,
            la_6x2: 8,
            cotrimoxazole: 7,
            zinc: 6,
            ors: 5,
            eye_ointment: 4
        },
    },
    sms_message: {
        from: '+13125551212',
        message: '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4',
        sent_timestamp: '1-19-12 18:45',
        sent_to: '+15551212',
        type: 'sms_message',
        locale: 'en',
        form: 'YYYY'
    },
    reported_date: 1331643982002
};

exports.setUp = function (callback) {
    utils.info.translate = function(key, locale) {
        return key + '|' + locale;
    };
    utils.info.getForm = function(key) {
        return definitions.forms[key];
    };
    callback();
};

exports.tearDown = function(callback) {
    utils.info = info.getAppInfo();
    callback();
};

exports['function getabels'] = function(test) {
    test.expect(1);
    var keys = [
        '_id',
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
                    'name'
                ]
            ]
        ],
        [
            'related_entities', [
                'clinic', [
                    'parent', [
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
            'days_stocked_out', [
                'la_6x1',
                'la_6x2'
            ]
        ]
    ];

    test.same(
        utils.getLabels(keys, 'YYYY', 'fr'),
        [
            '_id|fr',
            'reported_date|fr',
            'from|fr',
            'Health Facility Identifier',
            'related_entities.clinic.contact.name|fr',
            'related_entities.clinic.name|fr',
            'related_entities.clinic.parent.name|fr',
            'related_entities.clinic.parent.parent.name|fr',
            'LA 6x1: Days stocked out',
            'LA 6x2: Days stocked out'
        ]
    );

    test.done();
};

exports['function getFormKeys'] = function(test) {
    test.expect(1);
    test.same(
        utils.getFormKeys(utils.info.getForm('YYYY')),
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


exports['function fieldsToHtml'] = function(test) {
    test.expect(1);
    var keys = utils.getFormKeys(utils.info.getForm('YYYY')),
        labels = utils.getLabels(keys, 'YYYY');

    var expected = {
      headers: [
        {
          head: 'Health Facility Identifier'
        },
        {
          head: 'Report Year'
        },
        {
          head: 'Report Month'
        },
        {
          head: 'Misoprostol?'
        },
        {
          head: 'Quantity Dispensed'
        },
        {
          head: 'Days Stocked Out'
        }
      ],
      data: [
        {
          isArray: false,
          value: 'facility',
          label: 'Health Facility Identifier'
        },
        {
          isArray: false,
          value: '2011',
          label: 'Report Year'
        },
        {
          isArray: false,
          value: '11',
          label: 'Report Month'
        },
        {
          isArray: false,
          value: 'False',
          label: 'Misoprostol?'
        },
        {
          headers: [
            {
              head: 'LA 6x1: Dispensed total'
            },
            {
              head: 'LA 6x2: Dispensed total'
            },
            {
              head: 'Cotrimoxazole: Dispensed total'
            },
            {
              head: 'Zinc: Dispensed total'
            },
            {
              head: 'ORS: Dispensed total'
            },
            {
              head: 'Eye Ointment: Dispensed total'
            }
          ],
          data: [
            {
              isArray: false,
              value: 1,
              label: 'LA 6x1: Dispensed total'
            },
            {
              isArray: false,
              value: 2,
              label: 'LA 6x2: Dispensed total'
            },
            {
              isArray: false,
              value: 3,
              label: 'Cotrimoxazole: Dispensed total'
            },
            {
              isArray: false,
              value: 4,
              label: 'Zinc: Dispensed total'
            },
            {
              isArray: false,
              value: 5,
              label: 'ORS: Dispensed total'
            },
            {
              isArray: false,
              value: 6,
              label: 'Eye Ointment: Dispensed total'
            }
          ],
          isArray: true
        },
        {
          headers: [
            {
              head: 'LA 6x1: Days stocked out'
            },
            {
              head: 'LA 6x2: Days stocked out'
            },
            {
              head: 'Cotrimoxazole: Days stocked out'
            },
            {
              head: 'Zinc: Days stocked out'
            },
            {
              head: 'ORS: Days stocked out'
            },
            {
              head: 'Eye Ointment: Days stocked out'
            }
          ],
          data: [
            {
              isArray: false,
              value: 9,
              label: 'LA 6x1: Days stocked out'
            },
            {
              isArray: false,
              value: 8,
              label: 'LA 6x2: Days stocked out'
            },
            {
              isArray: false,
              value: 7,
              label: 'Cotrimoxazole: Days stocked out'
            },
            {
              isArray: false,
              value: 6,
              label: 'Zinc: Days stocked out'
            },
            {
              isArray: false,
              value: 5,
              label: 'ORS: Days stocked out'
            },
            {
              isArray: false,
              value: 4,
              label: 'Eye Ointment: Days stocked out'
            }
          ],
          isArray: true
        }
      ]
    };

    var out = utils.fieldsToHtml(keys, labels, example_doc);
    test.same(expected, out);
    test.done();
};

exports['app_settings has defaults'] = function(test) {
    test.expect(1);
    test.same(Object.keys(utils.info).length > 10, true);
    test.done();
};

exports['getLabels for messages'] = function(test) {
    var keys = [
        '_id', 
        'reported_date', 
        'from',
        'related_entities.clinic.contact.name',
        'related_entities.clinic.name',
        'related_entities.clinic.parent.contact.name',
        'related_entities.clinic.parent.name',
        'related_entities.clinic.parent.parent.name'
    ];
    var labels = utils.getLabels(keys, 'null', 'en');

    /*
     * outgoing messages have a special export format to include the message
     * data in separate columns.
     * */
    test.equals(_.isArray(labels), true);
    test.same(labels, [
        '_id|en',
        'reported_date|en',
        'from|en',
        'related_entities.clinic.contact.name|en',
        'related_entities.clinic.name|en',
        'related_entities.clinic.parent.contact.name|en',
        'related_entities.clinic.parent.name|en',
        'related_entities.clinic.parent.parent.name|en'
    ]);
    test.done();
};

/*
 * YYYV labels use 'fr' locale, here we request 'en' labels that doesn't exist
 * on the form and get strings back instead of undefined.
 */
exports['labels missing locale'] = function(test) {
    test.expect(1);
    var keys = utils.getFormKeys(utils.info.getForm('YYYV')),
        labels = utils.getLabels(keys, 'YYYV', 'en');

    var expected = {
      headers: [
        {
          head: 'Identifier'
        },
        {
          head: 'Foo Bar'
        },
      ]
    };

    var out = utils.fieldsToHtml(keys, labels, example_doc);
    test.same(expected.headers, out.headers);
    test.done();
};

exports['no cookies or header; app_settings.locale default of en'] = function(test) {
    test.expect(1);
    var req = {},
        that = {app_settings: {locale:'en'}};

    var appinfo = info.getAppInfo.call(that, req);
    test.same(appinfo.locale, 'en');
    test.done();
};
