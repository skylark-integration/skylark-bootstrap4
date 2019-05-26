define([
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