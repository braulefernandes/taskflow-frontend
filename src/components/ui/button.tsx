import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cloneElement, isValidElement } from "react";

type ButtonVariant = "primary" | "secondary";

type NativeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: false;
  children: ReactNode;
  variant?: ButtonVariant;
};

type ButtonAsChildProps = {
  asChild: true;
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
};

const baseClasses =
  "inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-slate-950 text-white hover:bg-slate-800 focus-visible:outline-slate-950",
  secondary:
    "border border-slate-300 bg-white text-slate-950 hover:bg-slate-50 focus-visible:outline-slate-500",
};

function getButtonClasses(variant: ButtonVariant, className?: string) {
  return [baseClasses, variantClasses[variant], className]
    .filter(Boolean)
    .join(" ");
}

export function Button(props: NativeButtonProps | ButtonAsChildProps) {
  const { children, className, variant = "primary" } = props;
  const classes = getButtonClasses(variant, className);

  if (props.asChild) {
    if (!isValidElement<{ className?: string }>(children)) {
      throw new Error("Button asChild expects a single valid React element.");
    }

    return cloneElement(children, {
      className: [classes, children.props.className].filter(Boolean).join(" "),
    });
  }

  const buttonProps = { ...props };
  delete buttonProps.asChild;
  delete buttonProps.variant;
  delete buttonProps.className;

  return (
    <button {...buttonProps} className={classes}>
      {children}
    </button>
  );
}
