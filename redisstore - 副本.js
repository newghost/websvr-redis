/*
* Description:  Session stored in redis for websvr
* Author:       Kris Zhang
* Licenses:     MIT
* Project url:  https://github.com/newghost/redisstore
*/

var RedisStore = module.exports = function(client, sessionTimeout) {

  var schema = 'session:'

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



  var self = {
      get     : get
    , set     : set
    , del     : del
  }


  Object.defineProperty(self, 'schema', {
    get: function() {
      return schema
    },
    set: function(_schema) {
      schema = _schema
    }
  })


  return self
};