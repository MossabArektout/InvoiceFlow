import { type ReactNode } from 'react';

type FieldProps = {
  label: string;
  required?: boolean;
  children: ReactNode;
};

export const Field = ({ label, required = false, children }: FieldProps) => (
  <div className="space-y-1.5">
    <label className="block text-[12px] font-medium tracking-normal text-slate-500">
      {label}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </label>
    {children}
  </div>
);

type FormBlockProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

const FORM_BLOCK_ICON: Record<string, string> = {
  'Bill From': 'BF',
  'Bill To': 'BT',
  'Payment Terms': 'PT',
  'Invoice Details': 'ID',
  'Line Items': 'LI',
  'Additional Details': 'AD'
};

export const FormBlock = ({ title, action, children }: FormBlockProps) => (
  <div className="space-y-4 border-b border-slate-300 px-5 py-5 md:px-6 md:py-6">
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-800">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-[10px] font-bold text-indigo-700">
          {FORM_BLOCK_ICON[title] ?? '•'}
        </span>
        <span>{title}</span>
      </h2>
      {action ?? null}
    </div>
    {children}
  </div>
);

