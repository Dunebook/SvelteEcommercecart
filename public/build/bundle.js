
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const cart = writable({});

    /* src\CartComponents\Card.svelte generated by Svelte v3.32.1 */
    const file = "src\\CartComponents\\Card.svelte";

    // (27:29) {#if inCart > 0}
    function create_if_block(ctx) {
    	let span;
    	let em;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			em = element("em");
    			t0 = text("(");
    			t1 = text(/*inCart*/ ctx[1]);
    			t2 = text(" in cart)");
    			add_location(em, file, 28, 8, 697);
    			add_location(span, file, 27, 6, 681);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, em);
    			append_dev(em, t0);
    			append_dev(em, t1);
    			append_dev(em, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*inCart*/ 2) set_data_dev(t1, /*inCart*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(27:29) {#if inCart > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div2;
    	let img_1;
    	let img_1_src_value;
    	let t0;
    	let div0;
    	let h5;
    	let t2;
    	let b;
    	let t5;
    	let p;
    	let t6;
    	let div1;
    	let button;
    	let object;
    	let t7;
    	let mounted;
    	let dispose;
    	let if_block = /*inCart*/ ctx[1] > 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			img_1 = element("img");
    			t0 = space();
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = `${/*name*/ ctx[2]}`;
    			t2 = space();
    			b = element("b");
    			b.textContent = `\$ ${/*price*/ ctx[3]}`;
    			t5 = space();
    			p = element("p");
    			if (if_block) if_block.c();
    			t6 = space();
    			div1 = element("div");
    			button = element("button");
    			object = element("object");
    			t7 = text("\r\n      Add to cart");
    			attr_dev(img_1, "class", "card-img-top");
    			attr_dev(img_1, "width", "200");
    			if (img_1.src !== (img_1_src_value = /*img*/ ctx[0])) attr_dev(img_1, "src", img_1_src_value);
    			attr_dev(img_1, "alt", /*name*/ ctx[2]);
    			add_location(img_1, file, 19, 2, 446);
    			attr_dev(h5, "class", "card-title");
    			add_location(h5, file, 22, 2, 541);
    			attr_dev(b, "class", "alert");
    			attr_dev(b, "alert-info", "");
    			add_location(b, file, 25, 2, 585);
    			attr_dev(p, "class", "alert");
    			attr_dev(p, "alert-info", "");
    			add_location(p, file, 26, 2, 630);
    			attr_dev(div0, "class", "card-body");
    			add_location(div0, file, 20, 2, 512);
    			attr_dev(object, "aria-label", "shopping cart");
    			attr_dev(object, "type", "image/svg+xml");
    			attr_dev(object, "data", "img/svg/shopping-cart.svg");
    			add_location(object, file, 33, 6, 882);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-primary");
    			add_location(button, file, 32, 4, 807);
    			attr_dev(div1, "class", "btn-group");
    			attr_dev(div1, "role", "group");
    			add_location(div1, file, 31, 2, 765);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file, 18, 0, 424);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, img_1);
    			append_dev(div2, t0);
    			append_dev(div2, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t2);
    			append_dev(div0, b);
    			append_dev(div0, t5);
    			append_dev(div0, p);
    			if (if_block) if_block.m(p, null);
    			append_dev(div2, t6);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    			append_dev(button, object);
    			append_dev(button, t7);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*addToCart*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*img*/ 1 && img_1.src !== (img_1_src_value = /*img*/ ctx[0])) {
    				attr_dev(img_1, "src", img_1_src_value);
    			}

    			if (/*inCart*/ ctx[1] > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(p, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Card", slots, []);
    	let { item } = $$props;
    	let { img, name, price } = item;
    	img = `img/${img}`;
    	const cartItems = get_store_value(cart);
    	let inCart = cartItems[name] ? cartItems[name].count : 0;

    	function addToCart() {
    		$$invalidate(1, inCart++, inCart);

    		cart.update(n => {
    			return { ...n, [name]: { ...item, count: inCart } };
    		});
    	}

    	const writable_props = ["item"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Card> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("item" in $$props) $$invalidate(5, item = $$props.item);
    	};

    	$$self.$capture_state = () => ({
    		get: get_store_value,
    		cart,
    		item,
    		img,
    		name,
    		price,
    		cartItems,
    		inCart,
    		addToCart
    	});

    	$$self.$inject_state = $$props => {
    		if ("item" in $$props) $$invalidate(5, item = $$props.item);
    		if ("img" in $$props) $$invalidate(0, img = $$props.img);
    		if ("name" in $$props) $$invalidate(2, name = $$props.name);
    		if ("price" in $$props) $$invalidate(3, price = $$props.price);
    		if ("inCart" in $$props) $$invalidate(1, inCart = $$props.inCart);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [img, inCart, name, price, addToCart, item];
    }

    class Card extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { item: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Card",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*item*/ ctx[5] === undefined && !("item" in props)) {
    			console.warn("<Card> was created without expected prop 'item'");
    		}
    	}

    	get item() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var items = [
    	{
    		name: 'laptop',
    		price: '500',
    		img: 'laptop1.png'
    	},
    	{
    		name: 'Latest PC',
    		price: '1,000',
    		img: 'mobile1.png'
    	},
    	{
    		name: 'Latest laptop',
    		price: '1000',
    		img: 'laptop2.png'
    	},
    	{
    		name: 'latest smart watch',
    		price: '5,000,000',
    		img: 'smartwatch.png'
    	},
    	{
    		name: 'Monitor',
    		price: '2000',
    		img: 'display.png'
    	},
    	
    	{
    		name: 'playstation',
    		price: '2,670',
    		img: 'playstation.png'
    	}
    ];

    /* src\CartComponents\CardWrapper.svelte generated by Svelte v3.32.1 */
    const file$1 = "src\\CartComponents\\CardWrapper.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[0] = list[i];
    	return child_ctx;
    }

    // (10:4) {#each items as item}
    function create_each_block(ctx) {
    	let div;
    	let card;
    	let t;
    	let current;

    	card = new Card({
    			props: { item: /*item*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(card.$$.fragment);
    			t = space();
    			attr_dev(div, "class", "col-md-4");
    			add_location(div, file$1, 10, 4, 179);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(card, div, null);
    			append_dev(div, t);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(card);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(10:4) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div1;
    	let div0;
    	let current;
    	let each_value = items;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "row");
    			add_location(div0, file$1, 6, 2, 123);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file$1, 5, 0, 96);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*items*/ 0) {
    				each_value = items;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CardWrapper", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CardWrapper> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Card, items });
    	return [];
    }

    class CardWrapper extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CardWrapper",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\cartComponents\Navbar.svelte generated by Svelte v3.32.1 */

    const { Object: Object_1 } = globals;
    const file$2 = "src\\cartComponents\\Navbar.svelte";

    // (61:45) {#if cart_sum > 0}
    function create_if_block$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*cart_sum*/ ctx[0]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*cart_sum*/ 1) set_data_dev(t, /*cart_sum*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(61:45) {#if cart_sum > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let nav;
    	let div2;
    	let a0;
    	let t1;
    	let button0;
    	let i0;
    	let t2;
    	let button1;
    	let i1;
    	let t3;
    	let span;
    	let t5;
    	let div0;
    	let ul0;
    	let li0;
    	let a1;
    	let t7;
    	let li1;
    	let a2;
    	let t9;
    	let div1;
    	let ul1;
    	let li2;
    	let a3;
    	let t10;
    	let svg;
    	let path;
    	let t11;
    	let li3;
    	let t12;
    	let br;
    	let mounted;
    	let dispose;
    	let if_block = /*cart_sum*/ ctx[0] > 0 && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div2 = element("div");
    			a0 = element("a");
    			a0.textContent = "SvelteCart";
    			t1 = space();
    			button0 = element("button");
    			i0 = element("i");
    			t2 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t3 = space();
    			span = element("span");
    			span.textContent = "88";
    			t5 = space();
    			div0 = element("div");
    			ul0 = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			a1.textContent = "Electronics";
    			t7 = space();
    			li1 = element("li");
    			a2 = element("a");
    			a2.textContent = "customer care";
    			t9 = space();
    			div1 = element("div");
    			ul1 = element("ul");
    			li2 = element("li");
    			a3 = element("a");
    			t10 = text("Items in Cart\r\n                  ");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t11 = space();
    			li3 = element("li");
    			if (if_block) if_block.c();
    			t12 = space();
    			br = element("br");
    			attr_dev(a0, "class", "navbar-brand logo-font");
    			attr_dev(a0, "id", "brand");
    			add_location(a0, file$2, 29, 6, 722);
    			attr_dev(i0, "class", "fa fa-bars");
    			add_location(i0, file$2, 33, 12, 1055);
    			attr_dev(button0, "class", "navbar-toggler order-first");
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "data-toggle", "collapse");
    			attr_dev(button0, "data-target", "#links");
    			attr_dev(button0, "aria-controls", "navbarResponsive");
    			attr_dev(button0, "aria-expanded", "false");
    			attr_dev(button0, "aria-label", "Toggle navigation");
    			add_location(button0, file$2, 32, 8, 854);
    			attr_dev(i1, "class", "fa fa-shopping-cart fa-1x");
    			attr_dev(i1, "aria-hidden", "true");
    			add_location(i1, file$2, 37, 12, 1334);
    			attr_dev(span, "class", "badge badge-light");
    			add_location(span, file$2, 38, 12, 1408);
    			attr_dev(button1, "class", "navbar-toggler");
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-toggle", "collapse");
    			attr_dev(button1, "data-target", "#account");
    			attr_dev(button1, "aria-controls", "navbarResponsive");
    			attr_dev(button1, "aria-expanded", "false");
    			attr_dev(button1, "aria-label", "Toggle navigation");
    			add_location(button1, file$2, 36, 8, 1143);
    			attr_dev(a1, "class", "nav-link");
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$2, 45, 20, 1659);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file$2, 44, 16, 1616);
    			attr_dev(a2, "class", "nav-link");
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$2, 48, 20, 1788);
    			attr_dev(li1, "class", "nav-item");
    			add_location(li1, file$2, 47, 16, 1745);
    			attr_dev(ul0, "class", "navbar-nav mr-auto");
    			add_location(ul0, file$2, 42, 12, 1551);
    			attr_dev(div0, "class", "collapse navbar-collapse");
    			attr_dev(div0, "id", "links");
    			add_location(div0, file$2, 41, 8, 1488);
    			attr_dev(path, "d", "M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM6.5 7h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1 0-1z");
    			add_location(path, file$2, 57, 20, 2277);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "fill", "currentColor");
    			attr_dev(svg, "class", "bi bi-cart-dash-fill");
    			attr_dev(svg, "viewBox", "0 0 16 16");
    			add_location(svg, file$2, 56, 18, 2123);
    			attr_dev(a3, "class", "nav-link");
    			add_location(a3, file$2, 55, 44, 2046);
    			attr_dev(li2, "class", "nav-item active");
    			add_location(li2, file$2, 55, 16, 2018);
    			attr_dev(li3, "class", "nav-link active");
    			add_location(li3, file$2, 60, 16, 2676);
    			attr_dev(ul1, "class", "navbar-nav ml-auto");
    			add_location(ul1, file$2, 54, 12, 1969);
    			attr_dev(div1, "class", "collapse navbar-collapse");
    			attr_dev(div1, "id", "account");
    			add_location(div1, file$2, 53, 8, 1904);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$2, 27, 4, 689);
    			attr_dev(nav, "class", "navbar navbar-dark bg-primary navbar-expand-lg navbar-dark ");
    			add_location(nav, file$2, 26, 2, 610);
    			add_location(br, file$2, 67, 0, 2824);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div2);
    			append_dev(div2, a0);
    			append_dev(div2, t1);
    			append_dev(div2, button0);
    			append_dev(button0, i0);
    			append_dev(div2, t2);
    			append_dev(div2, button1);
    			append_dev(button1, i1);
    			append_dev(button1, t3);
    			append_dev(button1, span);
    			append_dev(div2, t5);
    			append_dev(div2, div0);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a1);
    			append_dev(ul0, t7);
    			append_dev(ul0, li1);
    			append_dev(li1, a2);
    			append_dev(div2, t9);
    			append_dev(div2, div1);
    			append_dev(div1, ul1);
    			append_dev(ul1, li2);
    			append_dev(li2, a3);
    			append_dev(a3, t10);
    			append_dev(a3, svg);
    			append_dev(svg, path);
    			append_dev(ul1, t11);
    			append_dev(ul1, li3);
    			if (if_block) if_block.m(li3, null);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, br, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", /*goToHome*/ ctx[1], false, false, false),
    					listen_dev(a3, "click", /*goToCheckout*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*cart_sum*/ ctx[0] > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(li3, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (if_block) if_block.d();
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(br);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Navbar", slots, []);
    	const dispatch = createEventDispatcher();
    	let cart_sum = 0;

    	const unsubscribe = cart.subscribe(items => {
    		const itemValues = Object.values(items);
    		$$invalidate(0, cart_sum = 0);

    		itemValues.forEach(item => {
    			$$invalidate(0, cart_sum += item.count);
    		});
    	});

    	function goToHome() {
    		dispatch("nav", { option: "home" });
    	}

    	function goToCheckout() {
    		dispatch("nav", { option: "checkout" });
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		cart,
    		createEventDispatcher,
    		dispatch,
    		cart_sum,
    		unsubscribe,
    		goToHome,
    		goToCheckout
    	});

    	$$self.$inject_state = $$props => {
    		if ("cart_sum" in $$props) $$invalidate(0, cart_sum = $$props.cart_sum);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [cart_sum, goToHome, goToCheckout];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\CartComponents\CheckoutItem.svelte generated by Svelte v3.32.1 */
    const file$3 = "src\\CartComponents\\CheckoutItem.svelte";

    function create_fragment$3(ctx) {
    	let div2;
    	let img_1;
    	let img_1_src_value;
    	let t0;
    	let div1;
    	let h3;
    	let t2;
    	let p;
    	let t5;
    	let div0;
    	let button0;
    	let t7;
    	let t8_value = " " + "";
    	let t8;
    	let t9;
    	let span;
    	let t10;
    	let t11;
    	let t12_value = " " + "";
    	let t12;
    	let t13;
    	let button1;
    	let t15;
    	let t16_value = " " + "";
    	let t16;
    	let t17;
    	let button2;
    	let object;
    	let t18;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			img_1 = element("img");
    			t0 = space();
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = `${/*name*/ ctx[1]}`;
    			t2 = space();
    			p = element("p");
    			p.textContent = `Price: \$ ${/*price*/ ctx[2]}`;
    			t5 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "+";
    			t7 = space();
    			t8 = text(t8_value);
    			t9 = space();
    			span = element("span");
    			t10 = text(/*count*/ ctx[0]);
    			t11 = space();
    			t12 = text(t12_value);
    			t13 = space();
    			button1 = element("button");
    			button1.textContent = "-";
    			t15 = space();
    			t16 = text(t16_value);
    			t17 = space();
    			button2 = element("button");
    			object = element("object");
    			t18 = text("\r\n          Remove");
    			attr_dev(img_1, "class", "img-fluid img-thumbnail");
    			attr_dev(img_1, "width", "300");
    			if (img_1.src !== (img_1_src_value = `img/${/*img*/ ctx[3]}`)) attr_dev(img_1, "src", img_1_src_value);
    			attr_dev(img_1, "alt", /*name*/ ctx[1]);
    			add_location(img_1, file$3, 23, 4, 538);
    			attr_dev(h3, "class", "title");
    			add_location(h3, file$3, 25, 6, 661);
    			attr_dev(p, "class", "price");
    			add_location(p, file$3, 26, 6, 698);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-success add");
    			add_location(button0, file$3, 28, 8, 770);
    			add_location(span, file$3, 29, 8, 876);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-warning");
    			add_location(button1, file$3, 30, 8, 912);
    			attr_dev(object, "aria-label", "remove");
    			attr_dev(object, "type", "image/svg+xml");
    			attr_dev(object, "data", "img/svg/cancel.svg");
    			add_location(object, file$3, 32, 10, 1094);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "btn btn-danger");
    			add_location(button2, file$3, 31, 8, 1014);
    			attr_dev(div0, "class", "col");
    			add_location(div0, file$3, 27, 6, 743);
    			attr_dev(div1, "class", "item-meta-data");
    			add_location(div1, file$3, 24, 4, 625);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$3, 22, 2, 515);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, img_1);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, h3);
    			append_dev(div1, t2);
    			append_dev(div1, p);
    			append_dev(div1, t5);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t7);
    			append_dev(div0, t8);
    			append_dev(div0, t9);
    			append_dev(div0, span);
    			append_dev(span, t10);
    			append_dev(div0, t11);
    			append_dev(div0, t12);
    			append_dev(div0, t13);
    			append_dev(div0, button1);
    			append_dev(div0, t15);
    			append_dev(div0, t16);
    			append_dev(div0, t17);
    			append_dev(div0, button2);
    			append_dev(button2, object);
    			append_dev(button2, t18);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*countButtonHandler*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*countButtonHandler*/ ctx[4], false, false, false),
    					listen_dev(button2, "click", /*removeItem*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*count*/ 1) set_data_dev(t10, /*count*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CheckoutItem", slots, []);
    	let { item } = $$props;
    	let { name, price, img, count } = item;

    	const countButtonHandler = e => {
    		if (e.target.classList.contains("add")) {
    			$$invalidate(0, count++, count);
    		} else if (count >= 1) {
    			$$invalidate(0, count--, count);
    		}

    		cart.update(n => ({ ...n, [name]: { ...n[name], count } }));
    	};

    	const removeItem = () => {
    		cart.update(n => {
    			delete n[name];
    			return n;
    		});
    	};

    	const writable_props = ["item"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CheckoutItem> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("item" in $$props) $$invalidate(6, item = $$props.item);
    	};

    	$$self.$capture_state = () => ({
    		cart,
    		item,
    		name,
    		price,
    		img,
    		count,
    		countButtonHandler,
    		removeItem
    	});

    	$$self.$inject_state = $$props => {
    		if ("item" in $$props) $$invalidate(6, item = $$props.item);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("price" in $$props) $$invalidate(2, price = $$props.price);
    		if ("img" in $$props) $$invalidate(3, img = $$props.img);
    		if ("count" in $$props) $$invalidate(0, count = $$props.count);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [count, name, price, img, countButtonHandler, removeItem, item];
    }

    class CheckoutItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { item: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CheckoutItem",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*item*/ ctx[6] === undefined && !("item" in props)) {
    			console.warn("<CheckoutItem> was created without expected prop 'item'");
    		}
    	}

    	get item() {
    		throw new Error("<CheckoutItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<CheckoutItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\cartComponents\Checkout.svelte generated by Svelte v3.32.1 */

    const { Object: Object_1$1 } = globals;
    const file$4 = "src\\cartComponents\\Checkout.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (31:2) {:else}
    function create_else_block_1(ctx) {
    	let div0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t0;
    	let br;
    	let t1;
    	let div1;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*cartItems*/ ctx[1];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*item*/ ctx[4].name;
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			br = element("br");
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "Checkout";
    			attr_dev(div0, "class", "row");
    			add_location(div0, file$4, 31, 2, 694);
    			add_location(br, file$4, 36, 1, 813);
    			attr_dev(div1, "class", "btn btn-success btn-lg btn-block");
    			add_location(div1, file$4, 37, 3, 822);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", /*checkout*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*cartItems*/ 2) {
    				each_value = /*cartItems*/ ctx[1];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div0, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(31:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (25:2) {#if cartItems.length === 0}
    function create_if_block$2(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*checkedOut*/ ctx[0]) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type_1(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(25:2) {#if cartItems.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (33:4) {#each cartItems as item (item.name)}
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let checkoutitem;
    	let current;

    	checkoutitem = new CheckoutItem({
    			props: { item: /*item*/ ctx[4] },
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(checkoutitem.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(checkoutitem, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const checkoutitem_changes = {};
    			if (dirty & /*cartItems*/ 2) checkoutitem_changes.item = /*item*/ ctx[4];
    			checkoutitem.$set(checkoutitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(checkoutitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(checkoutitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(checkoutitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(33:4) {#each cartItems as item (item.name)}",
    		ctx
    	});

    	return block;
    }

    // (28:4) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Your cart is empty";
    			attr_dev(p, "class", "empty-message");
    			add_location(p, file$4, 28, 6, 621);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(28:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (26:4) {#if checkedOut}
    function create_if_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Thank you for shopping with us";
    			attr_dev(p, "class", "empty-message");
    			add_location(p, file$4, 26, 6, 541);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(26:4) {#if checkedOut}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div2;
    	let h1;
    	let t1;
    	let div1;
    	let div0;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$2, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*cartItems*/ ctx[1].length === 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "My Cart";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			if_block.c();
    			add_location(h1, file$4, 19, 2, 408);
    			attr_dev(div0, "class", "col-sm");
    			add_location(div0, file$4, 23, 4, 459);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file$4, 20, 2, 428);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$4, 18, 0, 381);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h1);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			if_blocks[current_block_type_index].m(div0, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div0, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Checkout", slots, []);
    	let checkedOut = false;
    	let cartItems = [];

    	const unsubscribe = cart.subscribe(items => {
    		$$invalidate(1, cartItems = Object.values(items));
    	});

    	const checkout = () => {
    		$$invalidate(0, checkedOut = true);

    		cart.update(n => {
    			return {};
    		});
    	};

    	const writable_props = [];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Checkout> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		CheckoutItem,
    		cart,
    		checkedOut,
    		cartItems,
    		unsubscribe,
    		checkout
    	});

    	$$self.$inject_state = $$props => {
    		if ("checkedOut" in $$props) $$invalidate(0, checkedOut = $$props.checkedOut);
    		if ("cartItems" in $$props) $$invalidate(1, cartItems = $$props.cartItems);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [checkedOut, cartItems, checkout];
    }

    class Checkout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Checkout",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.32.1 */

    // (14:2) {:else}
    function create_else_block$1(ctx) {
    	let checkout;
    	let current;
    	checkout = new Checkout({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(checkout.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(checkout, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(checkout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(checkout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(checkout, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(14:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (12:2) {#if nav === 'home'}
    function create_if_block$3(ctx) {
    	let cardwrapper;
    	let current;
    	cardwrapper = new CardWrapper({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(cardwrapper.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(cardwrapper, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cardwrapper.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cardwrapper.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(cardwrapper, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(12:2) {#if nav === 'home'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let navbar;
    	let t;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	navbar = new Navbar({ $$inline: true });
    	navbar.$on("nav", /*navHandler*/ ctx[1]);
    	const if_block_creators = [create_if_block$3, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*nav*/ ctx[0] === "home") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			create_component(navbar.$$.fragment);
    			t = space();
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(navbar, target, anchor);
    			insert_dev(target, t, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(navbar, detaching);
    			if (detaching) detach_dev(t);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let nav = "home";

    	function navHandler(event) {
    		$$invalidate(0, nav = event.detail.option);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		CardWrapper,
    		Navbar,
    		Checkout,
    		nav,
    		navHandler
    	});

    	$$self.$inject_state = $$props => {
    		if ("nav" in $$props) $$invalidate(0, nav = $$props.nav);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [nav, navHandler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
