/// <reference types="mongodb" />

type Services = {
  // add your other services here
  (name: string): import("mongodb").MongoClient;
};

type RealmContext = {
  http: {
    get: (options: { url: string; headers?: any }) => Promise<any>;
    post: (options: { url: string; body: any }) => Promise<any>;
  };

  services: {
    get: Services;
  };

  environment: {
    tag: string;
    values: Record<string, string>;
  };
  request:
    | {
        remoteIPAddress: string;
        requestHeaders: object;
        webhookUrl?: string;
        httpMethod?: string;
        rawQueryString: string;
        httpReferrer?: string;
        httpUserAgent?: string;
        service: string;
        action: string;
      }
    | undefined;
  functions: {
    execute: (name: string, ...args: any[]) => any;
  };
  user: {
    id: string;
    type: "normal" | "server" | "system";
    data: object;
    custom_data: object;
    identities: any[];
  };

  values: {
    get: (name: string) => string | undefined;
  };
};

type RealmResponse = {
  setStatusCode: (code: number) => void;
  setBody: (body: string) => void;
  addHeader: (header: string, value: string) => void;
};

declare namespace BSON {
  const ObjectId: (id?: string) => import("mongodb").BSON.ObjectId;
}

declare namespace Global {
  const response: RealmResponse;
  const context: RealmContext;
}
