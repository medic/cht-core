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
};

const cancel = async (timeout) => {
  await (await cancelButton()).waitForClickable({ timeout });
  await (await cancelButton()).click();
};

module.exports = {
  body,
  submit,
  cancel,
  getModalDetails,
  checkModalHasClosed,
};
