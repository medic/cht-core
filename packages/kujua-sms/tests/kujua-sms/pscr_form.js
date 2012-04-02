var smsparser = require('views/lib/smsparser'),
    smsforms = require('views/lib/smsforms');


exports.pscr_example_data = function (test) {
    var def = smsforms['PSCR'];
    var doc = {
        sent_timestamp: '12-10-11 09:00',
        from: '+15551212',
        message: '1!PSCR!2012#12#20#aaaaaaaaaaaa#000111222333#kkkkkkkkkkkkkkkkkkkk#333#111#222#444#555#555#555#666#888#999#222#333#444#333#2#555#555#2#665#221#1#111'
    };

    test.expect(2);

    var obj = smsparser.parse('PSCR', def, doc);
    var expectedObj = {
        synthese_year: '2012',
        synthese_month: '12',
        synthese_district: 20,
        synthese_area: 'aaaaaaaaaaaa',
        synthese_village_rc: '000111222333',
        synthese_name_rc: 'kkkkkkkkkkkkkkkkkkkk',
        synthese_v1: 333,
        synthese_v2: 111,
        synthese_v3: 222,
        synthese_v5: 444,
        synthese_t1: 555,
        synthese_t1a: 555,
        synthese_t1b: 555,
        synthese_t2: 666,
        synthese_r1: 888,
        synthese_r2: 999,
        synthese_r4: 222,
        synthese_r5: 333,
        synthese_a1d: 444,
        synthese_a1f: 333,
        generic_stockout1: "True",
        synthese_a2d: 555,
        synthese_a2f: 555,
        generic_stockout2: "True",
        synthese_sd: 665,
        synthese_sf: 221,
        generic_stockout3: "False",
        synthese_d1: 111
    };

    //console.log(obj);
    //console.log(expectedObj);

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray('PSCR', def, doc);
    var expectedArr = ['12-10-11 09:00', '+15551212', '2012', '12', 20, 'aaaaaaaaaaaa', '000111222333', 'kkkkkkkkkkkkkkkkkkkk', 333, 111, 222, 444, 555, 555, 555, 666, 888, 999, 222, 333, 444, 333, "True", 555, 555, "True", 665, 221, "False", 111];

    test.same(arr, expectedArr);

    test.done();
};
