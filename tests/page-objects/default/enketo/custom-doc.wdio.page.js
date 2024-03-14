const uuid = require('uuid').v4;

// TEST - extension-lib-form.wdio.spec.js
const EXTENSION_LIB = `
const getValue = function(obj) {
  let val;
  if (obj.t === 'arr') {
    val = obj.v && obj.v.length && obj.v[0];
  } else {
    val = obj.v;
  }
  if (!val) {
    return 0;
  }
  const parsed = parseInt(val.textContent);
  return isNaN(parsed) ? 0 : parsed;
};

module.exports = function(first, second) {
  const average = (getValue(first) + getValue(second)) / 2;
  return {
    t: 'num',
    v: average
  };
}
`;

const extensionLibDoc = {
  _id: 'extension-libs',
  _attachments: {
    'average.js': {
      content_type: 'application/x-javascript',
      data: Buffer.from(EXTENSION_LIB).toString('base64')
    }
  }
};

// TEST - edit-report-with-attachment.wdio.spec.js
const instanceID = uuid();
const reportModelXml = `
<one_text_form xmlns:jr="http://openrosa.org/javarosa" id="required_note">
  <intro>initial text</intro>
  <meta>
    <instanceID>uuid:${instanceID}</instanceID>
    <deprecatedID/>
  </meta>
</one_text_form>`;


const editReportWithAttachmentDoc ={
  _id: uuid(),
  form: 'one-text-form',
  type: 'data_record',
  reported_date: Date.now(),
  content_type: 'xml',
  //contact: userContactDoc,
  hidden_fields: ['meta'],
  fields: {
    // to prove that when xml attachment exists, it is used to populate edit form instead of fields
    intro: 'not same text as in xml attachment',
    meta: {
      instanceID: `uuid:${instanceID}`,
      deprecatedID: ''
    }
  },
  _attachments: {
    content: {
      content_type: 'application/octet-stream',
      data: Buffer.from(reportModelXml).toString('base64'),
    }
  }
};



module.exports = {
  extensionLibDoc,
  editReportWithAttachmentDoc,
};
