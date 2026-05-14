'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
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
  'أهم مهامي',
  'فكّر معايا',
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
      // Invalidate tasks in case AI created/modified tasks
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-score'] });
    },
    onError: () => {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'حصل خطأ، حاول تاني 🙏',
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
    <Card className="shadow-sm flex flex-col h-[500px] lg:h-full">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-lg font-bold text-purple-800 flex items-center gap-2">
          <Bot className="size-5 text-purple-500" />
          زكي
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 p-4 pt-0 overflow-hidden">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="flex flex-col gap-3 pb-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="size-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <Bot className="size-8 text-purple-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-purple-800">
                    أهلاً! أنا زكي 🧠
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    مساعدك الشخصي الذكي — اسألني عن مهامك
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="text-xs border-purple-200 text-purple-600 hover:bg-purple-50"
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
                      <div className="size-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="size-3.5 text-purple-500" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-muted text-foreground'
                          : 'bg-purple-50 text-purple-900 border border-purple-100'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="size-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-1">
                        <User className="size-3.5 text-gray-500" />
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-2 justify-start">
                    <div className="size-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="size-3.5 text-purple-500" />
                    </div>
                    <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
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
            placeholder="اكتب هنا..."
            className="flex-1"
            disabled={chatMutation.isPending}
          />
          <Button
            size="icon"
            className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
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
