/// <reference types="mongodb" />

type FNAME = (name: string, ...args: any[]) => any;

type Services = {
  // add your other services here
  (name: string): import('mongodb').MongoClient;
};

type context = {
  http: {
    get: (options: {
      url: string;
      headers?: any;
    }) => Promise<any>;
    post: (options: {
      url: string;
      body: any;
    }) => Promise<any>;
  };
  services: {
    get: Services;
  };
  environment: {
    tag: string;
    values: Record<string, string>;
  };
  request: {
    remoteIPAddress: string;
    requestHeaders: object;
    webhookUrl?: string;
    httpMethod?: string;
    rawQueryString: string;
    httpReferrer?: string;
    httpUserAgent?: string;
    service: string;
    action: string;
  } | undefined;
  functions: {
    execute: FNAME;
  };
  user: {
    id: string;
    type: 'normal' | 'server' | 'system';
    data: object;
    custom_data: object;
    identities: any[];
  };
  values: {
    get: (name: string) => string | undefined;
  };
};

type utils = {
   crypto: {
      encrypt: () => void,
      decrypt: () => void,
      sign: () => void,
      verify: () => void,
      hmac: () => void,
      hash: () => void,
    },
    jwt: {
      encode: () => void,
      decode: () => void,
    },
}



type BSON  = {
  ObjectId: (id?: string) => import('mongodb').BSON.ObjectId;
}


type response = {
  setStatusCode: (code: number) => void;
  setBody: (body: string) => void;
  addHeader: (header: string, value: string) => void;
};

type request = {
  body: string;
  query: Record<string, string>;
  headers: Record<string, string>
  
};

type callableFunction<T = unknown,V = unknown> = (...args: V[]) => Promise<T> | T;
type httpFunction = callableFunction<void, [request, response]>;

type Realm ={
  context: context;
  response: response;
  request: request;
  callableFunction: callableFunction;
  httpFunction: httpFunction;
};



declare module 'context' {
  global {
    const context: Realm['context'];
    const Realm: Realm;
    const BSON: BSON;
    const utils: utils;
    const EJSON: typeof import('ejson');
  }
}