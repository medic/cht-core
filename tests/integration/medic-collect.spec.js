const assert = require('chai').assert;
const constants = require('../constants');
const request = require('request-promise-native');
const utils = require('../utils');
const host = constants.API_HOST;
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
      return getForms({ auth: false, userAgent: false }).then(res => {
        assert.equal(res.statusCode, 401, JSON.stringify(res));
        assert.equal(res.headers['WWW-Authenticate'], 'Basic realm="Medic Web Services"');
      });
    });

    it('can fetch a list of forms', () => {
      return getForms({ auth: true, userAgent: false }).then(res => {
        // then
        assert.equal(res.statusCode, 200, JSON.stringify(res));
        assert.equal(
          res.body,
          `108\r
<?xml version="1.0" encoding="UTF-8"?>
<xforms xmlns="http://openrosa.org/xforms/xformsList">
  <xform>
    <hash>md5:5dfee698c9998ee4ee8939fc6fe72136</hash>
    <downloadUrl>https://${host}/api/v1/forms/MY-COLLECT-FORM.xml</downloadUrl>
  </xform>
</xforms>\r
0\r\n\r\n`
        );
      });
    });
  });

  describe('with User-Agent header', () => {
    it('is prompted for auth details if not supplied', () => {
      return getForms({ auth: false, userAgent: true }).then(res => {
        assert.equal(res.statusCode, 401, JSON.stringify(res));
        assert.equal(res.headers['WWW-Authenticate'], 'Basic realm="Medic Web Services"');
      });
    });

    it('can fetch a list of forms', () => {
      return getForms({ auth: true, userAgent: true }).then(res => {
        assert.equal(res.statusCode, 200);
        assert.equal(
          res.body,
          `108\r
<?xml version="1.0" encoding="UTF-8"?>
<xforms xmlns="http://openrosa.org/xforms/xformsList">
  <xform>
    <hash>md5:5dfee698c9998ee4ee8939fc6fe72136</hash>
    <downloadUrl>https://${host}/api/v1/forms/MY-COLLECT-FORM.xml</downloadUrl>
  </xform>
</xforms>\r
0\r\n\r\n`
        );
      });
    });
  });
});

const getForms = ({ auth, userAgent }) => {
  const url = auth ? constants.BASE_URL_AUTH : constants.BASE_URL;
  
  const headers = {
    'X-OpenRosa-Version': '1.0',
    Date: new Date().toISOString(),
    Host: host
  };
  if (userAgent) {
    headers['User-Agent'] = 'Dalvik/1.6.0 (Linux; U; Android 4.4.2; TECNO-Y4 Build/KOT49H) ' +
      'org.medicmobile.collect.android/SNAPSHOT';
  }
  
  return request.get({
    url: `${url}/api/v1/forms`,
    headers,
    resolveWithFullResponse: true
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
