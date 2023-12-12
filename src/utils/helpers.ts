

const timer: Map<string, NodeJS.Timeout> = new Map();
const debounceFile = (
  file: string,
  func: (file: string) => void,
  timeout = 50
) => {
  clearTimeout(timer.get(file));
  timer.set(
    file,
    setTimeout(() => {
      func.apply(null, [file]);
    }, timeout)
  );
};

const seriesOrParallel = async <T>(array: T[], callback: (element: T) => Promise<unknown>, inSeries: boolean) => {
  if(inSeries){
    for(const element of array){
      await callback(element);
    }
  } else {
    await Promise.all(array.map(element => callback(element)));
  }
};

export {
  debounceFile,
  seriesOrParallel
};
