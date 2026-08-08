export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070d18] text-white p-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-cyan-400">404 - Page Not Found</h2>
        <p className="text-slate-400 text-sm">The requested orbital telemetry route does not exist.</p>
        <a href="/" className="inline-block mt-4 px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs">
          Return to Mission Control
        </a>
      </div>
    </div>
  );
}
