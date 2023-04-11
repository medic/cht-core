const assert = require('chai').assert;
const constants = require('../../constants');
const request = require('request-promise-native');
const utils = require('@utils');
const host = 'localhost';
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
      return getForms({ auth: false, userAgent: false })
        .then(() => {
          assert.fail('should fail the request');
        })
        .catch(err => {
          assert.equal(err.statusCode, 401);
          assert.equal(err.response.headers['www-authenticate'], 'Basic realm="Medic Web Services"');
        });
    });

    it('can fetch a list of forms', () => {
      return getForms({ auth: true, userAgent: false })
        .then(res => {
          assert.equal(res.statusCode, 200);
          assert.equal(res.body, MY_COLLECT_FORM_RESPONSE);
        });
    });
  });

  describe('with User-Agent header', () => {
    it('is prompted for auth details if not supplied', () => {
      return getForms({ auth: false, userAgent: true })
        .then(() => {
          assert.fail('should fail the request');
        })
        .catch(err => {
          assert.equal(err.statusCode, 401);
          assert.equal(err.response.headers['www-authenticate'], 'Basic realm="Medic Web Services"');
        });
    });

    it('can fetch a list of forms', () => {
      return getForms({ auth: true, userAgent: true })
        .then(res => {
          assert.equal(res.statusCode, 200);
          assert.equal(res.body, MY_COLLECT_FORM_RESPONSE);
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
      const xml = `<h:html xmlns:h="http://www.w3.org/1999/xhtml"><h:head><model><instance><${doc.internalId}/></instance></model></h:head></h:html>`;
      const body = Buffer.from(xml).toString('base64');
      return db.putAttachment(doc._id, 'xml', res.rev, body, {
        type: 'text/xml',
        length: xml.length,
      });
    });
};

const MY_COLLECT_FORM_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<xforms xmlns="http://openrosa.org/xforms/xformsList">
  <xform>
    <formID>MY-COLLECT-FORM</formID>
    <hash>md5:7f356568a6096ef8589aef17ccc0ac27</hash>
    <downloadUrl>https://${host}/api/v1/forms/MY-COLLECT-FORM.xml</downloadUrl>
  </xform>
</xforms>`;
