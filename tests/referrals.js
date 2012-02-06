var updates = require('lib/updates'),
    lists = require('lib/lists');

var clinic = {"type":"clinic","name":"Example clinic 1","contact":{"name":"Sam Jones","phone":"+13125551212"},"location":{"_id":"35e3db9fd6828381edd6fd13721651a7","type":"location","name":"Example location","lat":0,"lon":0,"tags":[]},"parent":{"type":"health_center","name":"Chamba","contact":{"name":"Neil Young","phone":"+17084449999"},"location":{"_id":"94719188fd073af8903270a22735d7bf","type":"location","name":"Example location","lat":0,"lon":0,"tags":[]},"parent":{"_id":"94719188fd073af8903270a227325710","type":"district_hospital","name":"Zomba","contact":{"name":"Example contact","phone":"+14151112222"},"location":{"_id":"94719188fd073af8903270a22735ae7e","type":"location","name":"Example location","lat":0,"lon":0,"tags":[]},"parent":{"_id":"94719188fd073af8903270a22706bc6f","type":"national_office","name":"Malawi National Office","contact":{"name":"Example contact","phone":"+18037772222"},"description":"Example national office"}},"_id":"4a6399c98ff78ac7da33b639ed40da36"},"_id":"4a6399c98ff78ac7da33b639ed60f458"};

exports.get_recip_phone = function(test) {
    test.expect(4);

    // Clinic -> Health Center
    var ph1 = lists.getRecipientPhone('MSBR','+13125551212',clinic);
    test.same(ph1, '+17084449999');

    // Health Center -> Clinic
    var ph2 = lists.getRecipientPhone('MSBC','+17084449999',clinic);
    test.same(ph2, '+13125551212');

    // Hospital -> Health Center
    var ph3 = lists.getRecipientPhone('MSBC','+14151112222',clinic);
    test.same(ph3, '+17084449999');

    // Health Center -> Hospital
    var ph4 = lists.getRecipientPhone('MSBB','+17084449999',clinic);
    test.same(ph4, '+14151112222');

    test.done();
};
