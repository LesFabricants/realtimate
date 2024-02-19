type ResponseType<T> = {
  statusCode?: number,
  body: T,
  headers?: Record<string, string>
}

type Options<T> =  {
  authenticate?: string | 
  ((request: Realm['request']) => Promise<T | HttpError> | T | HttpError)
}
export function httpFunction<T, V>(fn: (request: Realm['request'], user?: V | undefined) => Promise<ResponseType<T>> | ResponseType<T>, options?: Options<V>){
  return async (request: Realm['request'], response: Realm['response'])=> {
    try {
      let user: V | undefined = undefined;
      
      if(options?.authenticate) {
        const result =  typeof options.authenticate == 'function' ?  await options.authenticate(request) : await context.functions.execute(options.authenticate, request);
        if(result instanceof HttpError) throw result;
        user = result;
      }

      const result = await fn(request, user);
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
      if(err instanceof HttpError){
        response.setBody(err.message);
        response.setStatusCode(err.statusCode);
      } else {
        response.setStatusCode(500);
        response.setBody('Something wrong happened');
      }
    }

  };
}

export class HttpError extends Error {
  constructor(public statusCode: number, public message: string){
    super(message);
  }
}