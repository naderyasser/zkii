import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { ChatMessage, ToolCallResult } from '@/types';

export function useChat() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const chatMutation = useMutation({
    mutationFn: (msgs: { role: string; content: string }[]) =>
      api.sendChat(msgs),
    onSuccess: (data) => {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || 'تم التنفيذ.',
        toolCalls: data.toolCalls,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.toolCalls && data.toolCalls.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['heatmap'] });
        queryClient.invalidateQueries({ queryKey: ['weekly-score'] });
        queryClient.invalidateQueries({ queryKey: ['oauth-status'] });
        queryClient.refetchQueries({ queryKey: ['tasks'] });
      }
    },
  });

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || chatMutation.isPending) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      chatMutation.mutate(history);
    },
    [chatMutation, messages]
  );

  const isPending = chatMutation.isPending;

  return { messages, sendMessage, isPending };
}
