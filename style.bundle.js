(function(y,d){if(typeof exports=="object"&&typeof module=="object")module.exports=d();else if(typeof define=="function"&&define.amd)define([],d);else{var h=d();for(var o in h)(typeof exports=="object"?exports:y)[o]=h[o]}})(self,function(){return function(){"use strict";var m={5545:function(o,r,_){var i=_(8081),n=_.n(i),e=_(3645),t=_.n(e),a=t()(n());a.push([o.id,`html,body{height:100%}#tools{margin-bottom:15px}#divEditor{display:inline-block;width:616px;overflow-x:hidden;overflow-y:auto;position:relative}#divEditor canvas{position:absolute;top:0}#divEditor #cvsDoc{background-color:#ffffff}#divEditor #cvsCover{background-color:rgba(255,0,0,0.05)}#divEditor #heightPlaceholderContainer{position:absolute;top:0;left:0;width:100%;height:100%;overflow-y:auto;overflow-x:hidden}#divEditor #heightPlaceholderContainer #divHeightPlaceholder{min-height:100%}#divEditor #divCursor{position:absolute;border-left-style:solid;border-left-width:1px;pointer-events:none}#divEditor #textInput{position:absolute;width:0px;padding:0;resize:none;outline:none;border:none;overflow:hidden;background:transparent;color:transparent;pointer-events:none}#divLog{float:right;width:calc(100% - 646px);height:100%;background-color:#f0f0f0}#divLog .error{color:red}.toolbar *{outline:none;cursor:pointer}.toolbar .btnBold{font-weight:900}.toolbar .btnItalic{font-style:italic}.toolbar .btnUnderline{text-decoration:underline}.toolbar .btnStrike{text-decoration:line-through}.toolbar .btnIndentRight,.toolbar .btnIndentLeft{width:auto;width:initial}.toolbar .btnSelected{color:#ddd;background-color:#494949}
`,""]),r.Z=a},3645:function(o){o.exports=function(r){var _=[];return _.toString=function(){return this.map(function(n){var e="",t=typeof n[5]!="undefined";return n[4]&&(e+="@supports (".concat(n[4],") {")),n[2]&&(e+="@media ".concat(n[2]," {")),t&&(e+="@layer".concat(n[5].length>0?" ".concat(n[5]):""," {")),e+=r(n),t&&(e+="}"),n[2]&&(e+="}"),n[4]&&(e+="}"),e}).join("")},_.i=function(n,e,t,a,c){typeof n=="string"&&(n=[[null,n,void 0]]);var l={};if(t)for(var u=0;u<this.length;u++){var p=this[u][0];p!=null&&(l[p]=!0)}for(var f=0;f<n.length;f++){var s=[].concat(n[f]);t&&l[s[0]]||(typeof c!="undefined"&&(typeof s[5]=="undefined"||(s[1]="@layer".concat(s[5].length>0?" ".concat(s[5]):""," {").concat(s[1],"}")),s[5]=c),e&&(s[2]&&(s[1]="@media ".concat(s[2]," {").concat(s[1],"}")),s[2]=e),a&&(s[4]?(s[1]="@supports (".concat(s[4],") {").concat(s[1],"}"),s[4]=a):s[4]="".concat(a)),_.push(s))}},_}},8081:function(o){o.exports=function(r){return r[1]}},3379:function(o){var r=[];function _(e){for(var t=-1,a=0;a<r.length;a++)if(r[a].identifier===e){t=a;break}return t}function i(e,t){for(var a={},c=[],l=0;l<e.length;l++){var u=e[l],p=t.base?u[0]+t.base:u[0],f=a[p]||0,s="".concat(p," ").concat(f);a[p]=f+1;var v=_(s),M={css:u[1],media:u[2],sourceMap:u[3],supports:u[4],layer:u[5]};if(v!==-1)r[v].references++,r[v].updater(M);else{var E=n(M,t);t.byIndex=l,r.splice(l,0,{identifier:s,updater:E,references:1})}c.push(s)}return c}function n(e,t){var a=t.domAPI(t);a.update(e);var c=function(u){if(u){if(u.css===e.css&&u.media===e.media&&u.sourceMap===e.sourceMap&&u.supports===e.supports&&u.layer===e.layer)return;a.update(e=u)}else a.remove()};return c}o.exports=function(e,t){t=t||{},e=e||[];var a=i(e,t);return function(l){l=l||[];for(var u=0;u<a.length;u++){var p=a[u],f=_(p);r[f].references--}for(var s=i(l,t),v=0;v<a.length;v++){var M=a[v],E=_(M);r[E].references===0&&(r[E].updater(),r.splice(E,1))}a=s}}},569:function(o){var r={};function _(n){if(typeof r[n]=="undefined"){var e=document.querySelector(n);if(window.HTMLIFrameElement&&e instanceof window.HTMLIFrameElement)try{e=e.contentDocument.head}catch(t){e=null}r[n]=e}return r[n]}function i(n,e){var t=_(n);if(!t)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");t.appendChild(e)}o.exports=i},9216:function(o){function r(_){var i=document.createElement("style");return _.setAttributes(i,_.attributes),_.insert(i,_.options),i}o.exports=r},3565:function(o,r,_){function i(n){var e=_.nc;e&&n.setAttribute("nonce",e)}o.exports=i},7795:function(o){function r(n,e,t){var a="";t.supports&&(a+="@supports (".concat(t.supports,") {")),t.media&&(a+="@media ".concat(t.media," {"));var c=typeof t.layer!="undefined";c&&(a+="@layer".concat(t.layer.length>0?" ".concat(t.layer):""," {")),a+=t.css,c&&(a+="}"),t.media&&(a+="}"),t.supports&&(a+="}");var l=t.sourceMap;l&&typeof btoa!="undefined"&&(a+=`
/*# sourceMappingURL=data:application/json;base64,`.concat(btoa(unescape(encodeURIComponent(JSON.stringify(l))))," */")),e.styleTagTransform(a,n,e.options)}function _(n){if(n.parentNode===null)return!1;n.parentNode.removeChild(n)}function i(n){var e=n.insertStyleElement(n);return{update:function(a){r(e,n,a)},remove:function(){_(e)}}}o.exports=i},4589:function(o){function r(_,i){if(i.styleSheet)i.styleSheet.cssText=_;else{for(;i.firstChild;)i.removeChild(i.firstChild);i.appendChild(document.createTextNode(_))}}o.exports=r}},y={};function d(o){var r=y[o];if(r!==void 0)return r.exports;var _=y[o]={id:o,exports:{}};return m[o](_,_.exports,d),_.exports}(function(){d.n=function(o){var r=o&&o.__esModule?function(){return o.default}:function(){return o};return d.d(r,{a:r}),r}})(),function(){d.d=function(o,r){for(var _ in r)d.o(r,_)&&!d.o(o,_)&&Object.defineProperty(o,_,{enumerable:!0,get:r[_]})}}(),function(){d.o=function(o,r){return Object.prototype.hasOwnProperty.call(o,r)}}(),function(){d.r=function(o){typeof Symbol!="undefined"&&Symbol.toStringTag&&Object.defineProperty(o,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(o,"__esModule",{value:!0})}}();var h={};return function(){d.r(h);var o=d(3379),r=d.n(o),_=d(7795),i=d.n(_),n=d(569),e=d.n(n),t=d(3565),a=d.n(t),c=d(9216),l=d.n(c),u=d(4589),p=d.n(u),f=d(5545),s={};s.styleTagTransform=p(),s.setAttributes=a(),s.insert=e().bind(null,"head"),s.domAPI=i(),s.insertStyleElement=l();var v=r()(f.Z,s);h.default=f.Z&&f.Z.locals?f.Z.locals:void 0}(),h}()});
