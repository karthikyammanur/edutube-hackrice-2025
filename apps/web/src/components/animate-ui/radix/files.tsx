import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type FilesContextValue = {
  open: Set<string>;
  toggle: (value: string) => void;
};

const FilesContext = React.createContext<FilesContextValue | null>(null);

type FilesProps = React.ComponentProps<'div'> & {
  defaultOpen?: string[];
  open?: string[];
  onOpenChange?: (open: string[]) => void;
};

export function Files({
  defaultOpen = [],
  open: controlledOpen,
  onOpenChange,
  className,
  children,
  ...rest
}: FilesProps): JSX.Element {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState<Set<string>>(new Set(defaultOpen));
  const openSet = React.useMemo(
    () => (controlledOpen ? new Set(controlledOpen) : uncontrolledOpen),
    [controlledOpen, uncontrolledOpen],
  );

  const toggle = React.useCallback(
    (value: string) => {
      const next = new Set(openSet);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      if (onOpenChange) onOpenChange(Array.from(next));
      else setUncontrolledOpen(next);
    },
    [openSet, onOpenChange],
  );

  return (
    <FilesContext.Provider value={{ open: openSet, toggle }}>
      <div className={['space-y-1', className ?? ''].join(' ')} {...rest}>
        {children}
      </div>
    </FilesContext.Provider>
  );
}

type FolderItemProps = React.ComponentProps<'div'> & { value: string };

export function FolderItem({ value, className, children, ...rest }: FolderItemProps): JSX.Element {
  return (
    <div data-folder-item={value} className={className} {...rest}>
      {children}
    </div>
  );
}

type FolderTriggerProps = React.ComponentProps<'button'> & {
  value: string;
  gitStatus?: 'untracked' | 'modified' | 'deleted';
};

export function FolderTrigger({ value, className, children, gitStatus, ...rest }: FolderTriggerProps): JSX.Element {
  const ctx = React.useContext(FilesContext);
  if (!ctx) throw new Error('FolderTrigger must be used within <Files>');
  const isOpen = ctx.open.has(value);
  return (
    <button
      type="button"
      onClick={() => ctx.toggle(value)}
      aria-expanded={isOpen}
      className={[
        'w-full rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-surface flex items-center justify-between',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-text',
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-4 w-4 rounded-sm bg-text/80" aria-hidden />
        <span>{children}</span>
      </span>
      <span className="text-subtext text-xs" aria-hidden>
        {isOpen ? '−' : '+'}
      </span>
    </button>
  );
}

type FolderContentProps = { value: string; className?: string; children?: React.ReactNode };

export function FolderContent({ value, className, children }: FolderContentProps): JSX.Element | null {
  const ctx = React.useContext(FilesContext);
  if (!ctx) throw new Error('FolderContent must be used within <Files>');
  const isOpen = ctx.open.has(value);
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={['overflow-hidden', className ?? ''].join(' ')}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SubFiles({ className, children, ...rest }: React.ComponentProps<'div'>): JSX.Element {
  return (
    <div className={['ml-4 pl-2 border-l border-border space-y-1', className ?? ''].join(' ')} {...rest}>
      {children}
    </div>
  );
}

type FileItemProps = React.ComponentProps<'button'> & {
  icon?: React.ElementType;
  gitStatus?: 'untracked' | 'modified' | 'deleted';
};

export function FileItem({ icon: Icon, className, children, ...rest }: FileItemProps): JSX.Element {
  return (
    <button
      type="button"
      className={[
        'w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-text',
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 text-subtext" /> : <span className="h-1.5 w-1.5 rounded-full bg-subtext inline-block" aria-hidden />}
      <span className="text-subtext">{children}</span>
    </button>
  );
}

export type { FilesProps, FolderItemProps, FolderTriggerProps, FolderContentProps, FileItemProps };


