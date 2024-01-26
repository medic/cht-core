const MODAL_CONTAINER = 'mm-modal-layout';
const MODAL_FOOTER = '.modal-footer';

const modal = () => $(MODAL_CONTAINER);
const header = () => $(`${MODAL_CONTAINER} .panel-header-title`);
const body = () => $(`${MODAL_CONTAINER} .modal-body`);
const submitButton = () => $(`${MODAL_CONTAINER} ${MODAL_FOOTER} button[test-id="submit"]`);
const cancelButton = () => $(`${MODAL_CONTAINER} ${MODAL_FOOTER} button[test-id="cancel"]`);

const getModalDetails = async () => {
  await (await header()).waitForDisplayed();
  await (await body()).waitForDisplayed();
  return {
    header: await (await header()).getText(),
    body: await (await body()).getText(),
  };
};

const checkModalHasClosed = async () => {
  return await (await modal()).waitForDisplayed({ timeout: 60000, reverse: true });
};

const submit = async (timeout) => {
  await (await submitButton()).waitForClickable({ timeout });
  await (await submitButton()).click();
  await checkModalHasClosed();
};

const cancel = async (timeout) => {
  await (await cancelButton()).waitForClickable({ timeout });
  await (await cancelButton()).click();
  await checkModalHasClosed();
};

const hideOverlay = () => {
  // snackbar appears in the bottom of the page for 5 seconds when certain actions are made
  // for example when filling a form, or creating a contact
  // and intercepts all clicks in the actionbar
  // this action is temporary, and will be undone with a refresh
  return browser.execute(() => {
    // eslint-disable-next-line no-undef
    window.jQuery('.cdk-overlay-backdrop').hide();
  });
};

module.exports = {
  body,
  submit,
  cancel,
  getModalDetails,
  checkModalHasClosed,
  hideOverlay,
};
