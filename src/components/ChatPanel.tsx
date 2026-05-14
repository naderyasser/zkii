'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Terminal, Wrench, Database, Mail, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ToolCallResult {
  tool: string;
  status: 'success' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCallResult[];
  isProcessing?: boolean;
}

const suggestions = [
  'اعملي ملخص لليوم 🌅',
  'إيه الإيميلات الجديدة النهارده؟',
  'عندي مواعيد إيه النهارده؟',
  'نظّم مهامي حسب الأولوية',
];

const msgVariants = {
  initial: { opacity: 0, y: 6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

export default function ChatPanel() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [agentPhase, setAgentPhase] = useState<'idle' | 'thinking' | 'executing' | 'responding'>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (msgs: Message[]) => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: msgs
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onMutate: () => {
      setAgentPhase('thinking');
    },
    onSuccess: (data) => {
      const hasToolCalls = data.toolCalls && data.toolCalls.length > 0;

      // If tools were executed, show the processing phase briefly
      if (hasToolCalls) {
        setAgentPhase('executing');

        // Show a brief "updating database" indicator, then switch to responding
        const processingMessage: Message = {
          role: 'system',
          content: 'زكي بيحدّث قاعدة البيانات...',
          isProcessing: true,
          toolCalls: data.toolCalls,
        };

        // Add processing indicator first
        setMessages((prev) => [...prev, processingMessage]);

        // After a brief moment, replace with the actual response
        setTimeout(() => {
          setMessages((prev) => {
            // Remove the processing message
            const filtered = prev.filter((m) => !m.isProcessing);
            // Add the final assistant message
            const assistantMessage: Message = {
              role: 'assistant',
              content: data.reply || 'تم التنفيذ.',
              toolCalls: data.toolCalls,
            };
            return [...filtered, assistantMessage];
          });
          setAgentPhase('responding');

          // Strict cache invalidation after tool execution
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['heatmap'] });
          queryClient.invalidateQueries({ queryKey: ['weekly-score'] });
          queryClient.invalidateQueries({ queryKey: ['oauth-status'] });

          // Also refetch immediately for instant UI sync
          queryClient.refetchQueries({ queryKey: ['tasks'] });

          setTimeout(() => setAgentPhase('idle'), 800);
        }, 600);
      } else {
        // No tool calls — just show the response
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.reply || 'مفيش رد متاح دلوقتي.',
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setAgentPhase('responding');
        setTimeout(() => setAgentPhase('idle'), 500);
      }
    },
    onError: () => {
      const errorMessage: Message = {
        role: 'assistant',
        content: '⚠ ERR: فشل الاتصال — حاول تاني',
      };
      setMessages((prev) => [...prev, errorMessage]);
      setAgentPhase('idle');
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, agentPhase]);

  function handleSend() {
    if (!input.trim() || chatMutation.isPending) return;
    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages];
    setMessages([...newMessages, userMessage]);
    setInput('');
    chatMutation.mutate(newMessages);
  }

  function handleSuggestion(text: string) {
    if (chatMutation.isPending) return;
    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages];
    setMessages([...newMessages, userMessage]);
    chatMutation.mutate(newMessages);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Card className="border-0 rounded-none bg-transparent flex flex-col h-full shadow-none">
      <CardHeader className="pb-2 shrink-0 border-b border-border">
        <CardTitle className="text-sm font-bold text-accent-brand dark:neon-glow-subtle flex items-center gap-2">
          <Terminal className="size-3.5" />
          زكي
          <span className="text-[9px] font-mono text-muted-foreground font-normal ml-2">v3.0 // Agent+Google</span>
          {agentPhase !== 'idle' && (
            <Badge
              variant="outline"
              className={`text-[8px] px-1.5 py-0 h-4 ml-1 font-mono ${
                agentPhase === 'thinking'
                  ? 'border-accent-brand/30 text-accent-brand'
                  : agentPhase === 'executing'
                    ? 'border-cyber-yellow/30 text-cyber-yellow'
                    : 'border-accent-brand/30 text-accent-brand'
              }`}
            >
              {agentPhase === 'thinking'
                ? 'THINKING'
                : agentPhase === 'executing'
                  ? 'EXECUTING'
                  : 'RESPONDING'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 p-3 pt-3 overflow-hidden">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="flex flex-col gap-3 pb-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="size-12 rounded-lg bg-accent-brand/10 border border-accent-brand/20 flex items-center justify-center dark:neon-border-glow">
                  <Bot className="size-6 text-accent-brand" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-accent-brand">
                    أهلاً! أنا زكي ⚡
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {'>'} Agent ذكي + Gmail + Calendar — أشوف مهامك، إيميلاتك، ومواعيدك
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  {suggestions.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="text-xs border-accent-brand/20 text-accent-brand/80 hover:bg-accent-brand/5 hover:text-accent-brand justify-start h-8"
                      onClick={() => handleSuggestion(s)}
                      disabled={chatMutation.isPending}
                    >
                      {'> '} {s}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    variants={msgVariants}
                    initial="initial"
                    animate="animate"
                    className={`flex gap-2 ${
                      msg.role === 'user'
                        ? 'justify-end'
                        : msg.role === 'system'
                          ? 'justify-center'
                          : 'justify-start'
                    }`}
                  >
                    {/* System messages (processing indicators) */}
                    {msg.role === 'system' && msg.isProcessing && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyber-yellow/5 border border-cyber-yellow/20 text-[11px] font-mono">
                        <Database className="size-3 text-cyber-yellow animate-pulse" />
                        <span className="text-cyber-yellow">{msg.content}</span>
                        <Loader2 className="size-3 text-cyber-yellow animate-spin" />
                      </div>
                    )}

                    {/* Assistant messages */}
                    {msg.role === 'assistant' && (
                      <>
                        <div className="size-6 rounded bg-accent-brand/10 border border-accent-brand/20 flex items-center justify-center shrink-0 mt-1">
                          <Bot className="size-3.5 text-accent-brand" />
                        </div>
                        <div className="max-w-[85%] flex flex-col gap-1.5">
                          <div className="rounded-xl px-3 py-2 text-sm leading-relaxed bg-accent-brand/5 text-foreground border border-accent-brand/15">
                            <span className="font-mono whitespace-pre-wrap">{msg.content}</span>
                          </div>
                          {/* Tool call indicators */}
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <div className="flex flex-col gap-1">
                              {msg.toolCalls.map((tc, tcIdx) => (
                                <div
                                  key={tcIdx}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono border ${
                                    tc.status === 'success'
                                      ? 'bg-accent-brand/5 border-accent-brand/20 text-accent-brand'
                                      : 'bg-destructive/5 border-destructive/20 text-destructive'
                                  }`}
                                >
                                  {tc.tool === 'scan_gmail_inbox' ? (
                                    <Mail className="size-3" />
                                  ) : tc.tool === 'get_calendar_events' ? (
                                    <Calendar className="size-3" />
                                  ) : (
                                    <Wrench className="size-3" />
                                  )}
                                  <span className="font-semibold">{tc.tool === 'scan_gmail_inbox' ? 'Gmail' : tc.tool === 'get_calendar_events' ? 'Calendar' : tc.tool}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="truncate">{tc.message}</span>
                                  {tc.status === 'success' ? (
                                    <Badge className="bg-accent-brand/10 text-accent-brand text-[8px] px-1 py-0 h-3.5 border-0 shrink-0">OK</Badge>
                                  ) : (
                                    <Badge className="bg-destructive/10 text-destructive text-[8px] px-1 py-0 h-3.5 border-0 shrink-0">ERR</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* User messages */}
                    {msg.role === 'user' && (
                      <>
                        <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed bg-surface-alt text-foreground border border-border">
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        </div>
                        <div className="size-6 rounded bg-surface-alt border border-border flex items-center justify-center shrink-0 mt-1">
                          <User className="size-3.5 text-muted-foreground" />
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {/* Thinking indicator */}
            {agentPhase === 'thinking' && (
              <div className="flex gap-2 justify-start">
                <div className="size-6 rounded bg-accent-brand/10 border border-accent-brand/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="size-3.5 text-accent-brand" />
                </div>
                <div className="bg-accent-brand/5 border border-accent-brand/15 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-accent-brand animate-bounce [animation-delay:0ms]" />
                  <span className="size-1.5 rounded-full bg-accent-brand animate-bounce [animation-delay:150ms]" />
                  <span className="size-1.5 rounded-full bg-accent-brand animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2 shrink-0">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب أمر هنا..."
            className="flex-1 bg-surface-alt border-border text-foreground placeholder:text-muted-foreground focus:border-accent-brand/50 focus:ring-accent-brand/20 text-sm"
            disabled={chatMutation.isPending}
          />
          <Button
            size="icon"
            className="bg-accent-brand hover:bg-accent-brand-dim text-white shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
          >
            {chatMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
