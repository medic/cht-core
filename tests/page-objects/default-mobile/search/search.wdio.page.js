const searchPageDefault = require('@page-objects/default/search/search.wdio.page');

const openSearchBox = () => $('.mm-search-bar-container .search-bar-left-icon .fa-search');

const performSearch = async (term) => {
  await (await openSearchBox()).waitForClickable();
  await (await openSearchBox()).click();
  await searchPageDefault.performSearch(term);
};

module.exports = {
  searchPageDefault,
  performSearch,
};
