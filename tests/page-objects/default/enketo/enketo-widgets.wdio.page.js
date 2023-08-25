const FORM = 'form[data-form-id="enketo_widgets"]';

const formTitle = () => $(`${FORM} #form-title`);
const countryRadio = (value) => $(FORM +
  ` input[name="/enketo_widgets/cascading_widgets/group1/country"][value="${value}"]`);
const cityRadio = (value) => $(FORM +
  ` input[name="/enketo_widgets/cascading_widgets/group1/city"][value="${value}"]`);
const neighborhoodRadio = (value) => $(FORM +
  ` input[name="/enketo_widgets/cascading_widgets/group1/neighborhood"][value="${value}"]`);

const getFormTitle = async () => {
  const title = await formTitle();
  await title.waitForDisplayed();
  return await title.getText();
};

const selectCountryRadio = async (value = 'nl') => {
  const country = await countryRadio(value);
  await country.waitForDisplayed();
  await country.waitForClickable();
  await country.click();
};

const selectCityRadio = async (value = 'rot') => {
  const city = await cityRadio(value);
  await city.waitForDisplayed();
  await city.waitForClickable();
  await city.click();
};

const selectNeighborhoodRadio = async (value = 'centrum') => {
  const neighborhood = await neighborhoodRadio(value);
  await neighborhood.waitForDisplayed();
  await neighborhood.waitForClickable();
  await neighborhood.click();
};

module.exports = {
  getFormTitle,
  selectCountryRadio,
  selectCityRadio,
  selectNeighborhoodRadio,
};
