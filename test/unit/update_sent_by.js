var sinon = require('sinon'),
    fakedb = require('../fake-db'),
    fakeaudit = require('../fake-audit'),
    transition = require('../../transitions/update_sent_by');

exports.setUp = function(callback) {
    process.env.TEST_ENV = true;
    callback();
};

exports.tearDown = function(callback) {
    if (fakedb.medic.view.restore) {
        fakedb.medic.view.restore();
    }
    callback();
};

exports['updates sent_by to contact name if both available'] = function(test) {
    var doc = {
        from: '+34567890123'
    };
    sinon.stub(fakedb.medic, 'view').callsArgWith(3, null, {rows: [{ doc: {
       _id: '9ed7d9c6095cc0e37e4d3e94d3387ed9',
       _rev: '6-e447d8801d7bed36614af92449586851',
       type: 'clinic',
       name: 'Clinic',
       place_id: '1000',
       contact: {
           name: 'CCN',
           phone: '+34567890123'
       },
       parent: {
           _id: '9ed7d9c6095cc0e37e4d3e94d33866f1',
           _rev: '6-723dad2083c951501a1851fb88b6e3b5',
           type: 'health_center',
           name: 'Health Center',
           contact: {
               name: 'HCCN',
               phone: '+23456789012'
           },
           parent: {
               _id: '9ed7d9c6095cc0e37e4d3e94d3384c8f',
               _rev: '4-6e5f394413e840c1f41bf9f471a91e04',
               type: 'district_hospital',
               name: 'District',
               parent: {
               },
               contact: {
                   name: 'DCN',
                   phone: '+12345678901'
               }
           }
       }
    }}]});
    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function(err, changed) {
        test.ok(changed);
        test.equal(doc.sent_by, 'CCN');
        test.done();
    });
};

exports['updates sent_by to clinic name if contact name not available'] = function(test) {
    var doc = {
        from: '+34567890123'
    };

    var dbView = sinon.stub(fakedb.medic, 'view').callsArgWith(3, null, {
        rows: [
            {
                doc: {
                    name: 'Clinic',
                }
            }
        ]
    });

    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function(err, changed) {
        test.ok(changed);
        test.equal(doc.sent_by, 'Clinic');
        test.ok(dbView.calledOnce);
        test.done();
    });
};

exports['sent_by untouched if nothing available'] = function(test) {
    var doc = {
        from: 'unknown number'
    };
    sinon.stub(fakedb.medic, 'view').callsArgWith(3, null, {});
    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function(err, changed) {
        test.ok(!changed);
        test.strictEqual(doc.sent_by, undefined);
        test.done();
    });
};
