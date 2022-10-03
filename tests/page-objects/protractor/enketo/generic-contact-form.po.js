const helper = require('../../../helper');

const openForm = async (formId) => {
  const addButton = element(by.css('.detail-actions .actions .dropdown-toggle .fa-plus'));
  await helper.clickElementNative(addButton);
  const form = element(by.css(`#relevant-contacts-form li[id="form:${formId}"] a`));
  await helper.clickElementNative(form);
};

const mutedModalSelector = '.modal-content #contacts-muted';
const mutedModal = element(by.css(mutedModalSelector));
const modalCancelButton = element(by.css(`${mutedModalSelector} .modal-footer .btn.cancel`));
const modalAcceptButton = element(by.css(`${mutedModalSelector} .modal-footer .btn.submit`));

module.exports.openForm = async (formId) => {
  await openForm(formId);
  await helper.waitUntilReadyNative(element(by.id('form-title')));
};

module.exports.submit = async () => {
  const submitButton = element(by.css('.btn.submit.btn-primary'));
  await helper.clickElementNative(submitButton);
  await helper.waitElementToBeVisibleNative(element(by.css('div.row.flex.grid'))); // contact summary loaded
};

module.exports.openFormForMutedContact = async (formId) => {
  await openForm(formId);
  // popup is shown instead of form
  await helper.waitUntilReadyNative(mutedModal);
};

module.exports.closeModal = async (confirm) => {
  if (confirm) {
    await helper.clickElementNative(modalAcceptButton);
    await helper.waitUntilReadyNative(element(by.id('form-title')));
    return;
  }

  await helper.clickElementNative(modalCancelButton);
  await browser.sleep(1000); // nothing should happen, but let's wait and make sure no redirection takes place
};
