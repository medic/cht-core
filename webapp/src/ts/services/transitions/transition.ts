export abstract class Transition {
  abstract name:string;
  abstract init(Object):void;
  abstract filter(Object):boolean;
  abstract run(Object):Promise<any>;

  CLIENT_TRANSITIONS = 'client_transitions';

  addTransitionLog (doc) {
    doc[this.CLIENT_TRANSITIONS] = doc[this.CLIENT_TRANSITIONS] || {};
    doc[this.CLIENT_TRANSITIONS][this.name] = true;
  }
}
