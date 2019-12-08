import * as path from 'path';
import * as fs from 'fs';
import {  DataProvider, EntityDataProvider,Entity, JsonStorageDataProvider, JsonStorage, ActualInMemoryDataProvider  } from '@remult/core';





export class JsonFileDataProvider implements DataProvider {
  constructor(private folderPath: string) {

  }
  public getEntityDataProvider(entity:Entity<any>): EntityDataProvider {
    return new JsonStorageDataProvider(new FileJsonStorage(path.join(this.folderPath, entity.__getName()) + '.json',entity));
  }
}

class FileJsonStorage implements JsonStorage {
  constructor(private filePath: string,private  entity:Entity<any>) {

  }
  doWork<T>(what: (dp: EntityDataProvider, save: () => void) => T): T {
    let data = JSON.parse(fs.readFileSync(this.filePath).toString());
    let dp = new ActualInMemoryDataProvider(this.entity,data);
    return what(dp, () => fs.writeFileSync(this.filePath, JSON.stringify(data, undefined, 2)));
  }
}