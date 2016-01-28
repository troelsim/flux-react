/*
 * ACTION
 * ====================================================================================
 * Creates a single function or a map of functions that when called with arguments will
 * emit a "trigger" event, passing the arguments
 * ====================================================================================
 */

var EventEmitter = require('eventemitter2').EventEmitter2 || require('eventemitter2');
var safeDeepClone = require('./safeDeepClone.js');

var createActionFunction = function (actionName) {
  // Maps from ids to callbacks and their states
  var callbacks = {};
  var isHandled = {};
  var isPending = {};
  var isDispatching = false;
  var payload;

  function invokeCallback(id){
    isPending[id] = true;
    callbacks[id].apply(undefined, payload);
    isHandled[id] = true;
  }

  // Create the action function
  var fn = function () {
    if (isDispatching){
      throw new Error('The action ' + fn.handlerName + ' is already being dispatched.');
    }

    // Grab all the arguments and convert to array
    var args = safeDeepClone('[Circular]', [], Array.prototype.slice.call(arguments, 0));

    // Start bookkeeping
    for (var id in callbacks) {
      isHandled[id] = false;
      isPending[id] = false;
    }
    isDispatching = true;
    payload = args;


    try{
      for (var id in callbacks) {
        if (isPending[id]) {
          continue;
        }
        invokeCallback(id);
      }
    }finally{
      isDispatching = false;
      payload = undefined;
    }
  };

  fn.waitFor = function(ids){
    // Take a list of callback ids and execute them first
    if (!isDispatching){
      throw new Error('waitFor must be called while dispatching an actions, sure you called it from an action handler?');
    }
    for (var ii = 0; ii < ids.length; i++) {
      var id = ids[ii];
      if (isPending[id]){
        if (isHandled[id]) {
          throw new Error('Circular dependency detected while waiting for ' + id);
        }
        continue;
      }
      if (!callbacks[id]) {
        throw new Error('waitFor: No such callback registered: ' + id);
      }
      invokeCallback(id);
    }
  };

  fn.registerCallback = function(callback){
    // Caller should bind this with the registering store.
    if (!this.storeName){
      throw new Error('registerCallback: registering store must have a storeName attribute');
    }
    var id = this.storeName;
    callbacks[id] = callback;
  };

  var emitter = new EventEmitter();

  // It is possible to listen to the function and to achieve that we
  // have to manually inherit methods from EventEmitter
  for (var prop in EventEmitter.prototype) {
    if (EventEmitter.prototype.hasOwnProperty(prop)) {
      fn[prop] = EventEmitter.prototype[prop];
    }
  }
  
  // Add handlerName
  fn.handlerName = actionName;

  return fn;

};

var action = function () {

  if (Array.isArray(arguments[0])) {
    var actionMap = {};
    arguments[0].forEach(function (actionName) {
      actionMap[actionName] = createActionFunction(actionName);
    });
    return actionMap;
  }

  throw new Error('You are not passing an array to createActions');

};

module.exports = action;
