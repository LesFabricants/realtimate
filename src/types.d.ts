/// <reference types="mongodb" />


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
    execute: (name: string, ...args: any[]) => any;
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



type Realm ={
  context: context;
  response: response;
  request: request;
};



declare module 'context' {
  global {
    const context: Realm['context'];
    const Realm: Realm;
  }
}