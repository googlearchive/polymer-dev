/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

(function(scope) {
  /*
   * Chrome uses an older version of DOM Level 3 Keyboard Events
   *
   * Most keys are labeled as text, but some are Unicode codepoints.
   * Values taken from: http://www.w3.org/TR/2007/WD-DOM-Level-3-Events-20071221/keyset.html#KeySet-Set
   */
  var KEY_IDENTIFIER = {
    'U+007F': 'del',
    'U+0009': 'tab',
    'U+001B': 'esc',
    'U+0020': 'space',
    'U+002A': '*',
    'U+0041': 'a',
    'U+0042': 'b',
    'U+0043': 'c',
    'U+0044': 'd',
    'U+0045': 'e',
    'U+0046': 'f',
    'U+0047': 'g',
    'U+0048': 'h',
    'U+0049': 'i',
    'U+004A': 'j',
    'U+004B': 'k',
    'U+004C': 'l',
    'U+004D': 'm',
    'U+004E': 'n',
    'U+004F': 'o',
    'U+0050': 'p',
    'U+0051': 'q',
    'U+0052': 'r',
    'U+0053': 's',
    'U+0054': 't',
    'U+0055': 'u',
    'U+0056': 'v',
    'U+0057': 'w',
    'U+0058': 'x',
    'U+0059': 'y',
    'U+005A': 'z'
  };

  /*
   * Special table for KeyboardEvent.keyCode.
   * KeyboardEvent.keyIdentifier is better, and KeyBoardEvent.key is even better than that
   *
   * Values from: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.keyCode#Value_of_keyCode
   */
  var KEY_CODE = {
    13: 'enter',
    27: 'esc',
    33: 'pageup',
    34: 'pagedown',
    35: 'end',
    36: 'home',
    32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
    46: 'del',
    56: '*',
    106: '*'
  };

  /*
   * KeyboardEvent.key is mostly represented by printable character made by the keyboard, with unprintable keys labeled
   * nicely.
   *
   * However, on OS X, Alt+char can make a Unicode character that follows an Apple-specific mapping. In this case, we
   * fall back to .keyCode.
   */
  var KEY_CHAR = /[a-z0-9*]/;

  function transformKey(key) {
    var validKey = '';
    if (key) {
      var lKey = key.toLowerCase();
      if (lKey.length == 1) {
        if (KEY_CHAR.test(tKey)) {
          validKey = lKey;
        }
      } else {
        validKey = lKey;
      }
    }
    return validKey;
  }

  var IDENT_CHAR = /U+/;
  function transformKeyIdentifier(keyIdent) {
    var validKey = '';
    if (keyIdent) {
      if (IDENT_CHAR.test(keyIdent)) {
        validKey = KEY_IDENTIFIER[keyIdent];
      } else {
        validKey = keyIdent.toLowerCase();
      }
    }
    return validKey;
  }

  function transformKeyCode(keyCode) {
    var validKey = '';
    if (Number(keyCode)) {
      // ascii
      if (keyCode >= 65 && keyCode <= 90) {
        // lowercase is 32 offset from uppercase
        validKey = String.fromCharCode(32 + keyCode);
      }
      // function keys f1-f12
      else if (keyCode >= 112 && keyCode <= 123) {
        validKey = 'f' + (keyCode - 112);
      }
      else {
        validKey = KEY_CODE[keyCode];
      }
    }
    return validKey;
  }

  function keyboardEventToKey(ev) {
    // fall back from .key, to .keyIdentifier, and then to .keyCode
    var normalizedKey = transformKey(ev.key) || transformKeyIdentifier(ev.keyIdentifier) || transformKeyCode(ev.keyCode) || '';
    return {
      shift: ev.shiftKey,
      ctrl: ev.ctrlKey,
      meta: ev.metaKey,
      alt: ev.altKey,
      key: normalizedKey
    };
  }

  /*
   * Input: ctrl+shift+f7 => {ctrl: true, shift: true, key: 'f7'}
   * ctrl/space => {ctrl: true} || {key: space}
   */
  function stringToKey(keyCombo) {
    keys = keyCombo.split('+');
    var keyObj = Object.create(null);
    keys.forEach(function(key) {
      if (key == 'shift') {
        keyObj.shift = true;
      } else if (key == 'ctrl') {
        keyObj.ctrl = true;
      } else if (key == 'alt') {
        keyObj.alt = true;
      } else {
        keyObj.key = key;
      }
    });
    return keyObj;
  }

  function keyMatches(a, b) {
    return Boolean(a.alt) == Boolean(b.alt) && Boolean(a.ctrl) == Boolean(b.ctrl) && Boolean(a.shift) == Boolean(b.shift) && a.key === b.key;
  }

  function addKeyboardHandler(node, desiredKeys, callback) {
    node.addEventListener('keydown', processKeys(desiredKeys, callback));
  }

  function processKeys(desiredKeys, callback) {
    var keyObjs = desiredKeys.toLowerCase().split('/').map(stringToKey);
    return function(ev) {
      var current = keyboardEventToKey(ev);
      var matches = keyObjs.some(function(k) { return keyMatches(k, current); });
      if (matches) {
        ev.preventDefault();
        callback();
      }
    };
  }

  scope.keyboard = {
    addKeyboardHandler: addKeyboardHandler,
    processKeys: processKeys
  };

})(Polymer);
