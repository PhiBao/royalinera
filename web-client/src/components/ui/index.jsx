import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';

// ============================================
// LAYOUT COMPONENTS
// ============================================

/**
 * Page Container - wraps page content with consistent max-width and padding
 */
export const PageContainer = ({ children, className = '' }) => (
  <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
    {children}
  </div>
);

/**
 * Page Header - consistent header styling for all pages
 */
export const PageHeader = ({ 
  title, 
  subtitle, 
  actions,
  className = '' 
}) => (
  <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 ${className}`}>
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gradient mb-2">{title}</h1>
      {subtitle && <p className="text-text-secondary text-lg">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
  </div>
);

/**
 * Section - groups related content with consistent spacing
 */
export const Section = ({ children, className = '' }) => (
  <section className={`mb-8 ${className}`}>
    {children}
  </section>
);

// ============================================
// CARD COMPONENTS
// ============================================

/**
 * Card - base card component with consistent styling
 */
export const Card = ({ 
  children, 
  className = '', 
  hover = true,
  padding = 'normal',
  ...props 
}) => {
  const paddingClasses = {
    none: '',
    small: 'p-4',
    normal: 'p-6',
    large: 'p-8',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`
        bg-bg-card rounded-xl border border-white/5
        ${hover ? 'hover:border-accent-primary/50 hover:shadow-lg hover:shadow-accent-primary/5 transition-all duration-300' : ''}
        ${paddingClasses[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * CardHeader - card header with title, optional icon and actions
 */
export const CardHeader = ({ icon: Icon, title, subtitle, actions, className = '' }) => (
  <div className={`flex items-start justify-between gap-4 mb-6 ${className}`}>
    <div className="flex items-start gap-4">
      {Icon && (
        <div className="w-12 h-12 bg-gradient-to-br from-accent-primary to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon size={24} className="text-white" />
        </div>
      )}
      <div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

/**
 * CardContent - card body content
 */
export const CardContent = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

/**
 * CardFooter - card footer with actions
 */
export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-6 pt-4 border-t border-white/5 ${className}`}>
    {children}
  </div>
);

// ============================================
// BUTTON COMPONENTS
// ============================================

/**
 * Button - primary button component
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/25 hover:shadow-xl hover:shadow-accent-primary/30 hover:-translate-y-0.5',
    secondary: 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20',
    ghost: 'text-text-secondary hover:text-white hover:bg-white/5',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
    success: 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20',
  };

  const sizes = {
    small: 'px-3 py-1.5 text-sm gap-1.5',
    medium: 'px-4 py-2.5 text-sm gap-2',
    large: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-200 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
};

/**
 * IconButton - circular icon button
 */
export const IconButton = ({
  icon: Icon,
  variant = 'ghost',
  size = 'medium',
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20',
    secondary: 'bg-white/5 text-white hover:bg-white/10',
    ghost: 'text-text-secondary hover:text-white hover:bg-white/5',
    danger: 'text-red-400 hover:bg-red-500/10',
  };

  const sizes = {
    small: 'w-8 h-8',
    medium: 'w-10 h-10',
    large: 'w-12 h-12',
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-lg
        transition-all duration-200
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};

// ============================================
// INPUT COMPONENTS
// ============================================

/**
 * Input - text input component
 */
export const Input = ({
  label,
  error,
  hint,
  icon: Icon,
  className = '',
  ...props
}) => (
  <div className={`space-y-1.5 ${className}`}>
    {label && (
      <label className="block text-sm font-medium text-text-secondary">
        {label}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
      )}
      <input
        className={`
          w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg
          text-white placeholder-text-secondary/50
          focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/50
          transition-all duration-200
          ${Icon ? 'pl-10' : ''}
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''}
        `}
        {...props}
      />
    </div>
    {hint && !error && <p className="text-xs text-text-secondary">{hint}</p>}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

/**
 * TextArea - textarea component
 */
export const TextArea = ({
  label,
  error,
  hint,
  className = '',
  rows = 3,
  ...props
}) => (
  <div className={`space-y-1.5 ${className}`}>
    {label && (
      <label className="block text-sm font-medium text-text-secondary">
        {label}
      </label>
    )}
    <textarea
      rows={rows}
      className={`
        w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg
        text-white placeholder-text-secondary/50 resize-none
        focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/50
        transition-all duration-200
        ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''}
      `}
      {...props}
    />
    {hint && !error && <p className="text-xs text-text-secondary">{hint}</p>}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

/**
 * Select - select dropdown component
 */
export const Select = ({
  label,
  options,
  error,
  className = '',
  ...props
}) => (
  <div className={`space-y-1.5 ${className}`}>
    {label && (
      <label className="block text-sm font-medium text-text-secondary">
        {label}
      </label>
    )}
    <select
      className={`
        w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg
        text-white appearance-none cursor-pointer
        focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/50
        transition-all duration-200
        ${error ? 'border-red-500' : ''}
      `}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: 'right 0.75rem center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '1.25rem 1.25rem',
      }}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// ============================================
// MODAL COMPONENTS
// ============================================

/**
 * Modal - overlay modal component
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'medium',
  showClose = true,
}) => {
  if (!isOpen) return null;

  const sizes = {
    small: 'max-w-sm',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    xlarge: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`
            relative w-full ${sizes[size]}
            bg-bg-card border border-white/10 rounded-2xl shadow-2xl
            overflow-hidden
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-white/5">
            <div>
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              {subtitle && (
                <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
              )}
            </div>
            {showClose && (
              <IconButton
                icon={X}
                variant="ghost"
                size="small"
                onClick={onClose}
                className="-mr-2 -mt-2"
              />
            )}
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/**
 * ModalFooter - modal footer with actions
 */
export const ModalFooter = ({ children, className = '' }) => (
  <div className={`flex items-center justify-end gap-3 pt-6 mt-6 border-t border-white/5 ${className}`}>
    {children}
  </div>
);

// ============================================
// FEEDBACK COMPONENTS
// ============================================

/**
 * EmptyState - empty state placeholder
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {Icon && (
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-text-secondary" />
      </div>
    )}
    <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
    {description && (
      <p className="text-text-secondary max-w-sm mb-6">{description}</p>
    )}
    {action}
  </div>
);

/**
 * LoadingState - loading spinner with optional text
 */
export const LoadingState = ({ text = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <Loader2 className="w-8 h-8 animate-spin text-accent-primary mb-4" />
    <p className="text-text-secondary">{text}</p>
  </div>
);

/**
 * Badge - small badge for status or labels
 */
export const Badge = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variants = {
    default: 'bg-white/10 text-white',
    primary: 'bg-accent-primary/20 text-accent-primary',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    danger: 'bg-red-500/20 text-red-400',
  };

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

/**
 * Divider - horizontal divider with optional text
 */
export const Divider = ({ text, className = '' }) => (
  <div className={`flex items-center gap-4 ${className}`}>
    <div className="flex-1 h-px bg-white/10" />
    {text && <span className="text-sm text-text-secondary">{text}</span>}
    <div className="flex-1 h-px bg-white/10" />
  </div>
);

// ============================================
// GRID COMPONENTS
// ============================================

/**
 * Grid - responsive grid layout
 */
export const Grid = ({
  children,
  cols = { sm: 1, md: 2, lg: 3 },
  gap = 6,
  className = '',
}) => {
  const gapClass = `gap-${gap}`;
  
  return (
    <div
      className={`
        grid grid-cols-1
        ${cols.sm ? `sm:grid-cols-${cols.sm}` : ''}
        ${cols.md ? `md:grid-cols-${cols.md}` : ''}
        ${cols.lg ? `lg:grid-cols-${cols.lg}` : ''}
        ${cols.xl ? `xl:grid-cols-${cols.xl}` : ''}
        ${gapClass}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default {
  PageContainer,
  PageHeader,
  Section,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Button,
  IconButton,
  Input,
  TextArea,
  Select,
  Modal,
  ModalFooter,
  EmptyState,
  LoadingState,
  Badge,
  Divider,
  Grid,
};
