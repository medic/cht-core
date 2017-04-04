const isClientHuman = require('../../is-client-human');

exports.setUp = (callback) => callback();
exports.tearDown = (callback) => callback();

exports['should return true for browser UserAgent strings'] = (test) => {
  [
    // Firefox (OSX)
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:52.0) Gecko/20100101 Firefox/52.0',

    // Android browser
    'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    'Mozilla/5.0 (Linux; Android 5.1.1; hi6210sft Build/LMY47X) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/39.0.0.0 Mobile Safari/537.36',
  ].forEach((humanUserAgent) => {
    // given
    const req = mockRequestForUa(humanUserAgent);

    // expect
    test.equals(true, isClientHuman(req));
  });

  // finally
  test.done();
};

exports['should return false for gateway UserAgent strings'] = (test) => {
  [
    'Dalvik/2.1.0 (Linux; U; Android 5.1.1; hi6210sft Build/LMY47X) medic.gateway.alert.generic/SNAPSHOT',
  ].forEach((humanUserAgent) => {
    // given
    const req = mockRequestForUa(humanUserAgent);

    // expect
    test.equals(false, isClientHuman(req));
  });

  // finally
  test.done();
};

/**
 * Interestingly, ODK Collect and medic-collect do not supply a User-Agent
 * header with all requests.
 */
exports['should return false for collect UserAgent strings'] = (test) => {
  // given
  const req = mockRequestForUa(null);

  // expect
  test.equals(false, isClientHuman(req));

  // finally
  test.done();
};

exports['should return true for medic-android UserAgent strings'] = (test) => {
  [
    'Dalvik/2.1.0 (Linux; U; Android 5.1.1; hi6210sft Build/LMY47X)',
  ].forEach((humanUserAgent) => {
    // given
    const req = mockRequestForUa(humanUserAgent);

    // expect
    test.equals(true, isClientHuman(req));
  });

  // finally
  test.done();
};

function mockRequestForUa(uaString) {
  return {
    headers: {
      'user-agent': uaString,
    },
  };
}
