var DialogDefaultConfig = {
    closeButton: false,
    leaveOverlayOnClose: false,
    toTop: false,
    toBottom: false,
    locale: METRO_LOCALE,
    title: "",
    content: "",
    actions: {},
    actionsAlign: "right",
    defaultAction: true,
    overlay: true,
    overlayColor: '#000000',
    overlayAlpha: .5,
    overlayClickClose: false,
    width: '480',
    height: 'auto',
    shadow: true,
    closeAction: true,
    clsDialog: "",
    clsTitle: "",
    clsContent: "",
    clsAction: "",
    clsDefaultAction: "",
    clsOverlay: "",
    autoHide: 0,
    removeOnClose: false,
    show: false,

    _runtime: false,

    onShow: Metro.noop,
    onHide: Metro.noop,
    onOpen: Metro.noop,
    onClose: Metro.noop,
    onDialogCreate: Metro.noop
};

Metro.dialogSetup = function (options) {
    DialogDefaultConfig = $.extend({}, DialogDefaultConfig, options);
};

if (typeof window["metroDialogSetup"] !== undefined) {
    Metro.dialogSetup(window["metroDialogSetup"]);
}

var Dialog = {
    _counter: 0,

    init: function( options, elem ) {
        this.options = $.extend( {}, DialogDefaultConfig, options );
        this.elem  = elem;
        this.element = $(elem);
        this.interval = null;
        this.overlay = null;

        this._setOptionsFromDOM();
        this._create();

        return this;
    },

    _setOptionsFromDOM: function(){
        var element = this.element, o = this.options;

        $.each(element.data(), function(key, value){
            if (key in o) {
                try {
                    o[key] = JSON.parse(value);
                } catch (e) {
                    o[key] = value;
                }
            }
        });
    },

    _create: function(){
        var element = this.element, o = this.options;
        this.locale = Metro.locales[o.locale] !== undefined ? Metro.locales[o.locale] : Metro.locales["en-US"];

        Metro.checkRuntime(element, "dialog");

        this._build();
    },

    _build: function(){
        var that = this, element = this.element, o = this.options;
        var body = $("body");
        var overlay;

        element.addClass("dialog");

        if (o.shadow === true) {
            element.addClass("shadow-on");
        }

        if (element.attr("id") === undefined) {
            element.attr("id", Utils.elementId("dialog"));
        }

        if (o.title !== "") {
            this.setTitle(o.title);
        }

        if (o.content !== "") {
            this.setContent(o.content);
        }

        if (o.defaultAction === true || (o.actions !== false && typeof o.actions === 'object' && Utils.objectLength(o.actions) > 0)) {
            var buttons = element.find(".dialog-actions");
            var button;

            if (buttons.length === 0) {
                buttons = $("<div>").addClass("dialog-actions").addClass("text-"+o.actionsAlign).appendTo(element);
            }

            if (o.defaultAction === true && (Utils.objectLength(o.actions) === 0 && element.find(".dialog-actions > *").length === 0)) {
                button = $("<button>").addClass("button js-dialog-close").addClass(o.clsDefaultAction).html(this.locale["buttons"]["ok"]);
                button.appendTo(buttons);
            }

            if (Utils.isObject(o.actions)) $.each(Utils.isObject(o.actions), function(){
                var item = this;
                button = $("<button>").addClass("button").addClass(item.cls).html(item.caption);
                if (item.onclick !== undefined) button.on(Metro.events.click, function(){
                    Utils.exec(item.onclick, [element]);
                });
                button.appendTo(buttons);
            });
        }

        if (o.overlay === true) {
            overlay  = this._overlay();
            this.overlay = overlay;
        }

        if (o.closeAction === true) {
            element.on(Metro.events.click, ".js-dialog-close", function(){
                that.close();
            });
        }

        var closer = element.find("closer");
        if (closer.length === 0) {
            closer = $("<span>").addClass("button square closer js-dialog-close");
            closer.appendTo(element);
        }
        if (o.closeButton !== true) {
            closer.hide();
        }

        element.css({
            width: o.width,
            height: o.height,
            visibility: "hidden",
            top: '100%',
            left: ( $(window).width() - element.outerWidth() ) / 2
        });

        element.addClass(o.clsDialog);
        element.find(".dialog-title").addClass(o.clsTitle);
        element.find(".dialog-content").addClass(o.clsContent);
        element.find(".dialog-actions").addClass(o.clsAction);

        element.appendTo(body);

        if (o.show) {
            this.open();
        }

        $(window).on(Metro.events.resize, function(){
            that.setPosition();
        }, {ns: element.attr('id')});

        Utils.exec(this.options.onDialogCreate, [this.element]);
        element.fire("dialogcreate");
    },

    _overlay: function(){
        var o = this.options;

        var overlay = $("<div>");
        overlay.addClass("overlay").addClass(o.clsOverlay);

        if (o.overlayColor === 'transparent') {
            overlay.addClass("transparent");
        } else {
            overlay.css({
                background: Utils.hex2rgba(o.overlayColor, o.overlayAlpha)
            });
        }

        return overlay;
    },

    hide: function(callback){
        var element = this.element, o = this.options;
        var timeout = 0;
        if (o.onHide !== Metro.noop) {
            timeout = 500;
            Utils.exec(o.onHide, null, element[0]);
            element.fire("hide");
        }
        setTimeout(function(){
            Utils.callback(callback);
            element.css({
                visibility: "hidden",
                top: "100%"
            });
        }, timeout);
    },

    show: function(callback){
        var that = this, element = this.element, o = this.options;
        this.setPosition();
        element.css({
            visibility: "visible"
        });
        Utils.exec(o.onShow, [that], element[0]);
        element.fire("show");
        Utils.callback(callback);
    },

    setPosition: function(){
        var element = this.element, o = this.options;
        var top, bottom;
        if (o.toTop !== true && o.toBottom !== true) {
            top = ( $(window).height() - element.outerHeight() ) / 2;
            if (top < 0) {
                top = 0;
            }
            bottom = "auto";
        } else {
            if (o.toTop === true) {
                top = 0;
                bottom = "auto";
            }
            if (o.toTop !== true && o.toBottom === true) {
                bottom = 0;
                top = "auto";
            }
        }
        element.css({
            top: top,
            bottom: bottom,
            left: ( $(window).width() - element.outerWidth() ) / 2
        });
    },

    setContent: function(c){
        var element = this.element;
        var content = element.find(".dialog-content");
        if (content.length === 0) {
            content = $("<div>").addClass("dialog-content");
            content.appendTo(element);
        }

        if (!Utils.isQ(c) && Utils.isFunc(c)) {
            c = Utils.exec(c);
        }

        if (Utils.isQ(c)) {
            c.appendTo(content);
        } else {
            content.html(c);
        }
    },

    setTitle: function(t){
        var element = this.element;
        var title = element.find(".dialog-title");
        if (title.length === 0) {
            title = $("<div>").addClass("dialog-title");
            title.appendTo(element);
        }
        title.html(t);
    },

    close: function(){
        var element = this.element, o = this.options;

        if (!Utils.bool(o.leaveOverlayOnClose)) {
            $('body').find('.overlay').remove();
        }

        this.hide(function(){
            element.data("open", false);
            Utils.exec(o.onClose, [element], element[0]);
            element.fire("close");
            if (o.removeOnClose === true) {
                element.remove();
            }
        });
    },

    open: function(){
        var that = this, element = this.element, o = this.options;

        if (o.overlay === true && $(".overlay").length === 0) {
            this.overlay.appendTo($("body"));
            if (o.overlayClickClose === true) {
                this.overlay.on(Metro.events.click, function(){
                    that.close();
                });
            }
        }

        this.show(function(){
            Utils.exec(o.onOpen, [element], element[0]);
            element.fire("open");
            element.data("open", true);
            if (parseInt(o.autoHide) > 0) {
                setTimeout(function(){
                    that.close();
                }, parseInt(o.autoHide));
            }
        });
    },

    toggle: function(){
        var element = this.element;
        if (element.data('open')) {
            this.close();
        } else {
            this.open();
        }
    },

    isOpen: function(){
        return this.element.data('open') === true;
    },

    changeAttribute: function(attributeName){
    },

    destroy: function(){
        var element = this.element, o = this.options;

        element.off(Metro.events.click, ".js-dialog-close");
        element.find(".button").off(Metro.events.click);
        $(window).off(Metro.events.resize,{ns: element.attr('id')});

        return element;
    }
};

Metro.plugin('dialog', Dialog);

Metro['dialog'] = {

    isDialog: function(el){
        return Utils.isMetroObject(el, "dialog");
    },

    open: function(el, content, title){
        if (!this.isDialog(el)) {
            return false;
        }
        var dialog = Metro.getPlugin(el, "dialog");
        if (title !== undefined) {
            dialog.setTitle(title);
        }
        if (content !== undefined) {
            dialog.setContent(content);
        }
        dialog.open();
    },

    close: function(el){
        if (!this.isDialog(el)) {
            return false;
        }
        Metro.getPlugin($(el)[0], "dialog").close();
    },

    toggle: function(el){
        if (!this.isDialog(el)) {
            return false;
        }
        Metro.getPlugin($(el)[0], "dialog").toggle();
    },

    isOpen: function(el){
        if (!this.isDialog(el)) {
            return false;
        }
        Metro.getPlugin($(el)[0], "dialog").isOpen();
    },

    remove: function(el){
        if (!this.isDialog(el)) {
            return false;
        }
        var dialog = Metro.getPlugin($(el)[0], "dialog");
        dialog.options.removeOnClose = true;
        dialog.close();
    },

    create: function(options){
        var dlg;

        dlg = $("<div>").appendTo($("body"));

        var dlg_options = $.extend({}, {
            show: true,
            closeAction: true,
            removeOnClose: true
        }, (options !== undefined ? options : {}));

        dlg_options._runtime = true;

        return dlg.dialog(dlg_options);
    }
};