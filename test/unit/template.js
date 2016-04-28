var template = require('../../lib/template'),
    config = require('../../config'),
    sinon = require('sinon');

exports.tearDown = function(callback) {
  if (config.get.restore) {
    config.get.restore();
  }
  callback();
};

exports['renders plain text'] = function(test) {
  var actual = template.render('hello', {});
  test.equals(actual, 'hello');
  test.done();
};

exports['renders variables'] = function(test) {
  var actual = template.render('hello {{name}}', { name: 'george' });
  test.equals(actual, 'hello george');
  test.done();
};

exports['renders dates'] = function(test) {
  var get = sinon.stub(config, 'get').returns('DD-MMM-YYYY');
  var input = 'reported on {{#date}}{{reported_date}}{{/date}}';
  var context = { reported_date: 1457235941000 };
  var actual = template.render(input, context);
  test.equals(actual, 'reported on 06-Mar-2016');
  test.equals(get.callCount, 1);
  test.equals(get.args[0][0], 'date_format');
  test.done();
};

exports['renders datetimes'] = function(test) {
  var get = sinon.stub(config, 'get').returns('DD-MMMM-YYYY HH:mm:ss');
  var input = 'reported on {{#datetime}}{{reported_date}}{{/datetime}}';
  var context = { reported_date: 1457235941000 };
  var actual = template.render(input, context);
  test.equals(actual, 'reported on 06-March-2016 16:45:41');
  test.equals(get.callCount, 1);
  test.equals(get.args[0][0], 'reported_date_format');
  test.done();
};

exports['renders dates when given Date objects'] = function(test) {
  var get = sinon.stub(config, 'get').returns('DD-MMMM-YYYY');
  var input = 'reported on {{#date}}Date({{reported_date}}){{/date}}';
  var context = { reported_date: 1457235941000 };
  var actual = template.render(input, context);
  test.equals(actual, 'reported on 06-March-2016');
  test.equals(get.callCount, 1);
  test.equals(get.args[0][0], 'date_format');
  test.done();
};

exports['renders datestimes when given Date objects'] = function(test) {
  var get = sinon.stub(config, 'get').returns('DD-MMMM-YYYY HH:mm:ss');
  var input = 'reported on {{#datetime}}Date({{reported_date}}){{/datetime}}';
  var context = { reported_date: 1457235941000 };
  var actual = template.render(input, context);
  test.equals(actual, 'reported on 06-March-2016 16:45:41');
  test.equals(get.callCount, 1);
  test.equals(get.args[0][0], 'reported_date_format');
  test.done();
};