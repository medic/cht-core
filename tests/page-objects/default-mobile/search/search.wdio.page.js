const searchPageDefault = require('@page-objects/default/search/search.wdio.page');

const openSearchBox = () => $('.mm-search-bar-container .search-bar-left-icon .fa-search');
const barcodeSearchInput = () => $('.barcode-scanner-input');
const snackbar = () => $('.snackbar-content');

const getSnackbarMessage = async () => {
  return await (await snackbar()).getText();
};

const performSearch = async (term) => {
  await (await openSearchBox()).waitForClickable();
  await (await openSearchBox()).click();
  await searchPageDefault.performSearch(term);
};

const performBarcodeSearch = async (barcodeImagePath) => {
  /*In this case the upload file button is hidden,
  then we need to manipulate the DOM of the respective webelement to make it interactable.*/
  browser.execute(function () {
    document.getElementsByClassName('barcode-scanner-input')[0].style.display = 'block';
  });
  await (await barcodeSearchInput()).setValue(barcodeImagePath);
  await browser.pause(1000);
};


module.exports = {
  searchPageDefault,
  performSearch,
  performBarcodeSearch,
  getSnackbarMessage,
};
