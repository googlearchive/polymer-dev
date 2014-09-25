/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

htmlSuite('attributes-declarative', function() {
  htmlTest('html/publish-attributes.html');
  htmlTest('html/take-attributes.html');
  htmlTest('html/attr-mustache.html');
  htmlTest('html/prop-attr-reflection.html');
});

suite('attributes', function() {
  var assert = chai.assert;

  test('override dom accessor', function() {
    var p = document.createElement('polymer-element');
    p.setAttribute('name', 'test-override-dom-accessor');
    p.setAttribute('attributes', 'title');
    p.setAttribute('noscript', '');
    p.init();

    // Chrome's accessors are busted:
    // https://code.google.com/p/chromium/issues/detail?id=43394
    // 
    // Safari is similar but ShadowDOMPolyfill fixes the problem for us:
    // https://bugs.webkit.org/show_bug.cgi?id=49739
    // https://github.com/Polymer/ShadowDOM/blob/3c9068695f179d3c4d5c4eab037a904a8e6efaae/src/wrappers.js#L181
    // 
    // So for this test we only need to worry about Chrome's breakage.
    var isBrokenChrome = !Object.getOwnPropertyDescriptor(HTMLElement.prototype,
        'title');

    var t = document.createElement('test-override-dom-accessor');
    t.title = 123;

    assert.strictEqual(t.title, isBrokenChrome ? '123' : 123);
  });
});
