export abstract class Transition {
  abstract name:string;
  public readonly isEnabled: boolean;
  abstract init(Object):void;
  abstract filter(docs: Doc[]):boolean;
  abstract run(docs: Doc[]):Promise<any>;

  CLIENT_SIDE_TRANSITIONS = 'client_side_transitions';

  addTransitionLog (doc) {
    doc[this.CLIENT_SIDE_TRANSITIONS] = doc[this.CLIENT_SIDE_TRANSITIONS] || {};
    doc[this.CLIENT_SIDE_TRANSITIONS][this.name] = true;
  }
}

export interface Doc {
  _id:string;
  type:string;
  [other:string]:unknown;
}
