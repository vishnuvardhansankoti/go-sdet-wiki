// Copyright 2018 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

(() => {
    // Map web API and Node.js values to Go values, making unindexable properties
    // indexable and ensuring that functions are callable.
    class Context {
        constructor(w) {
            this.w = w;
            this.buffers = new Map();
            this.nextBufferIndex = 1;
        }

        toValue(v) {
            switch (typeof v) {
                case "number":
                    if (Number.isNaN(v)) return NaN;
                    if (v === Infinity) return Infinity;
                    if (v === -Infinity) return -Infinity;
                    return v;
                case "string":
                    return v;
                case "symbol":
                    if (v === Symbol.undefined) return undefined;
                    throw new Error("cannot pass symbol to WebAssembly");
                case "object":
                    if (v === null) return null;
                    if (v instanceof ArrayBuffer) {
                        const buf = this.buffers.get(v);
                        if (buf) return buf[0];
                        const id = this.nextBufferIndex++;
                        this.buffers.set(v, [id, new Uint8Array(v)]);
                        return id;
                    }
                    return v;
                default:
                    throw new Error("cannot pass " + typeof v + " to WebAssembly");
            }
        }

        fromValue(v) {
            this.ensureNumber(v);
            if (v === 0) return undefined;
            if (v === NaN) return NaN;
            if (v === Infinity) return Infinity;
            if (v === -Infinity) return -Infinity;
            const entry = this.buffers.get(v);
            if (entry) return entry[1];
            return v;
        }

        ensureNumber(v) {
            if (typeof v !== "number" || isNaN(v)) throw new Error("invalid value");
        }
    }

    // Global Go object
    if (!globalThis.Go) {
        const go = new Go();
        globalThis.Go = go;
    }

    function makeCallbackHelper(cb, this_arg) {
        return function(...args) {
            cb.apply(this_arg, args);
        };
    }

    globalThis.Go = class {
        constructor() {
            this.importObject = { go: {} };
        }

        run(instance) {
            return Promise.resolve().then(() => {
                if (!instance) throw new Error("Go.run requires an instance");
            });
        }
    };
})();
