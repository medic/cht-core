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
  return await (await modal()).waitForDisplayed({ timeout: 5000, reverse: true });
};

const submit = async (timeout = 30000) => {
  try {
    await (await submitButton()).waitForClickable({ timeout });
    await (await submitButton()).click();
    await checkModalHasClosed();
  } catch (error) {
    console.error('Error during modal submit:', error);
    throw error;
  }
};

const cancel = async (timeout = 30000) => {
  try {
    await (await cancelButton()).waitForClickable({ timeout });
    await (await cancelButton()).click();
    await checkModalHasClosed();
  } catch (error) {
    console.error('Error during modal cancel:', error);
    throw error;
  }
};

const checkModalIsOpen = async () => {
  return await (await modal()).waitForDisplayed({ timeout: 5000 });
};

const isDisplayed = async () => {
  return await (await modal()).isDisplayedInViewport();
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
