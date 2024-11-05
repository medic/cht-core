const ENTER = '\uE007';

const commonElements = require('@page-objects/default/common/common.wdio.page');

const searchBox = () => $('.mm-search-bar-container input#freetext');
const resetSearch = () => $('.mm-search-bar-container .search-bar-clear');

// click freetext search box
const performSearch = async (searchString) => {
  await searchBox().click();
  await searchBox().clearValue();
  await searchBox().addValue(searchString);
  await browser.keys(ENTER);
  await commonElements.waitForLoaders();
};

const clearSearch = async () => {
  if (!await resetSearch().isDisplayed()) {
    return;
  }

  await resetSearch().click();
  await commonElements.waitForLoaders();
};

module.exports = {
  performSearch,
  clearSearch
};
