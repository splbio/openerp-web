/*---------------------------------------------------------
 * OpenERP Web core
 *--------------------------------------------------------*/
var console;
if (!console) {
    console = {log: function () {}};
}
if (!console.debug) {
    console.debug = console.log;
}

openerp.web.coresetup = function(instance) {

/** Configure default qweb */
instance.web._t = new instance.web.TranslationDataBase().build_translation_function();
/**
 * Lazy translation function, only performs the translation when actually
 * printed (e.g. inserted into a template)
 *
 * Useful when defining translatable strings in code evaluated before the
 * translation database is loaded, as class attributes or at the top-level of
 * an OpenERP Web module
 *
 * @param {String} s string to translate
 * @returns {Object} lazy translation object
 */
instance.web._lt = function (s) {
    return {toString: function () { return instance.web._t(s); }}
};
instance.web.qweb = new QWeb2.Engine();
instance.web.qweb.debug = ($.deparam($.param.querystring()).debug != undefined);
instance.web.qweb.default_dict = {
    '_' : _,
    '_t' : instance.web._t
};
instance.web.qweb.preprocess_node = function() {
    // Note that 'this' is the Qweb Node
    switch (this.node.nodeType) {
        case 3:
        case 4:
            // Text and CDATAs
            var translation = this.node.parentNode.attributes['t-translation'];
            if (translation && translation.value === 'off') {
                return;
            }
            var ts = _.str.trim(this.node.data);
            if (ts.length === 0) {
                return;
            }
            var tr = instance.web._t(ts);
            if (tr !== ts) {
                this.node.data = tr;
            }
            break;
        case 1:
            // Element
            var attr, attrs = ['label', 'title', 'alt'];
            while (attr = attrs.pop()) {
                if (this.attributes[attr]) {
                    this.attributes[attr] = instance.web._t(this.attributes[attr]);
                }
            }
    }
};

/** Configure blockui */
if ($.blockUI) {
    $.blockUI.defaults.baseZ = 1100;
    $.blockUI.defaults.message = '<img src="/web/static/src/img/throbber2.gif">';
}

/** Custom jQuery plugins */
$.fn.getAttributes = function() {
    var o = {};
    if (this.length) {
        for (var attr, i = 0, attrs = this[0].attributes, l = attrs.length; i < l; i++) {
            attr = attrs.item(i)
            o[attr.nodeName] = attr.nodeValue;
        }
    }
    return o;
}

/** Jquery extentions */
$.Mutex = (function() {
    function Mutex() {
        this.def = $.Deferred().resolve();
    }
    Mutex.prototype.exec = function(action) {
        var current = this.def;
        var next = this.def = $.Deferred();
        return current.pipe(function() {
            return $.when(action()).always(function() {
                next.resolve();
            });
        });
    };
    return Mutex;
})();

/** Setup default connection */
instance.connection = new instance.web.Connection();
instance.web.qweb.default_dict['__debug__'] = instance.connection.debug;

$.async_when = function() {
    var async = false;
    var def = $.Deferred();
    $.when.apply($, arguments).then(function() {
        var args = arguments;
        var action = function() {
            def.resolve.apply(def, args);
        };
        if (async)
            action();
        else
            setTimeout(action, 0);
    }, function() {
        var args = arguments;
        var action = function() {
            def.reject.apply(def, args);
        };
        if (async)
            action();
        else
            setTimeout(action, 0);
    });
    async = true;
    return def;
};

// special tweak for the web client
var old_async_when = $.async_when;
$.async_when = function() {
	if (instance.connection.synch)
		return $.when.apply(this, arguments);
	else
		return old_async_when.apply(this, arguments);
};

};

// vim:et fdc=0 fdl=0 foldnestmax=3 fdm=syntax: