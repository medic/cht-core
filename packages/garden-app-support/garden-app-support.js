(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
            // AMD. Register as an anonymous module.
            define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('jquery'));
    }  else {
        // Browser globals
        root.returnExports = factory(root.$);
    }
}(this, function ($) {

    var exports = {}

    /**
     * Callback when the topbar has loaded.
     */
    exports.on_topbar = function( timeout, callback) {

        // retrieve arguments as array
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        callback = args.pop();
        timeout = 5000;
        if (args.length > 0)  timeout = args.shift();

        if ($('#dashboard-topbar').data('ready')) {
            return callback(null);
        }
        var has_returned = false;
        var on_complete = function(err) {
            if (!has_returned) {
                 has_returned = true;
                callback(err);
             }
        }

        var iv = setInterval(function (){
          if ($('#dashboard-topbar').data('ready')) {
            return on_complete(null);
          }
        })

        setTimeout(function() {
            clearInterval(iv);
            on_complete(new Error('Timeout waiting for the topbar'));
        }, timeout);



        $('#dashboard-topbar').on('ready', function(jquery_event){
            on_complete(null);
        });

    }


    /**
     *
     *
     * @param after_login_url and optional url you want the user to be redirected to after they login. If omitted
     * the user will be returned to the current url
     */
    exports.get_login_url = function( after_login_url, callback) {
        if (isFunction(after_login_url)) {
            callback = after_login_url;
            after_login_url = window.location;
        }
        exports.on_topbar(function(err){
            if (err) return callback(err);
            callback($('#dashboard-topbar-session').data('login') + '?redirect=' + encodeURIComponent(after_login_url));
        })


    }


    exports.get_user_ctx = function(callback) {
        exports.on_topbar(function(err){
            if (err) return callback(err);
            var userctx = JSON.parse(decodeURI($('#dashboard-topbar-session').data('userctx')));
            return callback(null, userctx);
        })
    }


    /**
     * Get the all the garden details, as one easy to use call
     * @param callback
     */
    exports.get_garden_ctx = function(callback) {
        exports.on_topbar(function(err){
            if (err) return callback(err);
            var garden_ctx = {
                userCtx : JSON.parse(decodeURI($('#dashboard-topbar-session').data('userctx'))),
                login_url : $('#dashboard-topbar-session').data('login') + '?redirect=' + encodeURIComponent(window.location)
            };

            return callback(null, garden_ctx);
        })
    }


    /**
     * There are times you want to be able to link to something, but you dont know where it will be.
     * For example on a graph you may have a legend with things like 'zeptotrophic'. Lets say you want to be able to
     * link to a definition of that word. So use this method like so
     *
     * garden.create_redirect_url('about', 'zeptotrophic');
     *
     * and use the result url as a link. The admin of the garden then can decide where the link should go. Maybe to something like
     * /wiki/zeptotrophic
     *
     * Create a redirect url that can be mapped by a dashboard admin to the proper place.
     *
     * @name createRedirectUrl
     * @param {String} category - A category like, wiki used to define the general place you want the url to go
     * @param {String} id - An identifier for the resource in the category, like 'London_Bridge'
     * @returns {String} - A url.
     * @api public
     */

    exports.create_redirect_url = function(category, id){
        return '/dashboard/_design/dashboard/_rewrite/redirect/' + category + '/' + id;
    }

    return exports;


    function isFunction(obj) {
       return toString.call(obj) == '[object Function]';
     };

}));




