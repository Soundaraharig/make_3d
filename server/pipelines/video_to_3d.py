"""
Mode 2: Video → 3D Mesh Pipeline (Stub)
Converts a video (MP4) into a 3D mesh by:
  1. Extracting frames at 2 FPS using ffmpeg-python
  2. Calling a stub function that returns a placeholder cube
  3. Future: plug in TripoSR, NeRF, or Gaussian Splatting for real reconstruction

NOTE: This is a placeholder pipeline. The `generate_3d_from_frames` function
currently returns a simple cube mesh. Replace this with a real 3D reconstruction
model (e.g., TripoSR, Instant-NGP, or 3D Gaussian Splatting) for production.
"""

import os
import uuid
import trimesh

# ffmpeg-python requires the actual ffmpeg binary on PATH.
# We force False to safely fallback to OpenCV which works purely in Python.
HAS_FFMPEG = False


def extract_frames(video_path: str, output_dir: str, fps: int = 2) -> str:
    """
    Extract frames from a video at the specified FPS.

    Args:
        video_path: Path to the input video file.
        output_dir: Directory to save extracted frames.
        fps: Frames per second to extract (default: 2).

    Returns:
        Path to the directory containing extracted frames.
    """
    frame_dir = os.path.join(output_dir, f"frames_{uuid.uuid4().hex[:8]}")
    os.makedirs(frame_dir, exist_ok=True)

    if HAS_FFMPEG:
        try:
            (
                ffmpeg
                .input(video_path)
                .filter('fps', fps=fps)
                .output(os.path.join(frame_dir, 'frame_%04d.png'))
                .overwrite_output()
                .run(quiet=True)
            )
        except ffmpeg.Error as e:
            raise RuntimeError(f"FFmpeg frame extraction failed: {e.stderr}")
    else:
        # Fallback: use OpenCV if ffmpeg-python is not available
        import cv2
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")

        video_fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_interval = max(1, int(video_fps / fps))
        frame_count = 0
        saved_count = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_count % frame_interval == 0:
                frame_path = os.path.join(frame_dir, f"frame_{saved_count:04d}.png")
                cv2.imwrite(frame_path, frame)
                saved_count += 1
            frame_count += 1

        cap.release()

    return frame_dir


def generate_3d_from_frames(frame_dir: str) -> trimesh.Trimesh:
    """
    Generate a 3D mesh from extracted video frames.

    STUB IMPLEMENTATION — returns a placeholder cube.

    TODO: Replace this with a real 3D reconstruction pipeline:
      - TripoSR (fast single-image 3D): https://github.com/VAST-AI-Research/TripoSR
      - Instant-NGP (Neural Radiance Fields): https://github.com/NVlabs/instant-ngp
      - 3D Gaussian Splatting: https://github.com/graphdeco-inria/gaussian-splatting
      - Multi-View Stereo (MVS) approaches like COLMAP

    The `frame_dir` contains PNG frames extracted at 2 FPS. A real pipeline would:
      1. Estimate camera poses from the frames (COLMAP / SuperGlue)
      2. Run 3D reconstruction (NeRF / Gaussian Splatting / MVS)
      3. Export the result as a mesh (.obj / .stl)

    Args:
        frame_dir: Directory containing extracted video frames.

    Returns:
        A trimesh.Trimesh object.
    """
    # Count frames to show the pipeline at least processed them
    frame_count = len([f for f in os.listdir(frame_dir) if f.endswith('.png')])
    print(f"[video_to_3d] Extracted {frame_count} frames from video")
    print(f"[video_to_3d] Using placeholder cube (replace with TripoSR/NeRF for real 3D)")

    # Return a placeholder cube mesh
    mesh = trimesh.creation.box(extents=[20, 20, 20])
    return mesh


def video_to_3d(video_path: str, output_dir: str) -> str:
    """
    Convert a video to a 3D mesh file.

    Args:
        video_path: Path to the input MP4 video.
        output_dir: Directory to save the output mesh.

    Returns:
        Path to the generated .obj file.
    """
    os.makedirs(output_dir, exist_ok=True)

    # Step 1: Extract frames
    frame_dir = extract_frames(video_path, output_dir, fps=2)

    # Step 2: Generate 3D mesh from frames (stub)
    mesh = generate_3d_from_frames(frame_dir)

    # Step 3: Export as .obj
    filename = f"mesh_{uuid.uuid4().hex[:8]}.obj"
    output_path = os.path.join(output_dir, filename)
    mesh.export(output_path)

    return output_path
