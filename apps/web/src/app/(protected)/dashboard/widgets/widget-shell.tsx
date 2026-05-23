'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Shared shell for dashboard widgets. Consistent header, optional href, and
 * uniform spacing. Empty/loading states are owned by the widget itself but
 * generally use the same layout: small label + dim text.
 */
export function WidgetShell({
  title,
  icon: Icon,
  iconColor = 'text-primary',
  href,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const body = (
    <Card className={`h-full shadow-soft hover:shadow-lift transition ${className ?? ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            {title}
          </span>
          {href && (
            <ArrowLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="group block focus:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

export function WidgetEmpty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground py-2">{children}</p>;
}

export function WidgetLoading() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 bg-muted/50 rounded w-1/3" />
      <div className="h-6 bg-muted/40 rounded w-2/3" />
      <div className="h-3 bg-muted/30 rounded w-1/2" />
    </div>
  );
}
