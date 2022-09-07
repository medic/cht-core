const assert = require('chai').assert;
const net = require('net');
const constants = require('../../constants');
const host = constants.API_HOST;
const port = constants.API_PORT;
const dbName = constants.DB_NAME;
const utils = require('../../utils');
const db = utils.db;

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
  before(() =>
    Promise.all([
      saveFormToDb({
        type: 'form',
        _id: 'form:my_app_form',
        internalId: 'MY-APP-FORM',
      }),
      saveFormToDb({
        type: 'form',
        _id: 'form:my_collect_form',
        internalId: 'MY-COLLECT-FORM',
        context: { collect: true },
      }),
    ]));

  after(() => utils.revertDb([], true));

  describe('without User-Agent header', () => {
    it('is prompted for auth details if not supplied', () => {
      // when
      return rawHttpRequest(
        `HEAD /${dbName}/_design/medic/_rewrite/add?deviceID=imei%3A357578064823168 HTTP/1.1\r
X-OpenRosa-Version: 1.0\r
Date: ${new Date().toISOString()}\r
Host: ${host}:${port}\r
Connection: close\r
\r\n`
      ).then(res => {
        // then
        assert.equal(res.statusCode, 401, JSON.stringify(res));
        assert.equal(
          res.headers['WWW-Authenticate'],
          'Basic realm="Medic Web Services"',
          JSON.stringify(res)
        );
      });
    });

    it('can fetch a list of forms', () => {
      // when
      return rawHttpRequest(
        `GET /api/v1/forms HTTP/1.1\r
X-OpenRosa-Version: 1.0\r
Date: ${new Date().toISOString()}\r
Host: ${host}:${port}\r
Connection: close\r
\r\n`
      ).then(res => {
        // then
        assert.equal(res.statusCode, 200, JSON.stringify(res));
        assert.equal(
          res.body,
          `108\r
<?xml version="1.0" encoding="UTF-8"?>
<xforms xmlns="http://openrosa.org/xforms/xformsList">
  <xform>
    <hash>md5:5dfee698c9998ee4ee8939fc6fe72136</hash>
    <downloadUrl>http://${host}:${port}/api/v1/forms/MY-COLLECT-FORM.xml</downloadUrl>
  </xform>
</xforms>\r
0\r\n\r\n`,
          JSON.stringify(res)
        );
      });
    });
  });

  describe('with User-Agent header', () => {
    it('is prompted for auth details if not supplied', () => {
      // when
      return rawHttpRequest(
        `HEAD /${dbName}/_design/medic/_rewrite/add?deviceID=imei%3A357578064823168 HTTP/1.1\r
X-OpenRosa-Version: 1.0\r
Date: ${new Date().toISOString()}\r
Host: ${host}:${port}\r
User-Agent: Dalvik/1.6.0 (Linux; U; Android 4.4.2; TECNO-Y4 Build/KOT49H) org.medicmobile.collect.android/SNAPSHOT\r
Connection: close\r
\r\n`
      ).then(res => {
        // then
        assert.equal(res.statusCode, 401, JSON.stringify(res));
        assert.equal(
          res.headers['WWW-Authenticate'],
          'Basic realm="Medic Web Services"',
          JSON.stringify(res)
        );
      });
    });

    it('can fetch a list of forms', () => {
      // when
      return rawHttpRequest(
        `GET /api/v1/forms HTTP/1.1\r
X-OpenRosa-Version: 1.0\r
Date: ${new Date().toISOString()}\r
Host: ${host}:${port}\r
User-Agent: Dalvik/1.6.0 (Linux; U; Android 4.4.2; TECNO-Y4 Build/KOT49H) org.medicmobile.collect.android/SNAPSHOT\r
Connection: close\r
\r\n`
      ).then(res => {
        // then
        assert.equal(res.statusCode, 200, JSON.stringify(res));
        assert.equal(
          res.body,
          `108\r
<?xml version="1.0" encoding="UTF-8"?>
<xforms xmlns="http://openrosa.org/xforms/xformsList">
  <xform>
    <hash>md5:5dfee698c9998ee4ee8939fc6fe72136</hash>
    <downloadUrl>http://${host}:${port}/api/v1/forms/MY-COLLECT-FORM.xml</downloadUrl>
  </xform>
</xforms>\r
0\r\n\r\n`,
          JSON.stringify(res)
        );
      });
    });
  });
});

const rawHttpRequest = rawRequest => {
  return new Promise((resolve, reject) => {
    const api = net.connect(
      port,
      host
    );
    let rawResponse = '';

    api.on('connect', () => api.write(rawRequest));
    api.on('data', data => (rawResponse += data.toString()));
    api.on('error', reject);

    api.on('close', () => {
      const response = { headers: {} };
      let line;
      const lines = rawResponse.split('\r\n');

      response.statusCode = parseInt(lines.shift().split(' ')[1]);
      while ((line = lines.shift())) {
        const colon = line.indexOf(':');
        response.headers[line.substring(0, colon)] = line
          .substring(colon + 1)
          .trim();
      }
      response.body = lines.join('\r\n');

      resolve(response);
    });
  });
};

const saveFormToDb = doc => {
  return Promise.resolve()
    .then(() => db.put(doc))
    .then(res => {
      const xml = '<xform/>';
      const body = Buffer.from(xml).toString('base64');
      return db.putAttachment(doc._id, 'xml', res.rev, body, {
        type: 'text/xml',
        length: xml.length,
      });
    });
};
