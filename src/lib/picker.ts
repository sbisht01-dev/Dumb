let handler: ((ids: string[]) => void) | null = null;

export const setPickHandler = (fn: (ids: string[]) => void) => {
  handler = fn;
};

export const resolvePick = (ids: string[]) => {
  handler?.(ids);
  handler = null;
};
