"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
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
  const accept =
    mode === "image"
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
      {/* Background */}
      <div className="bg-mesh" />

      {/* Decorative Particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            top: `${15 + i * 14}%`,
            left: `${10 + i * 15}%`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: `${5 + i}s`,
          }}
        />
      ))}

      <main className="relative min-h-screen flex flex-col items-center px-4 py-8 sm:px-8">
        {/* ─── Header ─── */}
        <motion.header
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-5xl text-center mb-10"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-3">
            <span className="gradient-text">Antigravity</span>
            <span className="text-foreground/90">3D</span>
          </h1>
          <p className="text-base sm:text-lg text-foreground/50 max-w-xl mx-auto leading-relaxed">
            Transform 2D images and videos into stunning 3D meshes — powered by
            computer vision.
          </p>
        </motion.header>

        {/* ─── Content Area ─── */}
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Controls */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col gap-5"
          >
            {/* Mode Selector */}
            <div className="glass p-1.5 flex gap-1" id="mode-selector">
              <button
                id="mode-image"
                className={`mode-tab flex-1 ${mode === "image" ? "active" : ""}`}
                onClick={() => {
                  setMode("image");
                  setStatus("idle");
                  setStatusMsg("");
                  setModelUrl(null);
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Image → 3D
                </span>
              </button>
              <button
                id="mode-video"
                className={`mode-tab flex-1 ${mode === "video" ? "active" : ""}`}
                onClick={() => {
                  setMode("video");
                  setStatus("idle");
                  setStatusMsg("");
                  setModelUrl(null);
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  Video → 3D
                </span>
              </button>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              id="dropzone"
              className={`dropzone ${isDragActive ? "active" : ""}`}
            >
              <input {...getInputProps()} id="file-input" />
              <motion.div
                animate={{ scale: isDragActive ? 1.05 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="mb-4">
                  <svg
                    className="mx-auto text-foreground/20"
                    width="56"
                    height="56"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="text-foreground/60 text-sm mb-1">
                  {isDragActive ? (
                    <span className="text-primary-light font-medium">
                      Drop it here!
                    </span>
                  ) : (
                    <>
                      Drag & drop a{" "}
                      <span className="text-primary-light font-medium">
                        {mode === "image" ? "PNG / JPG image" : "MP4 video"}
                      </span>{" "}
                      here
                    </>
                  )}
                </p>
                <p className="text-foreground/30 text-xs">
                  or click to browse files
                </p>
              </motion.div>
            </div>

            {/* Status */}
            <AnimatePresence mode="wait">
              {status !== "idle" && (
                <motion.div
                  key={status}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="glass-subtle p-4 flex items-center gap-3"
                >
                  {(status === "uploading" || status === "processing") && (
                    <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                  )}
                  {status === "done" && (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  )}
                  {status === "error" && (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground/80">
                      {status === "uploading" && "Uploading"}
                      {status === "processing" && "Processing"}
                      {status === "done" && "Complete"}
                      {status === "error" && "Error"}
                    </p>
                    <p className="text-xs text-foreground/40">{statusMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Download Button */}
            <AnimatePresence>
              {status === "done" && modelUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <button
                    id="download-btn"
                    className="btn-glow w-full justify-center"
                    onClick={handleDownload}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download {fileName}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info Card */}
            <div className="glass-subtle p-4">
              <h3 className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2">
                How it works
              </h3>
              {mode === "image" ? (
                <ol className="text-xs text-foreground/50 space-y-1.5 list-decimal list-inside">
                  <li>Upload a high-contrast PNG or JPG image</li>
                  <li>OpenCV detects contours from the image</li>
                  <li>Contours are converted to 3D polygons</li>
                  <li>Polygons are extruded into a .STL mesh</li>
                </ol>
              ) : (
                <ol className="text-xs text-foreground/50 space-y-1.5 list-decimal list-inside">
                  <li>Upload an MP4 video of your object</li>
                  <li>Frames are extracted at 2 FPS</li>
                  <li>AI generates a 3D model from frames</li>
                  <li>Download the .OBJ mesh file</li>
                </ol>
              )}
            </div>
          </motion.div>

          {/* Right Column: 3D Viewer */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-foreground/60">
                3D Preview
              </h2>
              {modelUrl && (
                <span
                  className={`status-badge ${
                    status === "done"
                      ? "success"
                      : status === "error"
                      ? "error"
                      : "processing"
                  }`}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        status === "done"
                          ? "#22c55e"
                          : status === "error"
                          ? "#ef4444"
                          : "#06b6d4",
                    }}
                  />
                  {status === "done" ? "Model loaded" : "Loading…"}
                </span>
              )}
            </div>

            <ModelViewer modelUrl={modelUrl} modelType={modelType} />

            <p className="text-xs text-foreground/30 text-center">
              Click & drag to rotate • Scroll to zoom • Right-click to pan
            </p>
          </motion.div>
        </div>

        {/* ─── Footer ─── */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 mb-6 text-center text-xs text-foreground/20"
        >
          Built with Next.js, FastAPI & React Three Fiber
        </motion.footer>
      </main>
    </>
  );
}
