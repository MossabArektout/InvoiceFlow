import { type UserPlan } from '@/lib/plans';

export type DbUser = {
  id: string;
  clerk_id: string;
  email: string;
  name: string | null;
  plan: UserPlan;
  credits: number;
  logo_url: string | null;
  exports_this_month: number;
  exports_reset_date: string;
  created_at: string;
};

export type DbClient = {
  id: string;
  clerk_id: string;
  name: string;
  email: string | null;
  address: string | null;
  created_at: string;
};

export type DbInvoice = {
  id: string;
  clerk_id: string;
  invoice_number: string;
  from_name: string | null;
  from_email: string | null;
  from_address: string | null;
  to_name: string | null;
  to_email: string | null;
  to_address: string | null;
  issue_date: string | null;
  due_date: string | null;
  signature_mode: string | null;
  signature_data_url: string | null;
  line_items: unknown[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string | null;
  template: string | null;
  created_at: string;
  updated_at: string;
};
