const visitConfirmation = (form) => `input[name="/${form}/danger_signs/visit_confirm"]`;
const dangerSignsPresent = (form) => `input[name="/${form}/danger_signs/danger_sign_present"]`;
const infectedUmbilicalCord = (form) => `input[name="/${form}/danger_signs/infected_umbilical_cord"]`;
const convulsion = (form) => `input[name="/${form}/danger_signs/convulsion"]`;
const difficultyFeeding = (form) => `input[name="/${form}/danger_signs/difficulty_feeding"]`;
const vomit = (form) => `input[name="/${form}/danger_signs/vomit"]`;
const drowsy = (form) => `input[name="/${form}/danger_signs/drowsy"]`;
const stiffness = (form) => `input[name="/${form}/danger_signs/stiff"]`;
const yellowSkin = (form) => `input[name="/${form}/danger_signs/yellow_skin"]`;
const fever = (form) => `input[name="/${form}/danger_signs/fever"]`;
const blueSkin = (form) => `input[name="/${form}/danger_signs/blue_skin"]`;
const headache = (form) => `input[name="/${form}/danger_signs/severe_headache"]`;
const vaginalBleeding = (form) => `input[name="/${form}/danger_signs/vaginal_bleeding"]`;
const vaginalDischarge = (form) => `input[name="/${form}/danger_signs/vaginal_discharge"]`;
const fits = (form) => `input[name="/${form}/danger_signs/fits"]`;
const abdominalPain = (form) => `input[name="/${form}/danger_signs/severe_abdominal_pain"]`;
const veryPale = (form) => `input[name="/${form}/danger_signs/very_pale"]`;
const reduceFetalMov = (form) => `input[name="/${form}/danger_signs/reduced_or_no_fetal_movements"]`;
const breakingOfWater = (form) => `input[name="/${form}/danger_signs/breaking_water"]`;
const easilyTired = (form) => `input[name="/${form}/danger_signs/easily_tired"]`;
const swellingHands = (form) => `input[name="/${form}/danger_signs/face_hand_swelling"]`;
const breathlessness = (form) => `input[name="/${form}/danger_signs/breathlessness"]`;

module.exports = {
  visitConfirmation,
  dangerSignsPresent,
  infectedUmbilicalCord,
  convulsion,
  difficultyFeeding,
  vomit,
  drowsy,
  stiffness,
  yellowSkin,
  fever,
  blueSkin,
  headache,
  vaginalBleeding,
  vaginalDischarge,
  fits,
  abdominalPain,
  veryPale,
  reduceFetalMov,
  breakingOfWater,
  easilyTired,
  swellingHands,
  breathlessness,
};
