const reportListID = '#reports-list';
const caseId = () => $(`li.indent-0 p span a`);
const caseIdLabel = () => $('li.indent-0 label span');
const submitterPlace = () => $('.position a');
const submitterPhone = () => $('.sender .phone');
const submitterName = () => $('.sender .name');
const  firstReport = () => $(`${reportListID} li:first-child`);

module.exports = {
  firstReport,
  submitterName,
  submitterPhone,
  submitterPlace,
  caseId,
  caseIdLabel
};

