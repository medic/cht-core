export interface DesignDoc {
  readonly _id: `_design/${string}`;
  readonly _rev?: string;
  readonly views: {
    [key: string]: {
      map: string;
    };
  };
}

export const packageView = ({ map }: { map: Function }) => ({ map: map.toString() });
