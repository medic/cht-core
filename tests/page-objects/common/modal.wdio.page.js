const body = () => $('div.modal-body');
const modalFooter = '.modal-footer';
const confirm = () => $(`${modalFooter} a.btn.submit.btn-danger`);
const cancel = () => $(`${modalFooter} a.btn.cancel`);

module.exports = {
  body,
  confirm,
  cancel,
};
