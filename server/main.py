"""
Antigravity3D — FastAPI Backend
Endpoints:
  POST /api/upload/image  — Upload PNG/JPG, get 3D .stl mesh
  POST /api/upload/video  — Upload MP4, get 3D .obj mesh
  GET  /api/download/{filename} — Download generated mesh file
"""

import os
import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from pipelines.image_to_3d import image_to_3d
from pipelines.video_to_3d import video_to_3d

# Directories
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# FastAPI app
app = FastAPI(
    title="Antigravity3D API",
    description="Convert 2D images and videos into 3D meshes",
    version="1.0.0"
)

# CORS — allow Next.js dev server and Vercel cloud deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "ok", "message": "Antigravity3D API is running"}


@app.post("/api/upload/image")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload a PNG/JPG image and receive a 3D extruded .stl mesh.
    """
    # Validate file type
    if file.content_type not in ("image/png", "image/jpeg", "image/jpg"):
        raise HTTPException(status_code=400, detail="Only PNG and JPG images are accepted.")

    # Save uploaded file
    file_id = uuid.uuid4().hex[:8]
    ext = os.path.splitext(file.filename or "upload.png")[1]
    upload_path = str(UPLOAD_DIR / f"{file_id}{ext}")

    with open(upload_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Run image → 3D pipeline
    try:
        output_path = image_to_3d(upload_path, str(OUTPUT_DIR))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        # Clean up uploaded file
        if os.path.exists(upload_path):
            os.remove(upload_path)

    filename = os.path.basename(output_path)
    return {
        "status": "success",
        "filename": filename,
        "download_url": f"/api/download/{filename}"
    }


@app.post("/api/upload/video")
async def upload_video(file: UploadFile = File(...)):
    """
    Upload an MP4 video and receive a 3D .obj mesh.
    """
    if file.content_type not in ("video/mp4", "video/mpeg", "video/quicktime"):
        raise HTTPException(status_code=400, detail="Only MP4/MPEG video files are accepted.")

    # Save uploaded file
    file_id = uuid.uuid4().hex[:8]
    ext = os.path.splitext(file.filename or "upload.mp4")[1]
    upload_path = str(UPLOAD_DIR / f"{file_id}{ext}")

    with open(upload_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Run video → 3D pipeline
    try:
        output_path = video_to_3d(upload_path, str(OUTPUT_DIR))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        if os.path.exists(upload_path):
            os.remove(upload_path)

    filename = os.path.basename(output_path)
    return {
        "status": "success",
        "filename": filename,
        "download_url": f"/api/download/{filename}"
    }


@app.get("/api/download/{filename}")
async def download_file(filename: str):
    """
    Download a generated mesh file.
    """
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found.")

    # Determine media type
    ext = file_path.suffix.lower()
    media_types = {
        ".stl": "application/sla",
        ".obj": "text/plain",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type=media_type,
    )
