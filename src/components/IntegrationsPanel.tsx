'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Calendar, Link2, Unlink, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';

interface OAuthStatus {
  connected: boolean;
  provider: string;
  scopes: string[];
  expiryDate: string | null;
  lastUpdated: string | null;
}

export default function IntegrationsPanel() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  // ─── Fetch OAuth status ────────────────────────────────────────────────────
  const { data: status, isLoading } = useQuery<OAuthStatus>({
    queryKey: ['oauth-status'],
    queryFn: async () => {
      const res = await fetch('/api/integrations/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  // ─── Disconnect mutation ───────────────────────────────────────────────────
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/google/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to disconnect');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-status'] });
    },
  });

  // ─── Test Gmail ────────────────────────────────────────────────────────────
  const gmailTestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/integrations/test/gmail');
      return res.json();
    },
  });

  // ─── Test Calendar ─────────────────────────────────────────────────────────
  const calendarTestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/integrations/test/calendar');
      return res.json();
    },
  });

  const isConnected = status?.connected ?? false;

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardContent className="p-3">
        {/* Header row — always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between gap-2 text-right"
        >
          <div className="flex items-center gap-2">
            <div className={`size-7 rounded-md flex items-center justify-center border ${
              isConnected
                ? 'bg-accent-brand/10 border-accent-brand/20'
                : 'bg-muted border-border'
            }`}>
              <Link2 className={`size-3.5 ${isConnected ? 'text-accent-brand' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs font-semibold text-foreground">Google Integration</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {isLoading ? 'جاري التحميل...' : isConnected ? 'متصل ✓' : 'غير متصل'}
              </span>
            </div>
            {isConnected && (
              <Badge className="bg-accent-brand/15 text-accent-brand text-[9px] px-1.5 py-0 h-4 border-0 font-mono">
                ACTIVE
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {expanded ? (
              <ChevronUp className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Expandable content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-border flex flex-col gap-3">
                {!isConnected ? (
                  /* ─── Not connected state ─────────────────────────── */
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">
                      اربط حساب Google علشان تقدر تستخدم Gmail و Calendar مع زكي
                    </p>
                    <Button
                      size="sm"
                      className="bg-accent-brand hover:bg-accent-brand-dim text-white text-xs h-8 w-full"
                      onClick={() => {
                        window.location.href = '/api/auth/google/login';
                      }}
                    >
                      <Link2 className="size-3.5 ml-1.5" />
                      ربط حساب Google
                    </Button>
                  </div>
                ) : (
                  /* ─── Connected state ──────────────────────────────── */
                  <div className="flex flex-col gap-2">
                    {/* Scopes info */}
                    <div className="flex flex-wrap gap-1">
                      {status.scopes.includes('gmail.readonly') && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-accent-brand/30 text-accent-brand">
                          <Mail className="size-2.5 ml-0.5" />
                          Gmail
                        </Badge>
                      )}
                      {status.scopes.includes('calendar.events.readonly') && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-accent-brand/30 text-accent-brand">
                          <Calendar className="size-2.5 ml-0.5" />
                          Calendar
                        </Badge>
                      )}
                    </div>

                    {/* Test buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-[10px] h-7 border-border"
                        onClick={() => gmailTestMutation.mutate()}
                        disabled={gmailTestMutation.isPending}
                      >
                        {gmailTestMutation.isPending ? (
                          <RefreshCw className="size-3 ml-1 animate-spin" />
                        ) : (
                          <Mail className="size-3 ml-1" />
                        )}
                        Gmail Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-[10px] h-7 border-border"
                        onClick={() => calendarTestMutation.mutate()}
                        disabled={calendarTestMutation.isPending}
                      >
                        {calendarTestMutation.isPending ? (
                          <RefreshCw className="size-3 ml-1 animate-spin" />
                        ) : (
                          <Calendar className="size-3 ml-1" />
                        )}
                        Calendar Test
                      </Button>
                    </div>

                    {/* Test results */}
                    {gmailTestMutation.data && (
                      <div
                        className={
                          gmailTestMutation.data.success
                            ? 'text-[10px] font-mono px-2 py-1.5 rounded-md border bg-accent-brand/8 border-accent-brand/30 text-accent-brand'
                            : 'text-[10px] font-mono px-2 py-1.5 rounded-md border bg-destructive/8 border-destructive/30 text-destructive'
                        }
                      >
                        {gmailTestMutation.data.success ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="size-3" />
                            Gmail: {gmailTestMutation.data.count} رسائل غير مقروءة
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="size-3" />
                            Gmail: {gmailTestMutation.data.error}
                          </span>
                        )}
                      </div>
                    )}
                    {calendarTestMutation.data && (
                      <div
                        className={
                          calendarTestMutation.data.success
                            ? 'text-[10px] font-mono px-2 py-1.5 rounded-md border bg-accent-brand/8 border-accent-brand/30 text-accent-brand'
                            : 'text-[10px] font-mono px-2 py-1.5 rounded-md border bg-destructive/8 border-destructive/30 text-destructive'
                        }
                      >
                        {calendarTestMutation.data.success ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="size-3" />
                            Calendar: {calendarTestMutation.data.count} أحداث اليوم
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="size-3" />
                            Calendar: {calendarTestMutation.data.error}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Disconnect */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-7 text-destructive hover:bg-destructive/5 hover:text-destructive w-full"
                      onClick={() => disconnectMutation.mutate()}
                      disabled={disconnectMutation.isPending}
                    >
                      {disconnectMutation.isPending ? (
                        <RefreshCw className="size-3 ml-1 animate-spin" />
                      ) : (
                        <Unlink className="size-3 ml-1" />
                      )}
                      فصل Google
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
