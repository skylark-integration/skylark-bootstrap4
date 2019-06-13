/**
 * skylark-bootstrap4 - The skylark bootstrap4 component library
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylarkui/skylark-bootstrap4/
 * @license MIT
 */
(function(factory,globals) {
  var define = globals.define,
      require = globals.require,
      isAmd = (typeof define === 'function' && define.amd),
      isCmd = (!isAmd && typeof exports !== 'undefined');

  if (!isAmd && !define) {
    var map = {};
    function absolute(relative, base) {
        if (relative[0]!==".") {
          return relative;
        }
        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); 
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
    define = globals.define = function(id, deps, factory) {
        if (typeof factory == 'function') {
            map[id] = {
                factory: factory,
                deps: deps.map(function(dep){
                  return absolute(dep,id);
                }),
                resolved: false,
                exports: null
            };
            require(id);
        } else {
            map[id] = {
                factory : null,
                resolved : true,
                exports : factory
            };
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.resolved) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(globals, args) || null;
            module.resolved = true;
        }
        return module.exports;
    };
  }
  
  if (!define) {
     throw new Error("The module utility (ex: requirejs or skylark-utils) is not loaded!");
  }

  factory(define,require);

  if (!isAmd) {
    var skylarkjs = require("skylark-langx/skylark");

    if (isCmd) {
      module.exports = skylarkjs;
    } else {
      globals.skylarkjs  = skylarkjs;
    }
  }

})(function(define,require) {

define('skylark-bootstrap4/bs4',[
  "skylark-utils-dom/skylark",
],function(skylark){
	var ui = skylark.ui = skylark.ui || {}, 
		bs4 = ui.bs4 = {};

	return bs4;
});

define('skylark-bootstrap4/util',[
    'skylark-utils-dom/query',
    'skylark-utils-dom/eventer'
], function ($, eventer) {
    'use strict';

    const TRANSITION_END = 'transitionend';
    const MAX_UID = 1000000;
    const MILLISECONDS_MULTIPLIER = 1000;

    function toType(obj) {
        return {}.toString.call(obj).match(/\s([a-z]+)/i)[1].toLowerCase();
    }

    /*
    function getSpecialTransitionEndEvent() {
        return {
            bindType: TRANSITION_END,
            delegateType: TRANSITION_END,
            handle(event) {
                if ($(event.target).is(this)) {
                    return event.handleObj.handler.apply(this, arguments);
                }
                return undefined;
            }
        };
    }

    function transitionEndEmulator(duration) {
        let called = false;
        $(this).one(Util.TRANSITION_END, () => {
            called = true;
        });
        setTimeout(() => {
            if (!called) {
                Util.triggerTransitionEnd(this);
            }
        }, duration);
        return this;
    }

    function setTransitionEndSupport() {
        $.fn.emulateTransitionEnd = transitionEndEmulator;
        eventer.create.special[Util.TRANSITION_END] = getSpecialTransitionEndEvent();
    }
    */
    const Util = {
        TRANSITION_END: 'bsTransitionEnd',

        getUID(prefix) {
            do {
                prefix += ~~(Math.random() * MAX_UID);
            } while (document.getElementById(prefix));
            return prefix;
        },

        getSelectorFromElement(element) {
            let selector = element.getAttribute('data-target');
            if (!selector || selector === '#') {
                const hrefAttr = element.getAttribute('href');
                selector = hrefAttr && hrefAttr !== '#' ? hrefAttr.trim() : '';
            }
            return selector && document.querySelector(selector) ? selector : null;
        },

        getTransitionDurationFromElement(element) {
            if (!element) {
                return 0;
            }
            let transitionDuration = $(element).css('transition-duration');
            let transitionDelay = $(element).css('transition-delay');
            const floatTransitionDuration = parseFloat(transitionDuration);
            const floatTransitionDelay = parseFloat(transitionDelay);
            if (!floatTransitionDuration && !floatTransitionDelay) {
                return 0;
            }
            transitionDuration = transitionDuration.split(',')[0];
            transitionDelay = transitionDelay.split(',')[0];
            return (parseFloat(transitionDuration) + parseFloat(transitionDelay)) * MILLISECONDS_MULTIPLIER;
        },

        reflow(element) {
            return element.offsetHeight;
        },

        triggerTransitionEnd(element) {
            $(element).trigger(TRANSITION_END);
        },

        supportsTransitionEnd() {
            return Boolean(TRANSITION_END);
        },

        isElement(obj) {
            return (obj[0] || obj).nodeType;
        },

        typeCheckConfig(componentName, config, configTypes) {
            for (const property in configTypes) {
                if (Object.prototype.hasOwnProperty.call(configTypes, property)) {
                    const expectedTypes = configTypes[property];
                    const value = config[property];
                    const valueType = value && Util.isElement(value) ? 'element' : toType(value);
                    if (!new RegExp(expectedTypes).test(valueType)) {
                        throw new Error(`${ componentName.toUpperCase() }: ` + `Option "${ property }" provided type "${ valueType }" ` + `but expected type "${ expectedTypes }".`);
                    }
                }
            }
        },

        findShadowRoot(element) {
            if (!document.documentElement.attachShadow) {
                return null;
            }
            if (typeof element.getRootNode === 'function') {
                const root = element.getRootNode();
                return root instanceof ShadowRoot ? root : null;
            }
            if (element instanceof ShadowRoot) {
                return element;
            }
            if (!element.parentNode) {
                return null;
            }
            return Util.findShadowRoot(element.parentNode);
        }
    };

    //setTransitionEndSupport();
    eventer.special.bsTransitionEnd = eventer.special.transitionEnd;

    return Util;
});
define('skylark-bootstrap4/alert',[
    'skylark-utils-dom/query',
    'skylark-utils-dom/eventer',
    'skylark-utils-dom/plugins',
    "./bs4",
    './util'
], function ($, eventer, plugins,bs4,Util) {

    'use strict';
    const NAME = 'alert';
    const VERSION = '4.1.3';
    const DATA_KEY = 'bs.alert';
    const EVENT_KEY = `.${ DATA_KEY }`;
    const DATA_API_KEY = '.data-api';
    const jquery_NO_CONFLICT = $.fn[NAME];
    const Selector = { DISMISS: '[data-dismiss="alert"]' };
    const Event = {
        CLOSE: `close${ EVENT_KEY }`,
        CLOSED: `closed${ EVENT_KEY }`,
        CLICK_DATA_API: `click${ EVENT_KEY }${ DATA_API_KEY }`
    };
    const ClassName = {
        ALERT: 'alert',
        FADE: 'fade',
        SHOW: 'show'
    };
    class Alert {
        constructor(element) {
            this._element = element;
        }
        static get VERSION() {
            return VERSION;
        }
        close(element) {
            let rootElement = this._element;
            if (element) {
                rootElement = this._getRootElement(element);
            }
            const customEvent = this._triggerCloseEvent(rootElement);
            if (customEvent.isDefaultPrevented()) {
                return;
            }
            this._removeElement(rootElement);
        }
        dispose() {
            $.removeData(this._element, DATA_KEY);
            this._element = null;
        }
        _getRootElement(element) {
            const selector = Util.getSelectorFromElement(element);
            let parent = false;
            if (selector) {
                parent = document.querySelector(selector);
            }
            if (!parent) {
                parent = $(element).closest(`.${ ClassName.ALERT }`)[0];
            }
            return parent;
        }
        _triggerCloseEvent(element) {
            const closeEvent = eventer.create(Event.CLOSE);
            $(element).trigger(closeEvent);
            return closeEvent;
        }
        _removeElement(element) {
            $(element).removeClass(ClassName.SHOW);
            if (!$(element).hasClass(ClassName.FADE)) {
                this._destroyElement(element);
                return;
            }
            const transitionDuration = Util.getTransitionDurationFromElement(element);
            $(element).one(Util.TRANSITION_END, event => this._destroyElement(element, event)).emulateTransitionEnd(transitionDuration);
        }
        _destroyElement(element) {
            $(element).detach().trigger(Event.CLOSED).remove();
        }
        static _jqueryInterface(config) {
            return this.each(function () {
                const $element = $(this);
                let data = $element.data(DATA_KEY);
                if (!data) {
                    data = new Alert(this);
                    $element.data(DATA_KEY, data);
                }
                if (config === 'close') {
                    data[config](this);
                }
            });
        }
        static _handleDismiss(alertInstance) {
            return function (event) {
                if (event) {
                    event.preventDefault();
                }
                alertInstance.close(this);
            };
        }
    }

    $(document).on(Event.CLICK_DATA_API, Selector.DISMISS, Alert._handleDismiss(new Alert()));
    $.fn[NAME] = Alert._jqueryInterface;
    $.fn[NAME].Constructor = Alert;
    $.fn[NAME].noConflict = () => {
        $.fn[NAME] = jquery_NO_CONFLICT;
        return Alert._jqueryInterface;
    };

    return bs4.Alert = Alert;
});
define('skylark-bootstrap4/button',[
    'skylark-utils-dom/query',
    'skylark-utils-dom/plugins',
    "./bs4"
], function ($, plugins,bs4) {
    'use strict';
    const NAME = 'button';
    const VERSION = '4.1.3';
    const DATA_KEY = 'bs.button';
    const EVENT_KEY = `.${ DATA_KEY }`;
    const DATA_API_KEY = '.data-api';
    const jquery_NO_CONFLICT = $.fn[NAME];
    const ClassName = {
        ACTIVE: 'active',
        BUTTON: 'btn',
        FOCUS: 'focus'
    };
    const Selector = {
        DATA_TOGGLE_CARROT: '[data-toggle^="button"]',
        DATA_TOGGLE: '[data-toggle="buttons"]',
        INPUT: 'input:not([type="hidden"])',
        ACTIVE: '.active',
        BUTTON: '.btn'
    };
    const Event = {
        CLICK_DATA_API: `click${ EVENT_KEY }${ DATA_API_KEY }`,
        FOCUS_BLUR_DATA_API: `focus${ EVENT_KEY }${ DATA_API_KEY } ` + `blur${ EVENT_KEY }${ DATA_API_KEY }`
    };
    class Button {
        constructor(element) {
            this._element = element;
        }
        static get VERSION() {
            return VERSION;
        }
        toggle() {
            let triggerChangeEvent = true;
            let addAriaPressed = true;
            const rootElement = $(this._element).closest(Selector.DATA_TOGGLE)[0];
            if (rootElement) {
                const input = this._element.querySelector(Selector.INPUT);
                if (input) {
                    if (input.type === 'radio') {
                        if (input.checked && this._element.classList.contains(ClassName.ACTIVE)) {
                            triggerChangeEvent = false;
                        } else {
                            const activeElement = rootElement.querySelector(Selector.ACTIVE);
                            if (activeElement) {
                                $(activeElement).removeClass(ClassName.ACTIVE);
                            }
                        }
                    }
                    if (triggerChangeEvent) {
                        if (input.hasAttribute('disabled') || rootElement.hasAttribute('disabled') || input.classList.contains('disabled') || rootElement.classList.contains('disabled')) {
                            return;
                        }
                        input.checked = !this._element.classList.contains(ClassName.ACTIVE);
                        $(input).trigger('change');
                    }
                    input.focus();
                    addAriaPressed = false;
                }
            }
            if (addAriaPressed) {
                this._element.setAttribute('aria-pressed', !this._element.classList.contains(ClassName.ACTIVE));
            }
            if (triggerChangeEvent) {
                $(this._element).toggleClass(ClassName.ACTIVE);
            }
        }
        dispose() {
            $.removeData(this._element, DATA_KEY);
            this._element = null;
        }
        static _jqueryInterface(config) {
            return this.each(function () {
                let data = $(this).data(DATA_KEY);
                if (!data) {
                    data = new Button(this);
                    $(this).data(DATA_KEY, data);
                }
                if (config === 'toggle') {
                    data[config]();
                }
            });
        }
    }
    $(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE_CARROT, event => {
        event.preventDefault();
        let button = event.target;
        if (!$(button).hasClass(ClassName.BUTTON)) {
            button = $(button).closest(Selector.BUTTON);
        }
        Button._jqueryInterface.call($(button), 'toggle');
    }).on(Event.FOCUS_BLUR_DATA_API, Selector.DATA_TOGGLE_CARROT, event => {
        const button = $(event.target).closest(Selector.BUTTON)[0];
        $(button).toggleClass(ClassName.FOCUS, /^focus(in)?$/.test(event.type));
    });

    $.fn[NAME] = Button._jqueryInterface;
    $.fn[NAME].Constructor = Button;
    $.fn[NAME].noConflict = () => {
        $.fn[NAME] = jquery_NO_CONFLICT;
        return Button._jqueryInterface;
    };


    return bs4.Button = Button;
});
define('skylark-bootstrap4/carousel',[
    'skylark-langx/langx',
    'skylark-utils-dom/query',
    'skylark-utils-dom/eventer',
    'skylark-utils-dom/plugins',
    "./bs4",
    './util'
], function (langx,$, eventer,plugins,bs4,Util) {

    'use strict';
    const NAME = 'carousel';
    const VERSION = '4.1.3';
    const DATA_KEY = 'bs.carousel';
    const EVENT_KEY = `.${ DATA_KEY }`;
    const DATA_API_KEY = '.data-api';
    const jquery_NO_CONFLICT = $.fn[NAME];
    const ARROW_LEFT_KEYCODE = 37;
    const ARROW_RIGHT_KEYCODE = 39;
    const TOUCHEVENT_COMPAT_WAIT = 500;
    const SWIPE_THRESHOLD = 40;
    const Default = {
        interval: 5000,
        keyboard: true,
        slide: false,
        pause: 'hover',
        wrap: true,
        touch: true
    };
    const DefaultType = {
        interval: '(number|boolean)',
        keyboard: 'boolean',
        slide: '(boolean|string)',
        pause: '(string|boolean)',
        wrap: 'boolean',
        touch: 'boolean'
    };
    const Direction = {
        NEXT: 'next',
        PREV: 'prev',
        LEFT: 'left',
        RIGHT: 'right'
    };
    const Event = {
        SLIDE: `slide${ EVENT_KEY }`,
        SLID: `slid${ EVENT_KEY }`,
        KEYDOWN: `keydown${ EVENT_KEY }`,
        MOUSEENTER: `mouseenter${ EVENT_KEY }`,
        MOUSELEAVE: `mouseleave${ EVENT_KEY }`,
        TOUCHSTART: `touchstart${ EVENT_KEY }`,
        TOUCHMOVE: `touchmove${ EVENT_KEY }`,
        TOUCHEND: `touchend${ EVENT_KEY }`,
        POINTERDOWN: `pointerdown${ EVENT_KEY }`,
        POINTERUP: `pointerup${ EVENT_KEY }`,
        DRAG_START: `dragstart${ EVENT_KEY }`,
        LOAD_DATA_API: `load${ EVENT_KEY }${ DATA_API_KEY }`,
        CLICK_DATA_API: `click${ EVENT_KEY }${ DATA_API_KEY }`
    };
    const ClassName = {
        CAROUSEL: 'carousel',
        ACTIVE: 'active',
        SLIDE: 'slide',
        RIGHT: 'carousel-item-right',
        LEFT: 'carousel-item-left',
        NEXT: 'carousel-item-next',
        PREV: 'carousel-item-prev',
        ITEM: 'carousel-item',
        POINTER_EVENT: 'pointer-event'
    };
    const Selector = {
        ACTIVE: '.active',
        ACTIVE_ITEM: '.active.carousel-item',
        ITEM: '.carousel-item',
        ITEM_IMG: '.carousel-item img',
        NEXT_PREV: '.carousel-item-next, .carousel-item-prev',
        INDICATORS: '.carousel-indicators',
        DATA_SLIDE: '[data-slide], [data-slide-to]',
        DATA_RIDE: '[data-ride="carousel"]'
    };
    const PointerType = {
        TOUCH: 'touch',
        PEN: 'pen'
    };
    class Carousel {
        constructor(element, config) {
            this._items = null;
            this._interval = null;
            this._activeElement = null;
            this._isPaused = false;
            this._isSliding = false;
            this.touchTimeout = null;
            this.touchStartX = 0;
            this.touchDeltaX = 0;
            this._config = this._getConfig(config);
            this._element = element;
            this._indicatorsElement = this._element.querySelector(Selector.INDICATORS);
            this._touchSupported = 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0;
            this._pointerEvent = Boolean(window.PointerEvent || window.MSPointerEvent);
            this._addEventListeners();
        }
        static get VERSION() {
            return VERSION;
        }
        static get Default() {
            return Default;
        }
        next() {
            if (!this._isSliding) {
                this._slide(Direction.NEXT);
            }
        }
        nextWhenVisible() {
            if (!document.hidden && ($(this._element).is(':visible') && $(this._element).css('visibility') !== 'hidden')) {
                this.next();
            }
        }
        prev() {
            if (!this._isSliding) {
                this._slide(Direction.PREV);
            }
        }
        pause(event) {
            if (!event) {
                this._isPaused = true;
            }
            if (this._element.querySelector(Selector.NEXT_PREV)) {
                Util.triggerTransitionEnd(this._element);
                this.cycle(true);
            }
            clearInterval(this._interval);
            this._interval = null;
        }
        cycle(event) {
            if (!event) {
                this._isPaused = false;
            }
            if (this._interval) {
                clearInterval(this._interval);
                this._interval = null;
            }
            if (this._config.interval && !this._isPaused) {
                this._interval = setInterval((document.visibilityState ? this.nextWhenVisible : this.next).bind(this), this._config.interval);
            }
        }
        to(index) {
            this._activeElement = this._element.querySelector(Selector.ACTIVE_ITEM);
            const activeIndex = this._getItemIndex(this._activeElement);
            if (index > this._items.length - 1 || index < 0) {
                return;
            }
            if (this._isSliding) {
                $(this._element).one(Event.SLID, () => this.to(index));
                return;
            }
            if (activeIndex === index) {
                this.pause();
                this.cycle();
                return;
            }
            const direction = index > activeIndex ? Direction.NEXT : Direction.PREV;
            this._slide(direction, this._items[index]);
        }
        dispose() {
            $(this._element).off(EVENT_KEY);
            $.removeData(this._element, DATA_KEY);
            this._items = null;
            this._config = null;
            this._element = null;
            this._interval = null;
            this._isPaused = null;
            this._isSliding = null;
            this._activeElement = null;
            this._indicatorsElement = null;
        }
        _getConfig(config) {
            //config = {
            //    ...Default,
            //    ...config
            //};
            config = langx.mixin({},Default,config);
            Util.typeCheckConfig(NAME, config, DefaultType);
            return config;
        }
        _handleSwipe() {
            const absDeltax = Math.abs(this.touchDeltaX);
            if (absDeltax <= SWIPE_THRESHOLD) {
                return;
            }
            const direction = absDeltax / this.touchDeltaX;
            if (direction > 0) {
                this.prev();
            }
            if (direction < 0) {
                this.next();
            }
        }
        _addEventListeners() {
            if (this._config.keyboard) {
                $(this._element).on(Event.KEYDOWN, event => this._keydown(event));
            }
            if (this._config.pause === 'hover') {
                $(this._element).on(Event.MOUSEENTER, event => this.pause(event)).on(Event.MOUSELEAVE, event => this.cycle(event));
            }
            this._addTouchEventListeners();
        }
        _addTouchEventListeners() {
            if (!this._touchSupported) {
                return;
            }
            const start = event => {
                if (this._pointerEvent && PointerType[event.originalEvent.pointerType.toUpperCase()]) {
                    this.touchStartX = event.originalEvent.clientX;
                } else if (!this._pointerEvent) {
                    this.touchStartX = event.originalEvent.touches[0].clientX;
                }
            };
            const move = event => {
                if (event.originalEvent.touches && event.originalEvent.touches.length > 1) {
                    this.touchDeltaX = 0;
                } else {
                    this.touchDeltaX = event.originalEvent.touches[0].clientX - this.touchStartX;
                }
            };
            const end = event => {
                if (this._pointerEvent && PointerType[event.originalEvent.pointerType.toUpperCase()]) {
                    this.touchDeltaX = event.originalEvent.clientX - this.touchStartX;
                }
                this._handleSwipe();
                if (this._config.pause === 'hover') {
                    this.pause();
                    if (this.touchTimeout) {
                        clearTimeout(this.touchTimeout);
                    }
                    this.touchTimeout = setTimeout(event => this.cycle(event), TOUCHEVENT_COMPAT_WAIT + this._config.interval);
                }
            };
            $(this._element.querySelectorAll(Selector.ITEM_IMG)).on(Event.DRAG_START, e => e.preventDefault());
            if (this._pointerEvent) {
                $(this._element).on(Event.POINTERDOWN, event => start(event));
                $(this._element).on(Event.POINTERUP, event => end(event));
                this._element.classList.add(ClassName.POINTER_EVENT);
            } else {
                $(this._element).on(Event.TOUCHSTART, event => start(event));
                $(this._element).on(Event.TOUCHMOVE, event => move(event));
                $(this._element).on(Event.TOUCHEND, event => end(event));
            }
        }
        _keydown(event) {
            if (/input|textarea/i.test(event.target.tagName)) {
                return;
            }
            switch (event.which) {
            case ARROW_LEFT_KEYCODE:
                event.preventDefault();
                this.prev();
                break;
            case ARROW_RIGHT_KEYCODE:
                event.preventDefault();
                this.next();
                break;
            default:
            }
        }
        _getItemIndex(element) {
            this._items = element && element.parentNode ? [].slice.call(element.parentNode.querySelectorAll(Selector.ITEM)) : [];
            return this._items.indexOf(element);
        }
        _getItemByDirection(direction, activeElement) {
            const isNextDirection = direction === Direction.NEXT;
            const isPrevDirection = direction === Direction.PREV;
            const activeIndex = this._getItemIndex(activeElement);
            const lastItemIndex = this._items.length - 1;
            const isGoingToWrap = isPrevDirection && activeIndex === 0 || isNextDirection && activeIndex === lastItemIndex;
            if (isGoingToWrap && !this._config.wrap) {
                return activeElement;
            }
            const delta = direction === Direction.PREV ? -1 : 1;
            const itemIndex = (activeIndex + delta) % this._items.length;
            return itemIndex === -1 ? this._items[this._items.length - 1] : this._items[itemIndex];
        }
        _triggerSlideEvent(relatedTarget, eventDirectionName) {
            const targetIndex = this._getItemIndex(relatedTarget);
            const fromIndex = this._getItemIndex(this._element.querySelector(Selector.ACTIVE_ITEM));
            const slideEvent = eventer.create(Event.SLIDE, {
                relatedTarget,
                direction: eventDirectionName,
                from: fromIndex,
                to: targetIndex
            });
            $(this._element).trigger(slideEvent);
            return slideEvent;
        }
        _setActiveIndicatorElement(element) {
            if (this._indicatorsElement) {
                const indicators = [].slice.call(this._indicatorsElement.querySelectorAll(Selector.ACTIVE));
                $(indicators).removeClass(ClassName.ACTIVE);
                const nextIndicator = this._indicatorsElement.children[this._getItemIndex(element)];
                if (nextIndicator) {
                    $(nextIndicator).addClass(ClassName.ACTIVE);
                }
            }
        }
        _slide(direction, element) {
            const activeElement = this._element.querySelector(Selector.ACTIVE_ITEM);
            const activeElementIndex = this._getItemIndex(activeElement);
            const nextElement = element || activeElement && this._getItemByDirection(direction, activeElement);
            const nextElementIndex = this._getItemIndex(nextElement);
            const isCycling = Boolean(this._interval);
            let directionalClassName;
            let orderClassName;
            let eventDirectionName;
            if (direction === Direction.NEXT) {
                directionalClassName = ClassName.LEFT;
                orderClassName = ClassName.NEXT;
                eventDirectionName = Direction.LEFT;
            } else {
                directionalClassName = ClassName.RIGHT;
                orderClassName = ClassName.PREV;
                eventDirectionName = Direction.RIGHT;
            }
            if (nextElement && $(nextElement).hasClass(ClassName.ACTIVE)) {
                this._isSliding = false;
                return;
            }
            const slideEvent = this._triggerSlideEvent(nextElement, eventDirectionName);
            if (slideEvent.isDefaultPrevented()) {
                return;
            }
            if (!activeElement || !nextElement) {
                return;
            }
            this._isSliding = true;
            if (isCycling) {
                this.pause();
            }
            this._setActiveIndicatorElement(nextElement);
            const slidEvent = eventer.create(Event.SLID, {
                relatedTarget: nextElement,
                direction: eventDirectionName,
                from: activeElementIndex,
                to: nextElementIndex
            });
            if ($(this._element).hasClass(ClassName.SLIDE)) {
                $(nextElement).addClass(orderClassName);
                Util.reflow(nextElement);
                $(activeElement).addClass(directionalClassName);
                $(nextElement).addClass(directionalClassName);
                const nextElementInterval = parseInt(nextElement.getAttribute('data-interval'), 10);
                if (nextElementInterval) {
                    this._config.defaultInterval = this._config.defaultInterval || this._config.interval;
                    this._config.interval = nextElementInterval;
                } else {
                    this._config.interval = this._config.defaultInterval || this._config.interval;
                }
                const transitionDuration = Util.getTransitionDurationFromElement(activeElement);
                $(activeElement).one(Util.TRANSITION_END, () => {
                    $(nextElement).removeClass(`${ directionalClassName } ${ orderClassName }`).addClass(ClassName.ACTIVE);
                    $(activeElement).removeClass(`${ ClassName.ACTIVE } ${ orderClassName } ${ directionalClassName }`);
                    this._isSliding = false;
                    setTimeout(() => $(this._element).trigger(slidEvent), 0);
                }).emulateTransitionEnd(transitionDuration);
            } else {
                $(activeElement).removeClass(ClassName.ACTIVE);
                $(nextElement).addClass(ClassName.ACTIVE);
                this._isSliding = false;
                $(this._element).trigger(slidEvent);
            }
            if (isCycling) {
                this.cycle();
            }
        }
        static _jqueryInterface(config) {
            return this.each(function () {
                let data = $(this).data(DATA_KEY);
                //let _config = {
                //    ...Default,
                //    ...$(this).data()
                //};
                let _config = langx.mixin({},Default,$(this).data());
                if (typeof config === 'object') {
                    //_config = {
                    //    ..._config,
                    //    ...config
                    //};
                    langx.mixin(_config,config);
                }
                const action = typeof config === 'string' ? config : _config.slide;
                if (!data) {
                    data = new Carousel(this, _config);
                    $(this).data(DATA_KEY, data);
                }
                if (typeof config === 'number') {
                    data.to(config);
                } else if (typeof action === 'string') {
                    if (typeof data[action] === 'undefined') {
                        throw new TypeError(`No method named "${ action }"`);
                    }
                    data[action]();
                } else if (_config.interval) {
                    data.pause();
                    data.cycle();
                }
            });
        }
        static _dataApiClickHandler(event) {
            const selector = Util.getSelectorFromElement(this);
            if (!selector) {
                return;
            }
            const target = $(selector)[0];
            if (!target || !$(target).hasClass(ClassName.CAROUSEL)) {
                return;
            }
            //const config = {
            //    ...$(target).data(),
            //    ...$(this).data()
            //};
            const config = langx.mixin({},$(target).data(),$(this).data());
            const slideIndex = this.getAttribute('data-slide-to');
            if (slideIndex) {
                config.interval = false;
            }
            Carousel._jqueryInterface.call($(target), config);
            if (slideIndex) {
                $(target).data(DATA_KEY).to(slideIndex);
            }
            event.preventDefault();
        }
    }
    $(document).on(Event.CLICK_DATA_API, Selector.DATA_SLIDE, Carousel._dataApiClickHandler);
    $(window).on(Event.LOAD_DATA_API, () => {
        const carousels = [].slice.call(document.querySelectorAll(Selector.DATA_RIDE));
        for (let i = 0, len = carousels.length; i < len; i++) {
            const $carousel = $(carousels[i]);
            Carousel._jqueryInterface.call($carousel, $carousel.data());
        }
    });
    $.fn[NAME] = Carousel._jqueryInterface;
    $.fn[NAME].Constructor = Carousel;
    $.fn[NAME].noConflict = () => {
        $.fn[NAME] = jquery_NO_CONFLICT;
        return Carousel._jqueryInterface;
    };
    return Carousel;
});
define('skylark-bootstrap4/collapse',[
    'skylark-langx/langx',
    'skylark-utils-dom/query',
    'skylark-utils-dom/eventer',
    'skylark-utils-dom/plugins',
    "./bs4",
    './util'
], function (langx,$, eventer, plugins,bs4,Util) {

    'use strict';
    const NAME = 'collapse';
    const VERSION = '4.1.3';
    const DATA_KEY = 'bs.collapse';
    const EVENT_KEY = `.${ DATA_KEY }`;
    const DATA_API_KEY = '.data-api';
    const jquery_NO_CONFLICT = $.fn[NAME];
    const Default = {
        toggle: true,
        parent: ''
    };
    const DefaultType = {
        toggle: 'boolean',
        parent: '(string|element)'
    };
    const Event = {
        SHOW: `show${ EVENT_KEY }`,
        SHOWN: `shown${ EVENT_KEY }`,
        HIDE: `hide${ EVENT_KEY }`,
        HIDDEN: `hidden${ EVENT_KEY }`,
        CLICK_DATA_API: `click${ EVENT_KEY }${ DATA_API_KEY }`
    };
    const ClassName = {
        SHOW: 'show',
        COLLAPSE: 'collapse',
        COLLAPSING: 'collapsing',
        COLLAPSED: 'collapsed'
    };
    const Dimension = {
        WIDTH: 'width',
        HEIGHT: 'height'
    };
    const Selector = {
        ACTIVES: '.show, .collapsing',
        DATA_TOGGLE: '[data-toggle="collapse"]'
    };
    class Collapse {
        constructor(element, config) {
            this._isTransitioning = false;
            this._element = element;
            this._config = this._getConfig(config);
            this._triggerArray = [].slice.call(document.querySelectorAll(`[data-toggle="collapse"][href="#${ element.id }"],` + `[data-toggle="collapse"][data-target="#${ element.id }"]`));
            const toggleList = [].slice.call(document.querySelectorAll(Selector.DATA_TOGGLE));
            for (let i = 0, len = toggleList.length; i < len; i++) {
                const elem = toggleList[i];
                const selector = Util.getSelectorFromElement(elem);
                const filterElement = [].slice.call(document.querySelectorAll(selector)).filter(foundElem => foundElem === element);
                if (selector !== null && filterElement.length > 0) {
                    this._selector = selector;
                    this._triggerArray.push(elem);
                }
            }
            this._parent = this._config.parent ? this._getParent() : null;
            if (!this._config.parent) {
                this._addAriaAndCollapsedClass(this._element, this._triggerArray);
            }
            if (this._config.toggle) {
                this.toggle();
            }
        }
        static get VERSION() {
            return VERSION;
        }
        static get Default() {
            return Default;
        }
        toggle() {
            if ($(this._element).hasClass(ClassName.SHOW)) {
                this.hide();
            } else {
                this.show();
            }
        }
        show() {
            if (this._isTransitioning || $(this._element).hasClass(ClassName.SHOW)) {
                return;
            }
            let actives;
            let activesData;
            if (this._parent) {
                actives = [].slice.call(this._parent.querySelectorAll(Selector.ACTIVES)).filter(elem => {
                    if (typeof this._config.parent === 'string') {
                        return elem.getAttribute('data-parent') === this._config.parent;
                    }
                    return elem.classList.contains(ClassName.COLLAPSE);
                });
                if (actives.length === 0) {
                    actives = null;
                }
            }
            if (actives) {
                activesData = $(actives).not(this._selector).data(DATA_KEY);
                if (activesData && activesData._isTransitioning) {
                    return;
                }
            }
            const startEvent = eventer.create(Event.SHOW);
            $(this._element).trigger(startEvent);
            if (startEvent.isDefaultPrevented()) {
                return;
            }
            if (actives) {
                Collapse._jqueryInterface.call($(actives).not(this._selector), 'hide');
                if (!activesData) {
                    $(actives).data(DATA_KEY, null);
                }
            }
            const dimension = this._getDimension();
            $(this._element).removeClass(ClassName.COLLAPSE).addClass(ClassName.COLLAPSING);
            this._element.style[dimension] = 0;
            if (this._triggerArray.length) {
                $(this._triggerArray).removeClass(ClassName.COLLAPSED).attr('aria-expanded', true);
            }
            this.setTransitioning(true);
            const complete = () => {
                $(this._element).removeClass(ClassName.COLLAPSING).addClass(ClassName.COLLAPSE).addClass(ClassName.SHOW);
                this._element.style[dimension] = '';
                this.setTransitioning(false);
                $(this._element).trigger(Event.SHOWN);
            };
            const capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1);
            const scrollSize = `scroll${ capitalizedDimension }`;
            const transitionDuration = Util.getTransitionDurationFromElement(this._element);
            $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
            this._element.style[dimension] = `${ this._element[scrollSize] }px`;
        }
        hide() {
            if (this._isTransitioning || !$(this._element).hasClass(ClassName.SHOW)) {
                return;
            }
            const startEvent = eventer.create(Event.HIDE);
            $(this._element).trigger(startEvent);
            if (startEvent.isDefaultPrevented()) {
                return;
            }
            const dimension = this._getDimension();
            this._element.style[dimension] = `${ this._element.getBoundingClientRect()[dimension] }px`;
            Util.reflow(this._element);
            $(this._element).addClass(ClassName.COLLAPSING).removeClass(ClassName.COLLAPSE).removeClass(ClassName.SHOW);
            const triggerArrayLength = this._triggerArray.length;
            if (triggerArrayLength > 0) {
                for (let i = 0; i < triggerArrayLength; i++) {
                    const trigger = this._triggerArray[i];
                    const selector = Util.getSelectorFromElement(trigger);
                    if (selector !== null) {
                        const $elem = $([].slice.call(document.querySelectorAll(selector)));
                        if (!$elem.hasClass(ClassName.SHOW)) {
                            $(trigger).addClass(ClassName.COLLAPSED).attr('aria-expanded', false);
                        }
                    }
                }
            }
            this.setTransitioning(true);
            const complete = () => {
                this.setTransitioning(false);
                $(this._element).removeClass(ClassName.COLLAPSING).addClass(ClassName.COLLAPSE).trigger(Event.HIDDEN);
            };
            this._element.style[dimension] = '';
            const transitionDuration = Util.getTransitionDurationFromElement(this._element);
            $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
        }
        setTransitioning(isTransitioning) {
            this._isTransitioning = isTransitioning;
        }
        dispose() {
            $.removeData(this._element, DATA_KEY);
            this._config = null;
            this._parent = null;
            this._element = null;
            this._triggerArray = null;
            this._isTransitioning = null;
        }
        _getConfig(config) {
            //config = {
            //    ...Default,
            //    ...config
            //};
            config = langx.mixin({},Default,config);
            config.toggle = Boolean(config.toggle);
            Util.typeCheckConfig(NAME, config, DefaultType);
            return config;
        }
        _getDimension() {
            const hasWidth = $(this._element).hasClass(Dimension.WIDTH);
            return hasWidth ? Dimension.WIDTH : Dimension.HEIGHT;
        }
        _getParent() {
            let parent;
            if (Util.isElement(this._config.parent)) {
                parent = this._config.parent;
                if (typeof this._config.parent.skylark-utils-dom/query !== 'undefined') {
                    parent = this._config.parent[0];
                }
            } else {
                parent = document.querySelector(this._config.parent);
            }
            const selector = `[data-toggle="collapse"][data-parent="${ this._config.parent }"]`;
            const children = [].slice.call(parent.querySelectorAll(selector));
            $(children).each((i, element) => {
                this._addAriaAndCollapsedClass(Collapse._getTargetFromElement(element), [element]);
            });
            return parent;
        }
        _addAriaAndCollapsedClass(element, triggerArray) {
            const isOpen = $(element).hasClass(ClassName.SHOW);
            if (triggerArray.length) {
                $(triggerArray).toggleClass(ClassName.COLLAPSED, !isOpen).attr('aria-expanded', isOpen);
            }
        }
        static _getTargetFromElement(element) {
            const selector = Util.getSelectorFromElement(element);
            return selector ? document.querySelector(selector) : null;
        }
        static _jqueryInterface(config) {
            return this.each(function () {
                const $this = $(this);
                let data = $this.data(DATA_KEY);
                //const _config = {
                //    ...Default,
                //    ...$this.data(),
                //    ...typeof config === 'object' && config ? config : {}
                //};
                const _config = langx.mixin({},Default,$this.data(),typeof config === 'object' && config ? config : {});

                if (!data && _config.toggle && /show|hide/.test(config)) {
                    _config.toggle = false;
                }
                if (!data) {
                    data = new Collapse(this, _config);
                    $this.data(DATA_KEY, data);
                }
                if (typeof config === 'string') {
                    if (typeof data[config] === 'undefined') {
                        throw new TypeError(`No method named "${ config }"`);
                    }
                    data[config]();
                }
            });
        }
    }
    $(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
        if (event.currentTarget.tagName === 'A') {
            event.preventDefault();
        }
        const $trigger = $(this);
        const selector = Util.getSelectorFromElement(this);
        const selectors = [].slice.call(document.querySelectorAll(selector));
        $(selectors).each(function () {
            const $target = $(this);
            const data = $target.data(DATA_KEY);
            const config = data ? 'toggle' : $trigger.data();
            Collapse._jqueryInterface.call($target, config);
        });
    });
    $.fn[NAME] = Collapse._jqueryInterface;
    $.fn[NAME].Constructor = Collapse;
    $.fn[NAME].noConflict = () => {
        $.fn[NAME] = jquery_NO_CONFLICT;
        return Collapse._jqueryInterface;
    };
    return Collapse;
});
define('skylark-bootstrap4/dropdown',[
    'skylark-langx/langx',
    'skylark-utils-dom/query',
    'skylark-utils-dom/eventer',
    'skylark-utils-dom/plugins',
    "./bs4",
    'skylark-popper/Popper',
    './util'
], function (langx,$, eventer,plugins,bs4,Popper,Util) {
    'use strict';
    const NAME = 'dropdown';
    const VERSION = '4.1.3';
    const DATA_KEY = 'bs.dropdown';
    const EVENT_KEY = `.${ DATA_KEY }`;
    const DATA_API_KEY = '.data-api';
    const jquery_NO_CONFLICT = $.fn[NAME];
    const ESCAPE_KEYCODE = 27;
    const SPACE_KEYCODE = 32;
    const TAB_KEYCODE = 9;
    const ARROW_UP_KEYCODE = 38;
    const ARROW_DOWN_KEYCODE = 40;
    const RIGHT_MOUSE_BUTTON_WHICH = 3;
    const REGEXP_KEYDOWN = new RegExp(`${ ARROW_UP_KEYCODE }|${ ARROW_DOWN_KEYCODE }|${ ESCAPE_KEYCODE }`);
    const Event = {
        HIDE: `hide${ EVENT_KEY }`,
        HIDDEN: `hidden${ EVENT_KEY }`,
        SHOW: `show${ EVENT_KEY }`,
        SHOWN: `shown${ EVENT_KEY }`,
        CLICK: `click${ EVENT_KEY }`,
        CLICK_DATA_API: `click${ EVENT_KEY }${ DATA_API_KEY }`,
        KEYDOWN_DATA_API: `keydown${ EVENT_KEY }${ DATA_API_KEY }`,
        KEYUP_DATA_API: `keyup${ EVENT_KEY }${ DATA_API_KEY }`
    };
    const ClassName = {
        DISABLED: 'disabled',
        SHOW: 'show',
        DROPUP: 'dropup',
        DROPRIGHT: 'dropright',
        DROPLEFT: 'dropleft',
        MENURIGHT: 'dropdown-menu-right',
        MENULEFT: 'dropdown-menu-left',
        POSITION_STATIC: 'position-static'
    };
    const Selector = {
        DATA_TOGGLE: '[data-toggle="dropdown"]',
        FORM_CHILD: '.dropdown form',
        MENU: '.dropdown-menu',
        NAVBAR_NAV: '.navbar-nav',
        VISIBLE_ITEMS: '.dropdown-menu .dropdown-item:not(.disabled):not(:disabled)'
    };
    const AttachmentMap = {
        TOP: 'top-start',
        TOPEND: 'top-end',
        BOTTOM: 'bottom-start',
        BOTTOMEND: 'bottom-end',
        RIGHT: 'right-start',
        RIGHTEND: 'right-end',
        LEFT: 'left-start',
        LEFTEND: 'left-end'
    };
    const Default = {
        offset: 0,
        flip: true,
        boundary: 'scrollParent',
        reference: 'toggle',
        display: 'dynamic'
    };
    const DefaultType = {
        offset: '(number|string|function)',
        flip: 'boolean',
        boundary: '(string|element)',
        reference: '(string|element)',
        display: 'string'
    };
    class Dropdown {
        constructor(element, config) {
            this._element = element;
            this._popper = null;
            this._config = this._getConfig(config);
            this._menu = this._getMenuElement();
            this._inNavbar = this._detectNavbar();
            this._addEventListeners();
        }
        static get VERSION() {
            return VERSION;
        }
        static get Default() {
            return Default;
        }
        static get DefaultType() {
            return DefaultType;
        }
        toggle() {
            if (this._element.disabled || $(this._element).hasClass(ClassName.DISABLED)) {
                return;
            }
            const parent = Dropdown._getParentFromElement(this._element);
            const isActive = $(this._menu).hasClass(ClassName.SHOW);
            Dropdown._clearMenus();
            if (isActive) {
                return;
            }
            const relatedTarget = { relatedTarget: this._element };
            const showEvent = eventer.create(Event.SHOW, relatedTarget);
            $(parent).trigger(showEvent);
            if (showEvent.isDefaultPrevented()) {
                return;
            }
            if (!this._inNavbar) {
                if (typeof Popper === 'undefined') {
                    throw new TypeError("Bootstrap's dropdowns require skylark-popper/Popper (https://skylark-popper/Popper.org/)");
                }
                let referenceElement = this._element;
                if (this._config.reference === 'parent') {
                    referenceElement = parent;
                } else if (Util.isElement(this._config.reference)) {
                    referenceElement = this._config.reference;
                    if (typeof this._config.reference.skylark-utils-dom/query !== 'undefined') {
                        referenceElement = this._config.reference[0];
                    }
                }
                if (this._config.boundary !== 'scrollParent') {
                    $(parent).addClass(ClassName.POSITION_STATIC);
                }
                this._popper = new Popper(referenceElement, this._menu, this._getPopperConfig());
            }
            if ('ontouchstart' in document.documentElement && $(parent).closest(Selector.NAVBAR_NAV).length === 0) {
                $(document.body).children().on('mouseover', null, $.noop);
            }
            this._element.focus();
            this._element.setAttribute('aria-expanded', true);
            $(this._menu).toggleClass(ClassName.SHOW);
            $(parent).toggleClass(ClassName.SHOW).trigger(eventer.create(Event.SHOWN, relatedTarget));
        }
        show() {
            if (this._element.disabled || $(this._element).hasClass(ClassName.DISABLED) || $(this._menu).hasClass(ClassName.SHOW)) {
                return;
            }
            const relatedTarget = { relatedTarget: this._element };
            const showEvent = eventer.create(Event.SHOW, relatedTarget);
            const parent = Dropdown._getParentFromElement(this._element);
            $(parent).trigger(showEvent);
            if (showEvent.isDefaultPrevented()) {
                return;
            }
            $(this._menu).toggleClass(ClassName.SHOW);
            $(parent).toggleClass(ClassName.SHOW).trigger(eventer.create(Event.SHOWN, relatedTarget));
        }
        hide() {
            if (this._element.disabled || $(this._element).hasClass(ClassName.DISABLED) || !$(this._menu).hasClass(ClassName.SHOW)) {
                return;
            }
            const relatedTarget = { relatedTarget: this._element };
            const hideEvent = eventer.create(Event.HIDE, relatedTarget);
            const parent = Dropdown._getParentFromElement(this._element);
            $(parent).trigger(hideEvent);
            if (hideEvent.isDefaultPrevented()) {
                return;
            }
            $(this._menu).toggleClass(ClassName.SHOW);
            $(parent).toggleClass(ClassName.SHOW).trigger(eventer.create(Event.HIDDEN, relatedTarget));
        }
        dispose() {
            $.removeData(this._element, DATA_KEY);
            $(this._element).off(EVENT_KEY);
            this._element = null;
            this._menu = null;
            if (this._popper !== null) {
                this._popper.destroy();
                this._popper = null;
            }
        }
        update() {
            this._inNavbar = this._detectNavbar();
            if (this._popper !== null) {
                this._popper.scheduleUpdate();
            }
        }
        _addEventListeners() {
            $(this._element).on(Event.CLICK, event => {
                event.preventDefault();
                event.stopPropagation();
                this.toggle();
            });
        }
        _getConfig(config) {
            //config = {
            //    ...this.constructor.Default,
            //    ...$(this._element).data(),
            //    ...config
            //};
            config = langx.mixin({},this.constructor.Default,$(this._element).data(),config);
            Util.typeCheckConfig(NAME, config, this.constructor.DefaultType);
            return config;
        }
        _getMenuElement() {
            if (!this._menu) {
                const parent = Dropdown._getParentFromElement(this._element);
                if (parent) {
                    this._menu = parent.querySelector(Selector.MENU);
                }
            }
            return this._menu;
        }
        _getPlacement() {
            const $parentDropdown = $(this._element.parentNode);
            let placement = AttachmentMap.BOTTOM;
            if ($parentDropdown.hasClass(ClassName.DROPUP)) {
                placement = AttachmentMap.TOP;
                if ($(this._menu).hasClass(ClassName.MENURIGHT)) {
                    placement = AttachmentMap.TOPEND;
                }
            } else if ($parentDropdown.hasClass(ClassName.DROPRIGHT)) {
                placement = AttachmentMap.RIGHT;
            } else if ($parentDropdown.hasClass(ClassName.DROPLEFT)) {
                placement = AttachmentMap.LEFT;
            } else if ($(this._menu).hasClass(ClassName.MENURIGHT)) {
                placement = AttachmentMap.BOTTOMEND;
            }
            return placement;
        }
        _detectNavbar() {
            return $(this._element).closest('.navbar').length > 0;
        }
        _getPopperConfig() {
            const offsetConf = {};
            if (typeof this._config.offset === 'function') {
                offsetConf.fn = data => {
                    //data.offsets = {
                    //    ...data.offsets,
                    //    ...this._config.offset(data.offsets) || {}
                    //};
                    langx.mixin(data.offsets,this._config.offset(data.offsets) || {});
                    return data;
                };
            } else {
                offsetConf.offset = this._config.offset;
            }
            const popperConfig = {
                placement: this._getPlacement(),
                modifiers: {
                    offset: offsetConf,
                    flip: { enabled: this._config.flip },
                    preventOverflow: { boundariesElement: this._config.boundary }
                }
            };
            if (this._config.display === 'static') {
                popperConfig.modifiers.applyStyle = { enabled: false };
            }
            return popperConfig;
        }
        static _jqueryInterface(config) {
            return this.each(function () {
                let data = $(this).data(DATA_KEY);
                const _config = typeof config === 'object' ? config : null;
                if (!data) {
                    data = new Dropdown(this, _config);
                    $(this).data(DATA_KEY, data);
                }
                if (typeof config === 'string') {
                    if (typeof data[config] === 'undefined') {
                        throw new TypeError(`No method named "${ config }"`);
                    }
                    data[config]();
                }
            });
        }
        static _clearMenus(event) {
            if (event && (event.which === RIGHT_MOUSE_BUTTON_WHICH || event.type === 'keyup' && event.which !== TAB_KEYCODE)) {
                return;
            }
            const toggles = [].slice.call(document.querySelectorAll(Selector.DATA_TOGGLE));
            for (let i = 0, len = toggles.length; i < len; i++) {
                const parent = Dropdown._getParentFromElement(toggles[i]);
                const context = $(toggles[i]).data(DATA_KEY);
                const relatedTarget = { relatedTarget: toggles[i] };
                if (event && event.type === 'click') {
                    relatedTarget.clickEvent = event;
                }
                if (!context) {
                    continue;
                }
                const dropdownMenu = context._menu;
                if (!$(parent).hasClass(ClassName.SHOW)) {
                    continue;
                }
                if (event && (event.type === 'click' && /input|textarea/i.test(event.target.tagName) || event.type === 'keyup' && event.which === TAB_KEYCODE) && $.contains(parent, event.target)) {
                    continue;
                }
                const hideEvent = eventer.create(Event.HIDE, relatedTarget);
                $(parent).trigger(hideEvent);
                if (hideEvent.isDefaultPrevented()) {
                    continue;
                }
                if ('ontouchstart' in document.documentElement) {
                    $(document.body).children().off('mouseover', null, $.noop);
                }
                toggles[i].setAttribute('aria-expanded', 'false');
                $(dropdownMenu).removeClass(ClassName.SHOW);
                $(parent).removeClass(ClassName.SHOW).trigger(eventer.create(Event.HIDDEN, relatedTarget));
            }
        }
        static _getParentFromElement(element) {
            let parent;
            const selector = Util.getSelectorFromElement(element);
            if (selector) {
                parent = document.querySelector(selector);
            }
            return parent || element.parentNode;
        }
        static _dataApiKeydownHandler(event) {
            if (/input|textarea/i.test(event.target.tagName) ? event.which === SPACE_KEYCODE || event.which !== ESCAPE_KEYCODE && (event.which !== ARROW_DOWN_KEYCODE && event.which !== ARROW_UP_KEYCODE || $(event.target).closest(Selector.MENU).length) : !REGEXP_KEYDOWN.test(event.which)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            if (this.disabled || $(this).hasClass(ClassName.DISABLED)) {
                return;
            }
            const parent = Dropdown._getParentFromElement(this);
            const isActive = $(parent).hasClass(ClassName.SHOW);
            if (!isActive || isActive && (event.which === ESCAPE_KEYCODE || event.which === SPACE_KEYCODE)) {
                if (event.which === ESCAPE_KEYCODE) {
                    const toggle = parent.querySelector(Selector.DATA_TOGGLE);
                    $(toggle).trigger('focus');
                }
                $(this).trigger('click');
                return;
            }
            const items = [].slice.call(parent.querySelectorAll(Selector.VISIBLE_ITEMS));
            if (items.length === 0) {
                return;
            }
            let index = items.indexOf(event.target);
            if (event.which === ARROW_UP_KEYCODE && index > 0) {
                index--;
            }
            if (event.which === ARROW_DOWN_KEYCODE && index < items.length - 1) {
                index++;
            }
            if (index < 0) {
                index = 0;
            }
            items[index].focus();
        }
    }
    $(document).on(Event.KEYDOWN_DATA_API, Selector.DATA_TOGGLE, Dropdown._dataApiKeydownHandler).on(Event.KEYDOWN_DATA_API, Selector.MENU, Dropdown._dataApiKeydownHandler).on(`${ Event.CLICK_DATA_API } ${ Event.KEYUP_DATA_API }`, Dropdown._clearMenus).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
        event.preventDefault();
        event.stopPropagation();
        Dropdown._jqueryInterface.call($(this), 'toggle');
    }).on(Event.CLICK_DATA_API, Selector.FORM_CHILD, e => {
        e.stopPropagation();
    });
    $.fn[NAME] = Dropdown._jqueryInterface;
    $.fn[NAME].Constructor = Dropdown;
    $.fn[NAME].noConflict = () => {
        $.fn[NAME] = jquery_NO_CONFLICT;
        return Dropdown._jqueryInterface;
    };
    return Dropdown;
});
define('skylark-bootstrap4/modal',[
    'skylark-langx/langx',
    'skylark-utils-dom/query',
    'skylark-utils-dom/eventer',
    'skylark-utils-dom/plugins',
    "./bs4",
    './util'
], function (langx,$, eventer,plugins,bs4,Util) {


    'use strict';
    const NAME = 'modal';
    const VERSION = '4.1.3';
    const DATA_KEY = 'bs.modal';
    const EVENT_KEY = `.${ DATA_KEY }`;
    const DATA_API_KEY = '.data-api';
    const jquery_NO_CONFLICT = $.fn[NAME];
    const ESCAPE_KEYCODE = 27;
    const Default = {
        backdrop: true,
        keyboard: true,
        focus: true,
        show: true
    };
    const DefaultType = {
        backdrop: '(boolean|string)',
        keyboard: 'boolean',
        focus: 'boolean',
        show: 'boolean'
    };
    const Event = {
        HIDE: `hide${ EVENT_KEY }`,
        HIDDEN: `hidden${ EVENT_KEY }`,
        SHOW: `show${ EVENT_KEY }`,
        SHOWN: `shown${ EVENT_KEY }`,
        FOCUSIN: `focusin${ EVENT_KEY }`,
        RESIZE: `resize${ EVENT_KEY }`,
        CLICK_DISMISS: `click.dismiss${ EVENT_KEY }`,
        KEYDOWN_DISMISS: `keydown.dismiss${ EVENT_KEY }`,
        MOUSEUP_DISMISS: `mouseup.dismiss${ EVENT_KEY }`,
        MOUSEDOWN_DISMISS: `mousedown.dismiss${ EVENT_KEY }`,
        CLICK_DATA_API: `click${ EVENT_KEY }${ DATA_API_KEY }`
    };
    const ClassName = {
        SCROLLBAR_MEASURER: 'modal-scrollbar-measure',
        BACKDROP: 'modal-backdrop',
        OPEN: 'modal-open',
        FADE: 'fade',
        SHOW: 'show'
    };
    const Selector = {
        DIALOG: '.modal-dialog',
        DATA_TOGGLE: '[data-toggle="modal"]',
        DATA_DISMISS: '[data-dismiss="modal"]',
        FIXED_CONTENT: '.fixed-top, .fixed-bottom, .is-fixed, .sticky-top',
        STICKY_CONTENT: '.sticky-top'
    };
    class Modal {
        constructor(element, config) {
            this._config = this._getConfig(config);
            this._element = element;
            this._dialog = element.querySelector(Selector.DIALOG);
            this._backdrop = null;
            this._isShown = false;
            this._isBodyOverflowing = false;
            this._ignoreBackdropClick = false;
            this._isTransitioning = false;
            this._scrollbarWidth = 0;
        }
        static get VERSION() {
            return VERSION;
        }
        static get Default() {
            return Default;
        }
        toggle(relatedTarget) {
            return this._isShown ? this.hide() : this.show(relatedTarget);
        }
        show(relatedTarget) {
            if (this._isShown || this._isTransitioning) {
                return;
            }
            if ($(this._element).hasClass(ClassName.FADE)) {
                this._isTransitioning = true;
            }
            const showEvent = eventer.create(Event.SHOW, { relatedTarget });
            $(this._element).trigger(showEvent);
            if (this._isShown || showEvent.isDefaultPrevented()) {
                return;
            }
            this._isShown = true;
            this._checkScrollbar();
            this._setScrollbar();
            this._adjustDialog();
            this._setEscapeEvent();
            this._setResizeEvent();
            $(this._element).on(Event.CLICK_DISMISS, Selector.DATA_DISMISS, event => this.hide(event));
            $(this._dialog).on(Event.MOUSEDOWN_DISMISS, () => {
                $(this._element).one(Event.MOUSEUP_DISMISS, event => {
                    if ($(event.target).is(this._element)) {
                        this._ignoreBackdropClick = true;
                    }
                });
            });
            this._showBackdrop(() => this._showElement(relatedTarget));
        }
        hide(event) {
            if (event) {
                event.preventDefault();
            }
            if (!this._isShown || this._isTransitioning) {
                return;
            }
            const hideEvent = eventer.create(Event.HIDE);
            $(this._element).trigger(hideEvent);
            if (!this._isShown || hideEvent.isDefaultPrevented()) {
                return;
            }
            this._isShown = false;
            const transition = $(this._element).hasClass(ClassName.FADE);
            if (transition) {
                this._isTransitioning = true;
            }
            this._setEscapeEvent();
            this._setResizeEvent();
            $(document).off(Event.FOCUSIN);
            $(this._element).removeClass(ClassName.SHOW);
            $(this._element).off(Event.CLICK_DISMISS);
            $(this._dialog).off(Event.MOUSEDOWN_DISMISS);
            if (transition) {
                const transitionDuration = Util.getTransitionDurationFromElement(this._element);
                $(this._element).one(Util.TRANSITION_END, event => this._hideModal(event)).emulateTransitionEnd(transitionDuration);
            } else {
                this._hideModal();
            }
        }
        dispose() {
            [
                window,
                this._element,
                this._dialog
            ].forEach(htmlElement => $(htmlElement).off(EVENT_KEY));
            $(document).off(Event.FOCUSIN);
            $.removeData(this._element, DATA_KEY);
            this._config = null;
            this._element = null;
            this._dialog = null;
            this._backdrop = null;
            this._isShown = null;
            this._isBodyOverflowing = null;
            this._ignoreBackdropClick = null;
            this._isTransitioning = null;
            this._scrollbarWidth = null;
        }
        handleUpdate() {
            this._adjustDialog();
        }
        _getConfig(config) {
            //config = {
            //    ...Default,
            //    ...config
            //};
            config = langx.mixin({},Default,config);

            Util.typeCheckConfig(NAME, config, DefaultType);
            return config;
        }
        _showElement(relatedTarget) {
            const transition = $(this._element).hasClass(ClassName.FADE);
            if (!this._element.parentNode || this._element.parentNode.nodeType !== Node.ELEMENT_NODE) {
                document.body.appendChild(this._element);
            }
            this._element.style.display = 'block';
            this._element.removeAttribute('aria-hidden');
            this._element.setAttribute('aria-modal', true);
            this._element.scrollTop = 0;
            if (transition) {
                Util.reflow(this._element);
            }
            $(this._element).addClass(ClassName.SHOW);
            if (this._config.focus) {
                this._enforceFocus();
            }
            const shownEvent = eventer.create(Event.SHOWN, { relatedTarget });
            const transitionComplete = () => {
                if (this._config.focus) {
                    this._element.focus();
                }
                this._isTransitioning = false;
                $(this._element).trigger(shownEvent);
            };
            if (transition) {
                const transitionDuration = Util.getTransitionDurationFromElement(this._dialog);
                $(this._dialog).one(Util.TRANSITION_END, transitionComplete).emulateTransitionEnd(transitionDuration);
            } else {
                transitionComplete();
            }
        }
        _enforceFocus() {
            $(document).off(Event.FOCUSIN).on(Event.FOCUSIN, event => {
                if (document !== event.target && this._element !== event.target && $(this._element).has(event.target).length === 0) {
                    this._element.focus();
                }
            });
        }
        _setEscapeEvent() {
            if (this._isShown && this._config.keyboard) {
                $(this._element).on(Event.KEYDOWN_DISMISS, event => {
                    if (event.which === ESCAPE_KEYCODE) {
                        event.preventDefault();
                        this.hide();
                    }
                });
            } else if (!this._isShown) {
                $(this._element).off(Event.KEYDOWN_DISMISS);
            }
        }
        _setResizeEvent() {
            if (this._isShown) {
                $(window).on(Event.RESIZE, event => this.handleUpdate(event));
            } else {
                $(window).off(Event.RESIZE);
            }
        }
        _hideModal() {
            this._element.style.display = 'none';
            this._element.setAttribute('aria-hidden', true);
            this._element.removeAttribute('aria-modal');
            this._isTransitioning = false;
            this._showBackdrop(() => {
                $(document.body).removeClass(ClassName.OPEN);
                this._resetAdjustments();
                this._resetScrollbar();
                $(this._element).trigger(Event.HIDDEN);
            });
        }
        _removeBackdrop() {
            if (this._backdrop) {
                $(this._backdrop).remove();
                this._backdrop = null;
            }
        }
        _showBackdrop(callback) {
            const animate = $(this._element).hasClass(ClassName.FADE) ? ClassName.FADE : '';
            if (this._isShown && this._config.backdrop) {
                this._backdrop = document.createElement('div');
                this._backdrop.className = ClassName.BACKDROP;
                if (animate) {
                    this._backdrop.classList.add(animate);
                }
                $(this._backdrop).appendTo(document.body);
                $(this._element).on(Event.CLICK_DISMISS, event => {
                    if (this._ignoreBackdropClick) {
                        this._ignoreBackdropClick = false;
                        return;
                    }
                    if (event.target !== event.currentTarget) {
                        return;
                    }
                    if (this._config.backdrop === 'static') {
                        this._element.focus();
                    } else {
                        this.hide();
                    }
                });
                if (animate) {
                    Util.reflow(this._backdrop);
                }
                $(this._backdrop).addClass(ClassName.SHOW);
                if (!callback) {
                    return;
                }
                if (!animate) {
                    callback();
                    return;
                }
                const backdropTransitionDuration = Util.getTransitionDurationFromElement(this._backdrop);
                $(this._backdrop).one(Util.TRANSITION_END, callback).emulateTransitionEnd(backdropTransitionDuration);
            } else if (!this._isShown && this._backdrop) {
                $(this._backdrop).removeClass(ClassName.SHOW);
                const callbackRemove = () => {
                    this._removeBackdrop();
                    if (callback) {
                        callback();
                    }
                };
                if ($(this._element).hasClass(ClassName.FADE)) {
                    const backdropTransitionDuration = Util.getTransitionDurationFromElement(this._backdrop);
                    $(this._backdrop).one(Util.TRANSITION_END, callbackRemove).emulateTransitionEnd(backdropTransitionDuration);
                } else {
                    callbackRemove();
                }
            } else if (callback) {
                callback();
            }
        }
        _adjustDialog() {
            const isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;
            if (!this._isBodyOverflowing && isModalOverflowing) {
                this._element.style.paddingLeft = `${ this._scrollbarWidth }px`;
            }
            if (this._isBodyOverflowing && !isModalOverflowing) {
                this._element.style.paddingRight = `${ this._scrollbarWidth }px`;
            }
        }
        _resetAdjustments() {
            this._element.style.paddingLeft = '';
            this._element.style.paddingRight = '';
        }
        _checkScrollbar() {
            const rect = document.body.getBoundingClientRect();
            this._isBodyOverflowing = rect.left + rect.right < window.innerWidth;
            this._scrollbarWidth = this._getScrollbarWidth();
        }
        _setScrollbar() {
            if (this._isBodyOverflowing) {
                const fixedContent = [].slice.call(document.querySelectorAll(Selector.FIXED_CONTENT));
                const stickyContent = [].slice.call(document.querySelectorAll(Selector.STICKY_CONTENT));
                $(fixedContent).each((index, element) => {
                    const actualPadding = element.style.paddingRight;
                    const calculatedPadding = $(element).css('padding-right');
                    $(element).data('padding-right', actualPadding).css('padding-right', `${ parseFloat(calculatedPadding) + this._scrollbarWidth }px`);
                });
                $(stickyContent).each((index, element) => {
                    const actualMargin = element.style.marginRight;
                    const calculatedMargin = $(element).css('margin-right');
                    $(element).data('margin-right', actualMargin).css('margin-right', `${ parseFloat(calculatedMargin) - this._scrollbarWidth }px`);
                });
                const actualPadding = document.body.style.paddingRight;
                const calculatedPadding = $(document.body).css('padding-right');
                $(document.body).data('padding-right', actualPadding).css('padding-right', `${ parseFloat(calculatedPadding) + this._scrollbarWidth }px`);
            }
            $(document.body).addClass(ClassName.OPEN);
        }
        _resetScrollbar() {
            const fixedContent = [].slice.call(document.querySelectorAll(Selector.FIXED_CONTENT));
            $(fixedContent).each((index, element) => {
                const padding = $(element).data('padding-right');
                $(element).removeData('padding-right');
                element.style.paddingRight = padding ? padding : '';
            });
            const elements = [].slice.call(document.querySelectorAll(`${ Selector.STICKY_CONTENT }`));
            $(elements).each((index, element) => {
                const margin = $(element).data('margin-right');
                if (typeof margin !== 'undefined') {
                    $(element).css('margin-right', margin).removeData('margin-right');
                }
            });
            const padding = $(document.body).data('padding-right');
            $(document.body).removeData('padding-right');
            document.body.style.paddingRight = padding ? padding : '';
        }
        _getScrollbarWidth() {
            const scrollDiv = document.createElement('div');
            scrollDiv.className = ClassName.SCROLLBAR_MEASURER;
            document.body.appendChild(scrollDiv);
            const scrollbarWidth = scrollDiv.getBoundingClientRect().width - scrollDiv.clientWidth;
            document.body.removeChild(scrollDiv);
            return scrollbarWidth;
        }
        static _jqueryInterface(config, relatedTarget) {
            return this.each(function () {
                let data = $(this).data(DATA_KEY);
                //const _config = {
                //    ...Default,
                //    ...$this.data(),
                //    ...typeof config === 'object' && config ? config : {}
                //};
                const _config = langx.mixin({},Default,$this.data(),typeof config === 'object' && config ? config : {});
                if (!data) {
                    data = new Modal(this, _config);
                    $(this).data(DATA_KEY, data);
                }
                if (typeof config === 'string') {
                    if (typeof data[config] === 'undefined') {
                        throw new TypeError(`No method named "${ config }"`);
                    }
                    data[config](relatedTarget);
                } else if (_config.show) {
                    data.show(relatedTarget);
                }
            });
        }
    }
    $(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
        let target;
        const selector = Util.getSelectorFromElement(this);
        if (selector) {
            target = document.querySelector(selector);
        }
        //const config = $(target).data(DATA_KEY) ? 'toggle' : {
        //    ...$(target).data(),
        //    ...$(this).data()
        //};
        const config = $(target).data(DATA_KEY) ? 'toggle' : langx.mixin({},$(target).data(),$(this).data());
        if (this.tagName === 'A' || this.tagName === 'AREA') {
            event.preventDefault();
        }
        const $target = $(target).one(Event.SHOW, showEvent => {
            if (showEvent.isDefaultPrevented()) {
                return;
            }
            $target.one(Event.HIDDEN, () => {
                if ($(this).is(':visible')) {
                    this.focus();
                }
            });
        });
        Modal._jqueryInterface.call($(target), config, this);
    });
    $.fn[NAME] = Modal._jqueryInterface;
    $.fn[NAME].Constructor = Modal;
    $.fn[NAME].noConflict = () => {
        $.fn[NAME] = jquery_NO_CONFLICT;
        return Modal._jqueryInterface;
    };
    return Modal;
});
define('skylark-bootstrap4/tooltip',[
    'skylark-langx/langx',
    'skylark-utils-dom/query',
    'skylark-utils-dom/eventer',
    'skylark-utils-dom/plugins',
    "./bs4",
    'skylark-popper/Popper',
    './util'
], function (langx,$, eventer,plugins,bs4,Popper,Util) {
    'use strict';
    const NAME = 'tooltip';
    const VERSION = '4.1.3';
    const DATA_KEY = 'bs.tooltip';
    const EVENT_KEY = `.${ DATA_KEY }`;
    const jquery_NO_CONFLICT = $.fn[NAME];
    const CLASS_PREFIX = 'bs-tooltip';
    const BSCLS_PREFIX_REGEX = new RegExp(`(^|\\s)${ CLASS_PREFIX }\\S+`, 'g');
    const DefaultType = {
        animation: 'boolean',
        template: 'string',
        title: '(string|element|function)',
        trigger: 'string',
        delay: '(number|object)',
        html: 'boolean',
        selector: '(string|boolean)',
        placement: '(string|function)',
        offset: '(number|string)',
        container: '(string|element|boolean)',
        fallbackPlacement: '(string|array)',
        boundary: '(string|element)'
    };
    const AttachmentMap = {
        AUTO: 'auto',
        TOP: 'top',
        RIGHT: 'right',
        BOTTOM: 'bottom',
        LEFT: 'left'
    };
    const Default = {
        animation: true,
        template: '<div class="tooltip" role="tooltip">' + '<div class="arrow"></div>' + '<div class="tooltip-inner"></div></div>',
        trigger: 'hover focus',
        title: '',
        delay: 0,
        html: false,
        selector: false,
        placement: 'top',
        offset: 0,
        container: false,
        fallbackPlacement: 'flip',
        boundary: 'scrollParent'
    };
    const HoverState = {
        SHOW: 'show',
        OUT: 'out'
    };
    const Event = {
        HIDE: `hide${ EVENT_KEY }`,
        HIDDEN: `hidden${ EVENT_KEY }`,
        SHOW: `show${ EVENT_KEY }`,
        SHOWN: `shown${ EVENT_KEY }`,
        INSERTED: `inserted${ EVENT_KEY }`,
        CLICK: `click${ EVENT_KEY }`,
        FOCUSIN: `focusin${ EVENT_KEY }`,
        FOCUSOUT: `focusout${ EVENT_KEY }`,
        MOUSEENTER: `mouseenter${ EVENT_KEY }`,
        MOUSELEAVE: `mouseleave${ EVENT_KEY }`
    };
    const ClassName = {
        FADE: 'fade',
        SHOW: 'show'
    };
    const Selector = {
        TOOLTIP: '.tooltip',
        TOOLTIP_INNER: '.tooltip-inner',
        ARROW: '.arrow'
    };
    const Trigger = {
        HOVER: 'hover',
        FOCUS: 'focus',
        CLICK: 'click',
        MANUAL: 'manual'
    };
    class Tooltip {
        constructor(element, config) {
            if (typeof Popper === 'undefined') {
                throw new TypeError("Bootstrap's tooltips require skylark-popper/Popper (https://skylark-popper/Popper.org/)");
            }
            this._isEnabled = true;
            this._timeout = 0;
            this._hoverState = '';
            this._activeTrigger = {};
            this._popper = null;
            this.element = element;
            this.config = this._getConfig(config);
            this.tip = null;
            this._setListeners();
        }
        static get VERSION() {
            return VERSION;
        }
        static get Default() {
            return Default;
        }
        static get NAME() {
            return NAME;
        }
        static get DATA_KEY() {
            return DATA_KEY;
        }
        static get Event() {
            return Event;
        }
        static get EVENT_KEY() {
            return EVENT_KEY;
        }
        static get DefaultType() {
            return DefaultType;
        }
        enable() {
            this._isEnabled = true;
        }
        disable() {
            this._isEnabled = false;
        }
        toggleEnabled() {
            this._isEnabled = !this._isEnabled;
        }
        toggle(event) {
            if (!this._isEnabled) {
                return;
            }
            if (event) {
                const dataKey = this.constructor.DATA_KEY;
                let context = $(event.currentTarget).data(dataKey);
                if (!context) {
                    context = new this.constructor(event.currentTarget, this._getDelegateConfig());
                    $(event.currentTarget).data(dataKey, context);
                }
                context._activeTrigger.click = !context._activeTrigger.click;
                if (context._isWithActiveTrigger()) {
                    context._enter(null, context);
                } else {
                    context._leave(null, context);
                }
            } else {
                if ($(this.getTipElement()).hasClass(ClassName.SHOW)) {
                    this._leave(null, this);
                    return;
                }
                this._enter(null, this);
            }
        }
        dispose() {
            clearTimeout(this._timeout);
            $.removeData(this.element, this.constructor.DATA_KEY);
            $(this.element).off(this.constructor.EVENT_KEY);
            $(this.element).closest('.modal').off('hide.bs.modal');
            if (this.tip) {
                $(this.tip).remove();
            }
            this._isEnabled = null;
            this._timeout = null;
            this._hoverState = null;
            this._activeTrigger = null;
            if (this._popper !== null) {
                this._popper.destroy();
            }
            this._popper = null;
            this.element = null;
            this.config = null;
            this.tip = null;
        }
        show() {
            if ($(this.element).css('display') === 'none') {
                throw new Error('Please use show on visible elements');
            }
            const showEvent = eventer.create(this.constructor.Event.SHOW);
            if (this.isWithContent() && this._isEnabled) {
                $(this.element).trigger(showEvent);
                const shadowRoot = Util.findShadowRoot(this.element);
                const isInTheDom = $.contains(shadowRoot !== null ? shadowRoot : this.element.ownerDocument.documentElement, this.element);
                if (showEvent.isDefaultPrevented() || !isInTheDom) {
                    return;
                }
                const tip = this.getTipElement();
                const tipId = Util.getUID(this.constructor.NAME);
                tip.setAttribute('id', tipId);
                this.element.setAttribute('aria-describedby', tipId);
                this.setContent();
                if (this.config.animation) {
                    $(tip).addClass(ClassName.FADE);
                }
                const placement = typeof this.config.placement === 'function' ? this.config.placement.call(this, tip, this.element) : this.config.placement;
                const attachment = this._getAttachment(placement);
                this.addAttachmentClass(attachment);
                const container = this._getContainer();
                $(tip).data(this.constructor.DATA_KEY, this);
                if (!$.contains(this.element.ownerDocument.documentElement, this.tip)) {
                    $(tip).appendTo(container);
                }
                $(this.element).trigger(this.constructor.Event.INSERTED);
                this._popper = new Popper(this.element, tip, {
                    placement: attachment,
                    modifiers: {
                        offset: { offset: this.config.offset },
                        flip: { behavior: this.config.fallbackPlacement },
                        arrow: { element: Selector.ARROW },
                        preventOverflow: { boundariesElement: this.config.boundary }
                    },
                    onCreate: data => {
                        if (data.originalPlacement !== data.placement) {
                            this._handlePopperPlacementChange(data);
                        }
                    },
                    onUpdate: data => this._handlePopperPlacementChange(data)
                });
                $(tip).addClass(ClassName.SHOW);
                if ('ontouchstart' in document.documentElement) {
                    $(document.body).children().on('mouseover', null, $.noop);
                }
                const complete = () => {
                    if (this.config.animation) {
                        this._fixTransition();
                    }
                    const prevHoverState = this._hoverState;
                    this._hoverState = null;
                    $(this.element).trigger(this.constructor.Event.SHOWN);
                    if (prevHoverState === HoverState.OUT) {
                        this._leave(null, this);
                    }
                };
                if ($(this.tip).hasClass(ClassName.FADE)) {
                    const transitionDuration = Util.getTransitionDurationFromElement(this.tip);
                    $(this.tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
                } else {
                    complete();
                }
            }
        }
        hide(callback) {
            const tip = this.getTipElement();
            const hideEvent = eventer.create(this.constructor.Event.HIDE);
            const complete = () => {
                if (this._hoverState !== HoverState.SHOW && tip.parentNode) {
                    tip.parentNode.removeChild(tip);
                }
                this._cleanTipClass();
                this.element.removeAttribute('aria-describedby');
                $(this.element).trigger(this.constructor.Event.HIDDEN);
                if (this._popper !== null) {
                    this._popper.destroy();
                }
                if (callback) {
                    callback();
                }
            };
            $(this.element).trigger(hideEvent);
            if (hideEvent.isDefaultPrevented()) {
                return;
            }
            $(tip).removeClass(ClassName.SHOW);
            if ('ontouchstart' in document.documentElement) {
                $(document.body).children().off('mouseover', null, $.noop);
            }
            this._activeTrigger[Trigger.CLICK] = false;
            this._activeTrigger[Trigger.FOCUS] = false;
            this._activeTrigger[Trigger.HOVER] = false;
            if ($(this.tip).hasClass(ClassName.FADE)) {
                const transitionDuration = Util.getTransitionDurationFromElement(tip);
                $(tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
            } else {
                complete();
            }
            this._hoverState = '';
        }
        update() {
            if (this._popper !== null) {
                this._popper.scheduleUpdate();
            }
        }
        isWithContent() {
            return Boolean(this.getTitle());
        }
        addAttachmentClass(attachment) {
            $(this.getTipElement()).addClass(`${ CLASS_PREFIX }-${ attachment }`);
        }
        getTipElement() {
            this.tip = this.tip || $(this.config.template)[0];
            return this.tip;
        }
        setContent() {
            const tip = this.getTipElement();
            this.setElementContent($(tip.querySelectorAll(Selector.TOOLTIP_INNER)), this.getTitle());
            $(tip).removeClass(`${ ClassName.FADE } ${ ClassName.SHOW }`);
        }
        setElementContent($element, content) {
            const html = this.config.html;
            if (typeof content === 'object' && (content.nodeType || content.skylark-utils-dom/query)) {
                if (html) {
                    if (!$(content).parent().is($element)) {
                        $element.empty().append(content);
                    }
                } else {
                    $element.text($(content).text());
                }
            } else {
                $element[html ? 'html' : 'text'](content);
            }
        }
        getTitle() {
            let title = this.element.getAttribute('data-original-title');
            if (!title) {
                title = typeof this.config.title === 'function' ? this.config.title.call(this.element) : this.config.title;
            }
            return title;
        }
        _getContainer() {
            if (this.config.container === false) {
                return document.body;
            }
            if (Util.isElement(this.config.container)) {
                return $(this.config.container);
            }
            return $(document).find(this.config.container);
        }
        _getAttachment(placement) {
            return AttachmentMap[placement.toUpperCase()];
        }
        _setListeners() {
            const triggers = this.config.trigger.split(' ');
            triggers.forEach(trigger => {
                if (trigger === 'click') {
                    $(this.element).on(this.constructor.Event.CLICK, this.config.selector, event => this.toggle(event));
                } else if (trigger !== Trigger.MANUAL) {
                    const eventIn = trigger === Trigger.HOVER ? this.constructor.Event.MOUSEENTER : this.constructor.Event.FOCUSIN;
                    const eventOut = trigger === Trigger.HOVER ? this.constructor.Event.MOUSELEAVE : this.constructor.Event.FOCUSOUT;
                    $(this.element).on(eventIn, this.config.selector, event => this._enter(event)).on(eventOut, this.config.selector, event => this._leave(event));
                }
            });
            $(this.element).closest('.modal').on('hide.bs.modal', () => {
                if (this.element) {
                    this.hide();
                }
            });
            if (this.config.selector) {
                //this.config = {
                //    ...this.config,
                //    trigger: 'manual',
                //    selector: ''
                //};
                langx.mixin(this.config,{
                    trigger: 'manual',
                    selector: ''
                });
            } else {
                this._fixTitle();
            }
        }
        _fixTitle() {
            const titleType = typeof this.element.getAttribute('data-original-title');
            if (this.element.getAttribute('title') || titleType !== 'string') {
                this.element.setAttribute('data-original-title', this.element.getAttribute('title') || '');
                this.element.setAttribute('title', '');
            }
        }
        _enter(event, context) {
            const dataKey = this.constructor.DATA_KEY;
            context = context || $(event.currentTarget).data(dataKey);
            if (!context) {
                context = new this.constructor(event.currentTarget, this._getDelegateConfig());
                $(event.currentTarget).data(dataKey, context);
            }
            if (event) {
                context._activeTrigger[event.type === 'focusin' ? Trigger.FOCUS : Trigger.HOVER] = true;
            }
            if ($(context.getTipElement()).hasClass(ClassName.SHOW) || context._hoverState === HoverState.SHOW) {
                context._hoverState = HoverState.SHOW;
                return;
            }
            clearTimeout(context._timeout);
            context._hoverState = HoverState.SHOW;
            if (!context.config.delay || !context.config.delay.show) {
                context.show();
                return;
            }
            context._timeout = setTimeout(() => {
                if (context._hoverState === HoverState.SHOW) {
                    context.show();
                }
            }, context.config.delay.show);
        }
        _leave(event, context) {
            const dataKey = this.constructor.DATA_KEY;
            context = context || $(event.currentTarget).data(dataKey);
            if (!context) {
                context = new this.constructor(event.currentTarget, this._getDelegateConfig());
                $(event.currentTarget).data(dataKey, context);
            }
            if (event) {
                context._activeTrigger[event.type === 'focusout' ? Trigger.FOCUS : Trigger.HOVER] = false;
            }
            if (context._isWithActiveTrigger()) {
                return;
            }
            clearTimeout(context._timeout);
            context._hoverState = HoverState.OUT;
            if (!context.config.delay || !context.config.delay.hide) {
                context.hide();
                return;
            }
            context._timeout = setTimeout(() => {
                if (context._hoverState === HoverState.OUT) {
                    context.hide();
                }
            }, context.config.delay.hide);
        }
        _isWithActiveTrigger() {
            for (const trigger in this._activeTrigger) {
                if (this._activeTrigger[trigger]) {
                    return true;
                }
            }
            return false;
        }
        _getConfig(config) {
            //config = {
            //    ...this.constructor.Default,
            //    ...$(this.element).data(),
            //    ...typeof config === 'object' && config ? config : {}
            //};
            config = langx.mixin({},this.constructor.Default,$(this.element).data(),config);
            if (typeof config.delay === 'number') {
                config.delay = {
                    show: config.delay,
                    hide: config.delay
                };
            }
            if (typeof config.title === 'number') {
                config.title = config.title.toString();
            }
            if (typeof config.content === 'number') {
                config.content = config.content.toString();
            }
            Util.typeCheckConfig(NAME, config, this.constructor.DefaultType);
            return config;
        }
        _getDelegateConfig() {
            const config = {};
            if (this.config) {
                for (const key in this.config) {
                    if (this.constructor.Default[key] !== this.config[key]) {
                        config[key] = this.config[key];
                    }
                }
            }
            return config;
        }
        _cleanTipClass() {
            const $tip = $(this.getTipElement());
            const tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX);
            if (tabClass !== null && tabClass.length) {
                $tip.removeClass(tabClass.join(''));
            }
        }
        _handlePopperPlacementChange(popperData) {
            const popperInstance = popperData.instance;
            this.tip = popperInstance.popper;
            this._cleanTipClass();
            this.addAttachmentClass(this._getAttachment(popperData.placement));
        }
        _fixTransition() {
            const tip = this.getTipElement();
            const initConfigAnimation = this.config.animation;
            if (tip.getAttribute('x-placement') !== null) {
                return;
            }
            $(tip).removeClass(ClassName.FADE);
            this.config.animation = false;
            this.hide();
            this.show();
            this.config.animation = initConfigAnimation;
        }
        static _jqueryInterface(config) {
            return this.each(function () {
                let data = $(this).data(DATA_KEY);
                const _config = typeof config === 'object' && config;
                if (!data && /dispose|hide/.test(config)) {
                    return;
                }
                if (!data) {
                    data = new Tooltip(this, _config);
                    $(this).data(DATA_KEY, data);
                }
                if (typeof config === 'string') {
                    if (typeof data[config] === 'undefined') {
                        throw new TypeError(`No method named "${ config }"`);
                    }
                    data[config]();
                }
            });
        }
    }
    $.fn[NAME] = Tooltip._jqueryInterface;
    $.fn[NAME].Constructor = Tooltip;
    $.fn[NAME].noConflict = () => {
        $.fn[NAME] = jquery_NO_CONFLICT;
        return Tooltip._jqueryInterface;
    };
    return Tooltip;
});
define('skylark-bootstrap4/popover',[
    'skylark-utils-dom/langx',
    'skylark-utils-dom/query',
    'skylark-utils-dom/plugins',
    "./bs4",
    './tooltip'
], function (langx,$, plugins,bs4,Tooltip) {
    
    'use strict';
    const NAME = 'popover';
    const VERSION = '4.1.3';
    const DATA_KEY = 'bs.popover';
    const EVENT_KEY = `.${ DATA_KEY }`;
    const jquery_NO_CONFLICT = $.fn[NAME];
    const CLASS_PREFIX = 'bs-popover';
    const BSCLS_PREFIX_REGEX = new RegExp(`(^|\\s)${ CLASS_PREFIX }\\S+`, 'g');
    //const Default = {
    //    ...Tooltip.Default,
    //    placement: 'right',
    //    trigger: 'click',
    //    content: '',
    //    template: '<div class="popover" role="tooltip">' + '<div class="arrow"></div>' + '<h3 class="popover-header"></h3>' + '<div class="popover-body"></div></div>'
    //};
    //const DefaultType = {
    //    ...Tooltip.DefaultType,
    //    content: '(string|element|function)'
    //};
    const Default = langx.mixin(
        {},
        Tooltip.Default,
        {
            placement: 'right',
            trigger: 'click',
            content: '',
            template: '<div class="popover" role="tooltip">' + '<div class="arrow"></div>' + '<h3 class="popover-header"></h3>' + '<div class="popover-body"></div></div>'
        }
    );
    const DefaultType = langx.mixin(
        {},  
        Tooltip.DefaultType,
        {
            content: '(string|element|function)'
        }
    );
    const ClassName = {
        FADE: 'fade',
        SHOW: 'show'
    };
    const Selector = {
        TITLE: '.popover-header',
        CONTENT: '.popover-body'
    };
    const Event = {
        HIDE: `hide${ EVENT_KEY }`,
        HIDDEN: `hidden${ EVENT_KEY }`,
        SHOW: `show${ EVENT_KEY }`,
        SHOWN: `shown${ EVENT_KEY }`,
        INSERTED: `inserted${ EVENT_KEY }`,
        CLICK: `click${ EVENT_KEY }`,
        FOCUSIN: `focusin${ EVENT_KEY }`,
        FOCUSOUT: `focusout${ EVENT_KEY }`,
        MOUSEENTER: `mouseenter${ EVENT_KEY }`,
        MOUSELEAVE: `mouseleave${ EVENT_KEY }`
    };
    class Popover extends Tooltip {
        static get VERSION() {
            return VERSION;
        }
        static get Default() {
            return Default;
        }
        static get NAME() {
            return NAME;
        }
        static get DATA_KEY() {
            return DATA_KEY;
        }
        static get Event() {
            return Event;
        }
        static get EVENT_KEY() {
            return EVENT_KEY;
        }
        static get DefaultType() {
            return DefaultType;
        }
        isWithContent() {
            return this.getTitle() || this._getContent();
        }
        addAttachmentClass(attachment) {
            $(this.getTipElement()).addClass(`${ CLASS_PREFIX }-${ attachment }`);
        }
        getTipElement() {
            this.tip = this.tip || $(this.config.template)[0];
            return this.tip;
        }
        setContent() {
            const $tip = $(this.getTipElement());
            this.setElementContent($tip.find(Selector.TITLE), this.getTitle());
            let content = this._getContent();
            if (typeof content === 'function') {
                content = content.call(this.element);
            }
            this.setElementContent($tip.find(Selector.CONTENT), content);
            $tip.removeClass(`${ ClassName.FADE } ${ ClassName.SHOW }`);
        }
        _getContent() {
            return this.element.getAttribute('data-content') || this.config.content;
        }
        _cleanTipClass() {
            const $tip = $(this.getTipElement());
            const tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX);
            if (tabClass !== null && tabClass.length > 0) {
                $tip.removeClass(tabClass.join(''));
            }
        }
        static _jqueryInterface(config) {
            return this.each(function () {
                let data = $(this).data(DATA_KEY);
                const _config = typeof config === 'object' ? config : null;
                if (!data && /dispose|hide/.test(config)) {
                    return;
                }
                if (!data) {
                    data = new Popover(this, _config);
                    $(this).data(DATA_KEY, data);
                }
                if (typeof config === 'string') {
                    if (typeof data[config] === 'undefined') {
                        throw new TypeError(`No method named "${ config }"`);
                    }
                    data[config]();
                }
            });
        }
    }
    $.fn[NAME] = Popover._jqueryInterface;
    $.fn[NAME].Constructor = Popover;
    $.fn[NAME].noConflict = () => {
        $.fn[NAME] = jquery_NO_CONFLICT;
        return Popover._jqueryInterface;
    };
    return Popover;
});
define('skylark-bootstrap4/scrollspy',[
    'skylark-utils-dom/query',
    'skylark-utils-dom/plugins',
    "./bs4",
    './util'
], function ($, plugins,bs4,Util) {

    'use strict';
    const NAME = 'scrollspy';
    const VERSION = '4.1.3';
    const DATA_KEY = 'bs.scrollspy';
    const EVENT_KEY = `.${ DATA_KEY }`;
    const DATA_API_KEY = '.data-api';
    const jquery_NO_CONFLICT = $.fn[NAME];
    const Default = {
        offset: 10,
        method: 'auto',
        target: ''
    };
    const DefaultType = {
        offset: 'number',
        method: 'string',
        target: '(string|element)'
    };
    const Event = {
        ACTIVATE: `activate${ EVENT_KEY }`,
        SCROLL: `scroll${ EVENT_KEY }`,
        LOAD_DATA_API: `load${ EVENT_KEY }${ DATA_API_KEY }`
    };
    const ClassName = {
        DROPDOWN_ITEM: 'dropdown-item',
        DROPDOWN_MENU: 'dropdown-menu',
        ACTIVE: 'active'
    };
    const Selector = {
        DATA_SPY: '[data-spy="scroll"]',
        ACTIVE: '.active',
        NAV_LIST_GROUP: '.nav, .list-group',
        NAV_LINKS: '.nav-link',
        NAV_ITEMS: '.nav-item',
        LIST_ITEMS: '.list-group-item',
        DROPDOWN: '.dropdown',
        DROPDOWN_ITEMS: '.dropdown-item',
        DROPDOWN_TOGGLE: '.dropdown-toggle'
    };
    const OffsetMethod = {
        OFFSET: 'offset',
        POSITION: 'position'
    };
    class ScrollSpy {
        constructor(element, config) {
            this._element = element;
            this._scrollElement = element.tagName === 'BODY' ? window : element;
            this._config = this._getConfig(config);
            this._selector = `${ this._config.target } ${ Selector.NAV_LINKS },` + `${ this._config.target } ${ Selector.LIST_ITEMS },` + `${ this._config.target } ${ Selector.DROPDOWN_ITEMS }`;
            this._offsets = [];
            this._targets = [];
            this._activeTarget = null;
            this._scrollHeight = 0;
            $(this._scrollElement).on(Event.SCROLL, event => this._process(event));
            this.refresh();
            this._process();
        }
        static get VERSION() {
            return VERSION;
        }
        static get Default() {
            return Default;
        }
        refresh() {
            const autoMethod = this._scrollElement === this._scrollElement.window ? OffsetMethod.OFFSET : OffsetMethod.POSITION;
            const offsetMethod = this._config.method === 'auto' ? autoMethod : this._config.method;
            const offsetBase = offsetMethod === OffsetMethod.POSITION ? this._getScrollTop() : 0;
            this._offsets = [];
            this._targets = [];
            this._scrollHeight = this._getScrollHeight();
            const targets = [].slice.call(document.querySelectorAll(this._selector));
            targets.map(element => {
                let target;
                const targetSelector = Util.getSelectorFromElement(element);
                if (targetSelector) {
                    target = document.querySelector(targetSelector);
                }
                if (target) {
                    const targetBCR = target.getBoundingClientRect();
                    if (targetBCR.width || targetBCR.height) {
                        return [
                            $(target)[offsetMethod]().top + offsetBase,
                            targetSelector
                        ];
                    }
                }
                return null;
            }).filter(item => item).sort((a, b) => a[0] - b[0]).forEach(item => {
                this._offsets.push(item[0]);
                this._targets.push(item[1]);
            });
        }
        dispose() {
            $.removeData(this._element, DATA_KEY);
            $(this._scrollElement).off(EVENT_KEY);
            this._element = null;
            this._scrollElement = null;
            this._config = null;
            this._selector = null;
            this._offsets = null;
            this._targets = null;
            this._activeTarget = null;
            this._scrollHeight = null;
        }
        _getConfig(config) {
            //config = {
            //    ...Default,
            //    ...typeof config === 'object' && config ? config : {}
            //};
            config = langx.mixin({},Default,typeof config === 'object' && config ? config : {});
            if (typeof config.target !== 'string') {
                let id = $(config.target).attr('id');
                if (!id) {
                    id = Util.getUID(NAME);
                    $(config.target).attr('id', id);
                }
                config.target = `#${ id }`;
            }
            Util.typeCheckConfig(NAME, config, DefaultType);
            return config;
        }
        _getScrollTop() {
            return this._scrollElement === window ? this._scrollElement.pageYOffset : this._scrollElement.scrollTop;
        }
        _getScrollHeight() {
            return this._scrollElement.scrollHeight || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        }
        _getOffsetHeight() {
            return this._scrollElement === window ? window.innerHeight : this._scrollElement.getBoundingClientRect().height;
        }
        _process() {
            const scrollTop = this._getScrollTop() + this._config.offset;
            const scrollHeight = this._getScrollHeight();
            const maxScroll = this._config.offset + scrollHeight - this._getOffsetHeight();
            if (this._scrollHeight !== scrollHeight) {
                this.refresh();
            }
            if (scrollTop >= maxScroll) {
                const target = this._targets[this._targets.length - 1];
                if (this._activeTarget !== target) {
                    this._activate(target);
                }
                return;
            }
            if (this._activeTarget && scrollTop < this._offsets[0] && this._offsets[0] > 0) {
                this._activeTarget = null;
                this._clear();
                return;
            }
            const offsetLength = this._offsets.length;
            for (let i = offsetLength; i--;) {
                const isActiveTarget = this._activeTarget !== this._targets[i] && scrollTop >= this._offsets[i] && (typeof this._offsets[i + 1] === 'undefined' || scrollTop < this._offsets[i + 1]);
                if (isActiveTarget) {
                    this._activate(this._targets[i]);
                }
            }
        }
        _activate(target) {
            this._activeTarget = target;
            this._clear();
            const queries = this._selector.split(',').map(selector => `${ selector }[data-target="${ target }"],${ selector }[href="${ target }"]`);
            const $link = $([].slice.call(document.querySelectorAll(queries.join(','))));
            if ($link.hasClass(ClassName.DROPDOWN_ITEM)) {
                $link.closest(Selector.DROPDOWN).find(Selector.DROPDOWN_TOGGLE).addClass(ClassName.ACTIVE);
                $link.addClass(ClassName.ACTIVE);
            } else {
                $link.addClass(ClassName.ACTIVE);
                $link.parents(Selector.NAV_LIST_GROUP).prev(`${ Selector.NAV_LINKS }, ${ Selector.LIST_ITEMS }`).addClass(ClassName.ACTIVE);
                $link.parents(Selector.NAV_LIST_GROUP).prev(Selector.NAV_ITEMS).children(Selector.NAV_LINKS).addClass(ClassName.ACTIVE);
            }
            $(this._scrollElement).trigger(Event.ACTIVATE, { relatedTarget: target });
        }
        _clear() {
            [].slice.call(document.querySelectorAll(this._selector)).filter(node => node.classList.contains(ClassName.ACTIVE)).forEach(node => node.classList.remove(ClassName.ACTIVE));
        }
        static _jqueryInterface(config) {
            return this.each(function () {
                let data = $(this).data(DATA_KEY);
                const _config = typeof config === 'object' && config;
                if (!data) {
                    data = new ScrollSpy(this, _config);
                    $(this).data(DATA_KEY, data);
                }
                if (typeof config === 'string') {
                    if (typeof data[config] === 'undefined') {
                        throw new TypeError(`No method named "${ config }"`);
                    }
                    data[config]();
                }
            });
        }
    }
    $(window).on(Event.LOAD_DATA_API, () => {
        const scrollSpys = [].slice.call(document.querySelectorAll(Selector.DATA_SPY));
        const scrollSpysLength = scrollSpys.length;
        for (let i = scrollSpysLength; i--;) {
            const $spy = $(scrollSpys[i]);
            ScrollSpy._jqueryInterface.call($spy, $spy.data());
        }
    });
    $.fn[NAME] = ScrollSpy._jqueryInterface;
    $.fn[NAME].Constructor = ScrollSpy;
    $.fn[NAME].noConflict = () => {
        $.fn[NAME] = jquery_NO_CONFLICT;
        return ScrollSpy._jqueryInterface;
    };
    return ScrollSpy;
});
define('skylark-bootstrap4/tab',[
    'skylark-langx/langx',
    'skylark-utils-dom/eventer',
    'skylark-utils-dom/query',
    'skylark-utils-dom/plugins',
    "./bs4",
    './util'
], function (langx,eventer,$, plugins,bs4,Util) {

    'use strict';
    const NAME = 'tab';
    const VERSION = '4.1.3';
    const DATA_KEY = 'bs.tab';
    const EVENT_KEY = `.${ DATA_KEY }`;
    const DATA_API_KEY = '.data-api';
    const jquery_NO_CONFLICT = $.fn[NAME];
    const Event = {
        HIDE: `hide${ EVENT_KEY }`,
        HIDDEN: `hidden${ EVENT_KEY }`,
        SHOW: `show${ EVENT_KEY }`,
        SHOWN: `shown${ EVENT_KEY }`,
        CLICK_DATA_API: `click${ EVENT_KEY }${ DATA_API_KEY }`
    };
    const ClassName = {
        DROPDOWN_MENU: 'dropdown-menu',
        ACTIVE: 'active',
        DISABLED: 'disabled',
        FADE: 'fade',
        SHOW: 'show'
    };
    const Selector = {
        DROPDOWN: '.dropdown',
        NAV_LIST_GROUP: '.nav, .list-group',
        ACTIVE: '.active',
        ACTIVE_UL: '> li > .active',
        DATA_TOGGLE: '[data-toggle="tab"], [data-toggle="pill"], [data-toggle="list"]',
        DROPDOWN_TOGGLE: '.dropdown-toggle',
        DROPDOWN_ACTIVE_CHILD: '> .dropdown-menu .active'
    };
    class Tab {
        constructor(element) {
            this._element = element;
        }
        static get VERSION() {
            return VERSION;
        }
        show() {
            if (this._element.parentNode && this._element.parentNode.nodeType === Node.ELEMENT_NODE && $(this._element).hasClass(ClassName.ACTIVE) || $(this._element).hasClass(ClassName.DISABLED)) {
                return;
            }
            let target;
            let previous;
            const listElement = $(this._element).closest(Selector.NAV_LIST_GROUP)[0];
            const selector = Util.getSelectorFromElement(this._element);
            if (listElement) {
                const itemSelector = listElement.nodeName === 'UL' || listElement.nodeName === 'OL' ? Selector.ACTIVE_UL : Selector.ACTIVE;
                previous = langx.makeArray($(listElement).find(itemSelector));
                previous = previous[previous.length - 1];
            }
            const hideEvent = eventer.create(Event.HIDE, { relatedTarget: this._element });
            const showEvent = eventer.create(Event.SHOW, { relatedTarget: previous });
            if (previous) {
                $(previous).trigger(hideEvent);
            }
            $(this._element).trigger(showEvent);
            if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) {
                return;
            }
            if (selector) {
                target = document.querySelector(selector);
            }
            this._activate(this._element, listElement);
            const complete = () => {
                const hiddenEvent = eventer.create(Event.HIDDEN, { relatedTarget: this._element });
                const shownEvent = eventer.create(Event.SHOWN, { relatedTarget: previous });
                $(previous).trigger(hiddenEvent);
                $(this._element).trigger(shownEvent);
            };
            if (target) {
                this._activate(target, target.parentNode, complete);
            } else {
                complete();
            }
        }
        dispose() {
            $.removeData(this._element, DATA_KEY);
            this._element = null;
        }
        _activate(element, container, callback) {
            const activeElements = container && (container.nodeName === 'UL' || container.nodeName === 'OL') ? $(container).find(Selector.ACTIVE_UL) : $(container).children(Selector.ACTIVE);
            const active = activeElements[0];
            const isTransitioning = callback && (active && $(active).hasClass(ClassName.FADE));
            const complete = () => this._transitionComplete(element, active, callback);
            if (active && isTransitioning) {
                const transitionDuration = Util.getTransitionDurationFromElement(active);
                $(active).removeClass(ClassName.SHOW).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
            } else {
                complete();
            }
        }
        _transitionComplete(element, active, callback) {
            if (active) {
                $(active).removeClass(ClassName.ACTIVE);
                const dropdownChild = $(active.parentNode).find(Selector.DROPDOWN_ACTIVE_CHILD)[0];
                if (dropdownChild) {
                    $(dropdownChild).removeClass(ClassName.ACTIVE);
                }
                if (active.getAttribute('role') === 'tab') {
                    active.setAttribute('aria-selected', false);
                }
            }
            $(element).addClass(ClassName.ACTIVE);
            if (element.getAttribute('role') === 'tab') {
                element.setAttribute('aria-selected', true);
            }
            Util.reflow(element);
            $(element).addClass(ClassName.SHOW);
            if (element.parentNode && $(element.parentNode).hasClass(ClassName.DROPDOWN_MENU)) {
                const dropdownElement = $(element).closest(Selector.DROPDOWN)[0];
                if (dropdownElement) {
                    const dropdownToggleList = [].slice.call(dropdownElement.querySelectorAll(Selector.DROPDOWN_TOGGLE));
                    $(dropdownToggleList).addClass(ClassName.ACTIVE);
                }
                element.setAttribute('aria-expanded', true);
            }
            if (callback) {
                callback();
            }
        }
        static _jqueryInterface(config) {
            return this.each(function () {
                const $this = $(this);
                let data = $this.data(DATA_KEY);
                if (!data) {
                    data = new Tab(this);
                    $this.data(DATA_KEY, data);
                }
                if (typeof config === 'string') {
                    if (typeof data[config] === 'undefined') {
                        throw new TypeError(`No method named "${ config }"`);
                    }
                    data[config]();
                }
            });
        }
    }
    $(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
        event.preventDefault();
        Tab._jqueryInterface.call($(this), 'show');
    });
    $.fn[NAME] = Tab._jqueryInterface;
    $.fn[NAME].Constructor = Tab;
    $.fn[NAME].noConflict = () => {
        $.fn[NAME] = jquery_NO_CONFLICT;
        return Tab._jqueryInterface;
    };
    return Tab;
});
define('skylark-bootstrap4/toast',[
    'skylark-langx/langx',
    'skylark-utils-dom/query',
    'skylark-utils-dom/plugins',
    "./bs4",
    './util'
], function (langx,$, plugins,bs4,Util) {

    'use strict';
    const NAME = 'toast';
    const VERSION = '4.1.3';
    const DATA_KEY = 'bs.toast';
    const EVENT_KEY = `.${ DATA_KEY }`;
    const jquery_NO_CONFLICT = $.fn[NAME];
    const Event = {
        CLICK_DISMISS: `click.dismiss${ EVENT_KEY }`,
        HIDE: `hide${ EVENT_KEY }`,
        HIDDEN: `hidden${ EVENT_KEY }`,
        SHOW: `show${ EVENT_KEY }`,
        SHOWN: `shown${ EVENT_KEY }`
    };
    const ClassName = {
        FADE: 'fade',
        HIDE: 'hide',
        SHOW: 'show',
        SHOWING: 'showing'
    };
    const DefaultType = {
        animation: 'boolean',
        autohide: 'boolean',
        delay: 'number'
    };
    const Default = {
        animation: true,
        autohide: true,
        delay: 500
    };
    const Selector = { DATA_DISMISS: '[data-dismiss="toast"]' };
    class Toast {
        constructor(element, config) {
            this._element = element;
            this._config = this._getConfig(config);
            this._timeout = null;
            this._setListeners();
        }
        static get VERSION() {
            return VERSION;
        }
        static get DefaultType() {
            return DefaultType;
        }
        show() {
            $(this._element).trigger(Event.SHOW);
            if (this._config.animation) {
                this._element.classList.add(ClassName.FADE);
            }
            const complete = () => {
                this._element.classList.remove(ClassName.SHOWING);
                this._element.classList.add(ClassName.SHOW);
                $(this._element).trigger(Event.SHOWN);
                if (this._config.autohide) {
                    this.hide();
                }
            };
            this._element.classList.remove(ClassName.HIDE);
            this._element.classList.add(ClassName.SHOWING);
            if (this._config.animation) {
                const transitionDuration = Util.getTransitionDurationFromElement(this._element);
                $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
            } else {
                complete();
            }
        }
        hide(withoutTimeout) {
            if (!this._element.classList.contains(ClassName.SHOW)) {
                return;
            }
            $(this._element).trigger(Event.HIDE);
            if (withoutTimeout) {
                this._close();
            } else {
                this._timeout = setTimeout(() => {
                    this._close();
                }, this._config.delay);
            }
        }
        dispose() {
            clearTimeout(this._timeout);
            this._timeout = null;
            if (this._element.classList.contains(ClassName.SHOW)) {
                this._element.classList.remove(ClassName.SHOW);
            }
            $(this._element).off(Event.CLICK_DISMISS);
            $.removeData(this._element, DATA_KEY);
            this._element = null;
            this._config = null;
        }
        _getConfig(config) {
            //config = {
            //    ...Default,
            //    ...$(this._element).data(),
            //    ...typeof config === 'object' && config ? config : {}
            //};
            const _config = langx.mixin({},Default,$(this._element).data(),typeof config === 'object' && config ? config : {});
            Util.typeCheckConfig(NAME, config, this.constructor.DefaultType);
            return config;
        }
        _setListeners() {
            $(this._element).on(Event.CLICK_DISMISS, Selector.DATA_DISMISS, () => this.hide(true));
        }
        _close() {
            const complete = () => {
                this._element.classList.add(ClassName.HIDE);
                $(this._element).trigger(Event.HIDDEN);
            };
            this._element.classList.remove(ClassName.SHOW);
            if (this._config.animation) {
                const transitionDuration = Util.getTransitionDurationFromElement(this._element);
                $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
            } else {
                complete();
            }
        }
        static _jqueryInterface(config) {
            return this.each(function () {
                const $element = $(this);
                let data = $element.data(DATA_KEY);
                const _config = typeof config === 'object' && config;
                if (!data) {
                    data = new Toast(this, _config);
                    $element.data(DATA_KEY, data);
                }
                if (typeof config === 'string') {
                    if (typeof data[config] === 'undefined') {
                        throw new TypeError(`No method named "${ config }"`);
                    }
                    data[config](this);
                }
            });
        }
    }
    $.fn[NAME] = Toast._jqueryInterface;
    $.fn[NAME].Constructor = Toast;
    $.fn[NAME].noConflict = () => {
        $.fn[NAME] = jquery_NO_CONFLICT;
        return Toast._jqueryInterface;
    };
    return Toast;
});
define('skylark-bootstrap4/main',[
    "skylark-utils-dom/query",
    './alert',
    './button',
    './carousel',
    './collapse',
    './dropdown',
    './modal',
    './popover',
    './scrollspy',
    './tab',
    './toast',
    './tooltip',
    './util'
], function($) {
    return $;
});
define('skylark-bootstrap4', ['skylark-bootstrap4/main'], function (main) { return main; });


},this);
//# sourceMappingURL=sourcemaps/skylark-bootstrap4.js.map
