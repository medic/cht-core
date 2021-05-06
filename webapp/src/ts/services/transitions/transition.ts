export interface TransitionInterface {
  name:string;
  init(Object):void;
  filter(Object):boolean;
  run(Object):Promise<any>;
}
