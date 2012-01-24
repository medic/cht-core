var smsparser = require('views/lib/smsparser'),
    smsforms = require('views/lib/smsforms');


exports.pscm_example_data = function (test) {
    var def = smsforms['PSCM'];
    var doc = {
        sent_timestamp: '12-10-11 09:00',
        from: '+15551212',
        message: '1!PSCM!2012#12#20#aaaaaaaaaaaaaaaaaa#dddddddddddd#gggggggggggggggggggg#1#333#111#222#333#444#555#666#777#888#999#111#222#333#444#555#665#221#774#445#111'
    };

    test.expect(2);

    var obj = smsparser.parse(def, doc);
    var expectedObj = {
        synthese_year: '2012',
        synthese_month: '12',
        synthese_district: 20,
        synthese_area: 'aaaaaaaaaaaaaaaaaa',
        synthese_village: 'dddddddddddd',
        synthese_chw: 'gggggggggggggggggggg',
        synthese_resident: 1,
        synthese_v1: 333,
        synthese_v2: 111,
        synthese_v3: 222,
        synthese_v4: 333,
        synthese_v5: 444,
        synthese_t1: 555,
        synthese_t2: 666,
        synthese_t3: 777,
        synthese_r1: 888,
        synthese_r2: 999,
        synthese_r3: 111,
        synthese_r4: 222,
        synthese_r5: 333,
        synthese_a1: 444,
        synthese_a2: 555,
        synthese_s1: 665,
        synthese_s2: 221,
        synthese_b1: 774,
        synthese_b2: 445,
        synthese_d1: 111
    };

    //console.log(obj);
    //console.log(expectedObj);

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray(def, doc);
    var expectedArr = ['12-10-11 09:00', '+15551212', '2012', '12', 20, 'aaaaaaaaaaaaaaaaaa', 'dddddddddddd', 'gggggggggggggggggggg', 1, 333, 111, 222, 333, 444, 555, 666, 777, 888, 999, 111, 222, 333, 444, 555, 665, 221, 774, 445, 111];

    test.same(arr, expectedArr);

    test.done();
};
