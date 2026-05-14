'use client';

import { useQuery } from '@tanstack/react-query';
import { Mail, Calendar, Link2, Unlink, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as api from '@/lib/api';
import type { OAuthStatus } from '@/types';

export default function IntegrationsPanel() {
  const { data: oauthStatus, isLoading } = useQuery<OAuthStatus>({
    queryKey: ['oauth-status'],
    queryFn: api.getOAuthStatus,
    refetchInterval: 30000,
  });

  const isConnected = oauthStatus?.connected ?? false;

  return (
    <div className="rounded-[10px] bg-surface border border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
        <Link2 className="size-4 text-koala-teal scale-x-[-1]" />
        <span className="text-[13px] text-koala-bright font-medium">
          التكاملات
        </span>
      </div>

      {/* Google Account */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'size-8 rounded-lg flex items-center justify-center',
              isConnected
                ? 'bg-koala-green/15 text-koala-green'
                : 'bg-hover text-koala-secondary'
            )}>
              {isConnected ? (
                <Mail className="size-4" />
              ) : (
                <Unlink className="size-4" />
              )}
            </div>
            <div>
              <span className="text-[13px] text-koala-bright font-medium block">
                Google
              </span>
              <span className={cn(
                'text-[11px]',
                isConnected ? 'text-koala-green' : 'text-koala-muted'
              )}>
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" /> جاري التحميل...
                  </span>
                ) : isConnected ? (
                  'متصل'
                ) : (
                  'غير متصل'
                )}
              </span>
            </div>
          </div>

          {isConnected ? (
            <a
              href="/api/auth/google/disconnect"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5',
                'rounded-md text-[11px] font-medium',
                'border border-coral/25 text-coral',
                'transition-colors duration-150',
                'hover:bg-coral/10 hover:border-coral/40'
              )}
            >
              <Unlink className="size-3" />
              فصل
            </a>
          ) : (
            <a
              href="/api/auth/google/login"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5',
                'rounded-md text-[11px] font-medium',
                'bg-accent-blue/10 text-accent-blue border border-accent-blue/25',
                'transition-colors duration-150',
                'hover:bg-accent-blue/20 hover:border-accent-blue/40'
              )}
            >
              <ExternalLink className="size-3" />
              ربط
            </a>
          )}
        </div>

        {/* Connected services */}
        {isConnected && oauthStatus?.scopes && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
            <div className={cn(
              'inline-flex items-center gap-1 px-2 py-1',
              'rounded-[4px] text-[10px]',
              oauthStatus.scopes.some(s => s.includes('gmail'))
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'bg-hover text-koala-muted'
            )}>
              <Mail className="size-3" />
              Gmail
            </div>
            <div className={cn(
              'inline-flex items-center gap-1 px-2 py-1',
              'rounded-[4px] text-[10px]',
              oauthStatus.scopes.some(s => s.includes('calendar'))
                ? 'bg-koala-purple/10 text-koala-purple'
                : 'bg-hover text-koala-muted'
            )}>
              <Calendar className="size-3" />
              Calendar
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
