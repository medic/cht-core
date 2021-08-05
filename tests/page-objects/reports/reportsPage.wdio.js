const reportListID = '#reports-list';
const reportBodyDetails = '#reports-content .report-body .details';
const caseId = () => $(`${reportBodyDetails} > ul > li > p > span > a`);
const caseIdLabel = () => $(`${reportBodyDetails} ul > li > label > span`);
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

