const translator = require('./translator');

const setUiStatus = (translationKey, args)  => {
  const translated = translator.translate(translationKey, args);
  $('.bootstrap-layer .status, .bootstrap-layer .loader').show();
  $('.bootstrap-layer .error').hide();
  $('.bootstrap-layer .status').text(translated);
};

const setUiError = err => {
  const errorMessage = translator.translate(err && err.key || 'ERROR_MESSAGE');
  const tryAgain = translator.translate('TRY_AGAIN');
  const content = `
    <div>
      <p>${errorMessage}</p>
      <a id="btn-reload" class="btn btn-primary" href="#">${tryAgain}</a>
    </div>`;
  $('.bootstrap-layer .error').html(content);
  $('#btn-reload').click(() => window.location.reload(false));
  $('.bootstrap-layer .loader, .bootstrap-layer .status').hide();
  $('.bootstrap-layer .error').show();
};

const setLocale = (userCtx) => {
  translator.setLocale(userCtx.locale);
};

module.exports = {
  setUiError,
  setUiStatus,
  setLocale,
};
