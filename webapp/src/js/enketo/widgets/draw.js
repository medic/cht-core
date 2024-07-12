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
    const existingFilename = this.element.dataset.loadedFileName;

    this.element.type = 'text';
    this.element.dataset.drawing = true;

    this.element.after(this._getMarkup());
    this.$widget = $(this.question.querySelector('.widget'));
    this.canvas = this.$widget[0].querySelector('.draw-widget__body__canvas');

    if (this.props.load) {
      this._handleFiles(existingFilename);
    }

    this.initialize = fileManager.init().then(() => {
      this.pad = new SignaturePad(this.canvas, {
        penColor: this.props.colors[0] || 'black',
      });
      this.pad.addEventListener('endStroke', () => {
        // keep replacing this timer so continuous drawing
        // doesn't update the value after every stroke.
        clearTimeout(this._updateWithDelay);
        this._updateWithDelay = setTimeout(
          this._updateValue.bind(this),
          DELAY
        );
      });
      this.resizeObserver = new ResizeObserver(this._resizeCanvas.bind(this));
    });
    this.disable();
    this.initialize
      .then(() => {
        const that = this;
        this.$widget
          .find('.btn-reset')
          .on('click', this._reset.bind(this))
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
            const data = this.pad.toData();
            if (data) {
              data.pop(); // remove the last dot or line
              this.pad.fromData(data);
            }
          })
          .end();

        this.enable();
      })
      .catch((error) => {
        this._showFeedback(error.message);
      });
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
      const now = new Date();
      const postfix = `-${now.getHours()}_${now.getMinutes()}_${now.getSeconds()}`;
      this.element.dataset.filenamePostfix = postfix;
      // Note that this.element has become a text input.
      // When a default file is loaded this function is called by the canvasreload handler, but the user hasn't changed anything.
      // We want to make sure the model remains unchanged in that case.
      if (changed) {
        this.originalInputValue = this.props.filename;
      }
      // pad.toData() doesn't seem to work when redrawing on a smaller canvas. Doesn't scale.
      // pad.toDataURL() is crude and memory-heavy but the advantage is that it will also work for appearance=annotate
      this.value = newValue;
    }
  }

  /**
   * Clears pad, cache, loaded file name, download link and others
   */
  _reset() { // NOSONAR
    if (!this.element.value) {
      return;
    }

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
        this.pad.clear();
        this.cache = null;
        // Only upon reset is loadedFileName removed, so that "undo" will work
        // for drawings loaded from storage.
        delete this.element.dataset.loadedFileName;
        delete this.element.dataset.loadedUrl;
        this.element.dataset.filenamePostfix = '';
        $(this.element).val('').trigger('change');
        if (this._updateWithDelay) {
          // This ensures that an emptied canvas will not be considered a drawing to be captured
          // in _forceUpdate, e.g. after the blur event fires on an empty canvas see issue #924
          this._updateWithDelay = null;
        }
        // Annotate file input
        this.$widget
            .find('input[type=file]')
            .val('')
            .trigger('change');
        this._updateDownloadLink('');
        this.disable();
        this.enable();
      });
  }

  /**
   * @param {string|File} file - Either a filename or a file.
   * @return {Promise} promise resolving with a string
   */
  _loadFileIntoPad(file) {
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
      .then(async (objectUrl) => {
        this.cache = {
          objectUrl,
          options: await this._getImageScalingOptions(objectUrl)
        };
        return this.pad.fromDataURL(objectUrl, this.cache.options);
      })
      .catch(() => {
        this._showFeedback(
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

  async _getImageScalingOptions(dataUrl) {
    return new Promise((resolve) => {
      const image = new Image();
      const deviceRatio = window.devicePixelRatio || 1;
      const width = this.canvas.width / deviceRatio;
      const height = this.canvas.height / deviceRatio;

      image.onload = () => {
        const imgWidth = image.width;
        const imgHeight = image.height;
        const hRatio = width / imgWidth;
        const vRatio = height / imgHeight;

        if (hRatio < 1 || vRatio < 1) {
          // if image is bigger than canvas then fit within the canvas
          const ratio = Math.min(hRatio, vRatio);
          const left = (width - imgWidth * ratio) / 2;
          const top = (height - imgHeight * ratio) / 2;
          resolve({
            xOffset: left,
            yOffset: top,
            width: imgWidth * ratio,
            height: imgHeight * ratio,
          });
        }
        // if image is smaller than canvas then show it in the center and don't stretch it
        const left = (width - imgWidth) / 2;
        const top = (height - imgHeight) / 2;
        resolve({
          xOffset: left,
          yOffset: top,
          width: imgWidth,
          height: imgHeight,
        });
      };
      image.src = dataUrl;
    });
  }

  // Adjust canvas coordinate space taking into account pixel ratio,
  // to make it look crisp on mobile devices.
  // This also causes canvas to be cleared.
  _resizeCanvas() {
    // When zoomed out to less than 100%, for some very strange reason,
    // some browsers report devicePixelRatio as less than 1
    // and only part of the canvas is cleared then.
    const ratio =  Math.max(window.devicePixelRatio || 1, 1);

    // This part causes the canvas to be cleared
    this.canvas.width = this.canvas.offsetWidth * ratio;
    this.canvas.height = this.canvas.offsetHeight * ratio;
    this.canvas.getContext("2d").scale(ratio, ratio);

    if(this.cache) {
      const padData = this.pad.toData();
      this.pad.clear();
      this.pad.fromDataURL(this.cache.objectUrl, this.cache.options).then(() => {
        this.pad.fromData(padData,{ clear: false });
      });
    } else {
      this.pad.fromData(this.pad.toData());
    }
  };

  /**
   * Disables widget
   */
  disable() {
    this.initialize.then(() => {
      this.resizeObserver.disconnect();
      this.pad.off();
      this.canvas.classList.add('disabled');
      this.$widget.find('.btn-reset').prop('disabled', true);
    });
  }

  /**
   * Enables widget
   */
  enable() {
    this.initialize.then(() => {
      this.resizeObserver.observe(this.$widget[0].querySelector('.draw-widget__body'));

      this.pad.on();
      this.canvas.classList.remove('disabled');
      this.$widget.find('.btn-reset').prop('disabled', false);
      // https://github.com/enketo/enketo-core/issues/450
      // When loading a question with a relevant, it is invisible
      // until branch.js removes the "pre-init" class. The rendering of the
      // canvas may therefore still be ongoing when this widget is instantiated.
      // For that reason we call _resizeCanvas when enable is called to make
      // sure the canvas is rendered properly.
      this._resizeCanvas(this.canvas);
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
}

module.exports = DrawWidget;
// NOSONAR_END
