# Antigravity3D — Implementation Plan

Build a full-stack web app that converts 2D images and multi-angle videos into 3D meshes (.stl/.obj).

## Proposed Changes

### 1. Project Scaffolding

#### [NEW] `/server/` — FastAPI Backend
- `main.py` — FastAPI app entry point with CORS, upload endpoints
- `pipelines/image_to_3d.py` — Mode 1: OpenCV → Shapely → Trimesh extrusion
- `pipelines/video_to_3d.py` — Mode 2: FFmpeg extraction + AI stub
- `requirements.txt` — Python dependencies
- `outputs/` — Directory for generated mesh files

#### [NEW] `/client/` — Next.js Frontend
- Scaffolded via `npx create-next-app@latest`
- Tailwind CSS enabled (user requested)
- React Three Fiber for the 3D viewer

---

### 2. Backend — FastAPI (`/server/`)

#### [NEW] [main.py](file:///C:/Users/DELL/.gemini/antigravity/scratch/server/main.py)
- `POST /api/upload/image` — Accepts PNG/JPG, runs Mode 1 pipeline, returns `.stl`
- `POST /api/upload/video` — Accepts MP4, runs Mode 2 pipeline, returns `.stl`/`.obj`
- `GET /api/download/{filename}` — Serves generated mesh files
- CORS middleware allowing `localhost:3000`

#### [NEW] [image_to_3d.py](file:///C:/Users/DELL/.gemini/antigravity/scratch/server/pipelines/image_to_3d.py)
1. Read image → grayscale → binary threshold (OpenCV)
2. Find contours → filter small noise
3. Convert contours to Shapely polygons (with holes)
4. Extrude polygon into 3D mesh using `trimesh.creation.extrude_polygon()`
5. Export as `.stl`

#### [NEW] [video_to_3d.py](file:///C:/Users/DELL/.gemini/antigravity/scratch/server/pipelines/video_to_3d.py)
1. Extract frames at 2 FPS using `ffmpeg-python`
2. Call stub `generate_3d_from_frames(frame_dir)` → returns a placeholder cube mesh
3. Detailed comments for future TripoSR/NeRF integration

#### [NEW] [requirements.txt](file:///C:/Users/DELL/.gemini/antigravity/scratch/server/requirements.txt)
```
fastapi
uvicorn[standard]
python-multipart
opencv-python-headless
trimesh
shapely
numpy
ffmpeg-python
```

---

### 3. Frontend — Next.js (`/client/`)

#### [NEW] [page.tsx](file:///C:/Users/DELL/.gemini/antigravity/scratch/client/src/app/page.tsx)
- Hero section with mode selector (Image / Video)
- Drag-and-drop zone (`react-dropzone`)
- Loading spinner during backend processing
- 3D viewer (React Three Fiber / `@react-three/drei`)
- Download button

Key npm packages: `@react-three/fiber`, `@react-three/drei`, `three`, `react-dropzone`

#### Design
- Dark mode with deep blue/purple gradients
- Glassmorphism cards
- Smooth micro-animations (framer-motion fade-ins)
- Google Font: Inter

---

## Verification Plan

### Automated / Agent-Driven
1. **Backend smoke test**: Start uvicorn server, verify `GET /` returns 200
2. **Frontend render test**: Start Next.js dev server, navigate to `localhost:3000` with the browser agent, verify UI renders
3. **Screenshot capture**: Capture the final UI screenshot for user review

### Manual (User)
1. Upload a high-contrast PNG image and verify a `.stl` file is returned and renders in the viewer
2. Upload an MP4 video and verify the placeholder cube is returned and renders
3. Click the Download button to confirm the file downloads correctly

> [!NOTE]
> The video-to-3D pipeline uses a **stub function** that returns a placeholder cube. The comments indicate where to plug in TripoSR or a NeRF model later.
