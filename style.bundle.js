!function(n,e){if("object"==typeof exports&&"object"==typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var t=e();for(var o in t)("object"==typeof exports?exports:n)[o]=t[o]}}(window,(function(){return function(n){var e={};function t(o){if(e[o])return e[o].exports;var r=e[o]={i:o,l:!1,exports:{}};return n[o].call(r.exports,r,r.exports,t),r.l=!0,r.exports}return t.m=n,t.c=e,t.d=function(n,e,o){t.o(n,e)||Object.defineProperty(n,e,{enumerable:!0,get:o})},t.r=function(n){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(n,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(n,"__esModule",{value:!0})},t.t=function(n,e){if(1&e&&(n=t(n)),8&e)return n;if(4&e&&"object"==typeof n&&n&&n.__esModule)return n;var o=Object.create(null);if(t.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:n}),2&e&&"string"!=typeof n)for(var r in n)t.d(o,r,function(e){return n[e]}.bind(null,r));return o},t.n=function(n){var e=n&&n.__esModule?function(){return n.default}:function(){return n};return t.d(e,"a",e),e},t.o=function(n,e){return Object.prototype.hasOwnProperty.call(n,e)},t.p="",t(t.s=144)}({11:function(n,e,t){"use strict";var o,r=function(){return void 0===o&&(o=Boolean(window&&document&&document.all&&!window.atob)),o},i=function(){var n={};return function(e){if(void 0===n[e]){var t=document.querySelector(e);if(window.HTMLIFrameElement&&t instanceof window.HTMLIFrameElement)try{t=t.contentDocument.head}catch(n){t=null}n[e]=t}return n[e]}}(),a=[];function c(n){for(var e=-1,t=0;t<a.length;t++)if(a[t].identifier===n){e=t;break}return e}function l(n,e){for(var t={},o=[],r=0;r<n.length;r++){var i=n[r],l=e.base?i[0]+e.base:i[0],d=t[l]||0,u="".concat(l," ").concat(d);t[l]=d+1;var f=c(u),s={css:i[1],media:i[2],sourceMap:i[3]};-1!==f?(a[f].references++,a[f].updater(s)):a.push({identifier:u,updater:b(s,e),references:1}),o.push(u)}return o}function d(n){var e=document.createElement("style"),o=n.attributes||{};if(void 0===o.nonce){var r=t.nc;r&&(o.nonce=r)}if(Object.keys(o).forEach((function(n){e.setAttribute(n,o[n])})),"function"==typeof n.insert)n.insert(e);else{var a=i(n.insert||"head");if(!a)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");a.appendChild(e)}return e}var u,f=(u=[],function(n,e){return u[n]=e,u.filter(Boolean).join("\n")});function s(n,e,t,o){var r=t?"":o.media?"@media ".concat(o.media," {").concat(o.css,"}"):o.css;if(n.styleSheet)n.styleSheet.cssText=f(e,r);else{var i=document.createTextNode(r),a=n.childNodes;a[e]&&n.removeChild(a[e]),a.length?n.insertBefore(i,a[e]):n.appendChild(i)}}function p(n,e,t){var o=t.css,r=t.media,i=t.sourceMap;if(r?n.setAttribute("media",r):n.removeAttribute("media"),i&&"undefined"!=typeof btoa&&(o+="\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(i))))," */")),n.styleSheet)n.styleSheet.cssText=o;else{for(;n.firstChild;)n.removeChild(n.firstChild);n.appendChild(document.createTextNode(o))}}var v=null,h=0;function b(n,e){var t,o,r;if(e.singleton){var i=h++;t=v||(v=d(e)),o=s.bind(null,t,i,!1),r=s.bind(null,t,i,!0)}else t=d(e),o=p.bind(null,t,e),r=function(){!function(n){if(null===n.parentNode)return!1;n.parentNode.removeChild(n)}(t)};return o(n),function(e){if(e){if(e.css===n.css&&e.media===n.media&&e.sourceMap===n.sourceMap)return;o(n=e)}else r()}}n.exports=function(n,e){(e=e||{}).singleton||"boolean"==typeof e.singleton||(e.singleton=r());var t=l(n=n||[],e);return function(n){if(n=n||[],"[object Array]"===Object.prototype.toString.call(n)){for(var o=0;o<t.length;o++){var r=c(t[o]);a[r].references--}for(var i=l(n,e),d=0;d<t.length;d++){var u=c(t[d]);0===a[u].references&&(a[u].updater(),a.splice(u,1))}t=i}}}},12:function(n,e,t){"use strict";n.exports=function(n){var e=[];return e.toString=function(){return this.map((function(e){var t=n(e);return e[2]?"@media ".concat(e[2]," {").concat(t,"}"):t})).join("")},e.i=function(n,t,o){"string"==typeof n&&(n=[[null,n,""]]);var r={};if(o)for(var i=0;i<this.length;i++){var a=this[i][0];null!=a&&(r[a]=!0)}for(var c=0;c<n.length;c++){var l=[].concat(n[c]);o&&r[l[0]]||(t&&(l[2]?l[2]="".concat(t," and ").concat(l[2]):l[2]=t),e.push(l))}},e}},144:function(n,e,t){"use strict";t.r(e);var o=t(11),r=t.n(o),i=t(24),a={insert:"head",singleton:!1};r()(i.a,a);e.default=i.a.locals||{}},24:function(n,e,t){"use strict";var o=t(12),r=t.n(o)()((function(n){return n[1]}));r.push([n.i,"html,body{\n  height: 100%;\n}\n#tools{\n  margin-bottom: 15px;\n}\n#divEditor{\n  display: inline-block;\n  width: 616px;\n  overflow-x: hidden;\n  overflow-y: auto;\n  position: relative\n}\n#divEditor canvas{\n  position: absolute;\n  top: 0;\n}\n#divEditor #cvsDoc{\n  background-color: #ffffff;\n}\n#divEditor #cvsCover {\n  background-color: #ff0000;\n  background-color: rgba(255, 0, 0, .05);\n}\n#divEditor #heightPlaceholderContainer{\n  position: absolute;\n  top:0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  overflow-y: auto;\n  overflow-x: hidden;\n}\n#divEditor #heightPlaceholderContainer #divHeightPlaceholder{\n  min-height: 100%;\n}\n#divEditor #divCursor{\n  position: absolute;\n  border-left-style: solid;\n  border-left-width: 1px;\n  pointer-events: none;\n}\n#divEditor #textInput{\n  position: absolute;\n  width: 0px;\n  padding: 0;\n  resize: none;\n  outline: none;\n  border:none;\n  overflow: hidden;\n  background: transparent;\n  color: transparent;\n  pointer-events: none;\n}\n#divLog{\n  float: right;\n  width: calc(100% - 646px);\n  height: 100%;\n  background-color: rgb(240, 240, 240);\n  .error {\n    color: red\n  }\n}\n.toolbar *{\n  outline: none;\n  cursor: pointer;\n}\n.toolbar .btnBold{\n  font-weight: 900;\n}\n.toolbar .btnItalic{\n  font-style: italic;\n}\n.toolbar .btnUnderline{\n  text-decoration: underline;\n}\n.toolbar .btnStrike{\n  text-decoration: line-through;\n}\n.toolbar .btnIndentRight,.toolbar .btnIndentLeft{\n  width:auto;\n  width:initial;\n}\n.toolbar .btnSelected {\n  color: #ddd;\n  background-color: #494949;\n}",""]),e.a=r}})}));