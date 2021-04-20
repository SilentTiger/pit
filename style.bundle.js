(function(M,d){if(typeof exports=="object"&&typeof module=="object")module.exports=d();else if(typeof define=="function"&&define.amd)define([],d);else{var g=d();for(var o in g)(typeof exports=="object"?exports:M)[o]=g[o]}})(self,function(){return function(){"use strict";var T={5545:function(o,c,l){var f=l(3645),s=l.n(f),u=s()(function(p){return p[1]});u.push([o.id,`html,body{height:100%}#tools{margin-bottom:15px}#divEditor{display:inline-block;width:616px;overflow-x:hidden;overflow-y:auto;position:relative}#divEditor canvas{position:absolute;top:0}#divEditor #cvsDoc{background-color:#ffffff}#divEditor #cvsCover{background-color:rgba(255,0,0,0.05)}#divEditor #heightPlaceholderContainer{position:absolute;top:0;left:0;width:100%;height:100%;overflow-y:auto;overflow-x:hidden}#divEditor #heightPlaceholderContainer #divHeightPlaceholder{min-height:100%}#divEditor #divCursor{position:absolute;border-left-style:solid;border-left-width:1px;pointer-events:none}#divEditor #textInput{position:absolute;width:0px;padding:0;resize:none;outline:none;border:none;overflow:hidden;background:transparent;color:transparent;pointer-events:none}#divLog{float:right;width:calc(100% - 646px);height:100%;background-color:#f0f0f0}#divLog .error{color:red}.toolbar *{outline:none;cursor:pointer}.toolbar .btnBold{font-weight:900}.toolbar .btnItalic{font-style:italic}.toolbar .btnUnderline{text-decoration:underline}.toolbar .btnStrike{text-decoration:line-through}.toolbar .btnIndentRight,.toolbar .btnIndentLeft{width:auto;width:initial}.toolbar .btnSelected{color:#ddd;background-color:#494949}
`,""]),c.Z=u},3645:function(o){o.exports=function(c){var l=[];return l.toString=function(){return this.map(function(s){var u=c(s);return s[2]?"@media ".concat(s[2]," {").concat(u,"}"):u}).join("")},l.i=function(f,s,u){typeof f=="string"&&(f=[[null,f,""]]);var p={};if(u)for(var m=0;m<this.length;m++){var E=this[m][0];E!=null&&(p[E]=!0)}for(var y=0;y<f.length;y++){var h=[].concat(f[y]);u&&p[h[0]]||(s&&(h[2]?h[2]="".concat(s," and ").concat(h[2]):h[2]=s),l.push(h))}},l}},3379:function(o,c,l){var f=function(){var t;return function(){return typeof t=="undefined"&&(t=Boolean(window&&document&&document.all&&!window.atob)),t}}(),s=function(){var t={};return function(a){if(typeof t[a]=="undefined"){var r=document.querySelector(a);if(window.HTMLIFrameElement&&r instanceof window.HTMLIFrameElement)try{r=r.contentDocument.head}catch(i){r=null}t[a]=r}return t[a]}}(),u=[];function p(e){for(var t=-1,n=0;n<u.length;n++)if(u[n].identifier===e){t=n;break}return t}function m(e,t){for(var n={},a=[],r=0;r<e.length;r++){var i=e[r],_=t.base?i[0]+t.base:i[0],v=n[_]||0,S="".concat(_," ").concat(v);n[_]=v+1;var b=p(S),w={css:i[1],media:i[2],sourceMap:i[3]};b!==-1?(u[b].references++,u[b].updater(w)):u.push({identifier:S,updater:D(w,t),references:1}),a.push(S)}return a}function E(e){var t=document.createElement("style"),n=e.attributes||{};if(typeof n.nonce=="undefined"){var a=l.nc;a&&(n.nonce=a)}if(Object.keys(n).forEach(function(i){t.setAttribute(i,n[i])}),typeof e.insert=="function")e.insert(t);else{var r=s(e.insert||"head");if(!r)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");r.appendChild(t)}return t}function y(e){if(e.parentNode===null)return!1;e.parentNode.removeChild(e)}var h=function(){var t=[];return function(a,r){return t[a]=r,t.filter(Boolean).join(`
`)}}();function x(e,t,n,a){var r=n?"":a.media?"@media ".concat(a.media," {").concat(a.css,"}"):a.css;if(e.styleSheet)e.styleSheet.cssText=h(t,r);else{var i=document.createTextNode(r),_=e.childNodes;_[t]&&e.removeChild(_[t]),_.length?e.insertBefore(i,_[t]):e.appendChild(i)}}function O(e,t,n){var a=n.css,r=n.media,i=n.sourceMap;if(r?e.setAttribute("media",r):e.removeAttribute("media"),i&&typeof btoa!="undefined"&&(a+=`
/*# sourceMappingURL=data:application/json;base64,`.concat(btoa(unescape(encodeURIComponent(JSON.stringify(i))))," */")),e.styleSheet)e.styleSheet.cssText=a;else{for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(a))}}var I=null,P=0;function D(e,t){var n,a,r;if(t.singleton){var i=P++;n=I||(I=E(t)),a=x.bind(null,n,i,!1),r=x.bind(null,n,i,!0)}else n=E(t),a=O.bind(null,n,t),r=function(){y(n)};return a(e),function(v){if(v){if(v.css===e.css&&v.media===e.media&&v.sourceMap===e.sourceMap)return;a(e=v)}else r()}}o.exports=function(e,t){t=t||{},!t.singleton&&typeof t.singleton!="boolean"&&(t.singleton=f()),e=e||[];var n=m(e,t);return function(r){if(r=r||[],Object.prototype.toString.call(r)==="[object Array]"){for(var i=0;i<n.length;i++){var _=n[i],v=p(_);u[v].references--}for(var S=m(r,t),b=0;b<n.length;b++){var w=n[b],C=p(w);u[C].references===0&&(u[C].updater(),u.splice(C,1))}n=S}}}}},M={};function d(o){var c=M[o];if(c!==void 0)return c.exports;var l=M[o]={id:o,exports:{}};return T[o](l,l.exports,d),l.exports}(function(){d.n=function(o){var c=o&&o.__esModule?function(){return o.default}:function(){return o};return d.d(c,{a:c}),c}})(),function(){d.d=function(o,c){for(var l in c)d.o(c,l)&&!d.o(o,l)&&Object.defineProperty(o,l,{enumerable:!0,get:c[l]})}}(),function(){d.o=function(o,c){return Object.prototype.hasOwnProperty.call(o,c)}}(),function(){d.r=function(o){typeof Symbol!="undefined"&&Symbol.toStringTag&&Object.defineProperty(o,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(o,"__esModule",{value:!0})}}();var g={};return function(){d.r(g);var o=d(3379),c=d.n(o),l=d(5545),f={};f.insert="head",f.singleton=!1;var s=c()(l.Z,f);g.default=l.Z.locals||{}}(),g}()});
