angular.module('inboxServices').factory('UHCSettings',
  function() {
    'use strict';
    'ngInject';

    const getMonthStartDate = settings => {
      return settings &&
             settings.uhc &&
             (
               settings.uhc.month_start_date ||
               settings.uhc.visit_count &&
               settings.uhc.visit_count.month_start_date
             );
    };

    const getVisitCountSettings = settings => {
      if (!settings || !settings.uhc || !settings.uhc.visit_count) {
        return {};
      }

      return {
        monthStartDate: getMonthStartDate(settings),
        visitCountGoal: settings.uhc.visit_count.visit_count_goal,
      };
    };

    const getContactsDefaultSort = settings => {
      return settings &&
             settings.uhc &&
             settings.uhc.contacts_default_sort;
    };

    return {
      getVisitCountSettings,
      getMonthStartDate,
      getContactsDefaultSort
    };
  }
);
