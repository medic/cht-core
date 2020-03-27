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

    let state = $(this).data('multidropdown');

    if (state) {
      return state;
    }

    const $element = $(this);

    const getVal = function(selector) {
      return $element.find(selector).map(function() {
        return $(this).find('> a').data('value');
      }).get();
    };

    state = {
      blockSelectHide: false,
      val: function() {
        return getVal('li.selected:not(.disabled)');
      },
      options: function() {
        return getVal('li:not(.disabled)');
      },
      reset: function() {
        $element.find('li').removeClass('selected disabled');
        updateMultipleSelect();
      },
      selectAll: function() {
        $element.find('.dropdown-menu > ul > li')
          .addClass('selected')
          .find('li')
          .addClass('selected disabled');
        updateMultipleSelect();
      }
    };

    const updateMultipleSelect = function() {
      return options.label(
        {
          total: $element.find('li'),
          selected: $element.find('li.selected'),
          menu: $element
        },
        function(result) {
          $element.find('.mm-button-text').text(result);
        }
      );
    };

    const updateSelected = function() {
      $element.trigger({ type: 'update' });
      updateMultipleSelect();
      state.blockSelectHide = true;
    };

    const selectItem = function(e) {
      e.stopPropagation();
      e.preventDefault();
      const item = $(this);
      item.blur();
      if (item.closest('li').is('.disabled')) {
        return;
      }
      const update = !item.is('.selected');
      item.find('li').toggleClass('disabled selected', update);
      item.toggleClass('selected', update);
      updateSelected();
    };

    const hideMenu = function(e) {
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
    $element.on('click', 'li', selectItem);
    $element.on('hide.bs.dropdown', hideMenu);

    updateMultipleSelect();
    
    $element.data('multidropdown', state);

    const selectAllLabel = options.selectAllLabel || 'select all';
    const clearLabel = options.clearLabel || 'clear';
    const actionsBar =
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
