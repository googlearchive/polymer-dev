/*
 * Copyright 2013 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

(function(scope) {

var path = {
  resolveElementPaths: function(node) {
    pathResolver.resolvePathsInHTML(node);
  },
  addResolvePathApi: function() {
    // let assetpath attribute modify the resolve path
    var assetPath = this.getAttribute('assetpath') || '';
    var root = new URL(assetPath, this.ownerDocument.baseURI);
    this.prototype.resolvePath = function(inPath, base) {
      var u = new URL(inPath, base || root);
      return u.href;
    };
  }
};

var CSS_IMPORT_REGEXP = /(@import[\s]*)([^;]*)(;)/g;
var CSS_URL_REGEXP = /(url\()([^)]*)(\))/g;
var URL_ATTRS = ['href', 'src', 'action'];
var URL_ATTRS_SELECTOR = '[' + URL_ATTRS.join('],[') + ']';
var URL_TEMPLATE_SEARCH = '{{.*}}';

var pathResolver = {
  resolveRelativeUrl: function(baseUrl, url) {
    var u = new URL(url, baseUrl).href;
    return this.makeDocumentRelPath(u);
  },
  makeDocumentRelPath: function(url) {
    var root = document.baseURI;
    var u = new URL(url, root);
    if (u.host === root.host && u.port === root.port &&
        u.protocol === root.protocol) {
      return this.makeRelPath(root.pathname, u.pathname);
    } else {
      return url;
    }
  },
  // make a relative path from source to target
  makeRelPath: function(source, target) {
    var s = source.split('/');
    var t = target.split('/');
    while (s.length && s[0] === t[0]){
      s.shift();
      t.shift();
    }
    for(var i = 0, l = s.length - 1; i < l; i++) {
      t.unshift('..');
    }
    return t.join('/');
  },
  resolvePathsInHTML: function(root, url) {
    url = url || root.ownerDocument.baseURI;
    if (root.hasAttributes && root.hasAttributes()) {
      pathResolver.resolveNodeAttributes(root, url);
    }
    pathResolver.resolveAttributes(root, url);
    pathResolver.resolveStyleElts(root, url);
    // handle template.content
    var templates = root.querySelectorAll('template');
    if (templates) {
      for (var i = 0, l = templates.length, t; (i < l) && (t = templates[i]); i++) {
        if (t.content) {
          pathResolver.resolvePathsInHTML(t.content, url);
        }
      }
    }
  },
  resolvePathsInStylesheet: function(sheet) {
    var docUrl = pathResolver.nodeUrl(sheet);
    sheet.__resource = pathResolver.resolveCssText(sheet.__resource, docUrl);
  },
  resolveStyleElts: function(root, url) {
    var styles = root.querySelectorAll('style');
    if (styles) {
      for (var i = 0, l = styles.length, s; (i < l) && (s = styles[i]); i++) {
        pathResolver.resolveStyleElt(s, url);
      }
    }
  },
  resolveStyleElt: function(style, url) {
    url = url || style.ownerDocument.baseURI;
    style.textContent = pathResolver.resolveCssText(style.textContent, url);
  },
  resolveCssText: function(cssText, baseUrl) {
    cssText = pathResolver.replaceUrlsInCssText(cssText, baseUrl, CSS_URL_REGEXP);
    return pathResolver.replaceUrlsInCssText(cssText, baseUrl, CSS_IMPORT_REGEXP);
  },
  replaceUrlsInCssText: function(cssText, baseUrl, regexp) {
    return cssText.replace(regexp, function(m, pre, url, post) {
      var urlPath = url.replace(/["']/g, '');
      urlPath = pathResolver.resolveRelativeUrl(baseUrl, urlPath);
      return pre + '\'' + urlPath + '\'' + post;
    });
  },
  resolveAttributes: function(root, url) {
    // search for attributes that host urls
    var nodes = root && root.querySelectorAll(URL_ATTRS_SELECTOR);
    if (nodes) {
      for (var i = 0, l = nodes.length, n; (i < l) && (n = nodes[i]); i++) {
        this.resolveNodeAttributes(n, url);
      }
    }
  },
  resolveNodeAttributes: function(node, url) {
    url = url || node.ownerDocument.baseURI;
    URL_ATTRS.forEach(function(v) {
      var attr = node.attributes[v];
      if (attr && attr.value &&
         (attr.value.search(URL_TEMPLATE_SEARCH) < 0)) {
        var urlPath = pathResolver.resolveRelativeUrl(url, attr.value);
        attr.value = urlPath;
      }
    });
  }
};

// exports
scope.api.declaration.path = path;
scope.pathResolver = pathResolver;

})(Polymer);
