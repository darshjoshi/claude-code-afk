import { execFile as execFile$1 } from 'node:child_process';
import { promisify } from 'node:util';
import require$$0$3, { EventEmitter as EventEmitter$8 } from 'events';
import require$$1$1 from 'https';
import require$$2 from 'http';
import require$$3 from 'net';
import require$$4 from 'tls';
import require$$1 from 'crypto';
import require$$0$2 from 'stream';
import require$$7 from 'url';
import require$$0 from 'zlib';
import require$$0$1 from 'buffer';
import fs, { existsSync, readFileSync } from 'node:fs';
import path, { join } from 'node:path';
import { cwd } from 'node:process';
import { randomUUID } from 'node:crypto';
import require$$0$4 from 'child_process';
import require$$1$2 from 'os';
import 'path';
import 'fs';

/**
 * Default language supported by all i18n providers.
 */
const defaultLanguage = "en";

/**
 * Creates a {@link IDisposable} that defers the disposing to the {@link dispose} function; disposing is guarded so that it may only occur once.
 * @param dispose Function responsible for disposing.
 * @returns Disposable whereby the disposing is delegated to the {@link dispose}  function.
 */
function deferredDisposable(dispose) {
    let isDisposed = false;
    const guardedDispose = () => {
        if (!isDisposed) {
            dispose();
            isDisposed = true;
        }
    };
    return {
        [Symbol.dispose]: guardedDispose,
        dispose: guardedDispose,
    };
}

/**
 * An event emitter that enables the listening for, and emitting of, events.
 */
let EventEmitter$7 = class EventEmitter {
    /**
     * Underlying collection of events and their listeners.
     */
    events = new Map();
    /**
     * Adds the event {@link listener} for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the {@link listener} added.
     */
    addListener(eventName, listener) {
        return this.add(eventName, listener, (listeners) => listeners.push({ listener }));
    }
    /**
     * Adds the event {@link listener} for the event named {@link eventName}, and returns a disposable capable of removing the event listener.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns A disposable that removes the listener when disposed.
     */
    disposableOn(eventName, listener) {
        this.add(eventName, listener, (listeners) => listeners.push({ listener }));
        return deferredDisposable(() => this.removeListener(eventName, listener));
    }
    /**
     * Emits the {@link eventName}, invoking all event listeners with the specified {@link args}.
     * @param eventName Name of the event.
     * @param args Arguments supplied to each event listener.
     * @returns `true` when there was a listener associated with the event; otherwise `false`.
     */
    emit(eventName, ...args) {
        const listeners = this.events.get(eventName);
        if (listeners === undefined) {
            return false;
        }
        for (let i = 0; i < listeners.length;) {
            const { listener, once } = listeners[i];
            if (once) {
                this.remove(eventName, listeners, i);
            }
            else {
                i++;
            }
            listener(...args);
        }
        return true;
    }
    /**
     * Gets the event names with event listeners.
     * @returns Event names.
     */
    eventNames() {
        return Array.from(this.events.keys());
    }
    /**
     * Gets the number of event listeners for the event named {@link eventName}. When a {@link listener} is defined, only matching event listeners are counted.
     * @param eventName Name of the event.
     * @param listener Optional event listener to count.
     * @returns Number of event listeners.
     */
    listenerCount(eventName, listener) {
        const listeners = this.events.get(eventName);
        if (listeners === undefined || listener == undefined) {
            return listeners?.length || 0;
        }
        let count = 0;
        listeners.forEach((ev) => {
            if (ev.listener === listener) {
                count++;
            }
        });
        return count;
    }
    /**
     * Gets the event listeners for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @returns The event listeners.
     */
    listeners(eventName) {
        return Array.from(this.events.get(eventName) || []).map(({ listener }) => listener);
    }
    /**
     * Removes the event {@link listener} for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the event {@link listener} removed.
     */
    off(eventName, listener) {
        const listeners = this.events.get(eventName) ?? [];
        for (let i = listeners.length - 1; i >= 0; i--) {
            if (listeners[i].listener === listener) {
                this.remove(eventName, listeners, i);
            }
        }
        return this;
    }
    /**
     * Adds the event {@link listener} for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the event {@link listener} added.
     */
    on(eventName, listener) {
        return this.add(eventName, listener, (listeners) => listeners.push({ listener }));
    }
    /**
     * Adds the **one-time** event {@link listener} for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the event {@link listener} added.
     */
    once(eventName, listener) {
        return this.add(eventName, listener, (listeners) => listeners.push({ listener, once: true }));
    }
    /**
     * Adds the event {@link listener} to the beginning of the listeners for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the event {@link listener} prepended.
     */
    prependListener(eventName, listener) {
        return this.add(eventName, listener, (listeners) => listeners.splice(0, 0, { listener }));
    }
    /**
     * Adds the **one-time** event {@link listener} to the beginning of the listeners for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the event {@link listener} prepended.
     */
    prependOnceListener(eventName, listener) {
        return this.add(eventName, listener, (listeners) => listeners.splice(0, 0, { listener, once: true }));
    }
    /**
     * Removes all event listeners for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @returns This instance with the event listeners removed
     */
    removeAllListeners(eventName) {
        const listeners = this.events.get(eventName) ?? [];
        while (listeners.length > 0) {
            this.remove(eventName, listeners, 0);
        }
        this.events.delete(eventName);
        return this;
    }
    /**
     * Removes the event {@link listener} for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the event {@link listener} removed.
     */
    removeListener(eventName, listener) {
        return this.off(eventName, listener);
    }
    /**
     * Adds the event {@link listener} for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @param fn Function responsible for adding the new event handler function.
     * @returns This instance with event {@link listener} added.
     */
    add(eventName, listener, fn) {
        let listeners = this.events.get(eventName);
        if (listeners === undefined) {
            listeners = [];
            this.events.set(eventName, listeners);
        }
        fn(listeners);
        if (eventName !== "newListener") {
            const args = [eventName, listener];
            this.emit("newListener", ...args);
        }
        return this;
    }
    /**
     * Removes the listener at the given index.
     * @param eventName Name of the event.
     * @param listeners Listeners registered with the event.
     * @param index Index of the listener to remove.
     */
    remove(eventName, listeners, index) {
        const [{ listener }] = listeners.splice(index, 1);
        if (eventName !== "removeListener") {
            const args = [eventName, listener];
            this.emit("removeListener", ...args);
        }
    }
};

/**
 * Prevents the modification of existing property attributes and values on the value, and all of its child properties, and prevents the addition of new properties.
 * @param value Value to freeze.
 */
function freeze(value) {
    if (value !== undefined && value !== null && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value);
        Object.values(value).forEach(freeze);
    }
}
/**
 * Gets the value at the specified {@link path}.
 * @param source Source object that is being read from.
 * @param path Path to the property to get.
 * @returns Value of the property.
 */
function get(source, path) {
    const props = path.split(".");
    return props.reduce((obj, prop) => obj && obj[prop], source);
}

/**
 * Internalization provider, responsible for managing localizations and translating resources.
 */
class I18nProvider {
    /**
     * Backing field for the default language.
     */
    #language;
    /**
     * Map of localized resources, indexed by their language.
     */
    #translations = new Map();
    /**
     * Function responsible for providing localized resources for a given language.
     */
    #readTranslations;
    /**
     * Internal events handler.
     */
    #events = new EventEmitter$7();
    /**
     * Initializes a new instance of the {@link I18nProvider} class.
     * @param language The default language to be used when retrieving translations for a given key.
     * @param readTranslations Function responsible for providing localized resources for a given language.
     */
    constructor(language, readTranslations) {
        this.#language = language;
        this.#readTranslations = readTranslations;
    }
    /**
     * The default language of the provider.
     * @returns The language.
     */
    get language() {
        return this.#language;
    }
    /**
     * The default language of the provider.
     * @param value The language.
     */
    set language(value) {
        if (this.#language !== value) {
            this.#language = value;
            this.#events.emit("languageChange", value);
        }
    }
    /**
     * Adds an event listener that is called when the language within the provider changes.
     * @param listener Listener function to be called.
     * @returns Resource manager that, when disposed, removes the event listener.
     */
    onLanguageChange(listener) {
        return this.#events.disposableOn("languageChange", listener);
    }
    /**
     * Translates the specified {@link key}, as defined within the resources for the {@link language}.
     * When the key is not found, the default language is checked. Alias of {@link I18nProvider.translate}.
     * @param key Key of the translation.
     * @param language Optional language to get the translation for; otherwise the default language.
     * @returns The translation; otherwise the key.
     */
    t(key, language = this.language) {
        return this.translate(key, language);
    }
    /**
     * Translates the specified {@link key}, as defined within the resources for the {@link language}.
     * When the key is not found, the default language is checked.
     * @param key Key of the translation.
     * @param language Optional language to get the translation for; otherwise the default language.
     * @returns The translation; otherwise the key.
     */
    translate(key, language = this.language) {
        // Determine the languages to search for.
        const languages = new Set([
            language,
            language.replaceAll("_", "-").split("-").at(0),
            defaultLanguage,
        ]);
        // Attempt to find the resource for the languages.
        for (const language of languages) {
            const resource = get(this.getTranslations(language), key);
            if (resource) {
                return resource.toString();
            }
        }
        // Otherwise fallback to the key.
        return key;
    }
    /**
     * Gets the translations for the specified language.
     * @param language Language whose translations are being retrieved.
     * @returns The translations; otherwise `null`.
     */
    getTranslations(language) {
        let translations = this.#translations.get(language);
        if (translations === undefined) {
            translations = this.#readTranslations(language);
            freeze(translations);
            this.#translations.set(language, translations);
        }
        return translations;
    }
}

/**
 * Provides a read-only iterable collection of items that also acts as a partial polyfill for iterator helpers.
 */
class Enumerable {
    /**
     * Backing function responsible for providing the iterator of items.
     */
    #items;
    /**
     * Backing function for {@link Enumerable.length}.
     */
    #length;
    /**
     * Captured iterator from the underlying iterable; used to fulfil {@link IterableIterator} methods.
     */
    #iterator;
    /**
     * Initializes a new instance of the {@link Enumerable} class.
     * @param source Source that contains the items.
     * @returns The enumerable.
     */
    constructor(source) {
        if (source instanceof Enumerable) {
            // Enumerable
            this.#items = source.#items;
            this.#length = source.#length;
        }
        else if (Array.isArray(source)) {
            // Array
            this.#items = () => source.values();
            this.#length = () => source.length;
        }
        else if (source instanceof Map || source instanceof Set) {
            // Map or Set
            this.#items = () => source.values();
            this.#length = () => source.size;
        }
        else {
            // IterableIterator delegate
            this.#items = source;
            this.#length = () => {
                let i = 0;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                for (const _ of this) {
                    i++;
                }
                return i;
            };
        }
    }
    /**
     * Gets the number of items in the enumerable.
     * @returns The number of items.
     */
    get length() {
        return this.#length();
    }
    /**
     * Gets the iterator for the enumerable.
     * @yields The items.
     */
    *[Symbol.iterator]() {
        for (const item of this.#items()) {
            yield item;
        }
    }
    /**
     * Transforms each item within this iterator to an indexed pair, with each pair represented as an array.
     * @returns An iterator of indexed pairs.
     */
    asIndexedPairs() {
        return new Enumerable(function* () {
            let i = 0;
            for (const item of this) {
                yield [i++, item];
            }
        }.bind(this));
    }
    /**
     * Returns an iterator with the first items dropped, up to the specified limit.
     * @param limit The number of elements to drop from the start of the iteration.
     * @returns An iterator of items after the limit.
     */
    drop(limit) {
        if (isNaN(limit) || limit < 0) {
            throw new RangeError("limit must be 0, or a positive number");
        }
        return new Enumerable(function* () {
            let i = 0;
            for (const item of this) {
                if (i++ >= limit) {
                    yield item;
                }
            }
        }.bind(this));
    }
    /**
     * Determines whether all items satisfy the specified predicate.
     * @param predicate Function that determines whether each item fulfils the predicate.
     * @returns `true` when all items satisfy the predicate; otherwise `false`.
     */
    every(predicate) {
        for (const item of this) {
            if (!predicate(item)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Returns an iterator of items that meet the specified predicate..
     * @param predicate Function that determines which items to filter.
     * @returns An iterator of filtered items.
     */
    filter(predicate) {
        return new Enumerable(function* () {
            for (const item of this) {
                if (predicate(item)) {
                    yield item;
                }
            }
        }.bind(this));
    }
    /**
     * Finds the first item that satisfies the specified predicate.
     * @param predicate Predicate to match items against.
     * @returns The first item that satisfied the predicate; otherwise `undefined`.
     */
    find(predicate) {
        for (const item of this) {
            if (predicate(item)) {
                return item;
            }
        }
    }
    /**
     * Finds the last item that satisfies the specified predicate.
     * @param predicate Predicate to match items against.
     * @returns The first item that satisfied the predicate; otherwise `undefined`.
     */
    findLast(predicate) {
        let result = undefined;
        for (const item of this) {
            if (predicate(item)) {
                result = item;
            }
        }
        return result;
    }
    /**
     * Returns an iterator containing items transformed using the specified mapper function.
     * @param mapper Function responsible for transforming each item.
     * @returns An iterator of transformed items.
     */
    flatMap(mapper) {
        return new Enumerable(function* () {
            for (const item of this) {
                for (const mapped of mapper(item)) {
                    yield mapped;
                }
            }
        }.bind(this));
    }
    /**
     * Iterates over each item, and invokes the specified function.
     * @param fn Function to invoke against each item.
     */
    forEach(fn) {
        for (const item of this) {
            fn(item);
        }
    }
    /**
     * Determines whether the search item exists in the collection exists.
     * @param search Item to search for.
     * @returns `true` when the item was found; otherwise `false`.
     */
    includes(search) {
        return this.some((item) => item === search);
    }
    /**
     * Returns an iterator of mapped items using the mapper function.
     * @param mapper Function responsible for mapping the items.
     * @returns An iterator of mapped items.
     */
    map(mapper) {
        return new Enumerable(function* () {
            for (const item of this) {
                yield mapper(item);
            }
        }.bind(this));
    }
    /**
     * Captures the underlying iterable, if it is not already captured, and gets the next item in the iterator.
     * @param args Optional values to send to the generator.
     * @returns An iterator result of the current iteration; when `done` is `false`, the current `value` is provided.
     */
    next(...args) {
        this.#iterator ??= this.#items();
        const result = this.#iterator.next(...args);
        if (result.done) {
            this.#iterator = undefined;
        }
        return result;
    }
    /**
     * Applies the accumulator function to each item, and returns the result.
     * @param accumulator Function responsible for accumulating all items within the collection.
     * @param initial Initial value supplied to the accumulator.
     * @returns Result of accumulating each value.
     */
    reduce(accumulator, initial) {
        if (this.length === 0) {
            if (initial === undefined) {
                throw new TypeError("Reduce of empty enumerable with no initial value.");
            }
            return initial;
        }
        let result = initial;
        for (const item of this) {
            if (result === undefined) {
                result = item;
            }
            else {
                result = accumulator(result, item);
            }
        }
        return result;
    }
    /**
     * Acts as if a `return` statement is inserted in the generator's body at the current suspended position.
     *
     * Please note, in the context of an {@link Enumerable}, calling {@link Enumerable.return} will clear the captured iterator,
     * if there is one. Subsequent calls to {@link Enumerable.next} will result in re-capturing the underlying iterable, and
     * yielding items from the beginning.
     * @param value Value to return.
     * @returns The value as an iterator result.
     */
    return(value) {
        this.#iterator = undefined;
        return { done: true, value };
    }
    /**
     * Determines whether an item in the collection exists that satisfies the specified predicate.
     * @param predicate Function used to search for an item.
     * @returns `true` when the item was found; otherwise `false`.
     */
    some(predicate) {
        for (const item of this) {
            if (predicate(item)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Returns an iterator with the items, from 0, up to the specified limit.
     * @param limit Limit of items to take.
     * @returns An iterator of items from 0 to the limit.
     */
    take(limit) {
        if (isNaN(limit) || limit < 0) {
            throw new RangeError("limit must be 0, or a positive number");
        }
        return new Enumerable(function* () {
            let i = 0;
            for (const item of this) {
                if (i++ < limit) {
                    yield item;
                }
            }
        }.bind(this));
    }
    /**
     * Acts as if a `throw` statement is inserted in the generator's body at the current suspended position.
     * @param e Error to throw.
     */
    throw(e) {
        throw e;
    }
    /**
     * Converts this iterator to an array.
     * @returns The array of items from this iterator.
     */
    toArray() {
        return Array.from(this);
    }
    /**
     * Converts this iterator to serializable collection.
     * @returns The serializable collection of items.
     */
    toJSON() {
        return this.toArray();
    }
    /**
     * Converts this iterator to a string.
     * @returns The string.
     */
    toString() {
        return `${this.toArray()}`;
    }
}

// Polyfill, explicit resource management https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Symbol.dispose ??= Symbol("Symbol.dispose");

/**
 * Provides a wrapper around a value that is lazily instantiated.
 */
class Lazy {
    /**
     * Private backing field for {@link Lazy.value}.
     */
    #value = undefined;
    /**
     * Factory responsible for instantiating the value.
     */
    #valueFactory;
    /**
     * Initializes a new instance of the {@link Lazy} class.
     * @param valueFactory The factory responsible for instantiating the value.
     */
    constructor(valueFactory) {
        this.#valueFactory = valueFactory;
    }
    /**
     * Gets the value.
     * @returns The value.
     */
    get value() {
        if (this.#value === undefined) {
            this.#value = this.#valueFactory();
        }
        return this.#value;
    }
}

promisify(execFile$1);

promisify(execFile$1);

/**
 * Returns an object that contains a promise and two functions to resolve or reject it.
 * @returns The promise, and the resolve and reject functions.
 */
function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var bufferUtil$1 = {exports: {}};

const BINARY_TYPES$2 = ['nodebuffer', 'arraybuffer', 'fragments'];
const hasBlob$1 = typeof Blob !== 'undefined';

if (hasBlob$1) BINARY_TYPES$2.push('blob');

var constants = {
  BINARY_TYPES: BINARY_TYPES$2,
  CLOSE_TIMEOUT: 30000,
  EMPTY_BUFFER: Buffer.alloc(0),
  GUID: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
  hasBlob: hasBlob$1,
  kForOnEventAttribute: Symbol('kIsForOnEventAttribute'),
  kListener: Symbol('kListener'),
  kStatusCode: Symbol('status-code'),
  kWebSocket: Symbol('websocket'),
  NOOP: () => {}
};

var unmask$1;
var mask;

const { EMPTY_BUFFER: EMPTY_BUFFER$3 } = constants;

const FastBuffer$2 = Buffer[Symbol.species];

/**
 * Merges an array of buffers into a new buffer.
 *
 * @param {Buffer[]} list The array of buffers to concat
 * @param {Number} totalLength The total length of buffers in the list
 * @return {Buffer} The resulting buffer
 * @public
 */
function concat$1(list, totalLength) {
  if (list.length === 0) return EMPTY_BUFFER$3;
  if (list.length === 1) return list[0];

  const target = Buffer.allocUnsafe(totalLength);
  let offset = 0;

  for (let i = 0; i < list.length; i++) {
    const buf = list[i];
    target.set(buf, offset);
    offset += buf.length;
  }

  if (offset < totalLength) {
    return new FastBuffer$2(target.buffer, target.byteOffset, offset);
  }

  return target;
}

/**
 * Masks a buffer using the given mask.
 *
 * @param {Buffer} source The buffer to mask
 * @param {Buffer} mask The mask to use
 * @param {Buffer} output The buffer where to store the result
 * @param {Number} offset The offset at which to start writing
 * @param {Number} length The number of bytes to mask.
 * @public
 */
function _mask(source, mask, output, offset, length) {
  for (let i = 0; i < length; i++) {
    output[offset + i] = source[i] ^ mask[i & 3];
  }
}

/**
 * Unmasks a buffer using the given mask.
 *
 * @param {Buffer} buffer The buffer to unmask
 * @param {Buffer} mask The mask to use
 * @public
 */
function _unmask(buffer, mask) {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] ^= mask[i & 3];
  }
}

/**
 * Converts a buffer to an `ArrayBuffer`.
 *
 * @param {Buffer} buf The buffer to convert
 * @return {ArrayBuffer} Converted buffer
 * @public
 */
function toArrayBuffer$1(buf) {
  if (buf.length === buf.buffer.byteLength) {
    return buf.buffer;
  }

  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
}

/**
 * Converts `data` to a `Buffer`.
 *
 * @param {*} data The data to convert
 * @return {Buffer} The buffer
 * @throws {TypeError}
 * @public
 */
function toBuffer$2(data) {
  toBuffer$2.readOnly = true;

  if (Buffer.isBuffer(data)) return data;

  let buf;

  if (data instanceof ArrayBuffer) {
    buf = new FastBuffer$2(data);
  } else if (ArrayBuffer.isView(data)) {
    buf = new FastBuffer$2(data.buffer, data.byteOffset, data.byteLength);
  } else {
    buf = Buffer.from(data);
    toBuffer$2.readOnly = false;
  }

  return buf;
}

bufferUtil$1.exports = {
  concat: concat$1,
  mask: _mask,
  toArrayBuffer: toArrayBuffer$1,
  toBuffer: toBuffer$2,
  unmask: _unmask
};

/* istanbul ignore else  */
if (!process.env.WS_NO_BUFFER_UTIL) {
  try {
    const bufferUtil = require('bufferutil');

    mask = bufferUtil$1.exports.mask = function (source, mask, output, offset, length) {
      if (length < 48) _mask(source, mask, output, offset, length);
      else bufferUtil.mask(source, mask, output, offset, length);
    };

    unmask$1 = bufferUtil$1.exports.unmask = function (buffer, mask) {
      if (buffer.length < 32) _unmask(buffer, mask);
      else bufferUtil.unmask(buffer, mask);
    };
  } catch (e) {
    // Continue regardless of the error.
  }
}

var bufferUtilExports = bufferUtil$1.exports;

const kDone = Symbol('kDone');
const kRun = Symbol('kRun');

/**
 * A very simple job queue with adjustable concurrency. Adapted from
 * https://github.com/STRML/async-limiter
 */
let Limiter$1 = class Limiter {
  /**
   * Creates a new `Limiter`.
   *
   * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
   *     to run concurrently
   */
  constructor(concurrency) {
    this[kDone] = () => {
      this.pending--;
      this[kRun]();
    };
    this.concurrency = concurrency || Infinity;
    this.jobs = [];
    this.pending = 0;
  }

  /**
   * Adds a job to the queue.
   *
   * @param {Function} job The job to run
   * @public
   */
  add(job) {
    this.jobs.push(job);
    this[kRun]();
  }

  /**
   * Removes a job from the queue and runs it if possible.
   *
   * @private
   */
  [kRun]() {
    if (this.pending === this.concurrency) return;

    if (this.jobs.length) {
      const job = this.jobs.shift();

      this.pending++;
      job(this[kDone]);
    }
  }
};

var limiter = Limiter$1;

const zlib = require$$0;

const bufferUtil = bufferUtilExports;
const Limiter = limiter;
const { kStatusCode: kStatusCode$2 } = constants;

const FastBuffer$1 = Buffer[Symbol.species];
const TRAILER = Buffer.from([0x00, 0x00, 0xff, 0xff]);
const kPerMessageDeflate = Symbol('permessage-deflate');
const kTotalLength = Symbol('total-length');
const kCallback = Symbol('callback');
const kBuffers = Symbol('buffers');
const kError$1 = Symbol('error');

//
// We limit zlib concurrency, which prevents severe memory fragmentation
// as documented in https://github.com/nodejs/node/issues/8871#issuecomment-250915913
// and https://github.com/websockets/ws/issues/1202
//
// Intentionally global; it's the global thread pool that's an issue.
//
let zlibLimiter;

/**
 * permessage-deflate implementation.
 */
let PerMessageDeflate$3 = class PerMessageDeflate {
  /**
   * Creates a PerMessageDeflate instance.
   *
   * @param {Object} [options] Configuration options
   * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
   *     for, or request, a custom client window size
   * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
   *     acknowledge disabling of client context takeover
   * @param {Number} [options.concurrencyLimit=10] The number of concurrent
   *     calls to zlib
   * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
   *     use of a custom server window size
   * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
   *     disabling of server context takeover
   * @param {Number} [options.threshold=1024] Size (in bytes) below which
   *     messages should not be compressed if context takeover is disabled
   * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
   *     deflate
   * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
   *     inflate
   * @param {Boolean} [isServer=false] Create the instance in either server or
   *     client mode
   * @param {Number} [maxPayload=0] The maximum allowed message length
   */
  constructor(options, isServer, maxPayload) {
    this._maxPayload = maxPayload | 0;
    this._options = options || {};
    this._threshold =
      this._options.threshold !== undefined ? this._options.threshold : 1024;
    this._isServer = !!isServer;
    this._deflate = null;
    this._inflate = null;

    this.params = null;

    if (!zlibLimiter) {
      const concurrency =
        this._options.concurrencyLimit !== undefined
          ? this._options.concurrencyLimit
          : 10;
      zlibLimiter = new Limiter(concurrency);
    }
  }

  /**
   * @type {String}
   */
  static get extensionName() {
    return 'permessage-deflate';
  }

  /**
   * Create an extension negotiation offer.
   *
   * @return {Object} Extension parameters
   * @public
   */
  offer() {
    const params = {};

    if (this._options.serverNoContextTakeover) {
      params.server_no_context_takeover = true;
    }
    if (this._options.clientNoContextTakeover) {
      params.client_no_context_takeover = true;
    }
    if (this._options.serverMaxWindowBits) {
      params.server_max_window_bits = this._options.serverMaxWindowBits;
    }
    if (this._options.clientMaxWindowBits) {
      params.client_max_window_bits = this._options.clientMaxWindowBits;
    } else if (this._options.clientMaxWindowBits == null) {
      params.client_max_window_bits = true;
    }

    return params;
  }

  /**
   * Accept an extension negotiation offer/response.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Object} Accepted configuration
   * @public
   */
  accept(configurations) {
    configurations = this.normalizeParams(configurations);

    this.params = this._isServer
      ? this.acceptAsServer(configurations)
      : this.acceptAsClient(configurations);

    return this.params;
  }

  /**
   * Releases all resources used by the extension.
   *
   * @public
   */
  cleanup() {
    if (this._inflate) {
      this._inflate.close();
      this._inflate = null;
    }

    if (this._deflate) {
      const callback = this._deflate[kCallback];

      this._deflate.close();
      this._deflate = null;

      if (callback) {
        callback(
          new Error(
            'The deflate stream was closed while data was being processed'
          )
        );
      }
    }
  }

  /**
   *  Accept an extension negotiation offer.
   *
   * @param {Array} offers The extension negotiation offers
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsServer(offers) {
    const opts = this._options;
    const accepted = offers.find((params) => {
      if (
        (opts.serverNoContextTakeover === false &&
          params.server_no_context_takeover) ||
        (params.server_max_window_bits &&
          (opts.serverMaxWindowBits === false ||
            (typeof opts.serverMaxWindowBits === 'number' &&
              opts.serverMaxWindowBits > params.server_max_window_bits))) ||
        (typeof opts.clientMaxWindowBits === 'number' &&
          !params.client_max_window_bits)
      ) {
        return false;
      }

      return true;
    });

    if (!accepted) {
      throw new Error('None of the extension offers can be accepted');
    }

    if (opts.serverNoContextTakeover) {
      accepted.server_no_context_takeover = true;
    }
    if (opts.clientNoContextTakeover) {
      accepted.client_no_context_takeover = true;
    }
    if (typeof opts.serverMaxWindowBits === 'number') {
      accepted.server_max_window_bits = opts.serverMaxWindowBits;
    }
    if (typeof opts.clientMaxWindowBits === 'number') {
      accepted.client_max_window_bits = opts.clientMaxWindowBits;
    } else if (
      accepted.client_max_window_bits === true ||
      opts.clientMaxWindowBits === false
    ) {
      delete accepted.client_max_window_bits;
    }

    return accepted;
  }

  /**
   * Accept the extension negotiation response.
   *
   * @param {Array} response The extension negotiation response
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsClient(response) {
    const params = response[0];

    if (
      this._options.clientNoContextTakeover === false &&
      params.client_no_context_takeover
    ) {
      throw new Error('Unexpected parameter "client_no_context_takeover"');
    }

    if (!params.client_max_window_bits) {
      if (typeof this._options.clientMaxWindowBits === 'number') {
        params.client_max_window_bits = this._options.clientMaxWindowBits;
      }
    } else if (
      this._options.clientMaxWindowBits === false ||
      (typeof this._options.clientMaxWindowBits === 'number' &&
        params.client_max_window_bits > this._options.clientMaxWindowBits)
    ) {
      throw new Error(
        'Unexpected or invalid parameter "client_max_window_bits"'
      );
    }

    return params;
  }

  /**
   * Normalize parameters.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Array} The offers/response with normalized parameters
   * @private
   */
  normalizeParams(configurations) {
    configurations.forEach((params) => {
      Object.keys(params).forEach((key) => {
        let value = params[key];

        if (value.length > 1) {
          throw new Error(`Parameter "${key}" must have only a single value`);
        }

        value = value[0];

        if (key === 'client_max_window_bits') {
          if (value !== true) {
            const num = +value;
            if (!Number.isInteger(num) || num < 8 || num > 15) {
              throw new TypeError(
                `Invalid value for parameter "${key}": ${value}`
              );
            }
            value = num;
          } else if (!this._isServer) {
            throw new TypeError(
              `Invalid value for parameter "${key}": ${value}`
            );
          }
        } else if (key === 'server_max_window_bits') {
          const num = +value;
          if (!Number.isInteger(num) || num < 8 || num > 15) {
            throw new TypeError(
              `Invalid value for parameter "${key}": ${value}`
            );
          }
          value = num;
        } else if (
          key === 'client_no_context_takeover' ||
          key === 'server_no_context_takeover'
        ) {
          if (value !== true) {
            throw new TypeError(
              `Invalid value for parameter "${key}": ${value}`
            );
          }
        } else {
          throw new Error(`Unknown parameter "${key}"`);
        }

        params[key] = value;
      });
    });

    return configurations;
  }

  /**
   * Decompress data. Concurrency limited.
   *
   * @param {Buffer} data Compressed data
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @public
   */
  decompress(data, fin, callback) {
    zlibLimiter.add((done) => {
      this._decompress(data, fin, (err, result) => {
        done();
        callback(err, result);
      });
    });
  }

  /**
   * Compress data. Concurrency limited.
   *
   * @param {(Buffer|String)} data Data to compress
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @public
   */
  compress(data, fin, callback) {
    zlibLimiter.add((done) => {
      this._compress(data, fin, (err, result) => {
        done();
        callback(err, result);
      });
    });
  }

  /**
   * Decompress data.
   *
   * @param {Buffer} data Compressed data
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @private
   */
  _decompress(data, fin, callback) {
    const endpoint = this._isServer ? 'client' : 'server';

    if (!this._inflate) {
      const key = `${endpoint}_max_window_bits`;
      const windowBits =
        typeof this.params[key] !== 'number'
          ? zlib.Z_DEFAULT_WINDOWBITS
          : this.params[key];

      this._inflate = zlib.createInflateRaw({
        ...this._options.zlibInflateOptions,
        windowBits
      });
      this._inflate[kPerMessageDeflate] = this;
      this._inflate[kTotalLength] = 0;
      this._inflate[kBuffers] = [];
      this._inflate.on('error', inflateOnError);
      this._inflate.on('data', inflateOnData);
    }

    this._inflate[kCallback] = callback;

    this._inflate.write(data);
    if (fin) this._inflate.write(TRAILER);

    this._inflate.flush(() => {
      const err = this._inflate[kError$1];

      if (err) {
        this._inflate.close();
        this._inflate = null;
        callback(err);
        return;
      }

      const data = bufferUtil.concat(
        this._inflate[kBuffers],
        this._inflate[kTotalLength]
      );

      if (this._inflate._readableState.endEmitted) {
        this._inflate.close();
        this._inflate = null;
      } else {
        this._inflate[kTotalLength] = 0;
        this._inflate[kBuffers] = [];

        if (fin && this.params[`${endpoint}_no_context_takeover`]) {
          this._inflate.reset();
        }
      }

      callback(null, data);
    });
  }

  /**
   * Compress data.
   *
   * @param {(Buffer|String)} data Data to compress
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @private
   */
  _compress(data, fin, callback) {
    const endpoint = this._isServer ? 'server' : 'client';

    if (!this._deflate) {
      const key = `${endpoint}_max_window_bits`;
      const windowBits =
        typeof this.params[key] !== 'number'
          ? zlib.Z_DEFAULT_WINDOWBITS
          : this.params[key];

      this._deflate = zlib.createDeflateRaw({
        ...this._options.zlibDeflateOptions,
        windowBits
      });

      this._deflate[kTotalLength] = 0;
      this._deflate[kBuffers] = [];

      this._deflate.on('data', deflateOnData);
    }

    this._deflate[kCallback] = callback;

    this._deflate.write(data);
    this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
      if (!this._deflate) {
        //
        // The deflate stream was closed while data was being processed.
        //
        return;
      }

      let data = bufferUtil.concat(
        this._deflate[kBuffers],
        this._deflate[kTotalLength]
      );

      if (fin) {
        data = new FastBuffer$1(data.buffer, data.byteOffset, data.length - 4);
      }

      //
      // Ensure that the callback will not be called again in
      // `PerMessageDeflate#cleanup()`.
      //
      this._deflate[kCallback] = null;

      this._deflate[kTotalLength] = 0;
      this._deflate[kBuffers] = [];

      if (fin && this.params[`${endpoint}_no_context_takeover`]) {
        this._deflate.reset();
      }

      callback(null, data);
    });
  }
};

var permessageDeflate = PerMessageDeflate$3;

/**
 * The listener of the `zlib.DeflateRaw` stream `'data'` event.
 *
 * @param {Buffer} chunk A chunk of data
 * @private
 */
function deflateOnData(chunk) {
  this[kBuffers].push(chunk);
  this[kTotalLength] += chunk.length;
}

/**
 * The listener of the `zlib.InflateRaw` stream `'data'` event.
 *
 * @param {Buffer} chunk A chunk of data
 * @private
 */
function inflateOnData(chunk) {
  this[kTotalLength] += chunk.length;

  if (
    this[kPerMessageDeflate]._maxPayload < 1 ||
    this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload
  ) {
    this[kBuffers].push(chunk);
    return;
  }

  this[kError$1] = new RangeError('Max payload size exceeded');
  this[kError$1].code = 'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH';
  this[kError$1][kStatusCode$2] = 1009;
  this.removeListener('data', inflateOnData);

  //
  // The choice to employ `zlib.reset()` over `zlib.close()` is dictated by the
  // fact that in Node.js versions prior to 13.10.0, the callback for
  // `zlib.flush()` is not called if `zlib.close()` is used. Utilizing
  // `zlib.reset()` ensures that either the callback is invoked or an error is
  // emitted.
  //
  this.reset();
}

/**
 * The listener of the `zlib.InflateRaw` stream `'error'` event.
 *
 * @param {Error} err The emitted error
 * @private
 */
function inflateOnError(err) {
  //
  // There is no need to call `Zlib#close()` as the handle is automatically
  // closed when an error is emitted.
  //
  this[kPerMessageDeflate]._inflate = null;

  if (this[kError$1]) {
    this[kCallback](this[kError$1]);
    return;
  }

  err[kStatusCode$2] = 1007;
  this[kCallback](err);
}

var validation = {exports: {}};

var isValidUTF8_1;

const { isUtf8 } = require$$0$1;

const { hasBlob } = constants;

//
// Allowed token characters:
//
// '!', '#', '$', '%', '&', ''', '*', '+', '-',
// '.', 0-9, A-Z, '^', '_', '`', a-z, '|', '~'
//
// tokenChars[32] === 0 // ' '
// tokenChars[33] === 1 // '!'
// tokenChars[34] === 0 // '"'
// ...
//
// prettier-ignore
const tokenChars$2 = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0 - 15
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 16 - 31
  0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, // 32 - 47
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, // 48 - 63
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 64 - 79
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, // 80 - 95
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 96 - 111
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0 // 112 - 127
];

/**
 * Checks if a status code is allowed in a close frame.
 *
 * @param {Number} code The status code
 * @return {Boolean} `true` if the status code is valid, else `false`
 * @public
 */
function isValidStatusCode$2(code) {
  return (
    (code >= 1000 &&
      code <= 1014 &&
      code !== 1004 &&
      code !== 1005 &&
      code !== 1006) ||
    (code >= 3000 && code <= 4999)
  );
}

/**
 * Checks if a given buffer contains only correct UTF-8.
 * Ported from https://www.cl.cam.ac.uk/%7Emgk25/ucs/utf8_check.c by
 * Markus Kuhn.
 *
 * @param {Buffer} buf The buffer to check
 * @return {Boolean} `true` if `buf` contains only correct UTF-8, else `false`
 * @public
 */
function _isValidUTF8(buf) {
  const len = buf.length;
  let i = 0;

  while (i < len) {
    if ((buf[i] & 0x80) === 0) {
      // 0xxxxxxx
      i++;
    } else if ((buf[i] & 0xe0) === 0xc0) {
      // 110xxxxx 10xxxxxx
      if (
        i + 1 === len ||
        (buf[i + 1] & 0xc0) !== 0x80 ||
        (buf[i] & 0xfe) === 0xc0 // Overlong
      ) {
        return false;
      }

      i += 2;
    } else if ((buf[i] & 0xf0) === 0xe0) {
      // 1110xxxx 10xxxxxx 10xxxxxx
      if (
        i + 2 >= len ||
        (buf[i + 1] & 0xc0) !== 0x80 ||
        (buf[i + 2] & 0xc0) !== 0x80 ||
        (buf[i] === 0xe0 && (buf[i + 1] & 0xe0) === 0x80) || // Overlong
        (buf[i] === 0xed && (buf[i + 1] & 0xe0) === 0xa0) // Surrogate (U+D800 - U+DFFF)
      ) {
        return false;
      }

      i += 3;
    } else if ((buf[i] & 0xf8) === 0xf0) {
      // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
      if (
        i + 3 >= len ||
        (buf[i + 1] & 0xc0) !== 0x80 ||
        (buf[i + 2] & 0xc0) !== 0x80 ||
        (buf[i + 3] & 0xc0) !== 0x80 ||
        (buf[i] === 0xf0 && (buf[i + 1] & 0xf0) === 0x80) || // Overlong
        (buf[i] === 0xf4 && buf[i + 1] > 0x8f) ||
        buf[i] > 0xf4 // > U+10FFFF
      ) {
        return false;
      }

      i += 4;
    } else {
      return false;
    }
  }

  return true;
}

/**
 * Determines whether a value is a `Blob`.
 *
 * @param {*} value The value to be tested
 * @return {Boolean} `true` if `value` is a `Blob`, else `false`
 * @private
 */
function isBlob$2(value) {
  return (
    hasBlob &&
    typeof value === 'object' &&
    typeof value.arrayBuffer === 'function' &&
    typeof value.type === 'string' &&
    typeof value.stream === 'function' &&
    (value[Symbol.toStringTag] === 'Blob' ||
      value[Symbol.toStringTag] === 'File')
  );
}

validation.exports = {
  isBlob: isBlob$2,
  isValidStatusCode: isValidStatusCode$2,
  isValidUTF8: _isValidUTF8,
  tokenChars: tokenChars$2
};

if (isUtf8) {
  isValidUTF8_1 = validation.exports.isValidUTF8 = function (buf) {
    return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
  };
} /* istanbul ignore else  */ else if (!process.env.WS_NO_UTF_8_VALIDATE) {
  try {
    const isValidUTF8 = require('utf-8-validate');

    isValidUTF8_1 = validation.exports.isValidUTF8 = function (buf) {
      return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
    };
  } catch (e) {
    // Continue regardless of the error.
  }
}

var validationExports = validation.exports;

const { Writable } = require$$0$2;

const PerMessageDeflate$2 = permessageDeflate;
const {
  BINARY_TYPES: BINARY_TYPES$1,
  EMPTY_BUFFER: EMPTY_BUFFER$2,
  kStatusCode: kStatusCode$1,
  kWebSocket: kWebSocket$3
} = constants;
const { concat, toArrayBuffer, unmask } = bufferUtilExports;
const { isValidStatusCode: isValidStatusCode$1, isValidUTF8 } = validationExports;

const FastBuffer = Buffer[Symbol.species];

const GET_INFO = 0;
const GET_PAYLOAD_LENGTH_16 = 1;
const GET_PAYLOAD_LENGTH_64 = 2;
const GET_MASK = 3;
const GET_DATA = 4;
const INFLATING = 5;
const DEFER_EVENT = 6;

/**
 * HyBi Receiver implementation.
 *
 * @extends Writable
 */
let Receiver$1 = class Receiver extends Writable {
  /**
   * Creates a Receiver instance.
   *
   * @param {Object} [options] Options object
   * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
   *     multiple times in the same tick
   * @param {String} [options.binaryType=nodebuffer] The type for binary data
   * @param {Object} [options.extensions] An object containing the negotiated
   *     extensions
   * @param {Boolean} [options.isServer=false] Specifies whether to operate in
   *     client or server mode
   * @param {Number} [options.maxPayload=0] The maximum allowed message length
   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   */
  constructor(options = {}) {
    super();

    this._allowSynchronousEvents =
      options.allowSynchronousEvents !== undefined
        ? options.allowSynchronousEvents
        : true;
    this._binaryType = options.binaryType || BINARY_TYPES$1[0];
    this._extensions = options.extensions || {};
    this._isServer = !!options.isServer;
    this._maxPayload = options.maxPayload | 0;
    this._skipUTF8Validation = !!options.skipUTF8Validation;
    this[kWebSocket$3] = undefined;

    this._bufferedBytes = 0;
    this._buffers = [];

    this._compressed = false;
    this._payloadLength = 0;
    this._mask = undefined;
    this._fragmented = 0;
    this._masked = false;
    this._fin = false;
    this._opcode = 0;

    this._totalPayloadLength = 0;
    this._messageLength = 0;
    this._fragments = [];

    this._errored = false;
    this._loop = false;
    this._state = GET_INFO;
  }

  /**
   * Implements `Writable.prototype._write()`.
   *
   * @param {Buffer} chunk The chunk of data to write
   * @param {String} encoding The character encoding of `chunk`
   * @param {Function} cb Callback
   * @private
   */
  _write(chunk, encoding, cb) {
    if (this._opcode === 0x08 && this._state == GET_INFO) return cb();

    this._bufferedBytes += chunk.length;
    this._buffers.push(chunk);
    this.startLoop(cb);
  }

  /**
   * Consumes `n` bytes from the buffered data.
   *
   * @param {Number} n The number of bytes to consume
   * @return {Buffer} The consumed bytes
   * @private
   */
  consume(n) {
    this._bufferedBytes -= n;

    if (n === this._buffers[0].length) return this._buffers.shift();

    if (n < this._buffers[0].length) {
      const buf = this._buffers[0];
      this._buffers[0] = new FastBuffer(
        buf.buffer,
        buf.byteOffset + n,
        buf.length - n
      );

      return new FastBuffer(buf.buffer, buf.byteOffset, n);
    }

    const dst = Buffer.allocUnsafe(n);

    do {
      const buf = this._buffers[0];
      const offset = dst.length - n;

      if (n >= buf.length) {
        dst.set(this._buffers.shift(), offset);
      } else {
        dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
        this._buffers[0] = new FastBuffer(
          buf.buffer,
          buf.byteOffset + n,
          buf.length - n
        );
      }

      n -= buf.length;
    } while (n > 0);

    return dst;
  }

  /**
   * Starts the parsing loop.
   *
   * @param {Function} cb Callback
   * @private
   */
  startLoop(cb) {
    this._loop = true;

    do {
      switch (this._state) {
        case GET_INFO:
          this.getInfo(cb);
          break;
        case GET_PAYLOAD_LENGTH_16:
          this.getPayloadLength16(cb);
          break;
        case GET_PAYLOAD_LENGTH_64:
          this.getPayloadLength64(cb);
          break;
        case GET_MASK:
          this.getMask();
          break;
        case GET_DATA:
          this.getData(cb);
          break;
        case INFLATING:
        case DEFER_EVENT:
          this._loop = false;
          return;
      }
    } while (this._loop);

    if (!this._errored) cb();
  }

  /**
   * Reads the first two bytes of a frame.
   *
   * @param {Function} cb Callback
   * @private
   */
  getInfo(cb) {
    if (this._bufferedBytes < 2) {
      this._loop = false;
      return;
    }

    const buf = this.consume(2);

    if ((buf[0] & 0x30) !== 0x00) {
      const error = this.createError(
        RangeError,
        'RSV2 and RSV3 must be clear',
        true,
        1002,
        'WS_ERR_UNEXPECTED_RSV_2_3'
      );

      cb(error);
      return;
    }

    const compressed = (buf[0] & 0x40) === 0x40;

    if (compressed && !this._extensions[PerMessageDeflate$2.extensionName]) {
      const error = this.createError(
        RangeError,
        'RSV1 must be clear',
        true,
        1002,
        'WS_ERR_UNEXPECTED_RSV_1'
      );

      cb(error);
      return;
    }

    this._fin = (buf[0] & 0x80) === 0x80;
    this._opcode = buf[0] & 0x0f;
    this._payloadLength = buf[1] & 0x7f;

    if (this._opcode === 0x00) {
      if (compressed) {
        const error = this.createError(
          RangeError,
          'RSV1 must be clear',
          true,
          1002,
          'WS_ERR_UNEXPECTED_RSV_1'
        );

        cb(error);
        return;
      }

      if (!this._fragmented) {
        const error = this.createError(
          RangeError,
          'invalid opcode 0',
          true,
          1002,
          'WS_ERR_INVALID_OPCODE'
        );

        cb(error);
        return;
      }

      this._opcode = this._fragmented;
    } else if (this._opcode === 0x01 || this._opcode === 0x02) {
      if (this._fragmented) {
        const error = this.createError(
          RangeError,
          `invalid opcode ${this._opcode}`,
          true,
          1002,
          'WS_ERR_INVALID_OPCODE'
        );

        cb(error);
        return;
      }

      this._compressed = compressed;
    } else if (this._opcode > 0x07 && this._opcode < 0x0b) {
      if (!this._fin) {
        const error = this.createError(
          RangeError,
          'FIN must be set',
          true,
          1002,
          'WS_ERR_EXPECTED_FIN'
        );

        cb(error);
        return;
      }

      if (compressed) {
        const error = this.createError(
          RangeError,
          'RSV1 must be clear',
          true,
          1002,
          'WS_ERR_UNEXPECTED_RSV_1'
        );

        cb(error);
        return;
      }

      if (
        this._payloadLength > 0x7d ||
        (this._opcode === 0x08 && this._payloadLength === 1)
      ) {
        const error = this.createError(
          RangeError,
          `invalid payload length ${this._payloadLength}`,
          true,
          1002,
          'WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH'
        );

        cb(error);
        return;
      }
    } else {
      const error = this.createError(
        RangeError,
        `invalid opcode ${this._opcode}`,
        true,
        1002,
        'WS_ERR_INVALID_OPCODE'
      );

      cb(error);
      return;
    }

    if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
    this._masked = (buf[1] & 0x80) === 0x80;

    if (this._isServer) {
      if (!this._masked) {
        const error = this.createError(
          RangeError,
          'MASK must be set',
          true,
          1002,
          'WS_ERR_EXPECTED_MASK'
        );

        cb(error);
        return;
      }
    } else if (this._masked) {
      const error = this.createError(
        RangeError,
        'MASK must be clear',
        true,
        1002,
        'WS_ERR_UNEXPECTED_MASK'
      );

      cb(error);
      return;
    }

    if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
    else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
    else this.haveLength(cb);
  }

  /**
   * Gets extended payload length (7+16).
   *
   * @param {Function} cb Callback
   * @private
   */
  getPayloadLength16(cb) {
    if (this._bufferedBytes < 2) {
      this._loop = false;
      return;
    }

    this._payloadLength = this.consume(2).readUInt16BE(0);
    this.haveLength(cb);
  }

  /**
   * Gets extended payload length (7+64).
   *
   * @param {Function} cb Callback
   * @private
   */
  getPayloadLength64(cb) {
    if (this._bufferedBytes < 8) {
      this._loop = false;
      return;
    }

    const buf = this.consume(8);
    const num = buf.readUInt32BE(0);

    //
    // The maximum safe integer in JavaScript is 2^53 - 1. An error is returned
    // if payload length is greater than this number.
    //
    if (num > Math.pow(2, 53 - 32) - 1) {
      const error = this.createError(
        RangeError,
        'Unsupported WebSocket frame: payload length > 2^53 - 1',
        false,
        1009,
        'WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH'
      );

      cb(error);
      return;
    }

    this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
    this.haveLength(cb);
  }

  /**
   * Payload length has been read.
   *
   * @param {Function} cb Callback
   * @private
   */
  haveLength(cb) {
    if (this._payloadLength && this._opcode < 0x08) {
      this._totalPayloadLength += this._payloadLength;
      if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
        const error = this.createError(
          RangeError,
          'Max payload size exceeded',
          false,
          1009,
          'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH'
        );

        cb(error);
        return;
      }
    }

    if (this._masked) this._state = GET_MASK;
    else this._state = GET_DATA;
  }

  /**
   * Reads mask bytes.
   *
   * @private
   */
  getMask() {
    if (this._bufferedBytes < 4) {
      this._loop = false;
      return;
    }

    this._mask = this.consume(4);
    this._state = GET_DATA;
  }

  /**
   * Reads data bytes.
   *
   * @param {Function} cb Callback
   * @private
   */
  getData(cb) {
    let data = EMPTY_BUFFER$2;

    if (this._payloadLength) {
      if (this._bufferedBytes < this._payloadLength) {
        this._loop = false;
        return;
      }

      data = this.consume(this._payloadLength);

      if (
        this._masked &&
        (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0
      ) {
        unmask(data, this._mask);
      }
    }

    if (this._opcode > 0x07) {
      this.controlMessage(data, cb);
      return;
    }

    if (this._compressed) {
      this._state = INFLATING;
      this.decompress(data, cb);
      return;
    }

    if (data.length) {
      //
      // This message is not compressed so its length is the sum of the payload
      // length of all fragments.
      //
      this._messageLength = this._totalPayloadLength;
      this._fragments.push(data);
    }

    this.dataMessage(cb);
  }

  /**
   * Decompresses data.
   *
   * @param {Buffer} data Compressed data
   * @param {Function} cb Callback
   * @private
   */
  decompress(data, cb) {
    const perMessageDeflate = this._extensions[PerMessageDeflate$2.extensionName];

    perMessageDeflate.decompress(data, this._fin, (err, buf) => {
      if (err) return cb(err);

      if (buf.length) {
        this._messageLength += buf.length;
        if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
          const error = this.createError(
            RangeError,
            'Max payload size exceeded',
            false,
            1009,
            'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH'
          );

          cb(error);
          return;
        }

        this._fragments.push(buf);
      }

      this.dataMessage(cb);
      if (this._state === GET_INFO) this.startLoop(cb);
    });
  }

  /**
   * Handles a data message.
   *
   * @param {Function} cb Callback
   * @private
   */
  dataMessage(cb) {
    if (!this._fin) {
      this._state = GET_INFO;
      return;
    }

    const messageLength = this._messageLength;
    const fragments = this._fragments;

    this._totalPayloadLength = 0;
    this._messageLength = 0;
    this._fragmented = 0;
    this._fragments = [];

    if (this._opcode === 2) {
      let data;

      if (this._binaryType === 'nodebuffer') {
        data = concat(fragments, messageLength);
      } else if (this._binaryType === 'arraybuffer') {
        data = toArrayBuffer(concat(fragments, messageLength));
      } else if (this._binaryType === 'blob') {
        data = new Blob(fragments);
      } else {
        data = fragments;
      }

      if (this._allowSynchronousEvents) {
        this.emit('message', data, true);
        this._state = GET_INFO;
      } else {
        this._state = DEFER_EVENT;
        setImmediate(() => {
          this.emit('message', data, true);
          this._state = GET_INFO;
          this.startLoop(cb);
        });
      }
    } else {
      const buf = concat(fragments, messageLength);

      if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
        const error = this.createError(
          Error,
          'invalid UTF-8 sequence',
          true,
          1007,
          'WS_ERR_INVALID_UTF8'
        );

        cb(error);
        return;
      }

      if (this._state === INFLATING || this._allowSynchronousEvents) {
        this.emit('message', buf, false);
        this._state = GET_INFO;
      } else {
        this._state = DEFER_EVENT;
        setImmediate(() => {
          this.emit('message', buf, false);
          this._state = GET_INFO;
          this.startLoop(cb);
        });
      }
    }
  }

  /**
   * Handles a control message.
   *
   * @param {Buffer} data Data to handle
   * @return {(Error|RangeError|undefined)} A possible error
   * @private
   */
  controlMessage(data, cb) {
    if (this._opcode === 0x08) {
      if (data.length === 0) {
        this._loop = false;
        this.emit('conclude', 1005, EMPTY_BUFFER$2);
        this.end();
      } else {
        const code = data.readUInt16BE(0);

        if (!isValidStatusCode$1(code)) {
          const error = this.createError(
            RangeError,
            `invalid status code ${code}`,
            true,
            1002,
            'WS_ERR_INVALID_CLOSE_CODE'
          );

          cb(error);
          return;
        }

        const buf = new FastBuffer(
          data.buffer,
          data.byteOffset + 2,
          data.length - 2
        );

        if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
          const error = this.createError(
            Error,
            'invalid UTF-8 sequence',
            true,
            1007,
            'WS_ERR_INVALID_UTF8'
          );

          cb(error);
          return;
        }

        this._loop = false;
        this.emit('conclude', code, buf);
        this.end();
      }

      this._state = GET_INFO;
      return;
    }

    if (this._allowSynchronousEvents) {
      this.emit(this._opcode === 0x09 ? 'ping' : 'pong', data);
      this._state = GET_INFO;
    } else {
      this._state = DEFER_EVENT;
      setImmediate(() => {
        this.emit(this._opcode === 0x09 ? 'ping' : 'pong', data);
        this._state = GET_INFO;
        this.startLoop(cb);
      });
    }
  }

  /**
   * Builds an error object.
   *
   * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
   * @param {String} message The error message
   * @param {Boolean} prefix Specifies whether or not to add a default prefix to
   *     `message`
   * @param {Number} statusCode The status code
   * @param {String} errorCode The exposed error code
   * @return {(Error|RangeError)} The error
   * @private
   */
  createError(ErrorCtor, message, prefix, statusCode, errorCode) {
    this._loop = false;
    this._errored = true;

    const err = new ErrorCtor(
      prefix ? `Invalid WebSocket frame: ${message}` : message
    );

    Error.captureStackTrace(err, this.createError);
    err.code = errorCode;
    err[kStatusCode$1] = statusCode;
    return err;
  }
};

var receiver = Receiver$1;

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Duplex" }] */

const { Duplex: Duplex$3 } = require$$0$2;
const { randomFillSync } = require$$1;

const PerMessageDeflate$1 = permessageDeflate;
const { EMPTY_BUFFER: EMPTY_BUFFER$1, kWebSocket: kWebSocket$2, NOOP: NOOP$1 } = constants;
const { isBlob: isBlob$1, isValidStatusCode } = validationExports;
const { mask: applyMask, toBuffer: toBuffer$1 } = bufferUtilExports;

const kByteLength = Symbol('kByteLength');
const maskBuffer = Buffer.alloc(4);
const RANDOM_POOL_SIZE = 8 * 1024;
let randomPool;
let randomPoolPointer = RANDOM_POOL_SIZE;

const DEFAULT = 0;
const DEFLATING = 1;
const GET_BLOB_DATA = 2;

/**
 * HyBi Sender implementation.
 */
let Sender$1 = class Sender {
  /**
   * Creates a Sender instance.
   *
   * @param {Duplex} socket The connection socket
   * @param {Object} [extensions] An object containing the negotiated extensions
   * @param {Function} [generateMask] The function used to generate the masking
   *     key
   */
  constructor(socket, extensions, generateMask) {
    this._extensions = extensions || {};

    if (generateMask) {
      this._generateMask = generateMask;
      this._maskBuffer = Buffer.alloc(4);
    }

    this._socket = socket;

    this._firstFragment = true;
    this._compress = false;

    this._bufferedBytes = 0;
    this._queue = [];
    this._state = DEFAULT;
    this.onerror = NOOP$1;
    this[kWebSocket$2] = undefined;
  }

  /**
   * Frames a piece of data according to the HyBi WebSocket protocol.
   *
   * @param {(Buffer|String)} data The data to frame
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @return {(Buffer|String)[]} The framed data
   * @public
   */
  static frame(data, options) {
    let mask;
    let merge = false;
    let offset = 2;
    let skipMasking = false;

    if (options.mask) {
      mask = options.maskBuffer || maskBuffer;

      if (options.generateMask) {
        options.generateMask(mask);
      } else {
        if (randomPoolPointer === RANDOM_POOL_SIZE) {
          /* istanbul ignore else  */
          if (randomPool === undefined) {
            //
            // This is lazily initialized because server-sent frames must not
            // be masked so it may never be used.
            //
            randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
          }

          randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
          randomPoolPointer = 0;
        }

        mask[0] = randomPool[randomPoolPointer++];
        mask[1] = randomPool[randomPoolPointer++];
        mask[2] = randomPool[randomPoolPointer++];
        mask[3] = randomPool[randomPoolPointer++];
      }

      skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
      offset = 6;
    }

    let dataLength;

    if (typeof data === 'string') {
      if (
        (!options.mask || skipMasking) &&
        options[kByteLength] !== undefined
      ) {
        dataLength = options[kByteLength];
      } else {
        data = Buffer.from(data);
        dataLength = data.length;
      }
    } else {
      dataLength = data.length;
      merge = options.mask && options.readOnly && !skipMasking;
    }

    let payloadLength = dataLength;

    if (dataLength >= 65536) {
      offset += 8;
      payloadLength = 127;
    } else if (dataLength > 125) {
      offset += 2;
      payloadLength = 126;
    }

    const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);

    target[0] = options.fin ? options.opcode | 0x80 : options.opcode;
    if (options.rsv1) target[0] |= 0x40;

    target[1] = payloadLength;

    if (payloadLength === 126) {
      target.writeUInt16BE(dataLength, 2);
    } else if (payloadLength === 127) {
      target[2] = target[3] = 0;
      target.writeUIntBE(dataLength, 4, 6);
    }

    if (!options.mask) return [target, data];

    target[1] |= 0x80;
    target[offset - 4] = mask[0];
    target[offset - 3] = mask[1];
    target[offset - 2] = mask[2];
    target[offset - 1] = mask[3];

    if (skipMasking) return [target, data];

    if (merge) {
      applyMask(data, mask, target, offset, dataLength);
      return [target];
    }

    applyMask(data, mask, data, 0, dataLength);
    return [target, data];
  }

  /**
   * Sends a close message to the other peer.
   *
   * @param {Number} [code] The status code component of the body
   * @param {(String|Buffer)} [data] The message component of the body
   * @param {Boolean} [mask=false] Specifies whether or not to mask the message
   * @param {Function} [cb] Callback
   * @public
   */
  close(code, data, mask, cb) {
    let buf;

    if (code === undefined) {
      buf = EMPTY_BUFFER$1;
    } else if (typeof code !== 'number' || !isValidStatusCode(code)) {
      throw new TypeError('First argument must be a valid error code number');
    } else if (data === undefined || !data.length) {
      buf = Buffer.allocUnsafe(2);
      buf.writeUInt16BE(code, 0);
    } else {
      const length = Buffer.byteLength(data);

      if (length > 123) {
        throw new RangeError('The message must not be greater than 123 bytes');
      }

      buf = Buffer.allocUnsafe(2 + length);
      buf.writeUInt16BE(code, 0);

      if (typeof data === 'string') {
        buf.write(data, 2);
      } else {
        buf.set(data, 2);
      }
    }

    const options = {
      [kByteLength]: buf.length,
      fin: true,
      generateMask: this._generateMask,
      mask,
      maskBuffer: this._maskBuffer,
      opcode: 0x08,
      readOnly: false,
      rsv1: false
    };

    if (this._state !== DEFAULT) {
      this.enqueue([this.dispatch, buf, false, options, cb]);
    } else {
      this.sendFrame(Sender.frame(buf, options), cb);
    }
  }

  /**
   * Sends a ping message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  ping(data, mask, cb) {
    let byteLength;
    let readOnly;

    if (typeof data === 'string') {
      byteLength = Buffer.byteLength(data);
      readOnly = false;
    } else if (isBlob$1(data)) {
      byteLength = data.size;
      readOnly = false;
    } else {
      data = toBuffer$1(data);
      byteLength = data.length;
      readOnly = toBuffer$1.readOnly;
    }

    if (byteLength > 125) {
      throw new RangeError('The data size must not be greater than 125 bytes');
    }

    const options = {
      [kByteLength]: byteLength,
      fin: true,
      generateMask: this._generateMask,
      mask,
      maskBuffer: this._maskBuffer,
      opcode: 0x09,
      readOnly,
      rsv1: false
    };

    if (isBlob$1(data)) {
      if (this._state !== DEFAULT) {
        this.enqueue([this.getBlobData, data, false, options, cb]);
      } else {
        this.getBlobData(data, false, options, cb);
      }
    } else if (this._state !== DEFAULT) {
      this.enqueue([this.dispatch, data, false, options, cb]);
    } else {
      this.sendFrame(Sender.frame(data, options), cb);
    }
  }

  /**
   * Sends a pong message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  pong(data, mask, cb) {
    let byteLength;
    let readOnly;

    if (typeof data === 'string') {
      byteLength = Buffer.byteLength(data);
      readOnly = false;
    } else if (isBlob$1(data)) {
      byteLength = data.size;
      readOnly = false;
    } else {
      data = toBuffer$1(data);
      byteLength = data.length;
      readOnly = toBuffer$1.readOnly;
    }

    if (byteLength > 125) {
      throw new RangeError('The data size must not be greater than 125 bytes');
    }

    const options = {
      [kByteLength]: byteLength,
      fin: true,
      generateMask: this._generateMask,
      mask,
      maskBuffer: this._maskBuffer,
      opcode: 0x0a,
      readOnly,
      rsv1: false
    };

    if (isBlob$1(data)) {
      if (this._state !== DEFAULT) {
        this.enqueue([this.getBlobData, data, false, options, cb]);
      } else {
        this.getBlobData(data, false, options, cb);
      }
    } else if (this._state !== DEFAULT) {
      this.enqueue([this.dispatch, data, false, options, cb]);
    } else {
      this.sendFrame(Sender.frame(data, options), cb);
    }
  }

  /**
   * Sends a data message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Object} options Options object
   * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
   *     or text
   * @param {Boolean} [options.compress=false] Specifies whether or not to
   *     compress `data`
   * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
   *     last one
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Function} [cb] Callback
   * @public
   */
  send(data, options, cb) {
    const perMessageDeflate = this._extensions[PerMessageDeflate$1.extensionName];
    let opcode = options.binary ? 2 : 1;
    let rsv1 = options.compress;

    let byteLength;
    let readOnly;

    if (typeof data === 'string') {
      byteLength = Buffer.byteLength(data);
      readOnly = false;
    } else if (isBlob$1(data)) {
      byteLength = data.size;
      readOnly = false;
    } else {
      data = toBuffer$1(data);
      byteLength = data.length;
      readOnly = toBuffer$1.readOnly;
    }

    if (this._firstFragment) {
      this._firstFragment = false;
      if (
        rsv1 &&
        perMessageDeflate &&
        perMessageDeflate.params[
          perMessageDeflate._isServer
            ? 'server_no_context_takeover'
            : 'client_no_context_takeover'
        ]
      ) {
        rsv1 = byteLength >= perMessageDeflate._threshold;
      }
      this._compress = rsv1;
    } else {
      rsv1 = false;
      opcode = 0;
    }

    if (options.fin) this._firstFragment = true;

    const opts = {
      [kByteLength]: byteLength,
      fin: options.fin,
      generateMask: this._generateMask,
      mask: options.mask,
      maskBuffer: this._maskBuffer,
      opcode,
      readOnly,
      rsv1
    };

    if (isBlob$1(data)) {
      if (this._state !== DEFAULT) {
        this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
      } else {
        this.getBlobData(data, this._compress, opts, cb);
      }
    } else if (this._state !== DEFAULT) {
      this.enqueue([this.dispatch, data, this._compress, opts, cb]);
    } else {
      this.dispatch(data, this._compress, opts, cb);
    }
  }

  /**
   * Gets the contents of a blob as binary data.
   *
   * @param {Blob} blob The blob
   * @param {Boolean} [compress=false] Specifies whether or not to compress
   *     the data
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @param {Function} [cb] Callback
   * @private
   */
  getBlobData(blob, compress, options, cb) {
    this._bufferedBytes += options[kByteLength];
    this._state = GET_BLOB_DATA;

    blob
      .arrayBuffer()
      .then((arrayBuffer) => {
        if (this._socket.destroyed) {
          const err = new Error(
            'The socket was closed while the blob was being read'
          );

          //
          // `callCallbacks` is called in the next tick to ensure that errors
          // that might be thrown in the callbacks behave like errors thrown
          // outside the promise chain.
          //
          process.nextTick(callCallbacks, this, err, cb);
          return;
        }

        this._bufferedBytes -= options[kByteLength];
        const data = toBuffer$1(arrayBuffer);

        if (!compress) {
          this._state = DEFAULT;
          this.sendFrame(Sender.frame(data, options), cb);
          this.dequeue();
        } else {
          this.dispatch(data, compress, options, cb);
        }
      })
      .catch((err) => {
        //
        // `onError` is called in the next tick for the same reason that
        // `callCallbacks` above is.
        //
        process.nextTick(onError, this, err, cb);
      });
  }

  /**
   * Dispatches a message.
   *
   * @param {(Buffer|String)} data The message to send
   * @param {Boolean} [compress=false] Specifies whether or not to compress
   *     `data`
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @param {Function} [cb] Callback
   * @private
   */
  dispatch(data, compress, options, cb) {
    if (!compress) {
      this.sendFrame(Sender.frame(data, options), cb);
      return;
    }

    const perMessageDeflate = this._extensions[PerMessageDeflate$1.extensionName];

    this._bufferedBytes += options[kByteLength];
    this._state = DEFLATING;
    perMessageDeflate.compress(data, options.fin, (_, buf) => {
      if (this._socket.destroyed) {
        const err = new Error(
          'The socket was closed while data was being compressed'
        );

        callCallbacks(this, err, cb);
        return;
      }

      this._bufferedBytes -= options[kByteLength];
      this._state = DEFAULT;
      options.readOnly = false;
      this.sendFrame(Sender.frame(buf, options), cb);
      this.dequeue();
    });
  }

  /**
   * Executes queued send operations.
   *
   * @private
   */
  dequeue() {
    while (this._state === DEFAULT && this._queue.length) {
      const params = this._queue.shift();

      this._bufferedBytes -= params[3][kByteLength];
      Reflect.apply(params[0], this, params.slice(1));
    }
  }

  /**
   * Enqueues a send operation.
   *
   * @param {Array} params Send operation parameters.
   * @private
   */
  enqueue(params) {
    this._bufferedBytes += params[3][kByteLength];
    this._queue.push(params);
  }

  /**
   * Sends a frame.
   *
   * @param {(Buffer | String)[]} list The frame to send
   * @param {Function} [cb] Callback
   * @private
   */
  sendFrame(list, cb) {
    if (list.length === 2) {
      this._socket.cork();
      this._socket.write(list[0]);
      this._socket.write(list[1], cb);
      this._socket.uncork();
    } else {
      this._socket.write(list[0], cb);
    }
  }
};

var sender = Sender$1;

/**
 * Calls queued callbacks with an error.
 *
 * @param {Sender} sender The `Sender` instance
 * @param {Error} err The error to call the callbacks with
 * @param {Function} [cb] The first callback
 * @private
 */
function callCallbacks(sender, err, cb) {
  if (typeof cb === 'function') cb(err);

  for (let i = 0; i < sender._queue.length; i++) {
    const params = sender._queue[i];
    const callback = params[params.length - 1];

    if (typeof callback === 'function') callback(err);
  }
}

/**
 * Handles a `Sender` error.
 *
 * @param {Sender} sender The `Sender` instance
 * @param {Error} err The error
 * @param {Function} [cb] The first pending callback
 * @private
 */
function onError(sender, err, cb) {
  callCallbacks(sender, err, cb);
  sender.onerror(err);
}

const { kForOnEventAttribute: kForOnEventAttribute$1, kListener: kListener$1 } = constants;

const kCode = Symbol('kCode');
const kData = Symbol('kData');
const kError = Symbol('kError');
const kMessage = Symbol('kMessage');
const kReason = Symbol('kReason');
const kTarget = Symbol('kTarget');
const kType = Symbol('kType');
const kWasClean = Symbol('kWasClean');

/**
 * Class representing an event.
 */
let Event$1 = class Event {
  /**
   * Create a new `Event`.
   *
   * @param {String} type The name of the event
   * @throws {TypeError} If the `type` argument is not specified
   */
  constructor(type) {
    this[kTarget] = null;
    this[kType] = type;
  }

  /**
   * @type {*}
   */
  get target() {
    return this[kTarget];
  }

  /**
   * @type {String}
   */
  get type() {
    return this[kType];
  }
};

Object.defineProperty(Event$1.prototype, 'target', { enumerable: true });
Object.defineProperty(Event$1.prototype, 'type', { enumerable: true });

/**
 * Class representing a close event.
 *
 * @extends Event
 */
class CloseEvent extends Event$1 {
  /**
   * Create a new `CloseEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {Number} [options.code=0] The status code explaining why the
   *     connection was closed
   * @param {String} [options.reason=''] A human-readable string explaining why
   *     the connection was closed
   * @param {Boolean} [options.wasClean=false] Indicates whether or not the
   *     connection was cleanly closed
   */
  constructor(type, options = {}) {
    super(type);

    this[kCode] = options.code === undefined ? 0 : options.code;
    this[kReason] = options.reason === undefined ? '' : options.reason;
    this[kWasClean] = options.wasClean === undefined ? false : options.wasClean;
  }

  /**
   * @type {Number}
   */
  get code() {
    return this[kCode];
  }

  /**
   * @type {String}
   */
  get reason() {
    return this[kReason];
  }

  /**
   * @type {Boolean}
   */
  get wasClean() {
    return this[kWasClean];
  }
}

Object.defineProperty(CloseEvent.prototype, 'code', { enumerable: true });
Object.defineProperty(CloseEvent.prototype, 'reason', { enumerable: true });
Object.defineProperty(CloseEvent.prototype, 'wasClean', { enumerable: true });

/**
 * Class representing an error event.
 *
 * @extends Event
 */
class ErrorEvent extends Event$1 {
  /**
   * Create a new `ErrorEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.error=null] The error that generated this event
   * @param {String} [options.message=''] The error message
   */
  constructor(type, options = {}) {
    super(type);

    this[kError] = options.error === undefined ? null : options.error;
    this[kMessage] = options.message === undefined ? '' : options.message;
  }

  /**
   * @type {*}
   */
  get error() {
    return this[kError];
  }

  /**
   * @type {String}
   */
  get message() {
    return this[kMessage];
  }
}

Object.defineProperty(ErrorEvent.prototype, 'error', { enumerable: true });
Object.defineProperty(ErrorEvent.prototype, 'message', { enumerable: true });

/**
 * Class representing a message event.
 *
 * @extends Event
 */
class MessageEvent extends Event$1 {
  /**
   * Create a new `MessageEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.data=null] The message content
   */
  constructor(type, options = {}) {
    super(type);

    this[kData] = options.data === undefined ? null : options.data;
  }

  /**
   * @type {*}
   */
  get data() {
    return this[kData];
  }
}

Object.defineProperty(MessageEvent.prototype, 'data', { enumerable: true });

/**
 * This provides methods for emulating the `EventTarget` interface. It's not
 * meant to be used directly.
 *
 * @mixin
 */
const EventTarget = {
  /**
   * Register an event listener.
   *
   * @param {String} type A string representing the event type to listen for
   * @param {(Function|Object)} handler The listener to add
   * @param {Object} [options] An options object specifies characteristics about
   *     the event listener
   * @param {Boolean} [options.once=false] A `Boolean` indicating that the
   *     listener should be invoked at most once after being added. If `true`,
   *     the listener would be automatically removed when invoked.
   * @public
   */
  addEventListener(type, handler, options = {}) {
    for (const listener of this.listeners(type)) {
      if (
        !options[kForOnEventAttribute$1] &&
        listener[kListener$1] === handler &&
        !listener[kForOnEventAttribute$1]
      ) {
        return;
      }
    }

    let wrapper;

    if (type === 'message') {
      wrapper = function onMessage(data, isBinary) {
        const event = new MessageEvent('message', {
          data: isBinary ? data : data.toString()
        });

        event[kTarget] = this;
        callListener(handler, this, event);
      };
    } else if (type === 'close') {
      wrapper = function onClose(code, message) {
        const event = new CloseEvent('close', {
          code,
          reason: message.toString(),
          wasClean: this._closeFrameReceived && this._closeFrameSent
        });

        event[kTarget] = this;
        callListener(handler, this, event);
      };
    } else if (type === 'error') {
      wrapper = function onError(error) {
        const event = new ErrorEvent('error', {
          error,
          message: error.message
        });

        event[kTarget] = this;
        callListener(handler, this, event);
      };
    } else if (type === 'open') {
      wrapper = function onOpen() {
        const event = new Event$1('open');

        event[kTarget] = this;
        callListener(handler, this, event);
      };
    } else {
      return;
    }

    wrapper[kForOnEventAttribute$1] = !!options[kForOnEventAttribute$1];
    wrapper[kListener$1] = handler;

    if (options.once) {
      this.once(type, wrapper);
    } else {
      this.on(type, wrapper);
    }
  },

  /**
   * Remove an event listener.
   *
   * @param {String} type A string representing the event type to remove
   * @param {(Function|Object)} handler The listener to remove
   * @public
   */
  removeEventListener(type, handler) {
    for (const listener of this.listeners(type)) {
      if (listener[kListener$1] === handler && !listener[kForOnEventAttribute$1]) {
        this.removeListener(type, listener);
        break;
      }
    }
  }
};

var eventTarget = {
  EventTarget};

/**
 * Call an event listener
 *
 * @param {(Function|Object)} listener The listener to call
 * @param {*} thisArg The value to use as `this`` when calling the listener
 * @param {Event} event The event to pass to the listener
 * @private
 */
function callListener(listener, thisArg, event) {
  if (typeof listener === 'object' && listener.handleEvent) {
    listener.handleEvent.call(listener, event);
  } else {
    listener.call(thisArg, event);
  }
}

const { tokenChars: tokenChars$1 } = validationExports;

/**
 * Adds an offer to the map of extension offers or a parameter to the map of
 * parameters.
 *
 * @param {Object} dest The map of extension offers or parameters
 * @param {String} name The extension or parameter name
 * @param {(Object|Boolean|String)} elem The extension parameters or the
 *     parameter value
 * @private
 */
function push(dest, name, elem) {
  if (dest[name] === undefined) dest[name] = [elem];
  else dest[name].push(elem);
}

/**
 * Parses the `Sec-WebSocket-Extensions` header into an object.
 *
 * @param {String} header The field value of the header
 * @return {Object} The parsed object
 * @public
 */
function parse$1(header) {
  const offers = Object.create(null);
  let params = Object.create(null);
  let mustUnescape = false;
  let isEscaping = false;
  let inQuotes = false;
  let extensionName;
  let paramName;
  let start = -1;
  let code = -1;
  let end = -1;
  let i = 0;

  for (; i < header.length; i++) {
    code = header.charCodeAt(i);

    if (extensionName === undefined) {
      if (end === -1 && tokenChars$1[code] === 1) {
        if (start === -1) start = i;
      } else if (
        i !== 0 &&
        (code === 0x20 /* ' ' */ || code === 0x09) /* '\t' */
      ) {
        if (end === -1 && start !== -1) end = i;
      } else if (code === 0x3b /* ';' */ || code === 0x2c /* ',' */) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }

        if (end === -1) end = i;
        const name = header.slice(start, end);
        if (code === 0x2c) {
          push(offers, name, params);
          params = Object.create(null);
        } else {
          extensionName = name;
        }

        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    } else if (paramName === undefined) {
      if (end === -1 && tokenChars$1[code] === 1) {
        if (start === -1) start = i;
      } else if (code === 0x20 || code === 0x09) {
        if (end === -1 && start !== -1) end = i;
      } else if (code === 0x3b || code === 0x2c) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }

        if (end === -1) end = i;
        push(params, header.slice(start, end), true);
        if (code === 0x2c) {
          push(offers, extensionName, params);
          params = Object.create(null);
          extensionName = undefined;
        }

        start = end = -1;
      } else if (code === 0x3d /* '=' */ && start !== -1 && end === -1) {
        paramName = header.slice(start, i);
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    } else {
      //
      // The value of a quoted-string after unescaping must conform to the
      // token ABNF, so only token characters are valid.
      // Ref: https://tools.ietf.org/html/rfc6455#section-9.1
      //
      if (isEscaping) {
        if (tokenChars$1[code] !== 1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
        if (start === -1) start = i;
        else if (!mustUnescape) mustUnescape = true;
        isEscaping = false;
      } else if (inQuotes) {
        if (tokenChars$1[code] === 1) {
          if (start === -1) start = i;
        } else if (code === 0x22 /* '"' */ && start !== -1) {
          inQuotes = false;
          end = i;
        } else if (code === 0x5c /* '\' */) {
          isEscaping = true;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else if (code === 0x22 && header.charCodeAt(i - 1) === 0x3d) {
        inQuotes = true;
      } else if (end === -1 && tokenChars$1[code] === 1) {
        if (start === -1) start = i;
      } else if (start !== -1 && (code === 0x20 || code === 0x09)) {
        if (end === -1) end = i;
      } else if (code === 0x3b || code === 0x2c) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }

        if (end === -1) end = i;
        let value = header.slice(start, end);
        if (mustUnescape) {
          value = value.replace(/\\/g, '');
          mustUnescape = false;
        }
        push(params, paramName, value);
        if (code === 0x2c) {
          push(offers, extensionName, params);
          params = Object.create(null);
          extensionName = undefined;
        }

        paramName = undefined;
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    }
  }

  if (start === -1 || inQuotes || code === 0x20 || code === 0x09) {
    throw new SyntaxError('Unexpected end of input');
  }

  if (end === -1) end = i;
  const token = header.slice(start, end);
  if (extensionName === undefined) {
    push(offers, token, params);
  } else {
    if (paramName === undefined) {
      push(params, token, true);
    } else if (mustUnescape) {
      push(params, paramName, token.replace(/\\/g, ''));
    } else {
      push(params, paramName, token);
    }
    push(offers, extensionName, params);
  }

  return offers;
}

/**
 * Builds the `Sec-WebSocket-Extensions` header field value.
 *
 * @param {Object} extensions The map of extensions and parameters to format
 * @return {String} A string representing the given object
 * @public
 */
function format$1(extensions) {
  return Object.keys(extensions)
    .map((extension) => {
      let configurations = extensions[extension];
      if (!Array.isArray(configurations)) configurations = [configurations];
      return configurations
        .map((params) => {
          return [extension]
            .concat(
              Object.keys(params).map((k) => {
                let values = params[k];
                if (!Array.isArray(values)) values = [values];
                return values
                  .map((v) => (v === true ? k : `${k}=${v}`))
                  .join('; ');
              })
            )
            .join('; ');
        })
        .join(', ');
    })
    .join(', ');
}

var extension = { format: format$1, parse: parse$1 };

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Duplex|Readable$", "caughtErrors": "none" }] */

const EventEmitter$6 = require$$0$3;
const https = require$$1$1;
const http = require$$2;
const net = require$$3;
const tls = require$$4;
const { randomBytes, createHash: createHash$1 } = require$$1;
const { Duplex: Duplex$2, Readable } = require$$0$2;
const { URL: URL$1 } = require$$7;

const PerMessageDeflate = permessageDeflate;
const Receiver = receiver;
const Sender = sender;
const { isBlob } = validationExports;

const {
  BINARY_TYPES,
  CLOSE_TIMEOUT: CLOSE_TIMEOUT$1,
  EMPTY_BUFFER,
  GUID: GUID$1,
  kForOnEventAttribute,
  kListener,
  kStatusCode,
  kWebSocket: kWebSocket$1,
  NOOP
} = constants;
const {
  EventTarget: { addEventListener, removeEventListener }
} = eventTarget;
const { format, parse } = extension;
const { toBuffer } = bufferUtilExports;

const kAborted = Symbol('kAborted');
const protocolVersions = [8, 13];
const readyStates = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
const subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;

/**
 * Class representing a WebSocket.
 *
 * @extends EventEmitter
 */
class WebSocket extends EventEmitter$6 {
  /**
   * Create a new `WebSocket`.
   *
   * @param {(String|URL)} address The URL to which to connect
   * @param {(String|String[])} [protocols] The subprotocols
   * @param {Object} [options] Connection options
   */
  constructor(address, protocols, options) {
    super();

    this._binaryType = BINARY_TYPES[0];
    this._closeCode = 1006;
    this._closeFrameReceived = false;
    this._closeFrameSent = false;
    this._closeMessage = EMPTY_BUFFER;
    this._closeTimer = null;
    this._errorEmitted = false;
    this._extensions = {};
    this._paused = false;
    this._protocol = '';
    this._readyState = WebSocket.CONNECTING;
    this._receiver = null;
    this._sender = null;
    this._socket = null;

    if (address !== null) {
      this._bufferedAmount = 0;
      this._isServer = false;
      this._redirects = 0;

      if (protocols === undefined) {
        protocols = [];
      } else if (!Array.isArray(protocols)) {
        if (typeof protocols === 'object' && protocols !== null) {
          options = protocols;
          protocols = [];
        } else {
          protocols = [protocols];
        }
      }

      initAsClient(this, address, protocols, options);
    } else {
      this._autoPong = options.autoPong;
      this._closeTimeout = options.closeTimeout;
      this._isServer = true;
    }
  }

  /**
   * For historical reasons, the custom "nodebuffer" type is used by the default
   * instead of "blob".
   *
   * @type {String}
   */
  get binaryType() {
    return this._binaryType;
  }

  set binaryType(type) {
    if (!BINARY_TYPES.includes(type)) return;

    this._binaryType = type;

    //
    // Allow to change `binaryType` on the fly.
    //
    if (this._receiver) this._receiver._binaryType = type;
  }

  /**
   * @type {Number}
   */
  get bufferedAmount() {
    if (!this._socket) return this._bufferedAmount;

    return this._socket._writableState.length + this._sender._bufferedBytes;
  }

  /**
   * @type {String}
   */
  get extensions() {
    return Object.keys(this._extensions).join();
  }

  /**
   * @type {Boolean}
   */
  get isPaused() {
    return this._paused;
  }

  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onclose() {
    return null;
  }

  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onerror() {
    return null;
  }

  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onopen() {
    return null;
  }

  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onmessage() {
    return null;
  }

  /**
   * @type {String}
   */
  get protocol() {
    return this._protocol;
  }

  /**
   * @type {Number}
   */
  get readyState() {
    return this._readyState;
  }

  /**
   * @type {String}
   */
  get url() {
    return this._url;
  }

  /**
   * Set up the socket and the internal resources.
   *
   * @param {Duplex} socket The network socket between the server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Object} options Options object
   * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
   *     multiple times in the same tick
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Number} [options.maxPayload=0] The maximum allowed message size
   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   * @private
   */
  setSocket(socket, head, options) {
    const receiver = new Receiver({
      allowSynchronousEvents: options.allowSynchronousEvents,
      binaryType: this.binaryType,
      extensions: this._extensions,
      isServer: this._isServer,
      maxPayload: options.maxPayload,
      skipUTF8Validation: options.skipUTF8Validation
    });

    const sender = new Sender(socket, this._extensions, options.generateMask);

    this._receiver = receiver;
    this._sender = sender;
    this._socket = socket;

    receiver[kWebSocket$1] = this;
    sender[kWebSocket$1] = this;
    socket[kWebSocket$1] = this;

    receiver.on('conclude', receiverOnConclude);
    receiver.on('drain', receiverOnDrain);
    receiver.on('error', receiverOnError);
    receiver.on('message', receiverOnMessage);
    receiver.on('ping', receiverOnPing);
    receiver.on('pong', receiverOnPong);

    sender.onerror = senderOnError;

    //
    // These methods may not be available if `socket` is just a `Duplex`.
    //
    if (socket.setTimeout) socket.setTimeout(0);
    if (socket.setNoDelay) socket.setNoDelay();

    if (head.length > 0) socket.unshift(head);

    socket.on('close', socketOnClose);
    socket.on('data', socketOnData);
    socket.on('end', socketOnEnd);
    socket.on('error', socketOnError);

    this._readyState = WebSocket.OPEN;
    this.emit('open');
  }

  /**
   * Emit the `'close'` event.
   *
   * @private
   */
  emitClose() {
    if (!this._socket) {
      this._readyState = WebSocket.CLOSED;
      this.emit('close', this._closeCode, this._closeMessage);
      return;
    }

    if (this._extensions[PerMessageDeflate.extensionName]) {
      this._extensions[PerMessageDeflate.extensionName].cleanup();
    }

    this._receiver.removeAllListeners();
    this._readyState = WebSocket.CLOSED;
    this.emit('close', this._closeCode, this._closeMessage);
  }

  /**
   * Start a closing handshake.
   *
   *          +----------+   +-----------+   +----------+
   *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
   *    |     +----------+   +-----------+   +----------+     |
   *          +----------+   +-----------+         |
   * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
   *          +----------+   +-----------+   |
   *    |           |                        |   +---+        |
   *                +------------------------+-->|fin| - - - -
   *    |         +---+                      |   +---+
   *     - - - - -|fin|<---------------------+
   *              +---+
   *
   * @param {Number} [code] Status code explaining why the connection is closing
   * @param {(String|Buffer)} [data] The reason why the connection is
   *     closing
   * @public
   */
  close(code, data) {
    if (this.readyState === WebSocket.CLOSED) return;
    if (this.readyState === WebSocket.CONNECTING) {
      const msg = 'WebSocket was closed before the connection was established';
      abortHandshake(this, this._req, msg);
      return;
    }

    if (this.readyState === WebSocket.CLOSING) {
      if (
        this._closeFrameSent &&
        (this._closeFrameReceived || this._receiver._writableState.errorEmitted)
      ) {
        this._socket.end();
      }

      return;
    }

    this._readyState = WebSocket.CLOSING;
    this._sender.close(code, data, !this._isServer, (err) => {
      //
      // This error is handled by the `'error'` listener on the socket. We only
      // want to know if the close frame has been sent here.
      //
      if (err) return;

      this._closeFrameSent = true;

      if (
        this._closeFrameReceived ||
        this._receiver._writableState.errorEmitted
      ) {
        this._socket.end();
      }
    });

    setCloseTimer(this);
  }

  /**
   * Pause the socket.
   *
   * @public
   */
  pause() {
    if (
      this.readyState === WebSocket.CONNECTING ||
      this.readyState === WebSocket.CLOSED
    ) {
      return;
    }

    this._paused = true;
    this._socket.pause();
  }

  /**
   * Send a ping.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the ping is sent
   * @public
   */
  ping(data, mask, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
    }

    if (typeof data === 'function') {
      cb = data;
      data = mask = undefined;
    } else if (typeof mask === 'function') {
      cb = mask;
      mask = undefined;
    }

    if (typeof data === 'number') data = data.toString();

    if (this.readyState !== WebSocket.OPEN) {
      sendAfterClose(this, data, cb);
      return;
    }

    if (mask === undefined) mask = !this._isServer;
    this._sender.ping(data || EMPTY_BUFFER, mask, cb);
  }

  /**
   * Send a pong.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the pong is sent
   * @public
   */
  pong(data, mask, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
    }

    if (typeof data === 'function') {
      cb = data;
      data = mask = undefined;
    } else if (typeof mask === 'function') {
      cb = mask;
      mask = undefined;
    }

    if (typeof data === 'number') data = data.toString();

    if (this.readyState !== WebSocket.OPEN) {
      sendAfterClose(this, data, cb);
      return;
    }

    if (mask === undefined) mask = !this._isServer;
    this._sender.pong(data || EMPTY_BUFFER, mask, cb);
  }

  /**
   * Resume the socket.
   *
   * @public
   */
  resume() {
    if (
      this.readyState === WebSocket.CONNECTING ||
      this.readyState === WebSocket.CLOSED
    ) {
      return;
    }

    this._paused = false;
    if (!this._receiver._writableState.needDrain) this._socket.resume();
  }

  /**
   * Send a data message.
   *
   * @param {*} data The message to send
   * @param {Object} [options] Options object
   * @param {Boolean} [options.binary] Specifies whether `data` is binary or
   *     text
   * @param {Boolean} [options.compress] Specifies whether or not to compress
   *     `data`
   * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
   *     last one
   * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when data is written out
   * @public
   */
  send(data, options, cb) {
    if (this.readyState === WebSocket.CONNECTING) {
      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
    }

    if (typeof options === 'function') {
      cb = options;
      options = {};
    }

    if (typeof data === 'number') data = data.toString();

    if (this.readyState !== WebSocket.OPEN) {
      sendAfterClose(this, data, cb);
      return;
    }

    const opts = {
      binary: typeof data !== 'string',
      mask: !this._isServer,
      compress: true,
      fin: true,
      ...options
    };

    if (!this._extensions[PerMessageDeflate.extensionName]) {
      opts.compress = false;
    }

    this._sender.send(data || EMPTY_BUFFER, opts, cb);
  }

  /**
   * Forcibly close the connection.
   *
   * @public
   */
  terminate() {
    if (this.readyState === WebSocket.CLOSED) return;
    if (this.readyState === WebSocket.CONNECTING) {
      const msg = 'WebSocket was closed before the connection was established';
      abortHandshake(this, this._req, msg);
      return;
    }

    if (this._socket) {
      this._readyState = WebSocket.CLOSING;
      this._socket.destroy();
    }
  }
}

/**
 * @constant {Number} CONNECTING
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'CONNECTING', {
  enumerable: true,
  value: readyStates.indexOf('CONNECTING')
});

/**
 * @constant {Number} CONNECTING
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'CONNECTING', {
  enumerable: true,
  value: readyStates.indexOf('CONNECTING')
});

/**
 * @constant {Number} OPEN
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'OPEN', {
  enumerable: true,
  value: readyStates.indexOf('OPEN')
});

/**
 * @constant {Number} OPEN
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'OPEN', {
  enumerable: true,
  value: readyStates.indexOf('OPEN')
});

/**
 * @constant {Number} CLOSING
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'CLOSING', {
  enumerable: true,
  value: readyStates.indexOf('CLOSING')
});

/**
 * @constant {Number} CLOSING
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'CLOSING', {
  enumerable: true,
  value: readyStates.indexOf('CLOSING')
});

/**
 * @constant {Number} CLOSED
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'CLOSED', {
  enumerable: true,
  value: readyStates.indexOf('CLOSED')
});

/**
 * @constant {Number} CLOSED
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'CLOSED', {
  enumerable: true,
  value: readyStates.indexOf('CLOSED')
});

[
  'binaryType',
  'bufferedAmount',
  'extensions',
  'isPaused',
  'protocol',
  'readyState',
  'url'
].forEach((property) => {
  Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
});

//
// Add the `onopen`, `onerror`, `onclose`, and `onmessage` attributes.
// See https://html.spec.whatwg.org/multipage/comms.html#the-websocket-interface
//
['open', 'error', 'close', 'message'].forEach((method) => {
  Object.defineProperty(WebSocket.prototype, `on${method}`, {
    enumerable: true,
    get() {
      for (const listener of this.listeners(method)) {
        if (listener[kForOnEventAttribute]) return listener[kListener];
      }

      return null;
    },
    set(handler) {
      for (const listener of this.listeners(method)) {
        if (listener[kForOnEventAttribute]) {
          this.removeListener(method, listener);
          break;
        }
      }

      if (typeof handler !== 'function') return;

      this.addEventListener(method, handler, {
        [kForOnEventAttribute]: true
      });
    }
  });
});

WebSocket.prototype.addEventListener = addEventListener;
WebSocket.prototype.removeEventListener = removeEventListener;

var websocket = WebSocket;

/**
 * Initialize a WebSocket client.
 *
 * @param {WebSocket} websocket The client to initialize
 * @param {(String|URL)} address The URL to which to connect
 * @param {Array} protocols The subprotocols
 * @param {Object} [options] Connection options
 * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether any
 *     of the `'message'`, `'ping'`, and `'pong'` events can be emitted multiple
 *     times in the same tick
 * @param {Boolean} [options.autoPong=true] Specifies whether or not to
 *     automatically send a pong in response to a ping
 * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to wait
 *     for the closing handshake to finish after `websocket.close()` is called
 * @param {Function} [options.finishRequest] A function which can be used to
 *     customize the headers of each http request before it is sent
 * @param {Boolean} [options.followRedirects=false] Whether or not to follow
 *     redirects
 * @param {Function} [options.generateMask] The function used to generate the
 *     masking key
 * @param {Number} [options.handshakeTimeout] Timeout in milliseconds for the
 *     handshake request
 * @param {Number} [options.maxPayload=104857600] The maximum allowed message
 *     size
 * @param {Number} [options.maxRedirects=10] The maximum number of redirects
 *     allowed
 * @param {String} [options.origin] Value of the `Origin` or
 *     `Sec-WebSocket-Origin` header
 * @param {(Boolean|Object)} [options.perMessageDeflate=true] Enable/disable
 *     permessage-deflate
 * @param {Number} [options.protocolVersion=13] Value of the
 *     `Sec-WebSocket-Version` header
 * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
 *     not to skip UTF-8 validation for text and close messages
 * @private
 */
function initAsClient(websocket, address, protocols, options) {
  const opts = {
    allowSynchronousEvents: true,
    autoPong: true,
    closeTimeout: CLOSE_TIMEOUT$1,
    protocolVersion: protocolVersions[1],
    maxPayload: 100 * 1024 * 1024,
    skipUTF8Validation: false,
    perMessageDeflate: true,
    followRedirects: false,
    maxRedirects: 10,
    ...options,
    socketPath: undefined,
    hostname: undefined,
    protocol: undefined,
    timeout: undefined,
    method: 'GET',
    host: undefined,
    path: undefined,
    port: undefined
  };

  websocket._autoPong = opts.autoPong;
  websocket._closeTimeout = opts.closeTimeout;

  if (!protocolVersions.includes(opts.protocolVersion)) {
    throw new RangeError(
      `Unsupported protocol version: ${opts.protocolVersion} ` +
        `(supported versions: ${protocolVersions.join(', ')})`
    );
  }

  let parsedUrl;

  if (address instanceof URL$1) {
    parsedUrl = address;
  } else {
    try {
      parsedUrl = new URL$1(address);
    } catch (e) {
      throw new SyntaxError(`Invalid URL: ${address}`);
    }
  }

  if (parsedUrl.protocol === 'http:') {
    parsedUrl.protocol = 'ws:';
  } else if (parsedUrl.protocol === 'https:') {
    parsedUrl.protocol = 'wss:';
  }

  websocket._url = parsedUrl.href;

  const isSecure = parsedUrl.protocol === 'wss:';
  const isIpcUrl = parsedUrl.protocol === 'ws+unix:';
  let invalidUrlMessage;

  if (parsedUrl.protocol !== 'ws:' && !isSecure && !isIpcUrl) {
    invalidUrlMessage =
      'The URL\'s protocol must be one of "ws:", "wss:", ' +
      '"http:", "https:", or "ws+unix:"';
  } else if (isIpcUrl && !parsedUrl.pathname) {
    invalidUrlMessage = "The URL's pathname is empty";
  } else if (parsedUrl.hash) {
    invalidUrlMessage = 'The URL contains a fragment identifier';
  }

  if (invalidUrlMessage) {
    const err = new SyntaxError(invalidUrlMessage);

    if (websocket._redirects === 0) {
      throw err;
    } else {
      emitErrorAndClose(websocket, err);
      return;
    }
  }

  const defaultPort = isSecure ? 443 : 80;
  const key = randomBytes(16).toString('base64');
  const request = isSecure ? https.request : http.request;
  const protocolSet = new Set();
  let perMessageDeflate;

  opts.createConnection =
    opts.createConnection || (isSecure ? tlsConnect : netConnect);
  opts.defaultPort = opts.defaultPort || defaultPort;
  opts.port = parsedUrl.port || defaultPort;
  opts.host = parsedUrl.hostname.startsWith('[')
    ? parsedUrl.hostname.slice(1, -1)
    : parsedUrl.hostname;
  opts.headers = {
    ...opts.headers,
    'Sec-WebSocket-Version': opts.protocolVersion,
    'Sec-WebSocket-Key': key,
    Connection: 'Upgrade',
    Upgrade: 'websocket'
  };
  opts.path = parsedUrl.pathname + parsedUrl.search;
  opts.timeout = opts.handshakeTimeout;

  if (opts.perMessageDeflate) {
    perMessageDeflate = new PerMessageDeflate(
      opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
      false,
      opts.maxPayload
    );
    opts.headers['Sec-WebSocket-Extensions'] = format({
      [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
    });
  }
  if (protocols.length) {
    for (const protocol of protocols) {
      if (
        typeof protocol !== 'string' ||
        !subprotocolRegex.test(protocol) ||
        protocolSet.has(protocol)
      ) {
        throw new SyntaxError(
          'An invalid or duplicated subprotocol was specified'
        );
      }

      protocolSet.add(protocol);
    }

    opts.headers['Sec-WebSocket-Protocol'] = protocols.join(',');
  }
  if (opts.origin) {
    if (opts.protocolVersion < 13) {
      opts.headers['Sec-WebSocket-Origin'] = opts.origin;
    } else {
      opts.headers.Origin = opts.origin;
    }
  }
  if (parsedUrl.username || parsedUrl.password) {
    opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
  }

  if (isIpcUrl) {
    const parts = opts.path.split(':');

    opts.socketPath = parts[0];
    opts.path = parts[1];
  }

  let req;

  if (opts.followRedirects) {
    if (websocket._redirects === 0) {
      websocket._originalIpc = isIpcUrl;
      websocket._originalSecure = isSecure;
      websocket._originalHostOrSocketPath = isIpcUrl
        ? opts.socketPath
        : parsedUrl.host;

      const headers = options && options.headers;

      //
      // Shallow copy the user provided options so that headers can be changed
      // without mutating the original object.
      //
      options = { ...options, headers: {} };

      if (headers) {
        for (const [key, value] of Object.entries(headers)) {
          options.headers[key.toLowerCase()] = value;
        }
      }
    } else if (websocket.listenerCount('redirect') === 0) {
      const isSameHost = isIpcUrl
        ? websocket._originalIpc
          ? opts.socketPath === websocket._originalHostOrSocketPath
          : false
        : websocket._originalIpc
          ? false
          : parsedUrl.host === websocket._originalHostOrSocketPath;

      if (!isSameHost || (websocket._originalSecure && !isSecure)) {
        //
        // Match curl 7.77.0 behavior and drop the following headers. These
        // headers are also dropped when following a redirect to a subdomain.
        //
        delete opts.headers.authorization;
        delete opts.headers.cookie;

        if (!isSameHost) delete opts.headers.host;

        opts.auth = undefined;
      }
    }

    //
    // Match curl 7.77.0 behavior and make the first `Authorization` header win.
    // If the `Authorization` header is set, then there is nothing to do as it
    // will take precedence.
    //
    if (opts.auth && !options.headers.authorization) {
      options.headers.authorization =
        'Basic ' + Buffer.from(opts.auth).toString('base64');
    }

    req = websocket._req = request(opts);

    if (websocket._redirects) {
      //
      // Unlike what is done for the `'upgrade'` event, no early exit is
      // triggered here if the user calls `websocket.close()` or
      // `websocket.terminate()` from a listener of the `'redirect'` event. This
      // is because the user can also call `request.destroy()` with an error
      // before calling `websocket.close()` or `websocket.terminate()` and this
      // would result in an error being emitted on the `request` object with no
      // `'error'` event listeners attached.
      //
      websocket.emit('redirect', websocket.url, req);
    }
  } else {
    req = websocket._req = request(opts);
  }

  if (opts.timeout) {
    req.on('timeout', () => {
      abortHandshake(websocket, req, 'Opening handshake has timed out');
    });
  }

  req.on('error', (err) => {
    if (req === null || req[kAborted]) return;

    req = websocket._req = null;
    emitErrorAndClose(websocket, err);
  });

  req.on('response', (res) => {
    const location = res.headers.location;
    const statusCode = res.statusCode;

    if (
      location &&
      opts.followRedirects &&
      statusCode >= 300 &&
      statusCode < 400
    ) {
      if (++websocket._redirects > opts.maxRedirects) {
        abortHandshake(websocket, req, 'Maximum redirects exceeded');
        return;
      }

      req.abort();

      let addr;

      try {
        addr = new URL$1(location, address);
      } catch (e) {
        const err = new SyntaxError(`Invalid URL: ${location}`);
        emitErrorAndClose(websocket, err);
        return;
      }

      initAsClient(websocket, addr, protocols, options);
    } else if (!websocket.emit('unexpected-response', req, res)) {
      abortHandshake(
        websocket,
        req,
        `Unexpected server response: ${res.statusCode}`
      );
    }
  });

  req.on('upgrade', (res, socket, head) => {
    websocket.emit('upgrade', res);

    //
    // The user may have closed the connection from a listener of the
    // `'upgrade'` event.
    //
    if (websocket.readyState !== WebSocket.CONNECTING) return;

    req = websocket._req = null;

    const upgrade = res.headers.upgrade;

    if (upgrade === undefined || upgrade.toLowerCase() !== 'websocket') {
      abortHandshake(websocket, socket, 'Invalid Upgrade header');
      return;
    }

    const digest = createHash$1('sha1')
      .update(key + GUID$1)
      .digest('base64');

    if (res.headers['sec-websocket-accept'] !== digest) {
      abortHandshake(websocket, socket, 'Invalid Sec-WebSocket-Accept header');
      return;
    }

    const serverProt = res.headers['sec-websocket-protocol'];
    let protError;

    if (serverProt !== undefined) {
      if (!protocolSet.size) {
        protError = 'Server sent a subprotocol but none was requested';
      } else if (!protocolSet.has(serverProt)) {
        protError = 'Server sent an invalid subprotocol';
      }
    } else if (protocolSet.size) {
      protError = 'Server sent no subprotocol';
    }

    if (protError) {
      abortHandshake(websocket, socket, protError);
      return;
    }

    if (serverProt) websocket._protocol = serverProt;

    const secWebSocketExtensions = res.headers['sec-websocket-extensions'];

    if (secWebSocketExtensions !== undefined) {
      if (!perMessageDeflate) {
        const message =
          'Server sent a Sec-WebSocket-Extensions header but no extension ' +
          'was requested';
        abortHandshake(websocket, socket, message);
        return;
      }

      let extensions;

      try {
        extensions = parse(secWebSocketExtensions);
      } catch (err) {
        const message = 'Invalid Sec-WebSocket-Extensions header';
        abortHandshake(websocket, socket, message);
        return;
      }

      const extensionNames = Object.keys(extensions);

      if (
        extensionNames.length !== 1 ||
        extensionNames[0] !== PerMessageDeflate.extensionName
      ) {
        const message = 'Server indicated an extension that was not requested';
        abortHandshake(websocket, socket, message);
        return;
      }

      try {
        perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
      } catch (err) {
        const message = 'Invalid Sec-WebSocket-Extensions header';
        abortHandshake(websocket, socket, message);
        return;
      }

      websocket._extensions[PerMessageDeflate.extensionName] =
        perMessageDeflate;
    }

    websocket.setSocket(socket, head, {
      allowSynchronousEvents: opts.allowSynchronousEvents,
      generateMask: opts.generateMask,
      maxPayload: opts.maxPayload,
      skipUTF8Validation: opts.skipUTF8Validation
    });
  });

  if (opts.finishRequest) {
    opts.finishRequest(req, websocket);
  } else {
    req.end();
  }
}

/**
 * Emit the `'error'` and `'close'` events.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @param {Error} The error to emit
 * @private
 */
function emitErrorAndClose(websocket, err) {
  websocket._readyState = WebSocket.CLOSING;
  //
  // The following assignment is practically useless and is done only for
  // consistency.
  //
  websocket._errorEmitted = true;
  websocket.emit('error', err);
  websocket.emitClose();
}

/**
 * Create a `net.Socket` and initiate a connection.
 *
 * @param {Object} options Connection options
 * @return {net.Socket} The newly created socket used to start the connection
 * @private
 */
function netConnect(options) {
  options.path = options.socketPath;
  return net.connect(options);
}

/**
 * Create a `tls.TLSSocket` and initiate a connection.
 *
 * @param {Object} options Connection options
 * @return {tls.TLSSocket} The newly created socket used to start the connection
 * @private
 */
function tlsConnect(options) {
  options.path = undefined;

  if (!options.servername && options.servername !== '') {
    options.servername = net.isIP(options.host) ? '' : options.host;
  }

  return tls.connect(options);
}

/**
 * Abort the handshake and emit an error.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @param {(http.ClientRequest|net.Socket|tls.Socket)} stream The request to
 *     abort or the socket to destroy
 * @param {String} message The error message
 * @private
 */
function abortHandshake(websocket, stream, message) {
  websocket._readyState = WebSocket.CLOSING;

  const err = new Error(message);
  Error.captureStackTrace(err, abortHandshake);

  if (stream.setHeader) {
    stream[kAborted] = true;
    stream.abort();

    if (stream.socket && !stream.socket.destroyed) {
      //
      // On Node.js >= 14.3.0 `request.abort()` does not destroy the socket if
      // called after the request completed. See
      // https://github.com/websockets/ws/issues/1869.
      //
      stream.socket.destroy();
    }

    process.nextTick(emitErrorAndClose, websocket, err);
  } else {
    stream.destroy(err);
    stream.once('error', websocket.emit.bind(websocket, 'error'));
    stream.once('close', websocket.emitClose.bind(websocket));
  }
}

/**
 * Handle cases where the `ping()`, `pong()`, or `send()` methods are called
 * when the `readyState` attribute is `CLOSING` or `CLOSED`.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @param {*} [data] The data to send
 * @param {Function} [cb] Callback
 * @private
 */
function sendAfterClose(websocket, data, cb) {
  if (data) {
    const length = isBlob(data) ? data.size : toBuffer(data).length;

    //
    // The `_bufferedAmount` property is used only when the peer is a client and
    // the opening handshake fails. Under these circumstances, in fact, the
    // `setSocket()` method is not called, so the `_socket` and `_sender`
    // properties are set to `null`.
    //
    if (websocket._socket) websocket._sender._bufferedBytes += length;
    else websocket._bufferedAmount += length;
  }

  if (cb) {
    const err = new Error(
      `WebSocket is not open: readyState ${websocket.readyState} ` +
        `(${readyStates[websocket.readyState]})`
    );
    process.nextTick(cb, err);
  }
}

/**
 * The listener of the `Receiver` `'conclude'` event.
 *
 * @param {Number} code The status code
 * @param {Buffer} reason The reason for closing
 * @private
 */
function receiverOnConclude(code, reason) {
  const websocket = this[kWebSocket$1];

  websocket._closeFrameReceived = true;
  websocket._closeMessage = reason;
  websocket._closeCode = code;

  if (websocket._socket[kWebSocket$1] === undefined) return;

  websocket._socket.removeListener('data', socketOnData);
  process.nextTick(resume, websocket._socket);

  if (code === 1005) websocket.close();
  else websocket.close(code, reason);
}

/**
 * The listener of the `Receiver` `'drain'` event.
 *
 * @private
 */
function receiverOnDrain() {
  const websocket = this[kWebSocket$1];

  if (!websocket.isPaused) websocket._socket.resume();
}

/**
 * The listener of the `Receiver` `'error'` event.
 *
 * @param {(RangeError|Error)} err The emitted error
 * @private
 */
function receiverOnError(err) {
  const websocket = this[kWebSocket$1];

  if (websocket._socket[kWebSocket$1] !== undefined) {
    websocket._socket.removeListener('data', socketOnData);

    //
    // On Node.js < 14.0.0 the `'error'` event is emitted synchronously. See
    // https://github.com/websockets/ws/issues/1940.
    //
    process.nextTick(resume, websocket._socket);

    websocket.close(err[kStatusCode]);
  }

  if (!websocket._errorEmitted) {
    websocket._errorEmitted = true;
    websocket.emit('error', err);
  }
}

/**
 * The listener of the `Receiver` `'finish'` event.
 *
 * @private
 */
function receiverOnFinish() {
  this[kWebSocket$1].emitClose();
}

/**
 * The listener of the `Receiver` `'message'` event.
 *
 * @param {Buffer|ArrayBuffer|Buffer[])} data The message
 * @param {Boolean} isBinary Specifies whether the message is binary or not
 * @private
 */
function receiverOnMessage(data, isBinary) {
  this[kWebSocket$1].emit('message', data, isBinary);
}

/**
 * The listener of the `Receiver` `'ping'` event.
 *
 * @param {Buffer} data The data included in the ping frame
 * @private
 */
function receiverOnPing(data) {
  const websocket = this[kWebSocket$1];

  if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
  websocket.emit('ping', data);
}

/**
 * The listener of the `Receiver` `'pong'` event.
 *
 * @param {Buffer} data The data included in the pong frame
 * @private
 */
function receiverOnPong(data) {
  this[kWebSocket$1].emit('pong', data);
}

/**
 * Resume a readable stream
 *
 * @param {Readable} stream The readable stream
 * @private
 */
function resume(stream) {
  stream.resume();
}

/**
 * The `Sender` error event handler.
 *
 * @param {Error} The error
 * @private
 */
function senderOnError(err) {
  const websocket = this[kWebSocket$1];

  if (websocket.readyState === WebSocket.CLOSED) return;
  if (websocket.readyState === WebSocket.OPEN) {
    websocket._readyState = WebSocket.CLOSING;
    setCloseTimer(websocket);
  }

  //
  // `socket.end()` is used instead of `socket.destroy()` to allow the other
  // peer to finish sending queued data. There is no need to set a timer here
  // because `CLOSING` means that it is already set or not needed.
  //
  this._socket.end();

  if (!websocket._errorEmitted) {
    websocket._errorEmitted = true;
    websocket.emit('error', err);
  }
}

/**
 * Set a timer to destroy the underlying raw socket of a WebSocket.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @private
 */
function setCloseTimer(websocket) {
  websocket._closeTimer = setTimeout(
    websocket._socket.destroy.bind(websocket._socket),
    websocket._closeTimeout
  );
}

/**
 * The listener of the socket `'close'` event.
 *
 * @private
 */
function socketOnClose() {
  const websocket = this[kWebSocket$1];

  this.removeListener('close', socketOnClose);
  this.removeListener('data', socketOnData);
  this.removeListener('end', socketOnEnd);

  websocket._readyState = WebSocket.CLOSING;

  //
  // The close frame might not have been received or the `'end'` event emitted,
  // for example, if the socket was destroyed due to an error. Ensure that the
  // `receiver` stream is closed after writing any remaining buffered data to
  // it. If the readable side of the socket is in flowing mode then there is no
  // buffered data as everything has been already written. If instead, the
  // socket is paused, any possible buffered data will be read as a single
  // chunk.
  //
  if (
    !this._readableState.endEmitted &&
    !websocket._closeFrameReceived &&
    !websocket._receiver._writableState.errorEmitted &&
    this._readableState.length !== 0
  ) {
    const chunk = this.read(this._readableState.length);

    websocket._receiver.write(chunk);
  }

  websocket._receiver.end();

  this[kWebSocket$1] = undefined;

  clearTimeout(websocket._closeTimer);

  if (
    websocket._receiver._writableState.finished ||
    websocket._receiver._writableState.errorEmitted
  ) {
    websocket.emitClose();
  } else {
    websocket._receiver.on('error', receiverOnFinish);
    websocket._receiver.on('finish', receiverOnFinish);
  }
}

/**
 * The listener of the socket `'data'` event.
 *
 * @param {Buffer} chunk A chunk of data
 * @private
 */
function socketOnData(chunk) {
  if (!this[kWebSocket$1]._receiver.write(chunk)) {
    this.pause();
  }
}

/**
 * The listener of the socket `'end'` event.
 *
 * @private
 */
function socketOnEnd() {
  const websocket = this[kWebSocket$1];

  websocket._readyState = WebSocket.CLOSING;
  websocket._receiver.end();
  this.end();
}

/**
 * The listener of the socket `'error'` event.
 *
 * @private
 */
function socketOnError() {
  const websocket = this[kWebSocket$1];

  this.removeListener('error', socketOnError);
  this.on('error', NOOP);

  if (websocket) {
    websocket._readyState = WebSocket.CLOSING;
    this.destroy();
  }
}

var WebSocket$1 = /*@__PURE__*/getDefaultExportFromCjs(websocket);

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^WebSocket$" }] */
const { Duplex: Duplex$1 } = require$$0$2;

const { tokenChars } = validationExports;

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Duplex$", "caughtErrors": "none" }] */
const { Duplex } = require$$0$2;
const { createHash } = require$$1;
const { CLOSE_TIMEOUT, GUID, kWebSocket } = constants;

/**!
 * @author Elgato
 * @module elgato/streamdeck
 * @license MIT
 * @copyright Copyright (c) Corsair Memory Inc.
 */
/**
 * Stream Deck device types.
 */
var DeviceType;
(function (DeviceType) {
    /**
     * Stream Deck, comprised of 15 customizable LCD keys in a 5 x 3 layout.
     */
    DeviceType[DeviceType["StreamDeck"] = 0] = "StreamDeck";
    /**
     * Stream Deck Mini, comprised of 6 customizable LCD keys in a 3 x 2 layout.
     */
    DeviceType[DeviceType["StreamDeckMini"] = 1] = "StreamDeckMini";
    /**
     * Stream Deck XL, comprised of 32 customizable LCD keys in an 8 x 4 layout.
     */
    DeviceType[DeviceType["StreamDeckXL"] = 2] = "StreamDeckXL";
    /**
     * Stream Deck Mobile, for iOS and Android.
     */
    DeviceType[DeviceType["StreamDeckMobile"] = 3] = "StreamDeckMobile";
    /**
     * Corsair G Keys, available on select Corsair keyboards.
     */
    DeviceType[DeviceType["CorsairGKeys"] = 4] = "CorsairGKeys";
    /**
     * Stream Deck Pedal, comprised of 3 customizable pedals.
     */
    DeviceType[DeviceType["StreamDeckPedal"] = 5] = "StreamDeckPedal";
    /**
     * Corsair Voyager laptop, comprising 10 buttons in a horizontal line above the keyboard.
     */
    DeviceType[DeviceType["CorsairVoyager"] = 6] = "CorsairVoyager";
    /**
     * Stream Deck +, comprised of 8 customizable LCD keys in a 4 x 2 layout, a touch strip, and 4 dials.
     */
    DeviceType[DeviceType["StreamDeckPlus"] = 7] = "StreamDeckPlus";
    /**
     * SCUF controller G keys, available on select SCUF controllers, for example SCUF Envision.
     */
    DeviceType[DeviceType["SCUFController"] = 8] = "SCUFController";
    /**
     * Stream Deck Neo, comprised of 8 customizable LCD keys in a 4 x 2 layout, an info bar, and 2 touch points for page navigation.
     */
    DeviceType[DeviceType["StreamDeckNeo"] = 9] = "StreamDeckNeo";
    /**
     * Stream Deck Studio, comprised of 32 customizable LCD keys in a 16 x 2 layout, and 2 dials (1 on either side).
     */
    DeviceType[DeviceType["StreamDeckStudio"] = 10] = "StreamDeckStudio";
    /**
     * Virtual Stream Deck, comprised of 1 to 64 action (on-screen) on a scalable canvas, with a maximum layout of 8 x 8.
     */
    DeviceType[DeviceType["VirtualStreamDeck"] = 11] = "VirtualStreamDeck";
    /**
     * High-performance gaming keyboard, with a built-in Stream Deck comprised of 12 customizable LCD keys in a 3 x 4 layout, an LCD screen, and 2 dials.
     */
    DeviceType[DeviceType["Galleon100SD"] = 12] = "Galleon100SD";
    /**
     * Stream Deck + XL, comprised of 36 customizable LCD keys in a 9 x 4 layout, a touch strip, and 6 dials.
     */
    DeviceType[DeviceType["StreamDeckPlusXL"] = 13] = "StreamDeckPlusXL";
})(DeviceType || (DeviceType = {}));

/**
 * List of available types that can be applied to {@link Bar} and {@link GBar} to determine their style.
 */
var BarSubType;
(function (BarSubType) {
    /**
     * Rectangle bar; the bar fills from left to right, determined by the {@link Bar.value}, similar to a standard progress bar.
     */
    BarSubType[BarSubType["Rectangle"] = 0] = "Rectangle";
    /**
     * Rectangle bar; the bar fills outwards from the centre of the bar, determined by the {@link Bar.value}.
     * @example
     * // Value is 2, range is 1-10.
     * // [  ███     ]
     * @example
     * // Value is 10, range is 1-10.
     * // [     █████]
     */
    BarSubType[BarSubType["DoubleRectangle"] = 1] = "DoubleRectangle";
    /**
     * Trapezoid bar, represented as a right-angle triangle; the bar fills from left to right, determined by the {@link Bar.value}, similar to a volume meter.
     */
    BarSubType[BarSubType["Trapezoid"] = 2] = "Trapezoid";
    /**
     * Trapezoid bar, represented by two right-angle triangles; the bar fills outwards from the centre of the bar, determined by the {@link Bar.value}. See {@link BarSubType.DoubleRectangle}.
     */
    BarSubType[BarSubType["DoubleTrapezoid"] = 3] = "DoubleTrapezoid";
    /**
     * Rounded rectangle bar; the bar fills from left to right, determined by the {@link Bar.value}, similar to a standard progress bar.
     */
    BarSubType[BarSubType["Groove"] = 4] = "Groove";
})(BarSubType || (BarSubType = {}));

/**
 * Defines the type of argument supplied by Stream Deck.
 */
var RegistrationParameter;
(function (RegistrationParameter) {
    /**
     * Identifies the argument that specifies the web socket port that Stream Deck is listening on.
     */
    RegistrationParameter["Port"] = "-port";
    /**
     * Identifies the argument that supplies information about the Stream Deck and the plugin.
     */
    RegistrationParameter["Info"] = "-info";
    /**
     * Identifies the argument that specifies the unique identifier that can be used when registering the plugin.
     */
    RegistrationParameter["PluginUUID"] = "-pluginUUID";
    /**
     * Identifies the argument that specifies the event to be sent to Stream Deck as part of the registration procedure.
     */
    RegistrationParameter["RegisterEvent"] = "-registerEvent";
})(RegistrationParameter || (RegistrationParameter = {}));

/**
 * Defines the target of a request, i.e. whether the request should update the Stream Deck hardware, Stream Deck software (application), or both, when calling `setImage` and `setState`.
 */
var Target;
(function (Target) {
    /**
     * Hardware and software should be updated as part of the request.
     */
    Target[Target["HardwareAndSoftware"] = 0] = "HardwareAndSoftware";
    /**
     * Hardware only should be updated as part of the request.
     */
    Target[Target["Hardware"] = 1] = "Hardware";
    /**
     * Software only should be updated as part of the request.
     */
    Target[Target["Software"] = 2] = "Software";
})(Target || (Target = {}));

/**
 * Provides information for a version, as parsed from a string denoted as a collection of numbers separated by a period, for example `1.45.2`, `4.0.2.13098`. Parsing is opinionated
 * and strings should strictly conform to the format `{major}[.{minor}[.{patch}[.{build}]]]`; version numbers that form the version are optional, and when `undefined` will default to
 * 0, for example the `minor`, `patch`, or `build` number may be omitted.
 *
 * NB: This implementation should be considered fit-for-purpose, and should be used sparing.
 */
class Version {
    /**
     * Build version number.
     */
    build;
    /**
     * Major version number.
     */
    major;
    /**
     * Minor version number.
     */
    minor;
    /**
     * Patch version number.
     */
    patch;
    /**
     * Initializes a new instance of the {@link Version} class.
     * @param value Value to parse the version from.
     */
    constructor(value) {
        const result = value.match(/^(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?$/);
        if (result === null) {
            throw new Error(`Invalid format; expected "{major}[.{minor}[.{patch}[.{build}]]]" but was "${value}"`);
        }
        [, this.major, this.minor, this.patch, this.build] = [...result.map((value) => parseInt(value) || 0)];
    }
    /**
     * Compares this instance to the {@link other} {@link Version}.
     * @param other The {@link Version} to compare to.
     * @returns `-1` when this instance is less than the {@link other}, `1` when this instance is greater than {@link other}, otherwise `0`.
     */
    compareTo(other) {
        const segments = ({ major, minor, build, patch }) => [major, minor, build, patch];
        const thisSegments = segments(this);
        const otherSegments = segments(other);
        for (let i = 0; i < 4; i++) {
            if (thisSegments[i] < otherSegments[i]) {
                return -1;
            }
            else if (thisSegments[i] > otherSegments[i]) {
                return 1;
            }
        }
        return 0;
    }
    /** @inheritdoc */
    toString() {
        return `${this.major}.${this.minor}`;
    }
}

/**
 * Provides a {@link LogTarget} that logs to the console.
 */
class ConsoleTarget {
    /**
     * @inheritdoc
     */
    write(entry) {
        switch (entry.level) {
            case "error":
                console.error(...entry.data);
                break;
            case "warn":
                console.warn(...entry.data);
                break;
            default:
                console.log(...entry.data);
        }
    }
}

// Remove any dependencies on node.
const EOL = "\n";
/**
 * Creates a new string log entry formatter.
 * @param opts Options that defines the type for the formatter.
 * @returns The string {@link LogEntryFormatter}.
 */
function stringFormatter(opts) {
    {
        return (entry) => {
            const { data, level, scope } = entry;
            let prefix = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} `;
            if (scope) {
                prefix += `${scope}: `;
            }
            return `${prefix}${reduce(data)}`;
        };
    }
}
/**
 * Stringifies the provided data parameters that make up the log entry.
 * @param data Data parameters.
 * @returns The data represented as a single `string`.
 */
function reduce(data) {
    let result = "";
    let previousWasError = false;
    for (const value of data) {
        // When the value is an error, write the stack.
        if (typeof value === "object" && value instanceof Error) {
            result += `${EOL}${value.stack}`;
            previousWasError = true;
            continue;
        }
        // When the previous was an error, write a new line.
        if (previousWasError) {
            result += EOL;
            previousWasError = false;
        }
        result += typeof value === "object" ? JSON.stringify(value) : value;
        result += " ";
    }
    return result.trimEnd();
}

/* eslint-disable @typescript-eslint/sort-type-constituents */
/**
 * Gets the priority of the specified log level as a number; low numbers signify a higher priority.
 * @param level Log level.
 * @returns The priority as a number.
 */
function defcon(level) {
    switch (level) {
        case "error":
            return 0;
        case "warn":
            return 1;
        case "info":
            return 2;
        case "debug":
            return 3;
        case "trace":
        default:
            return 4;
    }
}

/**
 * Logger capable of forwarding messages to a {@link LogTarget}.
 */
class Logger {
    /**
     * Backing field for the {@link Logger.level}.
     */
    #level;
    /**
     * Options that define the loggers behavior.
     */
    #options;
    /**
     * Scope associated with this {@link Logger}.
     */
    #scope;
    /**
     * Initializes a new instance of the {@link Logger} class.
     * @param opts Options that define the loggers behavior.
     */
    constructor(opts) {
        this.#options = { minimumLevel: "trace", ...opts };
        this.#scope = this.#options.scope === undefined || this.#options.scope.trim() === "" ? "" : this.#options.scope;
        if (typeof this.#options.level !== "function") {
            this.setLevel(this.#options.level);
        }
    }
    /**
     * Gets the {@link LogLevel}.
     * @returns The {@link LogLevel}.
     */
    get level() {
        if (this.#level !== undefined) {
            return this.#level;
        }
        return typeof this.#options.level === "function" ? this.#options.level() : this.#options.level;
    }
    /**
     * Creates a scoped logger with the given {@link scope}; logs created by scoped-loggers include their scope to enable their source to be easily identified.
     * @param scope Value that represents the scope of the new logger.
     * @returns The scoped logger, or this instance when {@link scope} is not defined.
     */
    createScope(scope) {
        scope = scope.trim();
        if (scope === "") {
            return this;
        }
        return new Logger({
            ...this.#options,
            level: () => this.level,
            scope: this.#options.scope ? `${this.#options.scope}->${scope}` : scope,
        });
    }
    /**
     * Writes the arguments as a debug log entry.
     * @param data Message or data to log.
     * @returns This instance for chaining.
     */
    debug(...data) {
        return this.write({ level: "debug", data, scope: this.#scope });
    }
    /**
     * Writes the arguments as error log entry.
     * @param data Message or data to log.
     * @returns This instance for chaining.
     */
    error(...data) {
        return this.write({ level: "error", data, scope: this.#scope });
    }
    /**
     * Writes the arguments as an info log entry.
     * @param data Message or data to log.
     * @returns This instance for chaining.
     */
    info(...data) {
        return this.write({ level: "info", data, scope: this.#scope });
    }
    /**
     * Sets the log-level that determines which logs should be written. The specified level will be inherited by all scoped loggers unless they have log-level explicitly defined.
     * @param level The log-level that determines which logs should be written; when `undefined`, the level will be inherited from the parent logger, or default to the environment level.
     * @returns This instance for chaining.
     */
    setLevel(level) {
        if (level !== undefined && defcon(level) > defcon(this.#options.minimumLevel)) {
            this.#level = "info";
        }
        else {
            this.#level = level;
        }
        return this;
    }
    /**
     * Writes the arguments as a trace log entry.
     * @param data Message or data to log.
     * @returns This instance for chaining.
     */
    trace(...data) {
        return this.write({ level: "trace", data, scope: this.#scope });
    }
    /**
     * Writes the arguments as a warning log entry.
     * @param data Message or data to log.
     * @returns This instance for chaining.
     */
    warn(...data) {
        return this.write({ level: "warn", data, scope: this.#scope });
    }
    /**
     * Writes the log entry.
     * @param entry Log entry to write.
     * @returns This instance for chaining.
     */
    write(entry) {
        if (defcon(entry.level) <= defcon(this.level)) {
            this.#options.targets.forEach((t) => t.write(entry));
        }
        return this;
    }
}

/**
 * Provides a {@link LogTarget} capable of logging to a local file system.
 */
class FileTarget {
    /**
     * File path where logs will be written.
     */
    #filePath;
    /**
     * Options that defines how logs should be written to the local file system.
     */
    #options;
    /**
     * Current size of the logs that have been written to the {@link FileTarget.#filePath}.
     */
    #size = 0;
    /**
     * Initializes a new instance of the {@link FileTarget} class.
     * @param options Options that defines how logs should be written to the local file system.
     */
    constructor(options) {
        this.#options = options;
        this.#filePath = this.getLogFilePath();
        this.reIndex();
    }
    /**
     * @inheritdoc
     */
    write(entry) {
        const fd = fs.openSync(this.#filePath, "a");
        try {
            const msg = this.#options.format(entry);
            fs.writeSync(fd, msg + "\n");
            this.#size += msg.length;
        }
        finally {
            fs.closeSync(fd);
        }
        if (this.#size >= this.#options.maxSize) {
            this.reIndex();
            this.#size = 0;
        }
    }
    /**
     * Gets the file path to an indexed log file.
     * @param index Optional index of the log file to be included as part of the file name.
     * @returns File path that represents the indexed log file.
     */
    getLogFilePath(index = 0) {
        return path.join(this.#options.dest, `${this.#options.fileName}.${index}.log`);
    }
    /**
     * Gets the log files associated with this file target, including past and present.
     * @returns Log file entries.
     */
    getLogFiles() {
        const regex = /^\.(\d+)\.log$/;
        return fs
            .readdirSync(this.#options.dest, { withFileTypes: true })
            .reduce((prev, entry) => {
            if (entry.isDirectory() || entry.name.indexOf(this.#options.fileName) < 0) {
                return prev;
            }
            const match = entry.name.substring(this.#options.fileName.length).match(regex);
            if (match?.length !== 2) {
                return prev;
            }
            prev.push({
                path: path.join(this.#options.dest, entry.name),
                index: parseInt(match[1]),
            });
            return prev;
        }, [])
            .sort(({ index: a }, { index: b }) => {
            return a < b ? -1 : a > b ? 1 : 0;
        });
    }
    /**
     * Re-indexes the existing log files associated with this file target, removing old log files whose index exceeds the {@link FileTargetOptions.maxFileCount}, and renaming the
     * remaining log files, leaving index "0" free for a new log file.
     */
    reIndex() {
        // When the destination directory is new, create it, and return.
        if (!fs.existsSync(this.#options.dest)) {
            fs.mkdirSync(this.#options.dest);
            return;
        }
        const logFiles = this.getLogFiles();
        for (let i = logFiles.length - 1; i >= 0; i--) {
            const log = logFiles[i];
            if (i >= this.#options.maxFileCount - 1) {
                fs.rmSync(log.path);
            }
            else {
                fs.renameSync(log.path, this.getLogFilePath(i + 1));
            }
        }
    }
}

let __isDebugMode = undefined;
/**
 * Determines whether the current plugin is running in a debug environment; this is determined by the command-line arguments supplied to the plugin by Stream. Specifically, the result
 * is `true` when  either `--inspect`, `--inspect-brk` or `--inspect-port` are present as part of the processes' arguments.
 * @returns `true` when the plugin is running in debug mode; otherwise `false`.
 */
function isDebugMode() {
    if (__isDebugMode === undefined) {
        __isDebugMode = process.execArgv.some((arg) => {
            const name = arg.split("=")[0];
            return name === "--inspect" || name === "--inspect-brk" || name === "--inspect-port";
        });
    }
    return __isDebugMode;
}
/**
 * Gets the plugin's unique-identifier from the current working directory.
 * @returns The plugin's unique-identifier.
 */
function getPluginUUID() {
    const name = path.basename(process.cwd());
    const suffixIndex = name.lastIndexOf(".sdPlugin");
    return suffixIndex < 0 ? name : name.substring(0, suffixIndex);
}

// Log all entires to a log file.
const fileTarget = new FileTarget({
    dest: path.join(cwd(), "logs"),
    fileName: getPluginUUID(),
    format: stringFormatter(),
    maxFileCount: 10,
    maxSize: 50 * 1024 * 1024,
});
// Construct the log targets.
const targets = [fileTarget];
if (isDebugMode()) {
    targets.splice(0, 0, new ConsoleTarget());
}
/**
 * Logger responsible for capturing log messages.
 */
const logger = new Logger({
    level: isDebugMode() ? "debug" : "info",
    minimumLevel: isDebugMode() ? "trace" : "debug",
    targets,
});
process.once("uncaughtException", (err) => logger.error("Process encountered uncaught exception", err));

/**
 * Provides a connection between the plugin and the Stream Deck allowing for messages to be sent and received.
 */
class Connection extends EventEmitter$7 {
    /**
     * Private backing field for {@link Connection.registrationParameters}.
     */
    _registrationParameters;
    /**
     * Private backing field for {@link Connection.version}.
     */
    _version;
    /**
     * Used to ensure {@link Connection.connect} is invoked as a singleton; `false` when a connection is occurring or established.
     */
    canConnect = true;
    /**
     * Underlying web socket connection.
     */
    connection = withResolvers();
    /**
     * Logger scoped to the connection.
     */
    logger = logger.createScope("Connection");
    /**
     * Underlying connection information provided to the plugin to establish a connection with Stream Deck.
     * @returns The registration parameters.
     */
    get registrationParameters() {
        return (this._registrationParameters ??= this.getRegistrationParameters());
    }
    /**
     * Version of Stream Deck this instance is connected to.
     * @returns The version.
     */
    get version() {
        return (this._version ??= new Version(this.registrationParameters.info.application.version));
    }
    /**
     * Establishes a connection with the Stream Deck, allowing for the plugin to send and receive messages.
     * @returns A promise that is resolved when a connection has been established.
     */
    async connect() {
        // Ensure we only establish a single connection.
        if (this.canConnect) {
            this.canConnect = false;
            const webSocket = new WebSocket$1(`ws://127.0.0.1:${this.registrationParameters.port}`);
            webSocket.onmessage = (ev) => this.tryEmit(ev);
            webSocket.onopen = () => {
                webSocket.send(JSON.stringify({
                    event: this.registrationParameters.registerEvent,
                    uuid: this.registrationParameters.pluginUUID,
                }));
                // Web socket established a connection with the Stream Deck and the plugin was registered.
                this.connection.resolve(webSocket);
                this.emit("connected", this.registrationParameters.info);
            };
        }
        await this.connection.promise;
    }
    /**
     * Sends the commands to the Stream Deck, once the connection has been established and registered.
     * @param command Command being sent.
     * @returns `Promise` resolved when the command is sent to Stream Deck.
     */
    async send(command) {
        const connection = await this.connection.promise;
        const message = JSON.stringify(command);
        this.logger.trace(message);
        connection.send(message);
    }
    /**
     * Gets the registration parameters, provided by Stream Deck, that provide information to the plugin, including how to establish a connection.
     * @returns Parsed registration parameters.
     */
    getRegistrationParameters() {
        const params = {
            port: undefined,
            info: undefined,
            pluginUUID: undefined,
            registerEvent: undefined,
        };
        const scopedLogger = logger.createScope("RegistrationParameters");
        for (let i = 0; i < process.argv.length - 1; i++) {
            const param = process.argv[i];
            const value = process.argv[++i];
            switch (param) {
                case RegistrationParameter.Port:
                    scopedLogger.debug(`port=${value}`);
                    params.port = value;
                    break;
                case RegistrationParameter.PluginUUID:
                    scopedLogger.debug(`pluginUUID=${value}`);
                    params.pluginUUID = value;
                    break;
                case RegistrationParameter.RegisterEvent:
                    scopedLogger.debug(`registerEvent=${value}`);
                    params.registerEvent = value;
                    break;
                case RegistrationParameter.Info:
                    scopedLogger.debug(`info=${value}`);
                    params.info = JSON.parse(value);
                    break;
                default:
                    i--;
                    break;
            }
        }
        const invalidArgs = [];
        const validate = (name, value) => {
            if (value === undefined) {
                invalidArgs.push(name);
            }
        };
        validate(RegistrationParameter.Port, params.port);
        validate(RegistrationParameter.PluginUUID, params.pluginUUID);
        validate(RegistrationParameter.RegisterEvent, params.registerEvent);
        validate(RegistrationParameter.Info, params.info);
        if (invalidArgs.length > 0) {
            throw new Error(`Unable to establish a connection with Stream Deck, missing command line arguments: ${invalidArgs.join(", ")}`);
        }
        return params;
    }
    /**
     * Attempts to emit the {@link ev} that was received from the {@link Connection.connection}.
     * @param ev Event message data received from Stream Deck.
     */
    tryEmit(ev) {
        try {
            const message = JSON.parse(ev.data.toString());
            if (message.event) {
                this.logger.trace(ev.data.toString());
                this.emit(message.event, message);
            }
            else {
                this.logger.warn(`Received unknown message: ${ev.data}`);
            }
        }
        catch (err) {
            this.logger.error(`Failed to parse message: ${ev.data}`, err);
        }
    }
}
const connection = new Connection();

/**
 * Provides information for events received from Stream Deck.
 */
class Event {
    /**
     * Event that occurred.
     */
    type;
    /**
     * Initializes a new instance of the {@link Event} class.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(source) {
        this.type = source.event;
    }
}

/**
 * Provides information for an event relating to an action.
 */
class ActionWithoutPayloadEvent extends Event {
    action;
    /**
     * Initializes a new instance of the {@link ActionWithoutPayloadEvent} class.
     * @param action Action that raised the event.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(action, source) {
        super(source);
        this.action = action;
    }
}
/**
 * Provides information for an event relating to an action.
 */
class ActionEvent extends ActionWithoutPayloadEvent {
    /**
     * Provides additional information about the event that occurred, e.g. how many `ticks` the dial was rotated, the current `state` of the action, etc.
     */
    payload;
    /**
     * Initializes a new instance of the {@link ActionEvent} class.
     * @param action Action that raised the event.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(action, source) {
        super(action, source);
        this.payload = source.payload;
    }
}

const manifest$1 = new Lazy(() => {
    const path = join(process.cwd(), "manifest.json");
    if (!existsSync(path)) {
        throw new Error("Failed to read manifest.json as the file does not exist.");
    }
    try {
        return JSON.parse(readFileSync(path, {
            encoding: "utf-8",
            flag: "r",
        }).toString());
    }
    catch (e) {
        if (e instanceof SyntaxError) {
            return null;
        }
        else {
            throw e;
        }
    }
});
const softwareMinimumVersion = new Lazy(() => {
    if (manifest$1.value === null) {
        return null;
    }
    return new Version(manifest$1.value.Software.MinimumVersion);
});
/**
 * Gets the SDK version that the plugin requires.
 * @returns SDK version; otherwise `null` when the plugin is DRM protected.
 */
function getSDKVersion() {
    return manifest$1.value?.SDKVersion ?? null;
}
/**
 * Gets the minimum version that the plugin requires.
 * @returns Minimum required version; otherwise `null` when the plugin is DRM protected.
 */
function getSoftwareMinimumVersion() {
    return softwareMinimumVersion.value;
}
/**
 * Gets the manifest associated with the plugin.
 * @returns The manifest; otherwise `null` when the plugin is DRM protected.
 */
function getManifest() {
    return manifest$1.value;
}

const __items$1 = new Map();
/**
 * Provides a read-only store of Stream Deck devices.
 */
class ReadOnlyActionStore extends Enumerable {
    /**
     * Initializes a new instance of the {@link ReadOnlyActionStore}.
     */
    constructor() {
        super(__items$1);
    }
    /**
     * Gets the action with the specified identifier.
     * @param id Identifier of action to search for.
     * @returns The action, when present; otherwise `undefined`.
     */
    getActionById(id) {
        return __items$1.get(id);
    }
}
/**
 * Provides a store of Stream Deck actions.
 */
class ActionStore extends ReadOnlyActionStore {
    /**
     * Deletes the action from the store.
     * @param id The action's identifier.
     */
    delete(id) {
        __items$1.delete(id);
    }
    /**
     * Adds the action to the store.
     * @param action The action.
     */
    set(action) {
        __items$1.set(action.id, action);
    }
}
/**
 * Singleton instance of the action store.
 */
const actionStore = new ActionStore();

/**
 * Provides information for events relating to an application.
 */
class ApplicationEvent extends Event {
    /**
     * Monitored application that was launched/terminated.
     */
    application;
    /**
     * Initializes a new instance of the {@link ApplicationEvent} class.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(source) {
        super(source);
        this.application = source.payload.application;
    }
}

/**
 * Provides information for events relating to a device.
 */
class DeviceEvent extends Event {
    device;
    /**
     * Initializes a new instance of the {@link DeviceEvent} class.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     * @param device Device that event is associated with.
     */
    constructor(source, device) {
        super(source);
        this.device = device;
    }
}

/**
 * Event information received from Stream Deck as part of a deep-link message being routed to the plugin.
 */
class DidReceiveDeepLinkEvent extends Event {
    /**
     * Deep-link URL routed from Stream Deck.
     */
    url;
    /**
     * Initializes a new instance of the {@link DidReceiveDeepLinkEvent} class.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(source) {
        super(source);
        this.url = new DeepLinkURL(source.payload.url);
    }
}
const PREFIX = "streamdeck://";
/**
 * Provides information associated with a URL received as part of a deep-link message, conforming to the URI syntax defined within RFC-3986 (https://datatracker.ietf.org/doc/html/rfc3986#section-3).
 */
class DeepLinkURL {
    /**
     * Fragment of the URL, with the number sign (#) omitted. For example, a URL of "/test#heading" would result in a {@link DeepLinkURL.fragment} of "heading".
     */
    fragment;
    /**
     * Original URL. For example, a URL of "/test?one=two#heading" would result in a {@link DeepLinkURL.href} of "/test?one=two#heading".
     */
    href;
    /**
     * Path of the URL; the full URL with the query and fragment omitted. For example, a URL of "/test?one=two#heading" would result in a {@link DeepLinkURL.path} of "/test".
     */
    path;
    /**
     * Query of the URL, with the question mark (?) omitted. For example, a URL of "/test?name=elgato&key=123" would result in a {@link DeepLinkURL.query} of "name=elgato&key=123".
     * See also {@link DeepLinkURL.queryParameters}.
     */
    query;
    /**
     * Query string parameters parsed from the URL. See also {@link DeepLinkURL.query}.
     */
    queryParameters;
    /**
     * Initializes a new instance of the {@link DeepLinkURL} class.
     * @param url URL of the deep-link, with the schema and authority omitted.
     */
    constructor(url) {
        const refUrl = new URL(`${PREFIX}${url}`);
        this.fragment = refUrl.hash.substring(1);
        this.href = refUrl.href.substring(PREFIX.length);
        this.path = DeepLinkURL.parsePath(this.href);
        this.query = refUrl.search.substring(1);
        this.queryParameters = refUrl.searchParams;
    }
    /**
     * Parses the {@link DeepLinkURL.path} from the specified {@link href}.
     * @param href Partial URL that contains the path to parse.
     * @returns The path of the URL.
     */
    static parsePath(href) {
        const indexOf = (char) => {
            const index = href.indexOf(char);
            return index >= 0 ? index : href.length;
        };
        return href.substring(0, Math.min(indexOf("?"), indexOf("#")));
    }
}

/**
 * Provides event information for when the plugin received the global settings.
 */
class DidReceiveGlobalSettingsEvent extends Event {
    /**
     * Settings associated with the event.
     */
    settings;
    /**
     * Initializes a new instance of the {@link DidReceiveGlobalSettingsEvent} class.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(source) {
        super(source);
        this.settings = source.payload.settings;
    }
}

/**
 * Provides information for an event triggered by a message being sent to the plugin, from the property inspector.
 */
class SendToPluginEvent extends Event {
    action;
    /**
     * Payload sent from the property inspector.
     */
    payload;
    /**
     * Initializes a new instance of the {@link SendToPluginEvent} class.
     * @param action Action that raised the event.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(action, source) {
        super(source);
        this.action = action;
        this.payload = source.payload;
    }
}

/**
 * Validates the `SDKVersion` within the manifest fulfils the minimum required version for the specified
 * feature; when the version is not fulfilled, an error is thrown with the feature formatted into the message.
 * @param minimumVersion Minimum required SDKVersion.
 * @param feature Feature that requires the version.
 */
function requiresSDKVersion(minimumVersion, feature) {
    const sdkVersion = getSDKVersion();
    if (sdkVersion !== null && minimumVersion > sdkVersion) {
        throw new Error(`[ERR_NOT_SUPPORTED]: ${feature} requires manifest SDK version ${minimumVersion} or higher, but found version ${sdkVersion}; please update the "SDKVersion" in the plugin's manifest to ${minimumVersion} or higher.`);
    }
}
/**
 * Validates the {@link streamDeckVersion} and manifest's `Software.MinimumVersion` are at least the {@link minimumVersion};
 * when the version is not fulfilled, an error is thrown with the {@link feature} formatted into the message.
 * @param minimumVersion Minimum required version.
 * @param streamDeckVersion Actual application version.
 * @param feature Feature that requires the version.
 */
function requiresVersion(minimumVersion, streamDeckVersion, feature) {
    const required = {
        major: Math.floor(minimumVersion),
        minor: Number(minimumVersion.toString().split(".").at(1) ?? 0), // Account for JavaScript's floating point precision.
        patch: 0,
        build: 0,
    };
    if (streamDeckVersion.compareTo(required) === -1) {
        throw new Error(`[ERR_NOT_SUPPORTED]: ${feature} requires Stream Deck version ${required.major}.${required.minor} or higher, but current version is ${streamDeckVersion.major}.${streamDeckVersion.minor}; please update Stream Deck and the "Software.MinimumVersion" in the plugin's manifest to "${required.major}.${required.minor}" or higher.`);
    }
    const softwareMinimumVersion = getSoftwareMinimumVersion();
    if (softwareMinimumVersion !== null && softwareMinimumVersion.compareTo(required) === -1) {
        throw new Error(`[ERR_NOT_SUPPORTED]: ${feature} requires Stream Deck version ${required.major}.${required.minor} or higher; please update the "Software.MinimumVersion" in the plugin's manifest to "${required.major}.${required.minor}" or higher.`);
    }
}

let __useExperimentalMessageIdentifiers = false;
const settings = {
    /**
     * Available from Stream Deck 7.1; determines whether message identifiers should be sent when getting
     * action-instance or global settings.
     *
     * When `true`, the did-receive events associated with settings are only emitted when the action-instance
     * or global settings are changed in the property inspector.
     * @returns The value.
     */
    get useExperimentalMessageIdentifiers() {
        return __useExperimentalMessageIdentifiers;
    },
    /**
     * Available from Stream Deck 7.1; determines whether message identifiers should be sent when getting
     * action-instance or global settings.
     *
     * When `true`, the did-receive events associated with settings are only emitted when the action-instance
     * or global settings are changed in the property inspector.
     */
    set useExperimentalMessageIdentifiers(value) {
        requiresVersion(7.1, connection.version, "Message identifiers");
        __useExperimentalMessageIdentifiers = value;
    },
    /**
     * Gets the global settings associated with the plugin.
     * @template T The type of global settings associated with the plugin.
     * @returns Promise containing the plugin's global settings.
     */
    getGlobalSettings: () => {
        return new Promise((resolve) => {
            connection.once("didReceiveGlobalSettings", (ev) => resolve(ev.payload.settings));
            connection.send({
                event: "getGlobalSettings",
                context: connection.registrationParameters.pluginUUID,
                id: randomUUID(),
            });
        });
    },
    /**
     * Occurs when the global settings are requested, or when the the global settings were updated in
     * the property inspector.
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that removes the listener.
     */
    onDidReceiveGlobalSettings: (listener) => {
        return connection.disposableOn("didReceiveGlobalSettings", (ev) => {
            // Do nothing when the global settings were requested.
            if (settings.useExperimentalMessageIdentifiers && ev.id) {
                return;
            }
            listener(new DidReceiveGlobalSettingsEvent(ev));
        });
    },
    /**
     * Occurs when the settings associated with an action instance are requested, or when the the settings
     * were updated in the property inspector.
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that removes the listener.
     */
    onDidReceiveSettings: (listener) => {
        return connection.disposableOn("didReceiveSettings", (ev) => {
            // Do nothing when the action's settings were requested.
            if (settings.useExperimentalMessageIdentifiers && ev.id) {
                return;
            }
            const action = actionStore.getActionById(ev.context);
            if (action) {
                listener(new ActionEvent(action, ev));
            }
        });
    },
    /**
     * Sets the global settings associated the plugin; these settings are only available to this plugin,
     * and should be used to persist information securely.
     * @param settings Settings to save.
     * @example
     * streamDeck.settings.setGlobalSettings({
     *   apiKey,
     *   connectedDate: new Date()
     * })
     */
    setGlobalSettings: async (settings) => {
        await connection.send({
            event: "setGlobalSettings",
            context: connection.registrationParameters.pluginUUID,
            payload: settings,
        });
    },
};

/**
 * Controller capable of sending/receiving payloads with the property inspector, and listening for events.
 */
class UIController {
    /**
     * Action associated with the current property inspector.
     */
    #action;
    /**
     * To overcome event races, the debounce counter keeps track of appear vs disappear events, ensuring
     * we only clear the current ui when an equal number of matching disappear events occur.
     */
    #appearanceStackCount = 0;
    /**
     * Initializes a new instance of the {@link UIController} class.
     */
    constructor() {
        // Track the action for the current property inspector.
        this.onDidAppear((ev) => {
            if (this.#isCurrent(ev.action)) {
                this.#appearanceStackCount++;
            }
            else {
                this.#appearanceStackCount = 1;
                this.#action = ev.action;
            }
        });
        this.onDidDisappear((ev) => {
            if (this.#isCurrent(ev.action)) {
                this.#appearanceStackCount--;
                if (this.#appearanceStackCount <= 0) {
                    this.#action = undefined;
                }
            }
        });
    }
    /**
     * Gets the action associated with the current property.
     * @returns The action; otherwise `undefined` when a property inspector is not visible.
     */
    get action() {
        return this.#action;
    }
    /**
     * Occurs when the property inspector associated with the action becomes visible, i.e. the user
     * selected an action in the Stream Deck application..
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDidAppear(listener) {
        return connection.disposableOn("propertyInspectorDidAppear", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action) {
                listener(new ActionWithoutPayloadEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the property inspector associated with the action disappears, i.e. the user unselected
     * the action in the Stream Deck application.
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDidDisappear(listener) {
        return connection.disposableOn("propertyInspectorDidDisappear", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action) {
                listener(new ActionWithoutPayloadEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when a message was sent to the plugin _from_ the property inspector.
     * @template TPayload The type of the payload received from the property inspector.
     * @template TSettings The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onSendToPlugin(listener) {
        return connection.disposableOn("sendToPlugin", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action) {
                listener(new SendToPluginEvent(action, ev));
            }
        });
    }
    /**
     * Sends the payload to the property inspector; the payload is only sent when the property inspector
     * is visible for an action provided by this plugin.
     * @param payload Payload to send.
     */
    async sendToPropertyInspector(payload) {
        if (this.#action) {
            await connection.send({
                event: "sendToPropertyInspector",
                context: this.#action.id,
                payload,
            });
        }
    }
    /**
     * Determines whether the specified action is the action for the current property inspector.
     * @param action Action to check against.
     * @returns `true` when the actions are the same.
     */
    #isCurrent(action) {
        return (this.#action?.id === action.id &&
            this.#action?.manifestId === action.manifestId &&
            this.#action?.device?.id === action.device.id);
    }
}
const ui = new UIController();

const __items = new Map();
/**
 * Provides a read-only store of Stream Deck devices.
 */
class ReadOnlyDeviceStore extends Enumerable {
    /**
     * Initializes a new instance of the {@link ReadOnlyDeviceStore}.
     */
    constructor() {
        super(__items);
    }
    /**
     * Gets the Stream Deck {@link Device} associated with the specified {@link deviceId}.
     * @param deviceId Identifier of the Stream Deck device.
     * @returns The Stream Deck device information; otherwise `undefined` if a device with the {@link deviceId} does not exist.
     */
    getDeviceById(deviceId) {
        return __items.get(deviceId);
    }
}
/**
 * Provides a store of Stream Deck devices.
 */
class DeviceStore extends ReadOnlyDeviceStore {
    /**
     * Adds the device to the store.
     * @param device The device.
     */
    set(device) {
        __items.set(device.id, device);
    }
}
/**
 * Singleton instance of the device store.
 */
const deviceStore = new DeviceStore();

/**
 * Provides information about an instance of a Stream Deck action.
 */
class ActionContext {
    /**
     * Device the action is associated with.
     */
    #device;
    /**
     * Source of the action.
     */
    #source;
    /**
     * Initializes a new instance of the {@link ActionContext} class.
     * @param source Source of the action.
     */
    constructor(source) {
        this.#source = source;
        const device = deviceStore.getDeviceById(source.device);
        if (!device) {
            throw new Error(`Failed to initialize action; device ${source.device} not found`);
        }
        this.#device = device;
    }
    /**
     * Type of the action.
     * - `Keypad` is a key.
     * - `Encoder` is a dial and portion of the touch strip.
     * @returns Controller type.
     */
    get controllerType() {
        return this.#source.payload.controller;
    }
    /**
     * Stream Deck device the action is positioned on.
     * @returns Stream Deck device.
     */
    get device() {
        return this.#device;
    }
    /**
     * Action instance identifier.
     * @returns Identifier.
     */
    get id() {
        return this.#source.context;
    }
    /**
     * Manifest identifier (UUID) for this action type.
     * @returns Manifest identifier.
     */
    get manifestId() {
        return this.#source.action;
    }
    /**
     * Converts this instance to a serializable object.
     * @returns The serializable object.
     */
    toJSON() {
        return {
            controllerType: this.controllerType,
            device: this.device,
            id: this.id,
            manifestId: this.manifestId,
        };
    }
}

const REQUEST_TIMEOUT = 15 * 1000; // 15s
/**
 * Provides a contextualized instance of an {@link Action}, allowing for direct communication with the Stream Deck.
 * @template T The type of settings associated with the action.
 */
class Action extends ActionContext {
    /**
     * Gets the resources (files) associated with this action; these resources are embedded into the
     * action when it is exported, either individually, or as part of a profile.
     *
     * Available from Stream Deck 7.1.
     * @returns The resources.
     */
    async getResources() {
        requiresVersion(7.1, connection.version, "getResources");
        const res = await this.#fetch("getResources", "didReceiveResources");
        return res.payload.resources;
    }
    /**
     * Gets the settings associated this action instance.
     * @template U The type of settings associated with the action.D
     * @returns Promise containing the action instance's settings.
     */
    async getSettings() {
        const res = await this.#fetch("getSettings", "didReceiveSettings");
        return res.payload.settings;
    }
    /**
     * Determines whether this instance is a dial.
     * @returns `true` when this instance is a dial; otherwise `false`.
     */
    isDial() {
        return this.controllerType === "Encoder";
    }
    /**
     * Determines whether this instance is a key.
     * @returns `true` when this instance is a key; otherwise `false`.
     */
    isKey() {
        return this.controllerType === "Keypad";
    }
    /**
     * Sets the resources (files) associated with this action; these resources are embedded into the
     * action when it is exported, either individually, or as part of a profile.
     *
     * Available from Stream Deck 7.1.
     * @example
     * action.setResources({
     *   fileOne: "c:\\hello-world.txt",
     *   anotherFile: "c:\\icon.png"
     * });
     * @param resources The resources as a map of file paths.
     * @returns `Promise` resolved when the resources are saved to Stream Deck.
     */
    setResources(resources) {
        requiresVersion(7.1, connection.version, "setResources");
        return connection.send({
            event: "setResources",
            context: this.id,
            payload: resources,
        });
    }
    /**
     * Sets the {@link settings} associated with this action instance. Use in conjunction with {@link Action.getSettings}.
     * @param settings Settings to persist.
     * @returns `Promise` resolved when the {@link settings} are sent to Stream Deck.
     */
    setSettings(settings) {
        return connection.send({
            event: "setSettings",
            context: this.id,
            payload: settings,
        });
    }
    /**
     * Temporarily shows an alert (i.e. warning), in the form of an exclamation mark in a yellow triangle, on this action instance. Used to provide visual feedback when an action failed.
     * @returns `Promise` resolved when the request to show an alert has been sent to Stream Deck.
     */
    showAlert() {
        return connection.send({
            event: "showAlert",
            context: this.id,
        });
    }
    /**
     * Fetches information from Stream Deck by sending the command, and awaiting the event.
     * @param command Name of the event (command) to send.
     * @param event Name of the event to await.
     * @returns The payload from the received event.
     */
    async #fetch(command, event) {
        const { resolve, reject, promise } = withResolvers();
        // Set a timeout to prevent endless awaiting.
        const timeoutId = setTimeout(() => {
            listener.dispose();
            reject("The request timed out");
        }, REQUEST_TIMEOUT);
        // Listen for an event that can resolve the request.
        const listener = connection.disposableOn(event, (ev) => {
            // Make sure the received event is for this action.
            if (ev.context == this.id) {
                clearTimeout(timeoutId);
                listener.dispose();
                resolve(ev);
            }
        });
        // Send the request; specifying an id signifies its a request.
        await connection.send({
            event: command,
            context: this.id,
            id: randomUUID(),
        });
        return promise;
    }
}

/**
 * Provides a contextualized instance of a dial action.
 * @template T The type of settings associated with the action.
 */
class DialAction extends Action {
    /**
     * Private backing field for {@link DialAction.coordinates}.
     */
    #coordinates;
    /**
     * Initializes a new instance of the {@see DialAction} class.
     * @param source Source of the action.
     */
    constructor(source) {
        super(source);
        if (source.payload.controller !== "Encoder") {
            throw new Error("Unable to create DialAction; source event is not a Encoder");
        }
        this.#coordinates = Object.freeze(source.payload.coordinates);
    }
    /**
     * Coordinates of the dial.
     * @returns The coordinates.
     */
    get coordinates() {
        return this.#coordinates;
    }
    /**
     * Sets the feedback for the current layout associated with this action instance, allowing for the visual items to be updated. Layouts are a powerful way to provide dynamic information
     * to users, and can be assigned in the manifest, or dynamically via {@link Action.setFeedbackLayout}.
     *
     * The {@link feedback} payload defines which items within the layout will be updated, and are identified by their property name (defined as the `key` in the layout's definition).
     * The values can either by a complete new definition, a `string` for layout item types of `text` and `pixmap`, or a `number` for layout item types of `bar` and `gbar`.
     * @param feedback Object containing information about the layout items to be updated.
     * @returns `Promise` resolved when the request to set the {@link feedback} has been sent to Stream Deck.
     */
    setFeedback(feedback) {
        return connection.send({
            event: "setFeedback",
            context: this.id,
            payload: feedback,
        });
    }
    /**
     * Sets the layout associated with this action instance. The layout must be either a built-in layout identifier, or path to a local layout JSON file within the plugin's folder.
     * Use in conjunction with {@link Action.setFeedback} to update the layout's current items' settings.
     * @param layout Name of a pre-defined layout, or relative path to a custom one.
     * @returns `Promise` resolved when the new layout has been sent to Stream Deck.
     */
    setFeedbackLayout(layout) {
        return connection.send({
            event: "setFeedbackLayout",
            context: this.id,
            payload: {
                layout,
            },
        });
    }
    /**
     * Sets the {@link image} to be display for this action instance within Stream Deck app.
     *
     * NB: The image can only be set by the plugin when the the user has not specified a custom image.
     * @param image Image to display; this can be either a path to a local file within the plugin's folder, a base64 encoded `string` with the mime type declared (e.g. PNG, JPEG, etc.),
     * or an SVG `string`. When `undefined`, the image from the manifest will be used.
     * @returns `Promise` resolved when the request to set the {@link image} has been sent to Stream Deck.
     */
    setImage(image) {
        return connection.send({
            event: "setImage",
            context: this.id,
            payload: {
                image,
            },
        });
    }
    /**
     * Sets the {@link title} displayed for this action instance.
     *
     * NB: The title can only be set by the plugin when the the user has not specified a custom title.
     * @param title Title to display.
     * @returns `Promise` resolved when the request to set the {@link title} has been sent to Stream Deck.
     */
    setTitle(title) {
        return this.setFeedback({ title });
    }
    /**
     * Sets the trigger (interaction) {@link descriptions} associated with this action instance. Descriptions are shown within the Stream Deck application, and informs the user what
     * will happen when they interact with the action, e.g. rotate, touch, etc. When {@link descriptions} is `undefined`, the descriptions will be reset to the values provided as part
     * of the manifest.
     *
     * NB: Applies to encoders (dials / touchscreens) found on Stream Deck + devices.
     * @param descriptions Descriptions that detail the action's interaction.
     * @returns `Promise` resolved when the request to set the {@link descriptions} has been sent to Stream Deck.
     */
    setTriggerDescription(descriptions) {
        return connection.send({
            event: "setTriggerDescription",
            context: this.id,
            payload: descriptions || {},
        });
    }
    /**
     * @inheritdoc
     */
    toJSON() {
        return {
            ...super.toJSON(),
            coordinates: this.coordinates,
        };
    }
}

/**
 * Provides a contextualized instance of a key action.
 * @template T The type of settings associated with the action.
 */
class KeyAction extends Action {
    /**
     * Private backing field for {@link KeyAction.coordinates}.
     */
    #coordinates;
    /**
     * Source of the action.
     */
    #source;
    /**
     * Initializes a new instance of the {@see KeyAction} class.
     * @param source Source of the action.
     */
    constructor(source) {
        super(source);
        if (source.payload.controller !== "Keypad") {
            throw new Error("Unable to create KeyAction; source event is not a Keypad");
        }
        this.#coordinates = !source.payload.isInMultiAction ? Object.freeze(source.payload.coordinates) : undefined;
        this.#source = source;
    }
    /**
     * Coordinates of the key; otherwise `undefined` when the action is part of a multi-action.
     * @returns The coordinates.
     */
    get coordinates() {
        return this.#coordinates;
    }
    /**
     * Determines whether the key is part of a multi-action.
     * @returns `true` when in a multi-action; otherwise `false`.
     */
    isInMultiAction() {
        return this.#source.payload.isInMultiAction;
    }
    /**
     * Sets the {@link image} to be display for this action instance.
     *
     * NB: The image can only be set by the plugin when the the user has not specified a custom image.
     * @param image Image to display; this can be either a path to a local file within the plugin's folder, a base64 encoded `string` with the mime type declared (e.g. PNG, JPEG, etc.),
     * or an SVG `string`. When `undefined`, the image from the manifest will be used.
     * @param options Additional options that define where and how the image should be rendered.
     * @returns `Promise` resolved when the request to set the {@link image} has been sent to Stream Deck.
     */
    setImage(image, options) {
        return connection.send({
            event: "setImage",
            context: this.id,
            payload: {
                image,
                ...options,
            },
        });
    }
    /**
     * Sets the current {@link state} of this action instance; only applies to actions that have multiple states defined within the manifest.
     * @param state State to set; this be either 0, or 1.
     * @returns `Promise` resolved when the request to set the state of an action instance has been sent to Stream Deck.
     */
    setState(state) {
        return connection.send({
            event: "setState",
            context: this.id,
            payload: {
                state,
            },
        });
    }
    /**
     * Sets the {@link title} displayed for this action instance.
     *
     * NB: The title can only be set by the plugin when the the user has not specified a custom title.
     * @param title Title to display; when `undefined` the title within the manifest will be used.
     * @param options Additional options that define where and how the title should be rendered.
     * @returns `Promise` resolved when the request to set the {@link title} has been sent to Stream Deck.
     */
    setTitle(title, options) {
        return connection.send({
            event: "setTitle",
            context: this.id,
            payload: {
                title,
                ...options,
            },
        });
    }
    /**
     * Temporarily shows an "OK" (i.e. success), in the form of a check-mark in a green circle, on this action instance. Used to provide visual feedback when an action successfully
     * executed.
     * @returns `Promise` resolved when the request to show an "OK" has been sent to Stream Deck.
     */
    showOk() {
        return connection.send({
            event: "showOk",
            context: this.id,
        });
    }
    /**
     * @inheritdoc
     */
    toJSON() {
        return {
            ...super.toJSON(),
            coordinates: this.coordinates,
            isInMultiAction: this.isInMultiAction(),
        };
    }
}

const manifest = new Lazy(() => getManifest());
/**
 * Provides functions, and information, for interacting with Stream Deck actions.
 */
class ActionService extends ReadOnlyActionStore {
    /**
     * Initializes a new instance of the {@link ActionService} class.
     */
    constructor() {
        super();
        // Adds the action to the store.
        connection.prependListener("willAppear", (ev) => {
            const action = ev.payload.controller === "Encoder" ? new DialAction(ev) : new KeyAction(ev);
            actionStore.set(action);
        });
        // Remove the action from the store.
        connection.prependListener("willDisappear", (ev) => actionStore.delete(ev.context));
    }
    /**
     * Occurs when the user presses a dial (Stream Deck +).
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDialDown(listener) {
        return connection.disposableOn("dialDown", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action?.isDial()) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the user rotates a dial (Stream Deck +).
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDialRotate(listener) {
        return connection.disposableOn("dialRotate", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action?.isDial()) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the user releases a pressed dial (Stream Deck +).
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDialUp(listener) {
        return connection.disposableOn("dialUp", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action?.isDial()) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the resources were updated within the property inspector.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDidReceiveResources(listener) {
        return connection.disposableOn("didReceiveResources", (ev) => {
            // When the id is defined, the resources were requested, so we don't propagate the event.
            if (ev.id !== undefined) {
                return;
            }
            const action = actionStore.getActionById(ev.context);
            if (action) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the user presses a action down.
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onKeyDown(listener) {
        return connection.disposableOn("keyDown", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action?.isKey()) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the user releases a pressed action.
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onKeyUp(listener) {
        return connection.disposableOn("keyUp", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action?.isKey()) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the user updates an action's title settings in the Stream Deck application. See also {@link Action.setTitle}.
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onTitleParametersDidChange(listener) {
        return connection.disposableOn("titleParametersDidChange", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the user taps the touchscreen (Stream Deck +).
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onTouchTap(listener) {
        return connection.disposableOn("touchTap", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action?.isDial()) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when an action appears on the Stream Deck due to the user navigating to another page, profile, folder, etc. This also occurs during startup if the action is on the "front
     * page". An action refers to _all_ types of actions, e.g. keys, dials,
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onWillAppear(listener) {
        return connection.disposableOn("willAppear", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when an action disappears from the Stream Deck due to the user navigating to another page, profile, folder, etc. An action refers to _all_ types of actions, e.g. keys,
     * dials, touchscreens, pedals, etc.
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onWillDisappear(listener) {
        return connection.disposableOn("willDisappear", (ev) => listener(new ActionEvent(new ActionContext(ev), ev)));
    }
    /**
     * Registers the action with the Stream Deck, routing all events associated with the {@link SingletonAction.manifestId} to the specified {@link action}.
     * @param action The action to register.
     * @example
     * ＠action({ UUID: "com.elgato.test.action" })
     * class MyCustomAction extends SingletonAction {
     *     export function onKeyDown(ev: KeyDownEvent) {
     *         // Do some awesome thing.
     *     }
     * }
     *
     * streamDeck.actions.registerAction(new MyCustomAction());
     */
    registerAction(action) {
        if (action.manifestId === undefined) {
            throw new Error("The action's manifestId cannot be undefined.");
        }
        if (manifest.value !== null && !manifest.value.Actions.some((a) => a.UUID === action.manifestId)) {
            throw new Error(`The action's manifestId was not found within the manifest: ${action.manifestId}`);
        }
        // Routes an event to the action, when the applicable listener is defined on the action.
        const { manifestId } = action;
        const route = (fn, listener) => {
            const boundedListener = listener?.bind(action);
            if (boundedListener === undefined) {
                return;
            }
            fn.bind(action)(async (ev) => {
                if (ev.action.manifestId == manifestId) {
                    await boundedListener(ev);
                }
            });
        };
        // Route each of the action events.
        route(this.onDialDown, action.onDialDown);
        route(this.onDialUp, action.onDialUp);
        route(this.onDialRotate, action.onDialRotate);
        route(ui.onSendToPlugin, action.onSendToPlugin);
        route(this.onDidReceiveResources, action.onDidReceiveResources);
        route(settings.onDidReceiveSettings, action.onDidReceiveSettings);
        route(this.onKeyDown, action.onKeyDown);
        route(this.onKeyUp, action.onKeyUp);
        route(ui.onDidAppear, action.onPropertyInspectorDidAppear);
        route(ui.onDidDisappear, action.onPropertyInspectorDidDisappear);
        route(this.onTitleParametersDidChange, action.onTitleParametersDidChange);
        route(this.onTouchTap, action.onTouchTap);
        route(this.onWillAppear, action.onWillAppear);
        route(this.onWillDisappear, action.onWillDisappear);
    }
}
/**
 * Service for interacting with Stream Deck actions.
 */
const actionService = new ActionService();

/**
 * Provides information about a device.
 */
class Device {
    /**
     * Private backing field for {@link Device.isConnected}.
     */
    #isConnected = false;
    /**
     * Private backing field for the device's information.
     */
    #info;
    /**
     * Unique identifier of the device.
     */
    id;
    /**
     * Initializes a new instance of the {@link Device} class.
     * @param id Device identifier.
     * @param info Information about the device.
     * @param isConnected Determines whether the device is connected.
     */
    constructor(id, info, isConnected) {
        this.id = id;
        this.#info = info;
        this.#isConnected = isConnected;
        // Set connected.
        connection.prependListener("deviceDidConnect", (ev) => {
            if (ev.device === this.id) {
                this.#info = ev.deviceInfo;
                this.#isConnected = true;
            }
        });
        // Track changes.
        connection.prependListener("deviceDidChange", (ev) => {
            if (ev.device === this.id) {
                this.#info = ev.deviceInfo;
            }
        });
        // Set disconnected.
        connection.prependListener("deviceDidDisconnect", (ev) => {
            if (ev.device === this.id) {
                this.#isConnected = false;
            }
        });
    }
    /**
     * Actions currently visible on the device.
     * @returns Collection of visible actions.
     */
    get actions() {
        return actionStore.filter((a) => a.device.id === this.id);
    }
    /**
     * Determines whether the device is currently connected.
     * @returns `true` when the device is connected; otherwise `false`.
     */
    get isConnected() {
        return this.#isConnected;
    }
    /**
     * Name of the device, as specified by the user in the Stream Deck application.
     * @returns Name of the device.
     */
    get name() {
        return this.#info.name;
    }
    /**
     * Number of action slots, excluding dials / touchscreens, available to the device.
     * @returns Size of the device.
     */
    get size() {
        return this.#info.size;
    }
    /**
     * Type of the device that was connected, e.g. Stream Deck +, Stream Deck Pedal, etc. See {@link DeviceType}.
     * @returns Type of the device.
     */
    get type() {
        return this.#info.type;
    }
}

/**
 * Provides functions, and information, for interacting with Stream Deck actions.
 */
class DeviceService extends ReadOnlyDeviceStore {
    /**
     * Initializes a new instance of the {@link DeviceService}.
     */
    constructor() {
        super();
        // Add the devices from registration parameters.
        connection.once("connected", (info) => {
            info.devices.forEach((dev) => deviceStore.set(new Device(dev.id, dev, false)));
        });
        // Add new devices that were connected.
        connection.on("deviceDidConnect", ({ device: id, deviceInfo }) => {
            if (!deviceStore.getDeviceById(id)) {
                deviceStore.set(new Device(id, deviceInfo, true));
            }
        });
        // Add new devices that were changed (Virtual Stream Deck event race).
        connection.on("deviceDidChange", ({ device: id, deviceInfo }) => {
            if (!deviceStore.getDeviceById(id)) {
                deviceStore.set(new Device(id, deviceInfo, false));
            }
        });
    }
    /**
     * Occurs when a Stream Deck device changed, for example its name or size.
     *
     * Available from Stream Deck 7.0.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDeviceDidChange(listener) {
        requiresVersion(7.0, connection.version, "onDeviceDidChange");
        return connection.disposableOn("deviceDidChange", (ev) => listener(new DeviceEvent(ev, this.getDeviceById(ev.device))));
    }
    /**
     * Occurs when a Stream Deck device is connected. See also {@link DeviceService.onDeviceDidConnect}.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDeviceDidConnect(listener) {
        return connection.disposableOn("deviceDidConnect", (ev) => listener(new DeviceEvent(ev, this.getDeviceById(ev.device))));
    }
    /**
     * Occurs when a Stream Deck device is disconnected. See also {@link DeviceService.onDeviceDidDisconnect}.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDeviceDidDisconnect(listener) {
        return connection.disposableOn("deviceDidDisconnect", (ev) => listener(new DeviceEvent(ev, this.getDeviceById(ev.device))));
    }
}
/**
 * Provides functions, and information, for interacting with Stream Deck actions.
 */
const deviceService = new DeviceService();

/**
 * Loads a locale from the file system.
 * @param language Language to load.
 * @returns Contents of the locale.
 */
function fileSystemLocaleProvider(language) {
    const filePath = path.join(process.cwd(), `${language}.json`);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    try {
        // Parse the translations from the file.
        const contents = fs.readFileSync(filePath, { flag: "r" })?.toString();
        return parseLocalizations(contents);
    }
    catch (err) {
        logger.error(`Failed to load translations from ${filePath}`, err);
        return null;
    }
}
/**
 * Parses the localizations from the specified contents, or throws a `TypeError` when unsuccessful.
 * @param contents Contents that represent the stringified JSON containing the localizations.
 * @returns The localizations; otherwise a `TypeError`.
 */
function parseLocalizations(contents) {
    const json = JSON.parse(contents);
    if (json !== undefined && json !== null && typeof json === "object" && "Localization" in json) {
        return json["Localization"];
    }
    throw new TypeError(`Translations must be a JSON object nested under a property named "Localization"`);
}

/**
 * Requests the Stream Deck switches the current profile of the specified {@link deviceId} to the {@link profile}; when no {@link profile} is provided the previously active profile
 * is activated.
 *
 * NB: Plugins may only switch to profiles distributed with the plugin, as defined within the manifest, and cannot access user-defined profiles.
 * @param deviceId Unique identifier of the device where the profile should be set.
 * @param profile Optional name of the profile to switch to; when `undefined` the previous profile will be activated. Name must be identical to the one provided in the manifest.
 * @param page Optional page to show when switching to the {@link profile}, indexed from 0. When `undefined`, the page that was previously visible (when switching away from the
 * profile) will be made visible.
 * @returns `Promise` resolved when the request to switch the `profile` has been sent to Stream Deck.
 */
function switchToProfile(deviceId, profile, page) {
    if (page !== undefined) {
        requiresVersion(6.5, connection.version, "Switching to a profile page");
    }
    return connection.send({
        event: "switchToProfile",
        context: connection.registrationParameters.pluginUUID,
        device: deviceId,
        payload: {
            page,
            profile,
        },
    });
}

var profiles = /*#__PURE__*/Object.freeze({
    __proto__: null,
    switchToProfile: switchToProfile
});

/**
 * Occurs when a monitored application is launched. Monitored applications can be defined in the manifest via the {@link Manifest.ApplicationsToMonitor} property.
 * See also {@link onApplicationDidTerminate}.
 * @param listener Function to be invoked when the event occurs.
 * @returns A disposable that, when disposed, removes the listener.
 */
function onApplicationDidLaunch(listener) {
    return connection.disposableOn("applicationDidLaunch", (ev) => listener(new ApplicationEvent(ev)));
}
/**
 * Occurs when a monitored application terminates. Monitored applications can be defined in the manifest via the {@link Manifest.ApplicationsToMonitor} property.
 * See also {@link onApplicationDidLaunch}.
 * @param listener Function to be invoked when the event occurs.
 * @returns A disposable that, when disposed, removes the listener.
 */
function onApplicationDidTerminate(listener) {
    return connection.disposableOn("applicationDidTerminate", (ev) => listener(new ApplicationEvent(ev)));
}
/**
 * Occurs when a deep-link message is routed to the plugin from Stream Deck. One-way deep-link messages can be sent to plugins from external applications using the URL format
 * `streamdeck://plugins/message/<PLUGIN_UUID>/{MESSAGE}`.
 * @param listener Function to be invoked when the event occurs.
 * @returns A disposable that, when disposed, removes the listener.
 */
function onDidReceiveDeepLink(listener) {
    requiresVersion(6.5, connection.version, "Receiving deep-link messages");
    return connection.disposableOn("didReceiveDeepLink", (ev) => listener(new DidReceiveDeepLinkEvent(ev)));
}
/**
 * Occurs when the computer wakes up.
 * @param listener Function to be invoked when the event occurs.
 * @returns A disposable that, when disposed, removes the listener.
 */
function onSystemDidWakeUp(listener) {
    return connection.disposableOn("systemDidWakeUp", (ev) => listener(new Event(ev)));
}
/**
 * Opens the specified `url` in the user's default browser.
 * @param url URL to open.
 * @returns `Promise` resolved when the request to open the `url` has been sent to Stream Deck.
 */
function openUrl(url) {
    return connection.send({
        event: "openUrl",
        payload: {
            url,
        },
    });
}
/**
 * Gets the secrets associated with the plugin.
 * @returns `Promise` resolved with the secrets associated with the plugin.
 */
function getSecrets() {
    requiresVersion(6.9, connection.version, "Secrets");
    requiresSDKVersion(3, "Secrets");
    return new Promise((resolve) => {
        connection.once("didReceiveSecrets", (ev) => resolve(ev.payload.secrets));
        connection.send({
            event: "getSecrets",
            context: connection.registrationParameters.pluginUUID,
        });
    });
}

var system = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getSecrets: getSecrets,
    onApplicationDidLaunch: onApplicationDidLaunch,
    onApplicationDidTerminate: onApplicationDidTerminate,
    onDidReceiveDeepLink: onDidReceiveDeepLink,
    onSystemDidWakeUp: onSystemDidWakeUp,
    openUrl: openUrl
});

/**
 * Defines a Stream Deck action associated with the plugin.
 * @param definition The definition of the action, e.g. it's identifier, name, etc.
 * @returns The definition decorator.
 */
function action(definition) {
    const manifestId = definition.UUID;
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars
    return function (target, context) {
        return class extends target {
            /**
             * The universally-unique value that identifies the action within the manifest.
             */
            manifestId = manifestId;
        };
    };
}

/**
 * Provides the main bridge between the plugin and the Stream Deck allowing the plugin to send requests and receive events, e.g. when the user presses an action.
 * @template T The type of settings associated with the action.
 */
class SingletonAction {
    /**
     * The universally-unique value that identifies the action within the manifest.
     */
    manifestId;
    /**
     * Gets the visible actions with the `manifestId` that match this instance's.
     * @returns The visible actions.
     */
    get actions() {
        return actionStore.filter((a) => a.manifestId === this.manifestId);
    }
}

let i18n;
const streamDeck = {
    /**
     * Namespace for event listeners and functionality relating to Stream Deck actions.
     * @returns Actions namespace.
     */
    get actions() {
        return actionService;
    },
    /**
     * Namespace for interacting with Stream Deck devices.
     * @returns Devices namespace.
     */
    get devices() {
        return deviceService;
    },
    /**
     * Internalization provider, responsible for managing localizations and translating resources.
     * @returns Internalization provider.
     */
    get i18n() {
        return (i18n ??= new I18nProvider(this.info.application.language, fileSystemLocaleProvider));
    },
    /**
     * Registration and application information provided by Stream Deck during initialization.
     * @returns Registration information.
     */
    get info() {
        return connection.registrationParameters.info;
    },
    /**
     * Logger responsible for capturing log messages.
     * @returns The logger.
     */
    get logger() {
        return logger;
    },
    /**
     * Namespace for Stream Deck profiles.
     * @returns Profiles namespace.
     */
    get profiles() {
        return profiles;
    },
    /**
     * Namespace for persisting settings within Stream Deck.
     * @returns Settings namespace.
     */
    get settings() {
        return settings;
    },
    /**
     * Namespace for interacting with, and receiving events from, the system the plugin is running on.
     * @returns System namespace.
     */
    get system() {
        return system;
    },
    /**
     * Namespace for interacting with UI (property inspector) associated with the plugin.
     * @returns UI namespace.
     */
    get ui() {
        return ui;
    },
    /**
     * Connects the plugin to the Stream Deck.
     * @returns A promise resolved when a connection has been established.
     */
    connect() {
        return connection.connect();
    },
};

/**
 * Minimal HTTP server extracted from BridgeServer.
 * Handles hook callbacks from Claude Code — no WebSocket needed
 * since the plugin runs inside the Stream Deck process.
 */
class HookServer {
    _port;
    _host;
    _server = null;
    _routes = new Map();
    constructor(options = {}) {
        this._port = options.port || 8247;
        this._host = options.host || "127.0.0.1";
    }
    get port() {
        return this._port;
    }
    get host() {
        return this._host;
    }
    /**
     * Register an HTTP route handler.
     */
    route(method, path, handler) {
        this._routes.set(`${method.toUpperCase()} ${path}`, handler);
    }
    /**
     * Start the HTTP server.
     */
    start() {
        return new Promise((resolve, reject) => {
            this._server = require$$2.createServer((req, res) => this._handleRequest(req, res));
            this._server.listen(this._port, this._host, () => {
                resolve();
            });
            this._server.on("error", reject);
        });
    }
    /**
     * Stop the HTTP server.
     */
    stop() {
        return new Promise((resolve) => {
            if (this._server) {
                const server = this._server;
                this._server = null;
                server.close(() => resolve());
            }
            else {
                resolve();
            }
        });
    }
    _handleRequest(req, res) {
        const urlPath = (req.url || "").split("?")[0];
        const key = `${req.method} ${urlPath}`;
        const handler = this._routes.get(key);
        // CORS
        res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }
        if (handler) {
            this._parseBody(req, (body) => {
                handler(req, res, body);
            });
            return;
        }
        // Default status endpoint
        if (req.url === "/status" && req.method === "GET") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok", plugin: "com.claude.code-control" }));
            return;
        }
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not found" }));
    }
    _parseBody(req, callback) {
        let body = "";
        req.on("data", (chunk) => (body += chunk.toString()));
        req.on("end", () => {
            try {
                callback(body ? JSON.parse(body) : null);
            }
            catch {
                callback(null);
            }
        });
    }
}

/**
 * BridgeFacade — Adapter that implements the BridgeServer interface
 * expected by HookReceiver, InfobarManager, and other existing modules.
 *
 * Instead of broadcasting over WebSocket, it emits events that PluginCore
 * translates into SDK calls (setImage, setFeedback, etc.).
 */
class BridgeFacade extends EventEmitter$8 {
    _hookServer;
    _state;
    constructor(hookServer) {
        super();
        this._hookServer = hookServer;
        this._state = {
            claudeStatus: "idle",
            lastEvent: null,
            buttons: {},
        };
    }
    /**
     * Register an HTTP route — delegates to HookServer.
     * This is called by HookReceiver._registerRoutes().
     */
    route(method, path, handler) {
        this._hookServer.route(method, path, handler);
    }
    /**
     * Broadcast a message. Instead of sending over WebSocket,
     * emits a local event that PluginCore listens to.
     */
    broadcast(type, data) {
        this.emit("broadcast", { type, data });
    }
    /**
     * Update shared state and emit broadcast.
     */
    updateState(patch) {
        Object.assign(this._state, patch);
        this.broadcast("state:update", { patch });
    }
    /**
     * Update a specific button's visual state.
     */
    updateButton(buttonId, state) {
        this._state.buttons[buttonId] = {
            ...this._state.buttons[buttonId],
            ...state,
        };
        this.broadcast("button:update", { buttonId, state });
    }
    /**
     * Get current state (for status queries).
     */
    getState() {
        return this._state;
    }
}

/**
 * Generates SVG button images for Stream Deck keys.
 * Each button shows a label, background color, and optional icon.
 *
 * Stream Deck keys are 72x72 or 144x144 pixels. We generate SVGs
 * that can be rendered to PNGs by the Stream Deck SDK or plugin.
 */

class ButtonRenderer {
  constructor(options = {}) {
    this.width = options.width || 144;
    this.height = options.height || 144;
    this.fontFamily = options.fontFamily || "Arial, sans-serif";
  }

  /**
   * Render a button as an SVG string.
   */
  render(state) {
    const { label = "", color = "#333333", icon = null, sublabel = "" } = state;
    const textColor = this._contrastColor(color);

    const iconSvg = icon ? this._renderIcon(icon, textColor) : "";
    const labelY = icon ? 105 : sublabel ? 65 : 80;
    const fontSize = label.length > 6 ? 16 : label.length > 4 ? 18 : 22;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
  <rect width="${this.width}" height="${this.height}" rx="12" fill="${color}"/>
  ${iconSvg}
  <text x="${this.width / 2}" y="${labelY}" text-anchor="middle"
        font-family="${this.fontFamily}" font-size="${fontSize}" font-weight="bold"
        fill="${textColor}">${this._escapeXml(label)}</text>
  ${sublabel ? `<text x="${this.width / 2}" y="${labelY + 20}" text-anchor="middle"
        font-family="${this.fontFamily}" font-size="12"
        fill="${textColor}" opacity="0.7">${this._escapeXml(sublabel)}</text>` : ""}
</svg>`;
  }

  /**
   * Render a button as a data URI for embedding.
   */
  renderDataUri(state) {
    const svg = this.render(state);
    const encoded = Buffer.from(svg).toString("base64");
    return `data:image/svg+xml;base64,${encoded}`;
  }

  /**
   * Render all buttons for a layout.
   */
  renderLayout(layout, buttonStates) {
    const result = {};
    for (const [keyIndex, actionId] of Object.entries(layout.mapping)) {
      if (actionId && buttonStates[actionId]) {
        result[keyIndex] = this.render(buttonStates[actionId]);
      } else if (actionId) {
        result[keyIndex] = this.render({
          label: actionId,
          color: "#222222",
        });
      }
    }
    return result;
  }

  _renderIcon(icon, color) {
    const cx = this.width / 2;
    const icons = {
      circle: `<circle cx="${cx}" cy="45" r="16" fill="none" stroke="${color}" stroke-width="3"/>`,
      pulse: `<circle cx="${cx}" cy="45" r="16" fill="none" stroke="${color}" stroke-width="3">
        <animate attributeName="r" values="12;18;12" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
      </circle>`,
      stop: `<rect x="${cx - 14}" y="31" width="28" height="28" rx="4" fill="${color}"/>`,
      plus: `<line x1="${cx}" y1="31" x2="${cx}" y2="59" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
             <line x1="${cx - 14}" y1="45" x2="${cx + 14}" y2="45" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`,
      eye: `<ellipse cx="${cx}" cy="45" rx="18" ry="12" fill="none" stroke="${color}" stroke-width="2.5"/>
            <circle cx="${cx}" cy="45" r="6" fill="${color}"/>`,
      bug: `<ellipse cx="${cx}" cy="48" rx="12" ry="14" fill="none" stroke="${color}" stroke-width="2.5"/>
            <circle cx="${cx}" cy="36" r="8" fill="none" stroke="${color}" stroke-width="2.5"/>`,
      check: `<polyline points="${cx - 12},45 ${cx - 3},54 ${cx + 14},34" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
      wrench: `<line x1="${cx - 10}" y1="55" x2="${cx + 10}" y2="35" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
               <circle cx="${cx + 12}" cy="33" r="8" fill="none" stroke="${color}" stroke-width="2.5"/>`,
      book: `<rect x="${cx - 16}" y="29" width="32" height="32" rx="3" fill="none" stroke="${color}" stroke-width="2.5"/>
             <line x1="${cx}" y1="29" x2="${cx}" y2="61" stroke="${color}" stroke-width="2"/>`,
      git: `<circle cx="${cx}" cy="37" r="6" fill="none" stroke="${color}" stroke-width="2.5"/>
            <circle cx="${cx}" cy="55" r="6" fill="none" stroke="${color}" stroke-width="2.5"/>
            <line x1="${cx}" y1="43" x2="${cx}" y2="49" stroke="${color}" stroke-width="2.5"/>`,
      shield: `<path d="M${cx},28 L${cx + 18},36 L${cx + 18},50 Q${cx + 18},62 ${cx},64 Q${cx - 18},62 ${cx - 18},50 L${cx - 18},36 Z" fill="none" stroke="${color}" stroke-width="2.5"/>`,
      clock: `<circle cx="${cx}" cy="45" r="16" fill="none" stroke="${color}" stroke-width="2.5"/>
              <line x1="${cx}" y1="45" x2="${cx}" y2="35" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="${cx}" y1="45" x2="${cx + 8}" y2="49" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>`,
      alert: `<path d="M${cx},30 L${cx + 18},60 L${cx - 18},60 Z" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>
              <line x1="${cx}" y1="42" x2="${cx}" y2="50" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="${cx}" cy="55" r="2" fill="${color}"/>`,
      compress: `<polyline points="${cx - 10},32 ${cx},40 ${cx + 10},32" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                 <polyline points="${cx - 10},58 ${cx},50 ${cx + 10},58" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
      message: `<rect x="${cx - 18}" y="30" width="36" height="24" rx="4" fill="none" stroke="${color}" stroke-width="2.5"/>
                <polyline points="${cx - 6},54 ${cx - 12},62 ${cx - 6},54 ${cx + 6},54" fill="none" stroke="${color}" stroke-width="2.5"/>`,
      diff: `<line x1="${cx - 12}" y1="38" x2="${cx + 12}" y2="38" stroke="#cc0000" stroke-width="2.5" stroke-linecap="round"/>
             <line x1="${cx - 12}" y1="52" x2="${cx + 12}" y2="52" stroke="#00cc66" stroke-width="2.5" stroke-linecap="round"/>
             <line x1="${cx}" y1="45" x2="${cx}" y2="59" stroke="#00cc66" stroke-width="2" stroke-linecap="round"/>`,
    };

    return icons[icon] || "";
  }

  _contrastColor(hex) {
    const rgb = this._hexToRgb(hex);
    if (!rgb) return "#ffffff";
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
  }

  _hexToRgb(hex) {
    const match = hex.match(/^#([0-9a-f]{6})$/i);
    if (!match) return null;
    return {
      r: parseInt(match[1].substring(0, 2), 16),
      g: parseInt(match[1].substring(2, 4), 16),
      b: parseInt(match[1].substring(4, 6), 16),
    };
  }

  _escapeXml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

var ButtonRenderer_1 = ButtonRenderer;

var ButtonRenderer$1 = /*@__PURE__*/getDefaultExportFromCjs(ButtonRenderer_1);

const { EventEmitter: EventEmitter$5 } = require$$0$3;

/**
 * Manages blinking alert states for Stream Deck buttons.
 *
 * When Claude Code needs attention (permission request, notification,
 * waiting for user input), this triggers a fast-blinking red alert
 * on a designated button. The blink alternates between two frames
 * at a configurable rate.
 *
 * The alert persists until explicitly dismissed (user presses the
 * button, sends a response, or the hook reports Claude resumed).
 */
class AlertManager extends EventEmitter$5 {
  constructor(options = {}) {
    super();
    this.blinkIntervalMs = options.blinkIntervalMs || 500;
    this._alerts = new Map(); // buttonId -> { timer, frame, reason, ... }
  }

  /**
   * Start blinking a button.
   * @param {string} buttonId - The button to blink
   * @param {object} options
   * @param {string} options.reason - Why the alert fired (notification, permission, etc.)
   * @param {string} options.label - Text to show on the ON frame
   * @param {string} options.sublabel - Optional sublabel
   * @param {string} options.onColor - Blink ON color (default: #cc0000 red)
   * @param {string} options.offColor - Blink OFF color (default: #330000 dark red)
   * @param {string} options.icon - Icon to show (default: alert)
   */
  startAlert(buttonId, options = {}) {
    // Clear any existing alert on this button
    this.clearAlert(buttonId);

    const alert = {
      buttonId,
      reason: options.reason || "unknown",
      label: options.label || "RESPOND",
      sublabel: options.sublabel || "",
      onColor: options.onColor || "#cc0000",
      offColor: options.offColor || "#330000",
      icon: options.icon || "alert",
      frame: 0, // 0 = ON (bright), 1 = OFF (dim)
      startedAt: Date.now(),
      timer: null,
    };

    alert.timer = setInterval(() => {
      alert.frame = alert.frame === 0 ? 1 : 0;
      this.emit("blink", {
        buttonId,
        frame: alert.frame,
        state: this._frameState(alert),
      });
    }, this.blinkIntervalMs);

    this._alerts.set(buttonId, alert);

    // Emit initial ON frame immediately
    this.emit("blink", {
      buttonId,
      frame: 0,
      state: this._frameState(alert),
    });

    this.emit("alert:start", {
      buttonId,
      reason: alert.reason,
    });

    return alert;
  }

  /**
   * Stop blinking a button and return it to normal.
   */
  clearAlert(buttonId) {
    const alert = this._alerts.get(buttonId);
    if (!alert) return false;

    clearInterval(alert.timer);
    this._alerts.delete(buttonId);

    this.emit("alert:clear", {
      buttonId,
      reason: alert.reason,
      duration: Date.now() - alert.startedAt,
    });

    return true;
  }

  /**
   * Clear all active alerts.
   */
  clearAll() {
    const cleared = [];
    for (const buttonId of this._alerts.keys()) {
      cleared.push(buttonId);
      this.clearAlert(buttonId);
    }
    return cleared;
  }

  /**
   * Clear all alerts whose buttonId starts with a given prefix.
   * Useful for clearing all session-related alerts (e.g., "session:").
   */
  clearByPrefix(prefix) {
    const cleared = [];
    for (const buttonId of this._alerts.keys()) {
      if (buttonId.startsWith(prefix)) {
        cleared.push(buttonId);
        this.clearAlert(buttonId);
      }
    }
    return cleared;
  }

  /**
   * Get all currently alerting button IDs.
   */
  getAlertingIds() {
    return [...this._alerts.keys()];
  }

  /**
   * Check if a button is currently alerting.
   */
  isAlerting(buttonId) {
    return this._alerts.has(buttonId);
  }

  /**
   * Check if any alerts are active.
   */
  get hasActiveAlerts() {
    return this._alerts.size > 0;
  }

  /**
   * Get all active alert button IDs.
   */
  get activeAlerts() {
    return [...this._alerts.keys()];
  }

  /**
   * Get the current visual state for an alert frame.
   */
  _frameState(alert) {
    if (alert.frame === 0) {
      // ON frame — bright, fully visible
      return {
        label: alert.label,
        sublabel: alert.sublabel,
        color: alert.onColor,
        icon: alert.icon,
        blink: true,
      };
    }
    // OFF frame — dim/dark
    return {
      label: alert.label,
      sublabel: alert.sublabel,
      color: alert.offColor,
      icon: alert.icon,
      blink: true,
    };
  }

  destroy() {
    this.clearAll();
    this.removeAllListeners();
  }
}

var AlertManager_1 = AlertManager;

var AlertManager$1 = /*@__PURE__*/getDefaultExportFromCjs(AlertManager_1);

var InfobarManager$2 = {exports: {}};

/**
 * Stream Deck action definitions for Claude Code control.
 *
 * Three input types supported:
 *   - key:   LCD button press (all models)
 *   - dial:  rotary encoder turn/push (Stream Deck +, + XL, Studio)
 *   - pedal: foot pedal press (Stream Deck Pedal)
 *
 * Actions can be assigned to any input on any device.
 */

const KEY_ACTIONS = {
  // ── Status & Info ──────────────────────────────────────────
  status: {
    id: "status",
    name: "Claude Status",
    description: "Shows Claude Code's current status (idle/running/waiting)",
    inputType: "key",
    category: "info",
    defaultState: { label: "IDLE", color: "#4488ff", icon: "circle" },
    states: {
      idle: { label: "IDLE", color: "#4488ff", icon: "circle" },
      running: { label: "RUNNING", color: "#00cc66", icon: "pulse" },
      waiting: { label: "WAITING", color: "#ffcc00", icon: "clock" },
      permission: { label: "PERMIT?", color: "#ff6600", icon: "shield" },
      error: { label: "ERROR", color: "#cc0000", icon: "alert" },
      offline: { label: "OFFLINE", color: "#333333", icon: "circle" },
    },
    handler: "getStatus",
  },

  toolIndicator: {
    id: "toolIndicator",
    name: "Current Tool",
    description: "Shows which tool Claude is currently using",
    inputType: "key",
    category: "info",
    defaultState: { label: "—", color: "#444444", icon: "wrench" },
    handler: null,
  },

  respondAlert: {
    id: "respondAlert",
    name: "Respond Alert",
    description: "Blinks red when Claude needs your response — press to dismiss and switch to terminal",
    inputType: "key",
    category: "info",
    defaultState: { label: "—", color: "#1a1a1a", icon: "circle" },
    alertState: {
      label: "RESPOND",
      onColor: "#cc0000",
      offColor: "#330000",
      icon: "alert",
    },
    handler: "dismissAlert",
  },

  // ── Quick Prompts ──────────────────────────────────────────
  reviewCode: {
    id: "reviewCode",
    name: "Review Code",
    description: "Ask Claude to review uncommitted changes",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "REVIEW", color: "#9966ff", icon: "eye" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Review my uncommitted changes. Focus on bugs, security issues, and improvements. Be concise.",
      allowedTools: ["Read", "Bash", "Glob", "Grep"],
    },
  },

  fixBugs: {
    id: "fixBugs",
    name: "Fix Bugs",
    description: "Ask Claude to find and fix bugs in recent changes",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "FIX", color: "#cc0000", icon: "bug" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Look at my recent changes and fix any bugs you find. Run the tests afterward.",
    },
  },

  writeTests: {
    id: "writeTests",
    name: "Write Tests",
    description: "Ask Claude to write tests for recent changes",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "TESTS", color: "#00cc88", icon: "check" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Write tests for the most recently changed files. Follow existing test patterns.",
    },
  },

  explain: {
    id: "explain",
    name: "Explain Code",
    description: "Ask Claude to explain the current project or recent changes",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "EXPLAIN", color: "#4488ff", icon: "book" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Explain what this project does and summarize the most recent changes. Be concise.",
      allowedTools: ["Read", "Glob", "Grep"],
    },
  },

  commit: {
    id: "commit",
    name: "Commit",
    description: "Ask Claude to commit staged changes with a good message",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "COMMIT", color: "#ff9900", icon: "git" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Create a git commit for my staged changes with an appropriate commit message.",
    },
  },

  refactor: {
    id: "refactor",
    name: "Refactor",
    description: "Ask Claude to refactor the most recently changed code",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "REFACTR", color: "#cc88ff", icon: "compress" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Refactor the most recently changed files for clarity, performance, and maintainability.",
    },
  },

  runTests: {
    id: "runTests",
    name: "Run Tests",
    description: "Ask Claude to run the test suite and report results",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "RUN", color: "#00aa66", icon: "check" },
    handler: "sendPrompt",
    payload: {
      prompt: "Run the test suite and report results. If any tests fail, show why.",
      allowedTools: ["Bash"],
    },
  },

  // ── Session Control ────────────────────────────────────────
  abort: {
    id: "abort",
    name: "Abort",
    description: "Abort the currently running Claude command",
    inputType: "key",
    category: "control",
    defaultState: { label: "ABORT", color: "#cc0000", icon: "stop" },
    handler: "abort",
  },

  newSession: {
    id: "newSession",
    name: "New Session",
    description: "Start a fresh Claude Code session",
    inputType: "key",
    category: "control",
    defaultState: { label: "NEW", color: "#ffffff", icon: "plus" },
    handler: "resetSession",
  },

  compact: {
    id: "compact",
    name: "Compact",
    description: "Ask Claude to compact the conversation context",
    inputType: "key",
    category: "control",
    defaultState: { label: "COMPACT", color: "#888888", icon: "compress" },
    handler: "sendPrompt",
    payload: {
      prompt: "Please compact the conversation to save context.",
    },
  },

  // ── Session & Permission Control ──────────────────────────
  sessionButton: {
    id: "sessionButton",
    name: "Session Button",
    description: "Shows a session's status — press to focus/manage",
    inputType: "key",
    category: "session",
    defaultState: { label: "SESS", color: "#444444", icon: "circle" },
    handler: "focusSession",
  },

  allowTool: {
    id: "allowTool",
    name: "Allow Tool",
    description: "Allow the pending tool permission request",
    inputType: "key",
    category: "permission",
    defaultState: { label: "ALLOW", color: "#00cc66", icon: "check" },
    handler: "permissionDecision",
  },

  allowToolSession: {
    id: "allowToolSession",
    name: "Allow Tool (Session)",
    description: "Allow the tool for the rest of this session",
    inputType: "key",
    category: "permission",
    defaultState: { label: "ALLOW\nSESS", color: "#4488ff", icon: "check" },
    handler: "permissionDecision",
  },

  denyTool: {
    id: "denyTool",
    name: "Deny Tool",
    description: "Deny the pending tool permission request",
    inputType: "key",
    category: "permission",
    defaultState: { label: "DENY", color: "#cc0000", icon: "stop" },
    handler: "permissionDecision",
  },

  focusTerminal: {
    id: "focusTerminal",
    name: "Focus Terminal",
    description: "Bring the terminal window for this session to the front",
    inputType: "key",
    category: "session",
    defaultState: { label: "FOCUS", color: "#ffcc00", icon: "eye" },
    handler: "focusTerminal",
  },

  backButton: {
    id: "backButton",
    name: "Back",
    description: "Navigate back to the previous view",
    inputType: "key",
    category: "nav",
    defaultState: { label: "BACK", color: "#666666", icon: "circle" },
    handler: "navigateBack",
  },

  sessionsView: {
    id: "sessionsView",
    name: "Sessions",
    description: "Show all active Claude Code sessions",
    inputType: "key",
    category: "nav",
    defaultState: { label: "SESSIONS", color: "#4488ff", icon: "message" },
    handler: "showSessions",
  },

  permissionInfo: {
    id: "permissionInfo",
    name: "Permission Info",
    description: "Display-only button showing tool or question info",
    inputType: "key",
    category: "info",
    defaultState: { label: "INFO", color: "#ff6600", icon: "shield" },
    handler: null,
  },

  prevPage: {
    id: "prevPage",
    name: "Previous Page",
    description: "Go to the previous page of sessions",
    inputType: "key",
    category: "nav",
    defaultState: { label: "PREV", color: "#666666", icon: "circle" },
    handler: "prevPage",
  },

  nextPage: {
    id: "nextPage",
    name: "Next Page",
    description: "Go to the next page of sessions",
    inputType: "key",
    category: "nav",
    defaultState: { label: "NEXT", color: "#666666", icon: "circle" },
    handler: "nextPage",
  },

  // ── Custom Prompt ──────────────────────────────────────────
  customPrompt: {
    id: "customPrompt",
    name: "Custom Prompt",
    description: "Send a user-configured custom prompt",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "CUSTOM", color: "#666666", icon: "message" },
    handler: "sendPrompt",
    payload: {
      prompt: "",
    },
  },

  // ── Git Operations ─────────────────────────────────────────
  gitStatus: {
    id: "gitStatus",
    name: "Git Status",
    description: "Ask Claude for a git status summary",
    inputType: "key",
    category: "git",
    defaultState: { label: "STATUS", color: "#ff6633", icon: "git" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Show me a brief git status summary: branch, staged, unstaged, untracked counts.",
      allowedTools: ["Bash"],
    },
  },

  gitDiff: {
    id: "gitDiff",
    name: "Git Diff",
    description: "Ask Claude to summarize the current diff",
    inputType: "key",
    category: "git",
    defaultState: { label: "DIFF", color: "#ff6633", icon: "diff" },
    handler: "sendPrompt",
    payload: {
      prompt: "Summarize the current git diff in bullet points. Be concise.",
      allowedTools: ["Bash"],
    },
  },

  gitPush: {
    id: "gitPush",
    name: "Git Push",
    description: "Ask Claude to push current branch to origin",
    inputType: "key",
    category: "git",
    defaultState: { label: "PUSH", color: "#ff6633", icon: "git" },
    handler: "sendPrompt",
    payload: {
      prompt: "Push the current branch to origin.",
      allowedTools: ["Bash"],
    },
  },
};

/**
 * Actions for rotary dials (Stream Deck +, + XL, Studio).
 * Dials support: rotate (CW/CCW), press, and touch.
 */
const DIAL_ACTIONS = {
  scrollContext: {
    id: "scrollContext",
    name: "Scroll Context",
    description: "Rotate to scroll through Claude's last response",
    inputType: "dial",
    category: "control",
    defaultState: { label: "SCROLL", color: "#4488ff" },
    handler: "scrollResponse",
    onRotate: "scrollResponse",
    onPress: "resetScroll",
  },

  modelSelect: {
    id: "modelSelect",
    name: "Model Selector",
    description: "Rotate to cycle between Claude models",
    inputType: "dial",
    category: "control",
    defaultState: { label: "MODEL", color: "#9966ff" },
    handler: "cycleModel",
    onRotate: "cycleModel",
    onPress: "confirmModel",
    options: [
      "claude-opus-4-6",
      "claude-sonnet-4-6",
      "claude-haiku-4-5-20251001",
    ],
  },

  volume: {
    id: "volume",
    name: "Notification Volume",
    description: "Adjust notification sound volume",
    inputType: "dial",
    category: "control",
    defaultState: { label: "VOL", color: "#666666" },
    handler: "adjustVolume",
    onRotate: "adjustVolume",
    onPress: "toggleMute",
    min: 0,
    max: 100,
    step: 5,
  },

  maxTurns: {
    id: "maxTurns",
    name: "Max Turns",
    description: "Rotate to set max agentic turns for next prompt",
    inputType: "dial",
    category: "control",
    defaultState: { label: "TURNS", color: "#ffcc00" },
    handler: "setMaxTurns",
    onRotate: "setMaxTurns",
    onPress: "resetMaxTurns",
    min: 1,
    max: 50,
    step: 1,
  },
};

/**
 * Actions for foot pedals (Stream Deck Pedal).
 * 3 pedals: left, center, right.
 */
const PEDAL_ACTIONS = {
  pedalAbort: {
    id: "pedalAbort",
    name: "Pedal: Abort",
    description: "Left pedal aborts current Claude operation",
    inputType: "pedal",
    category: "control",
    defaultState: { label: "ABORT" },
    handler: "abort",
    pedalIndex: 0,
  },

  pedalAccept: {
    id: "pedalAccept",
    name: "Pedal: Accept",
    description: "Center pedal accepts current permission request",
    inputType: "pedal",
    category: "control",
    defaultState: { label: "ACCEPT" },
    handler: "acceptPermission",
    pedalIndex: 1,
  },

  pedalPushToTalk: {
    id: "pedalPushToTalk",
    name: "Pedal: Push-to-Talk",
    description: "Right pedal for voice-to-prompt (hold to record)",
    inputType: "pedal",
    category: "control",
    defaultState: { label: "PTT" },
    handler: "pushToTalk",
    pedalIndex: 2,
    mode: "momentary",
  },
};

/**
 * Actions for Neo infobar / touch strip.
 */
const TOUCH_ACTIONS = {
  contextBar: {
    id: "contextBar",
    name: "Context Bar",
    description: "Shows context usage / token count on infobar or touch strip",
    inputType: "touch",
    category: "info",
    defaultState: { label: "Context", value: 0, max: 100 },
    handler: null,
  },

  contextGauge: {
    id: "contextGauge",
    name: "Context Window Gauge",
    description: "Visual progress bar of context window usage with percentage and token counts",
    inputType: "touch",
    category: "info",
    defaultState: {
      label: "Context",
      value: 0,
      max: 200000,
      percent: 0,
      display: "░░░░░░░░░░░░░░░ 0%",
    },
    // Color thresholds: gauge bar color changes as context fills up
    thresholds: {
      low: { below: 50, color: "#00cc66" },      // green: plenty of room
      medium: { below: 75, color: "#ffcc00" },    // yellow: getting full
      high: { below: 90, color: "#ff6600" },      // orange: watch out
      critical: { below: 101, color: "#cc0000" }, // red: almost out
    },
    handler: null,
  },

  costBar: {
    id: "costBar",
    name: "Cost Bar",
    description: "Shows session cost on touch strip",
    inputType: "touch",
    category: "info",
    defaultState: { label: "Cost", value: "$0.00" },
    handler: null,
  },
};

/**
 * Touch point LED configuration for Neo's left/right touch buttons.
 * Each touch point can have a static or dynamic LED color.
 *
 * The Neo hardware supports setting LED brightness and color on
 * each touch point via the Elgato SDK. This bridge communicates
 * LED state to the Stream Deck plugin via WebSocket.
 */
const TOUCH_POINT_STYLES = {
  // Static presets
  default: {
    left: { color: "#ffffff", brightness: 50 },
    right: { color: "#ffffff", brightness: 50 },
  },
  dim: {
    left: { color: "#666666", brightness: 20 },
    right: { color: "#666666", brightness: 20 },
  },
  off: {
    left: { color: "#000000", brightness: 0 },
    right: { color: "#000000", brightness: 0 },
  },

  // Contextual styles — applied dynamically based on state
  idle: {
    left: { color: "#4488ff", brightness: 30 },
    right: { color: "#4488ff", brightness: 30 },
  },
  active: {
    left: { color: "#00cc66", brightness: 60 },
    right: { color: "#00cc66", brightness: 60 },
  },
  attention: {
    left: { color: "#cc0000", brightness: 100 },
    right: { color: "#cc0000", brightness: 100 },
  },
  permission: {
    left: { color: "#ff6600", brightness: 100 },
    right: { color: "#ff6600", brightness: 100 },
  },
  waiting: {
    left: { color: "#ffcc00", brightness: 80 },
    right: { color: "#ffcc00", brightness: 80 },
  },

  // Asymmetric — different colors per side
  navHighlight: {
    left: { color: "#4488ff", brightness: 50 },
    right: { color: "#4488ff", brightness: 50 },
  },
  contextWarning: {
    left: { color: "#ffcc00", brightness: 60 },
    right: { color: "#ff6600", brightness: 60 },
  },
  contextCritical: {
    left: { color: "#cc0000", brightness: 100 },
    right: { color: "#cc0000", brightness: 100 },
  },
};

function getTouchPointStyle$1(name) {
  return TOUCH_POINT_STYLES[name] || TOUCH_POINT_STYLES.default;
}

// Unified action registry
const ACTIONS = {
  ...KEY_ACTIONS,
  ...DIAL_ACTIONS,
  ...PEDAL_ACTIONS,
  ...TOUCH_ACTIONS,
};

/**
 * Default layouts for every Stream Deck model.
 * Each layout maps input indices to action IDs.
 * Layout keys use the `keys` map; dials in `dials`; pedals in `pedals`.
 */
const LAYOUTS = {
  mini: {
    name: "Mini (6 keys)",
    device: "mini",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "reviewCode",
      3: "abort",
      4: "commit",
      5: "newSession",
    },
  },

  neo: {
    name: "Neo (8 keys + infobar)",
    device: "neo",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "reviewCode",
      3: "fixBugs",
      4: "abort",
      5: "commit",
      6: "newSession",
      7: "customPrompt",
    },
    touchPoints: {
      0: "prevPage",
      1: "nextPage",
    },
    infobar: "contextGauge",
  },

  standard: {
    name: "Standard / MK.2 (15 keys)",
    device: "standard",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      3: "gitStatus",
      4: "gitDiff",
      5: "reviewCode",
      6: "fixBugs",
      7: "writeTests",
      8: "explain",
      9: "customPrompt",
      10: "abort",
      11: "newSession",
      12: "compact",
      13: "commit",
      14: "runTests",
    },
  },

  scissor: {
    name: "Scissor Keys (15 keys)",
    device: "scissor",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      3: "gitStatus",
      4: "gitDiff",
      5: "reviewCode",
      6: "fixBugs",
      7: "writeTests",
      8: "explain",
      9: "customPrompt",
      10: "abort",
      11: "newSession",
      12: "compact",
      13: "commit",
      14: "runTests",
    },
  },

  plus: {
    name: "Stream Deck + (8 keys + 4 dials + touch strip)",
    device: "plus",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "fixBugs",
      3: "writeTests",
      4: "abort",
      5: "commit",
      6: "newSession",
      7: "customPrompt",
    },
    dials: {
      0: "scrollContext",
      1: "modelSelect",
      2: "maxTurns",
      3: "volume",
    },
    touchStrip: "contextBar",
  },

  xl: {
    name: "XL (32 keys)",
    device: "xl",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      4: null,
      5: null,
      6: "gitStatus",
      7: "gitDiff",
      8: "reviewCode",
      9: "fixBugs",
      10: "writeTests",
      11: "explain",
      12: "refactor",
      13: null,
      14: null,
      15: "customPrompt",
      16: "commit",
      17: "gitPush",
      18: "runTests",
      19: null,
      20: null,
      21: null,
      22: null,
      23: null,
      24: "abort",
      25: "newSession",
      26: "compact",
      27: null,
      28: null,
      29: null,
      30: null,
      31: null,
    },
  },

  plusXl: {
    name: "Stream Deck + XL (36 keys + 6 dials + touch strip)",
    device: "plusXl",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      3: null,
      4: null,
      5: null,
      6: "gitStatus",
      7: "gitDiff",
      8: null,
      9: "reviewCode",
      10: "fixBugs",
      11: "writeTests",
      12: "explain",
      13: "refactor",
      14: null,
      15: null,
      16: "customPrompt",
      17: null,
      18: "commit",
      19: "gitPush",
      20: "runTests",
      21: null,
      22: null,
      23: null,
      24: null,
      25: null,
      26: null,
      27: "abort",
      28: "newSession",
      29: "compact",
      30: null,
      31: null,
      32: null,
      33: null,
      34: null,
      35: null,
    },
    dials: {
      0: "scrollContext",
      1: "modelSelect",
      2: "maxTurns",
      3: "volume",
      4: null,
      5: null,
    },
    touchStrip: "costBar",
  },

  studio: {
    name: "Studio (32 keys + 2 dials)",
    device: "studio",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      4: null,
      5: null,
      6: "gitStatus",
      7: "gitDiff",
      8: "reviewCode",
      9: "fixBugs",
      10: "writeTests",
      11: "explain",
      12: "refactor",
      13: null,
      14: null,
      15: "customPrompt",
      16: "commit",
      17: "gitPush",
      18: "runTests",
      19: null,
      20: null,
      21: null,
      22: null,
      23: null,
      24: "abort",
      25: "newSession",
      26: "compact",
      27: null,
      28: null,
      29: null,
      30: null,
      31: null,
    },
    dials: {
      0: "scrollContext",
      1: "modelSelect",
    },
  },

  pedal: {
    name: "Pedal (3 foot pedals)",
    device: "pedal",
    pedals: {
      0: "pedalAbort",
      1: "pedalAccept",
      2: "pedalPushToTalk",
    },
  },

  virtual: {
    name: "Virtual Stream Deck (up to 64 keys)",
    device: "virtual",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      4: null,
      5: null,
      6: "gitStatus",
      7: "gitDiff",
      8: "reviewCode",
      9: "fixBugs",
      10: "writeTests",
      11: "explain",
      12: "refactor",
      13: "runTests",
      14: null,
      15: "customPrompt",
      16: "commit",
      17: "gitPush",
      18: null,
      19: null,
      20: null,
      21: null,
      22: null,
      23: null,
    },
  },
};

// ── Public API ────────────────────────────────────────────────

function getAction$2(id) {
  return ACTIONS[id] || null;
}

function getLayout$1(deviceId) {
  return LAYOUTS[deviceId] || LAYOUTS.standard;
}

var actions = {
  getAction: getAction$2,
  getLayout: getLayout$1,
  getTouchPointStyle: getTouchPointStyle$1};

const { EventEmitter: EventEmitter$4 } = require$$0$3;
const { getAction: getAction$1, getTouchPointStyle } = actions;

/**
 * Manages the Neo infobar display and touch point LED colors.
 *
 * Features:
 *   - Context window gauge with color-coded thresholds
 *   - Dynamic LED colors that react to system state
 *   - Animation patterns: breathing, pulse, rainbow, chase, flash
 *   - Per-session LED colors (different colors per session needing attention)
 *   - Custom state-to-color mapping (user-configurable)
 *   - Persistent LED preferences via config
 */
class InfobarManager extends EventEmitter$4 {
  constructor(bridge, options = {}) {
    super();
    this.bridge = bridge;
    this._maxTokens = options.maxTokens || 200000;
    this._currentTokens = 0;
    this._percent = 0;
    this._gaugeWidth = options.gaugeWidth || 15;
    this._touchPointStyle = "idle";
    this._animationTimer = null;
    this._animationFrame = 0;
    this._blinkState = false;

    // Custom LED overrides (user config)
    this._ledOverrides = options.ledOverrides || null;

    // Custom state-to-style mapping (user can remap which colors appear for which states)
    this._stateStyleMap = Object.assign(
      {
        idle: "idle",
        offline: "idle",
        active: "active",
        running: "active",
        waiting: "waiting",
        permission: "permission",
        attention: "attention",
      },
      options.stateStyleMap || {}
    );

    // Session color palette — each concurrent session gets a unique color
    this._sessionColorPalette = options.sessionColorPalette || [
      "#ff6600", // orange
      "#cc00ff", // purple
      "#00ccff", // cyan
      "#ff0066", // pink
      "#66ff00", // lime
      "#ffcc00", // gold
      "#0066ff", // blue
      "#ff3300", // red-orange
    ];
    this._sessionColorMap = new Map(); // sessionId -> color
    this._nextColorIndex = 0;
  }

  // ── Context gauge ──────────────────────────────────────────

  /**
   * Update context window usage.
   */
  updateContext(tokensUsed, maxTokens) {
    if (maxTokens) this._maxTokens = maxTokens;
    this._currentTokens = tokensUsed;
    this._percent = Math.min(100, Math.round((tokensUsed / this._maxTokens) * 100));

    const gauge = this._renderGauge();
    const thresholdColor = this._getThresholdColor();

    this.bridge.broadcast("infobar:update", {
      actionId: "contextGauge",
      display: gauge,
      percent: this._percent,
      tokensUsed: this._currentTokens,
      maxTokens: this._maxTokens,
      color: thresholdColor,
      formatted: this._formatTokens(this._currentTokens),
      maxFormatted: this._formatTokens(this._maxTokens),
    });

    // Update touch point LEDs based on context level
    if (this._percent >= 90) {
      this.setTouchPointStyle("contextCritical");
    } else if (this._percent >= 75) {
      this.setTouchPointStyle("contextWarning");
    }

    this.emit("context:updated", {
      percent: this._percent,
      tokensUsed: this._currentTokens,
      maxTokens: this._maxTokens,
    });
  }

  // ── Touch point LED styles ─────────────────────────────────

  /**
   * Set touch point LED style by name or custom config.
   */
  setTouchPointStyle(style) {
    let source;
    if (typeof style === "string") {
      this._touchPointStyle = style;
      source = getTouchPointStyle(style);
    } else {
      this._touchPointStyle = "custom";
      source = style;
    }

    // Deep clone to avoid mutating the style registry
    const resolved = {
      left: { ...source.left },
      right: { ...source.right },
    };

    // Apply user overrides if present
    if (this._ledOverrides) {
      if (this._ledOverrides.left) {
        Object.assign(resolved.left, this._ledOverrides.left);
      }
      if (this._ledOverrides.right) {
        Object.assign(resolved.right, this._ledOverrides.right);
      }
    }

    this.bridge.broadcast("touchpoint:led", {
      left: resolved.left,
      right: resolved.right,
      styleName: this._touchPointStyle,
    });

    this.emit("touchpoint:changed", { style: this._touchPointStyle, resolved });
  }

  // ── Animation patterns ─────────────────────────────────────

  /**
   * Start an animation pattern on the touch point LEDs.
   *
   * @param {string} pattern - "blink", "breathe", "pulse", "rainbow", "chase", "flash"
   * @param {object} [options]
   * @param {string} [options.color] - Primary color (for single-color patterns)
   * @param {string} [options.style] - Style name to use as the "on" color
   * @param {number} [options.intervalMs] - Animation speed (default varies by pattern)
   * @param {number} [options.steps] - Number of animation steps (for smooth patterns)
   * @param {string[]} [options.colors] - Color list (for rainbow/chase)
   */
  startAnimation(pattern, options = {}) {
    this.stopAnimation();

    switch (pattern) {
      case "blink":
        this._animateBlink(options);
        break;
      case "breathe":
        this._animateBreathe(options);
        break;
      case "pulse":
        this._animatePulse(options);
        break;
      case "rainbow":
        this._animateRainbow(options);
        break;
      case "chase":
        this._animateChase(options);
        break;
      case "flash":
        this._animateFlash(options);
        break;
      default:
        // Unknown pattern, fall back to blink
        this._animateBlink(options);
    }

    this.emit("animation:started", { pattern, options });
  }

  /**
   * Stop any running animation.
   */
  stopAnimation() {
    if (this._animationTimer) {
      clearInterval(this._animationTimer);
      this._animationTimer = null;
    }
    this._animationFrame = 0;
  }

  /**
   * Check if an animation is currently running.
   */
  get isAnimating() {
    return this._animationTimer !== null;
  }

  // Blink: alternates between on-color and dim
  _animateBlink(options) {
    const onStyle = options.style
      ? getTouchPointStyle(options.style)
      : options.color
        ? { left: { color: options.color, brightness: 100 }, right: { color: options.color, brightness: 100 } }
        : getTouchPointStyle(this._touchPointStyle);
    const offStyle = getTouchPointStyle("dim");
    const intervalMs = options.intervalMs || 500;

    this._blinkState = true;
    this._broadcastLed(onStyle, true);

    this._animationTimer = setInterval(() => {
      this._blinkState = !this._blinkState;
      this._broadcastLed(this._blinkState ? onStyle : offStyle, true);
    }, intervalMs);
  }

  // Breathe: smooth fade in/out using brightness ramp
  _animateBreathe(options) {
    const color = options.color || "#4488ff";
    const steps = options.steps || 30;
    const intervalMs = options.intervalMs || 50; // 50ms * 30 steps = 1.5s per cycle
    this._animationFrame = 0;

    this._animationTimer = setInterval(() => {
      // Sine wave for smooth breathing: 0 → 100 → 0
      const phase = (this._animationFrame % (steps * 2)) / steps;
      const brightness = Math.round(
        phase <= 1
          ? phase * 100          // fade in
          : (2 - phase) * 100    // fade out
      );

      this._broadcastLed({
        left: { color, brightness },
        right: { color, brightness },
      }, true);

      this._animationFrame++;
    }, intervalMs);
  }

  // Pulse: quick bright flash then slow fade (like a heartbeat)
  _animatePulse(options) {
    const color = options.color || "#cc0000";
    const steps = options.steps || 20;
    const intervalMs = options.intervalMs || 40;
    this._animationFrame = 0;

    this._animationTimer = setInterval(() => {
      const frame = this._animationFrame % (steps + 10); // 10 frames of rest
      let brightness;

      if (frame < 3) {
        // Quick flash up
        brightness = Math.round((frame / 2) * 100);
      } else if (frame < steps) {
        // Slow decay
        brightness = Math.round(((steps - frame) / steps) * 100);
      } else {
        // Rest period
        brightness = 0;
      }

      this._broadcastLed({
        left: { color, brightness },
        right: { color, brightness },
      }, true);

      this._animationFrame++;
    }, intervalMs);
  }

  // Rainbow: cycle through hue spectrum
  _animateRainbow(options) {
    const steps = options.steps || 60;
    const intervalMs = options.intervalMs || 80;
    const brightness = options.brightness || 80;
    this._animationFrame = 0;

    this._animationTimer = setInterval(() => {
      const hue = (this._animationFrame % steps) / steps;
      // Offset right LED by half cycle for a nice effect
      const hueRight = ((this._animationFrame + Math.floor(steps / 2)) % steps) / steps;

      this._broadcastLed({
        left: { color: hslToHex(hue, 1, 0.5), brightness },
        right: { color: hslToHex(hueRight, 1, 0.5), brightness },
      }, true);

      this._animationFrame++;
    }, intervalMs);
  }

  // Chase: color bounces left → right → left
  _animateChase(options) {
    const colors = options.colors || ["#ff6600", "#4488ff"];
    const intervalMs = options.intervalMs || 300;
    this._animationFrame = 0;

    this._animationTimer = setInterval(() => {
      const frame = this._animationFrame % 4;
      let left, right;

      switch (frame) {
        case 0: // Left on, right dim
          left = { color: colors[0], brightness: 100 };
          right = { color: colors[0], brightness: 10 };
          break;
        case 1: // Both on
          left = { color: colors[0], brightness: 60 };
          right = { color: colors[0], brightness: 100 };
          break;
        case 2: // Left dim, right on with color 2
          left = { color: colors[1 % colors.length], brightness: 10 };
          right = { color: colors[1 % colors.length], brightness: 100 };
          break;
        case 3: // Both with color 2
          left = { color: colors[1 % colors.length], brightness: 100 };
          right = { color: colors[1 % colors.length], brightness: 60 };
          break;
      }

      this._broadcastLed({ left, right }, true);
      this._animationFrame++;
    }, intervalMs);
  }

  // Flash: rapid strobe (use sparingly!)
  _animateFlash(options) {
    const color = options.color || "#ffffff";
    const intervalMs = options.intervalMs || 100;
    this._animationFrame = 0;

    this._animationTimer = setInterval(() => {
      const on = this._animationFrame % 2 === 0;
      this._broadcastLed({
        left: { color, brightness: on ? 100 : 0 },
        right: { color, brightness: on ? 100 : 0 },
      }, true);
      this._animationFrame++;
    }, intervalMs);
  }

  _broadcastLed(style, isAnimation = false) {
    this.bridge.broadcast("touchpoint:led", {
      left: style.left,
      right: style.right,
      styleName: isAnimation ? "animation" : this._touchPointStyle,
      animation: isAnimation,
    });
  }

  // ── Legacy blink (backward compat) ─────────────────────────

  startTouchPointBlink(style, intervalMs = 500) {
    this.startAnimation("blink", { style, intervalMs });
  }

  stopTouchPointBlink() {
    this.stopAnimation();
  }

  // ── Per-session LED colors ─────────────────────────────────

  /**
   * Get or assign a unique color for a session.
   */
  getSessionColor(sessionId) {
    if (!this._sessionColorMap.has(sessionId)) {
      const color = this._sessionColorPalette[
        this._nextColorIndex % this._sessionColorPalette.length
      ];
      this._sessionColorMap.set(sessionId, color);
      this._nextColorIndex++;
    }
    return this._sessionColorMap.get(sessionId);
  }

  /**
   * Set a specific color for a session (user override).
   */
  setSessionColor(sessionId, color) {
    this._sessionColorMap.set(sessionId, color);
  }

  /**
   * Remove a session's color assignment.
   */
  removeSessionColor(sessionId) {
    this._sessionColorMap.delete(sessionId);
  }

  /**
   * Show a session's assigned color on the LEDs.
   * Left LED shows the session color, right shows the state color.
   */
  showSessionAlert(sessionId, state) {
    const sessionColor = this.getSessionColor(sessionId);
    const stateStyleName = this._stateStyleMap[state] || "attention";
    const stateStyle = getTouchPointStyle(stateStyleName);

    this.startAnimation("blink", {
      style: {
        left: { color: sessionColor, brightness: 100 },
        right: { ...stateStyle.right },
      },
      intervalMs: state === "permission" ? 400 : 600,
    });
  }

  // ── Custom state-to-style mapping ──────────────────────────

  /**
   * Override which LED style is used for a given system state.
   * @param {string} state - System state name
   * @param {string} styleName - Touch point style name to use
   */
  setStateStyle(state, styleName) {
    this._stateStyleMap[state] = styleName;
  }

  /**
   * Get the current state-to-style mapping.
   */
  getStateStyleMap() {
    return { ...this._stateStyleMap };
  }

  // ── Overrides ──────────────────────────────────────────────

  /**
   * Set custom LED colors for the touch points (user preference).
   * These override the dynamic style colors.
   */
  setLedOverrides(overrides) {
    this._ledOverrides = overrides;
    this.setTouchPointStyle(this._touchPointStyle);
  }

  /**
   * Clear LED overrides, reverting to dynamic colors.
   */
  clearLedOverrides() {
    this._ledOverrides = null;
    this.setTouchPointStyle(this._touchPointStyle);
  }

  // ── System state handler ───────────────────────────────────

  /**
   * Update LED state based on system events (called by adapter).
   */
  onSystemStateChange(state) {
    // Don't override context-critical LED state
    if (this._percent >= 90) return;
    if (this._percent >= 75) {
      this.setTouchPointStyle("contextWarning");
      return;
    }

    const styleName = this._stateStyleMap[state] || "idle";

    // Animated states
    if (state === "waiting" || state === "permission" || state === "attention") {
      this.startAnimation("blink", { style: styleName, intervalMs: 500 });
    } else {
      this.stopAnimation();
      this.setTouchPointStyle(styleName);
    }
  }

  // ── State ──────────────────────────────────────────────────

  getState() {
    return {
      percent: this._percent,
      tokensUsed: this._currentTokens,
      maxTokens: this._maxTokens,
      display: this._renderGauge(),
      color: this._getThresholdColor(),
      touchPointStyle: this._touchPointStyle,
      isAnimating: this.isAnimating,
      stateStyleMap: { ...this._stateStyleMap },
      sessionColors: Object.fromEntries(this._sessionColorMap),
    };
  }

  // ── Internal ───────────────────────────────────────────────

  _renderGauge() {
    const filled = Math.round((this._percent / 100) * this._gaugeWidth);
    const empty = this._gaugeWidth - filled;
    const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
    const tokensStr = this._formatTokens(this._currentTokens);
    const maxStr = this._formatTokens(this._maxTokens);
    return `${bar} ${this._percent}% (${tokensStr}/${maxStr})`;
  }

  _getThresholdColor() {
    const action = getAction$1("contextGauge");
    const thresholds = action?.thresholds || {};

    if (this._percent < (thresholds.low?.below || 50)) {
      return thresholds.low?.color || "#00cc66";
    }
    if (this._percent < (thresholds.medium?.below || 75)) {
      return thresholds.medium?.color || "#ffcc00";
    }
    if (this._percent < (thresholds.high?.below || 90)) {
      return thresholds.high?.color || "#ff6600";
    }
    return thresholds.critical?.color || "#cc0000";
  }

  _formatTokens(n) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  }

  destroy() {
    this.stopAnimation();
    this.removeAllListeners();
  }
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Convert HSL (0-1 range) to hex color string.
 */
function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;

  const sector = Math.floor(h * 6) % 6;
  switch (sector) {
    case 0: r = c; g = x; b = 0; break;
    case 1: r = x; g = c; b = 0; break;
    case 2: r = 0; g = c; b = x; break;
    case 3: r = 0; g = x; b = c; break;
    case 4: r = x; g = 0; b = c; break;
    case 5: r = c; g = 0; b = x; break;
  }

  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

InfobarManager$2.exports = InfobarManager;
InfobarManager$2.exports.hslToHex = hslToHex;

var InfobarManagerExports = InfobarManager$2.exports;
var InfobarManager$1 = /*@__PURE__*/getDefaultExportFromCjs(InfobarManagerExports);

const { EventEmitter: EventEmitter$3 } = require$$0$3;
const { getAction, getLayout } = actions;

/**
 * Manages "views" (pages) on the Stream Deck.
 *
 * Four views:
 *   1. default   — The original layout (prompts, git, etc.) + a SESSIONS nav button
 *   2. sessions  — Grid of active sessions as buttons, each showing live status
 *   3. permission — ALLOW / ALLOW SESSION / DENY buttons for a focused session
 *   4. question  — Question text + FOCUS TERMINAL for a focused session
 *
 * Each view dynamically computes which action goes on which key, so the
 * StreamDeckAdapter can just ask "what does key 5 do right now?"
 */
class LayoutManager extends EventEmitter$3 {
  constructor(options = {}) {
    super();
    this._baseLayout = options.layout || getLayout(options.deckSize || "standard");
    this._device = options.device || { keys: 15, cols: 5 };
    this._currentView = "default";
    this._focusedSessionId = null;
    this._sessionPage = 0;
    this._sessions = [];

    // Cache computed key mappings for the current view
    this._currentKeyMap = {};
    this._recompute();
  }

  /**
   * Get the current view name.
   */
  get currentView() {
    return this._currentView;
  }

  /**
   * Get the session currently focused (for permission/question views).
   */
  get focusedSessionId() {
    return this._focusedSessionId;
  }

  /**
   * Switch to a different view.
   */
  switchView(name, { sessionId } = {}) {
    this._currentView = name;
    this._focusedSessionId = sessionId || null;
    if (name === "sessions") ; else if (name === "default") {
      this._sessionPage = 0;
    }
    this._recompute();
    this.emit("view:changed", { view: name, sessionId: this._focusedSessionId });
  }

  /**
   * Update the list of active sessions (call when sessions change).
   */
  updateSessions(sessions) {
    this._sessions = sessions;
    if (this._currentView === "sessions") {
      this._recompute();
    }
  }

  /**
   * Get what action a key press should trigger in the current view.
   * Returns { actionId, sessionId, meta } or null.
   */
  getActionContext(keyIndex) {
    return this._currentKeyMap[keyIndex] || null;
  }

  /**
   * Get the full current layout (for rendering all buttons).
   */
  getCurrentLayout() {
    return {
      view: this._currentView,
      keys: this._currentKeyMap,
      dials: this._baseLayout.dials || {},
      pedals: this._baseLayout.pedals || {},
    };
  }

  /**
   * Get the base layout (original default layout).
   */
  getBaseLayout() {
    return this._baseLayout;
  }

  // ── Pagination ─────────────────────────────────────────────

  nextPage() {
    this._sessionPage++;
    this._recompute();
  }

  prevPage() {
    if (this._sessionPage > 0) {
      this._sessionPage--;
      this._recompute();
    }
  }

  // ── Internal layout computation ────────────────────────────

  _recompute() {
    switch (this._currentView) {
      case "default":
        this._computeDefault();
        break;
      case "sessions":
        this._computeSessionGrid();
        break;
      case "permission":
        this._computePermissionView();
        break;
      case "question":
        this._computeQuestionView();
        break;
      default:
        this._computeDefault();
    }
  }

  _computeDefault() {
    const map = {};
    if (this._baseLayout.keys) {
      for (const [idx, actionId] of Object.entries(this._baseLayout.keys)) {
        if (actionId) {
          map[idx] = { actionId, sessionId: null, meta: null };
        }
      }
    }

    // Replace one key with SESSIONS nav if there are active sessions
    // Use the last key position
    const totalKeys = this._device.keys || 15;
    if (this._sessions.length > 0) {
      map[totalKeys - 1] = { actionId: "sessionsView", sessionId: null, meta: null };
    }

    this._currentKeyMap = map;
  }

  _computeSessionGrid() {
    const map = {};
    const totalKeys = this._device.keys || 15;

    // Reserve last key for BACK
    const backKeyIdx = totalKeys - 1;
    map[backKeyIdx] = { actionId: "backButton", sessionId: null, meta: null };

    // Sort sessions: attention-needing first
    const sorted = [...this._sessions].sort((a, b) => {
      const aNeeds = a.pendingPermission || a.pendingQuestion ? 1 : 0;
      const bNeeds = b.pendingPermission || b.pendingQuestion ? 1 : 0;
      return bNeeds - aNeeds;
    });

    let availableKeys = totalKeys - 1; // minus BACK
    const needsPagination = sorted.length > availableKeys;

    if (needsPagination) {
      // Reserve 2 more keys for PREV/NEXT
      const prevIdx = totalKeys - 3;
      const nextIdx = totalKeys - 2;
      map[prevIdx] = { actionId: "prevPage", sessionId: null, meta: null };
      map[nextIdx] = { actionId: "nextPage", sessionId: null, meta: null };
      availableKeys -= 2;
    }

    // Paginate sessions
    const pageStart = this._sessionPage * availableKeys;
    const pageSessions = sorted.slice(pageStart, pageStart + availableKeys);

    // Clamp page
    if (pageSessions.length === 0 && this._sessionPage > 0) {
      this._sessionPage = Math.max(0, Math.ceil(sorted.length / availableKeys) - 1);
      return this._computeSessionGrid();
    }

    for (let i = 0; i < pageSessions.length; i++) {
      map[i] = {
        actionId: "sessionButton",
        sessionId: pageSessions[i].sessionId,
        meta: { session: pageSessions[i] },
      };
    }

    this._currentKeyMap = map;
  }

  _computePermissionView() {
    const map = {};
    const totalKeys = this._device.keys || 15;

    // Key 0: permission info (display only — shows tool name)
    map[0] = {
      actionId: "permissionInfo",
      sessionId: this._focusedSessionId,
      meta: null,
    };

    // Key 1: ALLOW
    map[1] = {
      actionId: "allowTool",
      sessionId: this._focusedSessionId,
      meta: { decision: "allow" },
    };

    // Key 2: ALLOW SESSION
    map[2] = {
      actionId: "allowToolSession",
      sessionId: this._focusedSessionId,
      meta: { decision: "allowSession" },
    };

    // Key 3: DENY
    map[3] = {
      actionId: "denyTool",
      sessionId: this._focusedSessionId,
      meta: { decision: "deny" },
    };

    // Key 4: FOCUS TERMINAL
    map[4] = {
      actionId: "focusTerminal",
      sessionId: this._focusedSessionId,
      meta: null,
    };

    // Last key: BACK
    map[totalKeys - 1] = {
      actionId: "backButton",
      sessionId: this._focusedSessionId,
      meta: null,
    };

    this._currentKeyMap = map;
  }

  _computeQuestionView() {
    const map = {};
    const totalKeys = this._device.keys || 15;

    // Key 0: question info (display only — shows question text)
    map[0] = {
      actionId: "permissionInfo",
      sessionId: this._focusedSessionId,
      meta: { isQuestion: true },
    };

    // Key 1: FOCUS TERMINAL
    map[1] = {
      actionId: "focusTerminal",
      sessionId: this._focusedSessionId,
      meta: null,
    };

    // Last key: BACK
    map[totalKeys - 1] = {
      actionId: "backButton",
      sessionId: this._focusedSessionId,
      meta: null,
    };

    this._currentKeyMap = map;
  }
}

var LayoutManager_1 = LayoutManager;

var LayoutManager$1 = /*@__PURE__*/getDefaultExportFromCjs(LayoutManager_1);

const { EventEmitter: EventEmitter$2 } = require$$0$3;

/**
 * Central registry of all active Claude Code sessions.
 *
 * Tracks per-session state including pending permission requests and questions.
 * When a PreToolUse hook arrives, the HTTP response can be "held" here so
 * the user can approve/deny from the Stream Deck before Claude proceeds.
 *
 * Auto-cleans stale sessions and enforces timeouts on held responses.
 */
class SessionTracker extends EventEmitter$2 {
  constructor(options = {}) {
    super();
    this._sessions = new Map();
    this._responseTimeoutMs = options.responseTimeoutMs || 25000;
    this._staleThresholdMs = options.staleThresholdMs || 5 * 60 * 1000;
    this._cleanupIntervalMs = options.cleanupIntervalMs || 60000;

    this._cleanupTimer = setInterval(() => this._cleanupStale(), this._cleanupIntervalMs);
    if (this._cleanupTimer.unref) this._cleanupTimer.unref();
  }

  // ── Session lifecycle ──────────────────────────────────────

  registerSession(id) {
    if (this._sessions.has(id)) return this._sessions.get(id);

    const session = {
      sessionId: id,
      status: "active",
      lastEvent: "session-start",
      lastEventTime: Date.now(),
      currentTool: null,
      pendingPermission: null,
      pendingQuestion: null,
      sessionApprovals: new Set(),
      label: id.length >= 4 ? id.slice(-4) : id,
    };

    this._sessions.set(id, session);
    this.emit("session:added", { sessionId: id, session });
    return session;
  }

  removeSession(id) {
    const session = this._sessions.get(id);
    if (!session) return;

    // Resolve any pending callbacks before removing
    if (session.pendingPermission) {
      this._resolvePermissionCallback(session, "allow", "session ended");
    }
    if (session.pendingQuestion) {
      this._resolveQuestionCallback(session);
    }

    this._sessions.delete(id);
    this.emit("session:removed", { sessionId: id });
  }

  getSession(id) {
    return this._sessions.get(id) || null;
  }

  getAllSessions() {
    return [...this._sessions.values()];
  }

  get sessionCount() {
    return this._sessions.size;
  }

  // ── Status updates ─────────────────────────────────────────

  updateStatus(id, event, data = {}) {
    let session = this._sessions.get(id);
    if (!session) {
      // Auto-register unknown sessions
      session = this.registerSession(id);
    }

    session.lastEvent = event;
    session.lastEventTime = Date.now();

    if (event === "pre-tool-use" && data.tool) {
      session.currentTool = data.tool;
      session.status = "tool";
    } else if (event === "post-tool-use") {
      session.currentTool = null;
      session.status = "active";
    } else if (event === "stop") {
      session.status = "waiting";
    } else if (event === "notification") {
      session.status = "attention";
    } else if (event === "prompt-submit") {
      session.status = "active";
    } else if (event === "session-start") {
      session.status = "active";
    } else if (event === "session-end") {
      session.status = "offline";
    }

    this.emit("session:updated", { sessionId: id, session, event });
  }

  // ── Permission management ──────────────────────────────────

  /**
   * Check if a tool was already approved for this session.
   */
  hasSessionApproval(id, tool) {
    const session = this._sessions.get(id);
    if (!session) return false;
    return session.sessionApprovals.has(tool);
  }

  /**
   * Remember that a tool was approved for this session.
   */
  addSessionApproval(id, tool) {
    const session = this._sessions.get(id);
    if (!session) return;
    session.sessionApprovals.add(tool);
  }

  /**
   * Store a pending permission request (holds the HTTP response).
   * @param {string} id - Session ID
   * @param {object} opts
   * @param {string} opts.tool - Tool name
   * @param {object} opts.body - Original hook body
   * @param {Function} opts.resolve - Callback: (responseObj) => void  — writes HTTP response
   */
  setPendingPermission(id, { tool, body, resolve }) {
    let session = this._sessions.get(id);
    if (!session) session = this.registerSession(id);

    // If there's already a pending permission, auto-allow it
    if (session.pendingPermission) {
      this._resolvePermissionCallback(session, "allow", "superseded by new request");
    }

    const timeout = setTimeout(() => {
      if (session.pendingPermission) {
        this._resolvePermissionCallback(session, "allow", "timeout");
        this.emit("permission:timeout", { sessionId: id, tool });
      }
    }, this._responseTimeoutMs);
    if (timeout.unref) timeout.unref();

    session.pendingPermission = { tool, body, resolve, timeout };
    session.status = "permission";

    this.emit("permission:pending", { sessionId: id, tool, body });
  }

  /**
   * Resolve a pending permission and send the HTTP response.
   * @param {string} id - Session ID
   * @param {string} decision - "allow" or "deny"
   * @param {string} [reason] - Reason for denial
   */
  resolvePendingPermission(id, decision, reason) {
    const session = this._sessions.get(id);
    if (!session || !session.pendingPermission) return false;

    this._resolvePermissionCallback(session, decision, reason);
    this.emit("permission:resolved", { sessionId: id, decision, reason });
    return true;
  }

  _resolvePermissionCallback(session, decision, reason) {
    const pending = session.pendingPermission;
    if (!pending) return;

    clearTimeout(pending.timeout);

    const response = { decision };
    if (decision === "deny" && reason) {
      response.reason = reason;
    }

    try {
      pending.resolve(response);
    } catch (err) {
      // Response may have already been sent (e.g. client disconnected)
    }

    session.pendingPermission = null;
    session.status = "active";
  }

  // ── Question management (stop hooks) ───────────────────────

  /**
   * Store a pending question (holds the HTTP response for a stop hook).
   */
  setPendingQuestion(id, { message, resolve }) {
    let session = this._sessions.get(id);
    if (!session) session = this.registerSession(id);

    if (session.pendingQuestion) {
      this._resolveQuestionCallback(session);
    }

    const timeout = setTimeout(() => {
      if (session.pendingQuestion) {
        this._resolveQuestionCallback(session);
        this.emit("question:timeout", { sessionId: id });
      }
    }, this._responseTimeoutMs);
    if (timeout.unref) timeout.unref();

    session.pendingQuestion = { message, resolve, timeout };
    session.status = "waiting";

    this.emit("question:pending", { sessionId: id, message });
  }

  /**
   * Resolve a pending question (acknowledge, release HTTP response).
   */
  resolveQuestion(id) {
    const session = this._sessions.get(id);
    if (!session || !session.pendingQuestion) return false;

    this._resolveQuestionCallback(session);
    this.emit("question:resolved", { sessionId: id });
    return true;
  }

  _resolveQuestionCallback(session) {
    const pending = session.pendingQuestion;
    if (!pending) return;

    clearTimeout(pending.timeout);

    try {
      pending.resolve({ status: "ok" });
    } catch (err) {
      // Response may have already been sent
    }

    session.pendingQuestion = null;
    session.status = "active";
  }

  // ── Convenience queries ────────────────────────────────────

  /**
   * Get sessions that need attention (pending permission or question).
   */
  getAttentionSessions() {
    return this.getAllSessions().filter(
      (s) => s.pendingPermission || s.pendingQuestion
    );
  }

  /**
   * Check if any session needs attention.
   */
  get hasAttentionNeeded() {
    for (const session of this._sessions.values()) {
      if (session.pendingPermission || session.pendingQuestion) return true;
    }
    return false;
  }

  // ── Cleanup ────────────────────────────────────────────────

  _cleanupStale() {
    const now = Date.now();
    for (const [id, session] of this._sessions) {
      if (now - session.lastEventTime > this._staleThresholdMs) {
        this.removeSession(id);
      }
    }
  }

  destroy() {
    clearInterval(this._cleanupTimer);
    // Resolve all pending callbacks
    for (const session of this._sessions.values()) {
      if (session.pendingPermission) {
        this._resolvePermissionCallback(session, "allow", "shutdown");
      }
      if (session.pendingQuestion) {
        this._resolveQuestionCallback(session);
      }
    }
    this._sessions.clear();
    this.removeAllListeners();
  }
}

var SessionTracker_1 = SessionTracker;

var SessionTracker$1 = /*@__PURE__*/getDefaultExportFromCjs(SessionTracker_1);

const { execFile } = require$$0$4;
const { platform } = require$$1$2;

/**
 * Platform-specific terminal window focusing.
 *
 * Searches for terminal windows containing the session ID or project path
 * and brings them to the front.
 *
 * macOS: Uses osascript (AppleScript) to search window titles.
 * Linux: Falls back to wmctrl or xdotool.
 */
class TerminalFocuser {
  constructor(options = {}) {
    this._platform = options.platform || platform();
  }

  /**
   * Attempt to focus a terminal window for the given session.
   * @param {object} opts
   * @param {string} [opts.sessionId] - Session ID to search in window titles
   * @param {string} [opts.projectPath] - Project path to search in window titles
   * @returns {Promise<boolean>} - Whether a window was found and focused
   */
  async focus({ sessionId, projectPath } = {}) {
    const searchTerms = [];
    if (sessionId) searchTerms.push(sessionId);
    if (projectPath) searchTerms.push(projectPath);
    // Also search for "claude" as a fallback
    searchTerms.push("claude");

    if (this._platform === "darwin") {
      return this._focusMacOS(searchTerms);
    } else if (this._platform === "linux") {
      return this._focusLinux(searchTerms);
    }

    return false;
  }

  async _focusMacOS(searchTerms) {
    // Build AppleScript that searches terminal app windows for matching titles
    const conditions = searchTerms
      .map((term) => `name of w contains "${term.replace(/"/g, '\\"')}"`)
      .join(" or ");

    const script = `
      tell application "System Events"
        set termApps to {"Terminal", "iTerm2", "Alacritty", "kitty", "Warp", "Hyper", "WezTerm"}
        repeat with appName in termApps
          if exists (application process appName) then
            tell application process appName
              repeat with w in windows
                if ${conditions} then
                  set frontmost to true
                  perform action "AXRaise" of w
                  return appName as text
                end if
              end repeat
            end tell
          end if
        end repeat
      end tell
      return "none"
    `;

    try {
      const result = await this._run("osascript", ["-e", script]);
      return result.trim() !== "none";
    } catch {
      return false;
    }
  }

  async _focusLinux(searchTerms) {
    // Try wmctrl first
    for (const term of searchTerms) {
      try {
        await this._run("wmctrl", ["-a", term]);
        return true;
      } catch {
        // wmctrl not available or no match, try next
      }
    }

    // Fall back to xdotool
    for (const term of searchTerms) {
      try {
        const windowId = await this._run("xdotool", [
          "search",
          "--name",
          term,
        ]);
        const id = windowId.trim().split("\n")[0];
        if (id) {
          await this._run("xdotool", ["windowactivate", id]);
          return true;
        }
      } catch {
        // xdotool not available or no match
      }
    }

    return false;
  }

  _run(cmd, args) {
    return new Promise((resolve, reject) => {
      execFile(cmd, args, { timeout: 5000 }, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });
  }
}

var TerminalFocuser_1 = TerminalFocuser;

var TerminalFocuser$1 = /*@__PURE__*/getDefaultExportFromCjs(TerminalFocuser_1);

const { EventEmitter: EventEmitter$1 } = require$$0$3;

/**
 * Receives HTTP hook callbacks from Claude Code and translates them
 * into events that update Stream Deck button states.
 *
 * When a SessionTracker is provided, permission requests (pre-tool-use)
 * and questions (stop) can be "held" — the HTTP response is not sent
 * immediately, allowing the user to approve/deny from the Stream Deck.
 *
 * Without a SessionTracker, behaves exactly as before: immediate
 * responses and a single respondAlert for attention-needed events.
 */
class HookReceiver extends EventEmitter$1 {
  constructor(bridgeServer, options = {}) {
    super();
    this.bridge = bridgeServer;
    this.adapter = options.adapter || null;
    this.sessionTracker = options.sessionTracker || null;
    this._registerRoutes();
  }

  /**
   * Connect to a StreamDeckAdapter (can be set after construction).
   */
  setAdapter(adapter) {
    this.adapter = adapter;
  }

  _registerRoutes() {
    const hookEvents = [
      "notification",
      "stop",
      "pre-tool-use",
      "post-tool-use",
      "prompt-submit",
      "permission-request",
      "session-start",
      "session-end",
    ];

    for (const event of hookEvents) {
      this.bridge.route("POST", `/hooks/${event}`, (req, res, body) => {
        this._handleHook(event, body, res);
      });
    }

    this.bridge.route("POST", "/hooks", (req, res, body) => {
      const eventType = body?.event || "unknown";
      this._handleHook(eventType, body, res);
    });
  }

  _handleHook(event, body, res) {
    const normalized = this._normalize(event, body);
    this.emit("hook", normalized);
    this.emit(`hook:${event}`, normalized);

    // Forward context window data if present
    this._updateContextFromHook(normalized);

    // If we have a SessionTracker, use multi-session logic
    if (this.sessionTracker) {
      return this._handleWithSessionTracker(event, normalized, res);
    }

    // Legacy single-session mode
    this._updateBridgeState(event, normalized);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  }

  _normalize(event, body) {
    return {
      event,
      timestamp: Date.now(),
      sessionId: body?.session_id || null,
      tool: body?.tool_name || body?.tool || null,
      message: body?.message || body?.notification || null,
      // Context window usage (when provided by Claude Code hooks)
      tokensUsed: body?.tokens_used || body?.context_tokens || null,
      maxTokens: body?.max_tokens || body?.context_max || null,
      raw: body,
    };
  }

  /**
   * Extract and forward context window data to the adapter's InfobarManager.
   * Claude Code hooks may include token counts in various fields.
   */
  _updateContextFromHook(data) {
    if (!this.adapter?.infobarManager) return;
    if (data.tokensUsed != null) {
      this.adapter.infobarManager.updateContext(
        data.tokensUsed,
        data.maxTokens || undefined
      );
    }
  }

  // ── Multi-session mode (with SessionTracker) ───────────────

  _handleWithSessionTracker(event, data, res) {
    const sessionId = data.sessionId;

    switch (event) {
      case "session-start":
        if (sessionId) {
          this.sessionTracker.registerSession(sessionId);
          this.sessionTracker.updateStatus(sessionId, event);
        }
        this._respondOk(res);
        break;

      case "session-end":
        if (sessionId) {
          this.sessionTracker.updateStatus(sessionId, event);
          this.sessionTracker.removeSession(sessionId);
        }
        this._respondOk(res);
        break;

      case "pre-tool-use": {
        if (!sessionId) {
          this._respondOk(res);
          break;
        }

        const tool = data.tool;

        // Check if tool is already approved for this session
        if (this.sessionTracker.hasSessionApproval(sessionId, tool)) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ decision: "allow" }));
          this.sessionTracker.updateStatus(sessionId, event, { tool });
          break;
        }

        // Hold the HTTP response — Claude waits
        this.sessionTracker.updateStatus(sessionId, event, { tool });
        this.sessionTracker.setPendingPermission(sessionId, {
          tool,
          body: data.raw,
          resolve: (response) => {
            try {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(response));
            } catch {
              // Client may have disconnected
            }
          },
        });
        break;
      }

      case "stop": {
        if (!sessionId) {
          this._updateBridgeState(event, data);
          this._respondOk(res);
          break;
        }

        // Hold the HTTP response for stop hooks too
        this.sessionTracker.updateStatus(sessionId, event);
        this.sessionTracker.setPendingQuestion(sessionId, {
          message: data.message,
          resolve: (response) => {
            try {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(response));
            } catch {
              // Client may have disconnected
            }
          },
        });
        break;
      }

      case "prompt-submit":
        if (sessionId) {
          // User responded in terminal — resolve any pending question
          this.sessionTracker.resolveQuestion(sessionId);
          this.sessionTracker.updateStatus(sessionId, event);
        }
        this._respondOk(res);
        break;

      case "notification":
        if (sessionId) {
          this.sessionTracker.updateStatus(sessionId, event, {
            message: data.message,
          });
        }
        // Also update bridge state for backward compat
        this._updateBridgeState(event, data);
        this._respondOk(res);
        break;

      default:
        // post-tool-use, permission-request, etc.
        if (sessionId) {
          this.sessionTracker.updateStatus(sessionId, event, {
            tool: data.tool,
          });
        }
        this._updateBridgeState(event, data);
        this._respondOk(res);
        break;
    }
  }

  _respondOk(res) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  }

  // ── Legacy single-session bridge state updates ─────────────

  _updateBridgeState(event, data) {
    switch (event) {
      case "session-start":
        this.bridge.updateState({
          claudeStatus: "active",
          lastEvent: event,
        });
        this.bridge.updateButton("status", {
          label: "ACTIVE",
          color: "#00cc66",
        });
        // Session start means Claude is working — clear any stale alert
        if (this.adapter) {
          this.adapter.dismissRespondAlert();
        }
        break;

      case "stop":
        // Claude stopped and is waiting for you to respond!
        this.bridge.updateState({
          claudeStatus: "waiting",
          lastEvent: event,
        });
        this.bridge.updateButton("status", {
          label: "WAITING",
          color: "#ffcc00",
        });
        // BLINK: Claude finished — your turn to respond
        if (this.adapter) {
          this.adapter.triggerRespondAlert("stop", "Your turn");
        }
        break;

      case "notification":
        this.bridge.updateState({
          claudeStatus: "waiting",
          lastEvent: event,
        });
        this.bridge.updateButton("status", {
          label: "ATTENTION",
          color: "#ffcc00",
        });
        // BLINK: Claude is asking for your attention
        if (this.adapter) {
          this.adapter.triggerRespondAlert(
            "notification",
            data.message ? data.message.substring(0, 15) : "Needs input"
          );
        }
        break;

      case "permission-request":
        this.bridge.updateState({
          claudeStatus: "permission",
          lastEvent: event,
        });
        this.bridge.updateButton("status", {
          label: "PERMIT?",
          color: "#ff6600",
        });
        // BLINK: Claude needs permission approval
        if (this.adapter) {
          this.adapter.triggerRespondAlert(
            "permission",
            data.tool ? `Allow ${data.tool}?` : "Permission needed"
          );
        }
        break;

      case "prompt-submit":
        // User just submitted a prompt — they responded, clear alert
        if (this.adapter) {
          this.adapter.dismissRespondAlert();
        }
        break;

      case "pre-tool-use":
        this.bridge.updateButton("tool", {
          label: data.tool || "TOOL",
          color: "#9966ff",
        });
        break;

      case "post-tool-use":
        this.bridge.updateButton("tool", {
          label: "DONE",
          color: "#666666",
        });
        break;

      case "session-end":
        this.bridge.updateState({
          claudeStatus: "offline",
          lastEvent: event,
        });
        this.bridge.updateButton("status", {
          label: "OFFLINE",
          color: "#333333",
        });
        // Session ended — clear alert
        if (this.adapter) {
          this.adapter.dismissRespondAlert();
        }
        break;
    }
  }
}

var HookReceiver_1 = HookReceiver;

var HookReceiver$1 = /*@__PURE__*/getDefaultExportFromCjs(HookReceiver_1);

const { spawn } = require$$0$4;
const { EventEmitter } = require$$0$3;

/**
 * Wraps the Claude Code CLI, providing programmatic control over sessions,
 * prompts, and commands. Designed as the backend for Stream Deck integration.
 */
class ClaudeCodeController extends EventEmitter {
  constructor(options = {}) {
    super();
    this.claudeBinary = options.claudeBinary || "claude";
    this.workingDir = options.workingDir || process.cwd();
    this.sessionId = options.sessionId || null;
    this.model = options.model || null;
    this.allowedTools = options.allowedTools || [];
    this.status = "idle"; // idle | running | waiting | error
    this._activeProcess = null;
    this._lastResult = null;
    this._lastError = null;
    this._history = [];
  }

  _buildArgs(prompt, options = {}) {
    const args = ["--print", "--output-format", "json"];

    if (this.sessionId && options.continue !== false) {
      args.push("--session-id", this.sessionId);
      args.push("--continue");
    }

    if (options.model || this.model) {
      args.push("--model", options.model || this.model);
    }

    const tools = options.allowedTools || this.allowedTools;
    if (tools.length > 0) {
      args.push("--allowedTools", tools.join(","));
    }

    if (options.maxTurns) {
      args.push("--max-turns", String(options.maxTurns));
    }

    if (options.systemPrompt) {
      args.push("--append-system-prompt", options.systemPrompt);
    }

    if (options.permissionMode) {
      args.push("--permission-mode", options.permissionMode);
    }

    args.push(prompt);
    return args;
  }

  /**
   * Send a prompt to Claude Code and get a structured response.
   */
  async send(prompt, options = {}) {
    if (this._activeProcess) {
      throw new Error("A command is already running. Abort it first.");
    }

    this._setStatus("running");
    this.emit("prompt:sent", { prompt });

    return new Promise((resolve, reject) => {
      const args = this._buildArgs(prompt, options);
      let stdout = "";
      let stderr = "";

      this._activeProcess = spawn(this.claudeBinary, args, {
        cwd: options.workingDir || this.workingDir,
        env: { ...process.env },
      });

      this._activeProcess.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      this._activeProcess.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      this._activeProcess.on("close", (code) => {
        this._activeProcess = null;

        if (code !== 0) {
          this._setStatus("error");
          this._lastError = stderr || `Exit code ${code}`;
          const error = new Error(this._lastError);
          this.emit("prompt:error", { prompt, error: this._lastError });
          reject(error);
          return;
        }

        let result;
        try {
          result = JSON.parse(stdout);
        } catch {
          result = { type: "response", result: stdout.trim() };
        }

        // Capture session ID for continuation
        if (result.session_id) {
          this.sessionId = result.session_id;
        }

        this._lastResult = result;
        this._history.push({ prompt, result, timestamp: Date.now() });
        this._setStatus("idle");
        this.emit("prompt:response", result);
        resolve(result);
      });

      this._activeProcess.on("error", (err) => {
        this._activeProcess = null;
        this._setStatus("error");
        this._lastError = err.message;
        this.emit("prompt:error", { prompt, error: err.message });
        reject(err);
      });
    });
  }

  /**
   * Abort the currently running command.
   */
  abort() {
    if (this._activeProcess) {
      this._activeProcess.kill("SIGTERM");
      this._activeProcess = null;
      this._setStatus("idle");
      this.emit("command:aborted");
      return true;
    }
    return false;
  }

  /**
   * Quick one-shot command without session continuity.
   */
  async oneShot(prompt, options = {}) {
    return this.send(prompt, { ...options, continue: false });
  }

  /**
   * Get Claude Code version info.
   */
  async getVersion() {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.claudeBinary, ["--version"], {
        cwd: this.workingDir,
      });
      let output = "";
      proc.stdout.on("data", (d) => (output += d));
      proc.on("close", () => resolve(output.trim()));
      proc.on("error", reject);
    });
  }

  /**
   * Get status information.
   */
  getStatus() {
    return {
      status: this.status,
      sessionId: this.sessionId,
      historyLength: this._history.length,
      lastError: this._lastError,
      isRunning: this._activeProcess !== null,
    };
  }

  /**
   * Reset the session (start fresh).
   */
  resetSession() {
    this.abort();
    this.sessionId = null;
    this._history = [];
    this._lastResult = null;
    this._lastError = null;
    this._setStatus("idle");
    this.emit("session:reset");
  }

  _setStatus(status) {
    const previous = this.status;
    this.status = status;
    if (previous !== status) {
      this.emit("status:change", { previous, current: status });
    }
  }
}

var ClaudeCodeController_1 = ClaudeCodeController;

var ClaudeCodeController$1 = /*@__PURE__*/getDefaultExportFromCjs(ClaudeCodeController_1);

/**
 * PluginCore — Central hub replacing StreamDeckAdapter + BridgeServer roles.
 *
 * Creates all existing modules (HookServer, SessionTracker, AlertManager,
 * ButtonRenderer, LayoutManager, InfobarManager, ClaudeCodeController)
 * and wires them together using BridgeFacade to satisfy the `bridge` parameter.
 */
class PluginCore extends EventEmitter$8 {
    hookServer;
    bridge;
    renderer;
    alertManager;
    sessionTracker;
    terminalFocuser;
    layoutManager;
    infobarManager;
    hookReceiver;
    controller;
    /** Map of SDK context ID → ActionInstance */
    _instances = new Map();
    /** Per-action button states */
    _buttonStates = {};
    /** Dial values for encoder actions */
    _dialValues = {};
    /** Custom prompts set by user */
    _customPrompts = {};
    constructor(options = {}) {
        super();
        // Core infrastructure
        this.hookServer = new HookServer({ port: options.port, host: options.host });
        this.bridge = new BridgeFacade(this.hookServer);
        this.renderer = new ButtonRenderer$1({ width: 144, height: 144 });
        // Session management
        this.sessionTracker = new SessionTracker$1();
        this.terminalFocuser = new TerminalFocuser$1();
        // Layout (default to standard 15-key)
        this.layoutManager = new LayoutManager$1({
            layout: actions.getLayout("standard"),
            device: { keys: 15, cols: 5 },
        });
        // Alert system
        this.alertManager = new AlertManager$1({ blinkIntervalMs: 500 });
        // Infobar / context gauge / LEDs
        this.infobarManager = new InfobarManager$1(this.bridge, {
            maxTokens: 200000,
        });
        // Claude Code CLI controller
        this.controller = new ClaudeCodeController$1({
            claudeBinary: options.claudeBinary,
            workingDir: options.workingDir,
        });
        // Hook receiver — registers HTTP routes on the bridge facade
        this.hookReceiver = new HookReceiver$1(this.bridge, {
            sessionTracker: this.sessionTracker,
        });
        // Wire adapter so HookReceiver can trigger alerts and update context gauge
        this.hookReceiver.setAdapter(this);
        // Wire events
        this._bindBroadcastEvents();
        this._bindAlertEvents();
        this._bindSessionEvents();
        this._bindLayoutEvents();
        this._bindControllerEvents();
    }
    /**
     * Start the hook server.
     */
    async start() {
        await this.hookServer.start();
        streamDeck.logger.info(`Hook server listening on ${this.hookServer.host}:${this.hookServer.port}`);
    }
    /**
     * Stop everything.
     */
    async stop() {
        this.alertManager.clearAll();
        this.infobarManager.destroy();
        this.sessionTracker.destroy();
        await this.hookServer.stop();
    }
    // ── Instance registry ─────────────────────────────────────────
    /**
     * Register an SDK action instance when it appears on the Stream Deck.
     */
    registerInstance(sdAction, actionId, ev, keyIndex) {
        const context = ev.action.id;
        const instance = {
            sdAction,
            actionId,
            deviceId: ev.device ?? "",
            context,
            isEncoder: typeof ev.action.isEncoder === "function" ? ev.action.isEncoder() : false,
            keyIndex: keyIndex ?? -1,
        };
        this._instances.set(context, instance);
        // Render initial state
        const action = actions.getAction(actionId);
        if (action) {
            const state = this._buttonStates[actionId] || { ...action.defaultState };
            this._renderInstance(instance, state);
        }
    }
    /**
     * Unregister an SDK action instance when it disappears.
     */
    unregisterInstance(sdAction, ev) {
        const context = ev.action.id;
        this._instances.delete(context);
    }
    /**
     * Get a registered instance by its context ID.
     */
    getInstance(contextId) {
        return this._instances.get(contextId);
    }
    /**
     * Trigger the respond alert (called by HookReceiver adapter).
     */
    triggerRespondAlert(reason, sublabel) {
        const action = actions.getAction("respondAlert");
        if (action?.alertState) {
            this.alertManager.startAlert("respondAlert", {
                reason,
                sublabel: sublabel || action.alertState.label,
                ...action.alertState,
            });
        }
    }
    /**
     * Dismiss the respond alert (called by HookReceiver adapter).
     */
    dismissRespondAlert() {
        this.alertManager.clearAlert("respondAlert");
        this._resetRespondButton();
    }
    // ── Action execution ──────────────────────────────────────────
    /**
     * Execute an action by its internal actionId.
     */
    async executeAction(actionId, context) {
        const action = actions.getAction(actionId);
        if (!action)
            return;
        switch (action.handler) {
            case "sendPrompt": {
                const prompt = this._customPrompts[actionId] || action.payload?.prompt;
                if (!prompt)
                    return;
                try {
                    await this.controller.send(prompt, {
                        allowedTools: action.payload?.allowedTools,
                    });
                }
                catch {
                    // Controller emits error events
                }
                break;
            }
            case "abort":
                this.controller.abort();
                break;
            case "resetSession":
                this.controller.resetSession();
                break;
            case "getStatus":
                // No-op for native plugin — status displayed directly
                break;
            case "dismissAlert":
                this.alertManager.clearAlert("respondAlert");
                this._resetRespondButton();
                break;
            case "acceptPermission":
                // Resolve focused session permission
                if (this.layoutManager.focusedSessionId) {
                    this.sessionTracker.resolvePendingPermission(this.layoutManager.focusedSessionId, "allow");
                }
                break;
            case "pushToTalk":
                // Future: voice input
                break;
            case "focusSession":
                this._handleFocusSession(context);
                break;
            case "permissionDecision":
                this._handlePermissionDecision(context);
                break;
            case "navigateBack":
                this._handleNavigateBack();
                break;
            case "showSessions":
                this.layoutManager.switchView("sessions");
                this._refreshAllButtons();
                break;
            case "focusTerminal":
                this._handleFocusTerminal(context);
                break;
            case "prevPage":
                this.layoutManager.prevPage();
                this._refreshAllButtons();
                break;
            case "nextPage":
                this.layoutManager.nextPage();
                this._refreshAllButtons();
                break;
        }
    }
    // ── Encoder handling ──────────────────────────────────────────
    handleDialRotate(actionId, ticks) {
        const action = actions.getAction(actionId);
        if (!action)
            return;
        const step = action.step || 1;
        const min = action.min || 0;
        const max = action.max || 100;
        const current = this._dialValues[actionId] || min;
        const newValue = Math.max(min, Math.min(max, current + ticks * step));
        this._dialValues[actionId] = newValue;
        this._updateActionState(actionId, {
            ...(this._buttonStates[actionId] || action.defaultState),
            sublabel: `${newValue}`,
        });
    }
    handleDialPress(actionId) {
        const action = actions.getAction(actionId);
        if (!action)
            return;
        if (action.onPress === "resetScroll") {
            this._dialValues[actionId] = 0;
        }
        else if (action.onPress === "confirmModel") {
            const options = action.options || [];
            const idx = (this._dialValues[actionId] || 0) % options.length;
            const model = options[idx];
            if (model)
                this.controller.model = model;
        }
        else if (action.onPress === "resetMaxTurns") {
            this._dialValues[actionId] = action.min || 1;
        }
        else if (action.onPress === "toggleMute") {
            const muted = !this._buttonStates[actionId]?.muted;
            this._updateActionState(actionId, {
                ...this._buttonStates[actionId],
                muted,
                sublabel: muted ? "MUTED" : `${this._dialValues[actionId]}`,
            });
        }
    }
    // ── Settings update ───────────────────────────────────────────
    handleSettingsUpdate(actionId, settings) {
        if (settings.customPrompt) {
            this._customPrompts[actionId] = settings.customPrompt;
        }
        // Re-render the button with potentially new actionId
        const action = actions.getAction(actionId);
        if (action) {
            this._updateActionState(actionId, { ...action.defaultState });
        }
    }
    // ── Internal: broadcast event handling ────────────────────────
    _bindBroadcastEvents() {
        this.bridge.on("broadcast", (msg) => {
            const { type, data } = msg;
            switch (type) {
                case "button:update":
                    this._onButtonUpdate(data.buttonId, data.state);
                    break;
                case "infobar:update":
                    this._onInfobarUpdate(data);
                    break;
                case "touchpoint:led":
                    // Store for future Neo LED API support
                    break;
                case "button:render":
                    this._onButtonRender(data.buttonId, data.state, data.keyIndex);
                    break;
                case "view:changed":
                    this._refreshAllButtons();
                    break;
            }
        });
    }
    _onButtonUpdate(buttonId, state) {
        this._buttonStates[buttonId] = { ...this._buttonStates[buttonId], ...state };
        this._pushImageToInstances(buttonId, state);
    }
    _onButtonRender(buttonId, state, keyIndex) {
        this._buttonStates[buttonId] = state;
        this._pushImageToInstances(buttonId, state);
    }
    _onInfobarUpdate(data) {
        // Push to all context-gauge encoder instances
        for (const instance of this._instances.values()) {
            if (instance.actionId === "contextGauge") {
                const color = data.color || "#00cc66";
                try {
                    instance.sdAction.setFeedback({
                        "gauge-bar": {
                            value: data.percent || 0,
                            bar_fill_c: `0:${color},1:${color}`,
                        },
                        "gauge-percent": `${data.percent || 0}%`,
                        "gauge-tokens": `${data.formatted || "0k"} / ${data.maxFormatted || "200k"}`,
                    });
                }
                catch {
                    // Instance may have been removed
                }
            }
        }
    }
    // ── Internal: alert events ────────────────────────────────────
    _bindAlertEvents() {
        this.alertManager.on("blink", ({ buttonId, state }) => {
            // Push blink frame directly to matching instances
            this._pushImageToInstances(buttonId, state);
        });
        this.alertManager.on("alert:start", ({ buttonId, reason }) => {
            this.emit("alert:start", { buttonId, reason });
        });
        this.alertManager.on("alert:clear", ({ buttonId }) => {
            // Restore default state
            const action = actions.getAction(buttonId);
            if (action) {
                const state = this._buttonStates[buttonId] || action.defaultState;
                this._pushImageToInstances(buttonId, state);
            }
        });
    }
    // ── Internal: session events ──────────────────────────────────
    _bindSessionEvents() {
        this.sessionTracker.on("session:added", () => {
            this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
            if (this.layoutManager.currentView === "sessions") {
                this._refreshAllButtons();
            }
        });
        this.sessionTracker.on("session:removed", ({ sessionId }) => {
            this.alertManager.clearAlert(`session:${sessionId}`);
            this.infobarManager.removeSessionColor(sessionId);
            this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
            if (this.layoutManager.currentView === "sessions") {
                this._refreshAllButtons();
            }
            if (this.layoutManager.focusedSessionId === sessionId) {
                this.layoutManager.switchView("sessions");
                this._refreshAllButtons();
            }
        });
        this.sessionTracker.on("session:updated", () => {
            this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
            if (this.layoutManager.currentView === "sessions") {
                this._refreshAllButtons();
            }
        });
        this.sessionTracker.on("permission:pending", ({ sessionId, tool }) => {
            const sessionColor = this.infobarManager.getSessionColor(sessionId);
            this.alertManager.startAlert(`session:${sessionId}`, {
                reason: "permission",
                label: sessionId.slice(-4),
                sublabel: tool ? `${tool}?` : "Permit?",
                onColor: sessionColor,
                offColor: "#331100",
                icon: "shield",
            });
            this.infobarManager.showSessionAlert(sessionId, "permission");
            this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
            if (this.layoutManager.currentView === "sessions") {
                this._refreshAllButtons();
            }
        });
        this.sessionTracker.on("permission:resolved", ({ sessionId }) => {
            this.alertManager.clearAlert(`session:${sessionId}`);
            this.infobarManager.stopAnimation();
            this.infobarManager.onSystemStateChange("active");
            this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
            if (this.layoutManager.currentView === "permission" &&
                this.layoutManager.focusedSessionId === sessionId) {
                this.layoutManager.switchView("sessions");
            }
            this._refreshAllButtons();
        });
        this.sessionTracker.on("question:pending", ({ sessionId, message }) => {
            const sessionColor = this.infobarManager.getSessionColor(sessionId);
            this.alertManager.startAlert(`session:${sessionId}`, {
                reason: "question",
                label: sessionId.slice(-4),
                sublabel: message ? message.substring(0, 10) : "Question",
                onColor: sessionColor,
                offColor: "#332200",
                icon: "clock",
            });
            this.infobarManager.showSessionAlert(sessionId, "waiting");
            this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
            if (this.layoutManager.currentView === "sessions") {
                this._refreshAllButtons();
            }
        });
        this.sessionTracker.on("question:resolved", ({ sessionId }) => {
            this.alertManager.clearAlert(`session:${sessionId}`);
            this.infobarManager.stopAnimation();
            this.infobarManager.onSystemStateChange("active");
            this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
            if (this.layoutManager.currentView === "question" &&
                this.layoutManager.focusedSessionId === sessionId) {
                this.layoutManager.switchView("sessions");
            }
            this._refreshAllButtons();
        });
    }
    // ── Internal: layout events ───────────────────────────────────
    _bindLayoutEvents() {
        this.layoutManager.on("view:changed", () => {
            this._refreshAllButtons();
        });
    }
    // ── Internal: controller events ───────────────────────────────
    _bindControllerEvents() {
        this.controller.on("status:change", ({ current }) => {
            const statusAction = actions.getAction("status");
            if (statusAction?.states?.[current]) {
                this._updateActionState("status", statusAction.states[current]);
            }
            this.infobarManager.onSystemStateChange(current);
        });
        this.controller.on("prompt:sent", () => {
            this.alertManager.clearAlert("respondAlert");
            this._resetRespondButton();
        });
        this.controller.on("prompt:response", () => {
            this._updateActionState("status", {
                label: "DONE",
                color: "#4488ff",
                icon: "check",
            });
            setTimeout(() => {
                this._updateActionState("status", {
                    label: "IDLE",
                    color: "#4488ff",
                    icon: "circle",
                });
            }, 3000);
        });
        this.controller.on("prompt:error", ({ error }) => {
            this._updateActionState("status", {
                label: "ERROR",
                color: "#cc0000",
                icon: "alert",
                sublabel: typeof error === "string" ? error.substring(0, 15) : "Error",
            });
        });
    }
    // ── Internal: multi-session handlers ──────────────────────────
    _handleFocusSession(context) {
        if (!context?.sessionId)
            return;
        const session = this.sessionTracker.getSession(context.sessionId);
        if (!session)
            return;
        if (session.pendingPermission) {
            this.layoutManager.switchView("permission", { sessionId: context.sessionId });
        }
        else if (session.pendingQuestion) {
            this.layoutManager.switchView("question", { sessionId: context.sessionId });
        }
        else {
            this._handleFocusTerminal(context);
        }
    }
    _handlePermissionDecision(context) {
        const sessionId = this.layoutManager.focusedSessionId;
        if (!sessionId)
            return;
        const decision = context?.meta?.decision;
        if (!decision)
            return;
        if (decision === "allowSession") {
            const session = this.sessionTracker.getSession(sessionId);
            if (session?.pendingPermission) {
                this.sessionTracker.addSessionApproval(sessionId, session.pendingPermission.tool);
            }
            this.sessionTracker.resolvePendingPermission(sessionId, "allow");
        }
        else if (decision === "allow") {
            this.sessionTracker.resolvePendingPermission(sessionId, "allow");
        }
        else if (decision === "deny") {
            this.sessionTracker.resolvePendingPermission(sessionId, "deny", "denied by user");
        }
        this.layoutManager.switchView("sessions");
        this._refreshAllButtons();
    }
    _handleNavigateBack() {
        const current = this.layoutManager.currentView;
        if (current === "permission" || current === "question") {
            this.layoutManager.switchView("sessions");
        }
        else if (current === "sessions") {
            this.layoutManager.switchView("default");
        }
        this._refreshAllButtons();
    }
    async _handleFocusTerminal(context) {
        const sessionId = context?.sessionId || this.layoutManager.focusedSessionId;
        if (!sessionId)
            return;
        await this.terminalFocuser.focus({ sessionId });
    }
    // ── Internal: rendering ───────────────────────────────────────
    _updateActionState(actionId, state) {
        this._buttonStates[actionId] = state;
        this._pushImageToInstances(actionId, state);
    }
    _resetRespondButton() {
        const action = actions.getAction("respondAlert");
        if (action) {
            this._updateActionState("respondAlert", { ...action.defaultState });
        }
    }
    /**
     * Push a rendered SVG image to all SDK instances of a given actionId.
     */
    _pushImageToInstances(actionId, state) {
        const dataUri = this.renderer.renderDataUri(state);
        for (const instance of this._instances.values()) {
            if (instance.actionId === actionId && !instance.isEncoder) {
                try {
                    instance.sdAction.setImage(dataUri);
                }
                catch {
                    // Instance may have been removed
                }
            }
        }
    }
    /**
     * Render an individual instance with a given state.
     */
    _renderInstance(instance, state) {
        if (instance.isEncoder) {
            // Encoders use setFeedback, not setImage
            return;
        }
        const dataUri = this.renderer.renderDataUri(state);
        try {
            instance.sdAction.setImage(dataUri);
        }
        catch {
            // Instance may have been removed
        }
    }
    /**
     * Refresh all button instances for the current view.
     * Mirrors StreamDeckAdapter._refreshAllButtons().
     */
    _refreshAllButtons() {
        const layout = this.layoutManager.getCurrentLayout();
        const totalKeys = this.layoutManager._device?.keys || 15;
        // Build a keyIndex → state map from the current layout
        const keyStates = {};
        for (let i = 0; i < totalKeys; i++) {
            const context = layout.keys[i];
            if (!context) {
                keyStates[i] = {
                    actionId: `_key_${i}`,
                    state: { label: "", color: "#000000" },
                };
                continue;
            }
            const actionId = context.actionId;
            const action = actions.getAction(actionId);
            if (!action)
                continue;
            let state = { ...action.defaultState };
            // Dynamic state for session buttons
            if (actionId === "sessionButton" && context.meta?.session) {
                state = this._sessionButtonState(context.meta.session);
            }
            // Dynamic state for permission/question info
            if (actionId === "permissionInfo" && this.layoutManager.focusedSessionId) {
                const session = this.sessionTracker.getSession(this.layoutManager.focusedSessionId);
                if (session?.pendingPermission) {
                    state = {
                        label: session.pendingPermission.tool || "TOOL",
                        color: "#ff6600",
                        icon: "shield",
                        sublabel: `Session ${session.label}`,
                    };
                }
                else if (session?.pendingQuestion) {
                    state = {
                        label: "QUESTION",
                        color: "#ffcc00",
                        icon: "clock",
                        sublabel: session.pendingQuestion.message
                            ? session.pendingQuestion.message.substring(0, 12)
                            : "",
                    };
                }
            }
            this._buttonStates[actionId] = state;
            keyStates[i] = { actionId, state };
        }
        // Push to instances by keyIndex
        for (const instance of this._instances.values()) {
            if (instance.isEncoder)
                continue;
            const ks = keyStates[instance.keyIndex];
            if (ks) {
                this._renderInstance(instance, ks.state);
            }
        }
    }
    _sessionButtonState(session) {
        const label = session.label || "SESS";
        if (session.pendingPermission) {
            return {
                label,
                color: "#ff6600",
                icon: "shield",
                sublabel: session.pendingPermission.tool || "Permit?",
            };
        }
        if (session.pendingQuestion) {
            return {
                label,
                color: "#ffcc00",
                icon: "clock",
                sublabel: "Question",
            };
        }
        const statusColors = {
            active: "#00cc66",
            tool: "#9966ff",
            waiting: "#ffcc00",
            attention: "#ffcc00",
            permission: "#ff6600",
            offline: "#333333",
        };
        return {
            label,
            color: statusColors[session.status] || "#444444",
            icon: "circle",
            sublabel: session.currentTool || session.status || "",
        };
    }
}

let core$7;
function setStatusCore(c) {
    core$7 = c;
}
@action({ UUID: "com.claude.code-control.status" })
class StatusAction extends SingletonAction {
    async onWillAppear(ev) {
        const actionId = ev.payload.settings.actionId || "status";
        const coords = ev.payload.coordinates;
        const cols = 5;
        const keyIndex = coords ? (coords.row * cols + coords.column) : -1;
        core$7.registerInstance(ev.action, actionId, ev, keyIndex);
    }
    async onWillDisappear(ev) {
        core$7.unregisterInstance(ev.action, ev);
    }
    async onKeyDown(ev) {
        const actionId = ev.payload.settings.actionId || "status";
        if (actionId === "respondAlert") {
            await core$7.executeAction("respondAlert");
        }
    }
    async onDidReceiveSettings(ev) {
        const actionId = ev.payload.settings.actionId || "status";
        core$7.handleSettingsUpdate(actionId, ev.payload.settings);
    }
}

let core$6;
function setPromptCore(c) {
    core$6 = c;
}
@action({ UUID: "com.claude.code-control.prompt" })
class PromptAction extends SingletonAction {
    async onWillAppear(ev) {
        const actionId = ev.payload.settings.actionId || "reviewCode";
        const coords = ev.payload.coordinates;
        const cols = 5;
        const keyIndex = coords ? (coords.row * cols + coords.column) : -1;
        core$6.registerInstance(ev.action, actionId, ev, keyIndex);
    }
    async onWillDisappear(ev) {
        core$6.unregisterInstance(ev.action, ev);
    }
    async onKeyDown(ev) {
        const actionId = ev.payload.settings.actionId || "reviewCode";
        await core$6.executeAction(actionId);
    }
    async onDidReceiveSettings(ev) {
        const actionId = ev.payload.settings.actionId || "reviewCode";
        core$6.handleSettingsUpdate(actionId, ev.payload.settings);
    }
}

let core$5;
function setControlCore(c) {
    core$5 = c;
}
@action({ UUID: "com.claude.code-control.control" })
class ControlAction extends SingletonAction {
    async onWillAppear(ev) {
        const actionId = ev.payload.settings.actionId || "abort";
        const coords = ev.payload.coordinates;
        const cols = 5;
        const keyIndex = coords ? (coords.row * cols + coords.column) : -1;
        core$5.registerInstance(ev.action, actionId, ev, keyIndex);
    }
    async onWillDisappear(ev) {
        core$5.unregisterInstance(ev.action, ev);
    }
    async onKeyDown(ev) {
        const actionId = ev.payload.settings.actionId || "abort";
        await core$5.executeAction(actionId);
    }
    async onDidReceiveSettings(ev) {
        const actionId = ev.payload.settings.actionId || "abort";
        core$5.handleSettingsUpdate(actionId, ev.payload.settings);
    }
}

let core$4;
function setSessionCore(c) {
    core$4 = c;
}
@action({ UUID: "com.claude.code-control.session" })
class SessionAction extends SingletonAction {
    async onWillAppear(ev) {
        const coords = ev.payload.coordinates;
        const cols = 5;
        const keyIndex = coords ? (coords.row * cols + coords.column) : -1;
        core$4.registerInstance(ev.action, "sessionButton", ev, keyIndex);
    }
    async onWillDisappear(ev) {
        core$4.unregisterInstance(ev.action, ev);
    }
    async onKeyDown(ev) {
        const layout = core$4.layoutManager.getCurrentLayout();
        const instance = core$4.getInstance(ev.action.id);
        if (!instance)
            return;
        const context = layout.keys[instance.keyIndex];
        if (context) {
            await core$4.executeAction(context.actionId, context);
        }
    }
}

let core$3;
function setEncoderCore(c) {
    core$3 = c;
}
@action({ UUID: "com.claude.code-control.encoder" })
class EncoderAction extends SingletonAction {
    async onWillAppear(ev) {
        const actionId = ev.payload.settings.actionId || "scrollContext";
        core$3.registerInstance(ev.action, actionId, ev);
    }
    async onWillDisappear(ev) {
        core$3.unregisterInstance(ev.action, ev);
    }
    async onDialRotate(ev) {
        const actionId = ev.payload.settings.actionId || "scrollContext";
        core$3.handleDialRotate(actionId, ev.payload.ticks);
    }
    async onDialDown(ev) {
        const actionId = ev.payload.settings.actionId || "scrollContext";
        core$3.handleDialPress(actionId);
    }
    async onTouchTap(ev) {
        const actionId = ev.payload.settings.actionId || "scrollContext";
        core$3.handleDialPress(actionId);
    }
    async onDidReceiveSettings(ev) {
        const actionId = ev.payload.settings.actionId || "scrollContext";
        core$3.handleSettingsUpdate(actionId, ev.payload.settings);
    }
}

let core$2;
function setContextGaugeCore(c) {
    core$2 = c;
}
@action({ UUID: "com.claude.code-control.context-gauge" })
class ContextGaugeAction extends SingletonAction {
    async onWillAppear(ev) {
        core$2.registerInstance(ev.action, "contextGauge", ev);
        const state = core$2.infobarManager.getState();
        try {
            await ev.action.setFeedback({
                "gauge-bar": {
                    value: state.percent || 0,
                    bar_fill_c: `0:${state.color || "#00cc66"},1:${state.color || "#00cc66"}`,
                },
                "gauge-percent": `${state.percent || 0}%`,
                "gauge-tokens": `${formatTokens(state.tokensUsed || 0)} / ${formatTokens(state.maxTokens || 200000)}`,
            });
        }
        catch {
            // Instance setup may fail transiently
        }
    }
    async onWillDisappear(ev) {
        core$2.unregisterInstance(ev.action, ev);
    }
    async onDialDown(ev) {
        const state = core$2.infobarManager.getState();
        try {
            await ev.action.setFeedback({
                "gauge-bar": {
                    value: state.percent || 0,
                    bar_fill_c: `0:${state.color || "#00cc66"},1:${state.color || "#00cc66"}`,
                },
                "gauge-percent": `${state.percent || 0}%`,
                "gauge-tokens": `${formatTokens(state.tokensUsed || 0)} / ${formatTokens(state.maxTokens || 200000)}`,
            });
        }
        catch {
            // Ignore
        }
    }
    async onDialRotate(_ev) {
        // No action on rotate for gauge
    }
    async onTouchTap(_ev) {
        // Future: toggle detail view
    }
}
function formatTokens(n) {
    if (n >= 1000000)
        return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000)
        return `${Math.round(n / 1000)}k`;
    return String(n);
}

let core$1;
function setPedalCore(c) {
    core$1 = c;
}
@action({ UUID: "com.claude.code-control.pedal" })
class PedalAction extends SingletonAction {
    async onWillAppear(ev) {
        const actionId = ev.payload.settings.actionId || "pedalAbort";
        core$1.registerInstance(ev.action, actionId, ev);
    }
    async onWillDisappear(ev) {
        core$1.unregisterInstance(ev.action, ev);
    }
    async onKeyDown(ev) {
        const actionId = ev.payload.settings.actionId || "pedalAbort";
        await core$1.executeAction(actionId);
    }
    async onDidReceiveSettings(ev) {
        const actionId = ev.payload.settings.actionId || "pedalAbort";
        core$1.handleSettingsUpdate(actionId, ev.payload.settings);
    }
}

// Create the plugin core singleton
const core = new PluginCore({
    port: 8247,
    host: "127.0.0.1",
});
// Inject core into all action classes
setStatusCore(core);
setPromptCore(core);
setControlCore(core);
setSessionCore(core);
setEncoderCore(core);
setContextGaugeCore(core);
setPedalCore(core);
// Configure logging
streamDeck.logger.setLevel("INFO");
// Register all action types
streamDeck.actions.registerAction(new StatusAction());
streamDeck.actions.registerAction(new PromptAction());
streamDeck.actions.registerAction(new ControlAction());
streamDeck.actions.registerAction(new SessionAction());
streamDeck.actions.registerAction(new EncoderAction());
streamDeck.actions.registerAction(new ContextGaugeAction());
streamDeck.actions.registerAction(new PedalAction());
// Connect to Stream Deck, then start the hook server
streamDeck.connect().then(async () => {
    try {
        await core.start();
        streamDeck.logger.info("Claude Code Control plugin started successfully");
    }
    catch (err) {
        streamDeck.logger.error(`Failed to start hook server: ${err.message}`);
    }
});
// Handle graceful shutdown
process.on("SIGTERM", async () => {
    await core.stop();
    process.exit(0);
});
process.on("SIGINT", async () => {
    await core.stop();
    process.exit(0);
});
//# sourceMappingURL=plugin.js.map
