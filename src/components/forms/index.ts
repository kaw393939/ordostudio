// Sprint 46 — Form system barrel export
export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
} from "@/components/ui/form";
export { Input } from "@/components/ui/input";
export { Label } from "@/components/ui/label";
export { Textarea } from "@/components/ui/textarea";
export { Checkbox } from "@/components/ui/checkbox";
export { Switch } from "@/components/ui/switch";
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
export {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

// Custom form components
export { SearchSelect, type SearchSelectOption } from "./search-select";
export { FormWizard, type WizardStep } from "./form-wizard";
export { SubmitButton } from "./submit-button";
export { PasswordInput } from "./password-input";
export { CharacterCount } from "./character-count";
export { UnsavedChangesDialog } from "./unsaved-changes-dialog";

// Date/time components (Sprint 47)
export { DatePicker } from "./date-picker";
export { TimePicker } from "./time-picker";
export { DateRangePicker, type DateRangeValue } from "./date-range-picker";
export { DateTimePicker } from "./date-time-picker";
export { RelativeTime } from "./relative-time";

// Custom form hooks
export { useSubmitState, type SubmitState } from "./use-submit-state";
export { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";
export { useAutoSave, type StorageAdapter } from "./use-auto-save";
