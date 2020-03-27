

const angular = global.angular = {
  element: () => ({
    injector: () => ({
      get: () => ({
        instant: key => key,
      }),
    }),
  }),

  module: moduleName => {
    if (!global.angular.modules[moduleName]) {
      global.angular.modules[moduleName] = {
        filter: (filterName, filter) => {
          global.angular.modules[moduleName].filters[filterName] = filter;
        },
        filters: {},
      };
    }
    return global.angular.modules[moduleName];
  },
  modules: {},
};

module.exports = global.angular = angular;
