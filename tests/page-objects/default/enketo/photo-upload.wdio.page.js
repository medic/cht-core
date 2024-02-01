const imagePreview = () => $('form[data-form-id="photo-upload"] .file-picker .file-preview img');
const selectImage = async (filePath) => {
  const input = await $('form[data-form-id="photo-upload"] input[type=file]');
  await input.addValue(filePath);
};

const reportImagePreview = () => $('.report-image');


module.exports = {
  imagePreview,
  selectImage,
  reportImagePreview,
};
