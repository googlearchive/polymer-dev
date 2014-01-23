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
    var root = this.elementPath();
    // let assetpath attribute modify the resolve path
    var assetPath = this.getAttribute('assetpath') || '';
    var baseUrl = new URL(assetPath, root);
    this.prototype.resolvePath = function(inPath, base) {
      return pathResolver.resolveUrl(base || baseUrl, inPath);
    };
  },
  elementPath: function() {
    return pathResolver.urlToPath(pathResolver.getDocumentUrl(this.ownerDocument));
  }
};

var ABS_URL = /(^data:)|(^http[s]?:)|(^\/)/;
var COMPRESS_ROOT = /^(\w+):(\/\/)?/;
var CSS_IMPORT_REGEXP = /(@import[\s]*)([^;]*)(;)/g;
var CSS_URL_REGEXP = /(url\()([^)]*)(\))/g;
var URL_ATTRS = ['href', 'src', 'action'];
var URL_ATTRS_SELECTOR = '[' + URL_ATTRS.join('],[') + ']';
var URL_TEMPLATE_SEARCH = '{{.*}}';

var pathResolver = {
  nodeUrl: function(node) {
    var docUrl = path.documentUrlFromNode(node);
    return pathResolver.resolveUrl(docUrl, path.hrefOrSrc(node));
    //return path.resolveUrl(path.documentURL, path.hrefOrSrc(node));
  },
  hrefOrSrc: function(node) {
    return node.getAttribute("href") || node.getAttribute("src");
  },
  documentUrlFromNode: function(node) {
    return pathResolver.getDocumentUrl(node.ownerDocument || node);
  },
  getDocumentUrl: function(doc) {
    var url = doc &&
      // TODO(sjmiles): ShadowDOMPolyfill intrusion
      (doc._URL || (doc.impl && doc.impl._URL) || doc.baseURI || doc.URL) || '';
    // take only the left side if there is a #
    return url.split('#')[0];
  },
  resolveUrl: function(baseUrl, url) {
    if (this.isAbsUrl(url)) {
      return url;
    }
    return new URL(url, baseUrl).href;
  },
  resolveRelativeUrl: function(baseUrl, url) {
    if (this.isAbsUrl(url)) {
      return url;
    }
    return this.makeDocumentRelPath(this.resolveUrl(baseUrl, url));
  },
  isAbsUrl: function(url) {
    return ABS_URL.test(url);
  },
  urlToPath: function(baseUrl) {
    var parts = baseUrl.split("/");
    parts.pop();
    parts.push('');
    return parts.join("/");
  },
  compressUrl: function(url) {
    // let absolute urls use URL
    if (COMPRESS_ROOT.test(url)) {
      return new URL(url).href;
    }
    var search = '';
    var searchPos = url.indexOf('?');
    // query string is not part of the path
    if (searchPos > -1) {
      search = url.substring(searchPos);
      url = url.substring(searchPos, 0);
    }
    var parts = url.split('/');
    for (var i = 0, p, pn; i < parts.length - 1; i++) {
      p = parts[i];
      pn = parts[i + 1];
      // foo/../bar -> bar
      if (p !== '..' && pn === '..') {
        parts.splice(i, 2);
        i -= 2;
      }
    }
    return parts.join('/') + search;
  },
  makeDocumentRelPath: function(url) {
    var u = new URL(url, pathResolver.documentURL);
    var wl = window.location;
    if (u.host === wl.host && u.port === wl.port && u.protocol === wl.protocol) {
      return this.makeRelPath(pathResolver.documentURL, u.href);
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
    for(var i = 0, l = s.length-1; i < l; i++) {
      t.unshift('..');
    }
    var r = t.join('/');
    return this.compressUrl(r);
  },
  makeAbsUrl: function(url) {
    return new URL(url, pathResolver.documentURL);
  },
  resolvePathsInHTML: function(root, url) {
    url = url || pathResolver.documentUrlFromNode(root);
    if (root.hasAttributes && root.hasAttributes()) {
      pathResolver.resolveNodeAttributes(root, url);
    }
    pathResolver.resolveAttributes(root, url);
    pathResolver.resolveStyleElts(root, url);
    // handle template.content
    var templates = root.querySelectorAll('template');
    if (templates) {
      for (var i=0, l=templates.length, t; (i<l) && (t=templates[i]); i++) {
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
      for (var i=0, l=styles.length, s; (i<l) && (s=styles[i]); i++) {  
        pathResolver.resolveStyleElt(s, url);
      }
    }
  },
  resolveStyleElt: function(style, url) {
    url = url || pathResolver.documentUrlFromNode(style);
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
      for (var i=0, l=nodes.length, n; (i<l) && (n=nodes[i]); i++) {  
        this.resolveNodeAttributes(n, url);
      }
    }
  },
  resolveNodeAttributes: function(node, url) {
    url = url || pathResolver.documentUrlFromNode(node);
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

pathResolver.documentURL = pathResolver.getDocumentUrl(document);

// exports
scope.api.declaration.path = path;
scope.pathResolver = pathResolver;

})(Polymer);
