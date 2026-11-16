import { Toaster as Sonner, type ToasterProps } from "sonner";

export const Toaster = (props: ToasterProps) => <Sonner theme="dark" richColors position="top-right" {...props} />;
