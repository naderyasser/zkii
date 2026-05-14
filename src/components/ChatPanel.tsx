'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Terminal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const suggestions = [
  'إيه اللي عندي النهارده؟',
  'أهم مهامي التقنية',
  'حلّل مهامي',
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
        body: JSON.stringify({ messages: msgs }),
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
      };
      setMessages((prev) => [...prev, assistantMessage]);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-score'] });
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
    <Card className="border-border bg-card/60 backdrop-blur-sm flex flex-col h-[500px] lg:h-full">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-lg font-bold text-neon neon-glow-subtle flex items-center gap-2">
          <Terminal className="size-5" />
          زكي
          <span className="text-[10px] font-mono text-muted-foreground font-normal ml-2">v2.0</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 p-4 pt-0 overflow-hidden">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="flex flex-col gap-3 pb-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="size-16 rounded-lg bg-neon/10 border border-neon/30 flex items-center justify-center neon-border-glow">
                  <Bot className="size-8 text-neon" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-neon neon-glow-subtle">
                    أهلاً! أنا زكي ⚡
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {'>'} مساعدك التقني الذكي — جاهز للتنفيذ
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="text-xs border-neon/30 text-neon hover:bg-neon/10 hover:text-neon"
                      onClick={() => handleSuggestion(s)}
                      disabled={chatMutation.isPending}
                    >
                      {s}
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
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-surface-alt text-slate-200 border border-border'
                          : 'bg-neon/5 text-slate-200 border border-neon/20'
                      }`}
                    >
                      <span className="font-mono whitespace-pre-wrap">{msg.content}</span>
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
            className="flex-1 bg-surface-alt border-border text-slate-200 placeholder:text-muted-foreground focus:border-neon/50 focus:ring-neon/20"
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
