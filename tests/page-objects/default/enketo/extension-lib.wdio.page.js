const utils = require('@utils');

const XML = `<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa">
<h:head>
  <h:title>test api() - Demo Form</h:title>
  <model>
    <instance>
      <data id="test-api">
        <first>0</first>
        <second>0</second>
        <avg/>
        <meta>
          <instanceID/>
        </meta>
      </data>
    </instance>

    <bind nodeset="/data/avg" type="string" readonly="true()"
      calculate="cht:extension-lib('average.js', /data/first , /data/second )"/>
  </model>
</h:head>
<h:body>
  <group appearance="field-list" ref="/data">
    <input ref="/data/first">
      <label>first</label>
    </input>
    <input ref="/data/second">
      <label>second</label>
    </input>
    <input ref="/data/avg">
      <label>avg</label>
    </input>
  </group>
</h:body>
</h:html>`;

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

return function(first, second) {
  const average = (getValue(first) + getValue(second)) / 2;
  return {
    t: 'num',
    v: average
  };
}
`;

const TITLE = 'Average Calculator';

const docs = [
  {
    _id: 'form:average',
    internalId: 'average',
    title: TITLE,
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(XML).toString('base64')
      }
    }
  },
  {
    _id: 'extension-libs',
    _attachments: {
      'average.js': {
        content_type: 'application/x-javascript',
        data: Buffer.from(EXTENSION_LIB).toString('base64')
      }
    }
  }
];

const configure = async (userContactDoc) => {
  await utils.seedTestData(userContactDoc, docs);
};

const getInput = async (fieldName) => await $(`form[data-form-id="test-api"] input[name="/data/${fieldName}"]`);

const setField = async (fieldName, val) => {
  const input = await getInput(fieldName);
  await input.setValue(val);
};

const getAverage = async () => {
  const input = await getInput('avg');
  return await input.getValue();
};

// click on another element to blur the other inputs and update the data
const blur = async () => {
  const input = await getInput('avg');
  await input.click();
};

module.exports = {
  TITLE,
  configure,
  typeFirst: async (val) => await setField('first', val),
  typeSecond: async (val) => await setField('second', val),
  blur,
  getAverage
};
