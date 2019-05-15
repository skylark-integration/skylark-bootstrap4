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

define('skylark-langx/skylark',[], function() {
    var skylark = {

    };
    return skylark;
});

define('skylark-utils-dom/skylark',["skylark-langx/skylark"], function(skylark) {
    return skylark;
});

define('skylark-utils-dom/dom',["./skylark"], function(skylark) {
	return skylark.dom = {};
});

define('skylark-langx/types',[
],function(){
    var type = (function() {
        var class2type = {};

        // Populate the class2type map
        "Boolean Number String Function Array Date RegExp Object Error".split(" ").forEach(function(name) {
            class2type["[object " + name + "]"] = name.toLowerCase();
        });

        return function type(obj) {
            return obj == null ? String(obj) :
                class2type[toString.call(obj)] || "object";
        };
    })();

    function isArray(object) {
        return object && object.constructor === Array;
    }

    function isArrayLike(obj) {
        return !isString(obj) && !isHtmlNode(obj) && typeof obj.length == 'number' && !isFunction(obj);
    }

    function isBoolean(obj) {
        return typeof(obj) === "boolean";
    }

    function isDefined(obj) {
        return typeof obj !== 'undefined';
    }

    function isDocument(obj) {
        return obj != null && obj.nodeType == obj.DOCUMENT_NODE;
    }

    function isEmptyObject(obj) {
        var name;
        for (name in obj) {
            if (obj[name] !== null) {
                return false;
            }
        }
        return true;
    }

    function isFunction(value) {
        return type(value) == "function";
    }

    function isHtmlNode(obj) {
        return obj && (obj instanceof Node);
    }

    function isInstanceOf( /*Object*/ value, /*Type*/ type) {
        //Tests whether the value is an instance of a type.
        if (value === undefined) {
            return false;
        } else if (value === null || type == Object) {
            return true;
        } else if (typeof value === "number") {
            return type === Number;
        } else if (typeof value === "string") {
            return type === String;
        } else if (typeof value === "boolean") {
            return type === Boolean;
        } else if (typeof value === "string") {
            return type === String;
        } else {
            return (value instanceof type) || (value && value.isInstanceOf ? value.isInstanceOf(type) : false);
        }
    }

    function isNumber(obj) {
        return typeof obj == 'number';
    }

    function isObject(obj) {
        return type(obj) == "object";
    }

    function isPlainObject(obj) {
        return isObject(obj) && !isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype;
    }

    function isString(obj) {
        return typeof obj === 'string';
    }

    function isWindow(obj) {
        return obj && obj == obj.window;
    }

    function isSameOrigin(href) {
        if (href) {
            var origin = location.protocol + '//' + location.hostname;
            if (location.port) {
                origin += ':' + location.port;
            }
            return href.startsWith(origin);
        }
    }

    return {

        isArray: isArray,

        isArrayLike: isArrayLike,

        isBoolean: isBoolean,

        isDefined: isDefined,

        isDocument: isDocument,

        isEmptyObject: isEmptyObject,

        isFunction: isFunction,

        isHtmlNode: isHtmlNode,

        isNumber: isNumber,

        isObject: isObject,

        isPlainObject: isPlainObject,

        isString: isString,

        isSameOrigin: isSameOrigin,

        isWindow: isWindow,

        type: type
    };

});
define('skylark-langx/objects',[
	"./types"
],function(types){
	var hasOwnProperty = Object.prototype.hasOwnProperty,
        slice = Array.prototype.slice,
        isBoolean = types.isBoolean,
        isFunction = types.isFunction,
		isObject = types.isObject,
		isPlainObject = types.isPlainObject,
		isArray = types.isArray;

     // An internal function for creating assigner functions.
    function createAssigner(keysFunc, defaults) {
        return function(obj) {
          var length = arguments.length;
          if (defaults) obj = Object(obj);  
          if (length < 2 || obj == null) return obj;
          for (var index = 1; index < length; index++) {
            var source = arguments[index],
                keys = keysFunc(source),
                l = keys.length;
            for (var i = 0; i < l; i++) {
              var key = keys[i];
              if (!defaults || obj[key] === void 0) obj[key] = source[key];
            }
          }
          return obj;
       };
    }

    // Internal recursive comparison function for `isEqual`.
    var eq, deepEq;
    var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;

    eq = function(a, b, aStack, bStack) {
        // Identical objects are equal. `0 === -0`, but they aren't identical.
        // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
        if (a === b) return a !== 0 || 1 / a === 1 / b;
        // `null` or `undefined` only equal to itself (strict comparison).
        if (a == null || b == null) return false;
        // `NaN`s are equivalent, but non-reflexive.
        if (a !== a) return b !== b;
        // Exhaust primitive checks
        var type = typeof a;
        if (type !== 'function' && type !== 'object' && typeof b != 'object') return false;
        return deepEq(a, b, aStack, bStack);
    };

    // Internal recursive comparison function for `isEqual`.
    deepEq = function(a, b, aStack, bStack) {
        // Unwrap any wrapped objects.
        //if (a instanceof _) a = a._wrapped;
        //if (b instanceof _) b = b._wrapped;
        // Compare `[[Class]]` names.
        var className = toString.call(a);
        if (className !== toString.call(b)) return false;
        switch (className) {
            // Strings, numbers, regular expressions, dates, and booleans are compared by value.
            case '[object RegExp]':
            // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
            case '[object String]':
                // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
                // equivalent to `new String("5")`.
                return '' + a === '' + b;
            case '[object Number]':
                // `NaN`s are equivalent, but non-reflexive.
                // Object(NaN) is equivalent to NaN.
                if (+a !== +a) return +b !== +b;
                // An `egal` comparison is performed for other numeric values.
                return +a === 0 ? 1 / +a === 1 / b : +a === +b;
            case '[object Date]':
            case '[object Boolean]':
                // Coerce dates and booleans to numeric primitive values. Dates are compared by their
                // millisecond representations. Note that invalid dates with millisecond representations
                // of `NaN` are not equivalent.
                return +a === +b;
            case '[object Symbol]':
                return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);
        }

        var areArrays = className === '[object Array]';
        if (!areArrays) {
            if (typeof a != 'object' || typeof b != 'object') return false;
            // Objects with different constructors are not equivalent, but `Object`s or `Array`s
            // from different frames are.
            var aCtor = a.constructor, bCtor = b.constructor;
            if (aCtor !== bCtor && !(isFunction(aCtor) && aCtor instanceof aCtor &&
                               isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
                return false;
            }
        }
        // Assume equality for cyclic structures. The algorithm for detecting cyclic
        // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

        // Initializing stack of traversed objects.
        // It's done here since we only need them for objects and arrays comparison.
        aStack = aStack || [];
        bStack = bStack || [];
        var length = aStack.length;
        while (length--) {
            // Linear search. Performance is inversely proportional to the number of
            // unique nested structures.
            if (aStack[length] === a) return bStack[length] === b;
        }

        // Add the first object to the stack of traversed objects.
        aStack.push(a);
        bStack.push(b);

        // Recursively compare objects and arrays.
        if (areArrays) {
            // Compare array lengths to determine if a deep comparison is necessary.
            length = a.length;
            if (length !== b.length) return false;
            // Deep compare the contents, ignoring non-numeric properties.
            while (length--) {
                if (!eq(a[length], b[length], aStack, bStack)) return false;
            }
        } else {
            // Deep compare objects.
            var keys = Object.keys(a), key;
            length = keys.length;
            // Ensure that both objects contain the same number of properties before comparing deep equality.
            if (Object.keys(b).length !== length) return false;
            while (length--) {
                // Deep compare each member
                key = keys[length];
                if (!(b[key]!==undefined && eq(a[key], b[key], aStack, bStack))) return false;
            }
        }
        // Remove the first object from the stack of traversed objects.
        aStack.pop();
        bStack.pop();
        return true;
    };

    // Retrieve all the property names of an object.
    function allKeys(obj) {
        if (!isObject(obj)) return [];
        var keys = [];
        for (var key in obj) keys.push(key);
        return keys;
    }

    function each(obj, callback) {
        var length, key, i, undef, value;

        if (obj) {
            length = obj.length;

            if (length === undef) {
                // Loop object items
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        value = obj[key];
                        if (callback.call(value, key, value) === false) {
                            break;
                        }
                    }
                }
            } else {
                // Loop array items
                for (i = 0; i < length; i++) {
                    value = obj[i];
                    if (callback.call(value, i, value) === false) {
                        break;
                    }
                }
            }
        }

        return this;
    }

    function extend(target) {
        var deep, args = slice.call(arguments, 1);
        if (typeof target == 'boolean') {
            deep = target
            target = args.shift()
        }
        if (args.length == 0) {
            args = [target];
            target = this;
        }
        args.forEach(function(arg) {
            mixin(target, arg, deep);
        });
        return target;
    }

    // Retrieve the names of an object's own properties.
    // Delegates to **ECMAScript 5**'s native `Object.keys`.
    function keys(obj) {
        if (isObject(obj)) return [];
        var keys = [];
        for (var key in obj) if (has(obj, key)) keys.push(key);
        return keys;
    }

    function has(obj, path) {
        if (!isArray(path)) {
            return obj != null && hasOwnProperty.call(obj, path);
        }
        var length = path.length;
        for (var i = 0; i < length; i++) {
            var key = path[i];
            if (obj == null || !hasOwnProperty.call(obj, key)) {
                return false;
            }
            obj = obj[key];
        }
        return !!length;
    }

   // Perform a deep comparison to check if two objects are equal.
    function isEqual(a, b) {
        return eq(a, b);
    }

    // Returns whether an object has a given set of `key:value` pairs.
    function isMatch(object, attrs) {
        var keys = keys(attrs), length = keys.length;
        if (object == null) return !length;
        var obj = Object(object);
        for (var i = 0; i < length; i++) {
          var key = keys[i];
          if (attrs[key] !== obj[key] || !(key in obj)) return false;
        }
        return true;
    }    

    function _mixin(target, source, deep, safe) {
        for (var key in source) {
            //if (!source.hasOwnProperty(key)) {
            //    continue;
            //}
            if (safe && target[key] !== undefined) {
                continue;
            }
            if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
                if (isPlainObject(source[key]) && !isPlainObject(target[key])) {
                    target[key] = {};
                }
                if (isArray(source[key]) && !isArray(target[key])) {
                    target[key] = [];
                }
                _mixin(target[key], source[key], deep, safe);
            } else if (source[key] !== undefined) {
                target[key] = source[key]
            }
        }
        return target;
    }

    function _parseMixinArgs(args) {
        var params = slice.call(arguments, 0),
            target = params.shift(),
            deep = false;
        if (isBoolean(params[params.length - 1])) {
            deep = params.pop();
        }

        return {
            target: target,
            sources: params,
            deep: deep
        };
    }

    function mixin() {
        var args = _parseMixinArgs.apply(this, arguments);

        args.sources.forEach(function(source) {
            _mixin(args.target, source, args.deep, false);
        });
        return args.target;
    }

    function removeItem(items, item) {
        if (isArray(items)) {
            var idx = items.indexOf(item);
            if (idx != -1) {
                items.splice(idx, 1);
            }
        } else if (isPlainObject(items)) {
            for (var key in items) {
                if (items[key] == item) {
                    delete items[key];
                    break;
                }
            }
        }

        return this;
    }

    function result(obj, path, fallback) {
        if (!isArray(path)) {
            path = [path]
        };
        var length = path.length;
        if (!length) {
          return isFunction(fallback) ? fallback.call(obj) : fallback;
        }
        for (var i = 0; i < length; i++) {
          var prop = obj == null ? void 0 : obj[path[i]];
          if (prop === void 0) {
            prop = fallback;
            i = length; // Ensure we don't continue iterating.
          }
          obj = isFunction(prop) ? prop.call(obj) : prop;
        }

        return obj;
    }

    function safeMixin() {
        var args = _parseMixinArgs.apply(this, arguments);

        args.sources.forEach(function(source) {
            _mixin(args.target, source, args.deep, true);
        });
        return args.target;
    }

    // Retrieve the values of an object's properties.
    function values(obj) {
        var keys = _.keys(obj);
        var length = keys.length;
        var values = Array(length);
        for (var i = 0; i < length; i++) {
            values[i] = obj[keys[i]];
        }
        return values;
    }


    
    function clone( /*anything*/ src,checkCloneMethod) {
        var copy;
        if (src === undefined || src === null) {
            copy = src;
        } else if (checkCloneMethod && src.clone) {
            copy = src.clone();
        } else if (isArray(src)) {
            copy = [];
            for (var i = 0; i < src.length; i++) {
                copy.push(clone(src[i]));
            }
        } else if (isPlainObject(src)) {
            copy = {};
            for (var key in src) {
                copy[key] = clone(src[key]);
            }
        } else {
            copy = src;
        }

        return copy;

    }

    return {
        allKeys: allKeys,

        clone: clone,

        defaults : createAssigner(allKeys, true),

        each : each,

        extend : extend,

        has: has,

        isEqual: isEqual,

        isMatch: isMatch,

        keys: keys,

        mixin: mixin,

        removeItem: removeItem,

        result : result,
        
        safeMixin: safeMixin,

        values: values
    };

});
define('skylark-langx/arrays',[
	"./types",
    "./objects"
],function(types,objects){
	var filter = Array.prototype.filter,
		isArrayLike = types.isArrayLike;

    function compact(array) {
        return filter.call(array, function(item) {
            return item != null;
        });
    }

    function flatten(array) {
        if (isArrayLike(array)) {
            var result = [];
            for (var i = 0; i < array.length; i++) {
                var item = array[i];
                if (isArrayLike(item)) {
                    for (var j = 0; j < item.length; j++) {
                        result.push(item[j]);
                    }
                } else {
                    result.push(item);
                }
            }
            return result;
        } else {
            return array;
        }
        //return array.length > 0 ? concat.apply([], array) : array;
    }

    function grep(array, callback) {
        var out = [];

        each(array, function(i, item) {
            if (callback(item, i)) {
                out.push(item);
            }
        });

        return out;
    }

    function inArray(item, array) {
        if (!array) {
            return -1;
        }
        var i;

        if (array.indexOf) {
            return array.indexOf(item);
        }

        i = array.length;
        while (i--) {
            if (array[i] === item) {
                return i;
            }
        }

        return -1;
    }

    function makeArray(obj, offset, startWith) {
       if (isArrayLike(obj) ) {
        return (startWith || []).concat(Array.prototype.slice.call(obj, offset || 0));
      }

      // array of single index
      return [ obj ];             
    }

    function map(elements, callback) {
        var value, values = [],
            i, key
        if (isArrayLike(elements))
            for (i = 0; i < elements.length; i++) {
                value = callback.call(elements[i], elements[i], i);
                if (value != null) values.push(value)
            }
        else
            for (key in elements) {
                value = callback.call(elements[key], elements[key], key);
                if (value != null) values.push(value)
            }
        return flatten(values)
    }

    function uniq(array) {
        return filter.call(array, function(item, idx) {
            return array.indexOf(item) == idx;
        })
    }

    return {
        compact: compact,

        first : function(items,n) {
            if (n) {
                return items.slice(0,n);
            } else {
                return items[0];
            }
        },

	    each: objects.each,

        flatten: flatten,

        inArray: inArray,

        makeArray: makeArray,

        map : map,
        
        uniq : uniq

    }
});
define('skylark-langx/klass',[
    "./arrays",
    "./objects",
    "./types"
],function(arrays,objects,types){
    var uniq = arrays.uniq,
        has = objects.has,
        mixin = objects.mixin,
        isArray = types.isArray,
        isDefined = types.isDefined;
    
    function inherit(ctor, base) {
        var f = function() {};
        f.prototype = base.prototype;

        ctor.prototype = new f();
    }

    var f1 = function() {
        function extendClass(ctor, props, options) {
            // Copy the properties to the prototype of the class.
            var proto = ctor.prototype,
                _super = ctor.superclass.prototype,
                noOverrided = options && options.noOverrided;

            for (var name in props) {
                if (name === "constructor") {
                    continue;
                }

                // Check if we're overwriting an existing function
                var prop = props[name];
                if (typeof props[name] == "function") {
                    proto[name] =  !prop._constructor && !noOverrided && typeof _super[name] == "function" ?
                          (function(name, fn, superFn) {
                            return function() {
                                var tmp = this.overrided;

                                // Add a new ._super() method that is the same method
                                // but on the super-class
                                this.overrided = superFn;

                                // The method only need to be bound temporarily, so we
                                // remove it when we're done executing
                                var ret = fn.apply(this, arguments);

                                this.overrided = tmp;

                                return ret;
                            };
                        })(name, prop, _super[name]) :
                        prop;
                } else if (typeof prop == "object" && prop!==null && (prop.get)) {
                    Object.defineProperty(proto,name,prop);
                } else {
                    proto[name] = prop;
                }
            }
            return ctor;
        }

        function serialMixins(ctor,mixins) {
            var result = [];

            mixins.forEach(function(mixin){
                if (has(mixin,"__mixins__")) {
                     throw new Error("nested mixins");
                }
                var clss = [];
                while (mixin) {
                    clss.unshift(mixin);
                    mixin = mixin.superclass;
                }
                result = result.concat(clss);
            });

            result = uniq(result);

            result = result.filter(function(mixin){
                var cls = ctor;
                while (cls) {
                    if (mixin === cls) {
                        return false;
                    }
                    if (has(cls,"__mixins__")) {
                        var clsMixines = cls["__mixins__"];
                        for (var i=0; i<clsMixines.length;i++) {
                            if (clsMixines[i]===mixin) {
                                return false;
                            }
                        }
                    }
                    cls = cls.superclass;
                }
                return true;
            });

            if (result.length>0) {
                return result;
            } else {
                return false;
            }
        }

        function mergeMixins(ctor,mixins) {
            var newCtor =ctor;
            for (var i=0;i<mixins.length;i++) {
                var xtor = new Function();
                xtor.prototype = Object.create(newCtor.prototype);
                xtor.__proto__ = newCtor;
                xtor.superclass = null;
                mixin(xtor.prototype,mixins[i].prototype);
                xtor.prototype.__mixin__ = mixins[i];
                newCtor = xtor;
            }

            return newCtor;
        }

        function _constructor ()  {
            if (this._construct) {
                return this._construct.apply(this, arguments);
            } else  if (this.init) {
                return this.init.apply(this, arguments);
            }
        }

        return function createClass(props, parent, mixins,options) {
            if (isArray(parent)) {
                options = mixins;
                mixins = parent;
                parent = null;
            }
            parent = parent || Object;

            if (isDefined(mixins) && !isArray(mixins)) {
                options = mixins;
                mixins = false;
            }

            var innerParent = parent;

            if (mixins) {
                mixins = serialMixins(innerParent,mixins);
            }

            if (mixins) {
                innerParent = mergeMixins(innerParent,mixins);
            }

            var klassName = props.klassName || "",
                ctor = new Function(
                    "return function " + klassName + "() {" +
                    "var inst = this," +
                    " ctor = arguments.callee;" +
                    "if (!(inst instanceof ctor)) {" +
                    "inst = Object.create(ctor.prototype);" +
                    "}" +
                    "return ctor._constructor.apply(inst, arguments) || inst;" + 
                    "}"
                )();


            // Populate our constructed prototype object
            ctor.prototype = Object.create(innerParent.prototype);

            // Enforce the constructor to be what we expect
            ctor.prototype.constructor = ctor;
            ctor.superclass = parent;

            // And make this class extendable
            ctor.__proto__ = innerParent;


            if (!ctor._constructor) {
                ctor._constructor = _constructor;
            } 

            if (mixins) {
                ctor.__mixins__ = mixins;
            }

            if (!ctor.partial) {
                ctor.partial = function(props, options) {
                    return extendClass(this, props, options);
                };
            }
            if (!ctor.inherit) {
                ctor.inherit = function(props, mixins,options) {
                    return createClass(props, this, mixins,options);
                };
            }

            ctor.partial(props, options);

            return ctor;
        };
    }

    var createClass = f1();

    return createClass;
});
define('skylark-langx/ArrayStore',[
    "./klass"
],function(klass){
    var SimpleQueryEngine = function(query, options){
        // summary:
        //      Simple query engine that matches using filter functions, named filter
        //      functions or objects by name-value on a query object hash
        //
        // description:
        //      The SimpleQueryEngine provides a way of getting a QueryResults through
        //      the use of a simple object hash as a filter.  The hash will be used to
        //      match properties on data objects with the corresponding value given. In
        //      other words, only exact matches will be returned.
        //
        //      This function can be used as a template for more complex query engines;
        //      for example, an engine can be created that accepts an object hash that
        //      contains filtering functions, or a string that gets evaluated, etc.
        //
        //      When creating a new dojo.store, simply set the store's queryEngine
        //      field as a reference to this function.
        //
        // query: Object
        //      An object hash with fields that may match fields of items in the store.
        //      Values in the hash will be compared by normal == operator, but regular expressions
        //      or any object that provides a test() method are also supported and can be
        //      used to match strings by more complex expressions
        //      (and then the regex's or object's test() method will be used to match values).
        //
        // options: dojo/store/api/Store.QueryOptions?
        //      An object that contains optional information such as sort, start, and count.
        //
        // returns: Function
        //      A function that caches the passed query under the field "matches".  See any
        //      of the "query" methods on dojo.stores.
        //
        // example:
        //      Define a store with a reference to this engine, and set up a query method.
        //
        //  |   var myStore = function(options){
        //  |       //  ...more properties here
        //  |       this.queryEngine = SimpleQueryEngine;
        //  |       //  define our query method
        //  |       this.query = function(query, options){
        //  |           return QueryResults(this.queryEngine(query, options)(this.data));
        //  |       };
        //  |   };

        // create our matching query function
        switch(typeof query){
            default:
                throw new Error("Can not query with a " + typeof query);
            case "object": case "undefined":
                var queryObject = query;
                query = function(object){
                    for(var key in queryObject){
                        var required = queryObject[key];
                        if(required && required.test){
                            // an object can provide a test method, which makes it work with regex
                            if(!required.test(object[key], object)){
                                return false;
                            }
                        }else if(required != object[key]){
                            return false;
                        }
                    }
                    return true;
                };
                break;
            case "string":
                // named query
                if(!this[query]){
                    throw new Error("No filter function " + query + " was found in store");
                }
                query = this[query];
                // fall through
            case "function":
                // fall through
        }
        
        function filter(arr, callback, thisObject){
            // summary:
            //      Returns a new Array with those items from arr that match the
            //      condition implemented by callback.
            // arr: Array
            //      the array to iterate over.
            // callback: Function|String
            //      a function that is invoked with three arguments (item,
            //      index, array). The return of this function is expected to
            //      be a boolean which determines whether the passed-in item
            //      will be included in the returned array.
            // thisObject: Object?
            //      may be used to scope the call to callback
            // returns: Array
            // description:
            //      This function corresponds to the JavaScript 1.6 Array.filter() method, with one difference: when
            //      run over sparse arrays, this implementation passes the "holes" in the sparse array to
            //      the callback function with a value of undefined. JavaScript 1.6's filter skips the holes in the sparse array.
            //      For more details, see:
            //      https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/filter
            // example:
            //  | // returns [2, 3, 4]
            //  | array.filter([1, 2, 3, 4], function(item){ return item>1; });

            // TODO: do we need "Ctr" here like in map()?
            var i = 0, l = arr && arr.length || 0, out = [], value;
            if(l && typeof arr == "string") arr = arr.split("");
            if(typeof callback == "string") callback = cache[callback] || buildFn(callback);
            if(thisObject){
                for(; i < l; ++i){
                    value = arr[i];
                    if(callback.call(thisObject, value, i, arr)){
                        out.push(value);
                    }
                }
            }else{
                for(; i < l; ++i){
                    value = arr[i];
                    if(callback(value, i, arr)){
                        out.push(value);
                    }
                }
            }
            return out; // Array
        }

        function execute(array){
            // execute the whole query, first we filter
            var results = filter(array, query);
            // next we sort
            var sortSet = options && options.sort;
            if(sortSet){
                results.sort(typeof sortSet == "function" ? sortSet : function(a, b){
                    for(var sort, i=0; sort = sortSet[i]; i++){
                        var aValue = a[sort.attribute];
                        var bValue = b[sort.attribute];
                        // valueOf enables proper comparison of dates
                        aValue = aValue != null ? aValue.valueOf() : aValue;
                        bValue = bValue != null ? bValue.valueOf() : bValue;
                        if (aValue != bValue){
                            // modified by lwf 2016/07/09
                            //return !!sort.descending == (aValue == null || aValue > bValue) ? -1 : 1;
                            return !!sort.descending == (aValue == null || aValue > bValue) ? -1 : 1;
                        }
                    }
                    return 0;
                });
            }
            // now we paginate
            if(options && (options.start || options.count)){
                var total = results.length;
                results = results.slice(options.start || 0, (options.start || 0) + (options.count || Infinity));
                results.total = total;
            }
            return results;
        }
        execute.matches = query;
        return execute;
    };

    var QueryResults = function(results){
        // summary:
        //      A function that wraps the results of a store query with additional
        //      methods.
        // description:
        //      QueryResults is a basic wrapper that allows for array-like iteration
        //      over any kind of returned data from a query.  While the simplest store
        //      will return a plain array of data, other stores may return deferreds or
        //      promises; this wrapper makes sure that *all* results can be treated
        //      the same.
        //
        //      Additional methods include `forEach`, `filter` and `map`.
        // results: Array|dojo/promise/Promise
        //      The result set as an array, or a promise for an array.
        // returns:
        //      An array-like object that can be used for iterating over.
        // example:
        //      Query a store and iterate over the results.
        //
        //  |   store.query({ prime: true }).forEach(function(item){
        //  |       //  do something
        //  |   });

        if(!results){
            return results;
        }

        var isPromise = !!results.then;
        // if it is a promise it may be frozen
        if(isPromise){
            results = Object.delegate(results);
        }
        function addIterativeMethod(method){
            // Always add the iterative methods so a QueryResults is
            // returned whether the environment is ES3 or ES5
            results[method] = function(){
                var args = arguments;
                var result = Deferred.when(results, function(results){
                    //Array.prototype.unshift.call(args, results);
                    return QueryResults(Array.prototype[method].apply(results, args));
                });
                // forEach should only return the result of when()
                // when we're wrapping a promise
                if(method !== "forEach" || isPromise){
                    return result;
                }
            };
        }

        addIterativeMethod("forEach");
        addIterativeMethod("filter");
        addIterativeMethod("map");
        if(results.total == null){
            results.total = Deferred.when(results, function(results){
                return results.length;
            });
        }
        return results; // Object
    };

    var ArrayStore = klass({
        "klassName": "ArrayStore",

        "queryEngine": SimpleQueryEngine,
        
        "idProperty": "id",


        get: function(id){
            // summary:
            //      Retrieves an object by its identity
            // id: Number
            //      The identity to use to lookup the object
            // returns: Object
            //      The object in the store that matches the given id.
            return this.data[this.index[id]];
        },

        getIdentity: function(object){
            return object[this.idProperty];
        },

        put: function(object, options){
            var data = this.data,
                index = this.index,
                idProperty = this.idProperty;
            var id = object[idProperty] = (options && "id" in options) ? options.id : idProperty in object ? object[idProperty] : Math.random();
            if(id in index){
                // object exists
                if(options && options.overwrite === false){
                    throw new Error("Object already exists");
                }
                // replace the entry in data
                data[index[id]] = object;
            }else{
                // add the new object
                index[id] = data.push(object) - 1;
            }
            return id;
        },

        add: function(object, options){
            (options = options || {}).overwrite = false;
            // call put with overwrite being false
            return this.put(object, options);
        },

        remove: function(id){
            // summary:
            //      Deletes an object by its identity
            // id: Number
            //      The identity to use to delete the object
            // returns: Boolean
            //      Returns true if an object was removed, falsy (undefined) if no object matched the id
            var index = this.index;
            var data = this.data;
            if(id in index){
                data.splice(index[id], 1);
                // now we have to reindex
                this.setData(data);
                return true;
            }
        },
        query: function(query, options){
            // summary:
            //      Queries the store for objects.
            // query: Object
            //      The query to use for retrieving objects from the store.
            // options: dojo/store/api/Store.QueryOptions?
            //      The optional arguments to apply to the resultset.
            // returns: dojo/store/api/Store.QueryResults
            //      The results of the query, extended with iterative methods.
            //
            // example:
            //      Given the following store:
            //
            //  |   var store = new Memory({
            //  |       data: [
            //  |           {id: 1, name: "one", prime: false },
            //  |           {id: 2, name: "two", even: true, prime: true},
            //  |           {id: 3, name: "three", prime: true},
            //  |           {id: 4, name: "four", even: true, prime: false},
            //  |           {id: 5, name: "five", prime: true}
            //  |       ]
            //  |   });
            //
            //  ...find all items where "prime" is true:
            //
            //  |   var results = store.query({ prime: true });
            //
            //  ...or find all items where "even" is true:
            //
            //  |   var results = store.query({ even: true });
            return QueryResults(this.queryEngine(query, options)(this.data));
        },

        setData: function(data){
            // summary:
            //      Sets the given data as the source for this store, and indexes it
            // data: Object[]
            //      An array of objects to use as the source of data.
            if(data.items){
                // just for convenience with the data format IFRS expects
                this.idProperty = data.identifier || this.idProperty;
                data = this.data = data.items;
            }else{
                this.data = data;
            }
            this.index = {};
            for(var i = 0, l = data.length; i < l; i++){
                this.index[data[i][this.idProperty]] = i;
            }
        },

        init: function(options) {
            for(var i in options){
                this[i] = options[i];
            }
            this.setData(this.data || []);
        }

    });

	return ArrayStore;
});
define('skylark-langx/aspect',[
],function(){

  var undefined, nextId = 0;
    function advise(dispatcher, type, advice, receiveArguments){
        var previous = dispatcher[type];
        var around = type == "around";
        var signal;
        if(around){
            var advised = advice(function(){
                return previous.advice(this, arguments);
            });
            signal = {
                remove: function(){
                    if(advised){
                        advised = dispatcher = advice = null;
                    }
                },
                advice: function(target, args){
                    return advised ?
                        advised.apply(target, args) :  // called the advised function
                        previous.advice(target, args); // cancelled, skip to next one
                }
            };
        }else{
            // create the remove handler
            signal = {
                remove: function(){
                    if(signal.advice){
                        var previous = signal.previous;
                        var next = signal.next;
                        if(!next && !previous){
                            delete dispatcher[type];
                        }else{
                            if(previous){
                                previous.next = next;
                            }else{
                                dispatcher[type] = next;
                            }
                            if(next){
                                next.previous = previous;
                            }
                        }

                        // remove the advice to signal that this signal has been removed
                        dispatcher = advice = signal.advice = null;
                    }
                },
                id: nextId++,
                advice: advice,
                receiveArguments: receiveArguments
            };
        }
        if(previous && !around){
            if(type == "after"){
                // add the listener to the end of the list
                // note that we had to change this loop a little bit to workaround a bizarre IE10 JIT bug
                while(previous.next && (previous = previous.next)){}
                previous.next = signal;
                signal.previous = previous;
            }else if(type == "before"){
                // add to beginning
                dispatcher[type] = signal;
                signal.next = previous;
                previous.previous = signal;
            }
        }else{
            // around or first one just replaces
            dispatcher[type] = signal;
        }
        return signal;
    }
    function aspect(type){
        return function(target, methodName, advice, receiveArguments){
            var existing = target[methodName], dispatcher;
            if(!existing || existing.target != target){
                // no dispatcher in place
                target[methodName] = dispatcher = function(){
                    var executionId = nextId;
                    // before advice
                    var args = arguments;
                    var before = dispatcher.before;
                    while(before){
                        args = before.advice.apply(this, args) || args;
                        before = before.next;
                    }
                    // around advice
                    if(dispatcher.around){
                        var results = dispatcher.around.advice(this, args);
                    }
                    // after advice
                    var after = dispatcher.after;
                    while(after && after.id < executionId){
                        if(after.receiveArguments){
                            var newResults = after.advice.apply(this, args);
                            // change the return value only if a new value was returned
                            results = newResults === undefined ? results : newResults;
                        }else{
                            results = after.advice.call(this, results, args);
                        }
                        after = after.next;
                    }
                    return results;
                };
                if(existing){
                    dispatcher.around = {advice: function(target, args){
                        return existing.apply(target, args);
                    }};
                }
                dispatcher.target = target;
            }
            var results = advise((dispatcher || existing), type, advice, receiveArguments);
            advice = null;
            return results;
        };
    }

    return {
        after: aspect("after"),
 
        around: aspect("around"),
        
        before: aspect("before")
    };
});
define('skylark-langx/funcs',[
    "./objects",
	"./types"
],function(objects,types){
	var mixin = objects.mixin,
        slice = Array.prototype.slice,
        isFunction = types.isFunction,
        isString = types.isString;

    function defer(fn) {
        if (requestAnimationFrame) {
            requestAnimationFrame(fn);
        } else {
            setTimeoutout(fn);
        }
        return this;
    }

    function noop() {
    }

    function proxy(fn, context) {
        var args = (2 in arguments) && slice.call(arguments, 2)
        if (isFunction(fn)) {
            var proxyFn = function() {
                return fn.apply(context, args ? args.concat(slice.call(arguments)) : arguments);
            }
            return proxyFn;
        } else if (isString(context)) {
            if (args) {
                args.unshift(fn[context], fn)
                return proxy.apply(null, args)
            } else {
                return proxy(fn[context], fn);
            }
        } else {
            throw new TypeError("expected function");
        }
    }

    function debounce(fn, wait) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                fn.apply(context, args);
            };
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
   
    var delegate = (function() {
        // boodman/crockford delegation w/ cornford optimization
        function TMP() {}
        return function(obj, props) {
            TMP.prototype = obj;
            var tmp = new TMP();
            TMP.prototype = null;
            if (props) {
                mixin(tmp, props);
            }
            return tmp; // Object
        };
    })();


    return {
        debounce: debounce,

        delegate: delegate,

        defer: defer,

        noop : noop,

        proxy: proxy,

        returnTrue: function() {
            return true;
        },

        returnFalse: function() {
            return false;
        }
    };
});
define('skylark-langx/Deferred',[
    "./arrays",
	"./funcs",
    "./objects"
],function(arrays,funcs,objects){
    "use strict";
    
    var  PGLISTENERS = Symbol ? Symbol() : '__pglisteners';

    var slice = Array.prototype.slice,
        proxy = funcs.proxy,
        makeArray = arrays.makeArray,
        result = objects.result,
        mixin = objects.mixin;

    mixin(Promise.prototype,{
        always: function(handler) {
            //this.done(handler);
            //this.fail(handler);
            this.then(handler,handler);
            return this;
        },
        done : function(handler) {
            this.then(handler);
            return this;
        },
        fail : function(handler) { 
            //return mixin(Promise.prototype.catch.call(this,handler),added);
            //return this.then(null,handler);
            this.catch(handler);
            return this;
        }
    });


    var Deferred = function() {
        var self = this,
            p = this.promise = new Promise(function(resolve, reject) {
                self._resolve = resolve;
                self._reject = reject;
            });

        wrapPromise(p,self);

        this[PGLISTENERS] = [];

        //this.resolve = Deferred.prototype.resolve.bind(this);
        //this.reject = Deferred.prototype.reject.bind(this);
        //this.progress = Deferred.prototype.progress.bind(this);

    };

    function wrapPromise(p,d) {
        var   added = {
                state : function() {
                    if (d.isResolved()) {
                        return 'resolved';
                    }
                    if (d.isRejected()) {
                        return 'rejected';
                    }
                    return 'pending';
                },
                then : function(onResolved,onRejected,onProgress) {
                    if (onProgress) {
                        this.progress(onProgress);
                    }
                    return mixin(Promise.prototype.then.call(this,
                            onResolved && function(args) {
                                if (args && args.__ctx__ !== undefined) {
                                    return onResolved.apply(args.__ctx__,args);
                                } else {
                                    return onResolved(args);
                                }
                            },
                            onRejected && function(args){
                                if (args && args.__ctx__ !== undefined) {
                                    return onRejected.apply(args.__ctx__,args);
                                } else {
                                    return onRejected(args);
                                }
                            }),added);
                },
                progress : function(handler) {
                    d[PGLISTENERS].push(handler);
                    return this;
                }

            };

        added.pipe = added.then;
        return mixin(p,added);

    }

    Deferred.prototype.resolve = function(value) {
        var args = slice.call(arguments);
        return this.resolveWith(null,args);
    };

    Deferred.prototype.resolveWith = function(context,args) {
        args = args ? makeArray(args) : []; 
        args.__ctx__ = context;
        this._resolve(args);
        this._resolved = true;
        return this;
    };

    Deferred.prototype.progress = function(value) {
        try {
          return this[PGLISTENERS].forEach(function (listener) {
            return listener(value);
          });
        } catch (error) {
          this.reject(error);
        }
        return this;
    };

    Deferred.prototype.reject = function(reason) {
        var args = slice.call(arguments);
        return this.rejectWith(null,args);
    };

    Deferred.prototype.rejectWith = function(context,args) {
        args = args ? makeArray(args) : []; 
        args.__ctx__ = context;
        this._reject(args);
        this._rejected = true;
        return this;
    };

    Deferred.prototype.isResolved = function() {
        return !!this._resolved;
    };

    Deferred.prototype.isRejected = function() {
        return !!this._rejected;
    };

    Deferred.prototype.then = function(callback, errback, progback) {
        var p = result(this,"promise");
        return p.then(callback, errback, progback);
    };

    Deferred.prototype.done  = Deferred.prototype.then;

    Deferred.all = function(array) {
        return wrapPromise(Promise.all(array));
    };

    Deferred.first = function(array) {
        return wrapPromise(Promise.race(array));
    };


    Deferred.when = function(valueOrPromise, callback, errback, progback) {
        var receivedPromise = valueOrPromise && typeof valueOrPromise.then === "function";
        var nativePromise = receivedPromise && valueOrPromise instanceof Promise;

        if (!receivedPromise) {
            if (arguments.length > 1) {
                return callback ? callback(valueOrPromise) : valueOrPromise;
            } else {
                return new Deferred().resolve(valueOrPromise);
            }
        } else if (!nativePromise) {
            var deferred = new Deferred(valueOrPromise.cancel);
            valueOrPromise.then(proxy(deferred.resolve,deferred), proxy(deferred.reject,deferred), deferred.progress);
            valueOrPromise = deferred.promise;
        }

        if (callback || errback || progback) {
            return valueOrPromise.then(callback, errback, progback);
        }
        return valueOrPromise;
    };

    Deferred.reject = function(err) {
        var d = new Deferred();
        d.reject(err);
        return d.promise;
    };

    Deferred.resolve = function(data) {
        var d = new Deferred();
        d.resolve.apply(d,arguments);
        return d.promise;
    };

    Deferred.immediate = Deferred.resolve;

    return Deferred;
});
define('skylark-langx/async',[
    "./Deferred",
    "./arrays"
],function(Deferred,arrays){
    var each = arrays.each;
    
    var async = {
        parallel : function(arr,args,ctx) {
            var rets = [];
            ctx = ctx || null;
            args = args || [];

            each(arr,function(i,func){
                rets.push(func.apply(ctx,args));
            });

            return Deferred.all(rets);
        },

        series : function(arr,args,ctx) {
            var rets = [],
                d = new Deferred(),
                p = d.promise;

            ctx = ctx || null;
            args = args || [];

            d.resolve();
            each(arr,function(i,func){
                p = p.then(function(){
                    return func.apply(ctx,args);
                });
                rets.push(p);
            });

            return Deferred.all(rets);
        },

        waterful : function(arr,args,ctx) {
            var d = new Deferred(),
                p = d.promise;

            ctx = ctx || null;
            args = args || [];

            d.resolveWith(ctx,args);

            each(arr,function(i,func){
                p = p.then(func);
            });
            return p;
        }
    };

	return async;	
});
define('skylark-langx/Evented',[
    "./klass",
    "./objects",
	"./types"
],function(klass,objects,types){
	var slice = Array.prototype.slice,
        isDefined = types.isDefined,
        isPlainObject = types.isPlainObject,
		isFunction = types.isFunction,
		isString = types.isString,
		isEmptyObject = types.isEmptyObject,
		mixin = objects.mixin;

    var Evented = klass({
        on: function(events, selector, data, callback, ctx, /*used internally*/ one) {
            var self = this,
                _hub = this._hub || (this._hub = {});

            if (isPlainObject(events)) {
                ctx = callback;
                each(events, function(type, fn) {
                    self.on(type, selector, data, fn, ctx, one);
                });
                return this;
            }

            if (!isString(selector) && !isFunction(callback)) {
                ctx = callback;
                callback = data;
                data = selector;
                selector = undefined;
            }

            if (isFunction(data)) {
                ctx = callback;
                callback = data;
                data = null;
            }

            if (isString(events)) {
                events = events.split(/\s/)
            }

            events.forEach(function(name) {
                (_hub[name] || (_hub[name] = [])).push({
                    fn: callback,
                    selector: selector,
                    data: data,
                    ctx: ctx,
                    one: one
                });
            });

            return this;
        },

        one: function(events, selector, data, callback, ctx) {
            return this.on(events, selector, data, callback, ctx, 1);
        },

        trigger: function(e /*,argument list*/ ) {
            if (!this._hub) {
                return this;
            }

            var self = this;

            if (isString(e)) {
                e = new CustomEvent(e);
            }

            Object.defineProperty(e,"target",{
                value : this
            });

            var args = slice.call(arguments, 1);
            if (isDefined(args)) {
                args = [e].concat(args);
            } else {
                args = [e];
            }
            [e.type || e.name, "all"].forEach(function(eventName) {
                var listeners = self._hub[eventName];
                if (!listeners) {
                    return;
                }

                var len = listeners.length,
                    reCompact = false;

                for (var i = 0; i < len; i++) {
                    var listener = listeners[i];
                    if (e.data) {
                        if (listener.data) {
                            e.data = mixin({}, listener.data, e.data);
                        }
                    } else {
                        e.data = listener.data || null;
                    }
                    listener.fn.apply(listener.ctx, args);
                    if (listener.one) {
                        listeners[i] = null;
                        reCompact = true;
                    }
                }

                if (reCompact) {
                    self._hub[eventName] = compact(listeners);
                }

            });
            return this;
        },

        listened: function(event) {
            var evtArr = ((this._hub || (this._events = {}))[event] || []);
            return evtArr.length > 0;
        },

        listenTo: function(obj, event, callback, /*used internally*/ one) {
            if (!obj) {
                return this;
            }

            // Bind callbacks on obj,
            if (isString(callback)) {
                callback = this[callback];
            }

            if (one) {
                obj.one(event, callback, this);
            } else {
                obj.on(event, callback, this);
            }

            //keep track of them on listening.
            var listeningTo = this._listeningTo || (this._listeningTo = []),
                listening;

            for (var i = 0; i < listeningTo.length; i++) {
                if (listeningTo[i].obj == obj) {
                    listening = listeningTo[i];
                    break;
                }
            }
            if (!listening) {
                listeningTo.push(
                    listening = {
                        obj: obj,
                        events: {}
                    }
                );
            }
            var listeningEvents = listening.events,
                listeningEvent = listeningEvents[event] = listeningEvents[event] || [];
            if (listeningEvent.indexOf(callback) == -1) {
                listeningEvent.push(callback);
            }

            return this;
        },

        listenToOnce: function(obj, event, callback) {
            return this.listenTo(obj, event, callback, 1);
        },

        off: function(events, callback) {
            var _hub = this._hub || (this._hub = {});
            if (isString(events)) {
                events = events.split(/\s/)
            }

            events.forEach(function(name) {
                var evts = _hub[name];
                var liveEvents = [];

                if (evts && callback) {
                    for (var i = 0, len = evts.length; i < len; i++) {
                        if (evts[i].fn !== callback && evts[i].fn._ !== callback)
                            liveEvents.push(evts[i]);
                    }
                }

                if (liveEvents.length) {
                    _hub[name] = liveEvents;
                } else {
                    delete _hub[name];
                }
            });

            return this;
        },
        unlistenTo: function(obj, event, callback) {
            var listeningTo = this._listeningTo;
            if (!listeningTo) {
                return this;
            }
            for (var i = 0; i < listeningTo.length; i++) {
                var listening = listeningTo[i];

                if (obj && obj != listening.obj) {
                    continue;
                }

                var listeningEvents = listening.events;
                for (var eventName in listeningEvents) {
                    if (event && event != eventName) {
                        continue;
                    }

                    var listeningEvent = listeningEvents[eventName];

                    for (var j = 0; j < listeningEvent.length; j++) {
                        if (!callback || callback == listeningEvent[i]) {
                            listening.obj.off(eventName, listeningEvent[i], this);
                            listeningEvent[i] = null;
                        }
                    }

                    listeningEvent = listeningEvents[eventName] = compact(listeningEvent);

                    if (isEmptyObject(listeningEvent)) {
                        listeningEvents[eventName] = null;
                    }

                }

                if (isEmptyObject(listeningEvents)) {
                    listeningTo[i] = null;
                }
            }

            listeningTo = this._listeningTo = compact(listeningTo);
            if (isEmptyObject(listeningTo)) {
                this._listeningTo = null;
            }

            return this;
        }
    });

	return Evented;

});
define('skylark-langx/strings',[
],function(){

     /*
     * Converts camel case into dashes.
     * @param {String} str
     * @return {String}
     * @exapmle marginTop -> margin-top
     */
    function dasherize(str) {
        return str.replace(/::/g, '/')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
            .replace(/([a-z\d])([A-Z])/g, '$1_$2')
            .replace(/_/g, '-')
            .toLowerCase();
    }

    function deserializeValue(value) {
        try {
            return value ?
                value == "true" ||
                (value == "false" ? false :
                    value == "null" ? null :
                    +value + "" == value ? +value :
                    /^[\[\{]/.test(value) ? JSON.parse(value) :
                    value) : value;
        } catch (e) {
            return value;
        }
    }

    function trim(str) {
        return str == null ? "" : String.prototype.trim.call(str);
    }
    function substitute( /*String*/ template,
        /*Object|Array*/
        map,
        /*Function?*/
        transform,
        /*Object?*/
        thisObject) {
        // summary:
        //    Performs parameterized substitutions on a string. Throws an
        //    exception if any parameter is unmatched.
        // template:
        //    a string with expressions in the form `${key}` to be replaced or
        //    `${key:format}` which specifies a format function. keys are case-sensitive.
        // map:
        //    hash to search for substitutions
        // transform:
        //    a function to process all parameters before substitution takes


        thisObject = thisObject || window;
        transform = transform ?
            proxy(thisObject, transform) : function(v) {
                return v;
            };

        function getObject(key, map) {
            if (key.match(/\./)) {
                var retVal,
                    getValue = function(keys, obj) {
                        var _k = keys.pop();
                        if (_k) {
                            if (!obj[_k]) return null;
                            return getValue(keys, retVal = obj[_k]);
                        } else {
                            return retVal;
                        }
                    };
                return getValue(key.split(".").reverse(), map);
            } else {
                return map[key];
            }
        }

        return template.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g,
            function(match, key, format) {
                var value = getObject(key, map);
                if (format) {
                    value = getObject(format, thisObject).call(thisObject, value, key);
                }
                return transform(value, key).toString();
            }); // String
    }

	return {
        camelCase: function(str) {
            return str.replace(/-([\da-z])/g, function(a) {
                return a.toUpperCase().replace('-', '');
            });
        },


        dasherize: dasherize,

        deserializeValue: deserializeValue,

        lowerFirst: function(str) {
            return str.charAt(0).toLowerCase() + str.slice(1);
        },

        serializeValue: function(value) {
            return JSON.stringify(value)
        },


        substitute: substitute,

        trim: trim,

        upperFirst: function(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }
	} ; 

});
define('skylark-langx/Xhr',[
    "./arrays",
    "./Deferred",
    "./Evented",
    "./objects",
    "./funcs",
    "./types"
],function(arrays,Deferred,Evented,objects,funcs,types){
    var each = arrays.each,
        mixin = objects.mixin,
        noop = funcs.noop,
        isArray = types.isArray,
        isFunction = types.isFunction,
        isPlainObject = types.isPlainObject,
        type = types.type;
 
     var getAbsoluteUrl = (function() {
        var a;

        return function(url) {
            if (!a) a = document.createElement('a');
            a.href = url;

            return a.href;
        };
    })();
   
    var Xhr = (function(){
        var jsonpID = 0,
            key,
            name,
            rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            scriptTypeRE = /^(?:text|application)\/javascript/i,
            xmlTypeRE = /^(?:text|application)\/xml/i,
            jsonType = 'application/json',
            htmlType = 'text/html',
            blankRE = /^\s*$/;

        var XhrDefaultOptions = {
            async: true,

            // Default type of request
            type: 'GET',
            // Callback that is executed before request
            beforeSend: noop,
            // Callback that is executed if the request succeeds
            success: noop,
            // Callback that is executed the the server drops error
            error: noop,
            // Callback that is executed on request complete (both: error and success)
            complete: noop,
            // The context for the callbacks
            context: null,
            // Whether to trigger "global" Ajax events
            global: true,

            // MIME types mapping
            // IIS returns Javascript as "application/x-javascript"
            accepts: {
                script: 'text/javascript, application/javascript, application/x-javascript',
                json: 'application/json',
                xml: 'application/xml, text/xml',
                html: 'text/html',
                text: 'text/plain'
            },
            // Whether the request is to another domain
            crossDomain: false,
            // Default timeout
            timeout: 0,
            // Whether data should be serialized to string
            processData: true,
            // Whether the browser should be allowed to cache GET responses
            cache: true,

            xhrFields : {
                withCredentials : true
            }
        };

        function mimeToDataType(mime) {
            if (mime) {
                mime = mime.split(';', 2)[0];
            }
            if (mime) {
                if (mime == htmlType) {
                    return "html";
                } else if (mime == jsonType) {
                    return "json";
                } else if (scriptTypeRE.test(mime)) {
                    return "script";
                } else if (xmlTypeRE.test(mime)) {
                    return "xml";
                }
            }
            return "text";
        }

        function appendQuery(url, query) {
            if (query == '') return url
            return (url + '&' + query).replace(/[&?]{1,2}/, '?')
        }

        // serialize payload and append it to the URL for GET requests
        function serializeData(options) {
            options.data = options.data || options.query;
            if (options.processData && options.data && type(options.data) != "string") {
                options.data = param(options.data, options.traditional);
            }
            if (options.data && (!options.type || options.type.toUpperCase() == 'GET')) {
                options.url = appendQuery(options.url, options.data);
                options.data = undefined;
            }
        }

        function serialize(params, obj, traditional, scope) {
            var t, array = isArray(obj),
                hash = isPlainObject(obj)
            each(obj, function(key, value) {
                t =type(value);
                if (scope) key = traditional ? scope :
                    scope + '[' + (hash || t == 'object' || t == 'array' ? key : '') + ']'
                // handle data in serializeArray() format
                if (!scope && array) params.add(value.name, value.value)
                // recurse into nested objects
                else if (t == "array" || (!traditional && t == "object"))
                    serialize(params, value, traditional, key)
                else params.add(key, value)
            })
        }

        var param = function(obj, traditional) {
            var params = []
            params.add = function(key, value) {
                if (isFunction(value)) value = value()
                if (value == null) value = ""
                this.push(escape(key) + '=' + escape(value))
            }
            serialize(params, obj, traditional)
            return params.join('&').replace(/%20/g, '+')
        };

        var Xhr = Evented.inherit({
            klassName : "Xhr",

            _request  : function(args) {
                var _ = this._,
                    self = this,
                    options = mixin({},XhrDefaultOptions,_.options,args),
                    xhr = _.xhr = new XMLHttpRequest();

                serializeData(options)

                var dataType = options.dataType || options.handleAs,
                    mime = options.mimeType || options.accepts[dataType],
                    headers = options.headers,
                    xhrFields = options.xhrFields,
                    isFormData = options.data && options.data instanceof FormData,
                    basicAuthorizationToken = options.basicAuthorizationToken,
                    type = options.type,
                    url = options.url,
                    async = options.async,
                    user = options.user , 
                    password = options.password,
                    deferred = new Deferred(),
                    contentType = isFormData ? false : 'application/x-www-form-urlencoded';

                if (xhrFields) {
                    for (name in xhrFields) {
                        xhr[name] = xhrFields[name];
                    }
                }

                if (mime && mime.indexOf(',') > -1) {
                    mime = mime.split(',', 2)[0];
                }
                if (mime && xhr.overrideMimeType) {
                    xhr.overrideMimeType(mime);
                }

                //if (dataType) {
                //    xhr.responseType = dataType;
                //}

                var finish = function() {
                    xhr.onloadend = noop;
                    xhr.onabort = noop;
                    xhr.onprogress = noop;
                    xhr.ontimeout = noop;
                    xhr = null;
                }
                var onloadend = function() {
                    var result, error = false
                    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && getAbsoluteUrl(url).startsWith('file:'))) {
                        dataType = dataType || mimeToDataType(options.mimeType || xhr.getResponseHeader('content-type'));

                        result = xhr.responseText;
                        try {
                            if (dataType == 'script') {
                                eval(result);
                            } else if (dataType == 'xml') {
                                result = xhr.responseXML;
                            } else if (dataType == 'json') {
                                result = blankRE.test(result) ? null : JSON.parse(result);
                            } else if (dataType == "blob") {
                                result = Blob([xhrObj.response]);
                            } else if (dataType == "arraybuffer") {
                                result = xhr.reponse;
                            }
                        } catch (e) { 
                            error = e;
                        }

                        if (error) {
                            deferred.reject(error,xhr.status,xhr);
                        } else {
                            deferred.resolve(result,xhr.status,xhr);
                        }
                    } else {
                        deferred.reject(new Error(xhr.statusText),xhr.status,xhr);
                    }
                    finish();
                };

                var onabort = function() {
                    if (deferred) {
                        deferred.reject(new Error("abort"),xhr.status,xhr);
                    }
                    finish();                 
                }
 
                var ontimeout = function() {
                    if (deferred) {
                        deferred.reject(new Error("timeout"),xhr.status,xhr);
                    }
                    finish();                 
                }

                var onprogress = function(evt) {
                    if (deferred) {
                        deferred.progress(evt,xhr.status,xhr);
                    }
                }

                xhr.onloadend = onloadend;
                xhr.onabort = onabort;
                xhr.ontimeout = ontimeout;
                xhr.onprogress = onprogress;

                xhr.open(type, url, async, user, password);
               
                if (headers) {
                    for ( var key in headers) {
                        var value = headers[key];
 
                        if(key.toLowerCase() === 'content-type'){
                            contentType = headers[hdr];
                        } else {
                           xhr.setRequestHeader(key, value);
                        }
                    }
                }   

                if  (contentType && contentType !== false){
                    xhr.setRequestHeader('Content-Type', contentType);
                }

                if(!headers || !('X-Requested-With' in headers)){
                    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                }


                //If basicAuthorizationToken is defined set its value into "Authorization" header
                if (basicAuthorizationToken) {
                    xhr.setRequestHeader("Authorization", basicAuthorizationToken);
                }

                xhr.send(options.data ? options.data : null);

                return deferred.promise;

            },

            "abort": function() {
                var _ = this._,
                    xhr = _.xhr;

                if (xhr) {
                    xhr.abort();
                }    
            },


            "request": function(args) {
                return this._request(args);
            },

            get : function(args) {
                args = args || {};
                args.type = "GET";
                return this._request(args);
            },

            post : function(args) {
                args = args || {};
                args.type = "POST";
                return this._request(args);
            },

            patch : function(args) {
                args = args || {};
                args.type = "PATCH";
                return this._request(args);
            },

            put : function(args) {
                args = args || {};
                args.type = "PUT";
                return this._request(args);
            },

            del : function(args) {
                args = args || {};
                args.type = "DELETE";
                return this._request(args);
            },

            "init": function(options) {
                this._ = {
                    options : options || {}
                };
            }
        });

        ["request","get","post","put","del","patch"].forEach(function(name){
            Xhr[name] = function(url,args) {
                var xhr = new Xhr({"url" : url});
                return xhr[name](args);
            };
        });

        Xhr.defaultOptions = XhrDefaultOptions;
        Xhr.param = param;

        return Xhr;
    })();

	return Xhr;	
});
define('skylark-langx/Restful',[
    "./Evented",
    "./objects",
    "./strings",
    "./Xhr"
],function(Evented,objects,strings,Xhr){
    var mixin = objects.mixin,
        substitute = strings.substitute;

    var Restful = Evented.inherit({
        "klassName" : "Restful",

        "idAttribute": "id",
        
        getBaseUrl : function(args) {
            //$$baseEndpoint : "/files/${fileId}/comments",
            var baseEndpoint = substitute(this.baseEndpoint,args),
                baseUrl = this.server + this.basePath + baseEndpoint;
            if (args[this.idAttribute]!==undefined) {
                baseUrl = baseUrl + "/" + args[this.idAttribute]; 
            }
            return baseUrl;
        },
        _head : function(args) {
            //get resource metadata .
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
        },
        _get : function(args) {
            //get resource ,one or list .
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, null if list
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
            return Xhr.get(this.getBaseUrl(args),args);
        },
        _post  : function(args,verb) {
            //create or move resource .
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "data" : body // the own data,required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
            //verb : the verb ,ex: copy,touch,trash,untrash,watch
            var url = this.getBaseUrl(args);
            if (verb) {
                url = url + "/" + verb;
            }
            return Xhr.post(url, args);
        },

        _put  : function(args,verb) {
            //update resource .
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "data" : body // the own data,required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
            //verb : the verb ,ex: copy,touch,trash,untrash,watch
            var url = this.getBaseUrl(args);
            if (verb) {
                url = url + "/" + verb;
            }
            return Xhr.put(url, args);
        },

        _delete : function(args) {
            //delete resource . 
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}         

            // HTTP request : DELETE http://center.utilhub.com/registry/v1/apps/{appid}
            var url = this.getBaseUrl(args);
            return Xhr.del(url);
        },

        _patch : function(args){
            //update resource metadata. 
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "data" : body // the own data,required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
            var url = this.getBaseUrl(args);
            return Xhr.patch(url, args);
        },
        query: function(params) {
            
            return this._post(params);
        },

        retrieve: function(params) {
            return this._get(params);
        },

        create: function(params) {
            return this._post(params);
        },

        update: function(params) {
            return this._put(params);
        },

        delete: function(params) {
            // HTTP request : DELETE http://center.utilhub.com/registry/v1/apps/{appid}
            return this._delete(params);
        },

        patch: function(params) {
           // HTTP request : PATCH http://center.utilhub.com/registry/v1/apps/{appid}
            return this._patch(params);
        },
        init: function(params) {
            mixin(this,params);
 //           this._xhr = XHRx();
       }
    });

    return Restful;
});
define('skylark-langx/Stateful',[
	"./Evented"
],function(Evented){
    var Stateful = Evented.inherit({
        init : function(attributes, options) {
            var attrs = attributes || {};
            options || (options = {});
            this.cid = uniqueId(this.cidPrefix);
            this.attributes = {};
            if (options.collection) this.collection = options.collection;
            if (options.parse) attrs = this.parse(attrs, options) || {};
            var defaults = result(this, 'defaults');
            attrs = mixin({}, defaults, attrs);
            this.set(attrs, options);
            this.changed = {};
        },

        // A hash of attributes whose current and previous value differ.
        changed: null,

        // The value returned during the last failed validation.
        validationError: null,

        // The default name for the JSON `id` attribute is `"id"`. MongoDB and
        // CouchDB users may want to set this to `"_id"`.
        idAttribute: 'id',

        // The prefix is used to create the client id which is used to identify models locally.
        // You may want to override this if you're experiencing name clashes with model ids.
        cidPrefix: 'c',


        // Return a copy of the model's `attributes` object.
        toJSON: function(options) {
          return clone(this.attributes);
        },


        // Get the value of an attribute.
        get: function(attr) {
          return this.attributes[attr];
        },

        // Returns `true` if the attribute contains a value that is not null
        // or undefined.
        has: function(attr) {
          return this.get(attr) != null;
        },

        // Set a hash of model attributes on the object, firing `"change"`. This is
        // the core primitive operation of a model, updating the data and notifying
        // anyone who needs to know about the change in state. The heart of the beast.
        set: function(key, val, options) {
          if (key == null) return this;

          // Handle both `"key", value` and `{key: value}` -style arguments.
          var attrs;
          if (typeof key === 'object') {
            attrs = key;
            options = val;
          } else {
            (attrs = {})[key] = val;
          }

          options || (options = {});

          // Run validation.
          if (!this._validate(attrs, options)) return false;

          // Extract attributes and options.
          var unset      = options.unset;
          var silent     = options.silent;
          var changes    = [];
          var changing   = this._changing;
          this._changing = true;

          if (!changing) {
            this._previousAttributes = clone(this.attributes);
            this.changed = {};
          }

          var current = this.attributes;
          var changed = this.changed;
          var prev    = this._previousAttributes;

          // For each `set` attribute, update or delete the current value.
          for (var attr in attrs) {
            val = attrs[attr];
            if (!isEqual(current[attr], val)) changes.push(attr);
            if (!isEqual(prev[attr], val)) {
              changed[attr] = val;
            } else {
              delete changed[attr];
            }
            unset ? delete current[attr] : current[attr] = val;
          }

          // Update the `id`.
          if (this.idAttribute in attrs) this.id = this.get(this.idAttribute);

          // Trigger all relevant attribute changes.
          if (!silent) {
            if (changes.length) this._pending = options;
            for (var i = 0; i < changes.length; i++) {
              this.trigger('change:' + changes[i], this, current[changes[i]], options);
            }
          }

          // You might be wondering why there's a `while` loop here. Changes can
          // be recursively nested within `"change"` events.
          if (changing) return this;
          if (!silent) {
            while (this._pending) {
              options = this._pending;
              this._pending = false;
              this.trigger('change', this, options);
            }
          }
          this._pending = false;
          this._changing = false;
          return this;
        },

        // Remove an attribute from the model, firing `"change"`. `unset` is a noop
        // if the attribute doesn't exist.
        unset: function(attr, options) {
          return this.set(attr, void 0, mixin({}, options, {unset: true}));
        },

        // Clear all attributes on the model, firing `"change"`.
        clear: function(options) {
          var attrs = {};
          for (var key in this.attributes) attrs[key] = void 0;
          return this.set(attrs, mixin({}, options, {unset: true}));
        },

        // Determine if the model has changed since the last `"change"` event.
        // If you specify an attribute name, determine if that attribute has changed.
        hasChanged: function(attr) {
          if (attr == null) return !isEmptyObject(this.changed);
          return this.changed[attr] !== undefined;
        },

        // Return an object containing all the attributes that have changed, or
        // false if there are no changed attributes. Useful for determining what
        // parts of a view need to be updated and/or what attributes need to be
        // persisted to the server. Unset attributes will be set to undefined.
        // You can also pass an attributes object to diff against the model,
        // determining if there *would be* a change.
        changedAttributes: function(diff) {
          if (!diff) return this.hasChanged() ? clone(this.changed) : false;
          var old = this._changing ? this._previousAttributes : this.attributes;
          var changed = {};
          for (var attr in diff) {
            var val = diff[attr];
            if (isEqual(old[attr], val)) continue;
            changed[attr] = val;
          }
          return !isEmptyObject(changed) ? changed : false;
        },

        // Get the previous value of an attribute, recorded at the time the last
        // `"change"` event was fired.
        previous: function(attr) {
          if (attr == null || !this._previousAttributes) return null;
          return this._previousAttributes[attr];
        },

        // Get all of the attributes of the model at the time of the previous
        // `"change"` event.
        previousAttributes: function() {
          return clone(this._previousAttributes);
        },

        // Create a new model with identical attributes to this one.
        clone: function() {
          return new this.constructor(this.attributes);
        },

        // A model is new if it has never been saved to the server, and lacks an id.
        isNew: function() {
          return !this.has(this.idAttribute);
        },

        // Check if the model is currently in a valid state.
        isValid: function(options) {
          return this._validate({}, mixin({}, options, {validate: true}));
        },

        // Run validation against the next complete set of model attributes,
        // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
        _validate: function(attrs, options) {
          if (!options.validate || !this.validate) return true;
          attrs = mixin({}, this.attributes, attrs);
          var error = this.validationError = this.validate(attrs, options) || null;
          if (!error) return true;
          this.trigger('invalid', this, error, mixin(options, {validationError: error}));
          return false;
        }
    });

	return Stateful;
});
define('skylark-langx/langx',[
    "./skylark",
    "./arrays",
    "./ArrayStore",
    "./aspect",
    "./async",
    "./Deferred",
    "./Evented",
    "./funcs",
    "./klass",
    "./objects",
    "./Restful",
    "./Stateful",
    "./strings",
    "./types",
    "./Xhr"
], function(skylark,arrays,ArrayStore,aspect,async,Deferred,Evented,funcs,klass,objects,Restful,Stateful,strings,types,Xhr) {
    "use strict";
    var toString = {}.toString,
        concat = Array.prototype.concat,
        indexOf = Array.prototype.indexOf,
        slice = Array.prototype.slice,
        filter = Array.prototype.filter,
        mixin = objects.mixin,
        safeMixin = objects.safeMixin,
        isFunction = types.isFunction;


    function createEvent(type, props) {
        var e = new CustomEvent(type, props);

        return safeMixin(e, props);
    }
    

    function funcArg(context, arg, idx, payload) {
        return isFunction(arg) ? arg.call(context, idx, payload) : arg;
    }

    function getQueryParams(url) {
        var url = url || window.location.href,
            segs = url.split("?"),
            params = {};

        if (segs.length > 1) {
            segs[1].split("&").forEach(function(queryParam) {
                var nv = queryParam.split('=');
                params[nv[0]] = nv[1];
            });
        }
        return params;
    }


    function toPixel(value) {
        // style values can be floats, client code may want
        // to round for integer pixels.
        return parseFloat(value) || 0;
    }


    var _uid = 1;

    function uid(obj) {
        return obj._uid || (obj._uid = _uid++);
    }

    var idCounter = 0;
    function uniqueId (prefix) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
    }


    function langx() {
        return langx;
    }

    mixin(langx, {
        createEvent : createEvent,

        funcArg: funcArg,

        getQueryParams: getQueryParams,

        toPixel: toPixel,

        uid: uid,

        uniqueId: uniqueId,

        URL: typeof window !== "undefined" ? window.URL || window.webkitURL : null

    });


    mixin(langx, arrays,aspect,funcs,objects,strings,types,{
        ArrayStore : ArrayStore,

        async : async,
        
        Deferred: Deferred,

        Evented: Evented,

        klass : klass,

        Restful: Restful,
        
        Stateful: Stateful,

        Xhr: Xhr

    });

    return skylark.langx = langx;
});
define('skylark-utils-dom/langx',[
    "skylark-langx/langx"
], function(langx) {
    return langx;
});

define('skylark-utils-dom/browser',[
    "./dom",
    "./langx"
], function(dom,langx) {
    "use strict";
 
    var checkedCssProperties = {
            "transitionproperty": "TransitionProperty",
        },
        transEndEventNames = {
          WebkitTransition : 'webkitTransitionEnd',
          MozTransition    : 'transitionend',
          OTransition      : 'oTransitionEnd otransitionend',
          transition       : 'transitionend'
        },
        transEndEventName = null;


    var css3PropPrefix = "",
        css3StylePrefix = "",
        css3EventPrefix = "",

        cssStyles = {},
        cssProps = {},

        vendorPrefix,
        vendorPrefixRE,
        vendorPrefixesRE = /^(Webkit|webkit|O|Moz|moz|ms)(.*)$/,

        document = window.document,
        testEl = document.createElement("div"),

        matchesSelector = testEl.webkitMatchesSelector ||
                          testEl.mozMatchesSelector ||
                          testEl.oMatchesSelector ||
                          testEl.matchesSelector,

        requestFullScreen = testEl.requestFullscreen || 
                            testEl.webkitRequestFullscreen || 
                            testEl.mozRequestFullScreen || 
                            testEl.msRequestFullscreen,

        exitFullScreen =  document.exitFullscreen ||
                          document.webkitCancelFullScreen ||
                          document.mozCancelFullScreen ||
                          document.msExitFullscreen,

        testStyle = testEl.style;

    for (var name in testStyle) {
        var matched = name.match(vendorPrefixRE || vendorPrefixesRE);
        if (matched) {
            if (!vendorPrefixRE) {
                vendorPrefix = matched[1];
                vendorPrefixRE = new RegExp("^(" + vendorPrefix + ")(.*)$");

                css3StylePrefix = vendorPrefix;
                css3PropPrefix = '-' + vendorPrefix.toLowerCase() + '-';
                css3EventPrefix = vendorPrefix.toLowerCase();
            }

            cssStyles[langx.lowerFirst(matched[2])] = name;
            var cssPropName = langx.dasherize(matched[2]);
            cssProps[cssPropName] = css3PropPrefix + cssPropName;

            if (transEndEventNames[name]) {
              transEndEventName = transEndEventNames[name];
            }
        }
    }

    if (!transEndEventName) {
        if (testStyle["transition"] !== undefined) {
            transEndEventName = transEndEventNames["transition"];
        }
    }

    function normalizeCssEvent(name) {
        return css3EventPrefix ? css3EventPrefix + name : name.toLowerCase();
    }

    function normalizeCssProperty(name) {
        return cssProps[name] || name;
    }

    function normalizeStyleProperty(name) {
        return cssStyles[name] || name;
    }

    function browser() {
        return browser;
    }

    langx.mixin(browser, {
        css3PropPrefix: css3PropPrefix,

        isIE : !!/msie/i.exec( window.navigator.userAgent ),

        normalizeStyleProperty: normalizeStyleProperty,

        normalizeCssProperty: normalizeCssProperty,

        normalizeCssEvent: normalizeCssEvent,

        matchesSelector: matchesSelector,

        requestFullScreen : requestFullScreen,

        exitFullscreen : requestFullScreen,

        location: function() {
            return window.location;
        },

        support : {

        }

    });

    if  (transEndEventName) {
        browser.support.transition = {
            end : transEndEventName
        };
    }

    testEl = null;

    return dom.browser = browser;
});

define('skylark-utils-dom/styler',[
    "./dom",
    "./langx"
], function(dom, langx) {
    var every = Array.prototype.every,
        forEach = Array.prototype.forEach,
        camelCase = langx.camelCase,
        dasherize = langx.dasherize;

    function maybeAddPx(name, value) {
        return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
    }

    var cssNumber = {
            'column-count': 1,
            'columns': 1,
            'font-weight': 1,
            'line-height': 1,
            'opacity': 1,
            'z-index': 1,
            'zoom': 1
        },
        classReCache = {

        };

    function classRE(name) {
        return name in classReCache ?
            classReCache[name] : (classReCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'));
    }

    // access className property while respecting SVGAnimatedString
    /*
     * Adds the specified class(es) to each element in the set of matched elements.
     * @param {HTMLElement} node
     * @param {String} value
     */
    function className(node, value) {
        var klass = node.className || '',
            svg = klass && klass.baseVal !== undefined

        if (value === undefined) return svg ? klass.baseVal : klass
        svg ? (klass.baseVal = value) : (node.className = value)
    }

    function disabled(elm, value ) {
        if (arguments.length < 2) {
            return !!this.dom.disabled;
        }

        elm.disabled = value;

        return this;
    }

    var elementDisplay = {};

    function defaultDisplay(nodeName) {
        var element, display
        if (!elementDisplay[nodeName]) {
            element = document.createElement(nodeName)
            document.body.appendChild(element)
            display = getComputedStyle(element, '').getPropertyValue("display")
            element.parentNode.removeChild(element)
            display == "none" && (display = "block")
            elementDisplay[nodeName] = display
        }
        return elementDisplay[nodeName]
    }
    /*
     * Display the matched elements.
     * @param {HTMLElement} elm
     */
    function show(elm) {
        styler.css(elm, "display", "");
        if (styler.css(elm, "display") == "none") {
            styler.css(elm, "display", defaultDisplay(elm.nodeName));
        }
        return this;
    }

    function isInvisible(elm) {
        return styler.css(elm, "display") == "none" || styler.css(elm, "opacity") == 0;
    }

    /*
     * Hide the matched elements.
     * @param {HTMLElement} elm
     */
    function hide(elm) {
        styler.css(elm, "display", "none");
        return this;
    }

    /*
     * Adds the specified class(es) to each element in the set of matched elements.
     * @param {HTMLElement} elm
     * @param {String} name
     */
    function addClass(elm, name) {
        if (!name) return this
        var cls = className(elm),
            names;
        if (langx.isString(name)) {
            names = name.split(/\s+/g);
        } else {
            names = name;
        }
        names.forEach(function(klass) {
            var re = classRE(klass);
            if (!cls.match(re)) {
                cls += (cls ? " " : "") + klass;
            }
        });

        className(elm, cls);

        return this;
    }
    /*
     * Get the value of a computed style property for the first element in the set of matched elements or set one or more CSS properties for every matched element.
     * @param {HTMLElement} elm
     * @param {String} property
     * @param {Any} value
     */
    function css(elm, property, value) {
        if (arguments.length < 3) {
            var computedStyle,
                computedStyle = getComputedStyle(elm, '')
            if (langx.isString(property)) {
                return elm.style[camelCase(property)] || computedStyle.getPropertyValue(dasherize(property))
            } else if (langx.isArrayLike(property)) {
                var props = {}
                forEach.call(property, function(prop) {
                    props[prop] = (elm.style[camelCase(prop)] || computedStyle.getPropertyValue(dasherize(prop)))
                })
                return props
            }
        }

        var css = '';
        if (typeof(property) == 'string') {
            if (!value && value !== 0) {
                elm.style.removeProperty(dasherize(property));
            } else {
                css = dasherize(property) + ":" + maybeAddPx(property, value)
            }
        } else {
            for (key in property) {
                if (property[key] === undefined) {
                    continue;
                }
                if (!property[key] && property[key] !== 0) {
                    elm.style.removeProperty(dasherize(key));
                } else {
                    css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
                }
            }
        }

        elm.style.cssText += ';' + css;
        return this;
    }

    /*
     * Determine whether any of the matched elements are assigned the given class.
     * @param {HTMLElement} elm
     * @param {String} name
     */
    function hasClass(elm, name) {
        var re = classRE(name);
        return elm.className && elm.className.match(re);
    }

    /*
     * Remove a single class, multiple classes, or all classes from each element in the set of matched elements.
     * @param {HTMLElement} elm
     * @param {String} name
     */
    function removeClass(elm, name) {
        if (name) {
            var cls = className(elm),
                names;

            if (langx.isString(name)) {
                names = name.split(/\s+/g);
            } else {
                names = name;
            }

            names.forEach(function(klass) {
                var re = classRE(klass);
                if (cls.match(re)) {
                    cls = cls.replace(re, " ");
                }
            });

            className(elm, cls.trim());
        } else {
            className(elm, "");
        }

        return this;
    }

    /*
     * Add or remove one or more classes from the specified element.
     * @param {HTMLElement} elm
     * @param {String} name
     * @param {} when
     */
    function toggleClass(elm, name, when) {
        var self = this;
        name.split(/\s+/g).forEach(function(klass) {
            if (when === undefined) {
                when = !self.hasClass(elm, klass);
            }
            if (when) {
                self.addClass(elm, klass);
            } else {
                self.removeClass(elm, klass)
            }
        });

        return self;
    }

    var styler = function() {
        return styler;
    };

    langx.mixin(styler, {
        autocssfix: false,
        cssHooks: {

        },

        addClass: addClass,
        className: className,
        css: css,
        disabled : disabled,        
        hasClass: hasClass,
        hide: hide,
        isInvisible: isInvisible,
        removeClass: removeClass,
        show: show,
        toggleClass: toggleClass
    });

    return dom.styler = styler;
});
define('skylark-utils-dom/noder',[
    "./dom",
    "./langx",
    "./browser",
    "./styler"
], function(dom, langx, browser, styler) {
    var isIE = !!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g),
        fragmentRE = /^\s*<(\w+|!)[^>]*>/,
        singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
        div = document.createElement("div"),
        table = document.createElement('table'),
        tableBody = document.createElement('tbody'),
        tableRow = document.createElement('tr'),
        containers = {
            'tr': tableBody,
            'tbody': table,
            'thead': table,
            'tfoot': table,
            'td': tableRow,
            'th': tableRow,
            '*': div
        },
        rootNodeRE = /^(?:body|html)$/i,
        map = Array.prototype.map,
        slice = Array.prototype.slice;

    function ensureNodes(nodes, copyByClone) {
        if (!langx.isArrayLike(nodes)) {
            nodes = [nodes];
        }
        if (copyByClone) {
            nodes = map.call(nodes, function(node) {
                return node.cloneNode(true);
            });
        }
        return langx.flatten(nodes);
    }

    function nodeName(elm, chkName) {
        var name = elm.nodeName && elm.nodeName.toLowerCase();
        if (chkName !== undefined) {
            return name === chkName.toLowerCase();
        }
        return name;
    };


    function activeElement(doc) {
        doc = doc || document;
        var el;

        // Support: IE 9 only
        // IE9 throws an "Unspecified error" accessing document.activeElement from an <iframe>
        try {
            el = doc.activeElement;
        } catch ( error ) {
            el = doc.body;
        }

        // Support: IE 9 - 11 only
        // IE may return null instead of an element
        // Interestingly, this only seems to occur when NOT in an iframe
        if ( !el ) {
            el = doc.body;
        }

        // Support: IE 11 only
        // IE11 returns a seemingly empty object in some cases when accessing
        // document.activeElement from an <iframe>
        if ( !el.nodeName ) {
            el = doc.body;
        }

        return el;
    };

    function after(node, placing, copyByClone) {
        var refNode = node,
            parent = refNode.parentNode;
        if (parent) {
            var nodes = ensureNodes(placing, copyByClone),
                refNode = refNode.nextSibling;

            for (var i = 0; i < nodes.length; i++) {
                if (refNode) {
                    parent.insertBefore(nodes[i], refNode);
                } else {
                    parent.appendChild(nodes[i]);
                }
            }
        }
        return this;
    }

    function append(node, placing, copyByClone) {
        var parentNode = node,
            nodes = ensureNodes(placing, copyByClone);
        for (var i = 0; i < nodes.length; i++) {
            parentNode.appendChild(nodes[i]);
        }
        return this;
    }

    function before(node, placing, copyByClone) {
        var refNode = node,
            parent = refNode.parentNode;
        if (parent) {
            var nodes = ensureNodes(placing, copyByClone);
            for (var i = 0; i < nodes.length; i++) {
                parent.insertBefore(nodes[i], refNode);
            }
        }
        return this;
    }
    /*   
     * Get the children of the specified node, including text and comment nodes.
     * @param {HTMLElement} elm
     */
    function contents(elm) {
        if (nodeName(elm, "iframe")) {
            return elm.contentDocument;
        }
        return elm.childNodes;
    }

    /*   
     * Create a element and set attributes on it.
     * @param {HTMLElement} tag
     * @param {props} props
     * @param } parent
     */
    function createElement(tag, props, parent) {
        var node = document.createElement(tag);
        if (props) {
            for (var name in props) {
                node.setAttribute(name, props[name]);
            }
        }
        if (parent) {
            append(parent, node);
        }
        return node;
    }

    /*   
     * Create a DocumentFragment from the HTML fragment.
     * @param {String} html
     */
    function createFragment(html) {
        // A special case optimization for a single tag
        html = langx.trim(html);
        if (singleTagRE.test(html)) {
            return [createElement(RegExp.$1)];
        }

        var name = fragmentRE.test(html) && RegExp.$1
        if (!(name in containers)) {
            name = "*"
        }
        var container = containers[name];
        container.innerHTML = "" + html;
        dom = slice.call(container.childNodes);

        dom.forEach(function(node) {
            container.removeChild(node);
        })

        return dom;
    }

    /*   
     * Create a deep copy of the set of matched elements.
     * @param {HTMLElement} node
     * @param {Boolean} deep
     */
    function clone(node, deep) {
        var self = this,
            clone;

        // TODO: Add feature detection here in the future
        if (!isIE || node.nodeType !== 1 || deep) {
            return node.cloneNode(deep);
        }

        // Make a HTML5 safe shallow copy
        if (!deep) {
            clone = document.createElement(node.nodeName);

            // Copy attribs
            each(self.getAttribs(node), function(attr) {
                self.setAttrib(clone, attr.nodeName, self.getAttrib(node, attr.nodeName));
            });

            return clone;
        }
    }

    /*   
     * Check to see if a dom node is a descendant of another dom node .
     * @param {String} node
     * @param {Node} child
     */
    function contains(node, child) {
        return isChildOf(child, node);
    }

    /*   
     * Create a new Text node.
     * @param {String} text
     * @param {Node} child
     */
    function createTextNode(text) {
        return document.createTextNode(text);
    }

    /*   
     * Get the current document object.
     */
    function doc() {
        return document;
    }

    /*   
     * Remove all child nodes of the set of matched elements from the DOM.
     * @param {Object} node
     */
    function empty(node) {
        while (node.hasChildNodes()) {
            var child = node.firstChild;
            node.removeChild(child);
        }
        return this;
    }

    var fulledEl = null;

    function fullScreen(el) {
        if (el === false) {
            browser.exitFullScreen.apply(document);
        } else if (el) {
            browser.requestFullScreen.apply(el);
            fulledEl = el;
        } else {
            return (
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            )
        }
    }


    // Selectors
    function focusable( element, hasTabindex ) {
        var map, mapName, img, focusableIfVisible, fieldset,
            nodeName = element.nodeName.toLowerCase();

        if ( "area" === nodeName ) {
            map = element.parentNode;
            mapName = map.name;
            if ( !element.href || !mapName || map.nodeName.toLowerCase() !== "map" ) {
                return false;
            }
            img = $( "img[usemap='#" + mapName + "']" );
            return img.length > 0 && img.is( ":visible" );
        }

        if ( /^(input|select|textarea|button|object)$/.test( nodeName ) ) {
            focusableIfVisible = !element.disabled;

            if ( focusableIfVisible ) {

                // Form controls within a disabled fieldset are disabled.
                // However, controls within the fieldset's legend do not get disabled.
                // Since controls generally aren't placed inside legends, we skip
                // this portion of the check.
                fieldset = $( element ).closest( "fieldset" )[ 0 ];
                if ( fieldset ) {
                    focusableIfVisible = !fieldset.disabled;
                }
            }
        } else if ( "a" === nodeName ) {
            focusableIfVisible = element.href || hasTabindex;
        } else {
            focusableIfVisible = hasTabindex;
        }

        return focusableIfVisible && $( element ).is( ":visible" ) && visible( $( element ) );
    };


   var rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi;
 
    /*   
     * Get the HTML contents of the first element in the set of matched elements.
     * @param {HTMLElement} node
     * @param {String} html
     */
    function html(node, html) {
        if (html === undefined) {
            return node.innerHTML;
        } else {
            this.empty(node);
            html = html || "";
            if (langx.isString(html)) {
                html = html.replace( rxhtmlTag, "<$1></$2>" );
            }
            if (langx.isString(html) || langx.isNumber(html)) {               
                node.innerHTML = html;
            } else if (langx.isArrayLike(html)) {
                for (var i = 0; i < html.length; i++) {
                    node.appendChild(html[i]);
                }
            } else {
                node.appendChild(html);
            }
        }
    }


    /*   
     * Check to see if a dom node is a descendant of another dom node.
     * @param {Node} node
     * @param {Node} parent
     * @param {Node} directly
     */
    function isChildOf(node, parent, directly) {
        if (directly) {
            return node.parentNode === parent;
        }
        if (document.documentElement.contains) {
            return parent.contains(node);
        }
        while (node) {
            if (parent === node) {
                return true;
            }

            node = node.parentNode;
        }

        return false;
    }

    /*   
     * Check to see if a dom node is a descendant of another dom node.
     * @param {Node} node
     * @param {Node} parent
     * @param {Node} directly
     */
    function isDoc(node) {
        return node != null && node.nodeType == node.DOCUMENT_NODE
    }

    /*   
     * Get the owner document object for the specified element.
     * @param {Node} elm
     */
    function ownerDoc(elm) {
        if (!elm) {
            return document;
        }

        if (elm.nodeType == 9) {
            return elm;
        }

        return elm.ownerDocument;
    }

    /*   
     *
     * @param {Node} elm
     */
    function ownerWindow(elm) {
        var doc = ownerDoc(elm);
        return doc.defaultView || doc.parentWindow;
    }

    /*   
     * insert one or more nodes as the first children of the specified node.
     * @param {Node} node
     * @param {Node or ArrayLike} placing
     * @param {Boolean Optional} copyByClone
     */
    function prepend(node, placing, copyByClone) {
        var parentNode = node,
            refNode = parentNode.firstChild,
            nodes = ensureNodes(placing, copyByClone);
        for (var i = 0; i < nodes.length; i++) {
            if (refNode) {
                parentNode.insertBefore(nodes[i], refNode);
            } else {
                parentNode.appendChild(nodes[i]);
            }
        }
        return this;
    }

    /*   
     *
     * @param {Node} elm
     */
    function offsetParent(elm) {
        var parent = elm.offsetParent || document.body;
        while (parent && !rootNodeRE.test(parent.nodeName) && styler.css(parent, "position") == "static") {
            parent = parent.offsetParent;
        }
        return parent;
    }

    /*   
     *
     * @param {Node} elm
     * @param {Node} params
     */
    function overlay(elm, params) {
        var overlayDiv = createElement("div", params);
        styler.css(overlayDiv, {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 0x7FFFFFFF,
            opacity: 0.7
        });
        elm.appendChild(overlayDiv);
        return overlayDiv;

    }

    /*   
     * Remove the set of matched elements from the DOM.
     * @param {Node} node
     */
    function remove(node) {
        if (node && node.parentNode) {
            try {
                node.parentNode.removeChild(node);
            } catch (e) {
                console.warn("The node is already removed", e);
            }
        }
        return this;
    }

    function removeChild(node,children) {
        if (!langx.isArrayLike(children)) {
            children = [children];
        }
        for (var i=0;i<children.length;i++) {
            node.removeChild(children[i]);
        }

        return this;
    }

    function scrollParent( elm, includeHidden ) {
        var position = styler.css(elm,"position" ),
            excludeStaticParent = position === "absolute",
            overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/,
            scrollParent = this.parents().filter( function() {
                var parent = $( this );
                if ( excludeStaticParent && parent.css( "position" ) === "static" ) {
                    return false;
                }
                return overflowRegex.test( parent.css( "overflow" ) + parent.css( "overflow-y" ) +
                    parent.css( "overflow-x" ) );
            } ).eq( 0 );

        return position === "fixed" || !scrollParent.length ?
            $( this[ 0 ].ownerDocument || document ) :
            scrollParent;
    };

        /*   
     * Replace an old node with the specified node.
     * @param {Node} node
     * @param {Node} oldNode
     */
    function replace(node, oldNode) {
        oldNode.parentNode.replaceChild(node, oldNode);
        return this;
    }

    /*   
     * Replace an old node with the specified node.
     * @param {HTMLElement} elm
     * @param {Node} params
     */
    function throb(elm, params) {
        params = params || {};
        var self = this,
            text = params.text,
            style = params.style,
            time = params.time,
            callback = params.callback,
            timer,
            throbber = this.createElement("div", {
                className: params.className || "throbber",
                style: style
            }),
            _overlay = overlay(throbber, {
                className: 'overlay fade'
            }),
            throb = this.createElement("div", {
                className: "throb"
            }),
            textNode = this.createTextNode(text || ""),
            remove = function() {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                if (throbber) {
                    self.remove(throbber);
                    throbber = null;
                }
            },
            update = function(params) {
                if (params && params.text && throbber) {
                    textNode.nodeValue = params.text;
                }
            };
        throb.appendChild(textNode);
        throbber.appendChild(throb);
        elm.appendChild(throbber);
        var end = function() {
            remove();
            if (callback) callback();
        };
        if (time) {
            timer = setTimeout(end, time);
        }

        return {
            remove: remove,
            update: update
        };
    }


    /*   
     * traverse the specified node and its descendants, perform the callback function on each
     * @param {Node} node
     * @param {Function} fn
     */
    function traverse(node, fn) {
        fn(node)
        for (var i = 0, len = node.childNodes.length; i < len; i++) {
            traverse(node.childNodes[i], fn);
        }
        return this;
    }

    /*   
     *
     * @param {Node} node
     */
    function reverse(node) {
        var firstChild = node.firstChild;
        for (var i = node.children.length - 1; i > 0; i--) {
            if (i > 0) {
                var child = node.children[i];
                node.insertBefore(child, firstChild);
            }
        }
    }

    /*   
     * Wrap an HTML structure around each element in the set of matched elements.
     * @param {Node} node
     * @param {Node} wrapperNode
     */
    function wrapper(node, wrapperNode) {
        if (langx.isString(wrapperNode)) {
            wrapperNode = this.createFragment(wrapperNode).firstChild;
        }
        node.parentNode.insertBefore(wrapperNode, node);
        wrapperNode.appendChild(node);
    }

    /*   
     * Wrap an HTML structure around the content of each element in the set of matched
     * @param {Node} node
     * @param {Node} wrapperNode
     */
    function wrapperInner(node, wrapperNode) {
        var childNodes = slice.call(node.childNodes);
        node.appendChild(wrapperNode);
        for (var i = 0; i < childNodes.length; i++) {
            wrapperNode.appendChild(childNodes[i]);
        }
        return this;
    }

    /*   
     * Remove the parents of the set of matched elements from the DOM, leaving the matched
     * @param {Node} node
     */
    function unwrap(node) {
        var child, parent = node.parentNode;
        if (parent) {
            if (this.isDoc(parent.parentNode)) return;
            parent.parentNode.insertBefore(node, parent);
        }
    }

    function noder() {
        return noder;
    }

    langx.mixin(noder, {
        active  : activeElement,

        blur : function(el) {
            el.blur();
        },

        body: function() {
            return document.body;
        },

        clone: clone,
        contents: contents,

        createElement: createElement,

        createFragment: createFragment,

        contains: contains,

        createTextNode: createTextNode,

        doc: doc,

        empty: empty,

        fullScreen: fullScreen,

        focusable: focusable,

        html: html,

        isChildOf: isChildOf,

        isDoc: isDoc,

        isWindow: langx.isWindow,

        offsetParent: offsetParent,

        ownerDoc: ownerDoc,

        ownerWindow: ownerWindow,

        after: after,

        before: before,

        prepend: prepend,

        append: append,

        remove: remove,

        removeChild : removeChild,

        replace: replace,

        throb: throb,

        traverse: traverse,

        reverse: reverse,

        wrapper: wrapper,

        wrapperInner: wrapperInner,

        unwrap: unwrap
    });

    return dom.noder = noder;
});
define('skylark-utils-dom/finder',[
    "./dom",
    "./langx",
    "./browser",
    "./noder"
], function(dom, langx, browser, noder, velm) {
    var local = {},
        filter = Array.prototype.filter,
        slice = Array.prototype.slice,
        nativeMatchesSelector = browser.matchesSelector;

    /*
    ---
    name: Slick.Parser
    description: Standalone CSS3 Selector parser
    provides: Slick.Parser
    ...
    */
    ;
    (function() {

        var parsed,
            separatorIndex,
            combinatorIndex,
            reversed,
            cache = {},
            reverseCache = {},
            reUnescape = /\\/g;

        var parse = function(expression, isReversed) {
            if (expression == null) return null;
            if (expression.Slick === true) return expression;
            expression = ('' + expression).replace(/^\s+|\s+$/g, '');
            reversed = !!isReversed;
            var currentCache = (reversed) ? reverseCache : cache;
            if (currentCache[expression]) return currentCache[expression];
            parsed = {
                Slick: true,
                expressions: [],
                raw: expression,
                reverse: function() {
                    return parse(this.raw, true);
                }
            };
            separatorIndex = -1;
            while (expression != (expression = expression.replace(regexp, parser)));
            parsed.length = parsed.expressions.length;
            return currentCache[parsed.raw] = (reversed) ? reverse(parsed) : parsed;
        };

        var reverseCombinator = function(combinator) {
            if (combinator === '!') return ' ';
            else if (combinator === ' ') return '!';
            else if ((/^!/).test(combinator)) return combinator.replace(/^!/, '');
            else return '!' + combinator;
        };

        var reverse = function(expression) {
            var expressions = expression.expressions;
            for (var i = 0; i < expressions.length; i++) {
                var exp = expressions[i];
                var last = {
                    parts: [],
                    tag: '*',
                    combinator: reverseCombinator(exp[0].combinator)
                };

                for (var j = 0; j < exp.length; j++) {
                    var cexp = exp[j];
                    if (!cexp.reverseCombinator) cexp.reverseCombinator = ' ';
                    cexp.combinator = cexp.reverseCombinator;
                    delete cexp.reverseCombinator;
                }

                exp.reverse().push(last);
            }
            return expression;
        };

        var escapeRegExp = (function() {
            // Credit: XRegExp 0.6.1 (c) 2007-2008 Steven Levithan <http://stevenlevithan.com/regex/xregexp/> MIT License
            var from = /(?=[\-\[\]{}()*+?.\\\^$|,#\s])/g,
                to = '\\';
            return function(string) {
                return string.replace(from, to)
            }
        }())

        var regexp = new RegExp(
            "^(?:\\s*(,)\\s*|\\s*(<combinator>+)\\s*|(\\s+)|(<unicode>+|\\*)|\\#(<unicode>+)|\\.(<unicode>+)|\\[\\s*(<unicode1>+)(?:\\s*([*^$!~|]?=)(?:\\s*(?:([\"']?)(.*?)\\9)))?\\s*\\](?!\\])|(:+)(<unicode>+)(?:\\((?:(?:([\"'])([^\\13]*)\\13)|((?:\\([^)]+\\)|[^()]*)+))\\))?)"
            .replace(/<combinator>/, '[' + escapeRegExp(">+~`!@$%^&={}\\;</") + ']')
            .replace(/<unicode>/g, '(?:[\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
            .replace(/<unicode1>/g, '(?:[:\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
        );

        function parser(
            rawMatch,

            separator,
            combinator,
            combinatorChildren,

            tagName,
            id,
            className,

            attributeKey,
            attributeOperator,
            attributeQuote,
            attributeValue,

            pseudoMarker,
            pseudoClass,
            pseudoQuote,
            pseudoClassQuotedValue,
            pseudoClassValue
        ) {
            if (separator || separatorIndex === -1) {
                parsed.expressions[++separatorIndex] = [];
                combinatorIndex = -1;
                if (separator) return '';
            }

            if (combinator || combinatorChildren || combinatorIndex === -1) {
                combinator = combinator || ' ';
                var currentSeparator = parsed.expressions[separatorIndex];
                if (reversed && currentSeparator[combinatorIndex])
                    currentSeparator[combinatorIndex].reverseCombinator = reverseCombinator(combinator);
                currentSeparator[++combinatorIndex] = {
                    combinator: combinator,
                    tag: '*'
                };
            }

            var currentParsed = parsed.expressions[separatorIndex][combinatorIndex];

            if (tagName) {
                currentParsed.tag = tagName.replace(reUnescape, '');

            } else if (id) {
                currentParsed.id = id.replace(reUnescape, '');

            } else if (className) {
                className = className.replace(reUnescape, '');

                if (!currentParsed.classList) currentParsed.classList = [];
                if (!currentParsed.classes) currentParsed.classes = [];
                currentParsed.classList.push(className);
                currentParsed.classes.push({
                    value: className,
                    regexp: new RegExp('(^|\\s)' + escapeRegExp(className) + '(\\s|$)')
                });

            } else if (pseudoClass) {
                pseudoClassValue = pseudoClassValue || pseudoClassQuotedValue;
                pseudoClassValue = pseudoClassValue ? pseudoClassValue.replace(reUnescape, '') : null;

                if (!currentParsed.pseudos) currentParsed.pseudos = [];
                currentParsed.pseudos.push({
                    key: pseudoClass.replace(reUnescape, ''),
                    value: pseudoClassValue,
                    type: pseudoMarker.length == 1 ? 'class' : 'element'
                });

            } else if (attributeKey) {
                attributeKey = attributeKey.replace(reUnescape, '');
                attributeValue = (attributeValue || '').replace(reUnescape, '');

                var test, regexp;

                switch (attributeOperator) {
                    case '^=':
                        regexp = new RegExp('^' + escapeRegExp(attributeValue));
                        break;
                    case '$=':
                        regexp = new RegExp(escapeRegExp(attributeValue) + '$');
                        break;
                    case '~=':
                        regexp = new RegExp('(^|\\s)' + escapeRegExp(attributeValue) + '(\\s|$)');
                        break;
                    case '|=':
                        regexp = new RegExp('^' + escapeRegExp(attributeValue) + '(-|$)');
                        break;
                    case '=':
                        test = function(value) {
                            return attributeValue == value;
                        };
                        break;
                    case '*=':
                        test = function(value) {
                            return value && value.indexOf(attributeValue) > -1;
                        };
                        break;
                    case '!=':
                        test = function(value) {
                            return attributeValue != value;
                        };
                        break;
                    default:
                        test = function(value) {
                            return !!value;
                        };
                }

                if (attributeValue == '' && (/^[*$^]=$/).test(attributeOperator)) test = function() {
                    return false;
                };

                if (!test) test = function(value) {
                    return value && regexp.test(value);
                };

                if (!currentParsed.attributes) currentParsed.attributes = [];
                currentParsed.attributes.push({
                    key: attributeKey,
                    operator: attributeOperator,
                    value: attributeValue,
                    test: test
                });

            }

            return '';
        };

        // Slick NS

        var Slick = (this.Slick || {});

        Slick.parse = function(expression) {
            return parse(expression);
        };

        Slick.escapeRegExp = escapeRegExp;

        if (!this.Slick) this.Slick = Slick;

    }).apply(local);


    var simpleClassSelectorRE = /^\.([\w-]*)$/,
        simpleIdSelectorRE = /^#([\w-]*)$/,
        rinputs = /^(?:input|select|textarea|button)$/i,
        rheader = /^h\d$/i,
        slice = Array.prototype.slice;


    local.parseSelector = local.Slick.parse;


    var pseudos = local.pseudos = {
        // custom pseudos
        "button": function(elem) {
            var name = elem.nodeName.toLowerCase();
            return name === "input" && elem.type === "button" || name === "button";
        },

        'checked': function(elm) {
            return !!elm.checked;
        },

        'contains': function(elm, idx, nodes, text) {
            if ($(this).text().indexOf(text) > -1) return this
        },

        'disabled': function(elm) {
            return !!elm.disabled;
        },

        'enabled': function(elm) {
            return !elm.disabled;
        },

        'eq': function(elm, idx, nodes, value) {
            return (idx == value);
        },

        'even': function(elm, idx, nodes, value) {
            return (idx % 2) === 0;
        },

        'focus': function(elm) {
            return document.activeElement === elm && (elm.href || elm.type || elm.tabindex);
        },

        'focusable': function( elm ) {
            return noder.focusable(elm, elm.tabindex != null );
        },

        'first': function(elm, idx) {
            return (idx === 0);
        },

        'gt': function(elm, idx, nodes, value) {
            return (idx > value);
        },

        'has': function(elm, idx, nodes, sel) {
            return find(elm, sel);
        },

        // Element/input types
        "header": function(elem) {
            return rheader.test(elem.nodeName);
        },

        'hidden': function(elm) {
            return !local.pseudos["visible"](elm);
        },

        "input": function(elem) {
            return rinputs.test(elem.nodeName);
        },

        'last': function(elm, idx, nodes) {
            return (idx === nodes.length - 1);
        },

        'lt': function(elm, idx, nodes, value) {
            return (idx < value);
        },

        'not': function(elm, idx, nodes, sel) {
            return !matches(elm, sel);
        },

        'odd': function(elm, idx, nodes, value) {
            return (idx % 2) === 1;
        },

        /*   
         * Get the parent of each element in the current set of matched elements.
         * @param {Object} elm
         */
        'parent': function(elm) {
            return !!elm.parentNode;
        },

        'selected': function(elm) {
            return !!elm.selected;
        },

        'tabbable': function(elm) {
            var tabIndex = elm.tabindex,
                hasTabindex = tabIndex != null;
            return ( !hasTabindex || tabIndex >= 0 ) && noder.focusable( element, hasTabindex );
        },

        'text': function(elm) {
            return elm.type === "text";
        },

        'visible': function(elm) {
            return elm.offsetWidth && elm.offsetWidth
        }
    };

    ["first", "eq", "last"].forEach(function(item) {
        pseudos[item].isArrayFilter = true;
    });



    pseudos["nth"] = pseudos["eq"];

    function createInputPseudo(type) {
        return function(elem) {
            var name = elem.nodeName.toLowerCase();
            return name === "input" && elem.type === type;
        };
    }

    function createButtonPseudo(type) {
        return function(elem) {
            var name = elem.nodeName.toLowerCase();
            return (name === "input" || name === "button") && elem.type === type;
        };
    }

    // Add button/input type pseudos
    for (i in {
        radio: true,
        checkbox: true,
        file: true,
        password: true,
        image: true
    }) {
        pseudos[i] = createInputPseudo(i);
    }
    for (i in {
        submit: true,
        reset: true
    }) {
        pseudos[i] = createButtonPseudo(i);
    }


    local.divide = function(cond) {
        var nativeSelector = "",
            customPseudos = [],
            tag,
            id,
            classes,
            attributes,
            pseudos;


        if (id = cond.id) {
            nativeSelector += ("#" + id);
        }
        if (classes = cond.classes) {
            for (var i = classes.length; i--;) {
                nativeSelector += ("." + classes[i].value);
            }
        }
        if (attributes = cond.attributes) {
            for (var i = 0; i < attributes.length; i++) {
                if (attributes[i].operator) {
                    nativeSelector += ("[" + attributes[i].key + attributes[i].operator + JSON.stringify(attributes[i].value) + "]");
                } else {
                    nativeSelector += ("[" + attributes[i].key + "]");
                }
            }
        }
        if (pseudos = cond.pseudos) {
            for (i = pseudos.length; i--;) {
                part = pseudos[i];
                if (this.pseudos[part.key]) {
                    customPseudos.push(part);
                } else {
                    if (part.value !== undefined) {
                        nativeSelector += (":" + part.key + "(" + JSON.stringify(part))
                    }
                }
            }
        }

        if (tag = cond.tag) {
            if (tag !== "*") {
                nativeSelector = tag.toUpperCase() + nativeSelector;
            }
        }

        if (!nativeSelector) {
            nativeSelector = "*";
        }

        return {
            nativeSelector: nativeSelector,
            customPseudos: customPseudos
        }

    };

    local.check = function(node, cond, idx, nodes, arrayFilte) {
        var tag,
            id,
            classes,
            attributes,
            pseudos,

            i, part, cls, pseudo;

        if (!arrayFilte) {
            if (tag = cond.tag) {
                var nodeName = node.nodeName.toUpperCase();
                if (tag == '*') {
                    if (nodeName < '@') return false; // Fix for comment nodes and closed nodes
                } else {
                    if (nodeName != (tag || "").toUpperCase()) return false;
                }
            }

            if (id = cond.id) {
                if (node.getAttribute('id') != id) {
                    return false;
                }
            }


            if (classes = cond.classes) {
                for (i = classes.length; i--;) {
                    cls = node.getAttribute('class');
                    if (!(cls && classes[i].regexp.test(cls))) return false;
                }
            }

            if (attributes = cond.attributes) {
                for (i = attributes.length; i--;) {
                    part = attributes[i];
                    if (part.operator ? !part.test(node.getAttribute(part.key)) : !node.hasAttribute(part.key)) return false;
                }
            }

        }
        if (pseudos = cond.pseudos) {
            for (i = pseudos.length; i--;) {
                part = pseudos[i];
                if (pseudo = this.pseudos[part.key]) {
                    if ((arrayFilte && pseudo.isArrayFilter) || (!arrayFilte && !pseudo.isArrayFilter)) {
                        if (!pseudo(node, idx, nodes, part.value)) {
                            return false;
                        }
                    }
                } else {
                    if (!arrayFilte && !nativeMatchesSelector.call(node, part.key)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    local.match = function(node, selector) {

        var parsed;

        if (langx.isString(selector)) {
            parsed = local.Slick.parse(selector);
        } else {
            parsed = selector;
        }

        if (!parsed) {
            return true;
        }

        // simple (single) selectors
        var expressions = parsed.expressions,
            simpleExpCounter = 0,
            i,
            currentExpression;
        for (i = 0;
            (currentExpression = expressions[i]); i++) {
            if (currentExpression.length == 1) {
                var exp = currentExpression[0];
                if (this.check(node, exp)) {
                    return true;
                }
                simpleExpCounter++;
            }
        }

        if (simpleExpCounter == parsed.length) {
            return false;
        }

        var nodes = this.query(document, parsed),
            item;
        for (i = 0; item = nodes[i++];) {
            if (item === node) {
                return true;
            }
        }
        return false;
    };


    local.filterSingle = function(nodes, exp) {
        var matchs = filter.call(nodes, function(node, idx) {
            return local.check(node, exp, idx, nodes, false);
        });

        matchs = filter.call(matchs, function(node, idx) {
            return local.check(node, exp, idx, matchs, true);
        });
        return matchs;
    };

    local.filter = function(nodes, selector) {
        var parsed;

        if (langx.isString(selector)) {
            parsed = local.Slick.parse(selector);
        } else {
            return local.filterSingle(nodes, selector);
        }

        // simple (single) selectors
        var expressions = parsed.expressions,
            i,
            currentExpression,
            ret = [];
        for (i = 0;
            (currentExpression = expressions[i]); i++) {
            if (currentExpression.length == 1) {
                var exp = currentExpression[0];

                var matchs = local.filterSingle(nodes, exp);

                ret = langx.uniq(ret.concat(matchs));
            } else {
                throw new Error("not supported selector:" + selector);
            }
        }

        return ret;

    };

    local.combine = function(elm, bit) {
        var op = bit.combinator,
            cond = bit,
            node1,
            nodes = [];

        switch (op) {
            case '>': // direct children
                nodes = children(elm, cond);
                break;
            case '+': // next sibling
                node1 = nextSibling(elm, cond, true);
                if (node1) {
                    nodes.push(node1);
                }
                break;
            case '^': // first child
                node1 = firstChild(elm, cond, true);
                if (node1) {
                    nodes.push(node1);
                }
                break;
            case '~': // next siblings
                nodes = nextSiblings(elm, cond);
                break;
            case '++': // next sibling and previous sibling
                var prev = previousSibling(elm, cond, true),
                    next = nextSibling(elm, cond, true);
                if (prev) {
                    nodes.push(prev);
                }
                if (next) {
                    nodes.push(next);
                }
                break;
            case '~~': // next siblings and previous siblings
                nodes = siblings(elm, cond);
                break;
            case '!': // all parent nodes up to document
                nodes = ancestors(elm, cond);
                break;
            case '!>': // direct parent (one level)
                node1 = parent(elm, cond);
                if (node1) {
                    nodes.push(node1);
                }
                break;
            case '!+': // previous sibling
                nodes = previousSibling(elm, cond, true);
                break;
            case '!^': // last child
                node1 = lastChild(elm, cond, true);
                if (node1) {
                    nodes.push(node1);
                }
                break;
            case '!~': // previous siblings
                nodes = previousSiblings(elm, cond);
                break;
            default:
                var divided = this.divide(bit);
                nodes = slice.call(elm.querySelectorAll(divided.nativeSelector));
                if (divided.customPseudos) {
                    for (var i = divided.customPseudos.length - 1; i >= 0; i--) {
                        nodes = filter.call(nodes, function(item, idx) {
                            return local.check(item, {
                                pseudos: [divided.customPseudos[i]]
                            }, idx, nodes, false)
                        });

                        nodes = filter.call(nodes, function(item, idx) {
                            return local.check(item, {
                                pseudos: [divided.customPseudos[i]]
                            }, idx, nodes, true)
                        });
                    }
                }
                break;

        }
        return nodes;
    }

    local.query = function(node, selector, single) {


        var parsed = this.Slick.parse(selector);

        var
            founds = [],
            currentExpression, currentBit,
            expressions = parsed.expressions;

        for (var i = 0;
            (currentExpression = expressions[i]); i++) {
            var currentItems = [node],
                found;
            for (var j = 0;
                (currentBit = currentExpression[j]); j++) {
                found = langx.map(currentItems, function(item, i) {
                    return local.combine(item, currentBit)
                });
                if (found) {
                    currentItems = found;
                }
            }
            if (found) {
                founds = founds.concat(found);
            }
        }

        return founds;
    }

    /*
     * Get the nearest ancestor of the specified element,optional matched by a selector.
     * @param {HTMLElement} node
     * @param {String Optional } selector
     * @param {Object} root
     */
    function ancestor(node, selector, root) {
        var rootIsSelector = root && langx.isString(root);
        while (node = node.parentNode) {
            if (matches(node, selector)) {
                return node;
            }
            if (root) {
                if (rootIsSelector) {
                    if (matches(node, root)) {
                        break;
                    }
                } else if (node == root) {
                    break;
                }
            }
        }
        return null;
    }

    /*
     * Get the ancestors of the specitied element , optionally filtered by a selector.
     * @param {HTMLElement} node
     * @param {String Optional } selector
     * @param {Object} root
     */
    function ancestors(node, selector, root) {
        var ret = [],
            rootIsSelector = root && langx.isString(root);
        while ((node = node.parentNode) && (node.nodeType !== 9)) {
            ret.push(node);
            if (root) {
                if (rootIsSelector) {
                    if (matches(node, root)) {
                        break;
                    }
                } else if (node == root) {
                    break;
                }
            }

        }

        if (selector) {
            ret = local.filter(ret, selector);
        }
        return ret;
    }

    /*
     * Returns a element by its ID.
     * @param {string} id
     */
    function byId(id, doc) {
        doc = doc || noder.doc();
        return doc.getElementById(id);
    }

    /*
     * Get the children of the specified element , optionally filtered by a selector.
     * @param {string} node
     * @param {String optionlly} selector
     */
    function children(node, selector) {
        var childNodes = node.childNodes,
            ret = [];
        for (var i = 0; i < childNodes.length; i++) {
            var node = childNodes[i];
            if (node.nodeType == 1) {
                ret.push(node);
            }
        }
        if (selector) {
            ret = local.filter(ret, selector);
        }
        return ret;
    }

    function closest(node, selector) {
        while (node && !(matches(node, selector))) {
            node = node.parentNode;
        }

        return node;
    }

    /*
     * Get the decendant of the specified element , optionally filtered by a selector.
     * @param {HTMLElement} elm
     * @param {String optionlly} selector
     */
    function descendants(elm, selector) {
        // Selector
        try {
            return slice.call(elm.querySelectorAll(selector));
        } catch (matchError) {
            //console.log(matchError);
        }
        return local.query(elm, selector);
    }

    /*
     * Get the nearest decendent of the specified element,optional matched by a selector.
     * @param {HTMLElement} elm
     * @param {String optionlly} selector
     */
    function descendant(elm, selector) {
        // Selector
        try {
            return elm.querySelector(selector);
        } catch (matchError) {
            //console.log(matchError);
        }
        var nodes = local.query(elm, selector);
        if (nodes.length > 0) {
            return nodes[0];
        } else {
            return null;
        }
    }

    /*
     * Get the descendants of each element in the current set of matched elements, filtered by a selector, jQuery object, or element.
     * @param {HTMLElement} elm
     * @param {String optionlly} selector
     */
    function find(elm, selector) {
        if (!selector) {
            selector = elm;
            elm = document.body;
        }
        if (matches(elm, selector)) {
            return elm;
        } else {
            return descendant(elm, selector);
        }
    }

    /*
     * Get the findAll of the specified element , optionally filtered by a selector.
     * @param {HTMLElement} elm
     * @param {String optionlly} selector
     */
    function findAll(elm, selector) {
        if (!selector) {
            selector = elm;
            elm = document.body;
        }
        return descendants(elm, selector);
    }

    /*
     * Get the first child of the specified element , optionally filtered by a selector.
     * @param {HTMLElement} elm
     * @param {String optionlly} selector
     * @param {String} first
     */
    function firstChild(elm, selector, first) {
        var childNodes = elm.childNodes,
            node = childNodes[0];
        while (node) {
            if (node.nodeType == 1) {
                if (!selector || matches(node, selector)) {
                    return node;
                }
                if (first) {
                    break;
                }
            }
            node = node.nextSibling;
        }

        return null;
    }

    /*
     * Get the last child of the specified element , optionally filtered by a selector.
     * @param {HTMLElement} elm
     * @param {String optionlly} selector
     * @param {String } last
     */
    function lastChild(elm, selector, last) {
        var childNodes = elm.childNodes,
            node = childNodes[childNodes.length - 1];
        while (node) {
            if (node.nodeType == 1) {
                if (!selector || matches(node, selector)) {
                    return node;
                }
                if (last) {
                    break;
                }
            }
            node = node.previousSibling;
        }

        return null;
    }

    /*
     * Check the specified element against a selector.
     * @param {HTMLElement} elm
     * @param {String optionlly} selector
     */
    function matches(elm, selector) {
        if (!selector || !elm || elm.nodeType !== 1) {
            return false
        }

        if (langx.isString(selector)) {
            try {
                return nativeMatchesSelector.call(elm, selector.replace(/\[([^=]+)=\s*([^'"\]]+?)\s*\]/g, '[$1="$2"]'));
            } catch (matchError) {
                //console.log(matchError);
            }
            return local.match(elm, selector);
        } else if (langx.isArrayLike(selector)) {
            return langx.inArray(elm, selector) > -1;
        } else if (langx.isPlainObject(selector)) {
            return local.check(elm, selector);
        } else {
            return elm === selector;
        }

    }

    /*
     * Get the nearest next sibing of the specitied element , optional matched by a selector.
     * @param {HTMLElement} elm
     * @param {String optionlly} selector
     * @param {Boolean Optional} adjacent
     */
    function nextSibling(elm, selector, adjacent) {
        var node = elm.nextSibling;
        while (node) {
            if (node.nodeType == 1) {
                if (!selector || matches(node, selector)) {
                    return node;
                }
                if (adjacent) {
                    break;
                }
            }
            node = node.nextSibling;
        }
        return null;
    }

    /*
     * Get the next siblings of the specified element , optional filtered by a selector.
     * @param {HTMLElement} elm
     * @param {String optionlly} selector
     */
    function nextSiblings(elm, selector) {
        var node = elm.nextSibling,
            ret = [];
        while (node) {
            if (node.nodeType == 1) {
                if (!selector || matches(node, selector)) {
                    ret.push(node);
                }
            }
            node = node.nextSibling;
        }
        return ret;
    }

    /*
     * Get the parent element of the specified element. if a selector is provided, it retrieves the parent element only if it matches that selector.
     * @param {HTMLElement} elm
     * @param {String optionlly} selector
     */
    function parent(elm, selector) {
        var node = elm.parentNode;
        if (node && (!selector || matches(node, selector))) {
            return node;
        }

        return null;
    }

    /*
     * Get hte nearest previous sibling of the specified element ,optional matched by a selector.
     * @param {HTMLElement} elm
     * @param {String optionlly} selector
     * @param {Boolean Optional } adjacent
     */
    function previousSibling(elm, selector, adjacent) {
        var node = elm.previousSibling;
        while (node) {
            if (node.nodeType == 1) {
                if (!selector || matches(node, selector)) {
                    return node;
                }
                if (adjacent) {
                    break;
                }
            }
            node = node.previousSibling;
        }
        return null;
    }

    /*
     * Get all preceding siblings of each element in the set of matched elements, optionally filtered by a selector.
     * @param {HTMLElement} elm
     * @param {String optionlly} selector
     */
    function previousSiblings(elm, selector) {
        var node = elm.previousSibling,
            ret = [];
        while (node) {
            if (node.nodeType == 1) {
                if (!selector || matches(node, selector)) {
                    ret.push(node);
                }
            }
            node = node.previousSibling;
        }
        return ret;
    }

    /*
     * Selects all sibling elements that follow after the “prev” element, have the same parent, and match the filtering “siblings” selector.
     * @param {HTMLElement} elm
     * @param {String optionlly} selector
     */
    function siblings(elm, selector) {
        var node = elm.parentNode.firstChild,
            ret = [];
        while (node) {
            if (node.nodeType == 1 && node !== elm) {
                if (!selector || matches(node, selector)) {
                    ret.push(node);
                }
            }
            node = node.nextSibling;
        }
        return ret;
    }

    var finder = function() {
        return finder;
    };

    langx.mixin(finder, {

        ancestor: ancestor,

        ancestors: ancestors,

        byId: byId,

        children: children,

        closest: closest,

        descendant: descendant,

        descendants: descendants,

        find: find,

        findAll: findAll,

        firstChild: firstChild,

        lastChild: lastChild,

        matches: matches,

        nextSibling: nextSibling,

        nextSiblings: nextSiblings,

        parent: parent,

        previousSibling,

        previousSiblings,

        pseudos: local.pseudos,

        siblings: siblings
    });

    return dom.finder = finder;
});
define('skylark-utils-dom/datax',[
    "./dom",
    "./langx",
    "./finder"
], function(dom, langx, finder) {
    var map = Array.prototype.map,
        filter = Array.prototype.filter,
        camelCase = langx.camelCase,
        deserializeValue = langx.deserializeValue,

        capitalRE = /([A-Z])/g,
        propMap = {
            'tabindex': 'tabIndex',
            'readonly': 'readOnly',
            'for': 'htmlFor',
            'class': 'className',
            'maxlength': 'maxLength',
            'cellspacing': 'cellSpacing',
            'cellpadding': 'cellPadding',
            'rowspan': 'rowSpan',
            'colspan': 'colSpan',
            'usemap': 'useMap',
            'frameborder': 'frameBorder',
            'contenteditable': 'contentEditable'
        };
    /*
     * Set property values
     * @param {Object} elm  
     * @param {String} name
     * @param {String} value
     */

    function setAttribute(elm, name, value) {
        if (value == null) {
            elm.removeAttribute(name);
        } else {
            elm.setAttribute(name, value);
        }
    }

    function aria(elm, name, value) {
        return this.attr(elm, "aria-" + name, value);
    }

    /*
     * Set property values
     * @param {Object} elm  
     * @param {String} name
     * @param {String} value
     */

    function attr(elm, name, value) {
        if (value === undefined) {
            if (typeof name === "object") {
                for (var attrName in name) {
                    attr(elm, attrName, name[attrName]);
                }
                return this;
            } else {
                if (elm.hasAttribute && elm.hasAttribute(name)) {
                    return elm.getAttribute(name);
                }
            }
        } else {
            elm.setAttribute(name, value);
            return this;
        }
    }


    /*
     *  Read all "data-*" attributes from a node
     * @param {Object} elm  
     */

    function _attributeData(elm) {
        var store = {}
        langx.each(elm.attributes || [], function(i, attr) {
            if (attr.name.indexOf('data-') == 0) {
                store[camelCase(attr.name.replace('data-', ''))] = deserializeValue(attr.value);
            }
        })
        return store;
    }

    function _store(elm, confirm) {
        var store = elm["_$_store"];
        if (!store && confirm) {
            store = elm["_$_store"] = _attributeData(elm);
        }
        return store;
    }

    function _getData(elm, name) {
        if (name === undefined) {
            return _store(elm, true);
        } else {
            var store = _store(elm);
            if (store) {
                if (name in store) {
                    return store[name];
                }
                var camelName = camelCase(name);
                if (camelName in store) {
                    return store[camelName];
                }
            }
            var attrName = 'data-' + name.replace(capitalRE, "-$1").toLowerCase()
            return attr(elm, attrName);
        }

    }

    function _setData(elm, name, value) {
        var store = _store(elm, true);
        store[camelCase(name)] = value;
    }


    /*
     * xxx
     * @param {Object} elm  
     * @param {String} name
     * @param {String} value
     */
    function data(elm, name, value) {

        if (value === undefined) {
            if (typeof name === "object") {
                for (var dataAttrName in name) {
                    _setData(elm, dataAttrName, name[dataAttrName]);
                }
                return this;
            } else {
                return _getData(elm, name);
            }
        } else {
            _setData(elm, name, value);
            return this;
        }
    } 
    /*
     * Remove from the element all items that have not yet been run. 
     * @param {Object} elm  
     */

    function cleanData(elm) {
        if (elm["_$_store"]) {
            delete elm["_$_store"];
        }
    }

    /*
     * Remove a previously-stored piece of data. 
     * @param {Object} elm  
     * @param {Array} names
     */
    function removeData(elm, names) {
        if (langx.isString(names)) {
            names = names.split(/\s+/);
        }
        var store = _store(elm, true);
        names.forEach(function(name) {
            delete store[name];
        });
        return this;
    }

    /*
     * xxx 
     * @param {Object} elm  
     * @param {Array} names
     */
    function pluck(nodes, property) {
        return map.call(nodes, function(elm) {
            return elm[property];
        });
    }

    /*
     * Get or set the value of an property for the specified element.
     * @param {Object} elm  
     * @param {String} name
     * @param {String} value
     */
    function prop(elm, name, value) {
        name = propMap[name] || name;
        if (value === undefined) {
            return elm[name];
        } else {
            elm[name] = value;
            return this;
        }
    }

    /*
     * remove Attributes  
     * @param {Object} elm  
     * @param {String} name
     */
    function removeAttr(elm, name) {
        name.split(' ').forEach(function(attr) {
            setAttribute(elm, attr);
        });
        return this;
    }


    /*
     * Remove the value of a property for the first element in the set of matched elements or set one or more properties for every matched element.
     * @param {Object} elm  
     * @param {String} name
     */
    function removeProp(elm, name) {
        name.split(' ').forEach(function(prop) {
            delete elm[prop];
        });
        return this;
    }

    /*   
     * Get the combined text contents of each element in the set of matched elements, including their descendants, or set the text contents of the matched elements.  
     * @param {Object} elm  
     * @param {String} txt
     */
    function text(elm, txt) {
        if (txt === undefined) {
            return elm.textContent;
        } else {
            elm.textContent = txt == null ? '' : '' + txt;
            return this;
        }
    }

    /*   
     * Get the current value of the first element in the set of matched elements or set the value of every matched element.
     * @param {Object} elm  
     * @param {String} value
     */
    function val(elm, value) {
        if (value === undefined) {
            if (elm.multiple) {
                // select multiple values
                var selectedOptions = filter.call(finder.find(elm, "option"), (function(option) {
                    return option.selected;
                }));
                return pluck(selectedOptions, "value");
            } else {
                return elm.value;
            }
        } else {
            elm.value = value;
            return this;
        }
    }


    finder.pseudos.data = function( elem, i, match,dataName ) {
        return !!data( elem, dataName || match[3]);
    };
   

    function datax() {
        return datax;
    }

    langx.mixin(datax, {
        aria: aria,

        attr: attr,

        cleanData: cleanData,

        data: data,

        pluck: pluck,

        prop: prop,

        removeAttr: removeAttr,

        removeData: removeData,

        removeProp: removeProp,

        text: text,

        val: val
    });

    return dom.datax = datax;
});
define('skylark-utils-dom/eventer',[
    "./dom",
    "./langx",
    "./browser",
    "./finder",
    "./noder",
    "./datax"
], function(dom, langx, browser, finder, noder, datax) {
    var mixin = langx.mixin,
        each = langx.each,
        slice = Array.prototype.slice,
        uid = langx.uid,
        ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$)/,
        eventMethods = {
            preventDefault: "isDefaultPrevented",
            stopImmediatePropagation: "isImmediatePropagationStopped",
            stopPropagation: "isPropagationStopped"
        },
        readyRE = /complete|loaded|interactive/;

    function compatible(event, source) {
        if (source || !event.isDefaultPrevented) {
            if (!source) {
                source = event;
            }

            langx.each(eventMethods, function(name, predicate) {
                var sourceMethod = source[name];
                event[name] = function() {
                    this[predicate] = langx.returnTrue;
                    return sourceMethod && sourceMethod.apply(source, arguments);
                }
                event[predicate] = langx.returnFalse;
            });
        }
        return event;
    }

    function parse(event) {
        var segs = ("" + event).split(".");
        return {
            type: segs[0],
            ns: segs.slice(1).sort().join(" ")
        };
    }

    //create a custom dom event
    var createEvent = (function() {
        var EventCtors = [
                window["CustomEvent"], // 0 default
                window["CompositionEvent"], // 1
                window["DragEvent"], // 2
                window["Event"], // 3
                window["FocusEvent"], // 4
                window["KeyboardEvent"], // 5
                window["MessageEvent"], // 6
                window["MouseEvent"], // 7
                window["MouseScrollEvent"], // 8
                window["MouseWheelEvent"], // 9
                window["MutationEvent"], // 10
                window["ProgressEvent"], // 11
                window["TextEvent"], // 12
                window["TouchEvent"], // 13
                window["UIEvent"], // 14
                window["WheelEvent"], // 15
                window["ClipboardEvent"] // 16
            ],
            NativeEvents = {
                "compositionstart": 1, // CompositionEvent
                "compositionend": 1, // CompositionEvent
                "compositionupdate": 1, // CompositionEvent

                "beforecopy": 16, // ClipboardEvent
                "beforecut": 16, // ClipboardEvent
                "beforepaste": 16, // ClipboardEvent
                "copy": 16, // ClipboardEvent
                "cut": 16, // ClipboardEvent
                "paste": 16, // ClipboardEvent

                "drag": 2, // DragEvent
                "dragend": 2, // DragEvent
                "dragenter": 2, // DragEvent
                "dragexit": 2, // DragEvent
                "dragleave": 2, // DragEvent
                "dragover": 2, // DragEvent
                "dragstart": 2, // DragEvent
                "drop": 2, // DragEvent

                "abort": 3, // Event
                "change": 3, // Event
                "error": 3, // Event
                "selectionchange": 3, // Event
                "submit": 3, // Event
                "reset": 3, // Event

                "focus": 4, // FocusEvent
                "blur": 4, // FocusEvent
                "focusin": 4, // FocusEvent
                "focusout": 4, // FocusEvent

                "keydown": 5, // KeyboardEvent
                "keypress": 5, // KeyboardEvent
                "keyup": 5, // KeyboardEvent

                "message": 6, // MessageEvent

                "click": 7, // MouseEvent
                "contextmenu": 7, // MouseEvent
                "dblclick": 7, // MouseEvent
                "mousedown": 7, // MouseEvent
                "mouseup": 7, // MouseEvent
                "mousemove": 7, // MouseEvent
                "mouseover": 7, // MouseEvent
                "mouseout": 7, // MouseEvent
                "mouseenter": 7, // MouseEvent
                "mouseleave": 7, // MouseEvent


                "textInput": 12, // TextEvent

                "touchstart": 13, // TouchEvent
                "touchmove": 13, // TouchEvent
                "touchend": 13, // TouchEvent

                "load": 14, // UIEvent
                "resize": 14, // UIEvent
                "select": 14, // UIEvent
                "scroll": 14, // UIEvent
                "unload": 14, // UIEvent,

                "wheel": 15 // WheelEvent
            };

        function getEventCtor(type) {
            var idx = NativeEvents[type];
            if (!idx) {
                idx = 0;
            }
            return EventCtors[idx];
        }

        return function(type, props) {
            //create a custom dom event

            if (langx.isString(type)) {
                props = props || {};
            } else {
                props = type || {};
                type = props.type || "";
            }
            var parsed = parse(type);
            type = parsed.type;

            props = langx.mixin({
                bubbles: true,
                cancelable: true
            }, props);

            if (parsed.ns) {
                props.namespace = parsed.ns;
            }

            var ctor = getEventCtor(type),
                e = new ctor(type, props);

            langx.safeMixin(e, props);

            return compatible(e);
        };
    })();

    function createProxy(src, props) {
        var key,
            proxy = {
                originalEvent: src
            };
        for (key in src) {
            if (key !== "keyIdentifier" && !ignoreProperties.test(key) && src[key] !== undefined) {
                proxy[key] = src[key];
            }
        }
        if (props) {
            langx.mixin(proxy, props);
        }
        return compatible(proxy, src);
    }

    var
        specialEvents = {},
        focusinSupported = "onfocusin" in window,
        focus = { focus: "focusin", blur: "focusout" },
        hover = { mouseenter: "mouseover", mouseleave: "mouseout" },
        realEvent = function(type) {
            return hover[type] || (focusinSupported && focus[type]) || type;
        },
        handlers = {},
        EventBindings = langx.klass({
            init: function(target, event) {
                this._target = target;
                this._event = event;
                this._bindings = [];
            },

            add: function(fn, options) {
                var bindings = this._bindings,
                    binding = {
                        fn: fn,
                        options: langx.mixin({}, options)
                    };

                bindings.push(binding);

                var self = this;
                if (!self._listener) {
                    self._listener = function(domEvt) {
                        var elm = this,
                            e = createProxy(domEvt),
                            args = domEvt._args,
                            bindings = self._bindings,
                            ns = e.namespace;

                        if (langx.isDefined(args)) {
                            args = [e].concat(args);
                        } else {
                            args = [e];
                        }

                        langx.each(bindings, function(idx, binding) {
                            var match = elm;
                            if (e.isImmediatePropagationStopped && e.isImmediatePropagationStopped()) {
                                return false;
                            }
                            var fn = binding.fn,
                                options = binding.options || {},
                                selector = options.selector,
                                one = options.one,
                                data = options.data;

                            if (ns && ns != options.ns && options.ns.indexOf(ns) === -1) {
                                return;
                            }
                            if (selector) {
                                match = finder.closest(e.target, selector);
                                if (match && match !== elm) {
                                    langx.mixin(e, {
                                        currentTarget: match,
                                        liveFired: elm
                                    });
                                } else {
                                    return;
                                }
                            }

                            var originalEvent = self._event;
                            if (originalEvent in hover) {
                                var related = e.relatedTarget;
                                if (related && (related === match || noder.contains(match, related))) {
                                    return;
                                }
                            }

                            if (langx.isDefined(data)) {
                                e.data = data;
                            }

                            if (one) {
                                self.remove(fn, options);
                            }

                            var result = fn.apply(match, args);

                            if (result === false) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        });;
                    };

                    var event = self._event;
                    /*
                                        if (event in hover) {
                                            var l = self._listener;
                                            self._listener = function(e) {
                                                var related = e.relatedTarget;
                                                if (!related || (related !== this && !noder.contains(this, related))) {
                                                    return l.apply(this, arguments);
                                                }
                                            }
                                        }
                    */

                    if (self._target.addEventListener) {
                        self._target.addEventListener(realEvent(event), self._listener, false);
                    } else {
                        console.warn("invalid eventer object", self._target);
                    }
                }

            },
            remove: function(fn, options) {
                options = langx.mixin({}, options);

                function matcherFor(ns) {
                    return new RegExp("(?:^| )" + ns.replace(" ", " .* ?") + "(?: |$)");
                }
                var matcher;
                if (options.ns) {
                    matcher = matcherFor(options.ns);
                }

                this._bindings = this._bindings.filter(function(binding) {
                    var removing = (!fn || fn === binding.fn) &&
                        (!matcher || matcher.test(binding.options.ns)) &&
                        (!options.selector || options.selector == binding.options.selector);

                    return !removing;
                });
                if (this._bindings.length == 0) {
                    if (this._target.removeEventListener) {
                        this._target.removeEventListener(realEvent(this._event), this._listener, false);
                    }
                    this._listener = null;
                }
            }
        }),
        EventsHandler = langx.klass({
            init: function(elm) {
                this._target = elm;
                this._handler = {};
            },

            // add a event listener
            // selector Optional
            register: function(event, callback, options) {
                // Seperate the event from the namespace
                var parsed = parse(event),
                    event = parsed.type,
                    specialEvent = specialEvents[event],
                    bindingEvent = specialEvent && (specialEvent.bindType || specialEvent.bindEventName);

                var events = this._handler;

                // Check if there is already a handler for this event
                if (events[event] === undefined) {
                    events[event] = new EventBindings(this._target, bindingEvent || event);
                }

                // Register the new callback function
                events[event].add(callback, langx.mixin({
                    ns: parsed.ns
                }, options)); // options:{selector:xxx}
            },

            // remove a event listener
            unregister: function(event, fn, options) {
                // Check for parameter validtiy
                var events = this._handler,
                    parsed = parse(event);
                event = parsed.type;

                if (event) {
                    var listener = events[event];

                    if (listener) {
                        listener.remove(fn, langx.mixin({
                            ns: parsed.ns
                        }, options));
                    }
                } else {
                    //remove all events
                    for (event in events) {
                        var listener = events[event];
                        listener.remove(fn, langx.mixin({
                            ns: parsed.ns
                        }, options));
                    }
                }
            }
        }),

        findHandler = function(elm) {
            var id = uid(elm),
                handler = handlers[id];
            if (!handler) {
                handler = handlers[id] = new EventsHandler(elm);
            }
            return handler;
        };

    /*   
     * Remove an event handler for one or more events from the specified element.
     * @param {HTMLElement} elm  
     * @param {String} events
     * @param {String　Optional } selector
     * @param {Function} callback
     */
    function off(elm, events, selector, callback) {
        var $this = this
        if (langx.isPlainObject(events)) {
            langx.each(events, function(type, fn) {
                off(elm, type, selector, fn);
            })
            return $this;
        }

        if (!langx.isString(selector) && !langx.isFunction(callback) && callback !== false) {
            callback = selector;
            selector = undefined;
        }

        if (callback === false) {
            callback = langx.returnFalse;
        }

        if (typeof events == "string") {
            if (events.indexOf(",") > -1) {
                events = events.split(",");
            } else {
                events = events.split(/\s/);
            }
        }

        var handler = findHandler(elm);

        if (events) events.forEach(function(event) {

            handler.unregister(event, callback, {
                selector: selector,
            });
        });
        return this;
    }

    /*   
     * Attach an event handler function for one or more events to the selected elements.
     * @param {HTMLElement} elm  
     * @param {String} events
     * @param {String　Optional} selector
     * @param {Anything Optional} data
     * @param {Function} callback
     * @param {Boolean　Optional} one
     */
    function on(elm, events, selector, data, callback, one) {

        var autoRemove, delegator;
        if (langx.isPlainObject(events)) {
            langx.each(events, function(type, fn) {
                on(elm, type, selector, data, fn, one);
            });
            return this;
        }

        if (!langx.isString(selector) && !langx.isFunction(callback)) {
            callback = data;
            data = selector;
            selector = undefined;
        }

        if (langx.isFunction(data)) {
            callback = data;
            data = undefined;
        }

        if (callback === false) {
            callback = langx.returnFalse;
        }

        if (typeof events == "string") {
            if (events.indexOf(",") > -1) {
                events = events.split(",");
            } else {
                events = events.split(/\s/);
            }
        }

        var handler = findHandler(elm);

        events.forEach(function(event) {
            if (event == "ready") {
                return ready(callback);
            }
            handler.register(event, callback, {
                data: data,
                selector: selector,
                one: !!one
            });
        });
        return this;
    }

    /*   
     * Attach a handler to an event for the elements. The handler is executed at most once per 
     * @param {HTMLElement} elm  
     * @param {String} event
     * @param {String　Optional} selector
     * @param {Anything Optional} data
     * @param {Function} callback
     */
    function one(elm, events, selector, data, callback) {
        on(elm, events, selector, data, callback, 1);

        return this;
    }

    /*   
     * Prevents propagation and clobbers the default action of the passed event. The same as calling event.preventDefault() and event.stopPropagation(). 
     * @param {String} event
     */
    function stop(event) {
        if (window.document.all) {
            event.keyCode = 0;
        }
        if (event.preventDefault) {
            event.preventDefault();
            event.stopPropagation();
        }
        return this;
    }
    /*   
     * Execute all handlers and behaviors attached to the matched elements for the given event  
     * @param {String} evented
     * @param {String} type
     * @param {Array or PlainObject } args
     */
    function trigger(evented, type, args) {
        var e;
        if (type instanceof Event) {
            e = type;
        } else {
            e = createEvent(type, args);
        }
        e._args = args;

        var fn = (evented.dispatchEvent || evented.trigger);
        if (fn) {
            fn.call(evented, e);
        } else {
            console.warn("The evented parameter is not a eventable object");
        }

        return this;
    }
    /*   
     * Specify a function to execute when the DOM is fully loaded.  
     * @param {Function} callback
     */
    function ready(callback) {
        // need to check if document.body exists for IE as that browser reports
        // document ready when it hasn't yet created the body elm
        if (readyRE.test(document.readyState) && document.body) {
            langx.defer(callback);
        } else {
            document.addEventListener('DOMContentLoaded', callback, false);
        }

        return this;
    }

    var keyCodeLookup = {
        "backspace": 8,
        "comma": 188,
        "delete": 46,
        "down": 40,
        "end": 35,
        "enter": 13,
        "escape": 27,
        "home": 36,
        "left": 37,
        "page_down": 34,
        "page_up": 33,
        "period": 190,
        "right": 39,
        "space": 32,
        "tab": 9,
        "up": 38
    };
    //example:
    //shortcuts(elm).add("CTRL+ALT+SHIFT+X",function(){console.log("test!")});
    function shortcuts(elm) {

        var registry = datax.data(elm, "shortcuts");
        if (!registry) {
            registry = {};
            datax.data(elm, "shortcuts", registry);
            var run = function(shortcut, event) {
                var n = event.metaKey || event.ctrlKey;
                if (shortcut.ctrl == n && shortcut.alt == event.altKey && shortcut.shift == event.shiftKey) {
                    if (event.keyCode == shortcut.keyCode || event.charCode && event.charCode == shortcut.charCode) {
                        event.preventDefault();
                        if ("keydown" == event.type) {
                            shortcut.fn(event);
                        }
                        return true;
                    }
                }
            };
            on(elm, "keyup keypress keydown", function(event) {
                if (!(/INPUT|TEXTAREA/.test(event.target.nodeName))) {
                    for (var key in registry) {
                        run(registry[key], event);
                    }
                }
            });

        }

        return {
            add: function(pattern, fn) {
                var shortcutKeys;
                if (pattern.indexOf(",") > -1) {
                    shortcutKeys = pattern.toLowerCase().split(",");
                } else {
                    shortcutKeys = pattern.toLowerCase().split(" ");
                }
                shortcutKeys.forEach(function(shortcutKey) {
                    var setting = {
                        fn: fn,
                        alt: false,
                        ctrl: false,
                        shift: false
                    };
                    shortcutKey.split("+").forEach(function(key) {
                        switch (key) {
                            case "alt":
                            case "ctrl":
                            case "shift":
                                setting[key] = true;
                                break;
                            default:
                                setting.charCode = key.charCodeAt(0);
                                setting.keyCode = keyCodeLookup[key] || key.toUpperCase().charCodeAt(0);
                        }
                    });
                    var regKey = (setting.ctrl ? "ctrl" : "") + "," + (setting.alt ? "alt" : "") + "," + (setting.shift ? "shift" : "") + "," + setting.keyCode;
                    registry[regKey] = setting;
                })
            }

        };

    }

    if (browser.support.transition) {
        specialEvents.transitionEnd = {
//          handle: function (e) {
//            if ($(e.target).is(this)) return e.handleObj.handler.apply(this, arguments)
//          },
          bindType: browser.support.transition.end,
          delegateType: browser.support.transition.end
        }        
    }

    function eventer() {
        return eventer;
    }

    langx.mixin(eventer, {
        create: createEvent,

        keys: keyCodeLookup,

        off: off,

        on: on,

        one: one,

        proxy: createProxy,

        ready: ready,

        shortcuts: shortcuts,

        special: specialEvents,

        stop: stop,

        trigger: trigger

    });

    return dom.eventer = eventer;
});
define('skylark-utils-dom/geom',[
    "./dom",
    "./langx",
    "./noder",
    "./styler"
], function(dom, langx, noder, styler) {
    var rootNodeRE = /^(?:body|html)$/i,
        px = langx.toPixel,
        offsetParent = noder.offsetParent,
        cachedScrollbarWidth;

    function scrollbarWidth() {
        if (cachedScrollbarWidth !== undefined) {
            return cachedScrollbarWidth;
        }
        var w1, w2,
            div = noder.createFragment("<div style=" +
                "'display:block;position:absolute;width:200px;height:200px;overflow:hidden;'>" +
                "<div style='height:300px;width:auto;'></div></div>")[0],
            innerDiv = div.childNodes[0];

        noder.append(document.body, div);

        w1 = innerDiv.offsetWidth;

        styler.css(div, "overflow", "scroll");

        w2 = innerDiv.offsetWidth;

        if (w1 === w2) {
            w2 = div[0].clientWidth;
        }

        noder.remove(div);

        return (cachedScrollbarWidth = w1 - w2);
    }
    /*
     * Get the widths of each border of the specified element.
     * @param {HTMLElement} elm
     */
    function borderExtents(elm) {
        if (noder.isWindow(elm)) {
            return {
                left : 0,
                top : 0,
                right : 0,
                bottom : 0
            }
        }        var s = getComputedStyle(elm);
        return {
            left: px(s.borderLeftWidth, elm),
            top: px(s.borderTopWidth, elm),
            right: px(s.borderRightWidth, elm),
            bottom: px(s.borderBottomWidth, elm)
        }
    }

    //viewport coordinate
    /*
     * Get or set the viewport position of the specified element border box.
     * @param {HTMLElement} elm
     * @param {PlainObject} coords
     */
    function boundingPosition(elm, coords) {
        if (coords === undefined) {
            return rootNodeRE.test(elm.nodeName) ? { top: 0, left: 0 } : elm.getBoundingClientRect();
        } else {
            var // Get *real* offsetParent
                parent = offsetParent(elm),
                // Get correct offsets
                parentOffset = boundingPosition(parent),
                mex = marginExtents(elm),
                pbex = borderExtents(parent);

            relativePosition(elm, {
                top: coords.top - parentOffset.top - mex.top - pbex.top,
                left: coords.left - parentOffset.left - mex.left - pbex.left
            });
            return this;
        }
    }

    /*
     * Get or set the viewport rect of the specified element border box.
     * @param {HTMLElement} elm
     * @param {PlainObject} coords
     */
    function boundingRect(elm, coords) {
        if (coords === undefined) {
            return elm.getBoundingClientRect()
        } else {
            boundingPosition(elm, coords);
            size(elm, coords);
            return this;
        }
    }

    /*
     * Get or set the height of the specified element client box.
     * @param {HTMLElement} elm
     * @param {Number} value
     */
    function clientHeight(elm, value) {
        if (value == undefined) {
            return clientSize(elm).height;
        } else {
            return clientSize(elm, {
                height: value
            });
        }
    }

    /*
     * Get or set the size of the specified element client box.
     * @param {HTMLElement} elm
     * @param {PlainObject} dimension
     */
    function clientSize(elm, dimension) {
        if (dimension == undefined) {
            return {
                width: elm.clientWidth,
                height: elm.clientHeight
            }
        } else {
            var isBorderBox = (styler.css(elm, "box-sizing") === "border-box"),
                props = {
                    width: dimension.width,
                    height: dimension.height
                };
            if (!isBorderBox) {
                var pex = paddingExtents(elm);

                if (props.width !== undefined) {
                    props.width = props.width - pex.left - pex.right;
                }

                if (props.height !== undefined) {
                    props.height = props.height - pex.top - pex.bottom;
                }
            } else {
                var bex = borderExtents(elm);

                if (props.width !== undefined) {
                    props.width = props.width + bex.left + bex.right;
                }

                if (props.height !== undefined) {
                    props.height = props.height + bex.top + bex.bottom;
                }

            }
            styler.css(elm, props);
            return this;
        }
        return {
            width: elm.clientWidth,
            height: elm.clientHeight
        };
    }

    /*
     * Get or set the width of the specified element client box.
     * @param {HTMLElement} elm
     * @param {PlainObject} dimension
     */
    function clientWidth(elm, value) {
        if (value == undefined) {
            return clientSize(elm).width;
        } else {
            clientSize(elm, {
                width: value
            });
            return this;
        }
    }

    /*
     * Get the rect of the specified element content box.
     * @param {HTMLElement} elm
     */
    function contentRect(elm) {
        var cs = clientSize(elm),
            pex = paddingExtents(elm);


        //// On Opera, offsetLeft includes the parent's border
        //if(has("opera")){
        //    pe.l += be.l;
        //    pe.t += be.t;
        //}
        return {
            left: pex.left,
            top: pex.top,
            width: cs.width - pex.left - pex.right,
            height: cs.height - pex.top - pex.bottom
        };
    }

    /*
     * Get the document size.
     * @param {HTMLDocument} doc
     */
    function getDocumentSize(doc) {
        var documentElement = doc.documentElement,
            body = doc.body,
            max = Math.max,
            scrollWidth = max(documentElement.scrollWidth, body.scrollWidth),
            clientWidth = max(documentElement.clientWidth, body.clientWidth),
            offsetWidth = max(documentElement.offsetWidth, body.offsetWidth),
            scrollHeight = max(documentElement.scrollHeight, body.scrollHeight),
            clientHeight = max(documentElement.clientHeight, body.clientHeight),
            offsetHeight = max(documentElement.offsetHeight, body.offsetHeight);

        return {
            width: scrollWidth < offsetWidth ? clientWidth : scrollWidth,
            height: scrollHeight < offsetHeight ? clientHeight : scrollHeight
        };
    }

    /*
     * Get the document size.
     * @param {HTMLElement} elm
     * @param {Number} value
     */
    function height(elm, value) {
        if (value == undefined) {
            return size(elm).height;
        } else {
            size(elm, {
                height: value
            });
            return this;
        }
    }

    /*
     * Get the widths of each margin of the specified element.
     * @param {HTMLElement} elm
     */
    function marginExtents(elm) {
        if (noder.isWindow(elm)) {
            return {
                left : 0,
                top : 0,
                right : 0,
                bottom : 0
            }
        }
        var s = getComputedStyle(elm);
        return {
            left: px(s.marginLeft),
            top: px(s.marginTop),
            right: px(s.marginRight),
            bottom: px(s.marginBottom),
        }
    }


    function marginRect(elm) {
        var obj = relativeRect(elm),
            me = marginExtents(elm);

        return {
            left: obj.left,
            top: obj.top,
            width: obj.width + me.left + me.right,
            height: obj.height + me.top + me.bottom
        };
    }


    function marginSize(elm) {
        var obj = size(elm),
            me = marginExtents(elm);

        return {
            width: obj.width + me.left + me.right,
            height: obj.height + me.top + me.bottom
        };
    }

    /*
     * Get the widths of each padding of the specified element.
     * @param {HTMLElement} elm
     */
    function paddingExtents(elm) {
        if (noder.isWindow(elm)) {
            return {
                left : 0,
                top : 0,
                right : 0,
                bottom : 0
            }
        }
        var s = getComputedStyle(elm);
        return {
            left: px(s.paddingLeft),
            top: px(s.paddingTop),
            right: px(s.paddingRight),
            bottom: px(s.paddingBottom),
        }
    }

    /*
     * Get or set the document position of the specified element border box.
     * @param {HTMLElement} elm
     * @param {PlainObject} coords
     */
    //coordinate to the document
    function pagePosition(elm, coords) {
        if (coords === undefined) {
            var obj = elm.getBoundingClientRect()
            return {
                left: obj.left + window.pageXOffset,
                top: obj.top + window.pageYOffset
            }
        } else {
            var // Get *real* offsetParent
                parent = offsetParent(elm),
                // Get correct offsets
                parentOffset = pagePosition(parent),
                mex = marginExtents(elm),
                pbex = borderExtents(parent);

            relativePosition(elm, {
                top: coords.top - parentOffset.top - mex.top - pbex.top,
                left: coords.left - parentOffset.left - mex.left - pbex.left
            });
            return this;
        }
    }

    /*
     * Get or set the document rect of the specified element border box.
     * @param {HTMLElement} elm
     * @param {PlainObject} coords
     */
    function pageRect(elm, coords) {
        if (coords === undefined) {
            var obj = elm.getBoundingClientRect()
            return {
                left: obj.left + window.pageXOffset,
                top: obj.top + window.pageYOffset,
                width: Math.round(obj.width),
                height: Math.round(obj.height)
            }
        } else {
            pagePosition(elm, coords);
            size(elm, coords);
            return this;
        }
    }

    /*
     * Get or set the position of the specified element border box , relative to parent element.
     * @param {HTMLElement} elm
     * @param {PlainObject} coords
     */
    // coordinate relative to it's parent
    function relativePosition(elm, coords) {
        if (coords == undefined) {
            var // Get *real* offsetParent
                parent = offsetParent(elm),
                // Get correct offsets
                offset = boundingPosition(elm),
                parentOffset = boundingPosition(parent),
                mex = marginExtents(elm),
                pbex = borderExtents(parent);

            // Subtract parent offsets and element margins
            return {
                top: offset.top - parentOffset.top - pbex.top, // - mex.top,
                left: offset.left - parentOffset.left - pbex.left, // - mex.left
            }
        } else {
            var props = {
                top: coords.top,
                left: coords.left
            }

            if (styler.css(elm, "position") == "static") {
                props['position'] = "relative";
            }
            styler.css(elm, props);
            return this;
        }
    }

    /*
     * Get or set the rect of the specified element border box , relatived to parent element.
     * @param {HTMLElement} elm
     * @param {PlainObject} coords
     */
    function relativeRect(elm, coords) {
        if (coords === undefined) {
            var // Get *real* offsetParent
                parent = offsetParent(elm),
                // Get correct offsets
                offset = boundingRect(elm),
                parentOffset = boundingPosition(parent),
                mex = marginExtents(elm),
                pbex = borderExtents(parent);

            // Subtract parent offsets and element margins
            return {
                top: offset.top - parentOffset.top - pbex.top, // - mex.top,
                left: offset.left - parentOffset.left - pbex.left, // - mex.left,
                width: offset.width,
                height: offset.height
            }
        } else {
            relativePosition(elm, coords);
            size(elm, coords);
            return this;
        }
    }
    /*
     * Scroll the specified element into view.
     * @param {HTMLElement} elm
     * @param {} align
     */
    function scrollIntoView(elm, align) {
        function getOffset(elm, rootElm) {
            var x, y, parent = elm;

            x = y = 0;
            while (parent && parent != rootElm && parent.nodeType) {
                x += parent.offsetLeft || 0;
                y += parent.offsetTop || 0;
                parent = parent.offsetParent;
            }

            return { x: x, y: y };
        }

        var parentElm = elm.parentNode;
        var x, y, width, height, parentWidth, parentHeight;
        var pos = getOffset(elm, parentElm);

        x = pos.x;
        y = pos.y;
        width = elm.offsetWidth;
        height = elm.offsetHeight;
        parentWidth = parentElm.clientWidth;
        parentHeight = parentElm.clientHeight;

        if (align == "end") {
            x -= parentWidth - width;
            y -= parentHeight - height;
        } else if (align == "center") {
            x -= (parentWidth / 2) - (width / 2);
            y -= (parentHeight / 2) - (height / 2);
        }

        parentElm.scrollLeft = x;
        parentElm.scrollTop = y;

        return this;
    }
    /*
     * Get or set the current horizontal position of the scroll bar for the specified element.
     * @param {HTMLElement} elm
     * @param {Number} value
     */
    function scrollLeft(elm, value) {
        var hasScrollLeft = "scrollLeft" in elm;
        if (value === undefined) {
            return hasScrollLeft ? elm.scrollLeft : elm.pageXOffset
        } else {
            if (hasScrollLeft) {
                elm.scrollLeft = value;
            } else {
                elm.scrollTo(value, elm.scrollY);
            }
            return this;
        }
    }
    /*
     * Get or the current vertical position of the scroll bar for the specified element.
     * @param {HTMLElement} elm
     * @param {Number} value
     */
    function scrollTop(elm, value) {
        var hasScrollTop = "scrollTop" in elm;

        if (value === undefined) {
            return hasScrollTop ? elm.scrollTop : elm.pageYOffset
        } else {
            if (hasScrollTop) {
                elm.scrollTop = value;
            } else {
                elm.scrollTo(elm.scrollX, value);
            }
            return this;
        }
    }
    /*
     * Get or set the size of the specified element border box.
     * @param {HTMLElement} elm
     * @param {PlainObject}dimension
     */
    function size(elm, dimension) {
        if (dimension == undefined) {
            if (langx.isWindow(elm)) {
                return {
                    width: elm.innerWidth,
                    height: elm.innerHeight
                }

            } else if (langx.isDocument(elm)) {
                return getDocumentSize(document);
            } else {
                return {
                    width: elm.offsetWidth,
                    height: elm.offsetHeight
                }
            }
        } else {
            var isBorderBox = (styler.css(elm, "box-sizing") === "border-box"),
                props = {
                    width: dimension.width,
                    height: dimension.height
                };
            if (!isBorderBox) {
                var pex = paddingExtents(elm),
                    bex = borderExtents(elm);

                if (props.width !== undefined && props.width !== "" && props.width !== null) {
                    props.width = props.width - pex.left - pex.right - bex.left - bex.right;
                }

                if (props.height !== undefined && props.height !== "" && props.height !== null) {
                    props.height = props.height - pex.top - pex.bottom - bex.top - bex.bottom;
                }
            }
            styler.css(elm, props);
            return this;
        }
    }
    /*
     * Get or set the size of the specified element border box.
     * @param {HTMLElement} elm
     * @param {Number} value
     */
    function width(elm, value) {
        if (value == undefined) {
            return size(elm).width;
        } else {
            size(elm, {
                width: value
            });
            return this;
        }
    }

    function geom() {
        return geom;
    }

    langx.mixin(geom, {
        borderExtents: borderExtents,
        //viewport coordinate
        boundingPosition: boundingPosition,

        boundingRect: boundingRect,

        clientHeight: clientHeight,

        clientSize: clientSize,

        clientWidth: clientWidth,

        contentRect: contentRect,

        getDocumentSize: getDocumentSize,

        height: height,

        marginExtents: marginExtents,

        marginRect: marginRect,

        marginSize: marginSize,

        offsetParent: offsetParent,

        paddingExtents: paddingExtents,

        //coordinate to the document
        pagePosition: pagePosition,

        pageRect: pageRect,

        // coordinate relative to it's parent
        relativePosition: relativePosition,

        relativeRect: relativeRect,

        scrollbarWidth: scrollbarWidth,

        scrollIntoView: scrollIntoView,

        scrollLeft: scrollLeft,

        scrollTop: scrollTop,

        size: size,

        width: width
    });

    ( function() {
        var max = Math.max,
            abs = Math.abs,
            rhorizontal = /left|center|right/,
            rvertical = /top|center|bottom/,
            roffset = /[\+\-]\d+(\.[\d]+)?%?/,
            rposition = /^\w+/,
            rpercent = /%$/;

        function getOffsets( offsets, width, height ) {
            return [
                parseFloat( offsets[ 0 ] ) * ( rpercent.test( offsets[ 0 ] ) ? width / 100 : 1 ),
                parseFloat( offsets[ 1 ] ) * ( rpercent.test( offsets[ 1 ] ) ? height / 100 : 1 )
            ];
        }

        function parseCss( element, property ) {
            return parseInt( styler.css( element, property ), 10 ) || 0;
        }

        function getDimensions( raw ) {
            if ( raw.nodeType === 9 ) {
                return {
                    size: size(raw),
                    offset: { top: 0, left: 0 }
                };
            }
            if ( noder.isWindow( raw ) ) {
                return {
                    size: size(raw),
                    offset: { 
                        top: scrollTop(raw), 
                        left: scrollLeft(raw) 
                    }
                };
            }
            if ( raw.preventDefault ) {
                return {
                    size : {
                        width: 0,
                        height: 0
                    },
                    offset: { 
                        top: raw.pageY, 
                        left: raw.pageX 
                    }
                };
            }
            return {
                size: size(raw),
                offset: pagePosition(raw)
            };
        }

        function getScrollInfo( within ) {
            var overflowX = within.isWindow || within.isDocument ? "" :
                    styler.css(within.element,"overflow-x" ),
                overflowY = within.isWindow || within.isDocument ? "" :
                    styler.css(within.element,"overflow-y" ),
                hasOverflowX = overflowX === "scroll" ||
                    ( overflowX === "auto" && within.width < scrollWidth(within.element) ),
                hasOverflowY = overflowY === "scroll" ||
                    ( overflowY === "auto" && within.height < scrollHeight(within.element));
            return {
                width: hasOverflowY ? scrollbarWidth() : 0,
                height: hasOverflowX ? scrollbarWidth() : 0
            };
        }

        function getWithinInfo( element ) {
            var withinElement = element || window,
                isWindow = noder.isWindow( withinElement),
                isDocument = !!withinElement && withinElement.nodeType === 9,
                hasOffset = !isWindow && !isDocument,
                msize = marginSize(withinElement);
            return {
                element: withinElement,
                isWindow: isWindow,
                isDocument: isDocument,
                offset: hasOffset ? pagePosition(element) : { left: 0, top: 0 },
                scrollLeft: scrollLeft(withinElement),
                scrollTop: scrollTop(withinElement),
                width: msize.width,
                height: msize.height
            };
        }

        function posit(elm,options ) {
            // Make a copy, we don't want to modify arguments
            options = langx.extend( {}, options );

            var atOffset, targetWidth, targetHeight, targetOffset, basePosition, dimensions,
                target = options.of,
                within = getWithinInfo( options.within ),
                scrollInfo = getScrollInfo( within ),
                collision = ( options.collision || "flip" ).split( " " ),
                offsets = {};

            dimensions = getDimensions( target );
            if ( target.preventDefault ) {

                // Force left top to allow flipping
                options.at = "left top";
            }
            targetWidth = dimensions.size.width;
            targetHeight = dimensions.size.height;
            targetOffset = dimensions.offset;

            // Clone to reuse original targetOffset later
            basePosition = langx.extend( {}, targetOffset );

            // Force my and at to have valid horizontal and vertical positions
            // if a value is missing or invalid, it will be converted to center
            langx.each( [ "my", "at" ], function() {
                var pos = ( options[ this ] || "" ).split( " " ),
                    horizontalOffset,
                    verticalOffset;

                if ( pos.length === 1 ) {
                    pos = rhorizontal.test( pos[ 0 ] ) ?
                        pos.concat( [ "center" ] ) :
                        rvertical.test( pos[ 0 ] ) ?
                            [ "center" ].concat( pos ) :
                            [ "center", "center" ];
                }
                pos[ 0 ] = rhorizontal.test( pos[ 0 ] ) ? pos[ 0 ] : "center";
                pos[ 1 ] = rvertical.test( pos[ 1 ] ) ? pos[ 1 ] : "center";

                // Calculate offsets
                horizontalOffset = roffset.exec( pos[ 0 ] );
                verticalOffset = roffset.exec( pos[ 1 ] );
                offsets[ this ] = [
                    horizontalOffset ? horizontalOffset[ 0 ] : 0,
                    verticalOffset ? verticalOffset[ 0 ] : 0
                ];

                // Reduce to just the positions without the offsets
                options[ this ] = [
                    rposition.exec( pos[ 0 ] )[ 0 ],
                    rposition.exec( pos[ 1 ] )[ 0 ]
                ];
            } );

            // Normalize collision option
            if ( collision.length === 1 ) {
                collision[ 1 ] = collision[ 0 ];
            }

            if ( options.at[ 0 ] === "right" ) {
                basePosition.left += targetWidth;
            } else if ( options.at[ 0 ] === "center" ) {
                basePosition.left += targetWidth / 2;
            }

            if ( options.at[ 1 ] === "bottom" ) {
                basePosition.top += targetHeight;
            } else if ( options.at[ 1 ] === "center" ) {
                basePosition.top += targetHeight / 2;
            }

            atOffset = getOffsets( offsets.at, targetWidth, targetHeight );
            basePosition.left += atOffset[ 0 ];
            basePosition.top += atOffset[ 1 ];

            return ( function(elem) {
                var collisionPosition, using,
                    msize = marginSize(elem),
                    elemWidth = msize.width,
                    elemHeight = msize.height,
                    marginLeft = parseCss( elem, "marginLeft" ),
                    marginTop = parseCss( elem, "marginTop" ),
                    collisionWidth = elemWidth + marginLeft + parseCss( elem, "marginRight" ) +
                        scrollInfo.width,
                    collisionHeight = elemHeight + marginTop + parseCss( elem, "marginBottom" ) +
                        scrollInfo.height,
                    position = langx.extend( {}, basePosition ),
                    myOffset = getOffsets( offsets.my, msize.width, msize.height);

                if ( options.my[ 0 ] === "right" ) {
                    position.left -= elemWidth;
                } else if ( options.my[ 0 ] === "center" ) {
                    position.left -= elemWidth / 2;
                }

                if ( options.my[ 1 ] === "bottom" ) {
                    position.top -= elemHeight;
                } else if ( options.my[ 1 ] === "center" ) {
                    position.top -= elemHeight / 2;
                }

                position.left += myOffset[ 0 ];
                position.top += myOffset[ 1 ];

                collisionPosition = {
                    marginLeft: marginLeft,
                    marginTop: marginTop
                };

                langx.each( [ "left", "top" ], function( i, dir ) {
                    if ( positions[ collision[ i ] ] ) {
                        positions[ collision[ i ] ][ dir ]( position, {
                            targetWidth: targetWidth,
                            targetHeight: targetHeight,
                            elemWidth: elemWidth,
                            elemHeight: elemHeight,
                            collisionPosition: collisionPosition,
                            collisionWidth: collisionWidth,
                            collisionHeight: collisionHeight,
                            offset: [ atOffset[ 0 ] + myOffset[ 0 ], atOffset [ 1 ] + myOffset[ 1 ] ],
                            my: options.my,
                            at: options.at,
                            within: within,
                            elem: elem
                        } );
                    }
                } );

                if ( options.using ) {

                    // Adds feedback as second argument to using callback, if present
                    using = function( props ) {
                        var left = targetOffset.left - position.left,
                            right = left + targetWidth - elemWidth,
                            top = targetOffset.top - position.top,
                            bottom = top + targetHeight - elemHeight,
                            feedback = {
                                target: {
                                    element: target,
                                    left: targetOffset.left,
                                    top: targetOffset.top,
                                    width: targetWidth,
                                    height: targetHeight
                                },
                                element: {
                                    element: elem,
                                    left: position.left,
                                    top: position.top,
                                    width: elemWidth,
                                    height: elemHeight
                                },
                                horizontal: right < 0 ? "left" : left > 0 ? "right" : "center",
                                vertical: bottom < 0 ? "top" : top > 0 ? "bottom" : "middle"
                            };
                        if ( targetWidth < elemWidth && abs( left + right ) < targetWidth ) {
                            feedback.horizontal = "center";
                        }
                        if ( targetHeight < elemHeight && abs( top + bottom ) < targetHeight ) {
                            feedback.vertical = "middle";
                        }
                        if ( max( abs( left ), abs( right ) ) > max( abs( top ), abs( bottom ) ) ) {
                            feedback.important = "horizontal";
                        } else {
                            feedback.important = "vertical";
                        }
                        options.using.call( this, props, feedback );
                    };
                }

                pagePosition(elem, langx.extend( position, { using: using } ));
            })(elm);
        }

        var positions = {
            fit: {
                left: function( position, data ) {
                    var within = data.within,
                        withinOffset = within.isWindow ? within.scrollLeft : within.offset.left,
                        outerWidth = within.width,
                        collisionPosLeft = position.left - data.collisionPosition.marginLeft,
                        overLeft = withinOffset - collisionPosLeft,
                        overRight = collisionPosLeft + data.collisionWidth - outerWidth - withinOffset,
                        newOverRight;

                    // Element is wider than within
                    if ( data.collisionWidth > outerWidth ) {

                        // Element is initially over the left side of within
                        if ( overLeft > 0 && overRight <= 0 ) {
                            newOverRight = position.left + overLeft + data.collisionWidth - outerWidth -
                                withinOffset;
                            position.left += overLeft - newOverRight;

                        // Element is initially over right side of within
                        } else if ( overRight > 0 && overLeft <= 0 ) {
                            position.left = withinOffset;

                        // Element is initially over both left and right sides of within
                        } else {
                            if ( overLeft > overRight ) {
                                position.left = withinOffset + outerWidth - data.collisionWidth;
                            } else {
                                position.left = withinOffset;
                            }
                        }

                    // Too far left -> align with left edge
                    } else if ( overLeft > 0 ) {
                        position.left += overLeft;

                    // Too far right -> align with right edge
                    } else if ( overRight > 0 ) {
                        position.left -= overRight;

                    // Adjust based on position and margin
                    } else {
                        position.left = max( position.left - collisionPosLeft, position.left );
                    }
                },
                top: function( position, data ) {
                    var within = data.within,
                        withinOffset = within.isWindow ? within.scrollTop : within.offset.top,
                        outerHeight = data.within.height,
                        collisionPosTop = position.top - data.collisionPosition.marginTop,
                        overTop = withinOffset - collisionPosTop,
                        overBottom = collisionPosTop + data.collisionHeight - outerHeight - withinOffset,
                        newOverBottom;

                    // Element is taller than within
                    if ( data.collisionHeight > outerHeight ) {

                        // Element is initially over the top of within
                        if ( overTop > 0 && overBottom <= 0 ) {
                            newOverBottom = position.top + overTop + data.collisionHeight - outerHeight -
                                withinOffset;
                            position.top += overTop - newOverBottom;

                        // Element is initially over bottom of within
                        } else if ( overBottom > 0 && overTop <= 0 ) {
                            position.top = withinOffset;

                        // Element is initially over both top and bottom of within
                        } else {
                            if ( overTop > overBottom ) {
                                position.top = withinOffset + outerHeight - data.collisionHeight;
                            } else {
                                position.top = withinOffset;
                            }
                        }

                    // Too far up -> align with top
                    } else if ( overTop > 0 ) {
                        position.top += overTop;

                    // Too far down -> align with bottom edge
                    } else if ( overBottom > 0 ) {
                        position.top -= overBottom;

                    // Adjust based on position and margin
                    } else {
                        position.top = max( position.top - collisionPosTop, position.top );
                    }
                }
            },
            flip: {
                left: function( position, data ) {
                    var within = data.within,
                        withinOffset = within.offset.left + within.scrollLeft,
                        outerWidth = within.width,
                        offsetLeft = within.isWindow ? within.scrollLeft : within.offset.left,
                        collisionPosLeft = position.left - data.collisionPosition.marginLeft,
                        overLeft = collisionPosLeft - offsetLeft,
                        overRight = collisionPosLeft + data.collisionWidth - outerWidth - offsetLeft,
                        myOffset = data.my[ 0 ] === "left" ?
                            -data.elemWidth :
                            data.my[ 0 ] === "right" ?
                                data.elemWidth :
                                0,
                        atOffset = data.at[ 0 ] === "left" ?
                            data.targetWidth :
                            data.at[ 0 ] === "right" ?
                                -data.targetWidth :
                                0,
                        offset = -2 * data.offset[ 0 ],
                        newOverRight,
                        newOverLeft;

                    if ( overLeft < 0 ) {
                        newOverRight = position.left + myOffset + atOffset + offset + data.collisionWidth -
                            outerWidth - withinOffset;
                        if ( newOverRight < 0 || newOverRight < abs( overLeft ) ) {
                            position.left += myOffset + atOffset + offset;
                        }
                    } else if ( overRight > 0 ) {
                        newOverLeft = position.left - data.collisionPosition.marginLeft + myOffset +
                            atOffset + offset - offsetLeft;
                        if ( newOverLeft > 0 || abs( newOverLeft ) < overRight ) {
                            position.left += myOffset + atOffset + offset;
                        }
                    }
                },
                top: function( position, data ) {
                    var within = data.within,
                        withinOffset = within.offset.top + within.scrollTop,
                        outerHeight = within.height,
                        offsetTop = within.isWindow ? within.scrollTop : within.offset.top,
                        collisionPosTop = position.top - data.collisionPosition.marginTop,
                        overTop = collisionPosTop - offsetTop,
                        overBottom = collisionPosTop + data.collisionHeight - outerHeight - offsetTop,
                        top = data.my[ 1 ] === "top",
                        myOffset = top ?
                            -data.elemHeight :
                            data.my[ 1 ] === "bottom" ?
                                data.elemHeight :
                                0,
                        atOffset = data.at[ 1 ] === "top" ?
                            data.targetHeight :
                            data.at[ 1 ] === "bottom" ?
                                -data.targetHeight :
                                0,
                        offset = -2 * data.offset[ 1 ],
                        newOverTop,
                        newOverBottom;
                    if ( overTop < 0 ) {
                        newOverBottom = position.top + myOffset + atOffset + offset + data.collisionHeight -
                            outerHeight - withinOffset;
                        if ( newOverBottom < 0 || newOverBottom < abs( overTop ) ) {
                            position.top += myOffset + atOffset + offset;
                        }
                    } else if ( overBottom > 0 ) {
                        newOverTop = position.top - data.collisionPosition.marginTop + myOffset + atOffset +
                            offset - offsetTop;
                        if ( newOverTop > 0 || abs( newOverTop ) < overBottom ) {
                            position.top += myOffset + atOffset + offset;
                        }
                    }
                }
            },
            flipfit: {
                left: function() {
                    positions.flip.left.apply( this, arguments );
                    positions.fit.left.apply( this, arguments );
                },
                top: function() {
                    positions.flip.top.apply( this, arguments );
                    positions.fit.top.apply( this, arguments );
                }
            }
        };

        geom.posit = posit;
    })();

    return dom.geom = geom;
});
define('skylark-utils-dom/fx',[
    "./dom",
    "./langx",
    "./browser",
    "./geom",
    "./styler",
    "./eventer"
], function(dom, langx, browser, geom, styler, eventer) {
    var animationName,
        animationDuration,
        animationTiming,
        animationDelay,
        transitionProperty,
        transitionDuration,
        transitionTiming,
        transitionDelay,

        animationEnd = browser.normalizeCssEvent('AnimationEnd'),
        transitionEnd = browser.normalizeCssEvent('TransitionEnd'),

        supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
        transform = browser.css3PropPrefix + "transform",
        cssReset = {};


    cssReset[animationName = browser.normalizeCssProperty("animation-name")] =
        cssReset[animationDuration = browser.normalizeCssProperty("animation-duration")] =
        cssReset[animationDelay = browser.normalizeCssProperty("animation-delay")] =
        cssReset[animationTiming = browser.normalizeCssProperty("animation-timing-function")] = "";

    cssReset[transitionProperty = browser.normalizeCssProperty("transition-property")] =
        cssReset[transitionDuration = browser.normalizeCssProperty("transition-duration")] =
        cssReset[transitionDelay = browser.normalizeCssProperty("transition-delay")] =
        cssReset[transitionTiming = browser.normalizeCssProperty("transition-timing-function")] = "";



    /*   
     * Perform a custom animation of a set of CSS properties.
     * @param {Object} elm  
     * @param {Number or String} properties
     * @param {String} ease
     * @param {Number or String} duration
     * @param {Function} callback
     * @param {Number or String} delay
     */
    function animate(elm, properties, duration, ease, callback, delay) {
        var key,
            cssValues = {},
            cssProperties = [],
            transforms = "",
            that = this,
            endEvent,
            wrappedCallback,
            fired = false,
            hasScrollTop = false,
            resetClipAuto = false;

        if (langx.isPlainObject(duration)) {
            ease = duration.easing;
            callback = duration.complete;
            delay = duration.delay;
            duration = duration.duration;
        }

        if (langx.isString(duration)) {
            duration = fx.speeds[duration];
        }
        if (duration === undefined) {
            duration = fx.speeds.normal;
        }
        duration = duration / 1000;
        if (fx.off) {
            duration = 0;
        }

        if (langx.isFunction(ease)) {
            callback = ease;
            eace = "swing";
        } else {
            ease = ease || "swing";
        }

        if (delay) {
            delay = delay / 1000;
        } else {
            delay = 0;
        }

        if (langx.isString(properties)) {
            // keyframe animation
            cssValues[animationName] = properties;
            cssValues[animationDuration] = duration + "s";
            cssValues[animationTiming] = ease;
            endEvent = animationEnd;
        } else {
            // CSS transitions
            for (key in properties) {
                var v = properties[key];
                if (supportedTransforms.test(key)) {
                    transforms += key + "(" + v + ") ";
                } else {
                    if (key === "scrollTop") {
                        hasScrollTop = true;
                    }
                    if (key == "clip" && langx.isPlainObject(v)) {
                        cssValues[key] = "rect(" + v.top+"px,"+ v.right +"px,"+ v.bottom +"px,"+ v.left+"px)";
                        if (styler.css(elm,"clip") == "auto") {
                            var size = geom.size(elm);
                            styler.css(elm,"clip","rect("+"0px,"+ size.width +"px,"+ size.height +"px,"+"0px)");  
                            resetClipAuto = true;
                        }

                    } else {
                        cssValues[key] = v;
                    }
                    cssProperties.push(langx.dasherize(key));
                }
            }
            endEvent = transitionEnd;
        }

        if (transforms) {
            cssValues[transform] = transforms;
            cssProperties.push(transform);
        }

        if (duration > 0 && langx.isPlainObject(properties)) {
            cssValues[transitionProperty] = cssProperties.join(", ");
            cssValues[transitionDuration] = duration + "s";
            cssValues[transitionDelay] = delay + "s";
            cssValues[transitionTiming] = ease;
        }

        wrappedCallback = function(event) {
            fired = true;
            if (event) {
                if (event.target !== event.currentTarget) {
                    return // makes sure the event didn't bubble from "below"
                }
                eventer.off(event.target, endEvent, wrappedCallback)
            } else {
                eventer.off(elm, animationEnd, wrappedCallback) // triggered by setTimeout
            }
            styler.css(elm, cssReset);
            if (resetClipAuto) {
 //               styler.css(elm,"clip","auto");
            }
            callback && callback.call(this);
        };

        if (duration > 0) {
            eventer.on(elm, endEvent, wrappedCallback);
            // transitionEnd is not always firing on older Android phones
            // so make sure it gets fired
            langx.debounce(function() {
                if (fired) {
                    return;
                }
                wrappedCallback.call(that);
            }, ((duration + delay) * 1000) + 25)();
        }

        // trigger page reflow so new elements can animate
        elm.clientLeft;

        styler.css(elm, cssValues);

        if (duration <= 0) {
            langx.debounce(function() {
                if (fired) {
                    return;
                }
                wrappedCallback.call(that);
            }, 0)();
        }

        if (hasScrollTop) {
            scrollToTop(elm, properties["scrollTop"], duration, callback);
        }

        return this;
    }

    /*   
     * Display an element.
     * @param {Object} elm  
     * @param {String} speed
     * @param {Function} callback
     */
    function show(elm, speed, callback) {
        styler.show(elm);
        if (speed) {
            if (!callback && langx.isFunction(speed)) {
                callback = speed;
                speed = "normal";
            }
            styler.css(elm, "opacity", 0)
            animate(elm, { opacity: 1, scale: "1,1" }, speed, callback);
        }
        return this;
    }


    /*   
     * Hide an element.
     * @param {Object} elm  
     * @param {String} speed
     * @param {Function} callback
     */
    function hide(elm, speed, callback) {
        if (speed) {
            if (!callback && langx.isFunction(speed)) {
                callback = speed;
                speed = "normal";
            }
            animate(elm, { opacity: 0, scale: "0,0" }, speed, function() {
                styler.hide(elm);
                if (callback) {
                    callback.call(elm);
                }
            });
        } else {
            styler.hide(elm);
        }
        return this;
    }

    /*   
     * Set the vertical position of the scroll bar for an element.
     * @param {Object} elm  
     * @param {Number or String} pos
     * @param {Number or String} speed
     * @param {Function} callback
     */
    function scrollToTop(elm, pos, speed, callback) {
        var scrollFrom = parseInt(elm.scrollTop),
            i = 0,
            runEvery = 5, // run every 5ms
            freq = speed * 1000 / runEvery,
            scrollTo = parseInt(pos);

        var interval = setInterval(function() {
            i++;

            if (i <= freq) elm.scrollTop = (scrollTo - scrollFrom) / freq * i + scrollFrom;

            if (i >= freq + 1) {
                clearInterval(interval);
                if (callback) langx.debounce(callback, 1000)();
            }
        }, runEvery);
    }

    /*   
     * Display or hide an element.
     * @param {Object} elm  
     * @param {Number or String} speed
     * @param {Function} callback
     */
    function toggle(elm, speed, callback) {
        if (styler.isInvisible(elm)) {
            show(elm, speed, callback);
        } else {
            hide(elm, speed, callback);
        }
        return this;
    }

    /*   
     * Adjust the opacity of an element.
     * @param {Object} elm  
     * @param {Number or String} speed
     * @param {Number or String} opacity
     * @param {String} easing
     * @param {Function} callback
     */
    function fadeTo(elm, speed, opacity, easing, callback) {
        animate(elm, { opacity: opacity }, speed, easing, callback);
        return this;
    }


    /*   
     * Display an element by fading them to opaque.
     * @param {Object} elm  
     * @param {Number or String} speed
     * @param {String} easing
     * @param {Function} callback
     */
    function fadeIn(elm, speed, easing, callback) {
        var target = styler.css(elm, "opacity");
        if (target > 0) {
            styler.css(elm, "opacity", 0);
        } else {
            target = 1;
        }
        styler.show(elm);

        fadeTo(elm, speed, target, easing, callback);

        return this;
    }

    /*   
     * Hide an element by fading them to transparent.
     * @param {Object} elm  
     * @param {Number or String} speed
     * @param {String} easing
     * @param {Function} callback
     */
    function fadeOut(elm, speed, easing, callback) {
        var _elm = elm,
            complete,
            opacity = styler.css(elm,"opacity"),
            options = {};

        if (langx.isPlainObject(speed)) {
            options.easing = speed.easing;
            options.duration = speed.duration;
            complete = speed.complete;
        } else {
            options.duration = speed;
            if (callback) {
                complete = callback;
                options.easing = easing;
            } else {
                complete = easing;
            }
        }
        options.complete = function() {
            styler.css(elm,"opacity",opacity);
            styler.hide(elm);
            if (complete) {
                complete.call(elm);
            }
        }

        fadeTo(elm, options, 0);

        return this;
    }

    /*   
     * Display or hide an element by animating its opacity.
     * @param {Object} elm  
     * @param {Number or String} speed
     * @param {String} ceasing
     * @param {Function} callback
     */
    function fadeToggle(elm, speed, ceasing, allback) {
        if (styler.isInvisible(elm)) {
            fadeIn(elm, speed, easing, callback);
        } else {
            fadeOut(elm, speed, easing, callback);
        }
        return this;
    }

    /*   
     * Display an element with a sliding motion.
     * @param {Object} elm  
     * @param {Number or String} duration
     * @param {Function} callback
     */
    function slideDown(elm, duration, callback) {

        // get the element position to restore it then
        var position = styler.css(elm, 'position');

        // show element if it is hidden
        show(elm);

        // place it so it displays as usually but hidden
        styler.css(elm, {
            position: 'absolute',
            visibility: 'hidden'
        });

        // get naturally height, margin, padding
        var marginTop = styler.css(elm, 'margin-top');
        var marginBottom = styler.css(elm, 'margin-bottom');
        var paddingTop = styler.css(elm, 'padding-top');
        var paddingBottom = styler.css(elm, 'padding-bottom');
        var height = styler.css(elm, 'height');

        // set initial css for animation
        styler.css(elm, {
            position: position,
            visibility: 'visible',
            overflow: 'hidden',
            height: 0,
            marginTop: 0,
            marginBottom: 0,
            paddingTop: 0,
            paddingBottom: 0
        });

        // animate to gotten height, margin and padding
        animate(elm, {
            height: height,
            marginTop: marginTop,
            marginBottom: marginBottom,
            paddingTop: paddingTop,
            paddingBottom: paddingBottom
        }, {
            duration: duration,
            complete: function() {
                if (callback) {
                    callback.apply(elm);
                }
            }
        });

        return this;
    }

    /*   
     * Hide an element with a sliding motion.
     * @param {Object} elm  
     * @param {Number or String} duration
     * @param {Function} callback
     */
    function slideUp(elm, duration, callback) {
        // active the function only if the element is visible
        if (geom.height(elm) > 0) {

            // get the element position to restore it then
            var position = styler.css(elm, 'position');

            // get the element height, margin and padding to restore them then
            var height = styler.css(elm, 'height');
            var marginTop = styler.css(elm, 'margin-top');
            var marginBottom = styler.css(elm, 'margin-bottom');
            var paddingTop = styler.css(elm, 'padding-top');
            var paddingBottom = styler.css(elm, 'padding-bottom');

            // set initial css for animation
            styler.css(elm, {
                visibility: 'visible',
                overflow: 'hidden',
                height: height,
                marginTop: marginTop,
                marginBottom: marginBottom,
                paddingTop: paddingTop,
                paddingBottom: paddingBottom
            });

            // animate element height, margin and padding to zero
            animate(elm, {
                height: 0,
                marginTop: 0,
                marginBottom: 0,
                paddingTop: 0,
                paddingBottom: 0
            }, {
                // callback : restore the element position, height, margin and padding to original values
                duration: duration,
                queue: false,
                complete: function() {
                    hide(elm);
                    styler.css(elm, {
                        visibility: 'visible',
                        overflow: 'hidden',
                        height: height,
                        marginTop: marginTop,
                        marginBottom: marginBottom,
                        paddingTop: paddingTop,
                        paddingBottom: paddingBottom
                    });
                    if (callback) {
                        callback.apply(elm);
                    }
                }
            });
        }
        return this;
    }


    /*   
     * Display or hide an element with a sliding motion.
     * @param {Object} elm  
     * @param {Number or String} duration
     * @param {Function} callback
     */
    function slideToggle(elm, duration, callback) {

        // if the element is hidden, slideDown !
        if (geom.height(elm) == 0) {
            slideDown(elm, duration, callback);
        }
        // if the element is visible, slideUp !
        else {
            slideUp(elm, duration, callback);
        }
        return this;
    }

    function emulateTransitionEnd(elm,duration) {
        var called = false;
        eventer.one(elm,'transitionEnd', function () { 
            called = true;
        })
        var callback = function () { 
            if (!called) {
                eventer.trigger(elm,'transitionEnd') 
            }
        };
        setTimeout(callback, duration);
        
        return this;
    } 

    function fx() {
        return fx;
    }

    langx.mixin(fx, {
        off: false,

        speeds: {
            normal: 400,
            fast: 200,
            slow: 600
        },

        animate,
        emulateTransitionEnd,
        fadeIn,
        fadeOut,
        fadeTo,
        fadeToggle,
        hide,
        scrollToTop,

        slideDown,
        slideToggle,
        slideUp,
        show,
        toggle
    });

    return dom.fx = fx;
});
define('skylark-utils-dom/query',[
    "./dom",
    "./langx",
    "./noder",
    "./datax",
    "./eventer",
    "./finder",
    "./geom",
    "./styler",
    "./fx"
], function(dom, langx, noder, datax, eventer, finder, geom, styler, fx) {
    var some = Array.prototype.some,
        push = Array.prototype.push,
        every = Array.prototype.every,
        concat = Array.prototype.concat,
        slice = Array.prototype.slice,
        map = Array.prototype.map,
        filter = Array.prototype.filter,
        forEach = Array.prototype.forEach,
        indexOf = Array.prototype.indexOf,
        sort = Array.prototype.sort,
        isQ;

    var rquickExpr = /^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/;

    var funcArg = langx.funcArg,
        isArrayLike = langx.isArrayLike,
        isString = langx.isString,
        uniq = langx.uniq,
        isFunction = langx.isFunction;

    var type = langx.type,
        isArray = langx.isArray,

        isWindow = langx.isWindow,

        isDocument = langx.isDocument,

        isObject = langx.isObject,

        isPlainObject = langx.isPlainObject,

        compact = langx.compact,

        flatten = langx.flatten,

        camelCase = langx.camelCase,

        dasherize = langx.dasherize,
        children = finder.children;

    function wrapper_map(func, context) {
        return function() {
            var self = this,
                params = slice.call(arguments);
            var result = langx.map(self, function(elem, idx) {
                return func.apply(context, [elem].concat(params));
            });
            return query(uniq(result));
        }
    }

    function wrapper_selector(func, context, last) {
        return function(selector) {
            var self = this,
                params = slice.call(arguments);
            var result = this.map(function(idx, elem) {
                // if (elem.nodeType == 1) {
                if (elem.querySelector) {
                    return func.apply(context, last ? [elem] : [elem, selector]);
                }
            });
            if (last && selector) {
                return result.filter(selector);
            } else {
                return result;
            }
        }
    }

    function wrapper_selector_until(func, context, last) {
        return function(util, selector) {
            var self = this,
                params = slice.call(arguments);
            if (selector === undefined) {
                selector = util;
                util = undefined;
            }
            var result = this.map(function(idx, elem) {
                // if (elem.nodeType == 1) {
                if (elem.querySelector) {
                    return func.apply(context, last ? [elem, util] : [elem, selector, util]);
                }
            });
            if (last && selector) {
                return result.filter(selector);
            } else {
                return result;
            }
        }
    }


    function wrapper_every_act(func, context) {
        return function() {
            var self = this,
                params = slice.call(arguments);
            this.each(function(idx) {
                func.apply(context, [this].concat(params));
            });
            return self;
        }
    }

    function wrapper_every_act_firstArgFunc(func, context, oldValueFunc) {
        return function(arg1) {
            var self = this,
                params = slice.call(arguments);
            forEach.call(self, function(elem, idx) {
                var newArg1 = funcArg(elem, arg1, idx, oldValueFunc(elem));
                func.apply(context, [elem, arg1].concat(params.slice(1)));
            });
            return self;
        }
    }

    function wrapper_some_chk(func, context) {
        return function() {
            var self = this,
                params = slice.call(arguments);
            return some.call(self, function(elem) {
                return func.apply(context, [elem].concat(params));
            });
        }
    }

    function wrapper_name_value(func, context, oldValueFunc) {
        return function(name, value) {
            var self = this,
                params = slice.call(arguments);

            if (langx.isPlainObject(name) || langx.isDefined(value)) {
                forEach.call(self, function(elem, idx) {
                    var newValue;
                    if (oldValueFunc) {
                        newValue = funcArg(elem, value, idx, oldValueFunc(elem, name));
                    } else {
                        newValue = value
                    }
                    func.apply(context, [elem].concat(params));
                });
                return self;
            } else {
                if (self[0]) {
                    return func.apply(context, [self[0], name]);
                }
            }

        }
    }

    function wrapper_value(func, context, oldValueFunc) {
        return function(value) {
            var self = this;

            if (langx.isDefined(value)) {
                forEach.call(self, function(elem, idx) {
                    var newValue;
                    if (oldValueFunc) {
                        newValue = funcArg(elem, value, idx, oldValueFunc(elem));
                    } else {
                        newValue = value
                    }
                    func.apply(context, [elem, newValue]);
                });
                return self;
            } else {
                if (self[0]) {
                    return func.apply(context, [self[0]]);
                }
            }

        }
    }

    var NodeList = langx.klass({
        klassName: "SkNodeList",
        init: function(selector, context) {
            var self = this,
                match, nodes, node, props;

            if (selector) {
                self.context = context = context || noder.doc();

                if (isString(selector)) {
                    // a html string or a css selector is expected
                    self.selector = selector;

                    if (selector.charAt(0) === "<" && selector.charAt(selector.length - 1) === ">" && selector.length >= 3) {
                        match = [null, selector, null];
                    } else {
                        match = rquickExpr.exec(selector);
                    }

                    if (match) {
                        if (match[1]) {
                            // if selector is html
                            nodes = noder.createFragment(selector);

                            if (langx.isPlainObject(context)) {
                                props = context;
                            }

                        } else {
                            node = finder.byId(match[2], noder.ownerDoc(context));

                            if (node) {
                                // if selector is id
                                nodes = [node];
                            }

                        }
                    } else {
                        // if selector is css selector
                        if (langx.isString(context)) {
                            context = finder.find(context);
                        }

                        nodes = finder.descendants(context, selector);
                    }
                } else {
                    if (isArray(selector)) {
                        // a dom node array is expected
                        nodes = selector;
                    } else {
                        // a dom node is expected
                        nodes = [selector];
                    }
                    //self.add(selector, false);
                }
            }


            if (nodes) {

                push.apply(self, nodes);

                if (props) {
                    for ( var name  in props ) {
                        // Properties of context are called as methods if possible
                        if ( langx.isFunction( this[ name ] ) ) {
                            this[ name ]( props[ name ] );
                        } else {
                            this.attr( name, props[ name ] );
                        }
                    }
                }
            }

            return self;
        }
    });

    var query = (function() {
        isQ = function(object) {
            return object instanceof NodeList;
        }
        init = function(selector, context) {
            return new NodeList(selector, context);
        }

        var $ = function(selector, context) {
            if (isFunction(selector)) {
                eventer.ready(function() {
                    selector($);
                });
            } else if (isQ(selector)) {
                return selector;
            } else {
                if (context && isQ(context) && isString(selector)) {
                    return context.find(selector);
                }
                return init(selector, context);
            }
        };

        $.fn = NodeList.prototype;
        langx.mixin($.fn, {
            // `map` and `slice` in the jQuery API work differently
            // from their array counterparts
            length : 0,

            map: function(fn) {
                return $(uniq(langx.map(this, function(el, i) {
                    return fn.call(el, i, el)
                })));
            },

            slice: function() {
                return $(slice.apply(this, arguments))
            },

            forEach: function() {
                return forEach.apply(this,arguments);
            },

            get: function(idx) {
                return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
            },

            indexOf: function() {
                return indexOf.apply(this,arguments);
            },

            sort : function() {
                return sort.apply(this,arguments);
            },

            toArray: function() {
                return slice.call(this);
            },

            size: function() {
                return this.length
            },

            remove: wrapper_every_act(noder.remove, noder),

            each: function(callback) {
                langx.each(this, callback);
                return this;
            },

            filter: function(selector) {
                if (isFunction(selector)) return this.not(this.not(selector))
                return $(filter.call(this, function(element) {
                    return finder.matches(element, selector)
                }))
            },

            add: function(selector, context) {
                return $(uniq(this.toArray().concat($(selector, context).toArray())));
            },

            is: function(selector) {
                if (this.length > 0) {
                    var self = this;
                    if (langx.isString(selector)) {
                        return some.call(self,function(elem) {
                            return finder.matches(elem, selector);
                        });
                    } else if (langx.isArrayLike(selector)) {
                       return some.call(self,function(elem) {
                            return langx.inArray(elem, selector) > -1;
                        });
                    } else if (langx.isHtmlNode(selector)) {
                       return some.call(self,function(elem) {
                            return elem ==  selector;
                        });
                    }
                }
                return false;
            },
            
            not: function(selector) {
                var nodes = []
                if (isFunction(selector) && selector.call !== undefined)
                    this.each(function(idx) {
                        if (!selector.call(this, idx)) nodes.push(this)
                    })
                else {
                    var excludes = typeof selector == 'string' ? this.filter(selector) :
                        (isArrayLike(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
                    this.forEach(function(el) {
                        if (excludes.indexOf(el) < 0) nodes.push(el)
                    })
                }
                return $(nodes)
            },

            has: function(selector) {
                return this.filter(function() {
                    return isObject(selector) ?
                        noder.contains(this, selector) :
                        $(this).find(selector).size()
                })
            },

            eq: function(idx) {
                return idx === -1 ? this.slice(idx) : this.slice(idx, +idx + 1);
            },

            first: function() {
                return this.eq(0);
            },

            last: function() {
                return this.eq(-1);
            },

            find: wrapper_selector(finder.descendants, finder),

            closest: wrapper_selector(finder.closest, finder),
            /*
                        closest: function(selector, context) {
                            var node = this[0],
                                collection = false
                            if (typeof selector == 'object') collection = $(selector)
                            while (node && !(collection ? collection.indexOf(node) >= 0 : finder.matches(node, selector)))
                                node = node !== context && !isDocument(node) && node.parentNode
                            return $(node)
                        },
            */


            parents: wrapper_selector(finder.ancestors, finder),

            parentsUntil: wrapper_selector_until(finder.ancestors, finder),


            parent: wrapper_selector(finder.parent, finder),

            children: wrapper_selector(finder.children, finder),

            contents: wrapper_map(noder.contents, noder),

            empty: wrapper_every_act(noder.empty, noder),

            // `pluck` is borrowed from Prototype.js
            pluck: function(property) {
                return langx.map(this, function(el) {
                    return el[property]
                })
            },

            pushStack : function(elms) {
                var ret = $(elms);
                ret.prevObject = this;
                return ret;
            },
            
            replaceWith: function(newContent) {
                return this.before(newContent).remove();
            },

            wrap: function(structure) {
                var func = isFunction(structure)
                if (this[0] && !func)
                    var dom = $(structure).get(0),
                        clone = dom.parentNode || this.length > 1

                return this.each(function(index) {
                    $(this).wrapAll(
                        func ? structure.call(this, index) :
                        clone ? dom.cloneNode(true) : dom
                    )
                })
            },

            wrapAll: function(wrappingElement) {
                if (this[0]) {
                    $(this[0]).before(wrappingElement = $(wrappingElement));
                    var children;
                    // drill down to the inmost element
                    while ((children = wrappingElement.children()).length) {
                        wrappingElement = children.first();
                    }
                    $(wrappingElement).append(this);
                }
                return this
            },

            wrapInner: function(wrappingElement) {
                var func = isFunction(wrappingElement)
                return this.each(function(index) {
                    var self = $(this),
                        contents = self.contents(),
                        dom = func ? wrappingElement.call(this, index) : wrappingElement
                    contents.length ? contents.wrapAll(dom) : self.append(dom)
                })
            },

            unwrap: function(selector) {
                if (this.parent().children().length === 0) {
                    // remove dom without text
                    this.parent(selector).not("body").each(function() {
                        $(this).replaceWith(document.createTextNode(this.childNodes[0].textContent));
                    });
                } else {
                    this.parent().each(function() {
                        $(this).replaceWith($(this).children())
                    });
                }
                return this
            },

            clone: function() {
                return this.map(function() {
                    return this.cloneNode(true)
                })
            },

            hide: wrapper_every_act(fx.hide, fx),

            toggle: function(setting) {
                return this.each(function() {
                    var el = $(this);
                    (setting === undefined ? el.css("display") == "none" : setting) ? el.show(): el.hide()
                })
            },

            prev: function(selector) {
                return $(this.pluck('previousElementSibling')).filter(selector || '*')
            },

            prevAll: wrapper_selector(finder.previousSibling, finder),

            next: function(selector) {
                return $(this.pluck('nextElementSibling')).filter(selector || '*')
            },

            nextAll: wrapper_selector(finder.nextSiblings, finder),

            siblings: wrapper_selector(finder.siblings, finder),

            html: wrapper_value(noder.html, noder, noder.html),

            text: wrapper_value(datax.text, datax, datax.text),

            attr: wrapper_name_value(datax.attr, datax, datax.attr),

            removeAttr: wrapper_every_act(datax.removeAttr, datax),

            prop: wrapper_name_value(datax.prop, datax, datax.prop),

            removeProp: wrapper_every_act(datax.removeProp, datax),

            data: wrapper_name_value(datax.data, datax, datax.data),

            removeData: wrapper_every_act(datax.removeData, datax),

            val: wrapper_value(datax.val, datax, datax.val),

            offset: wrapper_value(geom.pagePosition, geom, geom.pagePosition),

            style: wrapper_name_value(styler.css, styler),

            css: wrapper_name_value(styler.css, styler),

            index: function(elem) {
                if (elem) {
                    return this.indexOf($(elem)[0]);
                } else {
                    return this.parent().children().indexOf(this[0]);
                }
            },

            //hasClass(name)
            hasClass: wrapper_some_chk(styler.hasClass, styler),

            //addClass(name)
            addClass: wrapper_every_act_firstArgFunc(styler.addClass, styler, styler.className),

            //removeClass(name)
            removeClass: wrapper_every_act_firstArgFunc(styler.removeClass, styler, styler.className),

            //toogleClass(name,when)
            toggleClass: wrapper_every_act_firstArgFunc(styler.toggleClass, styler, styler.className),

            scrollTop: wrapper_value(geom.scrollTop, geom),

            scrollLeft: wrapper_value(geom.scrollLeft, geom),

            position: function(options) {
                if (!this.length) return

                if (options) {
                    if (options.of && options.of.length) {
                        options = langx.clone(options);
                        options.of = options.of[0];
                    }
                    return this.each( function() {
                        geom.posit(this,options);
                    });
                } else {
                    var elem = this[0];

                    return geom.relativePosition(elem);

                }             
            },

            offsetParent: wrapper_map(geom.offsetParent, geom)
        });

        // for now
        $.fn.detach = $.fn.remove;

        $.fn.hover = function(fnOver, fnOut) {
            return this.mouseenter(fnOver).mouseleave(fnOut || fnOver);
        };

        $.fn.size = wrapper_value(geom.size, geom);

        $.fn.width = wrapper_value(geom.width, geom, geom.width);

        $.fn.height = wrapper_value(geom.height, geom, geom.height);

        $.fn.clientSize = wrapper_value(geom.clientSize, geom.clientSize);

        ['width', 'height'].forEach(function(dimension) {
            var offset, Dimension = dimension.replace(/./, function(m) {
                return m[0].toUpperCase()
            });

            $.fn['outer' + Dimension] = function(margin, value) {
                if (arguments.length) {
                    if (typeof margin !== 'boolean') {
                        value = margin;
                        margin = false;
                    }
                } else {
                    margin = false;
                    value = undefined;
                }

                if (value === undefined) {
                    var el = this[0];
                    if (!el) {
                        return undefined;
                    }
                    var cb = geom.size(el);
                    if (margin) {
                        var me = geom.marginExtents(el);
                        cb.width = cb.width + me.left + me.right;
                        cb.height = cb.height + me.top + me.bottom;
                    }
                    return dimension === "width" ? cb.width : cb.height;
                } else {
                    return this.each(function(idx, el) {
                        var mb = {};
                        var me = geom.marginExtents(el);
                        if (dimension === "width") {
                            mb.width = value;
                            if (margin) {
                                mb.width = mb.width - me.left - me.right
                            }
                        } else {
                            mb.height = value;
                            if (margin) {
                                mb.height = mb.height - me.top - me.bottom;
                            }
                        }
                        geom.size(el, mb);
                    })

                }
            };
        })

        $.fn.innerWidth = wrapper_value(geom.clientWidth, geom, geom.clientWidth);

        $.fn.innerHeight = wrapper_value(geom.clientHeight, geom, geom.clientHeight);

        var traverseNode = noder.traverse;

        function wrapper_node_operation(func, context, oldValueFunc) {
            return function(html) {
                var argType, nodes = langx.map(arguments, function(arg) {
                    argType = type(arg)
                    return argType == "object" || argType == "array" || arg == null ?
                        arg : noder.createFragment(arg)
                });
                if (nodes.length < 1) {
                    return this
                }
                this.each(function(idx) {
                    func.apply(context, [this, nodes, idx > 0]);
                });
                return this;
            }
        }


        $.fn.after = wrapper_node_operation(noder.after, noder);

        $.fn.prepend = wrapper_node_operation(noder.prepend, noder);

        $.fn.before = wrapper_node_operation(noder.before, noder);

        $.fn.append = wrapper_node_operation(noder.append, noder);


        langx.each( {
            appendTo: "append",
            prependTo: "prepend",
            insertBefore: "before",
            insertAfter: "after",
            replaceAll: "replaceWith"
        }, function( name, original ) {
            $.fn[ name ] = function( selector ) {
                var elems,
                    ret = [],
                    insert = $( selector ),
                    last = insert.length - 1,
                    i = 0;

                for ( ; i <= last; i++ ) {
                    elems = i === last ? this : this.clone( true );
                    $( insert[ i ] )[ original ]( elems );

                    // Support: Android <=4.0 only, PhantomJS 1 only
                    // .get() because push.apply(_, arraylike) throws on ancient WebKit
                    push.apply( ret, elems.get() );
                }

                return this.pushStack( ret );
            };
        } );

/*
        $.fn.insertAfter = function(html) {
            $(html).after(this);
            return this;
        };

        $.fn.insertBefore = function(html) {
            $(html).before(this);
            return this;
        };

        $.fn.appendTo = function(html) {
            $(html).append(this);
            return this;
        };

        $.fn.prependTo = function(html) {
            $(html).prepend(this);
            return this;
        };

        $.fn.replaceAll = function(selector) {
            $(selector).replaceWith(this);
            return this;
        };
*/
        return $;
    })();

    (function($) {
        $.fn.on = wrapper_every_act(eventer.on, eventer);

        $.fn.off = wrapper_every_act(eventer.off, eventer);

        $.fn.trigger = wrapper_every_act(eventer.trigger, eventer);

        ('focusin focusout focus blur load resize scroll unload click dblclick ' +
            'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave ' +
            'change select keydown keypress keyup error transitionEnd').split(' ').forEach(function(event) {
            $.fn[event] = function(data, callback) {
                return (0 in arguments) ?
                    this.on(event, data, callback) :
                    this.trigger(event)
            }
        });

        $.fn.one = function(event, selector, data, callback) {
            if (!langx.isString(selector) && !langx.isFunction(callback)) {
                callback = data;
                data = selector;
                selector = null;
            }

            if (langx.isFunction(data)) {
                callback = data;
                data = null;
            }

            return this.on(event, selector, data, callback, 1)
        };

        $.fn.animate = wrapper_every_act(fx.animate, fx);
        $.fn.emulateTransitionEnd = wrapper_every_act(fx.emulateTransitionEnd, fx);

        $.fn.show = wrapper_every_act(fx.show, fx);
        $.fn.hide = wrapper_every_act(fx.hide, fx);
        $.fn.toogle = wrapper_every_act(fx.toogle, fx);
        $.fn.fadeTo = wrapper_every_act(fx.fadeTo, fx);
        $.fn.fadeIn = wrapper_every_act(fx.fadeIn, fx);
        $.fn.fadeOut = wrapper_every_act(fx.fadeOut, fx);
        $.fn.fadeToggle = wrapper_every_act(fx.fadeToggle, fx);

        $.fn.slideDown = wrapper_every_act(fx.slideDown, fx);
        $.fn.slideToggle = wrapper_every_act(fx.slideToggle, fx);
        $.fn.slideUp = wrapper_every_act(fx.slideUp, fx);

        $.fn.scrollParent = function( includeHidden ) {
            var position = this.css( "position" ),
                excludeStaticParent = position === "absolute",
                overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/,
                scrollParent = this.parents().filter( function() {
                    var parent = $( this );
                    if ( excludeStaticParent && parent.css( "position" ) === "static" ) {
                        return false;
                    }
                    return overflowRegex.test( parent.css( "overflow" ) + parent.css( "overflow-y" ) +
                        parent.css( "overflow-x" ) );
                } ).eq( 0 );

            return position === "fixed" || !scrollParent.length ?
                $( this[ 0 ].ownerDocument || document ) :
                scrollParent;
        };
    })(query);


    (function($) {
        $.fn.end = function() {
            return this.prevObject || $()
        }

        $.fn.andSelf = function() {
            return this.add(this.prevObject || $())
        }

        $.fn.addBack = function(selector) {
            if (this.prevObject) {
                if (selector) {
                    return this.add(this.prevObject.filter(selector));
                } else {
                    return this.add(this.prevObject);
                }
            } else {
                return this;
            }
        }

        'filter,add,not,eq,first,last,find,closest,parents,parent,children,siblings'.split(',').forEach(function(property) {
            var fn = $.fn[property]
            $.fn[property] = function() {
                var ret = fn.apply(this, arguments)
                ret.prevObject = this
                return ret
            }
        })
    })(query);


    (function($) {
        $.fn.query = $.fn.find;

        $.fn.place = function(refNode, position) {
            // summary:
            //      places elements of this node list relative to the first element matched
            //      by queryOrNode. Returns the original NodeList. See: `dojo/dom-construct.place`
            // queryOrNode:
            //      may be a string representing any valid CSS3 selector or a DOM node.
            //      In the selector case, only the first matching element will be used
            //      for relative positioning.
            // position:
            //      can be one of:
            //
            //      -   "last" (default)
            //      -   "first"
            //      -   "before"
            //      -   "after"
            //      -   "only"
            //      -   "replace"
            //
            //      or an offset in the childNodes
            if (langx.isString(refNode)) {
                refNode = finder.descendant(refNode);
            } else if (isQ(refNode)) {
                refNode = refNode[0];
            }
            return this.each(function(i, node) {
                switch (position) {
                    case "before":
                        noder.before(refNode, node);
                        break;
                    case "after":
                        noder.after(refNode, node);
                        break;
                    case "replace":
                        noder.replace(refNode, node);
                        break;
                    case "only":
                        noder.empty(refNode);
                        noder.append(refNode, node);
                        break;
                    case "first":
                        noder.prepend(refNode, node);
                        break;
                        // else fallthrough...
                    default: // aka: last
                        noder.append(refNode, node);
                }
            });
        };

        $.fn.addContent = function(content, position) {
            if (content.template) {
                content = langx.substitute(content.template, content);
            }
            return this.append(content);
        };

        $.fn.replaceClass = function(newClass, oldClass) {
            this.removeClass(oldClass);
            this.addClass(newClass);
            return this;
        };

        $.fn.replaceClass = function(newClass, oldClass) {
            this.removeClass(oldClass);
            this.addClass(newClass);
            return this;
        };

        $.fn.disableSelection = ( function() {
            var eventType = "onselectstart" in document.createElement( "div" ) ?
                "selectstart" :
                "mousedown";

            return function() {
                return this.on( eventType + ".ui-disableSelection", function( event ) {
                    event.preventDefault();
                } );
            };
        } )();

        $.fn.enableSelection = function() {
            return this.off( ".ui-disableSelection" );
        };
       

    })(query);

    query.fn.plugin = function(name,options) {
        var args = slice.call( arguments, 1 ),
            self = this,
            returnValue = this;

        this.each(function(){
            returnValue = plugins.instantiate.apply(self,[this,name].concat(args));
        });
        return returnValue;
    };

    return dom.query = query;

});
define('skylark-utils-dom/elmx',[
    "./dom",
    "./langx",
    "./datax",
    "./eventer",
    "./finder",
    "./fx",
    "./geom",
    "./noder",
    "./styler",
    "./query"
], function(dom, langx, datax, eventer, finder, fx, geom, noder, styler,$) {
    var map = Array.prototype.map,
        slice = Array.prototype.slice;
    /*
     * VisualElement is a skylark class type wrapping a visule dom node,
     * provides a number of prototype methods and supports chain calls.
     */
    var VisualElement = langx.klass({
        klassName: "VisualElement",

        "init": function(node) {
            if (langx.isString(node)) {
                node = document.getElementById(node);
            }
            this._elm = node;
        }
    });

    VisualElement.prototype.$ = VisualElement.prototype.query = function(selector) {
        return $(selector,this._elm);
    };

    /*
     * the VisualElement object wrapping document.body
     */
    var root = new VisualElement(document.body),
        elmx = function(node) {
            if (node) {
                return new VisualElement(node);
            } else {
                return root;
            }
        };
    /*
     * Extend VisualElement prototype with wrapping the specified methods.
     * @param {ArrayLike} fn
     * @param {Object} context
     */
    function _delegator(fn, context) {
        return function() {
            var self = this,
                elem = self._elm,
                ret = fn.apply(context, [elem].concat(slice.call(arguments)));

            if (ret) {
                if (ret === context) {
                    return self;
                } else {
                    if (ret instanceof HTMLElement) {
                        ret = new VisualElement(ret);
                    } else if (langx.isArrayLike(ret)) {
                        ret = map.call(ret, function(el) {
                            if (el instanceof HTMLElement) {
                                return new VisualElement(el);
                            } else {
                                return el;
                            }
                        })
                    }
                }
            }
            return ret;
        };
    }

    langx.mixin(elmx, {
        batch: function(nodes, action, args) {
            nodes.forEach(function(node) {
                var elm = (node instanceof VisualElement) ? node : elmx(node);
                elm[action].apply(elm, args);
            });

            return this;
        },

        root: new VisualElement(document.body),

        VisualElement: VisualElement,

        partial: function(name, fn) {
            var props = {};

            props[name] = fn;

            VisualElement.partial(props);
        },

        delegate: function(names, context) {
            var props = {};

            names.forEach(function(name) {
                props[name] = _delegator(context[name], context);
            });

            VisualElement.partial(props);
        }
    });

    // from ./datax
    elmx.delegate([
        "attr",
        "data",
        "prop",
        "removeAttr",
        "removeData",
        "text",
        "val"
    ], datax);

    // from ./eventer
    elmx.delegate([
        "off",
        "on",
        "one",
        "shortcuts",
        "trigger"
    ], eventer);

    // from ./finder
    elmx.delegate([
        "ancestor",
        "ancestors",
        "children",
        "descendant",
        "find",
        "findAll",
        "firstChild",
        "lastChild",
        "matches",
        "nextSibling",
        "nextSiblings",
        "parent",
        "previousSibling",
        "previousSiblings",
        "siblings"
    ], finder);

    /*
     * find a dom element matched by the specified selector.
     * @param {String} selector
     */
    elmx.find = function(selector) {
        if (selector === "body") {
            return this.root;
        } else {
            return this.root.descendant(selector);
        }
    };

    // from ./fx
    elmx.delegate([
        "animate",
        "fadeIn",
        "fadeOut",
        "fadeTo",
        "fadeToggle",
        "hide",
        "scrollToTop",
        "show",
        "toggle"
    ], fx);


    // from ./geom
    elmx.delegate([
        "borderExtents",
        "boundingPosition",
        "boundingRect",
        "clientHeight",
        "clientSize",
        "clientWidth",
        "contentRect",
        "height",
        "marginExtents",
        "offsetParent",
        "paddingExtents",
        "pagePosition",
        "pageRect",
        "relativePosition",
        "relativeRect",
        "scrollIntoView",
        "scrollLeft",
        "scrollTop",
        "size",
        "width"
    ], geom);

    // from ./noder
    elmx.delegate([
        "after",
        "append",
        "before",
        "clone",
        "contains",
        "contents",
        "empty",
        "html",
        "isChildOf",
        "ownerDoc",
        "prepend",
        "remove",
        "removeChild",
        "replace",
        "reverse",
        "throb",
        "traverse",
        "wrapper",
        "wrapperInner",
        "unwrap"
    ], noder);

    // from ./styler
    elmx.delegate([
        "addClass",
        "className",
        "css",
        "hasClass",
        "hide",
        "isInvisible",
        "removeClass",
        "show",
        "toggleClass"
    ], styler);

    // properties

    var properties = [ 'position', 'left', 'top', 'right', 'bottom', 'width', 'height', 'border', 'borderLeft',
    'borderTop', 'borderRight', 'borderBottom', 'borderColor', 'display', 'overflow', 'margin', 'marginLeft', 'marginTop', 'marginRight', 'marginBottom', 'padding', 'paddingLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'color',
    'background', 'backgroundColor', 'opacity', 'fontSize', 'fontWeight', 'textAlign', 'textDecoration', 'textTransform', 'cursor', 'zIndex' ];

    properties.forEach( function ( property ) {

        var method = property;

        VisualElement.prototype[method ] = function (value) {

            this.css( property, value );

            return this;

        };

    });

    // events
    var events = [ 'keyUp', 'keyDown', 'mouseOver', 'mouseOut', 'click', 'dblClick', 'change' ];

    events.forEach( function ( event ) {

        var method = event;

        VisualElement.prototype[method ] = function ( callback ) {

            this.on( event.toLowerCase(), callback);

            return this;
        };

    });


    return dom.elmx = elmx;
});
define('skylark-utils-dom/plugins',[
    "./dom",
    "./langx",
    "./noder",
    "./datax",
    "./eventer",
    "./finder",
    "./geom",
    "./styler",
    "./fx",
    "./query",
    "./elmx"
], function(dom, langx, noder, datax, eventer, finder, geom, styler, fx, $, elmx) {
    "use strict";

    var slice = Array.prototype.slice,
        concat = Array.prototype.concat,
        pluginKlasses = {},
        shortcuts = {};

    /*
     * Create or get or destory a plugin instance assocated with the element.
     */
    function instantiate(elm,pluginName,options) {
        var pluginInstance = datax.data( elm, pluginName );

        if (options === "instance") {
            return pluginInstance;
        } else if (options === "destroy") {
            if (!pluginInstance) {
                throw new Error ("The plugin instance is not existed");
            }
            pluginInstance.destroy();
            datax.removeData( elm, pluginName);
            pluginInstance = undefined;
        } else {
            if (!pluginInstance) {
                if (options !== undefined && typeof options !== "object") {
                    throw new Error ("The options must be a plain object");
                }
                var pluginKlass = pluginKlasses[pluginName]; 
                pluginInstance = new pluginKlass(elm,options);
                datax.data( elm, pluginName,pluginInstance );
            } else if (options) {
                pluginInstance.reset(options);
            }
        }

        return pluginInstance;
    }

    function shortcutter(pluginName,extfn) {
       /*
        * Create or get or destory a plugin instance assocated with the element,
        * and also you can execute the plugin method directory;
        */
        return function (elm,options) {
            var  plugin = instantiate(elm, pluginName,"instance");
            if ( options === "instance" ) {
              return plugin || null;
            }
            if (!plugin) {
                plugin = instantiate(elm, pluginName,typeof options == 'object' && options || {});
            }

            if (options) {
                var args = slice.call(arguments,1);
                if (extfn) {
                    return extfn.apply(plugin,args);
                } else {
                    if (typeof options == 'string') {
                        var methodName = options;

                        if ( !plugin ) {
                            throw new Error( "cannot call methods on " + pluginName +
                                " prior to initialization; " +
                                "attempted to call method '" + methodName + "'" );
                        }

                        if ( !langx.isFunction( plugin[ methodName ] ) || methodName.charAt( 0 ) === "_" ) {
                            throw new Error( "no such method '" + methodName + "' for " + pluginName +
                                " plugin instance" );
                        }

                        plugin[methodName].apply(plugin,args);
                    }                
                }                
            }

        }

    }

    /*
     * Register a plugin type
     */
    function register( pluginKlass,shortcutName,extfn) {
        var pluginName = pluginKlass.prototype.pluginName;
        
        pluginKlasses[pluginName] = pluginKlass;

        if (shortcutName) {
            var shortcut = shortcuts[shortcutName] = shortcutter(pluginName,extfn);
                
            $.fn[shortcutName] = function(options) {
                var returnValue = this;

                if ( !this.length && options === "instance" ) {
                  returnValue = undefined;
                } else {
                  this.each(function () {
                    var  ret  = shortcut(this,options);
                    if (ret !== undefined) {
                        returnValue = ret;
                        return false;
                    }
                  });
                }

                return returnValue;
            };

            elmx.partial(shortcutName,function(options) {
                var  ret  = shortcut(this._elm,options);
                if (ret === undefined) {
                    ret = this;
                }
                return ret;
            });

        }
    }

 
    var Plugin =   langx.Evented.inherit({
        klassName: "Plugin",

        _construct : function(elm,options) {
           this._elm = elm;
           this._initOptions(options);
        },

        _initOptions : function(options) {
          var ctor = this.constructor,
              cache = ctor.cache = ctor.cache || {},
              defaults = cache.defaults;
          if (!defaults) {
            var  ctors = [];
            do {
              ctors.unshift(ctor);
              if (ctor === Plugin) {
                break;
              }
              ctor = ctor.superclass;
            } while (ctor);

            defaults = cache.defaults = {};
            for (var i=0;i<ctors.length;i++) {
              ctor = ctors[i];
              if (ctor.prototype.hasOwnProperty("options")) {
                langx.mixin(defaults,ctor.prototype.options);
              }
              if (ctor.hasOwnProperty("options")) {
                langx.mixin(defaults,ctor.options);
              }
            }
          }
          Object.defineProperty(this,"options",{
            value :langx.mixin({},defaults,options)
          });

          //return this.options = langx.mixin({},defaults,options);
          return this.options;
        },


        destroy: function() {
            var that = this;

            this._destroy();
            // We can probably remove the unbind calls in 2.0
            // all event bindings should go through this._on()
            datax.removeData(this._elm,this.pluginName );
        },

        _destroy: langx.noop,

        _delay: function( handler, delay ) {
            function handlerProxy() {
                return ( typeof handler === "string" ? instance[ handler ] : handler )
                    .apply( instance, arguments );
            }
            var instance = this;
            return setTimeout( handlerProxy, delay || 0 );
        },

        option: function( key, value ) {
            var options = key;
            var parts;
            var curOption;
            var i;

            if ( arguments.length === 0 ) {

                // Don't return a reference to the internal hash
                return langx.mixin( {}, this.options );
            }

            if ( typeof key === "string" ) {

                // Handle nested keys, e.g., "foo.bar" => { foo: { bar: ___ } }
                options = {};
                parts = key.split( "." );
                key = parts.shift();
                if ( parts.length ) {
                    curOption = options[ key ] = langx.mixin( {}, this.options[ key ] );
                    for ( i = 0; i < parts.length - 1; i++ ) {
                        curOption[ parts[ i ] ] = curOption[ parts[ i ] ] || {};
                        curOption = curOption[ parts[ i ] ];
                    }
                    key = parts.pop();
                    if ( arguments.length === 1 ) {
                        return curOption[ key ] === undefined ? null : curOption[ key ];
                    }
                    curOption[ key ] = value;
                } else {
                    if ( arguments.length === 1 ) {
                        return this.options[ key ] === undefined ? null : this.options[ key ];
                    }
                    options[ key ] = value;
                }
            }

            this._setOptions( options );

            return this;
        },

        _setOptions: function( options ) {
            var key;

            for ( key in options ) {
                this._setOption( key, options[ key ] );
            }

            return this;
        },

        _setOption: function( key, value ) {

            this.options[ key ] = value;

            return this;
        }

    });

    $.fn.plugin = function(name,options) {
        var args = slice.call( arguments, 1 ),
            self = this,
            returnValue = this;

        this.each(function(){
            returnValue = instantiate.apply(self,[this,name].concat(args));
        });
        return returnValue;
    };

    elmx.partial("plugin",function(name,options) {
        var args = slice.call( arguments, 1 );
        return instantiate.apply(this,[this.domNode,name].concat(args));
    }); 


    function plugins() {
        return plugins;
    }
     
    langx.mixin(plugins, {
        instantiate,
        Plugin,
        register,
        shortcuts
    });

    return plugins;
});
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
        $.event.special[Util.TRANSITION_END] = getSpecialTransitionEndEvent();
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
    'skylark-utils-dom/plugins',
    "./bs4",
    './util'
], function ($, plugins,bs4,Util) {

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
            const closeEvent = $.Event(Event.CLOSE);
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
    'skylark-utils-dom/plugins',
    "./bs4",
    './util'
], function (langx,$, plugins,bs4,Util) {

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
            const slideEvent = $.Event(Event.SLIDE, {
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
            const slidEvent = $.Event(Event.SLID, {
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
    'skylark-utils-dom/plugins',
    "./bs4",
    './util'
], function (langx,$, plugins,bs4,Util) {

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
            const startEvent = $.Event(Event.SHOW);
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
            const startEvent = $.Event(Event.HIDE);
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
define('skylark-ui-popper/Popper',[
  "skylark-langx/skylark"
], function(skylark) {
  'use strict';

  var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  var longerTimeoutBrowsers = ['Edge', 'Trident', 'Firefox'];
  var timeoutDuration = 0;
  for (var i = 0; i < longerTimeoutBrowsers.length; i += 1) {
    if (isBrowser && navigator.userAgent.indexOf(longerTimeoutBrowsers[i]) >= 0) {
      timeoutDuration = 1;
      break;
    }
  }

  function microtaskDebounce(fn) {
    var called = false;
    return function () {
      if (called) {
        return;
      }
      called = true;
      window.Promise.resolve().then(function () {
        called = false;
        fn();
      });
    };
  }

  function taskDebounce(fn) {
    var scheduled = false;
    return function () {
      if (!scheduled) {
        scheduled = true;
        setTimeout(function () {
          scheduled = false;
          fn();
        }, timeoutDuration);
      }
    };
  }

  var supportsMicroTasks = isBrowser && window.Promise;

  /**
  * Create a debounced version of a method, that's asynchronously deferred
  * but called in the minimum time possible.
  *
  * @method
  * @memberof Popper.Utils
  * @argument {Function} fn
  * @returns {Function}
  */
  var debounce = supportsMicroTasks ? microtaskDebounce : taskDebounce;

  /**
   * Check if the given variable is a function
   * @method
   * @memberof Popper.Utils
   * @argument {Any} functionToCheck - variable to check
   * @returns {Boolean} answer to: is a function?
   */
  function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
  }

  /**
   * Get CSS computed property of the given element
   * @method
   * @memberof Popper.Utils
   * @argument {Eement} element
   * @argument {String} property
   */
  function getStyleComputedProperty(element, property) {
    if (element.nodeType !== 1) {
      return [];
    }
    // NOTE: 1 DOM access here
    var window = element.ownerDocument.defaultView;
    var css = window.getComputedStyle(element, null);
    return property ? css[property] : css;
  }

  /**
   * Returns the parentNode or the host of the element
   * @method
   * @memberof Popper.Utils
   * @argument {Element} element
   * @returns {Element} parent
   */
  function getParentNode(element) {
    if (element.nodeName === 'HTML') {
      return element;
    }
    return element.parentNode || element.host;
  }

  /**
   * Returns the scrolling parent of the given element
   * @method
   * @memberof Popper.Utils
   * @argument {Element} element
   * @returns {Element} scroll parent
   */
  function getScrollParent(element) {
    // Return body, `getScroll` will take care to get the correct `scrollTop` from it
    if (!element) {
      return document.body;
    }

    switch (element.nodeName) {
      case 'HTML':
      case 'BODY':
        return element.ownerDocument.body;
      case '#document':
        return element.body;
    }

    // Firefox want us to check `-x` and `-y` variations as well

    var _getStyleComputedProp = getStyleComputedProperty(element),
        overflow = _getStyleComputedProp.overflow,
        overflowX = _getStyleComputedProp.overflowX,
        overflowY = _getStyleComputedProp.overflowY;

    if (/(auto|scroll|overlay)/.test(overflow + overflowY + overflowX)) {
      return element;
    }

    return getScrollParent(getParentNode(element));
  }

  var isIE11 = isBrowser && !!(window.MSInputMethodContext && document.documentMode);
  var isIE10 = isBrowser && /MSIE 10/.test(navigator.userAgent);

  /**
   * Determines if the browser is Internet Explorer
   * @method
   * @memberof Popper.Utils
   * @param {Number} version to check
   * @returns {Boolean} isIE
   */
  function isIE(version) {
    if (version === 11) {
      return isIE11;
    }
    if (version === 10) {
      return isIE10;
    }
    return isIE11 || isIE10;
  }

  /**
   * Returns the offset parent of the given element
   * @method
   * @memberof Popper.Utils
   * @argument {Element} element
   * @returns {Element} offset parent
   */
  function getOffsetParent(element) {
    if (!element) {
      return document.documentElement;
    }

    var noOffsetParent = isIE(10) ? document.body : null;

    // NOTE: 1 DOM access here
    var offsetParent = element.offsetParent || null;
    // Skip hidden elements which don't have an offsetParent
    while (offsetParent === noOffsetParent && element.nextElementSibling) {
      offsetParent = (element = element.nextElementSibling).offsetParent;
    }

    var nodeName = offsetParent && offsetParent.nodeName;

    if (!nodeName || nodeName === 'BODY' || nodeName === 'HTML') {
      return element ? element.ownerDocument.documentElement : document.documentElement;
    }

    // .offsetParent will return the closest TH, TD or TABLE in case
    // no offsetParent is present, I hate this job...
    if (['TH', 'TD', 'TABLE'].indexOf(offsetParent.nodeName) !== -1 && getStyleComputedProperty(offsetParent, 'position') === 'static') {
      return getOffsetParent(offsetParent);
    }

    return offsetParent;
  }

  function isOffsetContainer(element) {
    var nodeName = element.nodeName;

    if (nodeName === 'BODY') {
      return false;
    }
    return nodeName === 'HTML' || getOffsetParent(element.firstElementChild) === element;
  }

  /**
   * Finds the root node (document, shadowDOM root) of the given element
   * @method
   * @memberof Popper.Utils
   * @argument {Element} node
   * @returns {Element} root node
   */
  function getRoot(node) {
    if (node.parentNode !== null) {
      return getRoot(node.parentNode);
    }

    return node;
  }

  /**
   * Finds the offset parent common to the two provided nodes
   * @method
   * @memberof Popper.Utils
   * @argument {Element} element1
   * @argument {Element} element2
   * @returns {Element} common offset parent
   */
  function findCommonOffsetParent(element1, element2) {
    // This check is needed to avoid errors in case one of the elements isn't defined for any reason
    if (!element1 || !element1.nodeType || !element2 || !element2.nodeType) {
      return document.documentElement;
    }

    // Here we make sure to give as "start" the element that comes first in the DOM
    var order = element1.compareDocumentPosition(element2) & Node.DOCUMENT_POSITION_FOLLOWING;
    var start = order ? element1 : element2;
    var end = order ? element2 : element1;

    // Get common ancestor container
    var range = document.createRange();
    range.setStart(start, 0);
    range.setEnd(end, 0);
    var commonAncestorContainer = range.commonAncestorContainer;

    // Both nodes are inside #document

    if (element1 !== commonAncestorContainer && element2 !== commonAncestorContainer || start.contains(end)) {
      if (isOffsetContainer(commonAncestorContainer)) {
        return commonAncestorContainer;
      }

      return getOffsetParent(commonAncestorContainer);
    }

    // one of the nodes is inside shadowDOM, find which one
    var element1root = getRoot(element1);
    if (element1root.host) {
      return findCommonOffsetParent(element1root.host, element2);
    } else {
      return findCommonOffsetParent(element1, getRoot(element2).host);
    }
  }

  /**
   * Gets the scroll value of the given element in the given side (top and left)
   * @method
   * @memberof Popper.Utils
   * @argument {Element} element
   * @argument {String} side `top` or `left`
   * @returns {number} amount of scrolled pixels
   */
  function getScroll(element) {
    var side = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'top';

    var upperSide = side === 'top' ? 'scrollTop' : 'scrollLeft';
    var nodeName = element.nodeName;

    if (nodeName === 'BODY' || nodeName === 'HTML') {
      var html = element.ownerDocument.documentElement;
      var scrollingElement = element.ownerDocument.scrollingElement || html;
      return scrollingElement[upperSide];
    }

    return element[upperSide];
  }

  /*
   * Sum or subtract the element scroll values (left and top) from a given rect object
   * @method
   * @memberof Popper.Utils
   * @param {Object} rect - Rect object you want to change
   * @param {HTMLElement} element - The element from the function reads the scroll values
   * @param {Boolean} subtract - set to true if you want to subtract the scroll values
   * @return {Object} rect - The modifier rect object
   */
  function includeScroll(rect, element) {
    var subtract = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    var scrollTop = getScroll(element, 'top');
    var scrollLeft = getScroll(element, 'left');
    var modifier = subtract ? -1 : 1;
    rect.top += scrollTop * modifier;
    rect.bottom += scrollTop * modifier;
    rect.left += scrollLeft * modifier;
    rect.right += scrollLeft * modifier;
    return rect;
  }

  /*
   * Helper to detect borders of a given element
   * @method
   * @memberof Popper.Utils
   * @param {CSSStyleDeclaration} styles
   * Result of `getStyleComputedProperty` on the given element
   * @param {String} axis - `x` or `y`
   * @return {number} borders - The borders size of the given axis
   */

  function getBordersSize(styles, axis) {
    var sideA = axis === 'x' ? 'Left' : 'Top';
    var sideB = sideA === 'Left' ? 'Right' : 'Bottom';

    return parseFloat(styles['border' + sideA + 'Width'], 10) + parseFloat(styles['border' + sideB + 'Width'], 10);
  }

  function getSize(axis, body, html, computedStyle) {
    return Math.max(body['offset' + axis], body['scroll' + axis], html['client' + axis], html['offset' + axis], html['scroll' + axis], isIE(10) ? parseInt(html['offset' + axis]) + parseInt(computedStyle['margin' + (axis === 'Height' ? 'Top' : 'Left')]) + parseInt(computedStyle['margin' + (axis === 'Height' ? 'Bottom' : 'Right')]) : 0);
  }

  function getWindowSizes(document) {
    var body = document.body;
    var html = document.documentElement;
    var computedStyle = isIE(10) && getComputedStyle(html);

    return {
      height: getSize('Height', body, html, computedStyle),
      width: getSize('Width', body, html, computedStyle)
    };
  }

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();





  var defineProperty = function (obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  };

  var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  /**
   * Given element offsets, generate an output similar to getBoundingClientRect
   * @method
   * @memberof Popper.Utils
   * @argument {Object} offsets
   * @returns {Object} ClientRect like output
   */
  function getClientRect(offsets) {
    return _extends({}, offsets, {
      right: offsets.left + offsets.width,
      bottom: offsets.top + offsets.height
    });
  }

  /**
   * Get bounding client rect of given element
   * @method
   * @memberof Popper.Utils
   * @param {HTMLElement} element
   * @return {Object} client rect
   */
  function getBoundingClientRect(element) {
    var rect = {};

    // IE10 10 FIX: Please, don't ask, the element isn't
    // considered in DOM in some circumstances...
    // This isn't reproducible in IE10 compatibility mode of IE11
    try {
      if (isIE(10)) {
        rect = element.getBoundingClientRect();
        var scrollTop = getScroll(element, 'top');
        var scrollLeft = getScroll(element, 'left');
        rect.top += scrollTop;
        rect.left += scrollLeft;
        rect.bottom += scrollTop;
        rect.right += scrollLeft;
      } else {
        rect = element.getBoundingClientRect();
      }
    } catch (e) {}

    var result = {
      left: rect.left,
      top: rect.top,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top
    };

    // subtract scrollbar size from sizes
    var sizes = element.nodeName === 'HTML' ? getWindowSizes(element.ownerDocument) : {};
    var width = sizes.width || element.clientWidth || result.right - result.left;
    var height = sizes.height || element.clientHeight || result.bottom - result.top;

    var horizScrollbar = element.offsetWidth - width;
    var vertScrollbar = element.offsetHeight - height;

    // if an hypothetical scrollbar is detected, we must be sure it's not a `border`
    // we make this check conditional for performance reasons
    if (horizScrollbar || vertScrollbar) {
      var styles = getStyleComputedProperty(element);
      horizScrollbar -= getBordersSize(styles, 'x');
      vertScrollbar -= getBordersSize(styles, 'y');

      result.width -= horizScrollbar;
      result.height -= vertScrollbar;
    }

    return getClientRect(result);
  }

  function getOffsetRectRelativeToArbitraryNode(children, parent) {
    var fixedPosition = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    var isIE10 = isIE(10);
    var isHTML = parent.nodeName === 'HTML';
    var childrenRect = getBoundingClientRect(children);
    var parentRect = getBoundingClientRect(parent);
    var scrollParent = getScrollParent(children);

    var styles = getStyleComputedProperty(parent);
    var borderTopWidth = parseFloat(styles.borderTopWidth, 10);
    var borderLeftWidth = parseFloat(styles.borderLeftWidth, 10);

    // In cases where the parent is fixed, we must ignore negative scroll in offset calc
    if (fixedPosition && isHTML) {
      parentRect.top = Math.max(parentRect.top, 0);
      parentRect.left = Math.max(parentRect.left, 0);
    }
    var offsets = getClientRect({
      top: childrenRect.top - parentRect.top - borderTopWidth,
      left: childrenRect.left - parentRect.left - borderLeftWidth,
      width: childrenRect.width,
      height: childrenRect.height
    });
    offsets.marginTop = 0;
    offsets.marginLeft = 0;

    // Subtract margins of documentElement in case it's being used as parent
    // we do this only on HTML because it's the only element that behaves
    // differently when margins are applied to it. The margins are included in
    // the box of the documentElement, in the other cases not.
    if (!isIE10 && isHTML) {
      var marginTop = parseFloat(styles.marginTop, 10);
      var marginLeft = parseFloat(styles.marginLeft, 10);

      offsets.top -= borderTopWidth - marginTop;
      offsets.bottom -= borderTopWidth - marginTop;
      offsets.left -= borderLeftWidth - marginLeft;
      offsets.right -= borderLeftWidth - marginLeft;

      // Attach marginTop and marginLeft because in some circumstances we may need them
      offsets.marginTop = marginTop;
      offsets.marginLeft = marginLeft;
    }

    if (isIE10 && !fixedPosition ? parent.contains(scrollParent) : parent === scrollParent && scrollParent.nodeName !== 'BODY') {
      offsets = includeScroll(offsets, parent);
    }

    return offsets;
  }

  function getViewportOffsetRectRelativeToArtbitraryNode(element) {
    var excludeScroll = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    var html = element.ownerDocument.documentElement;
    var relativeOffset = getOffsetRectRelativeToArbitraryNode(element, html);
    var width = Math.max(html.clientWidth, window.innerWidth || 0);
    var height = Math.max(html.clientHeight, window.innerHeight || 0);

    var scrollTop = !excludeScroll ? getScroll(html) : 0;
    var scrollLeft = !excludeScroll ? getScroll(html, 'left') : 0;

    var offset = {
      top: scrollTop - relativeOffset.top + relativeOffset.marginTop,
      left: scrollLeft - relativeOffset.left + relativeOffset.marginLeft,
      width: width,
      height: height
    };

    return getClientRect(offset);
  }

  /**
   * Check if the given element is fixed or is inside a fixed parent
   * @method
   * @memberof Popper.Utils
   * @argument {Element} element
   * @argument {Element} customContainer
   * @returns {Boolean} answer to "isFixed?"
   */
  function isFixed(element) {
    var nodeName = element.nodeName;
    if (nodeName === 'BODY' || nodeName === 'HTML') {
      return false;
    }
    if (getStyleComputedProperty(element, 'position') === 'fixed') {
      return true;
    }
    return isFixed(getParentNode(element));
  }

  /**
   * Finds the first parent of an element that has a transformed property defined
   * @method
   * @memberof Popper.Utils
   * @argument {Element} element
   * @returns {Element} first transformed parent or documentElement
   */

  function getFixedPositionOffsetParent(element) {
    // This check is needed to avoid errors in case one of the elements isn't defined for any reason
    if (!element || !element.parentElement || isIE()) {
      return document.documentElement;
    }
    var el = element.parentElement;
    while (el && getStyleComputedProperty(el, 'transform') === 'none') {
      el = el.parentElement;
    }
    return el || document.documentElement;
  }

  /**
   * Computed the boundaries limits and return them
   * @method
   * @memberof Popper.Utils
   * @param {HTMLElement} popper
   * @param {HTMLElement} reference
   * @param {number} padding
   * @param {HTMLElement} boundariesElement - Element used to define the boundaries
   * @param {Boolean} fixedPosition - Is in fixed position mode
   * @returns {Object} Coordinates of the boundaries
   */
  function getBoundaries(popper, reference, padding, boundariesElement) {
    var fixedPosition = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

    // NOTE: 1 DOM access here

    var boundaries = { top: 0, left: 0 };
    var offsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);

    // Handle viewport case
    if (boundariesElement === 'viewport') {
      boundaries = getViewportOffsetRectRelativeToArtbitraryNode(offsetParent, fixedPosition);
    } else {
      // Handle other cases based on DOM element used as boundaries
      var boundariesNode = void 0;
      if (boundariesElement === 'scrollParent') {
        boundariesNode = getScrollParent(getParentNode(reference));
        if (boundariesNode.nodeName === 'BODY') {
          boundariesNode = popper.ownerDocument.documentElement;
        }
      } else if (boundariesElement === 'window') {
        boundariesNode = popper.ownerDocument.documentElement;
      } else {
        boundariesNode = boundariesElement;
      }

      var offsets = getOffsetRectRelativeToArbitraryNode(boundariesNode, offsetParent, fixedPosition);

      // In case of HTML, we need a different computation
      if (boundariesNode.nodeName === 'HTML' && !isFixed(offsetParent)) {
        var _getWindowSizes = getWindowSizes(popper.ownerDocument),
            height = _getWindowSizes.height,
            width = _getWindowSizes.width;

        boundaries.top += offsets.top - offsets.marginTop;
        boundaries.bottom = height + offsets.top;
        boundaries.left += offsets.left - offsets.marginLeft;
        boundaries.right = width + offsets.left;
      } else {
        // for all the other DOM elements, this one is good
        boundaries = offsets;
      }
    }

    // Add paddings
    padding = padding || 0;
    var isPaddingNumber = typeof padding === 'number';
    boundaries.left += isPaddingNumber ? padding : padding.left || 0;
    boundaries.top += isPaddingNumber ? padding : padding.top || 0;
    boundaries.right -= isPaddingNumber ? padding : padding.right || 0;
    boundaries.bottom -= isPaddingNumber ? padding : padding.bottom || 0;

    return boundaries;
  }

  function getArea(_ref) {
    var width = _ref.width,
        height = _ref.height;

    return width * height;
  }

  /**
   * Utility used to transform the `auto` placement to the placement with more
   * available space.
   * @method
   * @memberof Popper.Utils
   * @argument {Object} data - The data object generated by update method
   * @argument {Object} options - Modifiers configuration and options
   * @returns {Object} The data object, properly modified
   */
  function computeAutoPlacement(placement, refRect, popper, reference, boundariesElement) {
    var padding = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;

    if (placement.indexOf('auto') === -1) {
      return placement;
    }

    var boundaries = getBoundaries(popper, reference, padding, boundariesElement);

    var rects = {
      top: {
        width: boundaries.width,
        height: refRect.top - boundaries.top
      },
      right: {
        width: boundaries.right - refRect.right,
        height: boundaries.height
      },
      bottom: {
        width: boundaries.width,
        height: boundaries.bottom - refRect.bottom
      },
      left: {
        width: refRect.left - boundaries.left,
        height: boundaries.height
      }
    };

    var sortedAreas = Object.keys(rects).map(function (key) {
      return _extends({
        key: key
      }, rects[key], {
        area: getArea(rects[key])
      });
    }).sort(function (a, b) {
      return b.area - a.area;
    });

    var filteredAreas = sortedAreas.filter(function (_ref2) {
      var width = _ref2.width,
          height = _ref2.height;
      return width >= popper.clientWidth && height >= popper.clientHeight;
    });

    var computedPlacement = filteredAreas.length > 0 ? filteredAreas[0].key : sortedAreas[0].key;

    var variation = placement.split('-')[1];

    return computedPlacement + (variation ? '-' + variation : '');
  }

  /**
   * Get offsets to the reference element
   * @method
   * @memberof Popper.Utils
   * @param {Object} state
   * @param {Element} popper - the popper element
   * @param {Element} reference - the reference element (the popper will be relative to this)
   * @param {Element} fixedPosition - is in fixed position mode
   * @returns {Object} An object containing the offsets which will be applied to the popper
   */
  function getReferenceOffsets(state, popper, reference) {
    var fixedPosition = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    var commonOffsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);
    return getOffsetRectRelativeToArbitraryNode(reference, commonOffsetParent, fixedPosition);
  }

  /**
   * Get the outer sizes of the given element (offset size + margins)
   * @method
   * @memberof Popper.Utils
   * @argument {Element} element
   * @returns {Object} object containing width and height properties
   */
  function getOuterSizes(element) {
    var window = element.ownerDocument.defaultView;
    var styles = window.getComputedStyle(element);
    var x = parseFloat(styles.marginTop || 0) + parseFloat(styles.marginBottom || 0);
    var y = parseFloat(styles.marginLeft || 0) + parseFloat(styles.marginRight || 0);
    var result = {
      width: element.offsetWidth + y,
      height: element.offsetHeight + x
    };
    return result;
  }

  /**
   * Get the opposite placement of the given one
   * @method
   * @memberof Popper.Utils
   * @argument {String} placement
   * @returns {String} flipped placement
   */
  function getOppositePlacement(placement) {
    var hash = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' };
    return placement.replace(/left|right|bottom|top/g, function (matched) {
      return hash[matched];
    });
  }

  /**
   * Get offsets to the popper
   * @method
   * @memberof Popper.Utils
   * @param {Object} position - CSS position the Popper will get applied
   * @param {HTMLElement} popper - the popper element
   * @param {Object} referenceOffsets - the reference offsets (the popper will be relative to this)
   * @param {String} placement - one of the valid placement options
   * @returns {Object} popperOffsets - An object containing the offsets which will be applied to the popper
   */
  function getPopperOffsets(popper, referenceOffsets, placement) {
    placement = placement.split('-')[0];

    // Get popper node sizes
    var popperRect = getOuterSizes(popper);

    // Add position, width and height to our offsets object
    var popperOffsets = {
      width: popperRect.width,
      height: popperRect.height
    };

    // depending by the popper placement we have to compute its offsets slightly differently
    var isHoriz = ['right', 'left'].indexOf(placement) !== -1;
    var mainSide = isHoriz ? 'top' : 'left';
    var secondarySide = isHoriz ? 'left' : 'top';
    var measurement = isHoriz ? 'height' : 'width';
    var secondaryMeasurement = !isHoriz ? 'height' : 'width';

    popperOffsets[mainSide] = referenceOffsets[mainSide] + referenceOffsets[measurement] / 2 - popperRect[measurement] / 2;
    if (placement === secondarySide) {
      popperOffsets[secondarySide] = referenceOffsets[secondarySide] - popperRect[secondaryMeasurement];
    } else {
      popperOffsets[secondarySide] = referenceOffsets[getOppositePlacement(secondarySide)];
    }

    return popperOffsets;
  }

  /**
   * Mimics the `find` method of Array
   * @method
   * @memberof Popper.Utils
   * @argument {Array} arr
   * @argument prop
   * @argument value
   * @returns index or -1
   */
  function find(arr, check) {
    // use native find if supported
    if (Array.prototype.find) {
      return arr.find(check);
    }

    // use `filter` to obtain the same behavior of `find`
    return arr.filter(check)[0];
  }

  /**
   * Return the index of the matching object
   * @method
   * @memberof Popper.Utils
   * @argument {Array} arr
   * @argument prop
   * @argument value
   * @returns index or -1
   */
  function findIndex(arr, prop, value) {
    // use native findIndex if supported
    if (Array.prototype.findIndex) {
      return arr.findIndex(function (cur) {
        return cur[prop] === value;
      });
    }

    // use `find` + `indexOf` if `findIndex` isn't supported
    var match = find(arr, function (obj) {
      return obj[prop] === value;
    });
    return arr.indexOf(match);
  }

  /**
   * Loop trough the list of modifiers and run them in order,
   * each of them will then edit the data object.
   * @method
   * @memberof Popper.Utils
   * @param {dataObject} data
   * @param {Array} modifiers
   * @param {String} ends - Optional modifier name used as stopper
   * @returns {dataObject}
   */
  function runModifiers(modifiers, data, ends) {
    var modifiersToRun = ends === undefined ? modifiers : modifiers.slice(0, findIndex(modifiers, 'name', ends));

    modifiersToRun.forEach(function (modifier) {
      if (modifier['function']) {
        // eslint-disable-line dot-notation
        console.warn('`modifier.function` is deprecated, use `modifier.fn`!');
      }
      var fn = modifier['function'] || modifier.fn; // eslint-disable-line dot-notation
      if (modifier.enabled && isFunction(fn)) {
        // Add properties to offsets to make them a complete clientRect object
        // we do this before each modifier to make sure the previous one doesn't
        // mess with these values
        data.offsets.popper = getClientRect(data.offsets.popper);
        data.offsets.reference = getClientRect(data.offsets.reference);

        data = fn(data, modifier);
      }
    });

    return data;
  }

  /**
   * Updates the position of the popper, computing the new offsets and applying
   * the new style.<br />
   * Prefer `scheduleUpdate` over `update` because of performance reasons.
   * @method
   * @memberof Popper
   */
  function update() {
    // if popper is destroyed, don't perform any further update
    if (this.state.isDestroyed) {
      return;
    }

    var data = {
      instance: this,
      styles: {},
      arrowStyles: {},
      attributes: {},
      flipped: false,
      offsets: {}
    };

    // compute reference element offsets
    data.offsets.reference = getReferenceOffsets(this.state, this.popper, this.reference, this.options.positionFixed);

    // compute auto placement, store placement inside the data object,
    // modifiers will be able to edit `placement` if needed
    // and refer to originalPlacement to know the original value
    data.placement = computeAutoPlacement(this.options.placement, data.offsets.reference, this.popper, this.reference, this.options.modifiers.flip.boundariesElement, this.options.modifiers.flip.padding);

    // store the computed placement inside `originalPlacement`
    data.originalPlacement = data.placement;

    data.positionFixed = this.options.positionFixed;

    // compute the popper offsets
    data.offsets.popper = getPopperOffsets(this.popper, data.offsets.reference, data.placement);

    data.offsets.popper.position = this.options.positionFixed ? 'fixed' : 'absolute';

    // run the modifiers
    data = runModifiers(this.modifiers, data);

    // the first `update` will call `onCreate` callback
    // the other ones will call `onUpdate` callback
    if (!this.state.isCreated) {
      this.state.isCreated = true;
      this.options.onCreate(data);
    } else {
      this.options.onUpdate(data);
    }
  }

  /**
   * Helper used to know if the given modifier is enabled.
   * @method
   * @memberof Popper.Utils
   * @returns {Boolean}
   */
  function isModifierEnabled(modifiers, modifierName) {
    return modifiers.some(function (_ref) {
      var name = _ref.name,
          enabled = _ref.enabled;
      return enabled && name === modifierName;
    });
  }

  /**
   * Get the prefixed supported property name
   * @method
   * @memberof Popper.Utils
   * @argument {String} property (camelCase)
   * @returns {String} prefixed property (camelCase or PascalCase, depending on the vendor prefix)
   */
  function getSupportedPropertyName(property) {
    var prefixes = [false, 'ms', 'Webkit', 'Moz', 'O'];
    var upperProp = property.charAt(0).toUpperCase() + property.slice(1);

    for (var i = 0; i < prefixes.length; i++) {
      var prefix = prefixes[i];
      var toCheck = prefix ? '' + prefix + upperProp : property;
      if (typeof document.body.style[toCheck] !== 'undefined') {
        return toCheck;
      }
    }
    return null;
  }

  /**
   * Destroys the popper.
   * @method
   * @memberof Popper
   */
  function destroy() {
    this.state.isDestroyed = true;

    // touch DOM only if `applyStyle` modifier is enabled
    if (isModifierEnabled(this.modifiers, 'applyStyle')) {
      this.popper.removeAttribute('x-placement');
      this.popper.style.position = '';
      this.popper.style.top = '';
      this.popper.style.left = '';
      this.popper.style.right = '';
      this.popper.style.bottom = '';
      this.popper.style.willChange = '';
      this.popper.style[getSupportedPropertyName('transform')] = '';
    }

    this.disableEventListeners();

    // remove the popper if user explicity asked for the deletion on destroy
    // do not use `remove` because IE11 doesn't support it
    if (this.options.removeOnDestroy) {
      this.popper.parentNode.removeChild(this.popper);
    }
    return this;
  }

  /**
   * Get the window associated with the element
   * @argument {Element} element
   * @returns {Window}
   */
  function getWindow(element) {
    var ownerDocument = element.ownerDocument;
    return ownerDocument ? ownerDocument.defaultView : window;
  }

  function attachToScrollParents(scrollParent, event, callback, scrollParents) {
    var isBody = scrollParent.nodeName === 'BODY';
    var target = isBody ? scrollParent.ownerDocument.defaultView : scrollParent;
    target.addEventListener(event, callback, { passive: true });

    if (!isBody) {
      attachToScrollParents(getScrollParent(target.parentNode), event, callback, scrollParents);
    }
    scrollParents.push(target);
  }

  /**
   * Setup needed event listeners used to update the popper position
   * @method
   * @memberof Popper.Utils
   * @private
   */
  function setupEventListeners(reference, options, state, updateBound) {
    // Resize event listener on window
    state.updateBound = updateBound;
    getWindow(reference).addEventListener('resize', state.updateBound, { passive: true });

    // Scroll event listener on scroll parents
    var scrollElement = getScrollParent(reference);
    attachToScrollParents(scrollElement, 'scroll', state.updateBound, state.scrollParents);
    state.scrollElement = scrollElement;
    state.eventsEnabled = true;

    return state;
  }

  /**
   * It will add resize/scroll events and start recalculating
   * position of the popper element when they are triggered.
   * @method
   * @memberof Popper
   */
  function enableEventListeners() {
    if (!this.state.eventsEnabled) {
      this.state = setupEventListeners(this.reference, this.options, this.state, this.scheduleUpdate);
    }
  }

  /**
   * Remove event listeners used to update the popper position
   * @method
   * @memberof Popper.Utils
   * @private
   */
  function removeEventListeners(reference, state) {
    // Remove resize event listener on window
    getWindow(reference).removeEventListener('resize', state.updateBound);

    // Remove scroll event listener on scroll parents
    state.scrollParents.forEach(function (target) {
      target.removeEventListener('scroll', state.updateBound);
    });

    // Reset state
    state.updateBound = null;
    state.scrollParents = [];
    state.scrollElement = null;
    state.eventsEnabled = false;
    return state;
  }

  /**
   * It will remove resize/scroll events and won't recalculate popper position
   * when they are triggered. It also won't trigger `onUpdate` callback anymore,
   * unless you call `update` method manually.
   * @method
   * @memberof Popper
   */
  function disableEventListeners() {
    if (this.state.eventsEnabled) {
      cancelAnimationFrame(this.scheduleUpdate);
      this.state = removeEventListeners(this.reference, this.state);
    }
  }

  /**
   * Tells if a given input is a number
   * @method
   * @memberof Popper.Utils
   * @param {*} input to check
   * @return {Boolean}
   */
  function isNumeric(n) {
    return n !== '' && !isNaN(parseFloat(n)) && isFinite(n);
  }

  /**
   * Set the style to the given popper
   * @method
   * @memberof Popper.Utils
   * @argument {Element} element - Element to apply the style to
   * @argument {Object} styles
   * Object with a list of properties and values which will be applied to the element
   */
  function setStyles(element, styles) {
    Object.keys(styles).forEach(function (prop) {
      var unit = '';
      // add unit if the value is numeric and is one of the following
      if (['width', 'height', 'top', 'right', 'bottom', 'left'].indexOf(prop) !== -1 && isNumeric(styles[prop])) {
        unit = 'px';
      }
      element.style[prop] = styles[prop] + unit;
    });
  }

  /**
   * Set the attributes to the given popper
   * @method
   * @memberof Popper.Utils
   * @argument {Element} element - Element to apply the attributes to
   * @argument {Object} styles
   * Object with a list of properties and values which will be applied to the element
   */
  function setAttributes(element, attributes) {
    Object.keys(attributes).forEach(function (prop) {
      var value = attributes[prop];
      if (value !== false) {
        element.setAttribute(prop, attributes[prop]);
      } else {
        element.removeAttribute(prop);
      }
    });
  }

  /**
   * @function
   * @memberof Modifiers
   * @argument {Object} data - The data object generated by `update` method
   * @argument {Object} data.styles - List of style properties - values to apply to popper element
   * @argument {Object} data.attributes - List of attribute properties - values to apply to popper element
   * @argument {Object} options - Modifiers configuration and options
   * @returns {Object} The same data object
   */
  function applyStyle(data) {
    // any property present in `data.styles` will be applied to the popper,
    // in this way we can make the 3rd party modifiers add custom styles to it
    // Be aware, modifiers could override the properties defined in the previous
    // lines of this modifier!
    setStyles(data.instance.popper, data.styles);

    // any property present in `data.attributes` will be applied to the popper,
    // they will be set as HTML attributes of the element
    setAttributes(data.instance.popper, data.attributes);

    // if arrowElement is defined and arrowStyles has some properties
    if (data.arrowElement && Object.keys(data.arrowStyles).length) {
      setStyles(data.arrowElement, data.arrowStyles);
    }

    return data;
  }

  /**
   * Set the x-placement attribute before everything else because it could be used
   * to add margins to the popper margins needs to be calculated to get the
   * correct popper offsets.
   * @method
   * @memberof Popper.modifiers
   * @param {HTMLElement} reference - The reference element used to position the popper
   * @param {HTMLElement} popper - The HTML element used as popper
   * @param {Object} options - Popper.js options
   */
  function applyStyleOnLoad(reference, popper, options, modifierOptions, state) {
    // compute reference element offsets
    var referenceOffsets = getReferenceOffsets(state, popper, reference, options.positionFixed);

    // compute auto placement, store placement inside the data object,
    // modifiers will be able to edit `placement` if needed
    // and refer to originalPlacement to know the original value
    var placement = computeAutoPlacement(options.placement, referenceOffsets, popper, reference, options.modifiers.flip.boundariesElement, options.modifiers.flip.padding);

    popper.setAttribute('x-placement', placement);

    // Apply `position` to popper before anything else because
    // without the position applied we can't guarantee correct computations
    setStyles(popper, { position: options.positionFixed ? 'fixed' : 'absolute' });

    return options;
  }

  /**
   * @function
   * @memberof Popper.Utils
   * @argument {Object} data - The data object generated by `update` method
   * @argument {Boolean} shouldRound - If the offsets should be rounded at all
   * @returns {Object} The popper's position offsets rounded
   *
   * The tale of pixel-perfect positioning. It's still not 100% perfect, but as
   * good as it can be within reason.
   * Discussion here: https://github.com/FezVrasta/popper.js/pull/715
   *
   * Low DPI screens cause a popper to be blurry if not using full pixels (Safari
   * as well on High DPI screens).
   *
   * Firefox prefers no rounding for positioning and does not have blurriness on
   * high DPI screens.
   *
   * Only horizontal placement and left/right values need to be considered.
   */
  function getRoundedOffsets(data, shouldRound) {
    var _data$offsets = data.offsets,
        popper = _data$offsets.popper,
        reference = _data$offsets.reference;


    var isVertical = ['left', 'right'].indexOf(data.placement) !== -1;
    var isVariation = data.placement.indexOf('-') !== -1;
    var sameWidthOddness = reference.width % 2 === popper.width % 2;
    var bothOddWidth = reference.width % 2 === 1 && popper.width % 2 === 1;
    var noRound = function noRound(v) {
      return v;
    };

    var horizontalToInteger = !shouldRound ? noRound : isVertical || isVariation || sameWidthOddness ? Math.round : Math.floor;
    var verticalToInteger = !shouldRound ? noRound : Math.round;

    return {
      left: horizontalToInteger(bothOddWidth && !isVariation && shouldRound ? popper.left - 1 : popper.left),
      top: verticalToInteger(popper.top),
      bottom: verticalToInteger(popper.bottom),
      right: horizontalToInteger(popper.right)
    };
  }

  var isFirefox = isBrowser && /Firefox/i.test(navigator.userAgent);

  /**
   * @function
   * @memberof Modifiers
   * @argument {Object} data - The data object generated by `update` method
   * @argument {Object} options - Modifiers configuration and options
   * @returns {Object} The data object, properly modified
   */
  function computeStyle(data, options) {
    var x = options.x,
        y = options.y;
    var popper = data.offsets.popper;

    // Remove this legacy support in Popper.js v2

    var legacyGpuAccelerationOption = find(data.instance.modifiers, function (modifier) {
      return modifier.name === 'applyStyle';
    }).gpuAcceleration;
    if (legacyGpuAccelerationOption !== undefined) {
      console.warn('WARNING: `gpuAcceleration` option moved to `computeStyle` modifier and will not be supported in future versions of Popper.js!');
    }
    var gpuAcceleration = legacyGpuAccelerationOption !== undefined ? legacyGpuAccelerationOption : options.gpuAcceleration;

    var offsetParent = getOffsetParent(data.instance.popper);
    var offsetParentRect = getBoundingClientRect(offsetParent);

    // Styles
    var styles = {
      position: popper.position
    };

    var offsets = getRoundedOffsets(data, window.devicePixelRatio < 2 || !isFirefox);

    var sideA = x === 'bottom' ? 'top' : 'bottom';
    var sideB = y === 'right' ? 'left' : 'right';

    // if gpuAcceleration is set to `true` and transform is supported,
    //  we use `translate3d` to apply the position to the popper we
    // automatically use the supported prefixed version if needed
    var prefixedProperty = getSupportedPropertyName('transform');

    // now, let's make a step back and look at this code closely (wtf?)
    // If the content of the popper grows once it's been positioned, it
    // may happen that the popper gets misplaced because of the new content
    // overflowing its reference element
    // To avoid this problem, we provide two options (x and y), which allow
    // the consumer to define the offset origin.
    // If we position a popper on top of a reference element, we can set
    // `x` to `top` to make the popper grow towards its top instead of
    // its bottom.
    var left = void 0,
        top = void 0;
    if (sideA === 'bottom') {
      // when offsetParent is <html> the positioning is relative to the bottom of the screen (excluding the scrollbar)
      // and not the bottom of the html element
      if (offsetParent.nodeName === 'HTML') {
        top = -offsetParent.clientHeight + offsets.bottom;
      } else {
        top = -offsetParentRect.height + offsets.bottom;
      }
    } else {
      top = offsets.top;
    }
    if (sideB === 'right') {
      if (offsetParent.nodeName === 'HTML') {
        left = -offsetParent.clientWidth + offsets.right;
      } else {
        left = -offsetParentRect.width + offsets.right;
      }
    } else {
      left = offsets.left;
    }
    if (gpuAcceleration && prefixedProperty) {
      styles[prefixedProperty] = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
      styles[sideA] = 0;
      styles[sideB] = 0;
      styles.willChange = 'transform';
    } else {
      // othwerise, we use the standard `top`, `left`, `bottom` and `right` properties
      var invertTop = sideA === 'bottom' ? -1 : 1;
      var invertLeft = sideB === 'right' ? -1 : 1;
      styles[sideA] = top * invertTop;
      styles[sideB] = left * invertLeft;
      styles.willChange = sideA + ', ' + sideB;
    }

    // Attributes
    var attributes = {
      'x-placement': data.placement
    };

    // Update `data` attributes, styles and arrowStyles
    data.attributes = _extends({}, attributes, data.attributes);
    data.styles = _extends({}, styles, data.styles);
    data.arrowStyles = _extends({}, data.offsets.arrow, data.arrowStyles);

    return data;
  }

  /**
   * Helper used to know if the given modifier depends from another one.<br />
   * It checks if the needed modifier is listed and enabled.
   * @method
   * @memberof Popper.Utils
   * @param {Array} modifiers - list of modifiers
   * @param {String} requestingName - name of requesting modifier
   * @param {String} requestedName - name of requested modifier
   * @returns {Boolean}
   */
  function isModifierRequired(modifiers, requestingName, requestedName) {
    var requesting = find(modifiers, function (_ref) {
      var name = _ref.name;
      return name === requestingName;
    });

    var isRequired = !!requesting && modifiers.some(function (modifier) {
      return modifier.name === requestedName && modifier.enabled && modifier.order < requesting.order;
    });

    if (!isRequired) {
      var _requesting = '`' + requestingName + '`';
      var requested = '`' + requestedName + '`';
      console.warn(requested + ' modifier is required by ' + _requesting + ' modifier in order to work, be sure to include it before ' + _requesting + '!');
    }
    return isRequired;
  }

  /**
   * @function
   * @memberof Modifiers
   * @argument {Object} data - The data object generated by update method
   * @argument {Object} options - Modifiers configuration and options
   * @returns {Object} The data object, properly modified
   */
  function arrow(data, options) {
    var _data$offsets$arrow;

    // arrow depends on keepTogether in order to work
    if (!isModifierRequired(data.instance.modifiers, 'arrow', 'keepTogether')) {
      return data;
    }

    var arrowElement = options.element;

    // if arrowElement is a string, suppose it's a CSS selector
    if (typeof arrowElement === 'string') {
      arrowElement = data.instance.popper.querySelector(arrowElement);

      // if arrowElement is not found, don't run the modifier
      if (!arrowElement) {
        return data;
      }
    } else {
      // if the arrowElement isn't a query selector we must check that the
      // provided DOM node is child of its popper node
      if (!data.instance.popper.contains(arrowElement)) {
        console.warn('WARNING: `arrow.element` must be child of its popper element!');
        return data;
      }
    }

    var placement = data.placement.split('-')[0];
    var _data$offsets = data.offsets,
        popper = _data$offsets.popper,
        reference = _data$offsets.reference;

    var isVertical = ['left', 'right'].indexOf(placement) !== -1;

    var len = isVertical ? 'height' : 'width';
    var sideCapitalized = isVertical ? 'Top' : 'Left';
    var side = sideCapitalized.toLowerCase();
    var altSide = isVertical ? 'left' : 'top';
    var opSide = isVertical ? 'bottom' : 'right';
    var arrowElementSize = getOuterSizes(arrowElement)[len];

    //
    // extends keepTogether behavior making sure the popper and its
    // reference have enough pixels in conjunction
    //

    // top/left side
    if (reference[opSide] - arrowElementSize < popper[side]) {
      data.offsets.popper[side] -= popper[side] - (reference[opSide] - arrowElementSize);
    }
    // bottom/right side
    if (reference[side] + arrowElementSize > popper[opSide]) {
      data.offsets.popper[side] += reference[side] + arrowElementSize - popper[opSide];
    }
    data.offsets.popper = getClientRect(data.offsets.popper);

    // compute center of the popper
    var center = reference[side] + reference[len] / 2 - arrowElementSize / 2;

    // Compute the sideValue using the updated popper offsets
    // take popper margin in account because we don't have this info available
    var css = getStyleComputedProperty(data.instance.popper);
    var popperMarginSide = parseFloat(css['margin' + sideCapitalized], 10);
    var popperBorderSide = parseFloat(css['border' + sideCapitalized + 'Width'], 10);
    var sideValue = center - data.offsets.popper[side] - popperMarginSide - popperBorderSide;

    // prevent arrowElement from being placed not contiguously to its popper
    sideValue = Math.max(Math.min(popper[len] - arrowElementSize, sideValue), 0);

    data.arrowElement = arrowElement;
    data.offsets.arrow = (_data$offsets$arrow = {}, defineProperty(_data$offsets$arrow, side, Math.round(sideValue)), defineProperty(_data$offsets$arrow, altSide, ''), _data$offsets$arrow);

    return data;
  }

  /**
   * Get the opposite placement variation of the given one
   * @method
   * @memberof Popper.Utils
   * @argument {String} placement variation
   * @returns {String} flipped placement variation
   */
  function getOppositeVariation(variation) {
    if (variation === 'end') {
      return 'start';
    } else if (variation === 'start') {
      return 'end';
    }
    return variation;
  }

  /**
   * List of accepted placements to use as values of the `placement` option.<br />
   * Valid placements are:
   * - `auto`
   * - `top`
   * - `right`
   * - `bottom`
   * - `left`
   *
   * Each placement can have a variation from this list:
   * - `-start`
   * - `-end`
   *
   * Variations are interpreted easily if you think of them as the left to right
   * written languages. Horizontally (`top` and `bottom`), `start` is left and `end`
   * is right.<br />
   * Vertically (`left` and `right`), `start` is top and `end` is bottom.
   *
   * Some valid examples are:
   * - `top-end` (on top of reference, right aligned)
   * - `right-start` (on right of reference, top aligned)
   * - `bottom` (on bottom, centered)
   * - `auto-end` (on the side with more space available, alignment depends by placement)
   *
   * @static
   * @type {Array}
   * @enum {String}
   * @readonly
   * @method placements
   * @memberof Popper
   */
  var placements = ['auto-start', 'auto', 'auto-end', 'top-start', 'top', 'top-end', 'right-start', 'right', 'right-end', 'bottom-end', 'bottom', 'bottom-start', 'left-end', 'left', 'left-start'];

  // Get rid of `auto` `auto-start` and `auto-end`
  var validPlacements = placements.slice(3);

  /**
   * Given an initial placement, returns all the subsequent placements
   * clockwise (or counter-clockwise).
   *
   * @method
   * @memberof Popper.Utils
   * @argument {String} placement - A valid placement (it accepts variations)
   * @argument {Boolean} counter - Set to true to walk the placements counterclockwise
   * @returns {Array} placements including their variations
   */
  function clockwise(placement) {
    var counter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    var index = validPlacements.indexOf(placement);
    var arr = validPlacements.slice(index + 1).concat(validPlacements.slice(0, index));
    return counter ? arr.reverse() : arr;
  }

  var BEHAVIORS = {
    FLIP: 'flip',
    CLOCKWISE: 'clockwise',
    COUNTERCLOCKWISE: 'counterclockwise'
  };

  /**
   * @function
   * @memberof Modifiers
   * @argument {Object} data - The data object generated by update method
   * @argument {Object} options - Modifiers configuration and options
   * @returns {Object} The data object, properly modified
   */
  function flip(data, options) {
    // if `inner` modifier is enabled, we can't use the `flip` modifier
    if (isModifierEnabled(data.instance.modifiers, 'inner')) {
      return data;
    }

    if (data.flipped && data.placement === data.originalPlacement) {
      // seems like flip is trying to loop, probably there's not enough space on any of the flippable sides
      return data;
    }

    var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, options.boundariesElement, data.positionFixed);

    var placement = data.placement.split('-')[0];
    var placementOpposite = getOppositePlacement(placement);
    var variation = data.placement.split('-')[1] || '';

    var flipOrder = [];

    switch (options.behavior) {
      case BEHAVIORS.FLIP:
        flipOrder = [placement, placementOpposite];
        break;
      case BEHAVIORS.CLOCKWISE:
        flipOrder = clockwise(placement);
        break;
      case BEHAVIORS.COUNTERCLOCKWISE:
        flipOrder = clockwise(placement, true);
        break;
      default:
        flipOrder = options.behavior;
    }

    flipOrder.forEach(function (step, index) {
      if (placement !== step || flipOrder.length === index + 1) {
        return data;
      }

      placement = data.placement.split('-')[0];
      placementOpposite = getOppositePlacement(placement);

      var popperOffsets = data.offsets.popper;
      var refOffsets = data.offsets.reference;

      // using floor because the reference offsets may contain decimals we are not going to consider here
      var floor = Math.floor;
      var overlapsRef = placement === 'left' && floor(popperOffsets.right) > floor(refOffsets.left) || placement === 'right' && floor(popperOffsets.left) < floor(refOffsets.right) || placement === 'top' && floor(popperOffsets.bottom) > floor(refOffsets.top) || placement === 'bottom' && floor(popperOffsets.top) < floor(refOffsets.bottom);

      var overflowsLeft = floor(popperOffsets.left) < floor(boundaries.left);
      var overflowsRight = floor(popperOffsets.right) > floor(boundaries.right);
      var overflowsTop = floor(popperOffsets.top) < floor(boundaries.top);
      var overflowsBottom = floor(popperOffsets.bottom) > floor(boundaries.bottom);

      var overflowsBoundaries = placement === 'left' && overflowsLeft || placement === 'right' && overflowsRight || placement === 'top' && overflowsTop || placement === 'bottom' && overflowsBottom;

      // flip the variation if required
      var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
      var flippedVariation = !!options.flipVariations && (isVertical && variation === 'start' && overflowsLeft || isVertical && variation === 'end' && overflowsRight || !isVertical && variation === 'start' && overflowsTop || !isVertical && variation === 'end' && overflowsBottom);

      if (overlapsRef || overflowsBoundaries || flippedVariation) {
        // this boolean to detect any flip loop
        data.flipped = true;

        if (overlapsRef || overflowsBoundaries) {
          placement = flipOrder[index + 1];
        }

        if (flippedVariation) {
          variation = getOppositeVariation(variation);
        }

        data.placement = placement + (variation ? '-' + variation : '');

        // this object contains `position`, we want to preserve it along with
        // any additional property we may add in the future
        data.offsets.popper = _extends({}, data.offsets.popper, getPopperOffsets(data.instance.popper, data.offsets.reference, data.placement));

        data = runModifiers(data.instance.modifiers, data, 'flip');
      }
    });
    return data;
  }

  /**
   * @function
   * @memberof Modifiers
   * @argument {Object} data - The data object generated by update method
   * @argument {Object} options - Modifiers configuration and options
   * @returns {Object} The data object, properly modified
   */
  function keepTogether(data) {
    var _data$offsets = data.offsets,
        popper = _data$offsets.popper,
        reference = _data$offsets.reference;

    var placement = data.placement.split('-')[0];
    var floor = Math.floor;
    var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
    var side = isVertical ? 'right' : 'bottom';
    var opSide = isVertical ? 'left' : 'top';
    var measurement = isVertical ? 'width' : 'height';

    if (popper[side] < floor(reference[opSide])) {
      data.offsets.popper[opSide] = floor(reference[opSide]) - popper[measurement];
    }
    if (popper[opSide] > floor(reference[side])) {
      data.offsets.popper[opSide] = floor(reference[side]);
    }

    return data;
  }

  /**
   * Converts a string containing value + unit into a px value number
   * @function
   * @memberof {modifiers~offset}
   * @private
   * @argument {String} str - Value + unit string
   * @argument {String} measurement - `height` or `width`
   * @argument {Object} popperOffsets
   * @argument {Object} referenceOffsets
   * @returns {Number|String}
   * Value in pixels, or original string if no values were extracted
   */
  function toValue(str, measurement, popperOffsets, referenceOffsets) {
    // separate value from unit
    var split = str.match(/((?:\-|\+)?\d*\.?\d*)(.*)/);
    var value = +split[1];
    var unit = split[2];

    // If it's not a number it's an operator, I guess
    if (!value) {
      return str;
    }

    if (unit.indexOf('%') === 0) {
      var element = void 0;
      switch (unit) {
        case '%p':
          element = popperOffsets;
          break;
        case '%':
        case '%r':
        default:
          element = referenceOffsets;
      }

      var rect = getClientRect(element);
      return rect[measurement] / 100 * value;
    } else if (unit === 'vh' || unit === 'vw') {
      // if is a vh or vw, we calculate the size based on the viewport
      var size = void 0;
      if (unit === 'vh') {
        size = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      } else {
        size = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      }
      return size / 100 * value;
    } else {
      // if is an explicit pixel unit, we get rid of the unit and keep the value
      // if is an implicit unit, it's px, and we return just the value
      return value;
    }
  }

  /**
   * Parse an `offset` string to extrapolate `x` and `y` numeric offsets.
   * @function
   * @memberof {modifiers~offset}
   * @private
   * @argument {String} offset
   * @argument {Object} popperOffsets
   * @argument {Object} referenceOffsets
   * @argument {String} basePlacement
   * @returns {Array} a two cells array with x and y offsets in numbers
   */
  function parseOffset(offset, popperOffsets, referenceOffsets, basePlacement) {
    var offsets = [0, 0];

    // Use height if placement is left or right and index is 0 otherwise use width
    // in this way the first offset will use an axis and the second one
    // will use the other one
    var useHeight = ['right', 'left'].indexOf(basePlacement) !== -1;

    // Split the offset string to obtain a list of values and operands
    // The regex addresses values with the plus or minus sign in front (+10, -20, etc)
    var fragments = offset.split(/(\+|\-)/).map(function (frag) {
      return frag.trim();
    });

    // Detect if the offset string contains a pair of values or a single one
    // they could be separated by comma or space
    var divider = fragments.indexOf(find(fragments, function (frag) {
      return frag.search(/,|\s/) !== -1;
    }));

    if (fragments[divider] && fragments[divider].indexOf(',') === -1) {
      console.warn('Offsets separated by white space(s) are deprecated, use a comma (,) instead.');
    }

    // If divider is found, we divide the list of values and operands to divide
    // them by ofset X and Y.
    var splitRegex = /\s*,\s*|\s+/;
    var ops = divider !== -1 ? [fragments.slice(0, divider).concat([fragments[divider].split(splitRegex)[0]]), [fragments[divider].split(splitRegex)[1]].concat(fragments.slice(divider + 1))] : [fragments];

    // Convert the values with units to absolute pixels to allow our computations
    ops = ops.map(function (op, index) {
      // Most of the units rely on the orientation of the popper
      var measurement = (index === 1 ? !useHeight : useHeight) ? 'height' : 'width';
      var mergeWithPrevious = false;
      return op
      // This aggregates any `+` or `-` sign that aren't considered operators
      // e.g.: 10 + +5 => [10, +, +5]
      .reduce(function (a, b) {
        if (a[a.length - 1] === '' && ['+', '-'].indexOf(b) !== -1) {
          a[a.length - 1] = b;
          mergeWithPrevious = true;
          return a;
        } else if (mergeWithPrevious) {
          a[a.length - 1] += b;
          mergeWithPrevious = false;
          return a;
        } else {
          return a.concat(b);
        }
      }, [])
      // Here we convert the string values into number values (in px)
      .map(function (str) {
        return toValue(str, measurement, popperOffsets, referenceOffsets);
      });
    });

    // Loop trough the offsets arrays and execute the operations
    ops.forEach(function (op, index) {
      op.forEach(function (frag, index2) {
        if (isNumeric(frag)) {
          offsets[index] += frag * (op[index2 - 1] === '-' ? -1 : 1);
        }
      });
    });
    return offsets;
  }

  /**
   * @function
   * @memberof Modifiers
   * @argument {Object} data - The data object generated by update method
   * @argument {Object} options - Modifiers configuration and options
   * @argument {Number|String} options.offset=0
   * The offset value as described in the modifier description
   * @returns {Object} The data object, properly modified
   */
  function offset(data, _ref) {
    var offset = _ref.offset;
    var placement = data.placement,
        _data$offsets = data.offsets,
        popper = _data$offsets.popper,
        reference = _data$offsets.reference;

    var basePlacement = placement.split('-')[0];

    var offsets = void 0;
    if (isNumeric(+offset)) {
      offsets = [+offset, 0];
    } else {
      offsets = parseOffset(offset, popper, reference, basePlacement);
    }

    if (basePlacement === 'left') {
      popper.top += offsets[0];
      popper.left -= offsets[1];
    } else if (basePlacement === 'right') {
      popper.top += offsets[0];
      popper.left += offsets[1];
    } else if (basePlacement === 'top') {
      popper.left += offsets[0];
      popper.top -= offsets[1];
    } else if (basePlacement === 'bottom') {
      popper.left += offsets[0];
      popper.top += offsets[1];
    }

    data.popper = popper;
    return data;
  }

  /**
   * @function
   * @memberof Modifiers
   * @argument {Object} data - The data object generated by `update` method
   * @argument {Object} options - Modifiers configuration and options
   * @returns {Object} The data object, properly modified
   */
  function preventOverflow(data, options) {
    var boundariesElement = options.boundariesElement || getOffsetParent(data.instance.popper);

    // If offsetParent is the reference element, we really want to
    // go one step up and use the next offsetParent as reference to
    // avoid to make this modifier completely useless and look like broken
    if (data.instance.reference === boundariesElement) {
      boundariesElement = getOffsetParent(boundariesElement);
    }

    // NOTE: DOM access here
    // resets the popper's position so that the document size can be calculated excluding
    // the size of the popper element itself
    var transformProp = getSupportedPropertyName('transform');
    var popperStyles = data.instance.popper.style; // assignment to help minification
    var top = popperStyles.top,
        left = popperStyles.left,
        transform = popperStyles[transformProp];

    popperStyles.top = '';
    popperStyles.left = '';
    popperStyles[transformProp] = '';

    var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, boundariesElement, data.positionFixed);

    // NOTE: DOM access here
    // restores the original style properties after the offsets have been computed
    popperStyles.top = top;
    popperStyles.left = left;
    popperStyles[transformProp] = transform;

    options.boundaries = boundaries;

    var order = options.priority;
    var popper = data.offsets.popper;

    var check = {
      primary: function primary(placement) {
        var value = popper[placement];
        if (popper[placement] < boundaries[placement] && !options.escapeWithReference) {
          value = Math.max(popper[placement], boundaries[placement]);
        }
        return defineProperty({}, placement, value);
      },
      secondary: function secondary(placement) {
        var mainSide = placement === 'right' ? 'left' : 'top';
        var value = popper[mainSide];
        if (popper[placement] > boundaries[placement] && !options.escapeWithReference) {
          value = Math.min(popper[mainSide], boundaries[placement] - (placement === 'right' ? popper.width : popper.height));
        }
        return defineProperty({}, mainSide, value);
      }
    };

    order.forEach(function (placement) {
      var side = ['left', 'top'].indexOf(placement) !== -1 ? 'primary' : 'secondary';
      popper = _extends({}, popper, check[side](placement));
    });

    data.offsets.popper = popper;

    return data;
  }

  /**
   * @function
   * @memberof Modifiers
   * @argument {Object} data - The data object generated by `update` method
   * @argument {Object} options - Modifiers configuration and options
   * @returns {Object} The data object, properly modified
   */
  function shift(data) {
    var placement = data.placement;
    var basePlacement = placement.split('-')[0];
    var shiftvariation = placement.split('-')[1];

    // if shift shiftvariation is specified, run the modifier
    if (shiftvariation) {
      var _data$offsets = data.offsets,
          reference = _data$offsets.reference,
          popper = _data$offsets.popper;

      var isVertical = ['bottom', 'top'].indexOf(basePlacement) !== -1;
      var side = isVertical ? 'left' : 'top';
      var measurement = isVertical ? 'width' : 'height';

      var shiftOffsets = {
        start: defineProperty({}, side, reference[side]),
        end: defineProperty({}, side, reference[side] + reference[measurement] - popper[measurement])
      };

      data.offsets.popper = _extends({}, popper, shiftOffsets[shiftvariation]);
    }

    return data;
  }

  /**
   * @function
   * @memberof Modifiers
   * @argument {Object} data - The data object generated by update method
   * @argument {Object} options - Modifiers configuration and options
   * @returns {Object} The data object, properly modified
   */
  function hide(data) {
    if (!isModifierRequired(data.instance.modifiers, 'hide', 'preventOverflow')) {
      return data;
    }

    var refRect = data.offsets.reference;
    var bound = find(data.instance.modifiers, function (modifier) {
      return modifier.name === 'preventOverflow';
    }).boundaries;

    if (refRect.bottom < bound.top || refRect.left > bound.right || refRect.top > bound.bottom || refRect.right < bound.left) {
      // Avoid unnecessary DOM access if visibility hasn't changed
      if (data.hide === true) {
        return data;
      }

      data.hide = true;
      data.attributes['x-out-of-boundaries'] = '';
    } else {
      // Avoid unnecessary DOM access if visibility hasn't changed
      if (data.hide === false) {
        return data;
      }

      data.hide = false;
      data.attributes['x-out-of-boundaries'] = false;
    }

    return data;
  }

  /**
   * @function
   * @memberof Modifiers
   * @argument {Object} data - The data object generated by `update` method
   * @argument {Object} options - Modifiers configuration and options
   * @returns {Object} The data object, properly modified
   */
  function inner(data) {
    var placement = data.placement;
    var basePlacement = placement.split('-')[0];
    var _data$offsets = data.offsets,
        popper = _data$offsets.popper,
        reference = _data$offsets.reference;

    var isHoriz = ['left', 'right'].indexOf(basePlacement) !== -1;

    var subtractLength = ['top', 'left'].indexOf(basePlacement) === -1;

    popper[isHoriz ? 'left' : 'top'] = reference[basePlacement] - (subtractLength ? popper[isHoriz ? 'width' : 'height'] : 0);

    data.placement = getOppositePlacement(placement);
    data.offsets.popper = getClientRect(popper);

    return data;
  }

  /**
   * Modifier function, each modifier can have a function of this type assigned
   * to its `fn` property.<br />
   * These functions will be called on each update, this means that you must
   * make sure they are performant enough to avoid performance bottlenecks.
   *
   * @function ModifierFn
   * @argument {dataObject} data - The data object generated by `update` method
   * @argument {Object} options - Modifiers configuration and options
   * @returns {dataObject} The data object, properly modified
   */

  /**
   * Modifiers are plugins used to alter the behavior of your poppers.<br />
   * Popper.js uses a set of 9 modifiers to provide all the basic functionalities
   * needed by the library.
   *
   * Usually you don't want to override the `order`, `fn` and `onLoad` props.
   * All the other properties are configurations that could be tweaked.
   * @namespace modifiers
   */
  var modifiers = {
    /**
     * Modifier used to shift the popper on the start or end of its reference
     * element.<br />
     * It will read the variation of the `placement` property.<br />
     * It can be one either `-end` or `-start`.
     * @memberof modifiers
     * @inner
     */
    shift: {
      /** @prop {number} order=100 - Index used to define the order of execution */
      order: 100,
      /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
      enabled: true,
      /** @prop {ModifierFn} */
      fn: shift
    },

    /**
     * The `offset` modifier can shift your popper on both its axis.
     *
     * It accepts the following units:
     * - `px` or unit-less, interpreted as pixels
     * - `%` or `%r`, percentage relative to the length of the reference element
     * - `%p`, percentage relative to the length of the popper element
     * - `vw`, CSS viewport width unit
     * - `vh`, CSS viewport height unit
     *
     * For length is intended the main axis relative to the placement of the popper.<br />
     * This means that if the placement is `top` or `bottom`, the length will be the
     * `width`. In case of `left` or `right`, it will be the `height`.
     *
     * You can provide a single value (as `Number` or `String`), or a pair of values
     * as `String` divided by a comma or one (or more) white spaces.<br />
     * The latter is a deprecated method because it leads to confusion and will be
     * removed in v2.<br />
     * Additionally, it accepts additions and subtractions between different units.
     * Note that multiplications and divisions aren't supported.
     *
     * Valid examples are:
     * ```
     * 10
     * '10%'
     * '10, 10'
     * '10%, 10'
     * '10 + 10%'
     * '10 - 5vh + 3%'
     * '-10px + 5vh, 5px - 6%'
     * ```
     * > **NB**: If you desire to apply offsets to your poppers in a way that may make them overlap
     * > with their reference element, unfortunately, you will have to disable the `flip` modifier.
     * > You can read more on this at this [issue](https://github.com/FezVrasta/popper.js/issues/373).
     *
     * @memberof modifiers
     * @inner
     */
    offset: {
      /** @prop {number} order=200 - Index used to define the order of execution */
      order: 200,
      /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
      enabled: true,
      /** @prop {ModifierFn} */
      fn: offset,
      /** @prop {Number|String} offset=0
       * The offset value as described in the modifier description
       */
      offset: 0
    },

    /**
     * Modifier used to prevent the popper from being positioned outside the boundary.
     *
     * A scenario exists where the reference itself is not within the boundaries.<br />
     * We can say it has "escaped the boundaries" — or just "escaped".<br />
     * In this case we need to decide whether the popper should either:
     *
     * - detach from the reference and remain "trapped" in the boundaries, or
     * - if it should ignore the boundary and "escape with its reference"
     *
     * When `escapeWithReference` is set to`true` and reference is completely
     * outside its boundaries, the popper will overflow (or completely leave)
     * the boundaries in order to remain attached to the edge of the reference.
     *
     * @memberof modifiers
     * @inner
     */
    preventOverflow: {
      /** @prop {number} order=300 - Index used to define the order of execution */
      order: 300,
      /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
      enabled: true,
      /** @prop {ModifierFn} */
      fn: preventOverflow,
      /**
       * @prop {Array} [priority=['left','right','top','bottom']]
       * Popper will try to prevent overflow following these priorities by default,
       * then, it could overflow on the left and on top of the `boundariesElement`
       */
      priority: ['left', 'right', 'top', 'bottom'],
      /**
       * @prop {number} padding=5
       * Amount of pixel used to define a minimum distance between the boundaries
       * and the popper. This makes sure the popper always has a little padding
       * between the edges of its container
       */
      padding: 5,
      /**
       * @prop {String|HTMLElement} boundariesElement='scrollParent'
       * Boundaries used by the modifier. Can be `scrollParent`, `window`,
       * `viewport` or any DOM element.
       */
      boundariesElement: 'scrollParent'
    },

    /**
     * Modifier used to make sure the reference and its popper stay near each other
     * without leaving any gap between the two. Especially useful when the arrow is
     * enabled and you want to ensure that it points to its reference element.
     * It cares only about the first axis. You can still have poppers with margin
     * between the popper and its reference element.
     * @memberof modifiers
     * @inner
     */
    keepTogether: {
      /** @prop {number} order=400 - Index used to define the order of execution */
      order: 400,
      /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
      enabled: true,
      /** @prop {ModifierFn} */
      fn: keepTogether
    },

    /**
     * This modifier is used to move the `arrowElement` of the popper to make
     * sure it is positioned between the reference element and its popper element.
     * It will read the outer size of the `arrowElement` node to detect how many
     * pixels of conjunction are needed.
     *
     * It has no effect if no `arrowElement` is provided.
     * @memberof modifiers
     * @inner
     */
    arrow: {
      /** @prop {number} order=500 - Index used to define the order of execution */
      order: 500,
      /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
      enabled: true,
      /** @prop {ModifierFn} */
      fn: arrow,
      /** @prop {String|HTMLElement} element='[x-arrow]' - Selector or node used as arrow */
      element: '[x-arrow]'
    },

    /**
     * Modifier used to flip the popper's placement when it starts to overlap its
     * reference element.
     *
     * Requires the `preventOverflow` modifier before it in order to work.
     *
     * **NOTE:** this modifier will interrupt the current update cycle and will
     * restart it if it detects the need to flip the placement.
     * @memberof modifiers
     * @inner
     */
    flip: {
      /** @prop {number} order=600 - Index used to define the order of execution */
      order: 600,
      /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
      enabled: true,
      /** @prop {ModifierFn} */
      fn: flip,
      /**
       * @prop {String|Array} behavior='flip'
       * The behavior used to change the popper's placement. It can be one of
       * `flip`, `clockwise`, `counterclockwise` or an array with a list of valid
       * placements (with optional variations)
       */
      behavior: 'flip',
      /**
       * @prop {number} padding=5
       * The popper will flip if it hits the edges of the `boundariesElement`
       */
      padding: 5,
      /**
       * @prop {String|HTMLElement} boundariesElement='viewport'
       * The element which will define the boundaries of the popper position.
       * The popper will never be placed outside of the defined boundaries
       * (except if `keepTogether` is enabled)
       */
      boundariesElement: 'viewport'
    },

    /**
     * Modifier used to make the popper flow toward the inner of the reference element.
     * By default, when this modifier is disabled, the popper will be placed outside
     * the reference element.
     * @memberof modifiers
     * @inner
     */
    inner: {
      /** @prop {number} order=700 - Index used to define the order of execution */
      order: 700,
      /** @prop {Boolean} enabled=false - Whether the modifier is enabled or not */
      enabled: false,
      /** @prop {ModifierFn} */
      fn: inner
    },

    /**
     * Modifier used to hide the popper when its reference element is outside of the
     * popper boundaries. It will set a `x-out-of-boundaries` attribute which can
     * be used to hide with a CSS selector the popper when its reference is
     * out of boundaries.
     *
     * Requires the `preventOverflow` modifier before it in order to work.
     * @memberof modifiers
     * @inner
     */
    hide: {
      /** @prop {number} order=800 - Index used to define the order of execution */
      order: 800,
      /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
      enabled: true,
      /** @prop {ModifierFn} */
      fn: hide
    },

    /**
     * Computes the style that will be applied to the popper element to gets
     * properly positioned.
     *
     * Note that this modifier will not touch the DOM, it just prepares the styles
     * so that `applyStyle` modifier can apply it. This separation is useful
     * in case you need to replace `applyStyle` with a custom implementation.
     *
     * This modifier has `850` as `order` value to maintain backward compatibility
     * with previous versions of Popper.js. Expect the modifiers ordering method
     * to change in future major versions of the library.
     *
     * @memberof modifiers
     * @inner
     */
    computeStyle: {
      /** @prop {number} order=850 - Index used to define the order of execution */
      order: 850,
      /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
      enabled: true,
      /** @prop {ModifierFn} */
      fn: computeStyle,
      /**
       * @prop {Boolean} gpuAcceleration=true
       * If true, it uses the CSS 3D transformation to position the popper.
       * Otherwise, it will use the `top` and `left` properties
       */
      gpuAcceleration: true,
      /**
       * @prop {string} [x='bottom']
       * Where to anchor the X axis (`bottom` or `top`). AKA X offset origin.
       * Change this if your popper should grow in a direction different from `bottom`
       */
      x: 'bottom',
      /**
       * @prop {string} [x='left']
       * Where to anchor the Y axis (`left` or `right`). AKA Y offset origin.
       * Change this if your popper should grow in a direction different from `right`
       */
      y: 'right'
    },

    /**
     * Applies the computed styles to the popper element.
     *
     * All the DOM manipulations are limited to this modifier. This is useful in case
     * you want to integrate Popper.js inside a framework or view library and you
     * want to delegate all the DOM manipulations to it.
     *
     * Note that if you disable this modifier, you must make sure the popper element
     * has its position set to `absolute` before Popper.js can do its work!
     *
     * Just disable this modifier and define your own to achieve the desired effect.
     *
     * @memberof modifiers
     * @inner
     */
    applyStyle: {
      /** @prop {number} order=900 - Index used to define the order of execution */
      order: 900,
      /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
      enabled: true,
      /** @prop {ModifierFn} */
      fn: applyStyle,
      /** @prop {Function} */
      onLoad: applyStyleOnLoad,
      /**
       * @deprecated since version 1.10.0, the property moved to `computeStyle` modifier
       * @prop {Boolean} gpuAcceleration=true
       * If true, it uses the CSS 3D transformation to position the popper.
       * Otherwise, it will use the `top` and `left` properties
       */
      gpuAcceleration: undefined
    }
  };

  /**
   * The `dataObject` is an object containing all the information used by Popper.js.
   * This object is passed to modifiers and to the `onCreate` and `onUpdate` callbacks.
   * @name dataObject
   * @property {Object} data.instance The Popper.js instance
   * @property {String} data.placement Placement applied to popper
   * @property {String} data.originalPlacement Placement originally defined on init
   * @property {Boolean} data.flipped True if popper has been flipped by flip modifier
   * @property {Boolean} data.hide True if the reference element is out of boundaries, useful to know when to hide the popper
   * @property {HTMLElement} data.arrowElement Node used as arrow by arrow modifier
   * @property {Object} data.styles Any CSS property defined here will be applied to the popper. It expects the JavaScript nomenclature (eg. `marginBottom`)
   * @property {Object} data.arrowStyles Any CSS property defined here will be applied to the popper arrow. It expects the JavaScript nomenclature (eg. `marginBottom`)
   * @property {Object} data.boundaries Offsets of the popper boundaries
   * @property {Object} data.offsets The measurements of popper, reference and arrow elements
   * @property {Object} data.offsets.popper `top`, `left`, `width`, `height` values
   * @property {Object} data.offsets.reference `top`, `left`, `width`, `height` values
   * @property {Object} data.offsets.arrow] `top` and `left` offsets, only one of them will be different from 0
   */

  /**
   * Default options provided to Popper.js constructor.<br />
   * These can be overridden using the `options` argument of Popper.js.<br />
   * To override an option, simply pass an object with the same
   * structure of the `options` object, as the 3rd argument. For example:
   * ```
   * new Popper(ref, pop, {
   *   modifiers: {
   *     preventOverflow: { enabled: false }
   *   }
   * })
   * ```
   * @type {Object}
   * @static
   * @memberof Popper
   */
  var Defaults = {
    /**
     * Popper's placement.
     * @prop {Popper.placements} placement='bottom'
     */
    placement: 'bottom',

    /**
     * Set this to true if you want popper to position it self in 'fixed' mode
     * @prop {Boolean} positionFixed=false
     */
    positionFixed: false,

    /**
     * Whether events (resize, scroll) are initially enabled.
     * @prop {Boolean} eventsEnabled=true
     */
    eventsEnabled: true,

    /**
     * Set to true if you want to automatically remove the popper when
     * you call the `destroy` method.
     * @prop {Boolean} removeOnDestroy=false
     */
    removeOnDestroy: false,

    /**
     * Callback called when the popper is created.<br />
     * By default, it is set to no-op.<br />
     * Access Popper.js instance with `data.instance`.
     * @prop {onCreate}
     */
    onCreate: function onCreate() {},

    /**
     * Callback called when the popper is updated. This callback is not called
     * on the initialization/creation of the popper, but only on subsequent
     * updates.<br />
     * By default, it is set to no-op.<br />
     * Access Popper.js instance with `data.instance`.
     * @prop {onUpdate}
     */
    onUpdate: function onUpdate() {},

    /**
     * List of modifiers used to modify the offsets before they are applied to the popper.
     * They provide most of the functionalities of Popper.js.
     * @prop {modifiers}
     */
    modifiers: modifiers
  };

  /**
   * @callback onCreate
   * @param {dataObject} data
   */

  /**
   * @callback onUpdate
   * @param {dataObject} data
   */

  // Utils
  // Methods
  var Popper = function () {
    /**
     * Creates a new Popper.js instance.
     * @class Popper
     * @param {HTMLElement|referenceObject} reference - The reference element used to position the popper
     * @param {HTMLElement} popper - The HTML element used as the popper
     * @param {Object} options - Your custom options to override the ones defined in [Defaults](#defaults)
     * @return {Object} instance - The generated Popper.js instance
     */
    function Popper(reference, popper) {
      var _this = this;

      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      classCallCheck(this, Popper);

      this.scheduleUpdate = function () {
        return requestAnimationFrame(_this.update);
      };

      // make update() debounced, so that it only runs at most once-per-tick
      this.update = debounce(this.update.bind(this));

      // with {} we create a new object with the options inside it
      this.options = _extends({}, Popper.Defaults, options);

      // init state
      this.state = {
        isDestroyed: false,
        isCreated: false,
        scrollParents: []
      };

      // get reference and popper elements (allow jQuery wrappers)
      this.reference = reference && reference.jquery ? reference[0] : reference;
      this.popper = popper && popper.jquery ? popper[0] : popper;

      // Deep merge modifiers options
      this.options.modifiers = {};
      Object.keys(_extends({}, Popper.Defaults.modifiers, options.modifiers)).forEach(function (name) {
        _this.options.modifiers[name] = _extends({}, Popper.Defaults.modifiers[name] || {}, options.modifiers ? options.modifiers[name] : {});
      });

      // Refactoring modifiers' list (Object => Array)
      this.modifiers = Object.keys(this.options.modifiers).map(function (name) {
        return _extends({
          name: name
        }, _this.options.modifiers[name]);
      })
      // sort the modifiers by order
      .sort(function (a, b) {
        return a.order - b.order;
      });

      // modifiers have the ability to execute arbitrary code when Popper.js get inited
      // such code is executed in the same order of its modifier
      // they could add new properties to their options configuration
      // BE AWARE: don't add options to `options.modifiers.name` but to `modifierOptions`!
      this.modifiers.forEach(function (modifierOptions) {
        if (modifierOptions.enabled && isFunction(modifierOptions.onLoad)) {
          modifierOptions.onLoad(_this.reference, _this.popper, _this.options, modifierOptions, _this.state);
        }
      });

      // fire the first update to position the popper in the right place
      this.update();

      var eventsEnabled = this.options.eventsEnabled;
      if (eventsEnabled) {
        // setup event listeners, they will take care of update the position in specific situations
        this.enableEventListeners();
      }

      this.state.eventsEnabled = eventsEnabled;
    }

    // We can't use class properties because they don't get listed in the
    // class prototype and break stuff like Sinon stubs


    createClass(Popper, [{
      key: 'update',
      value: function update$$1() {
        return update.call(this);
      }
    }, {
      key: 'destroy',
      value: function destroy$$1() {
        return destroy.call(this);
      }
    }, {
      key: 'enableEventListeners',
      value: function enableEventListeners$$1() {
        return enableEventListeners.call(this);
      }
    }, {
      key: 'disableEventListeners',
      value: function disableEventListeners$$1() {
        return disableEventListeners.call(this);
      }

      /**
       * Schedules an update. It will run on the next UI update available.
       * @method scheduleUpdate
       * @memberof Popper
       */


      /**
       * Collection of utilities useful when writing custom modifiers.
       * Starting from version 1.7, this method is available only if you
       * include `popper-utils.js` before `popper.js`.
       *
       * **DEPRECATION**: This way to access PopperUtils is deprecated
       * and will be removed in v2! Use the PopperUtils module directly instead.
       * Due to the high instability of the methods contained in Utils, we can't
       * guarantee them to follow semver. Use them at your own risk!
       * @static
       * @private
       * @type {Object}
       * @deprecated since version 1.8
       * @member Utils
       * @memberof Popper
       */

    }]);
    return Popper;
  }();

  /**
   * The `referenceObject` is an object that provides an interface compatible with Popper.js
   * and lets you use it as replacement of a real DOM node.<br />
   * You can use this method to position a popper relatively to a set of coordinates
   * in case you don't have a DOM node to use as reference.
   *
   * ```
   * new Popper(referenceObject, popperNode);
   * ```
   *
   * NB: This feature isn't supported in Internet Explorer 10.
   * @name referenceObject
   * @property {Function} data.getBoundingClientRect
   * A function that returns a set of coordinates compatible with the native `getBoundingClientRect` method.
   * @property {number} data.clientWidth
   * An ES6 getter that will return the width of the virtual reference element.
   * @property {number} data.clientHeight
   * An ES6 getter that will return the height of the virtual reference element.
   */


  Popper.Utils = (typeof window !== 'undefined' ? window : global).PopperUtils;
  Popper.placements = placements;
  Popper.Defaults = Defaults;


  skylark.ui = skyalrk.ui || {};

  return skylark.ui.Popper = Popper;

});


define('skylark-bootstrap4/dropdown',[
    'skylark-langx/langx',
    'skylark-utils-dom/query',
    'skylark-utils-dom/plugins',
    "./bs4",
    'skylark-ui-popper/Popper',
    './util'
], function (langx,$, plugins,bs4,Popper,Util) {
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
            const showEvent = $.Event(Event.SHOW, relatedTarget);
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
            $(parent).toggleClass(ClassName.SHOW).trigger($.Event(Event.SHOWN, relatedTarget));
        }
        show() {
            if (this._element.disabled || $(this._element).hasClass(ClassName.DISABLED) || $(this._menu).hasClass(ClassName.SHOW)) {
                return;
            }
            const relatedTarget = { relatedTarget: this._element };
            const showEvent = $.Event(Event.SHOW, relatedTarget);
            const parent = Dropdown._getParentFromElement(this._element);
            $(parent).trigger(showEvent);
            if (showEvent.isDefaultPrevented()) {
                return;
            }
            $(this._menu).toggleClass(ClassName.SHOW);
            $(parent).toggleClass(ClassName.SHOW).trigger($.Event(Event.SHOWN, relatedTarget));
        }
        hide() {
            if (this._element.disabled || $(this._element).hasClass(ClassName.DISABLED) || !$(this._menu).hasClass(ClassName.SHOW)) {
                return;
            }
            const relatedTarget = { relatedTarget: this._element };
            const hideEvent = $.Event(Event.HIDE, relatedTarget);
            const parent = Dropdown._getParentFromElement(this._element);
            $(parent).trigger(hideEvent);
            if (hideEvent.isDefaultPrevented()) {
                return;
            }
            $(this._menu).toggleClass(ClassName.SHOW);
            $(parent).toggleClass(ClassName.SHOW).trigger($.Event(Event.HIDDEN, relatedTarget));
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
                const hideEvent = $.Event(Event.HIDE, relatedTarget);
                $(parent).trigger(hideEvent);
                if (hideEvent.isDefaultPrevented()) {
                    continue;
                }
                if ('ontouchstart' in document.documentElement) {
                    $(document.body).children().off('mouseover', null, $.noop);
                }
                toggles[i].setAttribute('aria-expanded', 'false');
                $(dropdownMenu).removeClass(ClassName.SHOW);
                $(parent).removeClass(ClassName.SHOW).trigger($.Event(Event.HIDDEN, relatedTarget));
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
    'skylark-utils-dom/plugins',
    "./bs4",
    './util'
], function (langx,$, plugins,bs4,Util) {

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
            const showEvent = $.Event(Event.SHOW, { relatedTarget });
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
            const hideEvent = $.Event(Event.HIDE);
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
            const shownEvent = $.Event(Event.SHOWN, { relatedTarget });
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
    'skylark-utils-dom/plugins',
    "./bs4",
    'skylark-ui-popper/Popper',
    './util'
], function (langx,$, plugins,bs4,Popper,Util) {
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
                throw new TypeError("Bootstrap's tooltips require skylark-ui-popper/Popper (https://skylark-ui-popper/Popper.org/)");
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
            const showEvent = $.Event(this.constructor.Event.SHOW);
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
            const hideEvent = $.Event(this.constructor.Event.HIDE);
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
                const hiddenEvent = $.Event(Event.HIDDEN, { relatedTarget: this._element });
                const shownEvent = $.Event(Event.SHOWN, { relatedTarget: previous });
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