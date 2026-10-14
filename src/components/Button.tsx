import { forwardRef } from 'react';
import type { Operation } from '../domain/math/types';
import { Icon, type IconName } from './Icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'operation' | 'ghost' | 'danger';
  size?: 'l' | 'm' | 's';
  operation?: Operation;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'l', operation, leadingIcon, trailingIcon, className, children, type = 'button', ...rest },
  ref,
) {
  const cls = ['btn', `btn--${variant}`, `btn--${size}`, operation ? `op-${operation}` : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {leadingIcon && <Icon name={leadingIcon} />}
      <span className="btn__label">{children}</span>
      {trailingIcon && <Icon name={trailingIcon} />}
    </button>
  );
});

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  size?: 'm' | 'l';
  pressed?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, size = 'm', pressed, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`icon-btn icon-btn--${size}${className ? ` ${className}` : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      {...rest}
    >
      <Icon name={icon} size={size === 'l' ? 32 : 24} />
    </button>
  );
});
