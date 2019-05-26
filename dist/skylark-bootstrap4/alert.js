/**
 * skylark-bootstrap4 - The skylark bootstrap4 component library
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylarkui/skylark-bootstrap4/
 * @license MIT
 */
define(["skylark-utils-dom/query","skylark-utils-dom/eventer","skylark-utils-dom/plugins","./bs4","./util"],function(e,t,s,r,n){"use strict";const l="4.1.3",o="bs.alert",i=`.${o}`,a=e.fn.alert,c={CLOSE:`close${i}`,CLOSED:`closed${i}`,CLICK_DATA_API:`click${i}.data-api`},u={ALERT:"alert",FADE:"fade",SHOW:"show"};class m{constructor(e){this._element=e}static get VERSION(){return l}close(e){let t=this._element;e&&(t=this._getRootElement(e)),this._triggerCloseEvent(t).isDefaultPrevented()||this._removeElement(t)}dispose(){e.removeData(this._element,o),this._element=null}_getRootElement(t){const s=n.getSelectorFromElement(t);let r=!1;return s&&(r=document.querySelector(s)),r||(r=e(t).closest(`.${u.ALERT}`)[0]),r}_triggerCloseEvent(s){const r=t.create(c.CLOSE);return e(s).trigger(r),r}_removeElement(t){if(e(t).removeClass(u.SHOW),!e(t).hasClass(u.FADE))return void this._destroyElement(t);const s=n.getTransitionDurationFromElement(t);e(t).one(n.TRANSITION_END,e=>this._destroyElement(t,e)).emulateTransitionEnd(s)}_destroyElement(t){e(t).detach().trigger(c.CLOSED).remove()}static _jqueryInterface(t){return this.each(function(){const s=e(this);let r=s.data(o);r||(r=new m(this),s.data(o,r)),"close"===t&&r[t](this)})}static _handleDismiss(e){return function(t){t&&t.preventDefault(),e.close(this)}}}return e(document).on(c.CLICK_DATA_API,'[data-dismiss="alert"]',m._handleDismiss(new m)),e.fn.alert=m._jqueryInterface,e.fn.alert.Constructor=m,e.fn.alert.noConflict=(()=>(e.fn.alert=a,m._jqueryInterface)),r.Alert=m});
//# sourceMappingURL=sourcemaps/alert.js.map
