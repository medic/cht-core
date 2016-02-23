angular.module('inboxServices').factory('ResourceIcons', [
  'DB',
  function(DB) {

    var withIcons = DB.get()
        .get('resources', { attachments: true });

    var refresh = function() {
      withIcons.then(function(doc) {
        $('img[data-resource-icon]').each(function() {
          var e = $(this);
          var name = e.attr('data-resource-icon');
          e.removeAttr('data-resource-icon');

          var filename = doc.resources[name];
          var icon = filename && doc._attachments[filename];

          if (icon) {
            e.attr('src', 'data:' + icon.content_type + ';base64,' + icon.data);
          }
        });
      });
    };


    return {
      withIcons: withIcons,
      refresh: refresh,
    };

  }
]);
