(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices', ['ngResource']);

  inboxServices.factory('Settings', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return $resource(BaseUrlService() + '/app_settings/medic', {}, {
        query: {
          method: 'GET',
          isArray: false,
          cache: true
        }
      });
    }
  ]);

  inboxServices.factory('User', ['$resource', 'UserNameService',
    function($resource, UserNameService) {
      return $resource('/_users/org.couchdb.user%3A' + UserNameService(), {}, {
        query: {
          method: 'GET',
          isArray: false,
          cache: true
        }
      });
    }
  ]);

  inboxServices.factory('FacilityRaw', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return $resource(BaseUrlService() + '/facilities.json', {}, {
        query: {
          method: 'GET',
          isArray: false,
          params: {
            startkey: '["clinic"]',
            endkey: '["clinic"]'
          }
        }
      });
    }
  ]);

  inboxServices.factory('Language', ['$q', 'User', 'Settings',
    function($q, User, Settings) {
      return {
        get: function() {
          var deferred = $q.defer();
          User.query(function(res) {
            if (res && res.language) {
              deferred.resolve(res.language);
            } else {
              Settings.query(function(res) {
                deferred.resolve((res.settings && res.settings.locale) || 'en');
              });
            }
          });
          return deferred.promise;
        }
      };
    }
  ]);

  inboxServices.factory('Form', ['$q', 'Language', 'Settings',
    function($q, Language, Settings) {

      var getLabel = function(form, language) {
        var label = form.meta.label;
        if (!label) {
          return form.meta.code;
        }
        if (angular.isString(label)) {
          return label;
        }
        if (!Object.keys(label).length) {
          return form.meta.code;
        }
        if (label[language]) {
          return label[language];
        }
        if (label.en) {
          return label.en;
        }
        return label[Object.keys(label)[0]];
      };

      return {
        get: function() {
          var deferred = $q.defer();

          Settings.query(function(res) {

            Language.get().then(
              function(language) {

                var result = [];

                if (res.settings && res.settings.forms) {
                  var forms = res.settings.forms;
                  for (var key in forms) {
                    if (forms.hasOwnProperty(key)) {
                      var form = forms[key];
                      result.push({
                        name: getLabel(form, language),
                        code: form.meta.code
                      });
                    }
                  }
                }

                result.sort(function(lhs, rhs) {
                  var lhsName = lhs.name.toUpperCase();
                  var rhsName = rhs.name.toUpperCase();
                  return lhsName.localeCompare(rhsName);
                });

                deferred.resolve(result);
              }
            );

          });

          return deferred.promise;
        }
      };
    }
  ]);

  inboxServices.factory('Facility', ['$q', 'FacilityRaw',
    function($q, FacilityRaw) {

      var inDistrict = function(userDistrict, clinic) {
        if (!userDistrict) {
          return true;
        }
        return userDistrict === clinic.parent.parent._id;
      };

      var getName = function(clinic) {
        var parts = [];
        do {
          parts.push(clinic.name);
          clinic = clinic.parent;
        } while( clinic.name );
        return parts.join(', ');
      };

      return {
        get: function(options) {

          options = options || {};

          var deferred = $q.defer();

          FacilityRaw.query(function(res) {

            var facilities = [];

            if (res.rows) {
              res.rows.forEach(function(clinic) {
                if (inDistrict(options.userDistrict, clinic.doc)) {
                  facilities.push({
                    id: clinic.id,
                    text: getName(clinic.doc)
                  });
                }
              });
            }

            deferred.resolve(facilities);
          });

          return deferred.promise;
        }
      };
    }
  ]);

  inboxServices.factory('ReadMessagesRaw', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return $resource(BaseUrlService() + '/../_view/data_records_read_by_type', {}, {
        query: {
          isArray: false,
          params: {
            group: true
          }
        }
      });
    }
  ]);

  inboxServices.factory('ReadMessages', ['$q', 'ReadMessagesRaw',
    function($q, ReadMessagesRaw) {

      var getUsername = function(key, user) {
        if (key === '_total') {
          return 'total';
        }
        if (key === user) {
          return 'read';
        }
      };

      return {
        get: function(options) {

          var deferred = $q.defer();

          ReadMessagesRaw.query(function(res) {
            
            var status = {
              forms: { total: 0, read: 0 },
              messages: { total: 0, read: 0 }
            };
            
            res.rows.forEach(function(row) {
              var name = row.key[0];
              var type = row.key[1];
              var dist = row.key[2];
              if (!options.userDistrict || options.userDistrict === dist) {
                var username = getUsername(name, options.user);
                if (username) {
                  status[type][username] += row.value;
                }
              }
            });

            deferred.resolve(status);
          });

          return deferred.promise;
        }
      };
    }
  ]);

  inboxServices.factory('RememberService', function() {
    return {
      scrollTop: undefined,
      dateFormat: 'DD-MMM-YYYY hh:mm'
    };
  });

  inboxServices.factory('BaseUrlService', function() {
    return function() {
      return $('html').data('base-url');
    };
  });

  inboxServices.factory('UserNameService', function() {
    return function() {
      return $('html').data('user');
    };
  });

}());