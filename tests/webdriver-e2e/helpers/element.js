
const handleUpdateModal = async () => {
  if ((await $('#update-available')).isDisplayed()) {
    await browser.keys('Enter');
  }
};


const clickElement = async element => {
  await handleUpdateModal();
  try {
    await element.click();
  } catch (err) {
    await handleUpdateModal();
    await element.click();
  }
};

module.exports = {
  clickElement,
  handleUpdateModal
};
