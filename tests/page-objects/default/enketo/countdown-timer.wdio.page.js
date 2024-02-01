const clickTimer = async () => {
  const timer = await $('form[data-form-id="countdown"] .or-appearance-countdown-timer canvas');
  await timer.click();
};

module.exports = {
  clickTimer,
};
