/// <reference types="mongodb" />

type Services = {
  (name: "mongodb-atlas"): import("mongodb").MongoClient;
  // add your other services here
  (name: string): any;
};

declare namespace context {
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
}

declare namespace response {
  const setStatusCode: void;
  const setBody: void;
}
