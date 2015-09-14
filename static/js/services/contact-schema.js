angular.module('inboxServices').service('ContactSchema', [
  function() {
    return {
      get: function() {
        return {
          person: {
            name: {
              type: 'string',
              required: true,
            },
            phone: {
              type: 'phone',
              required: true,
            },
            code: 'string',
            notes: 'text',
            catchment_area: 'db:clinic',
            health_center: 'db:health_center',
            district: 'db:district_hospital',
          },
        };
      },
    };
  }
]);
