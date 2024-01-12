const searchPageDefault = require('@page-objects/default/search/search.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');

const openSearchBox = () => $('.mm-search-bar-container .search-bar-left-icon .fa-search');
const barcodeSearchInput = () => $('.barcode-scanner-input');

const performSearch = async (term) => {
  await (await openSearchBox()).waitForClickable();
  await (await openSearchBox()).click();
  await searchPageDefault.performSearch(term);
};

const performBarcodeSearch = async (barcodeImagePath) => {
  await $('.mm-search-bar-container .fa.fa-qrcode').waitForDisplayed();
  await $('.barcode-scanner-input').waitForExist();
  var outerHTML = await $('.mm-search-bar-container').getHTML();
  console.log(outerHTML);
  // In this case the upload file button is hidden,
  // then we need to manipulate the DOM of the respective element to make it interactable.
  await browser.execute(function () {
    document.getElementsByClassName('barcode-scanner-input')[0].style.display = 'block';
  });
  await (await barcodeSearchInput()).setValue(barcodeImagePath);
  await browser.pause(2000);
  await commonPage.waitForLoaders();
};

module.exports = {
  searchPageDefault,
  performSearch,
  performBarcodeSearch,
};
