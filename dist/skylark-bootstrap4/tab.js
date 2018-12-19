/**
 * skylark-bootstrap4 - The skylark bootstrap4 component library
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylarkui/skylark-bootstrap4/
 * @license MIT
 */
define(["skylark-utils-dom/query","skylark-utils-dom/plugins","./bs4","./util"],function(e,t,n,a){"use strict";const s="4.1.3",r="bs.tab",i=`.${r}`,o=e.fn.tab,l={HIDE:`hide${i}`,HIDDEN:`hidden${i}`,SHOW:`show${i}`,SHOWN:`shown${i}`,CLICK_DATA_API:`click${i}.data-api`},d={DROPDOWN_MENU:"dropdown-menu",ACTIVE:"active",DISABLED:"disabled",FADE:"fade",SHOW:"show"},c={DROPDOWN:".dropdown",NAV_LIST_GROUP:".nav, .list-group",ACTIVE:".active",ACTIVE_UL:"> li > .active",DATA_TOGGLE:'[data-toggle="tab"], [data-toggle="pill"], [data-toggle="list"]',DROPDOWN_TOGGLE:".dropdown-toggle",DROPDOWN_ACTIVE_CHILD:"> .dropdown-menu .active"};class _{constructor(e){this._element=e}static get VERSION(){return s}show(){if(this._element.parentNode&&this._element.parentNode.nodeType===Node.ELEMENT_NODE&&e(this._element).hasClass(d.ACTIVE)||e(this._element).hasClass(d.DISABLED))return;let t,n;const s=e(this._element).closest(c.NAV_LIST_GROUP)[0],r=a.getSelectorFromElement(this._element);if(s){const t="UL"===s.nodeName||"OL"===s.nodeName?c.ACTIVE_UL:c.ACTIVE;n=(n=e.makeArray(e(s).find(t)))[n.length-1]}const i=e.Event(l.HIDE,{relatedTarget:this._element}),o=e.Event(l.SHOW,{relatedTarget:n});if(n&&e(n).trigger(i),e(this._element).trigger(o),o.isDefaultPrevented()||i.isDefaultPrevented())return;r&&(t=document.querySelector(r)),this._activate(this._element,s);const _=()=>{const t=e.Event(l.HIDDEN,{relatedTarget:this._element}),a=e.Event(l.SHOWN,{relatedTarget:n});e(n).trigger(t),e(this._element).trigger(a)};t?this._activate(t,t.parentNode,_):_()}dispose(){e.removeData(this._element,r),this._element=null}_activate(t,n,s){const r=(!n||"UL"!==n.nodeName&&"OL"!==n.nodeName?e(n).children(c.ACTIVE):e(n).find(c.ACTIVE_UL))[0],i=s&&r&&e(r).hasClass(d.FADE),o=()=>this._transitionComplete(t,r,s);if(r&&i){const t=a.getTransitionDurationFromElement(r);e(r).removeClass(d.SHOW).one(a.TRANSITION_END,o).emulateTransitionEnd(t)}else o()}_transitionComplete(t,n,s){if(n){e(n).removeClass(d.ACTIVE);const t=e(n.parentNode).find(c.DROPDOWN_ACTIVE_CHILD)[0];t&&e(t).removeClass(d.ACTIVE),"tab"===n.getAttribute("role")&&n.setAttribute("aria-selected",!1)}if(e(t).addClass(d.ACTIVE),"tab"===t.getAttribute("role")&&t.setAttribute("aria-selected",!0),a.reflow(t),e(t).addClass(d.SHOW),t.parentNode&&e(t.parentNode).hasClass(d.DROPDOWN_MENU)){const n=e(t).closest(c.DROPDOWN)[0];if(n){const t=[].slice.call(n.querySelectorAll(c.DROPDOWN_TOGGLE));e(t).addClass(d.ACTIVE)}t.setAttribute("aria-expanded",!0)}s&&s()}static _jqueryInterface(t){return this.each(function(){const n=e(this);let a=n.data(r);if(a||(a=new _(this),n.data(r,a)),"string"==typeof t){if(void 0===a[t])throw new TypeError(`No method named "${t}"`);a[t]()}})}}return e(document).on(l.CLICK_DATA_API,c.DATA_TOGGLE,function(t){t.preventDefault(),_._jqueryInterface.call(e(this),"show")}),e.fn.tab=_._jqueryInterface,e.fn.tab.Constructor=_,e.fn.tab.noConflict=(()=>(e.fn.tab=o,_._jqueryInterface)),_});
//# sourceMappingURL=sourcemaps/tab.js.map
