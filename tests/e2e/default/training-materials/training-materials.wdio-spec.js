const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const trainingCardsPage = require('@page-objects/default/enketo/training-cards.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const privacyPolicyFactory = require('@factories/cht/settings/privacy-policy');
const privacyPage = require('@page-objects/default/privacy-policy/privacy-policy.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const fs = require('fs');

describe('Training Materials Page', () => {
  const expectedConfirmModalHeader = 'Leave training?';
  const expectedConfirmMessage = 'This training is not finished. ' +
    'If you leave now, you will lose your progress and be prompted again later to complete it.';

  before(async () => {
    const parentPlace = placeFactory.place().build({ _id: 'hc1', type: 'Health Center 1' });
    const user = userFactory.build({ place: parentPlace._id, roles: [ 'nurse', 'chw' ] });
    const patient = personFactory.build({ parent: { _id: user.place._id, parent: { _id: parentPlace._id } } });
    const formsFolder = '../../../e2e/default/training-materials/forms';
    const firstTrainingId = 'training:first-training';
    const firstXML = fs.readFileSync(`${__dirname}/${formsFolder}/first-training.xml`, 'utf8');
    const firstTraining = {
      _id: `form:${firstTrainingId}`,
      internalId: firstTrainingId,
      title: 'first-training',
      type: 'form',
      context: { person: true, place: true },
      _attachments: {
        xml: { content_type: 'application/octet-stream', data: Buffer.from(firstXML).toString('base64') },
      },
    };
    const secondTrainingId = 'training:first-training';
    const secondXML = fs.readFileSync(`${__dirname}/${formsFolder}/second-training.xml`, 'utf8');
    const secondTraining = {
      _id: `form:${secondTrainingId}`,
      internalId: secondTrainingId,
      title: 'second-training',
      type: 'form',
      context: { person: true, place: true },
      _attachments: {
        xml: { content_type: 'application/octet-stream', data: Buffer.from(secondXML).toString('base64') },
      },
    };

    await utils.saveDoc(parentPlace, patient, firstTraining, secondTraining);
    await utils.createUsers([ user ]);
    await loginPage.login(user);
    await commonElements.waitForPageLoaded();
  });


  it('should not display completed training', async () => {
    await commonPage.goToMessages();

  });
});
