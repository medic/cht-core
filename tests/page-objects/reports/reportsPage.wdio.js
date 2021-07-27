


const reportListID = '#reports-list';

module.exports = {
  firstReport: () => $(`${reportListID} li:first-child`),
  listLoader: () => $(`${reportListID} .loader`),
  list: () => $(reportListID),
  formNameNoSubject: () => $('mm-sender + div'),
  subjectName: () => $('.subject .name'),
  summaryFormName: () => $('.subject + div'),
  submitterName: () => $('.sender .name'),
  submitterPhone: () => $('.sender .phone'),
  submitterPlace: () => $('.position a'),
  detail: () => $('.detail'),
  detailStatus: () => $('.detail .status'),
  subject: reportElement =>  {
    return reportElement.$('.content .heading h4 span');
  },
  formName: reportElement =>  {
    return reportElement.$('.summary');
  }
};

