const chai = require('chai');
const isClientHuman = require('../../src/is-client-human');

describe('is client human', () => {

  const mockRequestForUa = uaString => ({ headers: { 'user-agent': uaString } });

  it('should return true for browser UserAgent strings', () => {
    [
      // Firefox (OSX)
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:52.0) Gecko/20100101 Firefox/52.0',

      // Android browser
      'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) ' +
      'Version/4.0 Mobile Safari/534.30',
      
      'Mozilla/5.0 (Linux; Android 5.1.1; hi6210sft Build/LMY47X) AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Version/4.0 Chrome/39.0.0.0 Mobile Safari/537.36',
    ].forEach((humanUserAgent) => {
      // given
      const req = mockRequestForUa(humanUserAgent);

      // expect
      chai.expect(isClientHuman(req)).to.equal(true);
    });
  });

  it('should return false for gateway UserAgent strings', () => {
    [
      'Dalvik/2.1.0 (Linux; U; Android 5.1.1; hi6210sft Build/LMY47X) medic.gateway.alert.generic/SNAPSHOT',
    ].forEach((humanUserAgent) => {
      // given
      const req = mockRequestForUa(humanUserAgent);

      // expect
      chai.expect(isClientHuman(req)).to.equal(false);
    });
  });

  /**
   * Old builds of ODK Collect and medic-collect do not supply a User-Agent
   * header.  This was fixed as March/April 2017.
   */
  it('should return false for empty UserAgent strings', () => {
    // given
    const req = mockRequestForUa(null);

    // expect
    chai.expect(false).to.equal(isClientHuman(req));
  });

  it('should return false for medic-collect UserAgent strings', () => {
    [
      'Dalvik/2.1.0 (Linux; U; Android 5.1.1; hi6210sft Build/LMY47X)' +
        'org.medicmobile.collect.android/SNAPSHOT',
      'Dalvik/2.1.0 (Linux; U; Android 5.1.1; hi6210sft Build/LMY47X)' +
        'org.medicmobile.collect.android.amrefsenegal/1.2.3',
      'Dalvik/2.1.0 (Linux; U; Android 5.1.1; hi6210sft Build/LMY47X)' +
        'org.medicmobile.collect.android.christianaidsr/4.5.6',
      'Dalvik/2.1.0 (Linux; U; Android 5.1.1; hi6210sft Build/LMY47X)' +
        'org.medicmobile.collect.android.demo/SNAPSHOT',
      'Dalvik/2.1.0 (Linux; U; Android 5.1.1; hi6210sft Build/LMY47X)' +
        'org.medicmobile.collect.android.intrahealthsenegal/SNAPSHOT',
      'Dalvik/2.1.0 (Linux; U; Android 5.1.1; hi6210sft Build/LMY47X)' +
        'org.medicmobile.collect.android.ipasnigeria/SNAPSHOT',
      'Dalvik/2.1.0 (Linux; U; Android 5.1.1; hi6210sft Build/LMY47X)' +
        'org.medicmobile.collect.android.queens/SNAPSHOT',
      'Dalvik/2.1.0 (Linux; U; Android 5.1.1; hi6210sft Build/LMY47X)' +
        'org.medicmobile.collect.android.strongminds/SNAPSHOT',
    ].forEach((humanUserAgent) => {
      // given
      const req = mockRequestForUa(humanUserAgent);

      // expect
      chai.expect(isClientHuman(req)).to.equal(false);
    });
  });

  it('should return false for ODK Collect UserAgent strings', () => {
    [
      'Dalvik/2.1.0 (Linux; U; Android 5.1.1; hi6210sft Build/LMY47X)' +
        'org.odk.collect.android/v1.5.1-10-ge20fa334-dirty',
    ].forEach((humanUserAgent) => {
      // given
      const req = mockRequestForUa(humanUserAgent);

      // expect
      chai.expect(isClientHuman(req)).to.equal(false);
    });
  });

  it('should return true for medic-android UserAgent strings', () => {
    [
      'Dalvik/2.1.0 (Linux; U; Android 5.1.1; hi6210sft Build/LMY47X)',
    ].forEach((humanUserAgent) => {
      // given
      const req = mockRequestForUa(humanUserAgent);

      // expect
      chai.expect(isClientHuman(req)).to.equal(true);
    });
  });

});
