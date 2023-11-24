const searchPageDefault = require('@page-objects/default/search/search.wdio.page');

const openSearchBox = () => $('.mm-search-bar-container .search-bar-left-icon .fa-search');
const barcodeSearchBox = () => $('.fa-qrcode');
const barcodeSearchInput = () => $('.barcode-scanner-input');

const performSearch = async (term) => {
  await (await openSearchBox()).waitForClickable();
  await (await openSearchBox()).click();
  await searchPageDefault.performSearch(term);
};

const openBarcodeSearchBox = async () => {
  await (await barcodeSearchBox()).waitForClickable();
  await (await barcodeSearchBox()).click();
};

const performBarcodeSearch = async (barcodeImagePath) => {
  //
  const remoteFilePath = await browser.uploadFile(barcodeImagePath);
  await (await barcodeSearchInput()).addValue(remoteFilePath);
  //$('.barcode-scanner-input').submit();
  //await (await barcodeSearchInput()).click();
  //await (await searchBox()).clearValue();
  //await browser.keys(ENTER);
  // After search is triggered there can be a slight delay before the AJAX call
  // is made and the search spinner shows up hence we just need to wait for a bit before moving forward
  await browser.pause(1000);
};


module.exports = {
  searchPageDefault,
  performSearch,
  performBarcodeSearch,
};
