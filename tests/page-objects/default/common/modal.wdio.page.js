const header = () => $('div.modal-header');
const body = () => $('div.modal-body');
const modalFooter = '.modal-footer';
const confirm = () => $(`${modalFooter} a.btn.submit.btn-danger`);
const submit = () => $(`${modalFooter} a.btn.submit`);
const cancel = () => $(`${modalFooter} a.btn.cancel`);

const getModalDetails = async () => {
  return {
    header: await header().getText(),
    body: await body().getText(),
  };
};

module.exports = {
  body,
  confirm,
  submit,
  cancel,
  getModalDetails,
};
