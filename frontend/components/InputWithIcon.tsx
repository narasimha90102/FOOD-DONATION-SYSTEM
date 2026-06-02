import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

export interface InputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon | React.ComponentType<any>;
  label?: string;
  error?: string;
  success?: string | boolean;
}

export const InputWithIcon = forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ icon: Icon, label, error, success, className = '', style, id, ...props }, ref) => {
    const hasIcon = !!Icon;

    return (
      <div className="flex flex-col w-full text-left">
        {label && (
          <label htmlFor={id} className="text-xs font-bold text-slate-400 block mb-1">
            {label}
          </label>
        )}
        <div className="relative w-full flex items-center">
          {Icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 text-slate-500">
              <Icon className="h-4.5 w-4.5" />
            </div>
          )}
          <input
            id={id}
            ref={ref}
            style={{
              ...style,
              paddingLeft: hasIcon ? '44px' : '14px',
            }}
            className={`w-full glass-input placeholder-slate-500 text-slate-100 text-sm ${
              error
                ? 'border-red-500/40 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : success
                ? 'border-emerald-500/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                : 'border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
            } ${
              props.disabled ? 'opacity-50 cursor-not-allowed bg-black/20' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && (
          <span className="text-[11px] font-semibold text-red-400 mt-1 block">
            {error}
          </span>
        )}
        {success && typeof success === 'string' && (
          <span className="text-[11px] font-semibold text-emerald-400 mt-1 block">
            {success}
          </span>
        )}
      </div>
    );
  }
);

InputWithIcon.displayName = 'InputWithIcon';
