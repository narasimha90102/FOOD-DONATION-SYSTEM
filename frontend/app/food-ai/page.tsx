"use client";

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AIService } from '../../services/aiService';
import { Send, Bot, User, Sparkles, RefreshCw, Trash2, ArrowRight, ShieldCheck, HeartHandshake, Compass, HelpCircle } from 'lucide-react';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function FoodAIPage() {
  const { user, isAuthenticated } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const role = (user?.role || 'DONOR').toUpperCase();

  const getRoleSuggestions = () => {
    switch (role) {
      case 'DONOR':
        return [
          'How do I donate food?',
          'How do I check my donation status?',
          'How does pickup work?',
          'What happens after a volunteer accepts my donation?',
        ];
      case 'NGO':
        return [
          'How do I accept food?',
          'How can I track a delivery?',
          'What happens when food is delivered?',
          'How do I manage received donations?',
        ];
      case 'VOLUNTEER':
        return [
          'How do I accept a pickup?',
          'How does route tracking work?',
          'What should I do after reaching the NGO?',
          'How do I mark food as Delivered?',
        ];
      case 'ADMIN':
        return [
          'How do I approve an NGO?',
          'How do I approve a volunteer?',
          'How can I monitor donations?',
          'What can an administrator manage?',
        ];
      default:
        return [
          'How do I donate food?',
          'How do I check my donation status?',
          'How does pickup work?',
          'How does FoodBridge protect food safety?',
        ];
    }
  };

  const suggestions = getRoleSuggestions();

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const formatTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: formatTime(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setLoading(true);

    try {
      const historyPayload = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const aiReply = await AIService.chatWithFoodAI({
        message: query,
        role: user?.role || 'DONOR',
        userName: user?.name || 'FoodBridge Member',
        history: historyPayload,
      });

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiReply,
        timestamp: formatTime(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorText = err?.message || 'FOOD AI is taking longer than expected. Please try again.';
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorText,
        timestamp: formatTime(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-5rem)]">
      
      {/* ── HEADER ── */}
      <div className="glass-panel p-4 sm:p-5 border-white/10 flex items-center justify-between gap-4 mb-4 rounded-2xl bg-dark-900/90 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500/20 to-emerald-500/10 border border-brand-500/30 flex items-center justify-center text-2xl shadow-lg shadow-brand-500/10">
            🍽️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white text-outfit tracking-tight">
                FOOD AI
              </h1>
              <span className="bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                {role} Assistant
              </span>
            </div>
            <p className="text-xs text-slate-400">Your FoodBridge Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              title="Reset Conversation"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-all text-xs flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* ── CHAT CONTAINER ── */}
      <div className="glass-panel flex-1 p-4 sm:p-6 border-white/10 rounded-2xl flex flex-col justify-between overflow-hidden bg-dark-900/70 shadow-2xl relative">
        
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2 scrollbar-thin">
          
          {/* EMPTY STATE */}
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-8 space-y-6">
              <div className="h-16 w-16 rounded-3xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-3xl shadow-xl shadow-brand-500/10 animate-bounce">
                🍽️
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white text-outfit">
                  Hello! I&apos;m FOOD AI, your FoodBridge assistant.
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                  I can help you with donations, pickups, deliveries, tracking, notifications, and other FoodBridge features.
                </p>
                <p className="text-xs text-brand-400 font-semibold pt-1">
                  How can I help you?
                </p>
              </div>

              {/* Role Suggestions Pills */}
              <div className="w-full pt-4 space-y-2 text-left">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Suggested Questions for {role}:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestions.map((promptText, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(promptText)}
                      className="p-3 rounded-xl bg-white/5 hover:bg-brand-500/10 border border-white/10 hover:border-brand-500/30 text-xs text-slate-300 hover:text-white transition-all text-left flex items-center justify-between group cursor-pointer"
                    >
                      <span className="pr-2">{promptText}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MESSAGE LIST */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-sm shrink-0 mt-1">
                  🍽️
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-500 text-dark-900 font-medium rounded-tr-none shadow-lg shadow-brand-500/10'
                    : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none glass-panel'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>
                <div
                  className={`text-[10px] mt-1.5 flex items-center ${
                    msg.role === 'user' ? 'text-dark-900/70 justify-end' : 'text-slate-500 justify-start'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-slate-300 text-xs shrink-0 mt-1 font-bold">
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
              )}
            </div>
          ))}

          {/* TYPING INDICATOR */}
          {loading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="h-8 w-8 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-sm shrink-0">
                🍽️
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5 text-xs text-slate-400">
                <span className="inline-block h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                <span className="inline-block h-2 w-2 rounded-full bg-brand-400 animate-pulse delay-150" />
                <span className="inline-block h-2 w-2 rounded-full bg-teal-400 animate-pulse delay-300" />
                <span className="text-[11px] ml-1">FOOD AI is typing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips on Active Chat */}
        {messages.length > 0 && (
          <div className="pt-2 pb-2 overflow-x-auto flex gap-2 no-scrollbar">
            {suggestions.slice(0, 3).map((promptText, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(promptText)}
                disabled={loading}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-400 hover:text-white transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {promptText}
              </button>
            ))}
          </div>
        )}

        {/* ── INPUT BAR ── */}
        <div className="pt-3 border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2 bg-dark-900/90 border border-white/10 rounded-2xl p-2 focus-within:border-brand-500/50 transition-all shadow-inner"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask FOOD AI..."
              disabled={loading}
              className="flex-1 bg-transparent border-none text-white text-xs sm:text-sm px-3 py-2 focus:outline-none resize-none max-h-24 placeholder-slate-500"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-dark-900 font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 shrink-0 cursor-pointer flex items-center justify-center"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>

          <p className="text-[10px] text-slate-500 text-center mt-2">
            FOOD AI is specialized for FoodBridge workflows. Press Enter to send, Shift+Enter for new line.
          </p>
        </div>

      </div>

    </div>
  );
}
