define([
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