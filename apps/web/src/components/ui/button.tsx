import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/*
 * Button variants. The base set follows shadcn defaults; `gradient`, `glow`,
 * and `xl` are house additions:
 *   - gradient: full brand-gradient fill, used for the primary CTAs on
 *     marketing pages and high-importance dashboard buttons. Pair with
 *     `btn-shine` (via className) if you want the hover shimmer.
 *   - glow: same fill as default but with the `.shadow-glow` halo. Use for
 *     CTAs that need extra weight without changing color (e.g. pricing-plan
 *     "Choose" buttons).
 *
 * All variants now lift 1px on hover for tactile feedback — small but
 * adds up across the app.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 hover:-translate-y-px',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/40',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Brand gradient — the new hero/CTA standard.
        gradient:
          'text-white shadow-glow hover:-translate-y-px active:translate-y-0 bg-[linear-gradient(135deg,hsl(var(--grad-from))_0%,hsl(var(--grad-via))_50%,hsl(var(--grad-to))_100%)] bg-[length:200%_200%] hover:bg-[length:180%_180%]',
        glow: 'bg-primary text-primary-foreground shadow-glow hover:bg-primary/90 hover:-translate-y-px',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-12 rounded-lg px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
