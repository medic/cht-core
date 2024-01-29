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

const displayTooManyDocsWarning = ({ warn_docs, limit }) => {
  return new Promise(resolve => {
    const translateParams = { count: warn_docs, limit: limit };
    const errorMessage = translator.translate('TOO_MANY_DOCS', translateParams);
    const continueBtn = translator.translate('CONTINUE');
    const abort = translator.translate('ABORT');
    const content = `
            <div>
              <p class="alert alert-warning">${errorMessage}</p>
              <a id="btn-continue" class="btn btn-primary pull-left" href="#">${continueBtn}</a>
              <a id="btn-abort" class="btn btn-danger pull-right" href="#">${abort}</a>
            </div>`;

    $('.bootstrap-layer .loader, .bootstrap-layer .status').hide();
    $('.bootstrap-layer .error').show();
    $('.bootstrap-layer .error').html(content);
    $('#btn-continue').click(() => resolve());
    $('#btn-abort').click(() => {
      document.cookie = 'login=force;path=/';
      window.location.reload(false);
    });
  });
};

module.exports = {
  setUiError,
  setUiStatus,
  setLocale,
  displayTooManyDocsWarning,
};
