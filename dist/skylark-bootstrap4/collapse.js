/**
 * skylark-bootstrap4 - The skylark bootstrap4 component library
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylarkui/skylark-bootstrap4/
 * @license MIT
 */
define(["skylark-langx/langx","skylark-utils-dom/query","skylark-utils-dom/plugins","./bs4","./util"],function(e,t,s,n,i){"use strict";const l="collapse",r="4.1.3",a="bs.collapse",o=`.${a}`,g=t.fn[l],h={toggle:!0,parent:""},c={toggle:"boolean",parent:"(string|element)"},_={SHOW:`show${o}`,SHOWN:`shown${o}`,HIDE:`hide${o}`,HIDDEN:`hidden${o}`,CLICK_DATA_API:`click${o}.data-api`},d={SHOW:"show",COLLAPSE:"collapse",COLLAPSING:"collapsing",COLLAPSED:"collapsed"},m={WIDTH:"width",HEIGHT:"height"},u={ACTIVES:".show, .collapsing",DATA_TOGGLE:'[data-toggle="collapse"]'};class f{constructor(e,t){this._isTransitioning=!1,this._element=e,this._config=this._getConfig(t),this._triggerArray=[].slice.call(document.querySelectorAll(`[data-toggle="collapse"][href="#${e.id}"],`+`[data-toggle="collapse"][data-target="#${e.id}"]`));const s=[].slice.call(document.querySelectorAll(u.DATA_TOGGLE));for(let t=0,n=s.length;t<n;t++){const n=s[t],l=i.getSelectorFromElement(n),r=[].slice.call(document.querySelectorAll(l)).filter(t=>t===e);null!==l&&r.length>0&&(this._selector=l,this._triggerArray.push(n))}this._parent=this._config.parent?this._getParent():null,this._config.parent||this._addAriaAndCollapsedClass(this._element,this._triggerArray),this._config.toggle&&this.toggle()}static get VERSION(){return r}static get Default(){return h}toggle(){t(this._element).hasClass(d.SHOW)?this.hide():this.show()}show(){if(this._isTransitioning||t(this._element).hasClass(d.SHOW))return;let e,s;if(this._parent&&0===(e=[].slice.call(this._parent.querySelectorAll(u.ACTIVES)).filter(e=>"string"==typeof this._config.parent?e.getAttribute("data-parent")===this._config.parent:e.classList.contains(d.COLLAPSE))).length&&(e=null),e&&(s=t(e).not(this._selector).data(a))&&s._isTransitioning)return;const n=t.Event(_.SHOW);if(t(this._element).trigger(n),n.isDefaultPrevented())return;e&&(f._jqueryInterface.call(t(e).not(this._selector),"hide"),s||t(e).data(a,null));const l=this._getDimension();t(this._element).removeClass(d.COLLAPSE).addClass(d.COLLAPSING),this._element.style[l]=0,this._triggerArray.length&&t(this._triggerArray).removeClass(d.COLLAPSED).attr("aria-expanded",!0),this.setTransitioning(!0);const r=`scroll${l[0].toUpperCase()+l.slice(1)}`,o=i.getTransitionDurationFromElement(this._element);t(this._element).one(i.TRANSITION_END,()=>{t(this._element).removeClass(d.COLLAPSING).addClass(d.COLLAPSE).addClass(d.SHOW),this._element.style[l]="",this.setTransitioning(!1),t(this._element).trigger(_.SHOWN)}).emulateTransitionEnd(o),this._element.style[l]=`${this._element[r]}px`}hide(){if(this._isTransitioning||!t(this._element).hasClass(d.SHOW))return;const e=t.Event(_.HIDE);if(t(this._element).trigger(e),e.isDefaultPrevented())return;const s=this._getDimension();this._element.style[s]=`${this._element.getBoundingClientRect()[s]}px`,i.reflow(this._element),t(this._element).addClass(d.COLLAPSING).removeClass(d.COLLAPSE).removeClass(d.SHOW);const n=this._triggerArray.length;if(n>0)for(let e=0;e<n;e++){const s=this._triggerArray[e],n=i.getSelectorFromElement(s);if(null!==n){t([].slice.call(document.querySelectorAll(n))).hasClass(d.SHOW)||t(s).addClass(d.COLLAPSED).attr("aria-expanded",!1)}}this.setTransitioning(!0);this._element.style[s]="";const l=i.getTransitionDurationFromElement(this._element);t(this._element).one(i.TRANSITION_END,()=>{this.setTransitioning(!1),t(this._element).removeClass(d.COLLAPSING).addClass(d.COLLAPSE).trigger(_.HIDDEN)}).emulateTransitionEnd(l)}setTransitioning(e){this._isTransitioning=e}dispose(){t.removeData(this._element,a),this._config=null,this._parent=null,this._element=null,this._triggerArray=null,this._isTransitioning=null}_getConfig(t){return(t=e.mixin({},h,t)).toggle=Boolean(t.toggle),i.typeCheckConfig(l,t,c),t}_getDimension(){return t(this._element).hasClass(m.WIDTH)?m.WIDTH:m.HEIGHT}_getParent(){let e;i.isElement(this._config.parent)?(e=this._config.parent,typeof this._config.parent.skylark-utils-dom/query!=="undefined"&&(e=this._config.parent[0])):e=document.querySelector(this._config.parent);const s=`[data-toggle="collapse"][data-parent="${this._config.parent}"]`,n=[].slice.call(e.querySelectorAll(s));return t(n).each((e,t)=>{this._addAriaAndCollapsedClass(f._getTargetFromElement(t),[t])}),e}_addAriaAndCollapsedClass(e,s){const n=t(e).hasClass(d.SHOW);s.length&&t(s).toggleClass(d.COLLAPSED,!n).attr("aria-expanded",n)}static _getTargetFromElement(e){const t=i.getSelectorFromElement(e);return t?document.querySelector(t):null}static _jqueryInterface(s){return this.each(function(){const n=t(this);let i=n.data(a);const l=e.mixin({},h,n.data(),"object"==typeof s&&s?s:{});if(!i&&l.toggle&&/show|hide/.test(s)&&(l.toggle=!1),i||(i=new f(this,l),n.data(a,i)),"string"==typeof s){if(void 0===i[s])throw new TypeError(`No method named "${s}"`);i[s]()}})}}return t(document).on(_.CLICK_DATA_API,u.DATA_TOGGLE,function(e){"A"===e.currentTarget.tagName&&e.preventDefault();const s=t(this),n=i.getSelectorFromElement(this),l=[].slice.call(document.querySelectorAll(n));t(l).each(function(){const e=t(this),n=e.data(a)?"toggle":s.data();f._jqueryInterface.call(e,n)})}),t.fn[l]=f._jqueryInterface,t.fn[l].Constructor=f,t.fn[l].noConflict=(()=>(t.fn[l]=g,f._jqueryInterface)),f});
//# sourceMappingURL=sourcemaps/collapse.js.map
