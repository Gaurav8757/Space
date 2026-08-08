'use client';

import { X, Terminal, Download, Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface LocalSetupModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function LocalSetupModal({ isOpen, onClose }: LocalSetupModalProps) {
  const [copied, setCopied] = useState(false);

  const command = `git clone <your-repo>
cd spaceshield-ai
npm install
# Set your GEMINI_API_KEY in .env.local
echo "GEMINI_API_KEY=your_key_here" > .env.local
npm run dev`;

  const copyCommand = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#0d1527] border border-[#203657] rounded-xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
        <div className="p-4 border-b border-[#203657] bg-[#111c33] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Localhost Deployment & Download Instructions</h3>
              <p className="text-xs text-slate-400">All API endpoints are fully integrated for standalone local execution</p>
            </div>
          </div>
          <button type='button' onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all duration-150 border-none cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs sm:text-sm text-slate-300">
          <p>
            This application is built with Next.js App Router and relative REST API endpoints (`/api/v1/*`). When you export or download the source code, all API endpoints will automatically run locally on <code className="text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">http://localhost:3000</code>!
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 font-mono text-cyan-400">
                <Terminal className="w-3.5 h-3.5" /> Local Terminal Setup Commands:
              </span>
              <button type='button'
                onClick={copyCommand}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#13213a] hover:bg-cyan-600 hover:text-slate-950 active:scale-95 text-cyan-400 border border-cyan-800 transition-all duration-150 cursor-pointer font-bold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 group-hover:text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Commands'}
              </button>
            </div>
            <pre className="p-3 bg-[#060c18] border border-[#1b2b48] rounded-lg font-mono text-xs text-cyan-300 overflow-x-auto">
              {command}
            </pre>
          </div>

          <div className="p-3 bg-[#0b1424] border border-[#1b2b48] rounded-lg space-y-1.5">
            <div className="font-semibold text-white text-xs">Included Local Endpoints:</div>
            <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 font-mono">
              <li><span className="text-emerald-400">GET</span> http://localhost:3000/api/v1/satellites</li>
              <li><span className="text-emerald-400">GET</span> http://localhost:3000/api/v1/predictions</li>
              <li><span className="text-amber-400">POST</span> http://localhost:3000/api/v1/maneuver/plan</li>
              <li><span className="text-amber-400">POST</span> http://localhost:3000/api/v1/ai/analyze (Gemini AI)</li>
              <li><span className="text-emerald-400">GET</span> http://localhost:3000/api/v1/health</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
