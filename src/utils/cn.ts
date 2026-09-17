import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Junta classes condicionais e resolve conflitos do Tailwind (a última vence de verdade).
 * Sem isso, `cn('px-4', props.className)` com `px-6` no className geraria as duas classes e o
 * resultado dependeria da ordem no CSS gerado, não da intenção de quem chamou.
 *
 * `clsx` e `tailwind-merge` já estavam no package.json sem nenhum uso no código.
 */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
