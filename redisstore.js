/*
* Description:  Session stored in redis for websvr
* Author:       Kris Zhang
* Licenses:     MIT
* Project url:  https://github.com/newghost/redisstore
*/

var redis = require('redis');

var RedisStore = module.exports = (function() {

  var client
    , schema = 'session:'
    ;

  var del = function(sid, cb) {
    console.log('del sid', sid);
    client.del(schema + sid, cb);
  };

  var set = function(sid, session, cb) {
    client.set(schema + sid, JSON.stringify(session), function(err) {
      err && console.error(err);
      cb  && cb(err);
    });
  };

  var get = function(sid, cb) {
    var session = {};

    client.get(schema + sid, function(err, data) {
      if (err) {
        //connect error? reconnect and try again
        start(function(connected) {
          connected
            ? get(sid, cb)
            : cb && cb(session, sid);
        });

        console.log(err);
      } else {
        try {
          session = JSON.parse(data);
        } catch(e) {
          del(sid);
        }
        cb && cb(session, sid);
      }
    });
  };

  //Delete these sessions that created long long ago (1 day)
  var expire = 24 * 3600 * 1000;
  /*
  Clear the sessions, you should do it manually somewhere, etc:
  setInterval(websvr.sessionStore.clear, 200 * 60 * 1000)
  */
  var clear = function() {
    //default is 24 hours
    var sessionTimeout = options.sessionTimeout || 24 * 3600 * 1000;

    client.keys(schema + '*', function (err, keys) {
      if (err) return console.log(err);

      console.log(keys);
      console.log('length', keys.length);

      for (var i = 0; i < keys.length; i++) {
        var key  = keys[i]
          , idx  = key.indexOf('-')
          , flag = true
          ;

        if (key.length == 25 && idx > 0) {
          get(key, function(session, key) {
            var isValid = session && session.__lastAccessTime && (+new Date() - session.__lastAccessTime <= sessionTimeout);
            !isValid && del(key)
          })
        }
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
      , port = parseInt(options.port) || 6379
      , opts = options.opts   || {}
      , auth = options.auth
      , idx  = options.select || 0
      ;

    client = redis.createClient(port, host, opts);

    auth && client.auth(auth);

    client.select(idx, function(err, state) {
      err
        ? console.log(err)
        : console.log('Redis store is ready, using DB:', idx);
    });

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
      get     : get
    , set     : set
    , del     : del
    , clear   : clear
    , start   : start
  }

})();