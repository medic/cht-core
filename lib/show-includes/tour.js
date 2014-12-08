var appinfo = require('views/lib/appinfo');

var showPage = function(page, linkClass, tab) {
  if ($('body').attr('data-page') !== page) {
    $('#topnavlinks .' + linkClass + ' a').click();
  }
  if (tab) {
    $('#content a[href=#' + tab + ']').click();
  }
};

var adminTour = {
  name: 'admin',
  orphan: true,
  debug: true,
  steps: [
    {
      element: '#topnavlinks .settings',
      placement: 'bottom',
      titleKey: 'tour.admin.configuration.title',
      contentKey: 'tour.admin.configuration.description',
      onShow: function() {
        showPage('settings', 'settings', 'settings');
      }
    },
    {
      element: '#settings-tab',
      placement: 'right',
      titleKey: 'tour.admin.settings.title',
      contentKey: 'tour.admin.settings.description',
      onShow: function() {
        showPage('settings', 'settings', 'settings');
      }
    },
    {
      element: '#translations-tab',
      placement: 'right',
      titleKey: 'tour.admin.translations.title',
      contentKey: 'tour.admin.translations.description',
      onShow: function() {
        showPage('settings', 'settings', 'translations');
      }
    },
    {
      element: '#forms-tab',
      placement: 'right',
      titleKey: 'tour.admin.forms.title',
      contentKey: 'tour.admin.forms.description',
      onShow: function() {
        showPage('settings', 'settings', 'forms');
      }
    },
    {
      element: '#advanced-tab',
      placement: 'right',
      titleKey: 'tour.admin.advanced.title',
      contentKey: 'tour.admin.advanced.description',
      onShow: function() {
        showPage('settings', 'settings', 'advanced');
      }
    },
    {
      element: '#topnavlinks .schedules',
      placement: 'bottom',
      titleKey: 'tour.admin.schedules.title',
      contentKey: 'tour.admin.schedules.description',
      onShow: function() {
        showPage('schedules', 'schedules');
      }
    },
    {
      element: '#topnavlinks .sms-forms-data',
      placement: 'bottom',
      titleKey: 'tour.admin.export.title',
      contentKey: 'tour.admin.export.description',
      onShow: function() {
        showPage('sms-forms-data', 'sms-forms-data');
      }
    },
    {
      element: '#topnavlinks .users',
      placement: 'bottom',
      titleKey: 'tour.admin.user.title',
      contentKey: 'tour.admin.user.description',
      onShow: function() {
        showPage('user-management', 'users');
      }
    },
    {
      element: '#topnavlinks .facilities',
      placement: 'bottom',
      titleKey: 'tour.admin.facilities.title',
      contentKey: 'tour.admin.facilities.description',
      onShow: function() {
        showPage('facilities', 'facilities');
      }
    }
  ]
};

var createTemplate = function(translationFn) {
  return  '<div class="popover">' +
            '<div class="arrow"></div>' +
            '<h3 class="popover-title"></h3>' +
            '<div class="popover-content"></div>' +
            '<div class="popover-navigation">' +
              '<div class="btn-group">' +
                '<button class="btn btn-sm btn-default" data-role="prev">' +
                  '&laquo; ' + translationFn('Previous') +
                '</button>' +
                '<button class="btn btn-sm btn-default" data-role="next">' +
                  translationFn('Next') + ' &raquo;' +
                '</button>' +
              '</div>' +
              '<button class="btn btn-sm btn-link" data-role="end">' +
                translationFn('End tour') +
              '</button>' +
            '</div>' +
          '</div>';
};

var getSettings = function() {
  var info = appinfo.getAppInfo.call(this);
  adminTour.template = createTemplate(info.translate);
  _.each(adminTour.steps, function(step) {
    step.title = info.translate(step.titleKey);
    step.content = info.translate(step.contentKey);
  });
  return adminTour;
};

exports.start = function(name) {
  if (name === 'admin') {
    var tour = new Tour(getSettings());
    tour.init();
    tour.restart();
  }
};