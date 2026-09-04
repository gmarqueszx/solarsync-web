import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  headerBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  headerBorder = true,
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] transition-all ${className}`}
    >
      {(title || subtitle || action) && (
        <div
          className={`flex items-center justify-between px-6 py-4 ${
            headerBorder ? 'border-b border-slate-100' : ''
          }`}
        >
          <div>
            {title && (
              <h3 className="text-base font-medium text-slate-800 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-[#424342] mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};
