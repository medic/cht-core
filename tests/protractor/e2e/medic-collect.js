const assert = require('chai').assert,
    tls = require('tls'),
    host = environment.apiHost,
    port = environment.apiPort,
    dbName = environment.dbName;

describe('medic-collect', () => {

  describe('without User-Agent header', () => {

    it('is prompted for auth details', () => {

      // when
      return rawHttpRequest(

`HEAD /${dbName}/_design/medic/_rewrite/add?deviceID=imei%3A357578064823168 HTTP/1.1
X-OpenRosa-Version: 1.0
Date: Tue, 11 Apr 2017 06:34:21 CEST
Host: ${host}:${port}
Connection: close

`).then((res) => {

        // then
        assert.equals(res.statusCode, 401);
        assert.equals(res.headers['WWW-Authenticate'], 'Basic realm="Medic Mobile Web Services"');

      });

    });

    it('can request a list of forms', (done) => {
      done('TODO');
    });

    it('can request a specific form', (done) => {
      done('TODO');
    });

    it('can submit a form response', (done) => {
      done('TODO');
    });

  });

  // TODO repeat the tests _with_ a ua, such as:
  // User-Agent: Dalvik/1.6.0 (Linux; U; Android 4.4.2; TECNO-Y4 Build/KOT49H) org.medicmobile.collect.android/SNAPSHOT

});

function rawHttpRequest(rawRequest) {
  return new Promise((resolve, reject) => {

    var api = tls.connect(port, host);

    api.on('connect', () => upstream.write(rawRequest));
    api.on('data', (data) => rawResponse += data);
    api.on('error', reject);

    api.on('close', () => {
      var parts = rawResponse.split('\n\n', 2);

      var response = {
        headers: parts[0],
        body: parts[1],
      };

      parts = parts[0].split('\n', 2);

      response.statusCode = parseInt(parts[0].split(' ', 2)[0]);

      response.headers = parts[1].split('\n')
        .reduce((headers, line) =>
          {
            var parts = line.split(': ', 2);
            headers[parts[0]] = parts[1];
            return headers;
          },
          {});
        
      resolve(response);
    });
  });
}
