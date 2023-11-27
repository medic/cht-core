const fs = require('fs');
const utils = require('@utils');
const xmlForm = fs.readFileSync(`${__dirname}/../../../../config/standard/forms/app/pregnancy_visit.xml`, 'utf8');
const formDocument = {
  _id: 'form:pregnancy-visit',
  internalId: 'pregnancy-visit',
  title: 'Pregnancy Visit',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(xmlForm).toString('base64')
    }
  }
};

const uploadPregnancyVisitForm = async () => {
  await utils.saveDoc(formDocument);
};

module.exports = {
  uploadPregnancyVisitForm,
};
