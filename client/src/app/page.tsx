"use client";

import { useState, useCallback } from "react";
import { useDropzone, Accept } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamic import for the 3D viewer (no SSR - uses WebGL)
const ModelViewer = dynamic(() => import("@/components/ModelViewer"), {
  ssr: false,
  loading: () => (
    <div className="viewer-container flex items-center justify-center">
      <div className="spinner" />
    </div>
  ),
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Mode = "image" | "video";
type Status = "idle" | "uploading" | "processing" | "done" | "error";

export default function Home() {
  const [mode, setMode] = useState<Mode>("image");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelType, setModelType] = useState<"stl" | "obj" | null>(null);

  /* ─── Upload Logic ─── */
  const handleUpload = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setStatusMsg("Uploading file…");
      setModelUrl(null);
      setModelType(null);

      const formData = new FormData();
      formData.append("file", file);

      const endpoint =
        mode === "image"
          ? `${API_BASE}/api/upload/image`
          : `${API_BASE}/api/upload/video`;

      try {
        setStatus("processing");
        setStatusMsg(
          mode === "image"
            ? "Detecting contours & building 3D mesh…"
            : "Extracting frames & generating 3D model…"
        );

        const res = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Upload failed" }));
          throw new Error(err.detail || `Server error ${res.status}`);
        }

        const data = await res.json();
        const downloadUrl = `${API_BASE}${data.download_url}`;
        const ext = data.filename?.split(".").pop()?.toLowerCase();

        setFileName(data.filename);
        setModelUrl(downloadUrl);
        setModelType(ext === "stl" ? "stl" : "obj");
        setStatus("done");
        setStatusMsg("Mesh generated successfully!");
      } catch (err: unknown) {
        setStatus("error");
        setStatusMsg(
          err instanceof Error ? err.message : "Something went wrong."
        );
      }
    },
    [mode]
  );

  /* ─── Dropzone ─── */
  const accept: Accept = mode === "image"
    ? { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] }
    : { "video/mp4": [".mp4"], "video/mpeg": [".mpeg"] };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles: 1,
    onDrop: (files) => {
      if (files.length > 0) handleUpload(files[0]);
    },
  });

  /* ─── Download ─── */
  const handleDownload = () => {
    if (!modelUrl || !fileName) return;
    const a = document.createElement("a");
    a.href = modelUrl;
    a.download = fileName;
    a.click();
  };

  return (
    <>
      {/* Immersive Global Background */}
      <div className="bg-mesh" />

      {/* Edge-to-Edge 3D Canvas Context */}
      <ModelViewer modelUrl={modelUrl} modelType={modelType} />

      {/* Floating Dashboard Overlay */}
      <main className="absolute inset-0 pointer-events-none p-4 sm:p-6 md:p-8 flex items-stretch">
        
        {/* Left Sidebar (The Glass Control Panel) */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="glass flex flex-col gap-6 w-full max-w-sm sm:max-w-md pointer-events-auto relative z-10 sidebar-scroll overflow-y-auto"
        >
          {/* Header Branding */}
          <div className="p-6 pb-2 border-b border-white/5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-1">
              <span className="gradient-text">HARI's 3D </span>
              <span className="text-foreground/90">Builder</span>
            </h1>
            <p className="text-xs sm:text-sm text-foreground/40 leading-relaxed max-w-xs">
              Transform 2D formats into breathtaking 3D meshes in seconds.
            </p>
          </div>

          <div className="px-6 pb-6 flex flex-col gap-6 flex-1">
            {/* Mode Selector */}
            <div className="relative flex p-1" id="mode-selector">
              <button
                className={`mode-tab flex-1 flex justify-center items-center gap-2 ${mode === "image" ? "active" : ""}`}
                onClick={() => {
                  setMode("image");
                  setStatus("idle");
                  setStatusMsg("");
                  setModelUrl(null);
                }}
              >
                {mode === "image" && (
                  <motion.div layoutId="modeTabBg" className="mode-tab-bg" />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Image
                </span>
              </button>
              <button
                className={`mode-tab flex-1 flex justify-center items-center gap-2 ${mode === "video" ? "active" : ""}`}
                onClick={() => {
                  setMode("video");
                  setStatus("idle");
                  setStatusMsg("");
                  setModelUrl(null);
                }}
              >
                {mode === "video" && (
                  <motion.div layoutId="modeTabBg" className="mode-tab-bg" />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  Video
                </span>
              </button>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`dropzone overflow-hidden relative group ${isDragActive ? "active" : ""}`}
            >
              <input {...getInputProps()} id="file-input" />
              <motion.div animate={{ scale: isDragActive ? 1.05 : 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <div className="mb-4">
                  <motion.svg
                    className="mx-auto text-primary-light/50 group-hover:text-primary-light transition-colors"
                    animate={{ y: isDragActive ? -5 : 0 }}
                    width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </motion.svg>
                </div>
                <p className="text-foreground/70 text-sm mb-1 font-medium">
                  {isDragActive ? (
                    <span className="text-primary-light">Release to teleport payload</span>
                  ) : (
                    <>Drag & drop <span className="text-primary-light">{mode === "image" ? "PNG/JPG" : "MP4"}</span> here</>
                  )}
                </p>
                <p className="text-foreground/30 text-xs">or click to browse local files</p>
              </motion.div>
            </div>

            {/* Status Indicator */}
            <AnimatePresence mode="wait">
              {status !== "idle" && (
                <motion.div
                  key={status}
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="glass-subtle p-4 flex items-center gap-4 overflow-hidden"
                >
                  {(status === "uploading" || status === "processing") && (
                    <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2 }} />
                  )}
                  {status === "done" && (
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                  {status === "error" && (
                    <div className="w-7 h-7 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground/90 uppercase tracking-wide">
                      {status}
                    </p>
                    <p className="text-xs text-foreground/50 mt-0.5">{statusMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Download Button */}
            <AnimatePresence>
              {status === "done" && modelUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <button className="btn-glow w-full justify-center shadow-lg" onClick={handleDownload}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Mesh
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="mt-auto pt-4 border-t border-white/5">
              <h3 className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest mb-3">Model Engine</h3>
              {mode === "image" ? (
                <ul className="text-[11px] text-foreground/40 space-y-2">
                  <li className="flex gap-2 items-center"><span className="w-1 h-1 rounded-full bg-primary-light"></span> Edge-detection active</li>
                  <li className="flex gap-2 items-center"><span className="w-1 h-1 rounded-full bg-primary-light"></span> Shapely polygon extrusion</li>
                </ul>
              ) : (
                <ul className="text-[11px] text-foreground/40 space-y-2">
                  <li className="flex gap-2 items-center"><span className="w-1 h-1 rounded-full bg-primary-light"></span> MP4 Frame sequence extraction</li>
                  <li className="flex gap-2 items-center"><span className="w-1 h-1 rounded-full bg-primary-light"></span> AI NeRF generator standing by</li>
                </ul>
              )}
            </div>
          </div>
        </motion.div>

        {/* Top Right Floating Badges */}
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 flex flex-col items-end gap-3 z-10">
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
            className="glass-subtle px-3 py-1.5 flex items-center gap-2 rounded-full"
          >
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-foreground/50">Server Online</span>
          </motion.div>
          
          {modelUrl && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-subtle px-4 py-2 rounded-xl text-right backdrop-blur-xl border-accent/20"
            >
              <p className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest mb-1">Canvas Render</p>
              <p className="text-sm font-medium text-accent">{fileName}</p>
            </motion.div>
          )}
        </div>
      </main>
    </>
  );
}
