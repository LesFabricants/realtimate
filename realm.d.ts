/// <reference types="mongodb" />

type Services = {
  // add your other services here
  (name: string): import("mongodb").MongoClient | undefined;
};

declare namespace context {
  const services: {
    get: Services;
  };

  const environment: {
    tag: string;
    values: Record<string, string>;
  };
  const request:
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
