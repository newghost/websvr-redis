/*
* Description:  Session stored in redis for websvr
* Author:       Kris Zhang
* Licenses:     MIT
* Project url:  https://github.com/newghost/redisstore
*/

var redis = require('redis');

var RedisStore = module.exports = (function() {

  var client;

  var del = function(sid) {
    client.del(sid);
  };

  var set = function(sid, session) {
    client.set(sid, JSON.stringify(session), function(err) {
      err && console.error(err);
    });
  };

  var get = function(sid, cb) {
    var session = {};

    client.get(sid, function(err, data) {
      if (err) {
        //connect error? reconnect and try again
        start(function(connected) {
          connected
            ? get(sid, cb)
            : cb && cb(session);
        });

        console.log(err);
      } else {
        try {
          session = JSON.parse(data);
        } catch(e) {
          del(sid);
        }
        cb && cb(session);
      }
    });
  };

  //Delete these sessions that created long long ago (1 day)
  var expire = 24 * 3600 * 1000;
  /*
  Clear the sessions, you should do it manually somewhere, etc:
  setInterval(websvr.SessionStore.clear, 200 * 60 * 1000)
  */
  var clear = function() {
    client.keys('*', function (err, keys) {
      if (err) return console.log(err);

      for (var i = 0; i < keys.length; i++) {
        var key  = keys[i]
          , idx  = key.indexOf('-')
          , flag = true
          ;

        if (key.length == 25 && idx > 0) {
          var stamp = parseInt(key.substr(0, idx), 32);
          //expired?
          stamp && stamp > expire && (flag = false);
        }

        flag && del(key);
      }
    });
  };

  var options
    , onError
    , onConnect
    ;

  var start = function(opts, cb) {
    if (typeof opts == 'function') {
      cb    = opts;
      opts  = null;
    }

    options = opts || options || {};

    var host = options.host   || '127.0.0.1'
      , port = parseInt(options.host) || 6379
      , opts = options.opts   || {}
      , auth = options.auth
      , idx  = options.select || 0
      ;

    client = redis.createClient(port, host, opts);

    auth && client.auth(auth);

    client.select(idx);

    onError   && client.removeListener('error', onError);
    onConnect && client.removeListener('connect', onConnect);

    onError = function (err) {
      console.error('Error ' + err);
      cb && cb(false);
      cb = null;
    };

    onConnect = function() {
      cb && cb(true);
      cb = null;
    };

    client.on('error', onError);
    client.on('connect', onConnect);
  };

  return {
      get   : get
    , set   : set
    , del   : del
    , clear : clear
    , start : start
  }

})();