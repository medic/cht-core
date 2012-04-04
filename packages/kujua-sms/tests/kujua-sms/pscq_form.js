var smsparser = require('views/lib/smsparser'),
    smsforms = require('views/lib/smsforms');


exports.pscq_example_data = function (test) {
    var def = smsforms['PSCQ'];
    var doc = {
        sent_timestamp: '12-11-12 08:00',
        from: '+15551212',
        message: '1!PSCQ!2013#2#20#aaaaaaaaaaaaaaaaaa#2222#3333#1#1111#1111#1#2222#2222#2#333#474#112#444#111#333#333#880#220#220#212#555#6633#4444#8888#2211#2211#2211#5555#222#444#22'
    };
    var obj = smsparser.parse('PSCQ', def, doc);

    test.expect(2);

    var expectedObj = {
        supervision_year: '2013',
        supervision_trimester: 2,
        supervision_district: 20,
        supervision_area: 'aaaaaaaaaaaaaaaaaa',
        supervision_a1r: 2222,
        supervision_a1disp: 3333,
        generic_stockout1: 'False',
        supervision_a2r: 1111,
        supervision_a2disp: 1111,
        generic_stockout2: 'False',
        supervision_a3r: 2222,
        supervision_a3disp: 2222,
        generic_stockout3: 'True',
        supervision_r1: 333,
        supervision_r2: 474,
        supervision_r3: 112,
        supervision_r4: 444,
        supervision_r5: 111,
        supervision_r6: 333,
        supervision_r6b: 333,
        supervision_r7: 880,
        supervision_p1: 220,
        supervision_p2: 220,
        supervision_p3: 212,
        supervision_p4: 555,
        supervision_v1: 6633,
        supervision_v2: 4444,
        supervision_v3: 8888,
        supervision_t1: 2211,
        supervision_t1a: 2211,
        supervision_t1b: 2211,
        supervision_t2: 5555,
        supervision_ref1: 222,
        supervision_ref2: 444,
        supervision_d1: 22 
    };

    //console.log(obj);
    //console.log(expectedObj);

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray('PSCQ', def, doc);
    var expectedArr = ['12-11-12 08:00', '+15551212', '2013', 2, 20, 'aaaaaaaaaaaaaaaaaa', 2222, 3333, 'False', 1111, 1111, 'False', 2222, 2222, 'True', 333, 474, 112, 444, 111, 333, 333, 880, 220, 220, 212, 555, 6633, 4444, 8888, 2211, 2211, 2211, 5555, 222, 444, 22];

    test.same(arr, expectedArr);

    test.done();
};
