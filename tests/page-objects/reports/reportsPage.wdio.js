const reportListID = '#reports-list';
const caseId = () => $(`li.indent-0 p span a`);
const caseIdLabel = () => $('li.indent-0 label span');

module.exports = {
  firstReport: () => $(`${reportListID} li:first-child`),
  submitterName: async () => await (await $('.sender .name')).getText(),
  submitterPhone: async () => await (await $('.sender .phone')).getText(),
  submitterPlace: async () => await (await $('.position a')).getText(),
  getCaseId: async () =>  (await caseId()).getText(),
  getCaseIdLabel: async () => (await caseIdLabel()).getText(),
};

