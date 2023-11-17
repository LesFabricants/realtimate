/// <reference types="mongodb" />

type Services = {
  (name: "mongodb-atlas"): import("mongodb").MongoClient;
  (name: "Db"): import("mongodb").Db;
  (name: "WithId"): import("mongodb").WithId<import("mongodb").Document>;
  // add your other services here
  (name: string): any;
};

declare namespace context {
  const http: {
    get: (options: { url: string; headers?: any }) => Promise<any>;
    post: (options: { url: string; body: any }) => Promise<any>;
  };

  const services: {
    get: Services;
  };

  const environment: {
    tag: string;
    values: Record<string, string>;
  };
  const request: {
    rawQueryString: String;
  };
  const functions: {
    execute: (name: string, ...args: any[]) => any;
  };
  const user: {
    id: string;
    type: "normal" | "server" | "system";
    data: object;
    custom_data: object;
    identities: any[];
  };

  const values: {
    get: (name: string) => string;
  };
}

declare namespace response {
  const setStatusCode: void;
  const setBody: void;
}

declare namespace BSON {
  const ObjectId: (id?: string) => import("mongodb").BSON.ObjectId;
}
