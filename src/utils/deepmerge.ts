export function jsonClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export default function deepmerge<T>(
  target: T,
  source: Partial<T>,
  options: { clone?: boolean } = {}
): T {
  const { clone = true } = options;
  const output = clone ? jsonClone(target) : target;

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          (output as any)[key] = deepmerge((target as any)[key], source[key], options);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
