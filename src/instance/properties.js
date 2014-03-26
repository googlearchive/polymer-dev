/*
 * Copyright 2013 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */
(function(scope) {

  // imports

  var log = window.logFlags || {};

  // magic words

  var OBSERVE_SUFFIX = 'Changed';

  // element api

  var empty = [];

  var properties = {
    // only observe complex paths `foo.bar` not `foo`
    observeProperties: function() {
      var n$ = this._observeNames;
      if (n$ && n$.length) {
        var self = this;
        for (var i=0, l=n$.length, n, o; (i<l) && (n=n$[i]); i++) {
          if (n.indexOf('.') >= 0) {
            if (!o) {
              var o = this._propertyObserver = new CompoundObserver();
              // keep track of property observer so we can shut it down
              this.registerObservers([o]);
            }
            o.addPath(this, n);
          }
        }
        if (o) {
          o.open(this.notifyPropertyChanges, this);
        }
      }
    },
    notifyPropertyChanges: function(newValues, oldValues, paths) {
      for (var i in oldValues) {
        // note: paths is of form [object, path, object, path]
        this.propValueChanged_(paths[2 * i + 1], newValues[i], oldValues[i]);
      }
    },
    observeArrayValue: function(name, value, old) {
      // we only care if there are registered side-effects
      var callbackName = this.observe[name];
      if (callbackName) {
        // if we are observing the previous value, stop
        if (Array.isArray(old)) {
          log.observe && console.log('[%s] observeArrayValue: unregister observer [%s]', this.localName, name);
          this.closeNamedObserver(name + '__array');
        }
        // if the new value is an array, being observing it
        if (Array.isArray(value)) {
          log.observe && console.log('[%s] observeArrayValue: register observer [%s]', this.localName, name, value);
          var observer = new ArrayObserver(value);
          observer.open(function(value, old) {
            this.invokeMethod(callbackName, [old]);
          }, this);
          this.registerNamedObserver(name + '__array', observer);
        }
      }
    },
    bindProperty: function(property, observable) {
      // apply Polymer two-way reference binding
      return Observer.bindToInstance(this, property, observable);
      //return bindProperties(this, property, observable);
    },
    invokeMethod: function(method, args) {
      var fn = this[method] || method;
      if (typeof fn === 'function') {
        fn.apply(this, args);
      }
    },
    registerObservers: function(observers) {
      this._observers.push(observers);
    },
    // observer array items are arrays of observers.
    closeObservers: function() {
      for (var i=0, l=this._observers.length; i<l; i++) {
        this.closeObserverArray(this._observers[i]);
      }
      this._observers = [];
    },
    closeObserverArray: function(observerArray) {
      for (var i=0, l=observerArray.length, o; i<l; i++) {
        o = observerArray[i];
        if (o && o.close) {
          o.close();
        }
      }
    },
    // bookkeeping observers for memory management
    registerNamedObserver: function(name, observer) {
      var o$ = this._namedObservers || (this._namedObservers = {});
      o$[name] = observer;
    },
    closeNamedObserver: function(name) {
      var o$ = this._namedObservers;
      if (o$ && o$[name]) {
        o$[name].close();
        o$[name] = null;
        return true;
      }
    },
    closeNamedObservers: function() {
      if (this._namedObservers) {
        var keys=Object.keys(this._namedObservers);
        for (var i=0, l=keys.length, k, o; (i < l) && (k=keys[i]); i++) {
          o = this._namedObservers[k];
          o.close();
        }
        this._namedObservers = {};
      }
    },
    propValueChanged_: function(name, newValue, oldValue) {
      if (!this._pendingChanges) {
        this._pendingChanges = [];
        var self = this;
        // TODO(sorvell): expose this in platform.
        Observer.runEOM_(function() {
          self.applyPropertyChanges();
        });
      }
      this._pendingChanges.push(arguments);
    },
    applyPropertyChanges: function() {
      var method, called={};
      for (var i=0, l=this._pendingChanges.length, c; (i<l) && 
          (c=this._pendingChanges[i]); i++) {
        method = this.observe[c[0]];
        if (!called[method]) {
          called[method] = this.applyPropertyChange(c[0], method, c[1], c[2]);
        }
      }
      this._pendingChanges = null;
    },
    applyPropertyChange: function(name, method, newValue, oldValue) {
      if (this.publish[name] !== undefined) {
        this.reflectPropertyToAttribute(name);
      }
      if (method) {
        this.invokeMethod(method, [newValue, oldValue]);
        return true;
      }
    }
  };

  // property binding
  // bind a property in A to a path in B by converting A[property] to a
  // getter/setter pair that accesses B[...path...]
  function bindProperties(inA, inProperty, observable) {
    log.bind && console.log(LOG_BIND_PROPS, inB.localName || 'object', inPath, inA.localName, inProperty);
    // capture A's value if B's value is null or undefined,
    // otherwise use B's value
    // TODO(sorvell): need to review, can do with ObserverTransform
    var v = observable.discardChanges();
    if (v === null || v === undefined) {
      observable.setValue(inA[inProperty]);
    }
    return Observer.defineComputedProperty(inA, inProperty, observable);
  }

  // logging
  var LOG_OBSERVE = '[%s] watching [%s]';
  var LOG_OBSERVED = '[%s#%s] watch: [%s] now [%s] was [%s]';
  var LOG_CHANGED = '[%s#%s] propertyChanged: [%s] now [%s] was [%s]';
  var LOG_BIND_PROPS = "[%s]: bindProperties: [%s] to [%s].[%s]";

  // exports

  scope.api.instance.properties = properties;

})(Polymer);
