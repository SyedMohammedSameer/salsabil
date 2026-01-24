import React, { forwardRef } from 'react';
import { designSystem } from '../../utils/designSystem';

type InputVariant = 'default' | 'error' | 'success';
type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: InputVariant;
  inputSize?: InputSize;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      variant = 'default',
      inputSize = 'md',
      icon,
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'border-slate-300 dark:border-slate-600 focus:ring-purple-500 focus:border-purple-500',
      error: 'border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500',
      success: 'border-emerald-500 dark:border-emerald-500 focus:ring-emerald-500 focus:border-emerald-500',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-3 text-lg',
    };

    const actualVariant = error ? 'error' : variant;

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            className={`block ${designSystem.typography.labelSmall} text-slate-700 dark:text-slate-300 mb-2`}
            htmlFor={props.id}
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            className={`
              ${sizeStyles[inputSize]}
              ${variantStyles[actualVariant]}
              ${icon ? 'pl-10' : ''}
              ${fullWidth ? 'w-full' : ''}
              rounded-lg border-2 bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100
              placeholder-slate-400 dark:placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-offset-0
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />

          {actualVariant === 'success' && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}

          {actualVariant === 'error' && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {(error || helperText) && (
          <p
            className={`mt-1.5 text-sm ${
              error ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
