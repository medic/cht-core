const MODAL_CONTAINER = 'mm-modal-layout';
const MODAL_FOOTER = '.modal-footer';

const modal = () => $(MODAL_CONTAINER);
const header = () => $(`${MODAL_CONTAINER} .panel-header-title`);
const body = () => $(`${MODAL_CONTAINER} .modal-body`);
const submitButton = () => $(`${MODAL_CONTAINER} ${MODAL_FOOTER} button[test-id="submit"]`);
const cancelButton = () => $(`${MODAL_CONTAINER} ${MODAL_FOOTER} button[test-id="cancel"]`);

const getModalDetails = async () => {
  await header().waitForDisplayed();
  await body().waitForDisplayed();
  return {
    header: await header().getText(),
    body: await body().getText(),
  };
};

const checkModalHasClosed = async () => {
  return await modal().waitForDisplayed({ timeout: 5000, reverse: true });
};

const submit = async () => {
  await submitButton().click();
  await checkModalHasClosed();
};

const cancel = async () => {
  await cancelButton().click();
  await checkModalHasClosed();
};

const checkModalIsOpen = async () => {
  return await modal().waitForDisplayed({ timeout: 5000 });
};

const isDisplayed = async () => {
  return await modal().isDisplayed();
};


module.exports = {
  modal,
  body,
  submit,
  cancel,
  getModalDetails,
  checkModalHasClosed,
  checkModalIsOpen,
  isDisplayed,
};
