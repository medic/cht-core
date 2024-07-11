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
    this.element.type = 'text';
    this.element.dataset.drawing = true;

    this.element.after(this._getMarkup());
    this.$widget = $(this.question.querySelector('.widget'));
    this.canvas = this.$widget[0].querySelector('.draw-widget__body__canvas');

    this.initialize = fileManager.init().then(() => {
      this.pad = new SignaturePad(this.canvas);
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
        this.enable();
      })
      .catch((error) => {
        this._showFeedback(error.message);
      });
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
   * Clears pad, cache, loaded file name, download link and others
   */
  _reset() { // NOSONAR
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
        this.disable();
        this.enable();
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

    // This library does not listen for canvas changes, so after the canvas is automatically
    // cleared by the browser, SignaturePad#isEmpty might still return false, even though the
    // canvas looks empty, because the internal data of this library wasn't cleared. To make sure
    // that the state of this library is consistent with visual state of the canvas, you
    // have to clear it manually.
    this.pad.clear();
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
