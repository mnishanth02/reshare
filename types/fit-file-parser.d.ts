declare module "fit-file-parser" {
  import { EventEmitter } from "node:events";
  interface FitParserOptions {
    force?: boolean;
    speedUnit?: string;
    lengthUnit?: string;
    mode?: string;
  }
  type FitParseCallback = (error: Error | null, data: unknown) => void;
  export default class FitParser extends EventEmitter {
    constructor(options?: FitParserOptions);
    parse(buffer: ArrayBuffer, callback: FitParseCallback): void;
  }
}
