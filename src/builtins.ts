import { BSON } from "mongodb";

const notImplementedFn = () => {
  throw new Error("Not implemented in realtimate");
};

export const builtins = {
  Object,
  Function,
  Array,
  String,
  NaN,
  undefined,
  Infinity,
  isNaN,
  parseInt,
  parseFloat,
  isFinite,
  decodeURI,
  decodeURIComponent,
  encodeURI,
  encodeURIComponent,
  escape,
  unescape,
  Number,
  RegExp,
  Date,
  Boolean,
  Error,
  AggregateError,
  TypeError,
  ReferenceError,
  SyntaxError,
  RangeError,
  EvalError,
  URIError,
  //  GoError,
  eval,
  Math,
  JSON,
  ArrayBuffer,
  DataView,
  Uint8Array,
  Uint8ClampedArray,
  Int8Array,
  Uint16Array,
  Int16Array,
  Uint32Array,
  Int32Array,
  Float32Array,
  Float64Array,
  Symbol,
  WeakSet,
  WeakMap,
  Map,
  Set,
  // regeneratorRuntime,
  // FunctionError,
  // StitchError,
  Promise,
  BSON,
  EJSON: require("ejson"),
  utils: {
    crypto: {
      encrypt: notImplementedFn,
      decrypt: notImplementedFn,
      sign: notImplementedFn,
      verify: notImplementedFn,
      hmac: notImplementedFn,
      hash: notImplementedFn,
    },
    jwt: {
      encode: notImplementedFn,
      decode: notImplementedFn,
    },
  },
  setTimeout,
  setInterval,
  setImmediate,
  clearTimeout,
  clearInterval,
  clearImmediate,
  console,
  require,
  Buffer,
  process,
  URL,
  URLSearchParams,
};
