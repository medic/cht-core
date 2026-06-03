declare module 'properties' {
  export function parse(
    input: string | Buffer,
    options?: any,
    callback?: (error: any, obj: any) => void
  ): any;
  export function parseToPromise(
    input: string | Buffer,
    options?: any
  ): Promise<any>;
  export function createStringifier(): any;
  export function stringify(stringifier: any): string;
}
export {};
