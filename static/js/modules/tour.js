var _ = require('underscore');

(function () {

  'use strict';

  var mmScroll = function(container, elem) {
    container = $(container);
    if (container.length) {
      elem = container.find(elem);
      if (elem.length) {
        container.scrollTop(container.scrollTop() + elem.offset().top - 300);
      }
    }
  };

  var isMobile = function() {
    return $('#back').is(':visible');
  };

  var mmShowMessageList = function() {
    mmShow('#message-list', true);
  };

  var mmShowMessageContent = function() {
    mmShow('#message-list', false);
  };

  var mmShowReportList = function() {
    mmShow('#reports-list', true);
  };

  var mmShowReportContent = function() {
    mmShow('#reports-list', false);
  };

  var mmShow = function(list, show) {
    if (isMobile()) {
      var scope = angular.element($('body')).scope();
      if (scope) {
        var id = show ? undefined : $(list).find('li').filter(':first').attr('data-record-id');
        scope.$apply(function() {
          scope.setMessage(id);
        });
      }
    }
  };

  var mmOpenDropdown = function(elem) {
    if (!isMobile()) {
      window.setTimeout(function() {
        $(elem).addClass('open');
      }, 1);
    }
  };

  var tours = [
    {
      name: 'messages',
      orphan: true,
      debug: true,
      steps: [
        {
          element: '#messages-tab',
          placement: 'bottom',
          title: 'Unstructured Messages',
          content: 'Here you can communicate with patients, community health workers, and community members to schedule trainings, ask and respond to questions, and provide additional information — just like regular SMS. You can also send bulk messages to groups of people.',
          onShow: mmShowMessageList
        },
        {
          element: '#message-list',
          placement: 'right',
          mobilePlacement: 'orphan',
          title: 'Message Contacts List',
          content: 'This is a list of all your message contacts with the most recent one on top. The light blue highlight indicates which message is being displayed on the right. If the name is bold it means you haven\'t read one or more messages with this contact.',
          onShow: mmShowMessageList
        },
        {
          element: '#message-content',
          placement: 'left',
          mobilePlacement: 'orphan',
          title: 'Message Exchange',
          content: 'This pane shows the exchange of messages from the selected health worker or phone number on the left.',
          onShow: mmShowMessageContent
        },
        {
          element: '#message-header',
          placement: 'bottom',
          title: 'Contact\'s Information',
          content: 'This bar contains the contact\'s name and phone number on the left, and their location on the right.',
          onShow: mmShowMessageContent
        },
        {
          element: '#message-content .outgoing:last .message-body',
          placement: 'top',
          title: 'Outgoing Messages',
          content: 'The blue border indicates an outgoing message sent by you, another user, or an automated message from Medic Mobile.',
          onShow: function() {
            mmShowMessageContent();
            mmScroll('#message-content', '.outgoing:last');
          }
        },
        {
          element: '#message-content .incoming:last .message-body',
          placement: 'top',
          title: 'Incoming Messages',
          content: 'The yellow border indicates an incoming message sent by the selected contact.',
          onShow: function() {
            mmShowMessageContent();
            mmScroll('#message-content', '.incoming:last');
          }
        },
        {
          element: '#message-footer',
          placement: 'top',
          title: 'Send Message To Contact',
          content: 'Use this box to quickly send an SMS message to the contact.',
          onShow: mmShowMessageContent
        }
      ]
    },
    {
      name: 'reports',
      orphan: true,
      debug: true,
      steps: [
        {
          element: '#reports-tab',
          placement: 'bottom',
          title: 'Report Forms',
          content: 'All of the reports submitted by community health workers live here. Depending on how you are using Medic Mobile in your community, these reports may be for pregnancy registrations, completed visits, or stock outs.',
          onShow: mmShowReportList
        },
        {
          element: '#formTypeDropdown',
          placement: 'right',
          mobilePlacement: 'bottom',
          title: 'Form Types Filter',
          content: 'Select one or more form types to filter the list of reports to only those for the chosen forms.',
          onShow: mmShowReportList,
          onShown: function() {
            mmOpenDropdown('#formTypeDropdown');
          },
          onHide: function() {
            $('#formTypeDropdown').removeClass('open');
          }
        },
        {
          element: '#facilityDropdown',
          placement: 'right',
          mobilePlacement: 'bottom',
          title: 'Facilities Filter',
          content: 'Select one or more facilities to filter the list of reports to only those from the chosen facilities.',
          onShow: mmShowReportList,
          onShown: function() {
            mmOpenDropdown('#facilityDropdown');
          },
          onHide: function() {
            $('#facilityDropdown').removeClass('open');
          }
        },
        {
          element: '#dateRangeDropdown',
          placement: 'left',
          mobilePlacement: 'bottom',
          title: 'Date Range Filter',
          content: 'To view reports within a specified date range, select a start and ending date.',
          onShow: mmShowReportList,
          onShown: function() {
            if (!isMobile()) {
              $('#date-filter').trigger('click');
            }
          },
          onHide: function() {
            $('#date-filter').trigger('hide.daterangepicker');
          }
        },
        {
          element: '#statusDropdown',
          placement: 'left',
          mobilePlacement: 'bottom',
          title: 'Status Filter',
          content: 'To filter by validity or verification, select one or more options.',
          onShow: mmShowReportList,
          onShown: function() {
            mmOpenDropdown('#statusDropdown');
          },
          onHide: function() {
            $('#statusDropdown').removeClass('open');
          }
        },
        {
          element: '#freetext',
          mobileElement: '#mobile-search',
          placement: 'left',
          mobilePlacement: 'bottom',
          title: 'Freetext Filter',
          content: 'To add additional search terms type them here and click the search button.',
          onShow: mmShowReportList
        },
        {
          element: '#reports-list',
          placement: 'right',
          mobilePlacement: 'orphan',
          title: 'Incoming Reports',
          content: 'This is a list of all your report messages from health workers with the most recent first.',
          onShow: mmShowReportList
        },
        {
          element: '#reports-list li:first-child .mm-badge',
          placement: 'right',
          mobilePlacement: 'bottom',
          title: 'Report Status',
          content: 'This icon shows the status of the report. A green circle means the report is valid, and red means invalid. A tick in the circle means someone has verified this report.',
          onShow: mmShowReportList
        },
        {
          element: '#reports-content',
          placement: 'left',
          mobilePlacement: 'orphan',
          title: 'Report Details',
          content: 'You can see the details of the selected report in this pane.',
          onShow: mmShowReportContent
        },
        {
          element: '#reports-content .meta',
          placement: 'left',
          mobilePlacement: 'bottom',
          title: 'Report Information',
          content: 'On the left hand side is the reporter\'s details. On the right hand side is the reported date.',
          onShow: mmShowReportContent
        },
        {
          element: '#reports-content .body',
          placement: 'left',
          mobilePlacement: 'top',
          title: 'Report Content',
          content: 'The content of the report including the form type, submitted fields, generated fields, and any generated messages.',
          onShow: mmShowReportContent
        },
        {
          element: '.action-container .actions',
          placement: 'top',
          title: 'Actions',
          content: 'Actions you can perform on this report.',
          onShow: mmShowReportContent
        }
      ]
    },
    {
      name: 'analytics',
      orphan: true,
      debug: true,
      steps: [
        {
          element: '#analytics-tab',
          placement: 'bottom',
          title: 'Data Visualization Analytics',
          content: 'Medic Mobile organizes the data from your reports into charts and graphs to help you track pregnancies, monitor danger signs, and identify trends in your community - so you can make well-informed decisions and take action when it is needed.'
        }
      ]
    }
  ];

  var current;

  var getSettings = function(name) {
    var settings = _.findWhere(tours, { name: name }) || tours[0];
    if (isMobile()) {
      // there's no room to show steps to the left or right on a mobile device
      _.each(settings.steps, function(step) {
        if (step.mobileElement) {
          step.element = step.mobileElement;
        }
        if (step.mobilePlacement) {
          if (step.mobilePlacement === 'orphan') {
            step.element = undefined;
          } else {
            step.placement = step.mobilePlacement;
          }
        }
      });
    }
    return settings;
  };

  var createTour = function(name) {
    var settings = getSettings(name);
    var tour = new Tour(settings);
    tour._scrollIntoView = function(element, callback) {
      // override scrollIntoView as it doesn't handle scolling containers
      this._debug('Not scrolling into view - overridden by Medic Mobile custom tour.js');
      callback();
    };
    tour.init();
    tour.restart();
    current = {
      tour: tour,
      name: name
    };
  };

  var endCurrent = function() {
    if (current && current.tour) {
      current.tour.end();
      // remove any popovers that have become disassociated
      $('.popover.tour-' + current.name).remove();
      current = undefined;
    }
  };

  exports.start = function(name) {
    if (current && current.name && current.name === name) {
      // the tour is already running
      return;
    }
    endCurrent();
    if (name) {
      if (name === 'intro') {
        $('#tour-select').modal('show');
      } else {
        window.setTimeout(function() {
          createTour(name);
        }, 1);
      }
    }
  };

}());