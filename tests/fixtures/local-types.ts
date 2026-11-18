// Test fixture: a project module that re-exports Sitecore field types (still Sitecore fields) and
// declares a type of its own that merely shares a Sitecore name once imported under an alias.
export type { Field, TextField } from "@sitecore-jss/sitecore-jss-nextjs";

export interface FormField<T> {
  value: T;
  touched: boolean;
}
