const submitButton = () => $('.enketo .submit');
const nextButton = () => $('button.btn.btn-primary.next-page');

const nextPage = async (numberOfPages = 1) => {
  for (let i = 0; i < numberOfPages; i++) {
    await (await nextButton()).waitForDisplayed();
    await (await nextButton()).click();
  }
};

module.exports = {
  submitButton,
  nextPage,
};
