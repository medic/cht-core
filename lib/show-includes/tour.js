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
      title: 'Settings Configuration',
      content: 'Here you can customize settings including translations, forms, and other general settings.',
      onShow: function() {
        showPage('settings', 'settings', 'settings');
      }
    },
    {
      element: '#content a[href=#settings]',
      placement: 'right',
      title: 'Settings',
      content: 'General configuration settings.',
      onShow: function() {
        showPage('settings', 'settings', 'settings');
      }
    },
    {
      element: '#content a[href=#translations]',
      placement: 'right',
      title: 'Translations',
      content: 'Configure the translation values.',
      onShow: function() {
        showPage('settings', 'settings', 'translations');
      }
    },
    {
      element: '#content a[href=#forms]',
      placement: 'right',
      title: 'Forms',
      content: 'Import and export the available forms.',
      onShow: function() {
        showPage('settings', 'settings', 'forms');
      }
    },
    {
      element: '#content a[href=#advanced]',
      placement: 'right',
      title: 'Advanced',
      content: 'Advanced settings and update application.',
      onShow: function() {
        showPage('settings', 'settings', 'advanced');
      }
    },
    {
      element: '#topnavlinks .schedules',
      placement: 'bottom',
      title: 'Schedules Configuration',
      content: 'Configure the messages that will be generated when a patient is registered.',
      onShow: function() {
        showPage('schedules', 'schedules');
      }
    },
    {
      element: '#topnavlinks .sms-forms-data',
      placement: 'bottom',
      title: 'Export',
      content: 'Export messages, reports, or the audit log. The exports are divided into specific districts and can be filtered by date.',
      onShow: function() {
        showPage('sms-forms-data', 'sms-forms-data');
      }
    },
    {
      element: '#topnavlinks .users',
      placement: 'bottom',
      title: 'User Management',
      content: 'Here you can create, edit, or delete users.',
      onShow: function() {
        showPage('user-management', 'users');
      }
    },
    {
      element: '#topnavlinks .facilities',
      placement: 'bottom',
      title: 'Facilities and Health Workers',
      content: 'Here is where you manage your facilities and field workers.',
      onShow: function() {
        showPage('facilities', 'facilities');
      }
    }
  ]
};

exports.start = function(name) {
  if (name === 'admin') {
    var tour = new Tour(adminTour);
    tour.init();
    tour.restart();
  }
};