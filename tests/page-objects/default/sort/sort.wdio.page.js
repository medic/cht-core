const sortIcon = () => $('#sort-results');
const sortDropdown = () => $('#sort-results-dropdown');
const sortMenuItems = () => $$('#sort-results-dropdown a[role="menuitem"]');

const openSortMenu = async () => {
  await sortIcon().click();
  await sortDropdown().waitForDisplayed();
}
const selectSortOrder = async (sortOrder) => {
  await openSortMenu();
  const options = await sortMenuItems();
  for (const option of options) {
      const optionText = await option.getText();
      if (optionText.trim() === sortOrder) {
          await option.click();
          break;
      }
  }
}

module.exports = {
  openSortMenu,
  selectSortOrder,
};
