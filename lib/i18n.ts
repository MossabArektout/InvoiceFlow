import en from '@/en.json';

type Dictionary = Record<string, string>;
type TemplateVars = Record<string, string | number>;

const dict = en as Dictionary;

export const t = (key: string, vars?: TemplateVars) => {
  let value = dict[key] ?? key;

  if (!vars) return value;

  for (const [name, raw] of Object.entries(vars)) {
    value = value.replaceAll(`{${name}}`, String(raw));
  }

  return value;
};

