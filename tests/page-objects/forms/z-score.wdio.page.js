const utils = require('../../utils');

/* eslint-disable max-len */
const xml = `<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa">
  <h:head>
    <h:title>z-score() - Demo Form</h:title>

    <model>
      <instance>
        <data id="z-score">
          <my_height/>
          <my_weight/>
          <my_sex/>
          <my_age/>
          <wfh/>
          <wfa/>
          <hfa/>
          <meta>
            <instanceID/>
          </meta>
        </data>
      </instance>

      <bind nodeset="/data/my_height"/>
      <bind nodeset="/data/my_weight"/>
      <bind nodeset="/data/my_age"/>
      <bind nodeset="/data/my_sex"/>
      <bind nodeset="/data/hfa" type="string" calculate="z-score('height-for-age', ../my_sex, ../my_age, ../my_height)" readonly="true()"/>
      <bind nodeset="/data/wfa" type="string" calculate="z-score('weight-for-age', ../my_sex, ../my_age, ../my_weight)" readonly="true()"/>
      <bind nodeset="/data/wfh" type="string" calculate="z-score('weight-for-height', ../my_sex, ../my_height, ../my_weight)" readonly="true()"/>
    </model>
  </h:head>

  <h:body>
    <group appearance="field-list" ref="/data">
      <select1 appearance="horizontal" ref="/data/my_sex">
        <label>Gender</label>
        <item>
          <label>Female</label>
          <value>female</value>
        </item>
        <item>
          <label>Male</label>
          <value>male</value>
        </item>
      </select1>
      <input ref="/data/my_height">
        <label>How tall are you? (cm)</label>
      </input>
      <input ref="/data/my_weight">
        <label>How much do you weigh? (kg)</label>
      </input>
      <input ref="/data/my_age">
        <label>How old are you? (days)</label>
      </input>
      <input ref="/data/hfa">
        <label>height for age</label>
      </input>
      <input ref="/data/wfa">
        <label>weight for age</label>
      </input>
      <input ref="/data/wfh">
        <label>weight for height</label>
      </input>
    </group>
  </h:body>
</h:html>
`;
const charts = [
  {
    id: 'weight-for-age',
    data: {
      male: [
        { key: 0, points: [  1.701, 2.08, 2.459, 2.881, 3.346, 3.859, 4.419, 5.031, 5.642 ] },
        { key: 1, points: [ 1.692, 2.065, 2.437, 2.854, 3.317, 3.83, 4.394, 5.013, 5.633 ] },
        { key: 2, points: [ 1.707, 2.08, 2.454, 2.872, 3.337, 3.852, 4.421, 5.045, 5.669 ] }
      ],
      female: [
        { key: 0, points: [ 1.671, 2.033, 2.395, 2.794, 3.232, 3.711, 4.23, 4.793, 5.356 ] },
        { key: 1, points: [ 1.635, 1.994, 2.352, 2.752, 3.196, 3.685, 4.222, 4.81, 5.398 ] },
        { key: 2, points: [ 1.643, 2.002, 2.362, 2.764, 3.21, 3.704, 4.249, 4.846, 5.443 ] }
      ],
    }
  },
  {
    id: 'height-for-age',
    data: {
      male: [
        { key: 0, points: [ 42.312, 44.205, 46.098, 47.991, 49.884, 51.777, 53.67, 55.564, 57.457 ] },
        { key: 1, points: [ 42.481, 44.376, 46.271, 48.165, 50.06, 51.955, 53.85, 55.744, 57.639 ] },
        { key: 2, points: [ 42.65, 44.547, 46.443, 48.339, 50.236, 52.132, 54.029, 55.925, 57.822 ] }
      ],
      female: [
        { key: 0, points: [ 41.697, 43.56, 45.422, 47.285, 49.148, 51.01, 52.873, 54.736, 56.598 ] },
        { key: 1, points: [ 41.854, 43.72, 45.585, 47.451, 49.317, 51.182, 53.048, 54.914, 56.779 ] },
        { key: 2, points: [ 42.011, 43.88, 45.748, 47.617, 49.485, 51.354, 53.223, 55.091, 56.96 ] }
      ]
    }
  },
  {
    id: 'weight-for-height',
    data: {
      male: [
        { key: 45, points: [ 1.71, 1.877, 2.043, 2.23, 2.441, 2.68, 2.951,  3.261, 3.571 ] },
        { key: 45.1, points: [ 1.722, 1.89, 2.057, 2.245, 2.458, 2.698, 2.971, 3.283, 3.595 ] },
        { key: 45.2, points: [ 1.734, 1.903, 2.072, 2.261, 2.474, 2.716, 2.991, 3.305, 3.618 ] }
      ],
      female: [
        { key: 45, points: [ 1.737, 1.902, 2.066, 2.252, 2.461, 2.698, 2.967, 3.275, 3.584 ] },
        { key: 45.1, points: [ 1.749, 1.915, 2.081, 2.267, 2.478, 2.716, 2.988, 3.298, 3.609 ] },
        { key: 45.2, points: [ 1.761, 1.928, 2.095, 2.283, 2.495, 2.735, 3.008, 3.321, 3.633 ] }
      ]
    }
  }
];

const docs = [
  {
    _id: 'form:z-score',
    internalId: 'z-score',
    title: 'Z-score',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(xml).toString('base64')
      }
    }
  },
  {
    _id: 'zscore-charts',
    charts: charts
  }
];

const setFieldValue = async (name, value) => {
  const field = await $(`[name="/data/${name}"]`);
  await field.setValue(value);
};

const clickAndGetValue = async (name) => {
  const field = await $(`[name="/data/${name}"]`);
  await field.click();
  return await field.getValue();
};

const setSex = async (sex) => {
  const radio = await $(`[name="/data/my_sex"][value="${sex}"]`);
  await radio.click();
};

module.exports = {
  configureForm: async (userContactDoc) => {
    await utils.seedTestData(userContactDoc, docs);
  },
  docs,

  setHeight: (height) => setFieldValue('my_height', height),
  setWeight: (weight) => setFieldValue('my_weight', weight),
  setAge: (age) => setFieldValue('my_age', age),
  setSex: setSex,

  setPatient: async patient => {
    await module.exports.setSex(patient.sex);
    await module.exports.setAge(patient.age);
    await module.exports.setHeight(patient.height);
    await module.exports.setWeight(patient.weight);
  },

  getHeightForAge: () => clickAndGetValue('hfa'),
  getWeightForAge: () => clickAndGetValue('wfa'),
  getWeightForHeight: () => clickAndGetValue('wfh'),
};
