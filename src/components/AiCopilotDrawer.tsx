import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bot, Send, Sparkles, X } from 'lucide-react';
import {
  CrisisPreset,
  HospitalFacility,
  ShortageAlert,
  TransferDispatch,
} from '../types/blood';
import {
  CopilotReply,
  STARTER_QUESTIONS,
  generateCopilotReply,
} from '../utils/copilotEngine';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  reply?: CopilotReply;
  timestamp: string;
}

interface AiCopilotDrawerProps {
  facilities: HospitalFacility[];
  alerts: ShortageAlert[];
  transfers: TransferDispatch[];
  activeCrisis: CrisisPreset | null;
  onResolveAlert: (alert: ShortageAlert) => void;
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  facilities,
  alerts,
  transfers,
  activeCrisis,
  onResolveAlert,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const askQuestion = (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;

    const nowLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const reply = generateCopilotReply(
      trimmed,
      facilities,
      alerts,
      transfers,
      activeCrisis
    );

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: nowLabel,
    };

    const assistantMsg: ChatMessage = {
      id: `a-${Date.now() + 1}`,
      role: 'assistant',
      reply,
      timestamp: nowLabel,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputValue('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    askQuestion(inputValue);
  };

  return (
    <>
      {/* Floating Bottom-Right Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#0F172A] text-white shadow-lg border border-slate-700 hover:bg-slate-800 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        aria-label="Ask HemoPulse AI Copilot"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E11D48] text-white shrink-0">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-semibold whitespace-nowrap">Ask HemoPulse AI</span>
      </button>

      {/* Slide-Over Copilot Drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="HemoPulse AI Copilot"
        >
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
            {/* Drawer Header */}
            <div className="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E11D48] text-white shrink-0">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-bold text-white truncate">
                    HemoPulse AI Copilot
                  </h2>
                  <p className="text-xs text-slate-300 truncate">
                    Ranchi Live Telemetry{activeCrisis ? ` · ${activeCrisis.shortLabel}` : ' · 6 Sites Connected'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close AI Copilot"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Starter Prompts Bar (always accessible) */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 space-y-2">
              <div className="text-xs font-semibold text-slate-600">
                Quick Ranchi Network Diagnostics
              </div>
              <div className="flex flex-col gap-1.5">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => askQuestion(q)}
                    className="text-left px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                  >
                    <span>{q}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#F8FAFC]">
              {messages.length === 0 ? (
                <div className="rounded-xl bg-white border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
                  Select one of the diagnostic prompts above or ask about any Ranchi hospital
                  (RIMS, Medica, Raj Hospital, Orchid, Sadar, Red Cross), blood group, or expiry risk.
                  All answers read the live network inventory and active crisis state.
                </div>
              ) : (
                messages.map((msg) =>
                  msg.role === 'user' ? (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-xl bg-slate-900 text-white px-3.5 py-2.5 text-xs leading-relaxed">
                        <div>{msg.text}</div>
                        <div className="mt-1 text-[10px] text-slate-400 text-right font-mono tabular-nums">
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex justify-start">
                      <div className="w-full rounded-xl bg-white border border-slate-200 p-4 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {msg.reply?.headline}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono tabular-nums shrink-0">
                            {msg.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {msg.reply?.body}
                        </p>
                        {msg.reply && msg.reply.bullets.length > 0 && (
                          <ul className="space-y-1.5 pt-1 border-t border-slate-100">
                            {msg.reply.bullets.map((b, idx) => (
                              <li
                                key={idx}
                                className="text-xs text-slate-700 leading-relaxed flex items-start gap-2"
                              >
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {msg.reply?.actionAlert && msg.reply.actionLabel && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsOpen(false);
                                onResolveAlert(msg.reply!.actionAlert!);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E11D48] text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
                            >
                              <span>{msg.reply.actionLabel}</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )
              )}
              <div ref={scrollEndRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={handleSubmit}
              className="p-4 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about RIMS, O-, wastage, transfers..."
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                aria-label="Ask HemoPulse AI question"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 p-2 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Send question"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
