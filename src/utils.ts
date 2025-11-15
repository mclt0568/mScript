export const cons = <T>(x: T, xs: T[]) => [x].concat(xs);

type Curried<F> = F extends (...args: infer Args) => infer R
  ? Args extends [infer A, ...infer Rest]
    ? (arg: A) => Curried<(...args: Rest) => R>
    : R
  : never;

export const curried = <F extends (...args: any[]) => any>(f: F): Curried<F> => {
  if (f.length === 0) return f as any;

  const args: any[] = [];
  const applyArg = (v: any): any => {
    args.push(v);
    return args.length === f.length ? f(...args) : applyArg;
  };

  return applyArg as Curried<F>;
};

type Constructor<T, Args extends any[]> = new (...args: Args) => T;

type CurriedConstructor<C extends Constructor<any, any>> =
  C extends Constructor<infer T, [infer A, ...infer Rest]>
    ? (arg: A) => CurriedConstructor<Constructor<T, Rest>>
    : InstanceType<C>;

export const curriedConstructor = <C extends Constructor<any, any>>(CClass: C): CurriedConstructor<C> => {
  const args: any[] = [];

  const applyArg = (v: any): any => {
    args.push(v);
    if (args.length === CClass.length) {
      return new CClass(...args);
    }
    return applyArg;
  };

  return applyArg as CurriedConstructor<C>;
};