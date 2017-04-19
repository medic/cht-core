const assert = require('chai').assert,
    net = require('net'),
    constants = require('../constants'),
    PouchDB = require('pouchdb'),
    host = constants.API_HOST,
    port = constants.API_PORT,
    dbName = constants.DB_NAME;

/**
 * Tests to ensure continued support for Medic Collect.
 *
 * N.B. as of 4/5/2017 medic-collect builds set a User-Agent header, but prior
 * to this, none was supplied at all.  Tests for both should be kept until old
 * builds are no longer in use by projects.
 *
 * Tests to be added in the future:
 *   - can get form list
 *   - can get individual forms
 *   - can submit form responses
 */
describe('medic-collect', () => {

  describe('without User-Agent header', () => {

    it('is prompted for auth details if not supplied', () => {

      // when
      return rawHttpRequest(

`HEAD /${dbName}/_design/medic/_rewrite/add?deviceID=imei%3A357578064823168 HTTP/1.1
X-OpenRosa-Version: 1.0
Date: ${new Date().toISOString()}
Host: ${host}:${port}
Connection: close
`).then((res) => {

        // then
        assert.equal(res.statusCode, 401, JSON.stringify(res));
        assert.equal(res.headers['WWW-Authenticate'], 'Basic realm="Medic Mobile Web Services"', JSON.stringify(res));

      });

    });

    it('can fetch a list of forms', () => {

      // given
      const db = createDb();

      return db
        .put({
          type: 'form',
          _id: 'form:my_form',
          internalId: 'MY-FORM',
        })
        .then(() => db.putAttachment('form:my_form', 'xml', new Blob('<xform/>'), { type: 'application/xml' }))
        .then(() => {

          // when
          return rawHttpRequest(

`GET /api/v1/forms HTTP/1.1
X-OpenRosa-Version: 1.0
Date: ${new Date().toISOString()}
Host: ${host}:${port}
Connection: close
Transfer-Encoding: identity
`).then((res) => {

            // then
            assert.equal(res.statusCode, 200, JSON.stringify(res));
            assert.equal(res.body,
`<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<xforms xmlns=\"http://openrosa.org/xforms/xformsList\"/>`,
                JSON.stringify(res));

          });

        });

    });

  });

  describe('with User-Agent header', () => {

    it('is prompted for auth details if not supplied', () => {

      // when
      return rawHttpRequest(

`HEAD /${dbName}/_design/medic/_rewrite/add?deviceID=imei%3A357578064823168 HTTP/1.1
X-OpenRosa-Version: 1.0
Date: Tue, 11 Apr 2017 06:34:21 CEST
Host: ${host}:${port}
User-Agent: Dalvik/1.6.0 (Linux; U; Android 4.4.2; TECNO-Y4 Build/KOT49H) org.medicmobile.collect.android/SNAPSHOT
Connection: close

`).then((res) => {

        // then
        assert.equal(res.statusCode, 401, JSON.stringify(res));
        assert.equal(res.headers['WWW-Authenticate'], 'Basic realm="Medic Mobile Web Services"', JSON.stringify(res));

      });

    });

  });

});

function rawHttpRequest(rawRequest) {
  return new Promise((resolve, reject) => {

    const api = net.connect(port, host);
    let rawResponse = '';

    api.on('connect', () => api.write(rawRequest));
    api.on('data', (data) => rawResponse += data.toString());
    api.on('error', reject);

    api.on('close', () => {
      const response = { headers:{} };
      let line, lines = rawResponse.split('\r\n');

      response.statusCode = parseInt(lines.shift().split(' ')[1]);
      while((line = lines.shift())) {
        const colon = line.indexOf(':');
        response.headers[line.substring(0, colon)] =
            line.substring(colon+1).trim();
      }
      response.body = lines.join('\r\n');

      resolve(response);
    });
  });
}

function createDb() {
  return new PouchDB(process.env.COUCH_URL);
}
