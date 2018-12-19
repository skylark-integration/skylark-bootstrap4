/**
 * skylark-bootstrap4 - The skylark bootstrap4 component library
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylarkui/skylark-bootstrap4/
 * @license MIT
 */
define(["skylark-utils-dom/query","skylark-utils-dom/plugins","./bs4","./util"],function(e,t,s,n){"use strict";const r="4.1.3",l="bs.alert",o=`.${l}`,i=e.fn.alert,a={CLOSE:`close${o}`,CLOSED:`closed${o}`,CLICK_DATA_API:`click${o}.data-api`},c={ALERT:"alert",FADE:"fade",SHOW:"show"};class u{constructor(e){this._element=e}static get VERSION(){return r}close(e){let t=this._element;e&&(t=this._getRootElement(e)),this._triggerCloseEvent(t).isDefaultPrevented()||this._removeElement(t)}dispose(){e.removeData(this._element,l),this._element=null}_getRootElement(t){const s=n.getSelectorFromElement(t);let r=!1;return s&&(r=document.querySelector(s)),r||(r=e(t).closest(`.${c.ALERT}`)[0]),r}_triggerCloseEvent(t){const s=e.Event(a.CLOSE);return e(t).trigger(s),s}_removeElement(t){if(e(t).removeClass(c.SHOW),!e(t).hasClass(c.FADE))return void this._destroyElement(t);const s=n.getTransitionDurationFromElement(t);e(t).one(n.TRANSITION_END,e=>this._destroyElement(t,e)).emulateTransitionEnd(s)}_destroyElement(t){e(t).detach().trigger(a.CLOSED).remove()}static _jqueryInterface(t){return this.each(function(){const s=e(this);let n=s.data(l);n||(n=new u(this),s.data(l,n)),"close"===t&&n[t](this)})}static _handleDismiss(e){return function(t){t&&t.preventDefault(),e.close(this)}}}return e(document).on(a.CLICK_DATA_API,'[data-dismiss="alert"]',u._handleDismiss(new u)),e.fn.alert=u._jqueryInterface,e.fn.alert.Constructor=u,e.fn.alert.noConflict=(()=>(e.fn.alert=i,u._jqueryInterface)),s.Alert=u});
//# sourceMappingURL=sourcemaps/alert.js.map
