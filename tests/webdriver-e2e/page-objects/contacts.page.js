const elementHelper = require('../helpers/element');
const searchBox = () => $('#freetext');
const searchButton = () => $('#search');
const rowByText = (text) => $(`span=${text}`);
const reportFilters = () => $$('.card.reports .table-filter a');
const taskFilters = () => $$('.card.tasks .table-filter a');
const contactList = () => $('contacts-list');

const search = async (query) => {
  await (await searchBox()).clearValue();
  await (await searchBox()).setValue(query);
  await (await searchButton()).click();
};

const selectLHSRowByText = async (text) => {
  await search(text);
  await elementHelper.handleUpdateModal();
  await (await rowByText(text)).click();
};

const getReportFiltersText = async () => {
  return Promise.all((await reportFilters()).map(filter => filter.getText()));
};

const getReportTaskFiltersText = async () => {
  await browser.waitUntil(async () => {
    return (await taskFilters()).length > 0;
  });
  return Promise.all((await taskFilters()).map(filter => filter.getText()));
};


module.exports = {
  selectLHSRowByText,
  reportFilters,
  getReportFiltersText,
  getReportTaskFiltersText,
  contactList
};
