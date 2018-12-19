/**
 * skylark-bootstrap4 - The skylark bootstrap4 component library
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylarkui/skylark-bootstrap4/
 * @license MIT
 */
define(["skylark-langx/langx","skylark-utils-dom/query","skylark-utils-dom/plugins","./bs4","skylark-ui-popper/Popper","./util"],function(t,e,i,n,s,o){"use strict";const r="tooltip",l="4.1.3",a="bs.tooltip",h=`.${a}`,c=e.fn[r],g="bs-tooltip",u=new RegExp(`(^|\\s)${g}\\S+`,"g"),m={animation:"boolean",template:"string",title:"(string|element|function)",trigger:"string",delay:"(number|object)",html:"boolean",selector:"(string|boolean)",placement:"(string|function)",offset:"(number|string)",container:"(string|element|boolean)",fallbackPlacement:"(string|array)",boundary:"(string|element)"},p={AUTO:"auto",TOP:"top",RIGHT:"right",BOTTOM:"bottom",LEFT:"left"},f={animation:!0,template:'<div class="tooltip" role="tooltip"><div class="arrow"></div><div class="tooltip-inner"></div></div>',trigger:"hover focus",title:"",delay:0,html:!1,selector:!1,placement:"top",offset:0,container:!1,fallbackPlacement:"flip",boundary:"scrollParent"},d={SHOW:"show",OUT:"out"},E={HIDE:`hide${h}`,HIDDEN:`hidden${h}`,SHOW:`show${h}`,SHOWN:`shown${h}`,INSERTED:`inserted${h}`,CLICK:`click${h}`,FOCUSIN:`focusin${h}`,FOCUSOUT:`focusout${h}`,MOUSEENTER:`mouseenter${h}`,MOUSELEAVE:`mouseleave${h}`},_={FADE:"fade",SHOW:"show"},T={TOOLTIP:".tooltip",TOOLTIP_INNER:".tooltip-inner",ARROW:".arrow"},v={HOVER:"hover",FOCUS:"focus",CLICK:"click",MANUAL:"manual"};class C{constructor(t,e){if(void 0===s)throw new TypeError("Bootstrap's tooltips require skylark-ui-popper/Popper (https://skylark-ui-popper/Popper.org/)");this._isEnabled=!0,this._timeout=0,this._hoverState="",this._activeTrigger={},this._popper=null,this.element=t,this.config=this._getConfig(e),this.tip=null,this._setListeners()}static get VERSION(){return l}static get Default(){return f}static get NAME(){return r}static get DATA_KEY(){return a}static get Event(){return E}static get EVENT_KEY(){return h}static get DefaultType(){return m}enable(){this._isEnabled=!0}disable(){this._isEnabled=!1}toggleEnabled(){this._isEnabled=!this._isEnabled}toggle(t){if(this._isEnabled)if(t){const i=this.constructor.DATA_KEY;let n=e(t.currentTarget).data(i);n||(n=new this.constructor(t.currentTarget,this._getDelegateConfig()),e(t.currentTarget).data(i,n)),n._activeTrigger.click=!n._activeTrigger.click,n._isWithActiveTrigger()?n._enter(null,n):n._leave(null,n)}else{if(e(this.getTipElement()).hasClass(_.SHOW))return void this._leave(null,this);this._enter(null,this)}}dispose(){clearTimeout(this._timeout),e.removeData(this.element,this.constructor.DATA_KEY),e(this.element).off(this.constructor.EVENT_KEY),e(this.element).closest(".modal").off("hide.bs.modal"),this.tip&&e(this.tip).remove(),this._isEnabled=null,this._timeout=null,this._hoverState=null,this._activeTrigger=null,null!==this._popper&&this._popper.destroy(),this._popper=null,this.element=null,this.config=null,this.tip=null}show(){if("none"===e(this.element).css("display"))throw new Error("Please use show on visible elements");const t=e.Event(this.constructor.Event.SHOW);if(this.isWithContent()&&this._isEnabled){e(this.element).trigger(t);const i=o.findShadowRoot(this.element),n=e.contains(null!==i?i:this.element.ownerDocument.documentElement,this.element);if(t.isDefaultPrevented()||!n)return;const r=this.getTipElement(),l=o.getUID(this.constructor.NAME);r.setAttribute("id",l),this.element.setAttribute("aria-describedby",l),this.setContent(),this.config.animation&&e(r).addClass(_.FADE);const a="function"==typeof this.config.placement?this.config.placement.call(this,r,this.element):this.config.placement,h=this._getAttachment(a);this.addAttachmentClass(h);const c=this._getContainer();e(r).data(this.constructor.DATA_KEY,this),e.contains(this.element.ownerDocument.documentElement,this.tip)||e(r).appendTo(c),e(this.element).trigger(this.constructor.Event.INSERTED),this._popper=new s(this.element,r,{placement:h,modifiers:{offset:{offset:this.config.offset},flip:{behavior:this.config.fallbackPlacement},arrow:{element:T.ARROW},preventOverflow:{boundariesElement:this.config.boundary}},onCreate:t=>{t.originalPlacement!==t.placement&&this._handlePopperPlacementChange(t)},onUpdate:t=>this._handlePopperPlacementChange(t)}),e(r).addClass(_.SHOW),"ontouchstart"in document.documentElement&&e(document.body).children().on("mouseover",null,e.noop);const g=()=>{this.config.animation&&this._fixTransition();const t=this._hoverState;this._hoverState=null,e(this.element).trigger(this.constructor.Event.SHOWN),t===d.OUT&&this._leave(null,this)};if(e(this.tip).hasClass(_.FADE)){const t=o.getTransitionDurationFromElement(this.tip);e(this.tip).one(o.TRANSITION_END,g).emulateTransitionEnd(t)}else g()}}hide(t){const i=this.getTipElement(),n=e.Event(this.constructor.Event.HIDE),s=()=>{this._hoverState!==d.SHOW&&i.parentNode&&i.parentNode.removeChild(i),this._cleanTipClass(),this.element.removeAttribute("aria-describedby"),e(this.element).trigger(this.constructor.Event.HIDDEN),null!==this._popper&&this._popper.destroy(),t&&t()};if(e(this.element).trigger(n),!n.isDefaultPrevented()){if(e(i).removeClass(_.SHOW),"ontouchstart"in document.documentElement&&e(document.body).children().off("mouseover",null,e.noop),this._activeTrigger[v.CLICK]=!1,this._activeTrigger[v.FOCUS]=!1,this._activeTrigger[v.HOVER]=!1,e(this.tip).hasClass(_.FADE)){const t=o.getTransitionDurationFromElement(i);e(i).one(o.TRANSITION_END,s).emulateTransitionEnd(t)}else s();this._hoverState=""}}update(){null!==this._popper&&this._popper.scheduleUpdate()}isWithContent(){return Boolean(this.getTitle())}addAttachmentClass(t){e(this.getTipElement()).addClass(`${g}-${t}`)}getTipElement(){return this.tip=this.tip||e(this.config.template)[0],this.tip}setContent(){const t=this.getTipElement();this.setElementContent(e(t.querySelectorAll(T.TOOLTIP_INNER)),this.getTitle()),e(t).removeClass(`${_.FADE} ${_.SHOW}`)}setElementContent(t,i){const n=this.config.html;"object"==typeof i&&(i.nodeType||i.skylark-utils-dom/query)?n?e(i).parent().is(t)||t.empty().append(i):t.text(e(i).text()):t[n?"html":"text"](i)}getTitle(){let t=this.element.getAttribute("data-original-title");return t||(t="function"==typeof this.config.title?this.config.title.call(this.element):this.config.title),t}_getContainer(){return!1===this.config.container?document.body:o.isElement(this.config.container)?e(this.config.container):e(document).find(this.config.container)}_getAttachment(t){return p[t.toUpperCase()]}_setListeners(){this.config.trigger.split(" ").forEach(t=>{if("click"===t)e(this.element).on(this.constructor.Event.CLICK,this.config.selector,t=>this.toggle(t));else if(t!==v.MANUAL){const i=t===v.HOVER?this.constructor.Event.MOUSEENTER:this.constructor.Event.FOCUSIN,n=t===v.HOVER?this.constructor.Event.MOUSELEAVE:this.constructor.Event.FOCUSOUT;e(this.element).on(i,this.config.selector,t=>this._enter(t)).on(n,this.config.selector,t=>this._leave(t))}}),e(this.element).closest(".modal").on("hide.bs.modal",()=>{this.element&&this.hide()}),this.config.selector?t.mixin(this.config,{trigger:"manual",selector:""}):this._fixTitle()}_fixTitle(){const t=typeof this.element.getAttribute("data-original-title");(this.element.getAttribute("title")||"string"!==t)&&(this.element.setAttribute("data-original-title",this.element.getAttribute("title")||""),this.element.setAttribute("title",""))}_enter(t,i){const n=this.constructor.DATA_KEY;(i=i||e(t.currentTarget).data(n))||(i=new this.constructor(t.currentTarget,this._getDelegateConfig()),e(t.currentTarget).data(n,i)),t&&(i._activeTrigger["focusin"===t.type?v.FOCUS:v.HOVER]=!0),e(i.getTipElement()).hasClass(_.SHOW)||i._hoverState===d.SHOW?i._hoverState=d.SHOW:(clearTimeout(i._timeout),i._hoverState=d.SHOW,i.config.delay&&i.config.delay.show?i._timeout=setTimeout(()=>{i._hoverState===d.SHOW&&i.show()},i.config.delay.show):i.show())}_leave(t,i){const n=this.constructor.DATA_KEY;(i=i||e(t.currentTarget).data(n))||(i=new this.constructor(t.currentTarget,this._getDelegateConfig()),e(t.currentTarget).data(n,i)),t&&(i._activeTrigger["focusout"===t.type?v.FOCUS:v.HOVER]=!1),i._isWithActiveTrigger()||(clearTimeout(i._timeout),i._hoverState=d.OUT,i.config.delay&&i.config.delay.hide?i._timeout=setTimeout(()=>{i._hoverState===d.OUT&&i.hide()},i.config.delay.hide):i.hide())}_isWithActiveTrigger(){for(const t in this._activeTrigger)if(this._activeTrigger[t])return!0;return!1}_getConfig(i){return"number"==typeof(i=t.mixin({},this.constructor.Default,e(this.element).data(),i)).delay&&(i.delay={show:i.delay,hide:i.delay}),"number"==typeof i.title&&(i.title=i.title.toString()),"number"==typeof i.content&&(i.content=i.content.toString()),o.typeCheckConfig(r,i,this.constructor.DefaultType),i}_getDelegateConfig(){const t={};if(this.config)for(const e in this.config)this.constructor.Default[e]!==this.config[e]&&(t[e]=this.config[e]);return t}_cleanTipClass(){const t=e(this.getTipElement()),i=t.attr("class").match(u);null!==i&&i.length&&t.removeClass(i.join(""))}_handlePopperPlacementChange(t){const e=t.instance;this.tip=e.popper,this._cleanTipClass(),this.addAttachmentClass(this._getAttachment(t.placement))}_fixTransition(){const t=this.getTipElement(),i=this.config.animation;null===t.getAttribute("x-placement")&&(e(t).removeClass(_.FADE),this.config.animation=!1,this.hide(),this.show(),this.config.animation=i)}static _jqueryInterface(t){return this.each(function(){let i=e(this).data(a);const n="object"==typeof t&&t;if((i||!/dispose|hide/.test(t))&&(i||(i=new C(this,n),e(this).data(a,i)),"string"==typeof t)){if(void 0===i[t])throw new TypeError(`No method named "${t}"`);i[t]()}})}}return e.fn[r]=C._jqueryInterface,e.fn[r].Constructor=C,e.fn[r].noConflict=(()=>(e.fn[r]=c,C._jqueryInterface)),C});
//# sourceMappingURL=sourcemaps/tooltip.js.map
