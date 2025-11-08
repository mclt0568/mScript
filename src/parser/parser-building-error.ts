export class ParserBuildingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParserBuildingError';
    Object.setPrototypeOf(this, ParserBuildingError.prototype);
  }
}