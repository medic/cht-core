const FORM = 'form[data-form-id="pnc_danger_sign_follow_up_baby"]';
const VISIT_CONFIRMATION = 'input[name="/pnc_danger_sign_follow_up_baby/danger_signs/visit_confirm"]';
const DANGER_SIGNS_PRESENT = 'input[name="/pnc_danger_sign_follow_up_baby/danger_signs/danger_sign_present"]';
const INFECTED_UMBILICAL_CORD = 'input[name="/pnc_danger_sign_follow_up_baby/danger_signs/infected_umbilical_cord"]';
const CONVULSION = 'input[name="/pnc_danger_sign_follow_up_baby/danger_signs/convulsion"]';
const DIFFICULTY_FEEDING = 'input[name="/pnc_danger_sign_follow_up_baby/danger_signs/difficulty_feeding"]';
const VOMIT = 'input[name="/pnc_danger_sign_follow_up_baby/danger_signs/vomit"]';
const DROWSY = 'input[name="/pnc_danger_sign_follow_up_baby/danger_signs/drowsy"]';
const STIFFNESS = 'input[name="/pnc_danger_sign_follow_up_baby/danger_signs/stiff"]';
const YELLOW_SKIN = 'input[name="/pnc_danger_sign_follow_up_baby/danger_signs/yellow_skin"]';
const FEVER = 'input[name="/pnc_danger_sign_follow_up_baby/danger_signs/fever"]';
const BLUE_SKIN = 'input[name="/pnc_danger_sign_follow_up_baby/danger_signs/blue_skin"]';

const selectYesNoOption = async (selector, value = 'yes') => {
  const element = await $(`${FORM} ${selector}[value="${value}"]`);
  await element.waitForDisplayed();
  await element.click();
  return value === 'yes';
};

module.exports = {
  VISIT_CONFIRMATION,
  DANGER_SIGNS_PRESENT,
  INFECTED_UMBILICAL_CORD,
  CONVULSION,
  DIFFICULTY_FEEDING,
  VOMIT,
  DROWSY,
  STIFFNESS,
  YELLOW_SKIN,
  FEVER,
  BLUE_SKIN,
  selectYesNoOption,
};
