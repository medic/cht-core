var controller = require('../../../controllers/export-data'),
    db = require('../../../db'),
    config = require('../../../config'),
    fti = require('../../../controllers/fti'),
    childProcess = require('child_process'),
    JSZip = require('jszip'),
    sinon = require('sinon').sandbox.create(),
    moment = require('moment');

function readStream(dataHook, callback) {
  var data = '';

  dataHook(function(chunk) {
    data += chunk;
  }, function() {
    callback(data);
  });
}

exports.setUp = function(callback) {
  sinon.stub(config, 'translate').callsFake(function(key, locale) {
    return '{' + key + ':' + locale + '}';
  });
  callback();
};

exports.tearDown = function(callback) {
  sinon.restore();
  callback();
};

exports['get returns errors from getView'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, 'bang');
  controller.get({ type: 'messages' }, function(err) {
    test.equals(err, 'bang');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get handles empty db'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: []
  });
  controller.get({ type: 'messages' }, function(err, results) {
    test.equals(results, '{_id:en},{patient_id:en},{reported_date:en},{from:en},{contact.name:en},{contact.parent.name:en},{contact.parent.parent.contact.name:en},{contact.parent.parent.name:en},{contact.parent.parent.parent.name:en},{task.type:en},{task.state:en},{received:en},{scheduled:en},{pending:en},{sent:en},{cleared:en},{muted:en},{Message UUID:en},{Sent By:en},{To Phone:en},{Message Body:en}');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get formats responses'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        responses: [ { sent_by: '+123456789', message: 'hello' } ]
      } },
      { doc: {
        _id: 'def',
        patient_id: '654321',
        reported_date: 987654321,
        responses: [ { sent_by: '+987654321', message: 'hi' } ]
      } }
    ]
  });
  var expected = '{_id:en},{patient_id:en},{reported_date:en},{from:en},{contact.name:en},{contact.parent.name:en},{contact.parent.parent.contact.name:en},{contact.parent.parent.name:en},{contact.parent.parent.parent.name:en},{task.type:en},{task.state:en},{received:en},{scheduled:en},{pending:en},{sent:en},{cleared:en},{muted:en},{Message UUID:en},{Sent By:en},{To Phone:en},{Message Body:en}\n' +
                 'abc,123456,"02, Jan 1970, 10:17:36 +00:00",,,,,,,{Automated Reply:en},sent,,,,"02, Jan 1970, 10:17:36 +00:00",,,,+123456789,,hello\n' +
                 'def,654321,"12, Jan 1970, 10:20:54 +00:00",,,,,,,{Automated Reply:en},sent,,,,"12, Jan 1970, 10:20:54 +00:00",,,,+987654321,,hi';
  controller.get({ type: 'messages', tz: '0' }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get includes tasks and scheduled tasks'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        tasks: [
          { messages: [{ to: '+123456789', message: 'hello' }]},
          { messages: [{ to: '+123456788', message: 'goodbye' }]}
        ]
      } },
      { doc: {
        _id: 'def',
        patient_id: '654321',
        reported_date: 987654321,
        scheduled_tasks: [
          { messages: [{ to: '+223456789', message: 'hi' }]},
          { messages: [{ to: '+223456788', message: 'bye' }]}
        ]
      } }
    ]
  });
  var expected = '{_id:en},{patient_id:en},{reported_date:en},{from:en},{contact.name:en},{contact.parent.name:en},{contact.parent.parent.contact.name:en},{contact.parent.parent.name:en},{contact.parent.parent.parent.name:en},{task.type:en},{task.state:en},{received:en},{scheduled:en},{pending:en},{sent:en},{cleared:en},{muted:en},{Message UUID:en},{Sent By:en},{To Phone:en},{Message Body:en}\n' +
                 'abc,123456,"02, Jan 1970, 10:17:36 +00:00",,,,,,,{Task Message:en},,,,,,,,,,+123456789,hello\n' +
                 'abc,123456,"02, Jan 1970, 10:17:36 +00:00",,,,,,,{Task Message:en},,,,,,,,,,+123456788,goodbye\n' +
                 'def,654321,"12, Jan 1970, 10:20:54 +00:00",,,,,,,{Task Message:en},,,,,,,,,,+223456789,hi\n' +
                 'def,654321,"12, Jan 1970, 10:20:54 +00:00",,,,,,,{Task Message:en},,,,,,,,,,+223456788,bye';
  controller.get({ type: 'messages', tz: '0' }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get formats incoming messages'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        from: '+123456789',
        sms_message: { message: 'hello' }
      } },
      { doc: {
        _id: 'def',
        patient_id: '654321',
        reported_date: 987654321,
        from: '+987654321',
        sms_message: { message: 'hi' }
      } }
    ]
  });
  var expected = '{_id:en},{patient_id:en},{reported_date:en},{from:en},{contact.name:en},{contact.parent.name:en},{contact.parent.parent.contact.name:en},{contact.parent.parent.name:en},{contact.parent.parent.parent.name:en},{task.type:en},{task.state:en},{received:en},{scheduled:en},{pending:en},{sent:en},{cleared:en},{muted:en},{Message UUID:en},{Sent By:en},{To Phone:en},{Message Body:en}\n' +
                 'abc,123456,"02, Jan 1970, 10:17:36 +00:00",+123456789,,,,,,{sms_message.message:en},received,"02, Jan 1970, 10:17:36 +00:00",,,,,,,+123456789,,hello\n' +
                 'def,654321,"12, Jan 1970, 10:20:54 +00:00",+987654321,,,,,,{sms_message.message:en},received,"12, Jan 1970, 10:20:54 +00:00",,,,,,,+987654321,,hi';
  controller.get({ type: 'messages', tz: '0' }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get exports messages in xml'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        responses: [ { sent_by: '+123456789', message: 'hello' } ]
      } },
      { doc: {
        _id: 'hij',
        patient_id: '123456',
        reported_date: 123456789,
        tasks: [
          { messages: [{ to: '+123456789', message: 'hello' }]},
          { messages: [{ to: '+123456788', message: 'goodbye' }]}
        ]
      } },
      { doc: {
        _id: 'def',
        patient_id: '654321',
        reported_date: 987654321,
        scheduled_tasks: [
          { messages: [{ to: '+223456789', message: 'hi' }]},
          { messages: [{ to: '+223456788', message: 'bye' }]}
        ]
      } },
      { doc: {
        _id: 'klm',
        patient_id: '654321',
        reported_date: 987654321,
        from: '+987654321',
        sms_message: { message: 'hi' }
      } }
    ]
  });
  var expected =  '<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:html="http://www.w3.org/TR/REC-html140" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><?mso-application progid="Excel.Sheet"?><Worksheet ss:Name="{Messages:en}"><Table>' +
                    '<Row><Cell><Data ss:Type="String">{_id:en}</Data></Cell><Cell><Data ss:Type="String">{patient_id:en}</Data></Cell><Cell><Data ss:Type="String">{reported_date:en}</Data></Cell><Cell><Data ss:Type="String">{from:en}</Data></Cell><Cell><Data ss:Type="String">{contact.name:en}</Data></Cell><Cell><Data ss:Type="String">{contact.parent.name:en}</Data></Cell><Cell><Data ss:Type="String">{contact.parent.parent.contact.name:en}</Data></Cell><Cell><Data ss:Type="String">{contact.parent.parent.name:en}</Data></Cell><Cell><Data ss:Type="String">{contact.parent.parent.parent.name:en}</Data></Cell><Cell><Data ss:Type="String">{task.type:en}</Data></Cell><Cell><Data ss:Type="String">{task.state:en}</Data></Cell><Cell><Data ss:Type="String">{received:en}</Data></Cell><Cell><Data ss:Type="String">{scheduled:en}</Data></Cell><Cell><Data ss:Type="String">{pending:en}</Data></Cell><Cell><Data ss:Type="String">{sent:en}</Data></Cell><Cell><Data ss:Type="String">{cleared:en}</Data></Cell><Cell><Data ss:Type="String">{muted:en}</Data></Cell><Cell><Data ss:Type="String">{Message UUID:en}</Data></Cell><Cell><Data ss:Type="String">{Sent By:en}</Data></Cell><Cell><Data ss:Type="String">{To Phone:en}</Data></Cell><Cell><Data ss:Type="String">{Message Body:en}</Data></Cell></Row>' +
                    '<Row><Cell><Data ss:Type="String">abc</Data></Cell><Cell><Data ss:Type="String">123456</Data></Cell><Cell><Data ss:Type="String">02, Jan 1970, 10:17:36 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">{Automated Reply:en}</Data></Cell><Cell><Data ss:Type="String">sent</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">02, Jan 1970, 10:17:36 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">+123456789</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">hello</Data></Cell></Row>' +
                    '<Row><Cell><Data ss:Type="String">hij</Data></Cell><Cell><Data ss:Type="String">123456</Data></Cell><Cell><Data ss:Type="String">02, Jan 1970, 10:17:36 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">{Task Message:en}</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">+123456789</Data></Cell><Cell><Data ss:Type="String">hello</Data></Cell></Row>' +
                    '<Row><Cell><Data ss:Type="String">hij</Data></Cell><Cell><Data ss:Type="String">123456</Data></Cell><Cell><Data ss:Type="String">02, Jan 1970, 10:17:36 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">{Task Message:en}</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">+123456788</Data></Cell><Cell><Data ss:Type="String">goodbye</Data></Cell></Row><Row><Cell><Data ss:Type="String">def</Data></Cell><Cell><Data ss:Type="String">654321</Data></Cell><Cell><Data ss:Type="String">12, Jan 1970, 10:20:54 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">{Task Message:en}</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">+223456789</Data></Cell><Cell><Data ss:Type="String">hi</Data></Cell></Row><Row><Cell><Data ss:Type="String">def</Data></Cell><Cell><Data ss:Type="String">654321</Data></Cell><Cell><Data ss:Type="String">12, Jan 1970, 10:20:54 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">{Task Message:en}</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">+223456788</Data></Cell><Cell><Data ss:Type="String">bye</Data></Cell></Row><Row><Cell><Data ss:Type="String">klm</Data></Cell><Cell><Data ss:Type="String">654321</Data></Cell><Cell><Data ss:Type="String">12, Jan 1970, 10:20:54 +00:00</Data></Cell><Cell><Data ss:Type="String">+987654321</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">{sms_message.message:en}</Data></Cell><Cell><Data ss:Type="String">received</Data></Cell><Cell><Data ss:Type="String">12, Jan 1970, 10:20:54 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">+987654321</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">hi</Data></Cell></Row>' +
                  '</Table></Worksheet></Workbook>';
  controller.get({ type: 'messages', tz: '0', format: 'xml' }, function(err, streamFn) {
    readStream(streamFn, function(results) {
      test.equals(results, expected);
      test.equals(getView.callCount, 1);
      test.done();
    });
  });
};

exports['get exports reports in xml with each type on a separate tab'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        form: 'STCK',
        fields: {
          qty: 115,
          year: 2014
        }
      } },
      { doc: {
        _id: 'def',
        patient_id: '654321',
        reported_date: 987654321,
        form: 'V',
        fields: {
          status: 'ok'
        }
      } },
      { doc: {
        _id: 'hij',
        patient_id: '654321',
        reported_date: 987654321,
        form: 'STCK',
        fields: {
          qty: 3,
          year: 2015
        }
      } }
    ]
  });
  var configGet = sinon.stub(config, 'get').returns({
    V: {
      meta: {
        label: { en: 'Visits' }
      },
      fields: {
        status: { labels: { short: { en: 'Patient Status' } } }
      }
    },
    STCK: {
      meta: {
        label: { en: 'Stock Monitoring' }
      },
      fields: {
        qty: { labels: { short: { en: 'Quantity' } } },
        year: { labels: { short: { en: 'Year' } } }
      }
    }
  });
  var expected =  '<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:html="http://www.w3.org/TR/REC-html140" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><?mso-application progid="Excel.Sheet"?>' +
                    '<Worksheet ss:Name="{Reports:en}"><Table>' +
                      '<Row><Cell><Data ss:Type="String">{_id:en}</Data></Cell></Row>' +
                      '<Row><Cell><Data ss:Type="String">abc</Data></Cell></Row>' +
                      '<Row><Cell><Data ss:Type="String">def</Data></Cell></Row>' +
                      '<Row><Cell><Data ss:Type="String">hij</Data></Cell></Row>' +
                    '</Table></Worksheet>' +
                    '<Worksheet ss:Name="Stock Monitoring"><Table>' +
                      '<Row><Cell><Data ss:Type="String">{_id:en}</Data></Cell><Cell><Data ss:Type="String">Quantity</Data></Cell><Cell><Data ss:Type="String">Year</Data></Cell></Row>' +
                      '<Row><Cell><Data ss:Type="String">abc</Data></Cell><Cell><Data ss:Type="String">115</Data></Cell><Cell><Data ss:Type="String">2014</Data></Cell></Row>' +
                      '<Row><Cell><Data ss:Type="String">hij</Data></Cell><Cell><Data ss:Type="String">3</Data></Cell><Cell><Data ss:Type="String">2015</Data></Cell></Row>' +
                    '</Table></Worksheet>' +
                    '<Worksheet ss:Name="Visits"><Table>' +
                      '<Row><Cell><Data ss:Type="String">{_id:en}</Data></Cell><Cell><Data ss:Type="String">Patient Status</Data></Cell></Row>' +
                      '<Row><Cell><Data ss:Type="String">def</Data></Cell><Cell><Data ss:Type="String">ok</Data></Cell></Row>' +
                    '</Table></Worksheet>' +
                  '</Workbook>';
  controller.get({ type: 'forms', tz: '0', format: 'xml', columns: '[ "_id" ]' }, function(err, streamFn) {
    readStream(streamFn, function(results) {
      test.equals(results, expected);
      test.equals(getView.callCount, 1);
      test.equals(configGet.callCount, 2);
      test.done();
    });
  });
};

exports['if form definition not found then cannot add specific columns'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        form: 'STCK',
        fields: {
          qty: 115,
          year: 2014
        }
      } },
      { doc: {
        _id: 'def',
        patient_id: '654321',
        reported_date: 987654321,
        form: 'V',
        fields: {
          status: 'ok'
        }
      } },
      { doc: {
        _id: 'hij',
        patient_id: '654321',
        reported_date: 987654321,
        form: 'D',
        fields: {
          qty: 3,
          year: 2015
        }
      } }
    ]
  });
  var configGet = sinon.stub(config, 'get').returns({
    V: {
      meta: {
        label: { en: 'Visits' }
      },
      fields: {
        status: { labels: { short: { en: 'Patient Status' } } }
      }
    },
    STCK: {
      meta: {
        label: { en: 'Stock Monitoring' }
      },
      fields: {
        qty: { labels: { short: { en: 'Quantity' } } },
        year: { labels: { short: { en: 'Year' } } }
      }
    }
  });
  var expected =  '<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:html="http://www.w3.org/TR/REC-html140" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><?mso-application progid="Excel.Sheet"?>' +
                    '<Worksheet ss:Name="{Reports:en}"><Table>' +
                      '<Row><Cell><Data ss:Type="String">{_id:en}</Data></Cell></Row>' +
                      '<Row><Cell><Data ss:Type="String">abc</Data></Cell></Row>' +
                      '<Row><Cell><Data ss:Type="String">def</Data></Cell></Row>' +
                      '<Row><Cell><Data ss:Type="String">hij</Data></Cell></Row>' +
                    '</Table></Worksheet>' +
                    '<Worksheet ss:Name="D"><Table>' +
                      '<Row><Cell><Data ss:Type="String">{_id:en}</Data></Cell></Row>' +
                      '<Row><Cell><Data ss:Type="String">hij</Data></Cell></Row>' +
                    '</Table></Worksheet>' +
                    '<Worksheet ss:Name="Stock Monitoring"><Table>' +
                      '<Row><Cell><Data ss:Type="String">{_id:en}</Data></Cell><Cell><Data ss:Type="String">Quantity</Data></Cell><Cell><Data ss:Type="String">Year</Data></Cell></Row>' +
                      '<Row><Cell><Data ss:Type="String">abc</Data></Cell><Cell><Data ss:Type="String">115</Data></Cell><Cell><Data ss:Type="String">2014</Data></Cell></Row>' +
                    '</Table></Worksheet>' +
                    '<Worksheet ss:Name="Visits"><Table>' +
                      '<Row><Cell><Data ss:Type="String">{_id:en}</Data></Cell><Cell><Data ss:Type="String">Patient Status</Data></Cell></Row>' +
                      '<Row><Cell><Data ss:Type="String">def</Data></Cell><Cell><Data ss:Type="String">ok</Data></Cell></Row>' +
                    '</Table></Worksheet>' +
                  '</Workbook>';
  controller.get({ type: 'forms', tz: '0', format: 'xml', columns: '[ "_id" ]' }, function(err, streamFn) {
    readStream(streamFn, function(results) {
      test.equals(results, expected);
      test.equals(getView.callCount, 1);
      test.equals(configGet.callCount, 3);
      test.done();
    });
  });
};

exports['get uses locale param'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        responses: [ { sent_by: '+123456789', message: 'hello' } ]
      } }
    ]
  });

  var expected =  '{_id:fr};{patient_id:fr};{reported_date:fr};{from:fr};{contact.name:fr};{contact.parent.name:fr};{contact.parent.parent.contact.name:fr};{contact.parent.parent.name:fr};{contact.parent.parent.parent.name:fr};{task.type:fr};{task.state:fr};{received:fr};{scheduled:fr};{pending:fr};{sent:fr};{cleared:fr};{muted:fr};{Message UUID:fr};{Sent By:fr};{To Phone:fr};{Message Body:fr}\n' +
                  'abc;123456;02, Jan 1970, 10:17:36 +00:00;;;;;;;{Automated Reply:fr};sent;;;;02, Jan 1970, 10:17:36 +00:00;;;;+123456789;;hello';
  controller.get({ type: 'messages', tz: '0', locale: 'fr' }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get uses tz param'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        responses: [ { sent_by: '+123456789', message: 'hello' } ]
      } }
    ]
  });
  var expected =  '{_id:en},{patient_id:en},{reported_date:en},{from:en},{contact.name:en},{contact.parent.name:en},{contact.parent.parent.contact.name:en},{contact.parent.parent.name:en},{contact.parent.parent.parent.name:en},{task.type:en},{task.state:en},{received:en},{scheduled:en},{pending:en},{sent:en},{cleared:en},{muted:en},{Message UUID:en},{Sent By:en},{To Phone:en},{Message Body:en}\n' +
                  'abc,123456,"02, Jan 1970, 12:17:36 +02:00",,,,,,,{Automated Reply:en},sent,,,,"02, Jan 1970, 12:17:36 +02:00",,,,+123456789,,hello';
  controller.get({ type: 'messages', tz: '-120' }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get uses skip_header_row param'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        responses: [ { sent_by: '+123456789', message: 'hello' } ]
      } }
    ]
  });
  var expected = 'abc,123456,"02, Jan 1970, 10:17:36 +00:00",,,,,,,{Automated Reply:en},sent,,,,"02, Jan 1970, 10:17:36 +00:00",,,,+123456789,,hello';
  controller.get({ type: 'messages', tz: '0', skip_header_row: true }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get uses columns param'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        responses: [ { sent_by: '+123456789', message: 'hello' } ]
      } }
    ]
  });

  controller.get({ type: 'messages', tz: '0', columns: '["reported_date","from","contact.parent.name"]' }, function(err, results) {
    test.equals(results, '{reported_date:en},{from:en},{contact.parent.name:en},{Message UUID:en},{Sent By:en},{To Phone:en},{Message Body:en}\n"02, Jan 1970, 10:17:36 +00:00",,,,+123456789,,hello');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get uses filter state params'] = function(test) {
  test.expect(2);

  var reportedDate = 1331503842461;
  var pendingTimestampA = moment().subtract(21, 'days').valueOf();
  var pendingTimestampB = moment().subtract(20, 'days').valueOf();
  var pendingTimestampC = moment().subtract(10, 'days').valueOf();
  var pendingTimestampD = moment().subtract(9, 'days').valueOf();

  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      {
        doc: {
          _id: 'a',
          reported_date: reportedDate,
          from: '+12229990000',
          tasks: [{
            type: 'Test',
            state: 'pending',
            timestamp: pendingTimestampA,
            state_history: [{
              state: 'pending',
              timestamp: pendingTimestampA
            }]
          }]
        }
      },
      {
        doc: {
          _id: 'b',
          reported_date: reportedDate,
          from: '+12229990000',
          tasks: [{
            type: 'Test',
            state: 'pending',
            timestamp: pendingTimestampB,
            state_history: [{
              state: 'pending',
              timestamp: pendingTimestampB
            }]
          }]
        }
      },
      {
        doc: {
          _id: 'c',
          reported_date: reportedDate,
          from: '+12229990000',
          tasks: [{
            type: 'Test',
            state: 'pending',
            timestamp: pendingTimestampC,
            state_history: [{
              state: 'pending',
              timestamp: pendingTimestampC
            }]
          }]
        }
      },
      {
        doc: {
          _id: 'd',
          reported_date: reportedDate,
          from: '+12229990000',
          tasks: [{
            type: 'Test',
            state: 'pending',
            timestamp: pendingTimestampD,
            state_history: [{
              state: 'pending',
              timestamp: pendingTimestampD
            }]
          }]
        }
      },
      {
        doc: {
          _id: 'e',
          reported_date: reportedDate,
          from: '+12229990000',
          tasks: [{
            type: 'Test',
            state: 'pending',
            timestamp: pendingTimestampA,
            state_history: [{
              state: 'sent',
              timestamp: pendingTimestampB
            }]
          }]
        }
      }
    ]
  });

  controller.get({ type: 'messages', columns: '["_id"]', tz: '0', filter_state: 'pending', filter_state_from: '-20', filter_state_to: '-10' }, function(err, results) {
    test.equals(results, '{_id:en},{Message UUID:en},{Sent By:en},{To Phone:en},{Message Body:en}\nb\nc');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['get reports formats responses'] = function(test) {
  test.expect(6);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        form: 'STCK'
      } },
      { doc: {
        _id: 'def',
        patient_id: '654321',
        reported_date: 987654321,
        form: 'V'
      } }
    ]
  });
  var configGet = sinon.stub(config, 'get').returns({
    V: {
      meta: {
        label: { en: 'Visits' }
      },
      fields: {
        status: { labels: { short: { en: 'Patient Status' } } }
      }
    },
    STCK: {
      meta: {
        label: { en: 'Stock Monitoring' }
      },
      fields: {
        qty: { labels: { short: { en: 'Quantity' } } },
        year: { labels: { short: { en: 'Year' } } }
      }
    }
  });
  var expected = '{_id:en},{patient_id:en},{reported_date:en},{from:en},{contact.name:en},{contact.parent.name:en},{contact.parent.parent.contact.name:en},{contact.parent.parent.name:en},{contact.parent.parent.parent.name:en},{form:en}\n' +
                 'abc,123456,"02, Jan 1970, 10:17:36 +00:00",,,,,,,STCK\n' +
                 'def,654321,"12, Jan 1970, 10:20:54 +00:00",,,,,,,V';
  controller.get({ type: 'forms', tz: '0' }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.equals(getView.firstCall.args[1], 'data_records');
    test.same(getView.firstCall.args[2].startkey, [true, '*', {}]);
    test.same(getView.firstCall.args[2].endkey, [true, '*', 0]);
    test.equals(configGet.callCount, 2);
    test.done();
  });
};

exports['get reports filters by form'] = function(test) {
  test.expect(6);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        form: 'P',
        fields: {
          first: 'a',
          second: 'b'
        }
      } },
      { doc: {
        _id: 'def',
        patient_id: '654321',
        reported_date: 987654321,
        form: 'P',
        fields: {
          first: '1',
          second: '2'
        }
      } }
    ]
  });
  var configGet = sinon.stub(config, 'get').returns({
    P: {
      meta: {
        label: { en: 'Register' }
      },
      fields: {
        first: { labels: { short: { en: '1st' } } },
        second: { labels: { short: { en: '2nd' } } },
      }
    }
  });
  var expected = '{_id:en},{patient_id:en},{reported_date:en},{from:en},{contact.name:en},{contact.parent.name:en},{contact.parent.parent.contact.name:en},{contact.parent.parent.name:en},{contact.parent.parent.parent.name:en},1st,2nd\n' +
                 'abc,123456,"02, Jan 1970, 10:17:36 +00:00",,,,,,,a,b\n' +
                 'def,654321,"12, Jan 1970, 10:20:54 +00:00",,,,,,,1,2';
  controller.get({ type: 'forms', tz: '0', form: 'P' }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.equals(getView.firstCall.args[1], 'data_records');
    test.same(getView.firstCall.args[2].startkey, [true, 'P', {}]);
    test.same(getView.firstCall.args[2].endkey, [true, 'P', 0]);
    test.equals(configGet.callCount, 1);
    test.done();
  });
};

exports['get reports works for enketo reports'] = function(test) {
  test.expect(6);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'B87FEE75-D435-A648-BDEA-0A1B61021AA3',
        _rev: '3-e361f7bce1a97799b3265336a2e68f11',
        content: '<assessment id=\"assessment\" version=\"2015-11-23\">\n          <context>\n            <person/>\n          </context>\n          <inputs>\n            <meta>\n              <location>\n                <lat>0.3205433</lat>\n                <long>32.618088</long>\n              </location>\n            <deprecatedID/></meta>\n            <patient>\n              <_id>406701BD-7318-B2BB-AB23-8FF2DB83BB67</_id>\n              <name>Babyale Elaijah</name>\n              <date_of_birth>Oct 24, 2015</date_of_birth>\n            </patient>\n          </inputs>\n          <g_inputs>\n            <_id/>\n            <name/>\n            <date_of_birth/>\n          </g_inputs><outputs><patient_id>406701BD-7318-B2BB-AB23-8FF2DB83BB67</patient_id>\n            <patient_name>Babyale Elaijah</patient_name>\n            <patient_dob>Oct 24, 2015</patient_dob>\n            <measured_temperature>37.5</measured_temperature>\n            <symptom_cough>Cough for less than 3 days</symptom_cough>\n            <symptom_indrawn_chest/>\n            <symptom_fast_breathing/>\n            <symptom_diarrhea/>\n            <symptom_fever>Fever for less than 3 days</symptom_fever>\n            <symptom_malaria_test>Malaria: Positive</symptom_malaria_test>\n            <symptom_danger_signs>Danger signs</symptom_danger_signs>\n            <symptom_danger_signs_codes>unable_to_feed</symptom_danger_signs_codes>\n            <symptom_muac/>\n            <treatment_follow_up>true</treatment_follow_up>\n            <referral_follow_up>true</referral_follow_up>\n            <geolocation>0.3205433 32.618088</geolocation>\n          </outputs>\n          <patient_age_in_days>61</patient_age_in_days>\n          <patient_age_in_years>0.17</patient_age_in_years>\n          <patient_age_in_months>2</patient_age_in_months>\n          <patient_age_in_days_int>61</patient_age_in_days_int>\n          <patient_age_in_years_int>0</patient_age_in_years_int>\n          <patient_age_in_months_int>2</patient_age_in_months_int>\n          <patient_age_display>0 years and 2 months old</patient_age_display>\n          <p_note/>\n          <group_block>\n            <block_note1/>\n            <block_note2/>\n            <block_note3/>\n            <block>1</block>\n          </group_block>\n          <group_cough>\n            <patient_coughs>yes</patient_coughs>\n            <coughing_duration>3</coughing_duration>\n            <chest_indrawing>no</chest_indrawing>\n          </group_cough>\n          <group_breathing>\n            <breath_timer/>\n            <breath_note/>\n            <breath_count>47</breath_count>\n            <fast_breathing>false</fast_breathing>\n            <fast_breathing_note_true/>\n            <fast_breathing_note_false/>\n          </group_breathing>\n          <group_fever>\n            <patient_fever>yes</patient_fever>\n            <fever_note/>\n            <patient_temperature>37.5</patient_temperature>\n            <fever_duration>3</fever_duration>\n            <mrdt_result>positive</mrdt_result>\n          </group_fever>\n          <group_diarrhea>\n            <patient_diarrhea>no</patient_diarrhea>\n            <diarrhea_duration/>\n            <diarrhea_blood/>\n          </group_diarrhea>\n          <group_danger_signs>\n            <danger_signs>unable_to_feed</danger_signs>\n          </group_danger_signs>\n          <group_muac>\n            <muac/>\n            <muac_danger>no</muac_danger>\n            <muac_zone/>\n            <muac_note/>\n          </group_muac>\n          <group_diagnosis>\n            <diagnosis_cough>cough1</diagnosis_cough>\n            <diagnosis_diarrhea/>\n            <diagnosis_fever>malaria1</diagnosis_fever>\n            <r_summary/>\n            <r_symptom_cough/>\n            <r_symptom_indrawn_chest/>\n            <r_symptom_fast_breathing/>\n            <r_symptom_diarrhea/>\n            <r_symptom_fever/>\n            <r_symptom_malaria_test/>\n            <r_symptom_danger_signs/>\n            <r_symptom_muac/>\n            <r_symptom_none/>\n            <r_referral/>\n            <r_referral_cough/>\n            <r_referral_pneumonia/>\n            <r_referral_diarrhea/>\n            <r_referral_fever/>\n            <r_referral_malaria/>\n            <r_referral_danger_signs/>\n            <r_diagnosis/>\n            <r_diagnosis_cough/>\n            <r_diagnosis_pneumonia/>\n            <r_cough_cough_syrup/>\n            <r_cough_cough_syrup_1/>\n            <r_cough_cough_syrup_2/>\n            <r_cough_amox/>\n            <r_cough_amox_1/>\n            <r_cough_amox_2/>\n            <r_cough_instruction/>\n            <r_cough_instruction1/>\n            <r_cough_instruction2/>\n            <r_cough_instruction3/>\n            <r_cough_instruction4/>\n            <r_cough_instruction5/>\n            <r_diagnosis_diarrhea/>\n            <r_diarrhea_ors/>\n            <r_diarrhea_ors1/>\n            <r_diarrhea_ors2/>\n            <r_diarrhea_zinc/>\n            <r_diarrhea_zinc_1/>\n            <r_diarrhea_zinc_2/>\n            <r_diarrhea_instruction/>\n            <r_diarrhea_instructions1/>\n            <r_diarrhea_instructions2/>\n            <r_diarrhea_instructions3/>\n            <r_diarrhea_instructions4/>\n            <r_diarrhea_instructions5/>\n            <r_diagnosis_fever/>\n            <r_diagnosis_malaria/>\n            <r_fever_act/>\n            <r_fever_act_1/>\n            <r_fever_act_2/>\n            <r_fever_act_3/>\n            <r_fever_paracetamol/>\n            <r_fever_paracetamol_1/>\n            <r_fever_paracetamol_2/>\n            <r_fever_paracetamol_3/>\n            <r_fever_paracetamol_4/>\n            <r_fever_instruction/>\n            <r_fever_instructions1/>\n            <r_fever_instructions2/>\n            <r_fever_instructions3/>\n            <r_feeding/>\n            <r_feeding_note1/>\n            <r_feeding_note2/>\n            <r_feeding_note3/>\n            <r_followup_instructions>Follow up in 1 day to ensure that patient goes to a health facility</r_followup_instructions>\n            <r_followup/>\n            <r_followup_note/>\n          </group_diagnosis>\n          <meta>\n            <instanceID>uuid:7aae4aba-9280-465f-997f-fcc99f906d68</instanceID>\n          </meta>\n        </assessment>',
        fields: {
          patient_id: '406701BD-7318-B2BB-AB23-8FF2DB83BB67',
          patient_name: 'Babyale Elaijah',
          patient_dob: 'Oct 24, 2015',
          measured_temperature: '37.5',
          symptom_cough: 'Cough for less than 3 days',
          symptom_indrawn_chest: '',
          symptom_fast_breathing: '',
          symptom_diarrhea: '',
          symptom_fever: 'Fever for less than 3 days',
          symptom_malaria_test: 'Malaria: Positive',
          symptom_danger_signs: 'Danger signs',
          symptom_danger_signs_codes: 'unable_to_feed',
          symptom_muac: '',
          treatment_follow_up: 'true',
          referral_follow_up: 'true',
          geolocation: '0.3205433 32.618088'
        },
        form: 'assessment',
        type: 'data_record',
        content_type: 'xml',
        reported_date: 1450959150540,
        contact: {
          name: 'Victor',
          phone: '+256 787 123 456',
          code: '',
          notes: 'does this thing work?',
          parent: {
            type: 'health_center',
            name: 'Busia CHP Area1',
            parent: {
              _id: '6AC7CDAA-A9CB-2AC0-A4C6-5B27A714D5ED',
              _rev: '2-732e585b9a6fd606691369be73f6a501',
              type: 'district_hospital',
              name: 'Busia Branch',
              contact: {
                type: 'person',
                name: 'Busia Person',
                phone: '+254700123123'
              },
              external_id: '1234',
              parent: null,
              children: [
              ],
              contactFor: [
              ]
            },
            contact: {
              type: 'person',
              name: 'Busia CHP Area1 Person',
              phone: '+254702123123'
            },
            external_id: '1234',
            _id: '6850E77F-5FFC-9B01-8D5B-3D6E33DFA73E',
            _rev: '1-9ed31f1ee070eb64351c6f2a4f8dfe5c'
          },
          type: 'person',
          _id: 'DFEF75F5-4D25-EA47-8706-2B12500EFD8F',
          _rev: '1-4c6b5d0545c0aba0b5f9213cc29b4e14'
        },
        from: '+256 787 123 456',
        hidden_fields: [
        ]
      } }
    ]
  });
  // enketo forms aren't stored in app_settings
  var configGet = sinon.stub(config, 'get').returns({});
  var expected = '{_id:en},{contact._id:en},{fields.patient_id:en},{reported_date:en}\n' +
                 'B87FEE75-D435-A648-BDEA-0A1B61021AA3,DFEF75F5-4D25-EA47-8706-2B12500EFD8F,406701BD-7318-B2BB-AB23-8FF2DB83BB67,"24, Dec 2015, 12:12:30 +00:00"';
  controller.get({ type: 'forms', tz: '0', form: 'assessment', columns: '[ "_id", "contact._id", "fields.patient_id", "reported_date" ]' }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.equals(getView.firstCall.args[1], 'data_records');
    test.same(getView.firstCall.args[2].startkey, [true, 'assessment', {}]);
    test.same(getView.firstCall.args[2].endkey, [true, 'assessment', 0]);
    test.equals(configGet.callCount, 1);
    test.done();
  });
};

exports['get reports with query calls fti'] = function(test) {
  test.expect(9);
  var getView = sinon.stub(db.medic, 'view');
  var ftiGet = sinon.stub(fti, 'get').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        form: 'P'
      } },
      { doc: {
        _id: 'def',
        patient_id: '654321',
        reported_date: 987654321,
        form: 'P'
      } }
    ]
  });
  var configGet = sinon.stub(config, 'get').returns({
    P: {
      meta: {
        label: { en: 'Register' }
      },
      fields: {
        name: { labels: { short: { en: 'Name' } } }
      }
    }
  });
  var expected = '{_id:en},{patient_id:en},{reported_date:en},{from:en},{contact.name:en},{contact.parent.name:en},{contact.parent.parent.contact.name:en},{contact.parent.parent.name:en},{contact.parent.parent.parent.name:en},{form:en}\n' +
                 'abc,123456,"02, Jan 1970, 10:17:36 +00:00",,,,,,,P\n' +
                 'def,654321,"12, Jan 1970, 10:20:54 +00:00",,,,,,,P';
  controller.get({ type: 'forms', query: 'form:P', tz: '0' }, function(err, results) {
    test.equals(err, null);
    test.equals(results, expected);
    test.equals(getView.callCount, 0);
    test.equals(ftiGet.callCount, 1);
    test.equals(ftiGet.firstCall.args[0], 'data_records');
    test.equals(ftiGet.firstCall.args[1].q, 'form:P');
    test.equals(ftiGet.firstCall.args[1].sort, '\\reported_date<date>');
    test.equals(ftiGet.firstCall.args[1].include_docs, true);
    test.equals(configGet.callCount, 1);
    test.done();
  });
};

exports['get audit log'] = function(test) {
  test.expect(2);
  var list = sinon.stub(db.audit, 'list').callsArgWith(1, null, {
    rows: [
      { doc: {
        _id: 'abc',
        record_id: 'abc',
        history: [
          {
            doc: { type: 'data_record', number: 1 },
            timestamp: 12345678,
            user: 'gareth',
            action: 'update'
          },
          {
            doc: { type: 'data_record', number: 2 },
            timestamp: 12345655,
            user: 'milan',
            action: 'create'
          }
        ]
      } },
      { doc: {
        _id: 'def',
        record_id: 'def',
        history: [
          {
            doc: { type: 'feedback', description: 'broken' },
            timestamp: 12345679,
            user: 'gareth',
            action: 'create'
          }
        ]
      } }
    ]
  });
  var expected = '{_id:en},{Type:en},{Timestamp:en},{Author:en},{Action:en},{Document:en}\n' +
                 'abc,data_record,"01, Jan 1970, 03:25:45 +00:00",gareth,update,"{""type"":""data_record"",""number"":1}"\n' +
                 'abc,data_record,"01, Jan 1970, 03:25:45 +00:00",milan,create,"{""type"":""data_record"",""number"":2}"\n' +
                 'def,feedback,"01, Jan 1970, 03:25:45 +00:00",gareth,create,"{""type"":""feedback"",""description"":""broken""}"';
  controller.get({ type: 'audit', tz: '0' }, function(err, results) {
    test.equals(results, expected);
    test.equals(list.callCount, 1);
    test.done();
  });
};

exports['get audit log handles special characters'] = function(test) {
  test.expect(2);
  var list = sinon.stub(db.audit, 'list').callsArgWith(1, null, {
    rows: [
      { doc: {
        _id: 'def',
        record_id: 'def',
        history: [
          {
            doc: { type: 'feedback', description: '😎😎😎' },
            timestamp: 12345679,
            user: 'gareth',
            action: 'create'
          }
        ]
      } }
    ]
  });
  var expected = '<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:html="http://www.w3.org/TR/REC-html140" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><?mso-application progid="Excel.Sheet"?><Worksheet ss:Name="{Audit:en}"><Table><Row><Cell><Data ss:Type="String">{_id:en}</Data></Cell><Cell><Data ss:Type="String">{Type:en}</Data></Cell><Cell><Data ss:Type="String">{Timestamp:en}</Data></Cell><Cell><Data ss:Type="String">{Author:en}</Data></Cell><Cell><Data ss:Type="String">{Action:en}</Data></Cell><Cell><Data ss:Type="String">{Document:en}</Data></Cell></Row><Row><Cell><Data ss:Type="String">def</Data></Cell><Cell><Data ss:Type="String">feedback</Data></Cell><Cell><Data ss:Type="String">01, Jan 1970, 03:25:45 +00:00</Data></Cell><Cell><Data ss:Type="String">gareth</Data></Cell><Cell><Data ss:Type="String">create</Data></Cell><Cell><Data ss:Type="String">{"type":"feedback","description":"😎😎😎"}</Data></Cell></Row></Table></Worksheet></Workbook>';
  controller.get({ type: 'audit', tz: '0', format: 'xml' }, function(err, streamFn) {
    readStream(streamFn, function(results) {
      test.equals(results, expected);
      test.equals(list.callCount, 1);
      test.done();
    });
  });
};

exports['get feedback'] = function(test) {
  test.expect(5);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { doc: {
        _id: 'abc',
        meta: {
          time: 123456789,
          user: { name: 'gareth' },
          version: '4.3.0',
          url: '#/messages'
        },
        info: { description: 'Button doesnt work' },
        log: [ { error: 'undefined is not a function' }, { error: 'error calling function' } ]
      } },
      { doc: {
        _id: 'def',
        meta: {
          time: 423456755,
          user: { name: 'milan' },
          version: '4.2.0',
          url: '#/reports'
        },
        info: { description: 'Filters bar should be orange not yellow' }
      } }
    ]
  });

  var expected = '{_id:en},{reported_date:en},{User:en},{App Version:en},{URL:en},{Info:en}\n' +
                 'abc,"02, Jan 1970, 10:17:36 +00:00",gareth,4.3.0,#/messages,"{""description"":""Button doesnt work""}"\n' +
                 'def,"05, Jan 1970, 21:37:36 +00:00",milan,4.2.0,#/reports,"{""description"":""Filters bar should be orange not yellow""}"';
  controller.get({ type: 'feedback', tz: '0' }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.equals(getView.firstCall.args[1], 'feedback');
    test.same(getView.firstCall.args[2].startkey, [9999999999999, {}]);
    test.same(getView.firstCall.args[2].endkey, [0]);
    test.done();
  });
};

exports['get contacts'] = function(test) {
  test.expect(6);

  var contact2 = {
    _id: '2',
    type: 'district',
    name: 'dunedin'
  };
  var contact1 = {
    _id: '1',
    name: 'gdawg',
    type: 'person',
    parent: contact2
  };

  var ftiGet = sinon.stub(fti, 'get').callsArgWith(3, null, {
    rows: [ { doc: contact1 }, { doc: contact2 } ]
  });

  controller.get({ type: 'contacts', query: 'district:2', format: 'json', tz: '0' }, function(err, results) {
    test.deepEqual(JSON.parse(results), [ contact1, contact2 ]);
    test.equals(ftiGet.callCount, 1);
    test.equals(ftiGet.firstCall.args[0], 'contacts');
    test.equals(ftiGet.firstCall.args[1].q, 'district:2');
    test.equals(ftiGet.firstCall.args[1].sort, 'name');
    test.equals(ftiGet.firstCall.args[1].include_docs, true);
    test.done();
  });
};

exports['get logs returns error from child process'] = function(test) {

  var child = {
    on: sinon.stub(),
    stdout: { on: sinon.stub() },
    stdin: { end: sinon.stub() }
  };

  var spawn = sinon.stub(childProcess, 'spawn').returns(child);

  controller.get({ type: 'logs', format: 'zip' }, function(err) {
    test.equals(spawn.callCount, 1);
    test.equals(child.stdin.end.callCount, 1);
    test.equals(err.message, 'Log export exited with non-zero status 1');
    test.done();
  });

  child.on.firstCall.args[1](1);
};

exports['get logs returns zip file'] = function(test) {

  var child = {
    on: sinon.stub(),
    stdout: { on: sinon.stub() },
    stdin: { end: sinon.stub() }
  };

  var spawn = sinon.stub(childProcess, 'spawn').returns(child);

  controller.get({ type: 'logs', format: 'zip' }, function(err, results) {
    test.equals(spawn.callCount, 1);
    test.equals(child.stdin.end.callCount, 1);
    test.equals(spawn.firstCall.args[0], 'sudo');
    test.equals(spawn.firstCall.args[1][0], '/boot/print-logs');
    test.equals(spawn.firstCall.args[2].stdio, 'pipe');
    test.equals(err, null);
    new JSZip()
      .loadAsync(results)
      .then(function(zip) {
        return zip.file('server-logs-' + moment().format('YYYYMMDD') + '.md').async('string');
      })
      .then(function(result) {
        test.equals(result, 'helloworld');
        test.done();
      });
  });

  child.stdout.on.firstCall.args[1](new Buffer('hello', 'utf-8'));
  child.stdout.on.firstCall.args[1](new Buffer('world', 'utf-8'));
  child.on.firstCall.args[1](0);
};
