"use client";

import { useEffect, useState, useRef } from 'react';
import { ApiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useSocket } from '../hooks/useSocket';
import { MessageSquare, Send, Image, RefreshCw, CheckCheck, Smile, Sparkles } from 'lucide-react';

export default function ChatConsole() {
  const { user, chats, setChats, addMessageToChat, markChatMessagesSeen } = useAppStore();
  const { joinChatRoom, leaveChatRoom, emitTyping } = useSocket();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchChats = async () => {
    try {
      const res = await ApiService.get('/chats');
      setChats(res.chats || []);
      if (res.chats && res.chats.length > 0) {
        setActiveChatId(res.chats[0]._id);
      }
    } catch (err) {
      console.error('[ChatConsole] Error loading rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  // Update active messages thread when changing active room
  useEffect(() => {
    if (!activeChatId) return;

    // Join WebSocket Room
    joinChatRoom(activeChatId);

    const fetchMessages = async () => {
      try {
        const res = await ApiService.get(`/chats/${activeChatId}`);
        // Bind historic messages
        setMessages(res.chat.messages || []);
        
        // Trigger seen synchronization
        markChatMessagesSeen(activeChatId, user?._id || '');
      } catch (err) {
        console.error('[ChatConsole] Error loading history:', err);
      }
    };
    
    fetchMessages();

    return () => {
      leaveChatRoom(activeChatId);
    };
  }, [activeChatId]);

  // Sync messages from Zustand store for real-time WebSocket messaging overlays
  useEffect(() => {
    if (!activeChatId) return;
    const currentChat = chats.find(c => c._id === activeChatId);
    if (currentChat) {
      setMessages(currentChat.messages || []);
      scrollToBottom();
    }
  }, [chats, activeChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle typing statuses
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      emitTyping(activeChatId || '', true);
      
      // Stop typing timeout
      setTimeout(() => {
        setIsTyping(false);
        emitTyping(activeChatId || '', false);
      }, 2500);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text && !imageUrl) || !activeChatId) return;

    setSending(true);
    try {
      const res = await ApiService.post(`/chats/${activeChatId}/messages`, {
        text,
        imageUrl,
      });

      // Clear form
      setText('');
      setImageUrl('');
      
      // Manually append locally immediately for quick UI response
      addMessageToChat(activeChatId, res.message);
      scrollToBottom();

    } catch (err) {
      console.error('[ChatConsole] Send error:', err);
    } finally {
      setSending(false);
    }
  };

  /**
   * Fully operational mock image uploader post base64 strings
   */
  const triggerImageUpload = () => {
    const imagesList = [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=300&q=80',
    ];
    // Set mock base64/url image attachment
    const randomImg = imagesList[Math.floor(Math.random() * imagesList.length)];
    setImageUrl(randomImg);
    alert('Surplus image attachment appended!');
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400">Opening secure messaging hub...</p>
      </div>
    );
  }

  const activeChat = chats.find(c => c._id === activeChatId);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow flex flex-col lg:flex-row gap-6 h-[600px] overflow-hidden">
      
      {/* 1. Sidebar Chat list (Takes 1/3 space) */}
      <div className="w-full lg:w-80 glass-panel border-white/5 flex flex-col h-full overflow-y-auto p-4 shrink-0">
        <h3 className="text-md font-bold text-white text-outfit border-b border-white/5 pb-3 mb-4">Surplus Coordinators</h3>
        
        {chats.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <MessageSquare className="h-8 w-8 text-slate-600" />
            <span className="text-xs text-slate-500">No active pickup chats found. Claim or post surpluses first.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => {
              const opponent = user?.role === 'DONOR' ? chat.ngo : chat.donor;
              const isActive = chat._id === activeChatId;
              
              return (
                <button
                  key={chat._id}
                  onClick={() => setActiveChatId(chat._id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    isActive ? 'bg-brand-500/10 border-brand-500/30' : 'bg-transparent border-white/5 hover:bg-white/5'
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold">
                    {opponent.name.charAt(0)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{opponent.name}</h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{chat.donation.foodName}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Main Chat Feed (Takes remaining space) */}
      <div className="flex-grow glass-panel border-white/5 flex flex-col h-full overflow-hidden">
        {activeChat ? (
          <>
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-white/5 p-4 bg-white/20 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold">
                  {(user?.role === 'DONOR' ? activeChat.ngo.name : activeChat.donor.name).charAt(0)}
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-sm font-bold text-white">
                    {user?.role === 'DONOR' ? activeChat.ngo.name : activeChat.donor.name}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider mt-1 block">
                    Pipeline Food: <strong>{activeChat.donation.foodName}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Feed list */}
            <div className="flex-grow p-4 overflow-y-auto space-y-4 flex flex-col">
              {messages.map((msg, idx) => {
                const isMine = msg.sender.toString() === user?._id.toString();
                
                return (
                  <div
                    key={msg._id || idx}
                    className={`flex flex-col max-w-[70%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}
                  >
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      isMine
                        ? 'bg-brand-500 text-dark-900 rounded-tr-none font-medium'
                        : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/5'
                    }`}>
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="attachment" className="rounded-lg max-h-32 mb-2 object-cover border border-white/5" />
                      )}
                      <p>{msg.text}</p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMine && (
                        <CheckCheck className={`h-3 w-3 ${msg.seen ? 'text-brand-500' : 'text-slate-500'}`} />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Submission console */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 flex flex-col gap-3">
              
              {imageUrl && (
                <div className="flex items-center justify-between bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg text-xs">
                  <span className="text-slate-400 truncate max-w-xs">Attachment: {imageUrl}</span>
                  <button type="button" onClick={() => setImageUrl('')} className="text-red-400 font-bold">Remove</button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={triggerImageUpload}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <Image className="h-5 w-5" />
                </button>
                
                <input
                  type="text"
                  placeholder="Type secure surplus messaging..."
                  value={text}
                  onChange={handleTextChange}
                  className="flex-grow glass-input py-3"
                  required={!imageUrl}
                />

                <button
                  type="submit"
                  disabled={sending}
                  className="bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-dark-900 font-bold p-3.5 rounded-lg transition-all flex items-center justify-center shadow-lg"
                >
                  {sending ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center gap-3">
            <MessageSquare className="h-12 w-12 text-slate-700 animate-float" />
            <p className="text-slate-400 text-sm">Select surplus room thread to initiate secure real-time routing coordination.</p>
          </div>
        )}
      </div>

    </div>
  );
}
