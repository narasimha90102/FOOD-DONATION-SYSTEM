"use client";

import ChatConsole from '../../../components/ChatConsole';

export default function NgoChatPage() {
  return (
    <div className="flex-grow flex flex-col pt-6">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-white/5 pb-3">
        <h1 className="text-2xl font-bold text-white text-outfit">Surplus Communications Room</h1>
        <p className="text-xs text-slate-400">Secure pipeline coordination chat rooms with verified donors</p>
      </div>
      <ChatConsole />
    </div>
  );
}
