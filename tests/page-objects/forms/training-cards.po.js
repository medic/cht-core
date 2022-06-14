const fs = require('fs');
const utils = require('../../utils');

const xml = fs.readFileSync(`${__dirname}/../../forms/training-cards-text-only.xml`, 'utf8');
const FIELD_PATH = '.question-label[lang="en"][data-itext-id="/training_cards_text_only/';
const FORM_DOC = {
  _id: 'form:training:text_only',
  internalId: 'training:text_only',
  title: 'Text Only Training',
  type: 'form',
  start_date: new Date().getTime(),
  user_roles: ['chw'],
  duration: 5,
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(xml).toString('base64'),
    },
  },
};

module.exports = {
  FORM_DOC,

  configureForm: () => utils.saveDoc(FORM_DOC),

  waitForTrainingCards: () => $('.enketo-modal').waitForDisplayed(),

  getTextFromPage: (field) => $(FIELD_PATH + field).getText(),

  goNext: () => $('.btn.btn-primary.next-page').click(),

  submit: () => $('.btn.btn-primary.submit').click(),

  getCompletedTraining: () => $('#reports-list ul li:first-child .summary').getText()
};
