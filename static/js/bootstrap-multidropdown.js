/**
 * Extends the bootstrap dropdown to allow multiple selections.
 */
(function($){

  'use strict';

  var actionsBar =
    '<p class="actions">' +
      '<a href="#" class="btn btn-link select-all">select all</a>' +
      '<a href="#" class="btn btn-link reset">clear</a>' +
    '</p>';

  $.fn.multiDropdown = function(options) {

    options = options || {};

    if (!options.label) {
      options.label = function(selected, total) {
        if (selected.length === 0 || selected.length === total) {
          return $element.data('label-no-filter');
        }
        if (selected.length === 1) {
          return selected.first().text();
        }
        return selected.length + ' ' + $element.data('filter-label');
      };
    }

    var state = $(this).data('multidropdown');

    if (state) {
      return state;
    }

    var $element = $(this);
    state = {
      blockSelectHide: false,
      val: function() {
        return $element.find('[role=menuitem].selected').map(function() {
          return $(this).data('value');
        }).get();
      },
      reset: function() {
        $element.find('[role=menuitem].selected').removeClass('selected');
        updateMultipleSelect();
      },
      selectAll: function() {
        $element.find('[role=menuitem]').addClass('selected');
        updateMultipleSelect();
      }
    };

    var getTitle = function() {
      var all = $element.find('[role=menuitem]');
      var selected = $element.find('[role=menuitem].selected');
      return options.label(selected, all.length);
    };

    var updateMultipleSelect = function() {
      $element.find('.mm-button-text').text(getTitle());
    };

    var updateSelected = function() {
      $element.trigger({ type: 'update' });
      updateMultipleSelect();
      state.blockSelectHide = true;
    };

    var selectItem = function() {
      var item = $(this);
      item.blur();
      item.toggleClass('selected');
      updateSelected();
    };

    var hideMenu = function(e) {
      if (state.blockSelectHide) {
        e.preventDefault();
        state.blockSelectHide = false;
      }
    };

    $element.on('update', updateMultipleSelect);
    $element.on('click', '[role=menuitem]', selectItem);
    $element.on('hide.bs.dropdown', hideMenu);

    updateMultipleSelect();
    
    $element.data('multidropdown', state);

    $element.find('[role=menu]').append(actionsBar);
    $element.find('[role=menu] .actions .select-all').on('click', function(e) {
      e.preventDefault();
      state.selectAll();
      updateSelected();
    });
    $element.find('[role=menu] .actions .reset').on('click', function(e) {
      e.preventDefault();
      state.reset();
      updateSelected();
    });

    return state;

  };

}(window.jQuery));