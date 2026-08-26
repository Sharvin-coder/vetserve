import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "quiet" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** full-width button, used on mobile forms */
  block?: boolean;
}

const styles: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-ink border border-primary hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40",
  secondary:
    "bg-surface text-primary border border-primary hover:bg-primary-tint disabled:opacity-40 disabled:hover:bg-surface",
  quiet:
    "bg-transparent text-primary border border-transparent hover:bg-primary-tint disabled:opacity-40 disabled:hover:bg-transparent",
  danger:
    "bg-danger text-primary-ink border border-danger hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40",
};

/** 44px minimum hit target; 3px focus ring comes from the global :focus-visible rule. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", block = false, className = "", type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control px-5",
        "text-base font-medium leading-none",
        "disabled:cursor-not-allowed",
        styles[variant],
        block ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    />
  );
});
