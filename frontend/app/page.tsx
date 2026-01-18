"use client";

import { useEffect, useState, useRef } from "react";
import GlobeClient from "@/components/ui/GlobeClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Terminal, ShieldAlert, Zap } from "lucide-react";

const HQ_LOCATION = { lat: 20.5937, lng: 78.9629 }; // Example: India (Or set to your hackathon city)

type Event = {
  lat: number;
  lng: number;
  attack_format: string[];
  severity: "low" | "medium" | "high";
  timestamp: number;
};

function severityHex(sev: string) {
  if (sev === "high") return "#ef4444"; // red-500
  if (sev === "medium") return "#f59e0b"; // amber-500
  return "#10b981"; // emerald-500
}

function severityAlt(sev: string) {
  return sev === "high" ? 0.7 : sev === "medium" ? 0.4 : 0.2;
}

export default function Page() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<[string, number][]>([]);

  // AI State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 1. Fetch Events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("http://localhost:5000/events/stream");
        const json = await res.json();

        const arcs = (json.events as Event[])
          .slice(-50)
          .map((e, i) => ({
            order: i,
            startLat: e.lat,
            startLng: e.lng,
            // ATTACK VECTOR: Source -> HQ
            endLat: HQ_LOCATION.lat,
            endLng: HQ_LOCATION.lng,
            arcAlt: severityAlt(e.severity),
            color: severityHex(e.severity),

            attack_format: e.attack_format,
            severity: e.severity,
          }));

        setData(arcs);
      } catch (err) { console.error(err); }
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 4000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch Summary
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch("http://localhost:5000/summary");
        const json = await res.json();
        setSummary(json.top_attack_formats ?? []);
      } catch (err) { console.error(err); }
    };
    fetchSummary();
    const interval = setInterval(fetchSummary, 5000);
    return () => clearInterval(interval);
  }, []);

  // 3. AI Analysis Handler
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAiReport(null);
    try {
      const res = await fetch("http://localhost:5000/ai/analyze");
      const json = await res.json();
      setAiReport(json.analysis);
    } catch (e) {
      setAiReport("Error connecting to AI Command Link.");
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="relative h-screen w-screen bg-slate-950 overflow-hidden font-sans text-white">

      {/* BACKGROUND MAP */}
      <div className="absolute inset-0 z-0">
        <GlobeClient
          globeConfig={{
            globeColor: "#0f172a", // Slate 900
            ambientLight: "#38bdf8",
            pointLight: "#ffffff",
            autoRotate: true,
            autoRotateSpeed: 0.6,
          }}
          data={data}
        />
      </div>

      {/* DASHBOARD LAYER */}
      <div className="relative z-10 flex flex-col h-full p-6 pointer-events-none">

        {/* HEADER */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-emerald-400">
              CYBER SENTINEL
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-xs font-mono text-slate-400">LIVE THREAT FEED // HACKFORGE_NODE_01</span>
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-400/30 shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2"><Zap className="w-4 h-4 animate-pulse" /> DECRYPTING...</span>
            ) : (
              <span className="flex items-center gap-2"><Terminal className="w-4 h-4" /> GENERATE SITREP</span>
            )}
          </Button>
        </div>

        {/* MIDDLE CONTENT (Empty for Globe visibility) */}
        <div className="flex-1"></div>

        {/* BOTTOM HUD */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pointer-events-none">

          {/* LEFT: Stats */}
          <Card className="bg-black/60 backdrop-blur-md border-white/10 text-slate-200 pointer-events-auto">
            <CardHeader className="py-3">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-500">Active Signatures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {summary.slice(0, 4).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center group">
                  <span className="text-slate-400 group-hover:text-white transition-colors">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-12 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${Math.min(count * 5, 100)}%` }}></div>
                    </div>
                    <span className="font-mono text-xs">{count}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* CENTER SPACER */}
          <div className="hidden md:block col-span-2">
            {/* AI REPORT POPUP (Displays when aiReport has text) */}
            {aiReport && (
              <div className="pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/50 p-4 rounded-lg shadow-2xl">
                  <div className="flex items-center gap-2 mb-2 text-indigo-400 border-b border-indigo-500/20 pb-2">
                    <ShieldAlert className="w-5 h-5" />
                    <span className="font-bold text-sm tracking-wider">AI THREAT ASSESSMENT</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-xs md:text-sm text-slate-300 leading-relaxed">
                    {aiReport}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Live Feed */}
          <Card className="bg-black/60 backdrop-blur-md border-white/10 text-slate-200 pointer-events-auto h-48 flex flex-col">
            <CardHeader className="py-3">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-500">Incoming Packets</CardTitle>
            </CardHeader>
            <div className="overflow-y-auto flex-1 p-4 pt-0 space-y-2 scrollbar-hide">
              {data.slice().reverse().map((e, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-white/5 pb-1">
                  <div className="flex flex-col">
                    <span className="text-slate-300 font-mono" title={e.attack_format.join(", ")}>
                      {e.attack_format && e.attack_format.length > 0
                        ? e.attack_format.join(", ").substring(0, 15) + (e.attack_format.join(", ").length > 15 ? "..." : "")
                        : "Unknown"}
                    </span>
                    <span className="text-[10px] text-slate-500">{e.startLat.toFixed(2)}, {e.startLng.toFixed(2)}</span>
                  </div>
                  <span style={{ color: e.color }} className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-white/5 rounded">
                    {e.color === "#ef4444" ? "CRIT" : "WARN"}
                  </span>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}