export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'select';
  required: boolean;
  placeholder: string | null;
  options: string[] | null;
}
