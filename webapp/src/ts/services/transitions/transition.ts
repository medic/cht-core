export abstract class Transition {
  abstract name:string;
  abstract init(Object):void;
  abstract filter(Object):boolean;
  abstract run(Object):Promise<any>;

  CLIENT_SIDE_TRANSITIONS = 'client_side_transitions';

  addTransitionLog (doc) {
    doc[this.CLIENT_SIDE_TRANSITIONS] = doc[this.CLIENT_SIDE_TRANSITIONS] || {};
    doc[this.CLIENT_SIDE_TRANSITIONS][this.name] = true;
  }
}
