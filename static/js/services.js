var db = require('db'),
    audit = require('couchdb-audit/kanso'),
    _ = require('underscore'),
    utils = require('kujua-utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices', ['ngResource']);

  inboxServices.factory('db',
    function() {
      var result = db.current();
      require('views/lib/couchfti').addFTI(result);
      return result;
    }
  );

  inboxServices.factory('audit', ['db',
    function(db) {
      return audit.withKanso(db);
    }
  ]);

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

  inboxServices.factory('FacilityRaw', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return function(district) {
        var url = BaseUrlService() + '/facilities.json';
        if (district) {
          url += '/' + district;
        }

        return $resource(url, {}, {
          query: {
            method: 'GET',
            isArray: false,
            cache: true
          }
        });
      };
    }
  ]);

  inboxServices.factory('Contact', ['$q', 'FacilityRaw',
    function($q, FacilityRaw) {
      return {
        get: function(district) {
          var deferred = $q.defer();

          FacilityRaw(district).query(function(res) {
            var contacts = [];
            _.each(res.rows, function(contact) {
              if (contact.doc.contact && contact.doc.contact.phone) {
                contacts.push(contact);
              }
              if (contact.doc.type === 'health_center') {
                var clinics = _.filter(res.rows, function(child) {
                  return child.doc.parent && 
                    child.doc.parent._id === contact.id;
                });
                contacts.push(_.extend({ 
                  everyoneAt: true,
                  clinics: clinics
                }, contact));
              }
            });
            deferred.resolve(contacts);
          });

          return deferred.promise;
        }
      };
    }
  ]);

  inboxServices.factory('Facility', ['$q', 'FacilityRaw',
    function($q, FacilityRaw) {

      var getName = function(clinic) {
        var parts = [];
        do {
          parts.push(clinic.name);
          clinic = clinic.parent;
        } while( clinic.name );
        return parts.join(', ');
      };

      return {
        get: function(district) {

          var deferred = $q.defer();

          FacilityRaw(district).query(function(res) {

            var facilities = [];

            if (res.rows) {
              res.rows.forEach(function(clinic) {
                if (clinic.doc.type === 'clinic') {
                  facilities.push({
                    id: clinic.id,
                    text: getName(clinic.doc)
                  });
                }
              });
            }

            facilities.sort(function(lhs, rhs) {
              var lhsName = lhs.text.toUpperCase();
              var rhsName = rhs.text.toUpperCase();
              return lhsName.localeCompare(rhsName);
            });

            deferred.resolve(facilities);
          });

          return deferred.promise;
        }
      };
    }
  ]);

  inboxServices.factory('UserDistrict', ['$q', 'db', 'UserCtxService',
    function($q, db, UserCtxService) {
      return function() {
        var deferred = $q.defer();
        utils.checkDistrictConstraint(UserCtxService(), db, function(err, fac) {
          deferred.resolve({ error: err, district: fac });
        });
        return deferred.promise;
      };
    }
  ]);

  inboxServices.factory('User', ['$resource', 'UserCtxService',
    function($resource, UserCtxService) {
      return $resource('/_users/org.couchdb.user%3A' + UserCtxService().name, {}, {
        query: {
          method: 'GET',
          isArray: false,
          cache: true
        }
      });
    }
  ]);

  inboxServices.factory('UpdateUser', ['$cacheFactory', 'db', 'User', 'UserCtxService',
    function($cacheFactory, db, User, UserCtxService) {
      return {
        update: function(updates) {
          User.query(function(user) {
            db.use('_users').saveDoc(_.extend(user, updates), function(err) {
              if (err) {
                return console.log(err);
              }
              $cacheFactory.get('$http')
                .remove('/_users/org.couchdb.user%3A' + UserCtxService().name);
            });
          });
        }
      };
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

  inboxServices.factory('DeleteMessage', ['db', 'audit',
    function(db, audit) {
      return {
        delete: function(messageId) {
          db.getDoc(messageId, function(err, message) {
            if (err) {
              return console.log(err);
            }
            message._deleted = true;
            audit.saveDoc(message, function(err) {
              if (err) {
                console.log(err);
              }
            });
          });
        }
      };
    }]
  );

  inboxServices.factory('UpdateFacility', ['db', 'audit',
    function(db, audit) {
      return {
        update: function(messageId, facilityId) {
          db.getDoc(messageId, function(err, message) {
            if (err) {
              return console.log(err);
            }
            db.getDoc(facilityId, function(err, facility) {
              if (err) {
                return console.log(err);
              }
              if (!message.related_entities) {
                message.related_entities = {};
              }
              if (!message.related_entities.clinic) {
                message.related_entities.clinic = {};
              }
              if (facility.type === 'health_center') {
                message.related_entities.clinic = { parent: facility };
              } else {
                message.related_entities.clinic = facility;
              }
              if (message.related_entities.clinic) {
                message.errors = _.filter(message.errors, function(error) {
                  return error.code !== 'sys.facility_not_found';
                });
              }
              audit.saveDoc(message, function(err) {
                if (err) {
                  console.log(err);
                }
              });
            });
          });
        }
      };
    }]
  );

  inboxServices.factory('MarkRead', ['db', 'audit', 'UserCtxService',
    function(db, audit, UserCtxService) {
      return {
        update: function(messageId, read) {
          db.getDoc(messageId, function(err, message) {
            if (err) {
              return console.log(err);
            }
            if (!message.read) {
                message.read = [];
            }
            var user = UserCtxService().name;
            var index = message.read.indexOf(user);
            if ((index !== -1) === read) {
                // nothing to update, return without calling callback
                return;
            }
            if (read) {
                message.read.push(user);
            } else {
                message.read.splice(index, 1);
            }
            audit.saveDoc(message, function(err) {
              if (err) {
                console.log(err);
              }
            });
          });
        }
      };
    }
  ]);

  inboxServices.factory('Verified', ['db', 'audit',
    function(db, audit) {
      return {
        update: function(messageId, verified) {
          db.getDoc(messageId, function(err, message) {
            if (err) {
              return console.log(err);
            }
            message.verified = verified;
            audit.saveDoc(message, function(err) {
              if (err) {
                console.log(err);
              }
            });
          });
        }
      };
    }]
  );

  inboxServices.factory('SendMessage', ['$q', 'db', 'audit', 'User',
    function($q, db, audit, User) {

      var createMessageDoc = function(user, recipients) {
        var name = user && user.name;
        var doc = {
          errors: [],
          form: null,
          from: user && user.phone,
          reported_date: Date.now(),
          related_entities: {},
          tasks: [],
          read: [ name ],
          kujua_message: true,
          type: 'data_record',
          sent_by: name || 'unknown'
        };

        var facility = _.find(recipients, function(data) {
          return data.doc && data.doc.type;
        });
        if (facility && facility.type) {
          doc.related_entities[facility.type] = facility;
        }

        return doc;
      };

      var formatRecipients = function(recipients) {
        return _.uniq(
          _.flatten(_.map(recipients, function(r) {
            if (r.everyoneAt) {
              var ret = [];
              _.each(r.clinics, function(d) {
                if (d.doc.contact && d.doc.contact.phone) {
                  ret.push({
                    phone: d.doc.contact.phone,
                    facility: d.doc
                  });
                }
              });
              return ret;
            } else {
              return [{
                phone: r.doc.contact.phone,
                facility: r.doc
              }];
            }
          })),
          false,
          function(r) {
            return r.phone;
          }
        );
      };

      return {
        send: function(recipients, message) {

          var deferred = $q.defer();

          User.query(function(user) {

            var doc = createMessageDoc(user, recipients);
            var explodedRecipients = formatRecipients(recipients);

            // TODO use async
            _.each(explodedRecipients, function(data, idx) {
              db.newUUID(100, function (err, uuid) {
                if (err) {
                  return deferred.reject(err);
                }
                var task = {
                  messages: [{
                    from: user && user.phone,
                    sent_by: user && user.name || 'unknown',
                    to: data.phone,
                    facility: data.facility,
                    message: message,
                    uuid: uuid
                  }]
                };
                utils.setTaskState(task, 'pending');
                doc.tasks.push(task);
                // save doc only after all tasks have been added.
                if (idx+1 === explodedRecipients.length) {
                  audit.saveDoc(doc, function(err) {
                    if (err) {
                      deferred.reject(err);
                    } else {
                      deferred.resolve();
                    }
                  });
                }
              });
            });
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

              if (!options.district || options.district === dist) {
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

  inboxServices.factory('UserCtxService', function() {
    return function() {
      return $('html').data('user');
    };
  });

}());