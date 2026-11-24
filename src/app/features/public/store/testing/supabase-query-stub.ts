/** Llamada registrada sobre el builder de PostgREST (select, eq, order…). */
export interface QueryCall {
  method: string;
  args: unknown[];
}

export interface QueryStub {
  /** Builder encadenable: cualquier método devuelve el mismo builder; `await` resuelve `result`. */
  builder: object;
  calls: QueryCall[];
}

/** Doble de prueba del query builder de supabase-js (solo para specs). */
export function queryStub(result: unknown): QueryStub {
  const calls: QueryCall[] = [];
  const builder: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) =>
            Promise.resolve(result).then(ok, ko);
        }
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args });
          return builder;
        };
      },
    },
  );
  return { builder, calls };
}

/** Argumentos de cada llamada a `method`, en orden. */
export function callsTo(stub: QueryStub, method: string): unknown[][] {
  return stub.calls.filter((c) => c.method === method).map((c) => c.args);
}
