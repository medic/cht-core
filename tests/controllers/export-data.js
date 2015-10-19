var controller = require('../../controllers/export-data'),
    db = require('../../db'),
    config = require('../../config'),
    fti = require('../../controllers/fti'),
    childProcess = require('child_process'),
    jszip = require('jszip'),
    sinon = require('sinon'),
    utils = require('../utils'),
    moment = require('moment');

exports.setUp = function(callback) {
  sinon.stub(config, 'translate', function(key, locale) {
    return '{' + key + ':' + locale + '}';
  });
  callback();
};

exports.tearDown = function(callback) {
  utils.restore(
    fti.get,
    db.medic.view,
    config.translate,
    config.get,
    childProcess.spawn
  );
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
  var expected =  '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:html="http://www.w3.org/TR/REC-html140" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="{Messages:en}"><Table>' +
                    '<Row><Cell><Data ss:Type="String">{_id:en}</Data></Cell><Cell><Data ss:Type="String">{patient_id:en}</Data></Cell><Cell><Data ss:Type="String">{reported_date:en}</Data></Cell><Cell><Data ss:Type="String">{from:en}</Data></Cell><Cell><Data ss:Type="String">{contact.name:en}</Data></Cell><Cell><Data ss:Type="String">{contact.parent.name:en}</Data></Cell><Cell><Data ss:Type="String">{contact.parent.parent.contact.name:en}</Data></Cell><Cell><Data ss:Type="String">{contact.parent.parent.name:en}</Data></Cell><Cell><Data ss:Type="String">{contact.parent.parent.parent.name:en}</Data></Cell><Cell><Data ss:Type="String">{task.type:en}</Data></Cell><Cell><Data ss:Type="String">{task.state:en}</Data></Cell><Cell><Data ss:Type="String">{received:en}</Data></Cell><Cell><Data ss:Type="String">{scheduled:en}</Data></Cell><Cell><Data ss:Type="String">{pending:en}</Data></Cell><Cell><Data ss:Type="String">{sent:en}</Data></Cell><Cell><Data ss:Type="String">{cleared:en}</Data></Cell><Cell><Data ss:Type="String">{muted:en}</Data></Cell><Cell><Data ss:Type="String">{Message UUID:en}</Data></Cell><Cell><Data ss:Type="String">{Sent By:en}</Data></Cell><Cell><Data ss:Type="String">{To Phone:en}</Data></Cell><Cell><Data ss:Type="String">{Message Body:en}</Data></Cell></Row>' +
                    '<Row><Cell><Data ss:Type="String">abc</Data></Cell><Cell><Data ss:Type="String">123456</Data></Cell><Cell><Data ss:Type="String">02, Jan 1970, 10:17:36 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">{Automated Reply:en}</Data></Cell><Cell><Data ss:Type="String">sent</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">02, Jan 1970, 10:17:36 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">+123456789</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">hello</Data></Cell></Row>' +
                    '<Row><Cell><Data ss:Type="String">hij</Data></Cell><Cell><Data ss:Type="String">123456</Data></Cell><Cell><Data ss:Type="String">02, Jan 1970, 10:17:36 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">{Task Message:en}</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">+123456789</Data></Cell><Cell><Data ss:Type="String">hello</Data></Cell></Row>' +
                    '<Row><Cell><Data ss:Type="String">hij</Data></Cell><Cell><Data ss:Type="String">123456</Data></Cell><Cell><Data ss:Type="String">02, Jan 1970, 10:17:36 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">{Task Message:en}</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">+123456788</Data></Cell><Cell><Data ss:Type="String">goodbye</Data></Cell></Row><Row><Cell><Data ss:Type="String">def</Data></Cell><Cell><Data ss:Type="String">654321</Data></Cell><Cell><Data ss:Type="String">12, Jan 1970, 10:20:54 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">{Task Message:en}</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">+223456789</Data></Cell><Cell><Data ss:Type="String">hi</Data></Cell></Row><Row><Cell><Data ss:Type="String">def</Data></Cell><Cell><Data ss:Type="String">654321</Data></Cell><Cell><Data ss:Type="String">12, Jan 1970, 10:20:54 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">{Task Message:en}</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">+223456788</Data></Cell><Cell><Data ss:Type="String">bye</Data></Cell></Row><Row><Cell><Data ss:Type="String">klm</Data></Cell><Cell><Data ss:Type="String">654321</Data></Cell><Cell><Data ss:Type="String">12, Jan 1970, 10:20:54 +00:00</Data></Cell><Cell><Data ss:Type="String">+987654321</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">{sms_message.message:en}</Data></Cell><Cell><Data ss:Type="String">received</Data></Cell><Cell><Data ss:Type="String">12, Jan 1970, 10:20:54 +00:00</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">+987654321</Data></Cell><Cell><Data ss:Type="String"/></Cell><Cell><Data ss:Type="String">hi</Data></Cell></Row>' +
                  '</Table></Worksheet></Workbook>';
  controller.get({ type: 'messages', tz: '0', format: 'xml' }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.done();
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
  var expected =  '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:html="http://www.w3.org/TR/REC-html140" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
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
  controller.get({ type: 'forms', tz: '0', format: 'xml', columns: '[ "_id" ]' }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.equals(configGet.callCount, 2);
    test.done();
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
  var expected =  '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:html="http://www.w3.org/TR/REC-html140" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
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
  controller.get({ type: 'forms', tz: '0', format: 'xml', columns: '[ "_id" ]' }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.equals(configGet.callCount, 3);
    test.done();
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
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
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
    test.equals(getView.callCount, 1);
    test.equals(getView.firstCall.args[1], 'audit_records_by_doc');
    test.done();
  });
};

exports['get audit log handles special characters'] = function(test) {
  test.expect(3);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
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
  var expected = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:html="http://www.w3.org/TR/REC-html140" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="{Audit:en}"><Table><Row><Cell><Data ss:Type="String">{_id:en}</Data></Cell><Cell><Data ss:Type="String">{Type:en}</Data></Cell><Cell><Data ss:Type="String">{Timestamp:en}</Data></Cell><Cell><Data ss:Type="String">{Author:en}</Data></Cell><Cell><Data ss:Type="String">{Action:en}</Data></Cell><Cell><Data ss:Type="String">{Document:en}</Data></Cell></Row><Row><Cell><Data ss:Type="String">def</Data></Cell><Cell><Data ss:Type="String">feedback</Data></Cell><Cell><Data ss:Type="String">01, Jan 1970, 03:25:45 +00:00</Data></Cell><Cell><Data ss:Type="String">gareth</Data></Cell><Cell><Data ss:Type="String">create</Data></Cell><Cell><Data ss:Type="String">{"type":"feedback","description":"😎😎😎"}</Data></Cell></Row></Table></Worksheet></Workbook>';
  controller.get({ type: 'audit', tz: '0', format: 'xml' }, function(err, results) {
    test.equals(results, expected);
    test.equals(getView.callCount, 1);
    test.equals(getView.firstCall.args[1], 'audit_records_by_doc');
    test.done();
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

  var expected = '{_id:en},{reported_date:en},{User:en},{App Version:en},{URL:en},{Info:en},{Log:en}\n' +
                 'abc,"02, Jan 1970, 10:17:36 +00:00",gareth,4.3.0,#/messages,"{""description"":""Button doesnt work""}","[{""error"":""undefined is not a function""},{""error"":""error calling function""}]"\n' +
                 'def,"05, Jan 1970, 21:37:36 +00:00",milan,4.2.0,#/reports,"{""description"":""Filters bar should be orange not yellow""}",';
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
    var result = new jszip()
      .load(results)
      .file('server-logs-' + moment().format('YYYYMMDD') + '.md')
      .asText();
    test.equals(result, 'helloworld');
    test.done();
  });

  child.stdout.on.firstCall.args[1](new Buffer('hello', 'utf-8'));
  child.stdout.on.firstCall.args[1](new Buffer('world', 'utf-8'));
  child.on.firstCall.args[1](0);
};