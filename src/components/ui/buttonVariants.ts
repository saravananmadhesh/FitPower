import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors duration-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-ink hover:brightness-95 active:brightness-90',
        secondary:
          'bg-card-2 text-text border border-border hover:border-border-strong active:bg-card',
        ghost: 'bg-transparent text-text-muted hover:bg-card-2 hover:text-text',
        // Page-background text: dark on the dark theme's light red, light on the
        // light theme's deep red, so both reach AA (white on #ff5c5c does not).
        danger: 'bg-danger text-bg hover:brightness-95 active:brightness-90',
      },
      size: {
        sm: 'h-8 px-3 text-body-sm gap-1.5',
        md: 'h-10 px-4 text-body gap-2',
      },
      iconOnly: {
        true: 'px-0',
        false: '',
      },
    },
    compoundVariants: [
      { iconOnly: true, size: 'sm', class: 'w-8' },
      { iconOnly: true, size: 'md', class: 'w-10' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      iconOnly: false,
    },
  },
);
