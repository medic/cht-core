const recordUtils = require('../../../controllers/record-utils');

const process = timestamp => {
  const body = {
    from: '+888',
    message: 'hmm this is test',
    sent_timestamp: timestamp
  };
  const doc = recordUtils.createByForm(body);
  return new Date(doc.reported_date);
};

exports['timestamp parsing without seconds'] = test => {
  const actual = process( '01-19-12 18:45');
  test.equals(actual.getMilliseconds(), 0);
  test.equals(actual.getSeconds(), 0);
  test.done();
};

exports['timestamp parsing boundaries'] = test => {
  const actual = process( '1-9-99 8:45:59');
  test.equals(actual.getMilliseconds(), 0);
  test.equals(actual.getSeconds(), 59);
  test.equals(actual.getFullYear(), 2099);
  test.equals(actual.getMonth(), 0);
  test.equals(actual.getDate(), 9);
  test.equals(actual.getHours(), 8);
  test.equals(actual.getMinutes(), 45);
  test.done();
};

exports['timestamp parsing with seconds'] = test => {
  const actual = process( '01-19-12 18:45:59');
  test.equals(actual.getMilliseconds(), 0);
  test.equals(actual.getSeconds(), 59);
  test.done();
};

exports['ms since epoch'] = test => {
  const actual = process('1352659197736');
  test.equals(actual.getMilliseconds(), 736);
  test.equals(actual.getSeconds(), 57);
  test.done();
};

exports['support moment.js compat dates'] = test => {
  const actual = process('Apr 11, 2021 18:00 +0800');
  test.equals(actual.valueOf(), 1618135200000);
  test.done();
};

