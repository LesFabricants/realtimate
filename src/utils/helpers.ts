import { copyFileSync } from 'fs';
import { basename, resolve } from 'path';


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

class Backup {
  private bakMap: Record<string, string> = {};

  constructor(private backupDir: string){}

  backup(file: string){
    const fileName = basename(file);


    copyFileSync(file, resolve(this.backupDir, fileName));
    this.bakMap[file] = this.backupDir;
  }

  restore(){
    for(const key in this.bakMap){
      const fileName = basename(key);
      copyFileSync(resolve(this.backupDir, fileName), key);
      delete this.bakMap[key];
    }
  }
}

export {
  Backup,
  debounceFile,
  seriesOrParallel
};

