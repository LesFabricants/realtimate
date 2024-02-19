type ResponseType<T> = {
  statusCode?: number,
  body: T,
  headers?: Record<string, string>
}
export function httpWrapper<T>(fn: (request: Realm['request'], options?: never) => Promise<ResponseType<T>> | ResponseType<T>){
  return async (request: Realm['request'], response: Realm['response'])=> {
    try {
      const result = await fn(request);
      response.setStatusCode(result.statusCode ?? 200);
      for(const header in result.headers) {
        response.addHeader(header, result.headers[header]);
      }

      switch(typeof result.body){
      case 'string':
        response.setBody(result.body);
        break;
      default:
        response.setBody(JSON.stringify(result.body));
        break;
      }


    } catch(err){
      console.error(err);
      response.setStatusCode(500);
      response.setBody('Something wrong happened');
    }

  };
}