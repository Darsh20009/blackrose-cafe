import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bot, X, Send, Loader2, Minimize2, Maximize2,
  Sparkles, Brain, TrendingUp, Package, BookOpen,
  ChevronDown, Mic, MicOff, RotateCcw
} from "lucide-react";
import { useLocation } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
  time: string;
}

const QUICK_PROMPTS = [
  { label: "📊 ملخص المبيعات", text: "أعطني ملخص مبيعات اليوم مع أبرز المنتجات" },
  { label: "📦 حالة المخزون", text: "ما المواد الأقل من الحد الأدنى؟ وماذا يجب شراؤه الآن؟" },
  { label: "💰 الوضع المالي", text: "ما صافي الربح هذا الشهر وما أبرز المصروفات؟" },
  { label: "👥 الموظفون", text: "من حضر اليوم؟ وهل هناك غيابات أو تأخيرات؟" },
  { label: "⚠️ تنبيهات", text: "ما أبرز التنبيهات والمشكلات التي تحتاج انتباهي الآن؟" },
  { label: "📈 توصية", text: "بناءً على بيانات المبيعات، ما توصيتك لزيادة الأرباح؟" },
];

const PAGE_CONTEXT: Record<string, string> = {
  "/manager/accounting": "accounting-audit",
  "/manager/inventory": "inventory-insights",
  "/manager/dashboard": "ceo-chat",
  "/manager/reports": "ceo-chat",
  "/employee": "brand-chat",
};

function getEndpointForPath(path: string): string {
  for (const [key, val] of Object.entries(PAGE_CONTEXT)) {
    if (path.startsWith(key)) return val;
  }
  return "ceo-chat";
}

const STAFF_ROUTE_PREFIXES = [
  "/manager", "/admin", "/qirox",
];

function isStaffRoute(path: string) {
  return STAFF_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function GlobalAIAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [location] = useLocation();
  const recognitionRef = useRef<any>(null);

  const endpoint = getEndpointForPath(location);

  const endpointLabels: Record<string, { label: string; color: string }> = {
    "ceo-chat": { label: "CEO AI", color: "bg-purple-600" },
    "accounting-audit": { label: "مدقق المحاسبة", color: "bg-blue-600" },
    "inventory-insights": { label: "ذكاء المخزون", color: "bg-green-600" },
    "brand-chat": { label: "مساعد الموظفين", color: "bg-orange-600" },
  };

  const currentLabel = endpointLabels[endpoint] || endpointLabels["ceo-chat"];

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const history = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));
      const body: any = { history };
      if (endpoint === "ceo-chat") body.message = text;
      else if (endpoint === "accounting-audit") body.question = text;
      else if (endpoint === "inventory-insights") body.question = text;
      else body.message = text;

      const res = await apiRequest("POST", `/api/ai/${endpoint}`, body);
      const data = await res.json();
      return data.answer || data.reply || data.report || data.response || "لم أتمكن من الإجابة.";
    },
    onSuccess: (answer) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: answer, time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى.", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) },
      ]);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sendMutation.isPending]);

  if (!isStaffRoute(location)) return null;

  function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || sendMutation.isPending) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: msg, time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) },
    ]);
    sendMutation.mutate(msg);
  }

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = "ar-SA";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: "linear-gradient(135deg, #7D3D0F, #D4912A)" }}
        data-testid="button-global-ai-open"
        title="المساعد الذكي"
      >
        <Brain className="w-7 h-7 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 border border-white/10`}
      style={{
        width: minimized ? "280px" : "380px",
        height: minimized ? "56px" : "560px",
        background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none flex-shrink-0"
        style={{ background: "linear-gradient(90deg, #7D3D0F, #D4912A)" }}
        onClick={() => minimized && setMinimized(false)}
      >
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm">المساعد الذكي</div>
          <div className="text-white/70 text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
            {currentLabel.label}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <Sparkles className="w-10 h-10 mx-auto mb-2 text-amber-400" />
                <p className="text-white/80 text-sm font-medium">كيف يمكنني مساعدتك؟</p>
                <p className="text-white/40 text-xs mt-1">اختر سؤالاً سريعاً أو اكتب ما تريد</p>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.text}
                      onClick={() => send(p.text)}
                      className="text-right text-xs px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-amber-600 text-white rounded-br-sm"
                      : "bg-white/10 text-white/90 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1 mb-1">
                      <Bot className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400 text-xs font-medium">المساعد الذكي</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className="text-white/40 text-[10px] mt-1 text-left">{msg.time}</div>
                </div>
              </div>
            ))}
            {sendMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts if has messages */}
          {messages.length > 0 && (
            <div className="px-3 pb-1 flex gap-1.5 overflow-x-auto scrollbar-hide flex-shrink-0">
              {QUICK_PROMPTS.slice(0, 3).map((p) => (
                <button
                  key={p.text}
                  onClick={() => send(p.text)}
                  className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 transition-colors whitespace-nowrap"
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setMessages([])}
                className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-red-500/30 text-white/50 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-white/10 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="اسألني أي شيء عن عملك..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none text-sm min-h-[40px] max-h-[100px] rounded-xl pr-3 pl-3 py-2.5"
                  rows={1}
                  dir="rtl"
                  disabled={sendMutation.isPending}
                />
              </div>
              <button
                onClick={listening ? stopVoice : startVoice}
                className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${listening ? "bg-red-500 text-white animate-pulse" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
                title="إدخال صوتي"
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={() => send()}
                disabled={!input.trim() || sendMutation.isPending}
                className="p-2.5 rounded-xl flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #7D3D0F, #D4912A)" }}
                data-testid="button-ai-send"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
            <p className="text-white/30 text-[10px] mt-1.5 text-center">
              Enter للإرسال • Shift+Enter لسطر جديد
            </p>
          </div>
        </>
      )}
    </div>
  );
}
