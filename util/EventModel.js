const EventModel=module.exports={}

/* 事件处理机制 */
EventModel._eventPool = null // 不要初始化为 {}, 而是在 addWatcher 里创建，否则所有子对象都继承了同一份 _eventPool

EventModel.addWatcher = function(eventType, watcher) {
  if (this._eventPool == null) {
    this._eventPool = {};
  }
  if (typeof this._eventPool[eventType] == 'undefined') {
    this._eventPool[eventType] = [];
  }
  this._eventPool[eventType].push(watcher);
}

EventModel.dropWatcher = function(eventType, watcher) {
  if (this._eventPool != null
      && this._eventPool[eventType] instanceof Array) {
    var watcherSet = this._eventPool[eventType];
    for (var i in watcherSet) {
      if (watcherSet[i] === watcher) {
        watcherSet.splice(i, 1);
        break;
      }
    }
  }
}

EventModel.dropWatcherAll = function(eventType) {
  if (this._eventPool != null){
    this._eventPool[eventType]=undefined;
  }
}

EventModel.triggerEvent = function(eventType, params, callback) {
  var event = {
    type : eventType,
    target : this
  };
  if (this._eventPool != null
      && this._eventPool[event.type] instanceof Array) {
    var watcherSet = this._eventPool[event.type];
    for (var i in watcherSet) {
      watcherSet[i](event, params, callback);
    }
  }
}
