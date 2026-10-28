import { cn } from '@/lib/utils';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'bg-secondary text-secondary-foreground hover:opacity-90',
  outline: 'border border-input bg-transparent hover:bg-muted',
  ghost: 'hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-8 text-base',
};

/** Button styling for elements that must stay links (<a>/<Link>). Wrapping a <button> inside a
 * link is invalid HTML and announces two controls to screen readers, so links use these classes. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonProps['variant']; size?: ButtonProps['size']; className?: string } = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button ref={ref} className={buttonClasses({ variant, size, className })} {...props} />
  )
);
Button.displayName = 'Button';
