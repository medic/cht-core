const searchBox = () => $('input#freetext');
const searchIcon = () => $('span.fa-search');
const resetFilters = () => $('.reset-filter');

// click freetext search box
const performSearch = async (searchString) => {
  await (await searchBox()).click();
  await (await searchBox()).clearValue();
  await (await searchBox()).addValue(searchString);
  await (await searchIcon()).click();
  // After the button is pressed there can be a slight delay before the AJAX call
  // is made and the search spinner shows up hence we just need to wait for a bit before moving forward
  await browser.pause(1000);
};

const clearSearch = async () => {
  await (await resetFilters()).click();
  // After the button is pressed there can be a slight delay before the AJAX call
  // is made and the search spinner shows up hence we just need to wait for a bit before moving forward
  await browser.pause(1000);
};

module.exports = {
  performSearch,
  clearSearch
};
