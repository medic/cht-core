const nameField = () => $('#report-form form [name="/data/name"]');
const submitButton = () => $('.enketo .submit');
const submittedName = () => $('#reports-content .details ul li:first-child p');
const formTitle = () => $('#form-title');
const nextButton = () => $('button.btn.btn-primary.next-page');
const fillForm = async (formFields) => {
  for (const [fieldName] of Object.entries(formFields)) {
    const field = formFields[fieldName];
    const elm = $(field.css);
    if (field.textField) {
      await elm.sendKeys(field.value);
    } else {
      const radioButton = () => $(`${field.css}[value=${field.value}]`);
      await radioButton.click();
    }
    if (field.endOfPage){
      await module.exports.nextPageNative();
    }
  }
};

module.exports = {
  fillForm,
  submittedName,
  submitButton,
  nameField,
  formTitle,
  editForm: () => {
    const editFormBtn = () => $('[href^="#/reports/edit"]>.fa-pencil');
    editFormBtn.click();
  },

  editFormNative: async () => {
    const editFormBtn = () => $('[href^="#/reports/edit"]>.fa-pencil');
    await editFormBtn.click();
  },

  goBack: () => {
    $('button.btn.btn-default.previous-page').click();
  },

  invalidateReportNative: async () => {
    const reportInvalidBtn = () => $('.verify-error');
    await reportInvalidBtn.click();
    const reportInvalidMessage = $('.verify-error.active');
    expect(await reportInvalidMessage.getText()).toEqual('Has errors');
  },

  nextPage: multiple => {
    const nextButton = () => $('button.btn.btn-primary.next-page');
    if (multiple) {
      for (let i = 0; i < multiple; i++) {
        nextButton.click();
      }
    } else {
      nextButton.click();
    }
  },

  nextPageNative: async (numberOfPages = 1) => {
    const nextButton = () => $('button.btn.btn-primary.next-page');

    for (let i = 0; i < numberOfPages; i++) {
      await (await nextButton()).click();
    }
  },
  nextButton,

  reportApprove: () => {
    const checkBtn = () => $('.fa-check');
    checkBtn().click();
  },

  reportApproveNative: async () => {
    const reviewButton = () => $('.actions>.mm-icon-inverse>.fa-check');
    await (await reviewButton()).click();
  },

  selectFormNative: async (formId) => {

    const addButton = () => $('.action-container .general-actions:not(.ng-hide) .fa-plus');

    // select form
    await await (await addButton()).click();
    const form = module.exports.formByHref(formId);
    await (await form()).click();
  },

  formByHref: (href) => {
    const css = `.action-container .general-actions .dropup.open .dropdown-menu li a[href="#/reports/add/${href}"]`;
    return $(css);
  },

  submit: async () => {
    const submitButton = $('.btn.submit.btn-primary');
    await (await submitButton()).click();
    expect($('div.details')).isPresent().toBeTruthy();
  },

  submitNative: async () => {
    const submitButton = () => $('.btn.submit.btn-primary');
    await submitButton.click();
  },

  submitReports: async () => {
    const submitButton = () => $('.btn.submit.btn-primary');
    await submitButton.click();
    const details = $('div.details');
    expect(await details.isPresent()).toBeTruthy();
  },

  validateReportNative: async () => {
    const reportValidBtn = () => $('.verify-valid');
    await reportValidBtn.click();
    const reportValidMessage = () => $('.verify-valid.active');
    expect(await reportValidMessage.getText()).toEqual('Correct');
  }
};
