const body = () => $('div.modal-body');
const modalFooter = '.modal-footer';
const confirm = () => $(`${modalFooter} a.btn.submit.btn-danger`);


module.exports = {
  body,
  confirm
}