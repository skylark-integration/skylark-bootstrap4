define([
    'skylark-langx/langx',
    'skylark-utils-dom/query',
    'skylark-utils-dom/eventer',
    'skylark-utils-dom/plugins',
    "./bs4",
    'skylark-ui-popper/Popper',
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
                    throw new TypeError("Bootstrap's dropdowns require skylark-ui-popper/Popper (https://skylark-ui-popper/Popper.org/)");
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