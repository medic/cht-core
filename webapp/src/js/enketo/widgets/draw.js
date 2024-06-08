// Copied from https://github.com/enketo/enketo/blob/main/packages/enketo-core/src/widget/draw/draw-widget.js
// After upgrading to enekto-core 8.1+, this widget should be removed and we should use the one from enketo-core.
// NOSONAR_BEGIN
/* eslint-disable */

const $ = require( 'jquery' );
const fileManager = require('enketo/file-manager');
/**
 * @external SignaturePad
 */
const SignaturePad = require('signature_pad').default;
const { t } = require('enketo/translator');
const dialog = require('enketo-core/src/js/fake-dialog').default;
const support = require('enketo-core/src/js/support').default;
const events = require('enketo-core/src/js/event').default;
const Widget = require('enketo-core/src/js/widget').default;
const { dataUriToBlobSync, getFilename } = require('enketo-core/src/js/utils');
const downloadUtils = require('enketo-core/src/js/download-utils').default;

const DELAY = 1500;

/**
 * SignaturePad.prototype.fromDataURL is asynchronous and does not return
 * a Promise. This is a rewrite returning a promise and the objectUrl.
 * In addition it also fixes a bug where a loaded image is stretched to fit
 * the canvas.
 *
 * @function external:SignaturePad#fromObjectURL
 * @param {*} objectUrl - ObjectURL
 * @param {object} options - options
 * @param {number} [options.ratio] - ratio
 * @param {number} [options.width] - width
 * @param {number} [options.height] - height
 * @return {Promise} a promise that resolves with an objectURL
 */
SignaturePad.prototype.fromObjectURL = function (objectUrl, options) {
  const image = new Image();
  options = options || {};
  const deviceRatio = options.ratio || window.devicePixelRatio || 1;
  const width = options.width || this._canvas.width / deviceRatio;
  const height = options.height || this._canvas.height / deviceRatio;
  const that = this;

  this._reset();

  return new Promise((resolve) => {
    image.src = objectUrl;
    image.onload = () => {
      const imgWidth = image.width;
      const imgHeight = image.height;
      const hRatio = width / imgWidth;
      const vRatio = height / imgHeight;
      let left;
      let top;

      if (hRatio < 1 || vRatio < 1) {
        // if image is bigger than canvas then fit within the canvas
        const ratio = Math.min(hRatio, vRatio);
        left = (width - imgWidth * ratio) / 2;
        top = (height - imgHeight * ratio) / 2;
        that._ctx.drawImage(
          image,
          0,
          0,
          imgWidth,
          imgHeight,
          left,
          top,
          imgWidth * ratio,
          imgHeight * ratio
        );
      } else {
        // if image is smaller than canvas then show it in the center and don't stretch it
        left = (width - imgWidth) / 2;
        top = (height - imgHeight) / 2;
        that._ctx.drawImage(image, left, top, imgWidth, imgHeight);
      }
      resolve(objectUrl);
    };
    that._isEmpty = false;
  });
};

/**
 * Similar to SignaturePad.prototype.fromData except that it doesn't clear the canvas.
 * This is to facilitate undoing a drawing stroke over a background (bitmap) image.
 *
 * @function external:SignaturePad#updateData
 * @param {*} pointGroups - pointGroups
 */
SignaturePad.prototype.updateData = function (pointGroups) {
  const that = this;
  this._fromData(
    pointGroups,
    (curve, widths) => {
      that._drawCurve(curve, widths.start, widths.end);
    },
    (rawPoint) => {
      that._drawDot(rawPoint);
    }
  );

  this._data = pointGroups;
};

/**
 * Widget to obtain user-provided drawings or signature.
 *
 * @augments Widget
 */
class DrawWidget extends Widget {
  /**
   * @type {string}
   */
  static get selector() {
    // note that the selector needs to match both the pre-instantiated form and the post-instantiated form (type attribute changes)
    return '.or-appearance-draw input[data-type-xml="binary"][accept^="image"], .or-appearance-signature input[data-type-xml="binary"][accept^="image"], .or-appearance-annotate input[data-type-xml="binary"][accept^="image"]';
  }

  _init() {
    let canvas;
    const that = this;
    const existingFilename = this.element.dataset.loadedFileName;

    this.element.type = 'text';
    this.element.dataset.drawing = true;

    this.element.after(this._getMarkup());
    const { question } = this;

    question.classList.add(`or-${this.props.type}-initialized`);

    this.$widget = $(question.querySelector('.widget'));

    canvas = this.$widget[0].querySelector('.draw-widget__body__canvas');
    this._handleResize(canvas);
    this._resizeCanvas(canvas);

    if (this.props.load) {
      this._handleFiles(existingFilename);
    }

    // This listener serves to capture a drawing when the submit button is clicked within [DELAY]
    // milliseconds after the last stroke ended. Note that this could be the entire drawing/signature.
    canvas.addEventListener('blur', this._forceUpdate.bind(this));

    // We built a delay in saving on stroke "end", to avoid excessive updating
    // This event does not fire on touchscreens for which we use the .hide-canvas-btn click
    // to do the same thing.

    this.initialize = fileManager.init().then(() => {
      that.pad = new SignaturePad(canvas, {
        onEnd: () => {
          // keep replacing this timer so continuous drawing
          // doesn't update the value after every stroke.
          clearTimeout(that._updateWithDelay);
          that._updateWithDelay = setTimeout(
            that._updateValue.bind(that),
            DELAY
          );
        },
        penColor: that.props.colors[0] || 'black',
      });
      that.pad.off();
      if (existingFilename) {
        that.element.value = existingFilename;

        return that
          ._loadFileIntoPad(existingFilename)
          .then(that._updateDownloadLink.bind(that));
      }

      return true;
    });
    this.disable();
    this.initialize
        .then(() => {
          that.$widget
              .find('.btn-reset')
              .on('click', that._reset.bind(that))
              .end()
              .find('.draw-widget__colorpicker')
              .on('click', '.current', function () {
                $(this).parent().toggleClass('reveal');
              })
              .on('click', '[data-color]:not(.current)', function () {
                $(this)
                  .siblings()
                  .removeClass('current')
                  .end()
                  .addClass('current')
                  .parent()
                  .removeClass('reveal');
                that.pad.penColor = this.dataset.color;
              })
              .end()
              .find('.draw-widget__undo')
              .on('click', () => {
                const data = that.pad.toData();
                that.pad.clear();
                const fileInput =
                  that.$widget[0].querySelector('input[type=file]');
                // that.element.dataset.loadedFileName will have been removed only after resetting
                const fileToLoad =
                  fileInput && fileInput.files[0]
                    ? fileInput.files[0]
                    : that.element.dataset.loadedFileName;
                that._loadFileIntoPad(fileToLoad).then(() => {
                  that.pad.updateData(data.slice(0, -1));
                  that._updateValue();
                  that.pad.penColor = that.$widget.find(
                    '.draw-widget__colorpicker .current'
                  )[0].dataset.color;
                });
              })
              .end()
              .find('.show-canvas-btn')
              .on('click', () => {
                that.$widget.addClass('full-screen');
                that._resizeCanvas(canvas);
                that.enable();

                return false;
              })
              .end()
              .find('.hide-canvas-btn')
              .on('click', () => {
                that.$widget.removeClass('full-screen');
                that.pad.off();
                that._forceUpdate();
                that._resizeCanvas(canvas);

                return false;
              })
              .click();

          $(canvas).on('canvasreload', () => {
            if (that.cache) {
              that.pad
                  .fromObjectURL(that.cache)
                  .then(that._updateValue.bind(that, false));
            }
          });
          that.enable();
        })
        .catch((error) => {
          that._showFeedback(error.message);
        });

    $(this.element)
      .on('applyfocus', () => {
        canvas.focus();
      })
      .closest('[role="page"]')
      .on(events.PageFlip().type, () => {
        // When an existing value is loaded into the canvas and is not
        // the first page, it won't become visible until the canvas is clicked
        // or the window is resized:
        // https://github.com/kobotoolbox/enketo-express/issues/895
        // This also fixes a similar issue with an empty canvas:
        // https://github.com/kobotoolbox/enketo-express/issues/844
        that._resizeCanvas(canvas);
      });
  }

  _forceUpdate() {
    if (this._updateWithDelay) {
      clearTimeout(this._updateWithDelay);
      this._updateValue();
    }
  }

  // All this is copied from the file-picker widget
  /**
   * @param {string} loadedFileName - the loaded filename
   */
  _handleFiles(loadedFileName) {
    // Monitor maxSize changes to update placeholder text in annotate widget. This facilitates asynchronous
    // obtaining of max size from server without slowing down form loading.
    this._updatePlaceholder();
    this.element
        .closest('form.or')
        .addEventListener(
          events.UpdateMaxSize().type,
          this._updatePlaceholder.bind(this)
        );

    const that = this;

    const $input = this.$widget.find('input[type=file]');
    const $fakeInput = this.$widget.find('.fake-file-input');

    // show loaded file name or placeholder regardless of whether widget is supported
    this._showFileName(loadedFileName);

    $input
      .on('click', (event) => {
        // The purpose of this handler is to block the filepicker window
        // when the label is clicked outside of the input.
        if (that.props.readonly || event.namespace !== 'propagate') {
          that.$fakeInput.focus();
          event.stopImmediatePropagation();

          return false;
        }
      })
      .on('change', function () {
        // Get the file
        const file = this.files[0];

        if (file) {
          // Process the file
          if (!fileManager.isTooLarge(file)) {
            // Update UI
            that.pad.clear();
            that._loadFileIntoPad(this.files[0]).then(() => {
              that._updateValue.call(that);// NOSONAR
              that._showFileName(file.name);
              that.enable();
            });
          } else {
            that._showFeedback(
              t('filepicker.toolargeerror', {
                maxSize: fileManager.getMaxSizeReadable(),
              })
            );
          }
        } else {
          that._showFileName(null);
        }
      });

    $fakeInput
      .on('click', function (event) {
        /*
            The purpose of this handler is to selectively propagate clicks on the fake
            input to the underlying file input (to show the file picker window).
            It blocks propagation if the filepicker has a value to avoid accidentally
            clearing files in a loaded record, hereby blocking native browser file input behavior
            to clear values. Instead the reset button is the only way to clear a value.
        */
        if (
          that.props.readonly ||
          $input[0].value ||
          $fakeInput[0].value
        ) {
          $(this).focus();
          event.stopImmediatePropagation();

          return false;
        }
        event.preventDefault();
        $input.trigger('click.propagate');
      })
      .on(
        'change',
        () =>
          // For robustness, avoid any editing of filenames by user.
          false
      );
  }

  /**
   * @param {string} fileName - filename to show
   */
  _showFileName(fileName) {
    this.$widget
        .find('.fake-file-input')
        .val(fileName)
        .prop('readonly', !!fileName);
  }

  /**
   * Updates placeholder
   */
  _updatePlaceholder() {
    this.$widget.find('.fake-file-input').attr(
      'placeholder',
      t('filepicker.placeholder', {
        maxSize: fileManager.getMaxSizeReadable() || '?MB',
      })
    );
  }

  /**
   * @return {DocumentFragment} a document fragment with the widget markup
   */
  _getMarkup() {
    // HTML syntax copied from filepicker widget
    const load = this.props.load
      ? `<input type="file" class="ignore draw-widget__load"${
        this.props.capture !== null // NOSONAR
          ? ` capture="${this.props.capture}"`
          : ''
      } accept="${
        this.props.accept
      }"/><div class="widget file-picker"><input class="ignore fake-file-input"/><div class="file-feedback"></div></div>`
      : '';
    const fullscreenBtns = this.props.touch
      ? '<button type="button" class="show-canvas-btn btn btn-default">Draw/Sign</button>' +
      '<button type="button" class="hide-canvas-btn btn btn-default"><span class="icon icon-arrow-left"> </span></button>'
      : '';
    const fragment = document.createRange().createContextualFragment(
      `<div class="widget draw-widget">
                <div class="draw-widget__body">
                    ${fullscreenBtns}
                    ${load}
                    <canvas class="draw-widget__body__canvas noSwipe disabled" tabindex="0"></canvas>
                    <div class="draw-widget__colorpicker"></div>
                    ${
        this.props.type === 'signature'
          ? ''
          : '<button class="btn-icon-only draw-widget__undo" aria-label="undo" type=button><i class="icon icon-undo"> </i></button>'
      }
                </div>
                <div class="draw-widget__footer">
                    <div class="draw-widget__feedback"></div>
                </div>
            </div>`
    );
    fragment
      .querySelector('.draw-widget__footer')
      .prepend(this.downloadButtonHtml);
    fragment
      .querySelector('.draw-widget__footer')
      .prepend(this.resetButtonHtml);

    const colorpicker = fragment.querySelector('.draw-widget__colorpicker');

    this.props.colors.forEach((color, index) => {
      const current = index === 0 ? ' current' : '';
      const colorDiv = document
        .createRange()
        .createContextualFragment(
          `<div class="${current}"data-color="${color}" style="background: ${color};" />`
        );
      colorpicker.append(colorDiv);
    });

    return fragment;
  }

  /**
   * Updates value
   *
   * @param {boolean} [changed] - whether the value has changed
   */
  _updateValue(changed = true) {
    const newValue = this.pad.toDataURL();
    if (this.value !== newValue) {
      // Note that this.element has become a text input.
      // When a default file is loaded this function is called by the canvasreload handler, but the user hasn't changed anything.
      // We want to make sure the model remains unchanged in that case.
      if (changed) {
        // This code is slightly different from the Enekto draw widget since it contains a bug fix for:
        // https://github.com/enketo/enketo/issues/1323
        const now = new Date();
        const postfix = `-${now.getHours()}_${now.getMinutes()}_${now.getSeconds()}`;
        this.element.dataset.filenamePostfix = postfix;
        this.originalInputValue = this.props.filename;
      }
      // pad.toData() doesn't seem to work when redrawing on a smaller canvas. Doesn't scale.
      // pad.toDataURL() is crude and memory-heavy but the advantage is that it will also work for appearance=annotate
      this.value = newValue;
      this._updateDownloadLink(this.value);
    }
  }

  /**
   * Clears pad, cache, loaded file name, download link and others
   */
  _reset() { // NOSONAR
    const that = this;

    if (this.element.value) {
      // This discombobulated line is to help the i18next parser pick up all 3 keys.
      const item =
        this.props.type === 'signature'
          ? t('drawwidget.signature')
          : this.props.type === 'drawing' // NOSONAR
            ? t('drawwidget.drawing')
            : t('drawwidget.annotation');
      dialog
        .confirm(t('filepicker.resetWarning', { item }))
        .then((confirmed) => {
          if (!confirmed) {
            return;
          }
          that.pad.clear();
          that.cache = null;
          // Only upon reset is loadedFileName removed, so that "undo" will work
          // for drawings loaded from storage.
          delete that.element.dataset.loadedFileName;
          delete that.element.dataset.loadedUrl;
          that.element.dataset.filenamePostfix = '';
          $(that.element).val('').trigger('change');
          if (that._updateWithDelay) {
            // This ensures that an emptied canvas will not be considered a drawing to be captured
            // in _forceUpdate, e.g. after the blur event fires on an empty canvas see issue #924
            that._updateWithDelay = null;
          }
          // Annotate file input
          that.$widget
              .find('input[type=file]')
              .val('')
              .trigger('change');
          that._updateDownloadLink('');
          that.disable();
          that.enable();
        });
    }
  }

  /**
   * @param {string|File} file - Either a filename or a file.
   * @return {Promise} promise resolving with a string
   */
  _loadFileIntoPad(file) {
    const that = this;
    if (!file) {
      return Promise.resolve('');
    }
    if (
      typeof file === 'string' &&
      file.startsWith('jr://') &&
      this.element.dataset.loadedUrl
    ) {
      file = this.element.dataset.loadedUrl;
    }

    return fileManager
      .getObjectUrl(file)
      .then(that.pad.fromObjectURL.bind(that.pad))
      .then((objectUrl) => {
        that.cache = objectUrl;

        return objectUrl;
      })
      .catch(() => {
        that._showFeedback(
          'File could not be loaded (leave unchanged if already submitted and you want to preserve it).',
          'error'
        );
      });
  }

  /**
   * @param {string} message - the feedback message to show
   */
  _showFeedback(message) {
    message = message || '';

    // replace text and replace all existing classes with the new status class
    this.$widget.find('.draw-widget__feedback').text(message);
  }

  /**
   * @param {string} url - the download URL
   */
  _updateDownloadLink(url) {
    if (url && url.indexOf('data:') === 0) {
      url = URL.createObjectURL(dataUriToBlobSync(url));
    }
    const fileName = url
      ? getFilename(
        { name: this.element.value },
        this.element.dataset.filenamePostfix
      )
      : '';
    downloadUtils.updateDownloadLink(
      this.$widget.find('.btn-download')[0],
      url,
      fileName
    );
  }

  /**
   * Forces update and resizes canvas on window resize
   *
   * @param {Element} canvas - Canvas element
   */
  _handleResize(canvas) {
    const that = this;
    $(window).on('resize', () => {
      // that._forceUpdate(); // NOSONAR
      that._resizeCanvas(canvas);
    });
  }

  /**
   * Adjust canvas coordinate space taking into account pixel ratio,
   * to make it look crisp on mobile devices.
   * This also causes canvas to be cleared.
   *
   * @param {Element} canvas - Canvas element
   */
  _resizeCanvas(canvas) {
    // Use a little trick to avoid resizing currently-hidden canvases
    // https://github.com/enketo/enketo-core/issues/605
    if (canvas.offsetWidth > 0) {
      // When zoomed out to less than 100%, for some very strange reason,
      // some browsers report devicePixelRatio as less than 1
      // and only part of the canvas is cleared then.
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      $(canvas).trigger('canvasreload');
    }
  }

  /**
   * Disables widget
   */
  disable() {
    const that = this;
    const canvas = this.$widget.find('.draw-widget__body__canvas')[0];

    this.initialize.then(() => {
      that.pad.off();
      canvas.classList.add('disabled');
      that.$widget.find('.btn-reset').prop('disabled', true);
    });
  }

  /**
   * Enables widget
   */
  enable() {
    const that = this;
    const canvas = this.$widget.find('.draw-widget__body__canvas')[0];
    const touchNotFull =
      this.props.touch && !this.$widget.is('.full-screen');
    const needFile = this.props.load && !this.element.value;

    this.initialize.then(() => {
      if (!that.props.readonly && !needFile && !touchNotFull) {
        that.pad.on();
        canvas.classList.remove('disabled');
        that.$widget.find('.btn-reset').prop('disabled', false);
      }
      // https://github.com/enketo/enketo-core/issues/450
      // When loading a question with a relevant, it is invisible
      // until branch.js removes the "pre-init" class. The rendering of the
      // canvas may therefore still be ongoing when this widget is instantiated.
      // For that reason we call _resizeCanvas when enable is called to make
      // sure the canvas is rendered properly.
      that._resizeCanvas(canvas);
    });
  }

  /**
   * Updates value when it is programmatically cleared.
   * There is no way to programmatically update a file input other than clearing it, so that's all
   * we need to do.
   */
  update() {
    if (this.originalInputValue === '') {
      this._reset();
    }
  }

  /**
   * @type {object}
   */
  get props() {
    const props = this._props;

    props.type = props.appearances.includes('draw')
      ? 'drawing'
      : props.appearances.includes('signature') // NOSONAR
        ? 'signature'
        : 'annotation';
    props.filename = `${props.type}.png`;
    props.load = props.type === 'annotation';
    props.colors =
      props.type === 'signature'
        ? []
        : [
          'black',
          'lightblue',
          'blue',
          'red',
          'orange',
          'cyan',
          'yellow',
          'lightgreen',
          'green',
          'pink',
          'purple',
          'lightgray',
          'darkgray',
        ];
    props.touch = support.touch;
    props.accept = this.element.getAttribute('accept');
    props.capture = this.element.getAttribute('capture');

    return props;
  }

  /**
   * @type {string}
   */
  get value() {
    return this.cache || '';
  }

  set value(dataUrl) {
    this.cache = dataUrl;
  }
}

module.exports = DrawWidget;
// NOSONAR_END
