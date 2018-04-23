/**
 * Extends the bootstrap dropdown to allow multiple selections.
 */
(function($){

  'use strict';


  $.fn.multiDropdown = function(options) {

    options = options || {};

    if (!options.label) {
      options.label = function(state, callback) {
        if (state.selected.length === 0 || state.selected.length === state.total.length) {
          return callback(state.menu.data('label-no-filter'));
        }
        if (state.selected.length === 1) {
          return callback(state.selected.first().text());
        }
        return callback(state.selected.length + ' ' + state.menu.data('filter-label'));
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
      options: function() {
        return $element.find('[role=menuitem]').map(function() {
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

    var updateMultipleSelect = function() {
      return options.label(
        {
          total: $element.find('[role=menuitem]'),
          selected: $element.find('[role=menuitem].selected'),
          menu: $element
        },
        function(result) {
          $element.find('.mm-button-text').text(result);
        }
      );
    };

    var updateSelected = function() {
      $element.trigger({ type: 'update' });
      updateMultipleSelect();
      state.blockSelectHide = true;
    };

    var selectItem = function() {
      var item = $(this);
      item.blur();
      item.closest('li')
          .find('[role=menuitem]')
          .toggleClass('selected', !item.is('.selected'));
      updateSelected();
    };

    var hideMenu = function(e) {
      if (state.blockSelectHide) {
        e.preventDefault();
        state.blockSelectHide = false;
      }
    };

    $element.on('update', updateMultipleSelect);
    $element.on('click', function(e) {
      if ($element.is('.disabled')) {
        e.stopPropagation();
        e.preventDefault();
      }
    });
    $element.on('click', '[role=menuitem]', selectItem);
    $element.on('hide.bs.dropdown', hideMenu);

    updateMultipleSelect();
    
    $element.data('multidropdown', state);

    var selectAllLabel = options.selectAllLabel || 'select all';
    var clearLabel = options.clearLabel || 'clear';
    var actionsBar =
      '<p class="actions">' +
        '<a href="#" class="btn btn-link select-all">' + selectAllLabel + '</a>' +
        '<a href="#" class="btn btn-link reset">' + clearLabel + '</a>' +
      '</p>';
    $element.find('[role=menu]').prepend(actionsBar);
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