var smsparser = require('views/lib/smsparser'),
    smsforms = require('views/lib/smsforms');


exports.pscq_example_data = function (test) {
    var def = smsforms['PSCQ'];
    var doc = {
        sent_timestamp: '12-11-12 08:00',
        from: '+15551212',
        message: '1!PSCQ!2013#2#20#aaaaaaaaaaaaaaaaaa#2222#1111#2222#3333#4444#5555#444#111#222#333#474#112#444#111#333#880#220#220#212#555#663#444#888#221#555'
    };
    var obj = smsparser.parse(def, doc);

    test.expect(2);

    var expectedObj = {
        supervision_year: '2013',
        supervision_trimester: 2,
        supervision_district: 20,
        supervision_area: 'aaaaaaaaaaaaaaaaaa',
        supervision_a1r: 2222,
        supervision_a2r: 1111,
        supervision_a3r: 2222,
        supervision_a1dist: 3333,
        supervision_a2dist: 4444,
        supervision_a3dist: 5555,
        supervision_a1disp: 444,
        supervision_a2disp: 111,
        supervision_a3disp: 222,
        supervision_r1: 333,
        supervision_r2: 474,
        supervision_r3: 112,
        supervision_r4: 444,
        supervision_r5: 111,
        supervision_r6: 333,
        supervision_r7: 880,
        supervision_p1: 220,
        supervision_p2: 220,
        supervision_p3: 212,
        supervision_p4: 555,
        supervision_v1: 663,
        supervision_v2: 444,
        supervision_v3: 888,
        supervision_t1: 221,
        supervision_t2: 555,
        supervision_ref1: null,
        supervision_ref2: null,
        supervision_d1: null
    };

    //console.log(obj);
    //console.log(expectedObj);

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray(def, doc);
    var expectedArr = ['12-11-12 08:00', '+15551212', '2013', 2, 20, 'aaaaaaaaaaaaaaaaaa', 2222, 1111, 2222, 3333, 4444, 5555, 444, 111, 222, 333, 474, 112, 444, 111, 333, 880, 220, 220, 212, 555, 663, 444, 888, 221, 555, null, null, null];

    test.same(arr, expectedArr);

    test.done();
};
