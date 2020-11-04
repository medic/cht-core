import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileReaderService {
  constructor() {}

  readerThat(readMethod) {
    return (blob) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('loadend', function() {
          resolve(reader.result);
        });
        reader.addEventListener('error', function() {
          reject(reader.error);
        });
        reader.addEventListener('abort', function() {
          reject(new Error('FileReader aborted.'));
        });
        reader[readMethod](blob);
      });
    };
  }

  base64(blob) {
    return this.readerThat('readAsDataURL')(blob);
  }

  utf8(blob) {
    return this.readerThat('readAsText')(blob);
  }

}
