/**
 * skylark-bootstrap4 - The skylark bootstrap4 component library
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylarkui/skylark-bootstrap4/
 * @license MIT
 */
define(["skylark-utils-dom/query","skylark-utils-dom/eventer"],function(t,e){"use strict";const n={TRANSITION_END:"bsTransitionEnd",getUID(t){do{t+=~~(1e6*Math.random())}while(document.getElementById(t));return t},getSelectorFromElement(t){let e=t.getAttribute("data-target");if(!e||"#"===e){const n=t.getAttribute("href");e=n&&"#"!==n?n.trim():""}return e&&document.querySelector(e)?e:null},getTransitionDurationFromElement(e){if(!e)return 0;let n=t(e).css("transition-duration"),o=t(e).css("transition-delay");const r=parseFloat(n),i=parseFloat(o);return r||i?(n=n.split(",")[0],o=o.split(",")[0],1e3*(parseFloat(n)+parseFloat(o))):0},reflow:t=>t.offsetHeight,triggerTransitionEnd(e){t(e).trigger("transitionend")},supportsTransitionEnd:()=>Boolean("transitionend"),isElement:t=>(t[0]||t).nodeType,typeCheckConfig(t,e,o){for(const i in o)if(Object.prototype.hasOwnProperty.call(o,i)){const a=o[i],s=e[i],l=s&&n.isElement(s)?"element":(r=s,{}.toString.call(r).match(/\s([a-z]+)/i)[1].toLowerCase());if(!new RegExp(a).test(l))throw new Error(`${t.toUpperCase()}: `+`Option "${i}" provided type "${l}" `+`but expected type "${a}".`)}var r},findShadowRoot(t){if(!document.documentElement.attachShadow)return null;if("function"==typeof t.getRootNode){const e=t.getRootNode();return e instanceof ShadowRoot?e:null}return t instanceof ShadowRoot?t:t.parentNode?n.findShadowRoot(t.parentNode):null}};return e.special.bsTransitionEnd=e.special.transitionEnd,n});
//# sourceMappingURL=sourcemaps/util.js.map
