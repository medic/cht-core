var template = require('../../lib/template'),
    config = require('../../config'),
    sinon = require('sinon').sandbox.create(),
    moment = require('moment');

exports.tearDown = function(callback) {
  sinon.restore();
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

exports['renders string dates'] = function(test) {
  var format = 'DD-MMM-YYYY';
  var date = '2016-03-06T03:45:41.000Z';
  var get = sinon.stub(config, 'get').returns(format);
  var input = '{{#date}}{{reported_date}}{{/date}}';
  var context = { reported_date: date };
  var actual = template.render(input, context);
  test.equals(actual, moment(date).format(format));
  test.equals(get.callCount, 1);
  test.equals(get.args[0][0], 'date_format');
  test.done();
};

exports['renders integer dates'] = function(test) {
  var format = 'DD-MMM-YYYY';
  var date = 1457235941000;
  var get = sinon.stub(config, 'get').returns(format);
  var input = '{{#date}}{{reported_date}}{{/date}}';
  var context = { reported_date: date };
  var actual = template.render(input, context);
  test.equals(actual, moment(date).format(format));
  test.equals(get.callCount, 1);
  test.equals(get.args[0][0], 'date_format');
  test.done();
};

exports['renders integer datetime'] = function(test) {
  var format = 'DD-MMMM-YYYY HH:mm:ss';
  var date = 1457235941000;
  var get = sinon.stub(config, 'get').returns(format);
  var input = '{{#datetime}}{{reported_date}}{{/datetime}}';
  var context = { reported_date: date };
  var actual = template.render(input, context);
  test.equals(actual, moment(date).format(format));
  test.equals(get.callCount, 1);
  test.equals(get.args[0][0], 'reported_date_format');
  test.done();
};

exports['renders Date dates'] = function(test) {
  var format = 'DD-MMMM-YYYY';
  var date = 1457235941000;
  var get = sinon.stub(config, 'get').returns(format);
  var input = '{{#date}}Date({{reported_date}}){{/date}}';
  var context = { reported_date: date };
  var actual = template.render(input, context);
  test.equals(actual, moment(date).format(format));
  test.equals(get.callCount, 1);
  test.equals(get.args[0][0], 'date_format');
  test.done();
};

exports['renders Date datestimes'] = function(test) {
  var format = 'DD-MMMM-YYYY HH:mm:ss';
  var date = 1457235941000;
  var get = sinon.stub(config, 'get').returns(format);
  var input = '{{#datetime}}Date({{reported_date}}){{/datetime}}';
  var context = { reported_date: date };
  var actual = template.render(input, context);
  test.equals(actual, moment(date).format(format));
  test.equals(get.callCount, 1);
  test.equals(get.args[0][0], 'reported_date_format');
  test.done();
};

exports['renders bikram sambat dates'] = function(test) {
  var date = 1457235941000; // 06 Mar 2016 (gregorian) // २३ फाल्गुन २०७२ = 2072-11-23 (bs)
  var expected = '२३ फाल्गुन २०७२';
  var input = '{{#bikram_sambat_date}}{{reported_date}}{{/bikram_sambat_date}}';
  var context = { reported_date: date };
  var actual = template.render(input, context);
  test.equals(actual, expected);
  test.done();
};

exports['renders bikram sambat Date dates'] = function(test) {
  var date = 1457235941000; // 06 Mar 2016 (gregorian) // २०७२ फाल्गुन २३ = 2072-11-23 (bs)
  var expected = '२३ फाल्गुन २०७२';
  var input = '{{#bikram_sambat_date}}Date({{reported_date}}){{/bikram_sambat_date}}';
  var context = { reported_date: date };
  var actual = template.render(input, context);
  test.equals(actual, expected);
  test.done();
};
