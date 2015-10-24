/*
* Description:  Session stored in redis for websvr
* Author:       Kris Zhang
* Licenses:     MIT
* Project url:  https://github.com/newghost/redisstore
*/

var redis = require('redis')

var RedisStore = module.exports = (function() {

  var client
    , schema = 'session:'

  var del = function(key, cb) {
    console.log('del key', key)
    client.del(schema + key, cb)
  }

  var set = function(key, object, cb) {
    !client.connected && start()
    client.hmset(schema + key, object, function(err) {
      cb && cb(err)
    })
  }

  var get = function(key, cb) {
    !client.connected && start()
    client.hgetall(schema + key, function(err, object) {
      cb && cb(object || {})
    })
  }

  //Delete these sessions that created long long ago (1 day)
  var expire = 24 * 3600 * 1000

  var isExpired = function(key) {
    var idx  = key.indexOf('-')

    if (key.length == 25 && idx > 0) {
      client.hget(schema + key, '__lastAccessTime', function(err, __lastAccessTime) {
        if (err) {
          del(key)
          return
        }
        cb && cb(err, data)
        var isValid = __lastAccessTime && (+new Date() - __lastAccessTime <= sessionTimeout)
        !isValid && del(key)
      })
    }
  }

  /*
  Clear the expired session
  */
  var clear = function() {
    //default is 24 hours
    var sessionTimeout = options.sessionTimeout || 24 * 3600 * 1000

    client.keys(schema + '*', function (err, keys) {
      if (err) return console.log(err)

      keys.forEach(isExpired)
    })
  }

  var options
    , onError
    , onConnect
    

  var start = function(opts, cb) {
    if (typeof opts == 'function') {
      cb    = opts
      opts  = null
    }

    options = opts || options || {}

    var host = options.host   || '127.0.0.1'
      , port = parseInt(options.port) || 6379
      , opts = options.opts   || {}
      , auth = options.auth
      , idx  = options.select || 0
      

    client = redis.createClient(port, host, opts)

    auth && client.auth(auth)

    client.select(idx, function(err, state) {
      err
        ? console.log(err)
        : console.log('Redis store is ready, using DB:', idx)
    })

    onError   && client.removeListener('error', onError)
    onConnect && client.removeListener('connect', onConnect)

    onError = function (err) {
      console.error('Error ' + err)
      cb && cb(false)
      cb = null
    }

    onConnect = function() {
      cb && cb(true)
      cb = null
    }

    client.on('error', onError)
    client.on('connect', onConnect)
  }

  return {
      get     : get
    , set     : set
    , del     : del
    , clear   : clear
    , start   : start
  }

})();