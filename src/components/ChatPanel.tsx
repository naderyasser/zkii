'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Terminal, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ToolCallResult {
  tool: string;
  status: 'success' | 'error';
  message: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallResult[];
}

const suggestions = [
  'إيه اللي عندي النهارده؟',
  'أهم مهامي التقنية',
  'حلّل مهامي',
  'أجل مهمة مكالمة العميل لبكرة',
];

export default function ChatPanel() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (msgs: Message[]) => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: msgs.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply || 'مفيش رد متاح دلوقتي.',
        toolCalls: data.toolCalls || [],
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Invalidate queries if tool calls were executed
      if (data.toolCalls && data.toolCalls.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['heatmap'] });
        queryClient.invalidateQueries({ queryKey: ['weekly-score'] });
      }
    },
    onError: () => {
      const errorMessage: Message = {
        role: 'assistant',
        content: '⚠ ERR: فشل الاتصال — حاول تاني',
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
    onSettled: () => {
      setIsTyping(false);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  function handleSend() {
    if (!input.trim() || chatMutation.isPending) return;
    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    chatMutation.mutate(newMessages);
  }

  function handleSuggestion(text: string) {
    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
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
        <CardTitle className="text-base font-bold text-neon neon-glow-subtle flex items-center gap-2">
          <Terminal className="size-4" />
          زكي
          <span className="text-[9px] font-mono text-muted-foreground font-normal ml-2">v2.0 // AI Agent</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 p-3 pt-3 overflow-hidden">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="flex flex-col gap-3 pb-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="size-14 rounded-lg bg-neon/10 border border-neon/30 flex items-center justify-center neon-border-glow">
                  <Bot className="size-7 text-neon" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-neon neon-glow-subtle">
                    أهلاً! أنا زكي ⚡
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {'>'} مساعدك التقني — أقدر أضيف، أعدّل، وأشطب مهامك
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  {suggestions.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="text-xs border-neon/20 text-neon/80 hover:bg-neon/10 hover:text-neon justify-start h-8"
                      onClick={() => handleSuggestion(s)}
                      disabled={chatMutation.isPending}
                    >
                      {'>'} {s}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="size-6 rounded bg-neon/10 border border-neon/30 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="size-3.5 text-neon" />
                      </div>
                    )}
                    <div className="max-w-[85%] flex flex-col gap-1.5">
                      <div
                        className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-surface-alt text-slate-200 border border-border'
                            : 'bg-neon/5 text-slate-200 border border-neon/20'
                        }`}
                      >
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
                                  ? 'bg-neon/5 border-neon/20 text-neon'
                                  : 'bg-red-500/5 border-red-500/20 text-red-400'
                              }`}
                            >
                              <Wrench className="size-3" />
                              <span className="font-semibold">{tc.tool}</span>
                              <span className="text-muted-foreground">→</span>
                              <span>{tc.message}</span>
                              {tc.status === 'success' ? (
                                <Badge className="bg-neon/10 text-neon text-[8px] px-1 py-0 h-3.5 border-0">OK</Badge>
                              ) : (
                                <Badge className="bg-red-500/10 text-red-400 text-[8px] px-1 py-0 h-3.5 border-0">ERR</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="size-6 rounded bg-surface-alt border border-border flex items-center justify-center shrink-0 mt-1">
                        <User className="size-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-2 justify-start">
                    <div className="size-6 rounded bg-neon/10 border border-neon/30 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="size-3.5 text-neon" />
                    </div>
                    <div className="bg-neon/5 border border-neon/20 rounded-xl px-4 py-2.5 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-neon animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 rounded-full bg-neon animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 rounded-full bg-neon animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
              </>
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
            className="flex-1 bg-surface-alt border-border text-slate-200 placeholder:text-muted-foreground focus:border-neon/50 focus:ring-neon/20 text-sm"
            disabled={chatMutation.isPending}
          />
          <Button
            size="icon"
            className="bg-neon hover:bg-neon-dim text-background shrink-0"
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
