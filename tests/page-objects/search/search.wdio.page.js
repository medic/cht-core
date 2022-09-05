const searchBox = () => $('.mm-search-bar-container input#freetext');
const resetSearch = () => $('.mm-search-bar-container .search-bar-clear');

// click freetext search box
const performSearch = async (searchString) => {
  await (await searchBox()).click();
  await (await searchBox()).clearValue();
  await (await searchBox()).addValue(searchString);
  await browser.keys('Enter');
  // After search is triggered there can be a slight delay before the AJAX call
  // is made and the search spinner shows up hence we just need to wait for a bit before moving forward
  await browser.pause(1000);
};

const clearSearch = async () => {
  await (await resetSearch()).click();
  // After the button is pressed there can be a slight delay before the AJAX call
  // is made and the search spinner shows up hence we just need to wait for a bit before moving forward
  await browser.pause(1000);
};

module.exports = {
  performSearch,
  clearSearch
};
