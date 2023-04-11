const MODAL_CONTAINER = '.modal-dialog';
const MODAL_FOOTER = '.modal-footer';

const modal = () => $(MODAL_CONTAINER);
const header = () => $(`${MODAL_CONTAINER} div.modal-header`);
const body = () => $(`${MODAL_CONTAINER} div.modal-body`);
const confirm = () => $(`${MODAL_CONTAINER} ${MODAL_FOOTER} a.btn.submit.btn-danger`);
const submit = () => $(`${MODAL_CONTAINER} ${MODAL_FOOTER} a.btn.submit`);
const cancel = () => $(`${MODAL_CONTAINER} ${MODAL_FOOTER} a.btn.cancel`);

const getModalDetails = async () => {
  return {
    header: await header().getText(),
    body: await body().getText(),
  };
};

const checkModalHasClosed = async () => {
  return await (await modal()).waitForDisplayed({ reverse: true });
};

module.exports = {
  body,
  confirm,
  submit,
  cancel,
  getModalDetails,
  checkModalHasClosed,
};
