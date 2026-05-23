// Empty-state component. Used in list views when the user has no data yet.
// Always offers a primary CTA — "no data" without a way forward is dead-end
// UX. If the page genuinely has nothing to suggest (rare), pass `cta={null}`
// and we just render the headline + body.

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CtaProps {
  label: string;
  href?: string;
  onClick?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
  secondaryCta,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  cta?: CtaProps | null;
  secondaryCta?: CtaProps;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-lg border border-dashed bg-muted/20">
      {Icon && (
        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/15 to-fuchsia-500/15 grid place-items-center mb-4">
          <Icon className="h-7 w-7 text-primary" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {body && <p className="text-sm text-muted-foreground max-w-sm mb-5">{body}</p>}
      {cta && (
        <div className="flex flex-wrap gap-2 justify-center">
          {cta.href ? (
            <Button asChild>
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          ) : (
            <Button onClick={cta.onClick}>{cta.label}</Button>
          )}
          {secondaryCta && (
            secondaryCta.href ? (
              <Button variant="outline" asChild>
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={secondaryCta.onClick}>
                {secondaryCta.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
