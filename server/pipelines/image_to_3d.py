"""
Mode 1: Image → 3D Mesh Pipeline
Converts a 2D image (PNG/JPG) into a 3D .stl mesh by:
  1. Grayscale + binary threshold (OpenCV)
  2. Contour detection + noise filtering
  3. Contour → Shapely polygon (with holes)
  4. Extrude polygon into 3D mesh (trimesh)
  5. Export as .stl
"""

import cv2
import numpy as np
from shapely.geometry import Polygon, MultiPolygon
from shapely.validation import make_valid
from shapely.ops import unary_union
import trimesh
import os
import uuid


def image_to_3d(image_path: str, output_dir: str, extrusion_height: float = 10.0) -> str:
    """
    Convert a 2D image to a 3D extruded STL mesh.

    Args:
        image_path: Path to the input PNG/JPG image.
        output_dir: Directory to save the output .stl file.
        extrusion_height: Height of the 3D extrusion in mm.

    Returns:
        Path to the generated .stl file.
    """
    # Step 1: Read image → grayscale → binary threshold
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    # Apply Gaussian blur to reduce noise before thresholding
    blurred = cv2.GaussianBlur(img, (5, 5), 0)

    # Otsu's thresholding for automatic level selection
    _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # findContours expects WHITE objects on a BLACK background.
    # If more than 50% of the image is white, the background is white, so we invert.
    white_ratio = np.sum(binary == 255) / binary.size
    if white_ratio > 0.5:
        binary = cv2.bitwise_not(binary)

    # Morphological operations to clean up the binary image
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)

    # Step 2: Ensure an artificial black border so touching shapes are closed
    binary = cv2.copyMakeBorder(binary, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    
    # Use RETR_CCOMP to get a 2-level hierarchy: level 1 is outer shells, level 2 is inner holes
    contours, hierarchy = cv2.findContours(binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

    if not contours or hierarchy is None:
        raise ValueError("No contours found in the image. Try a higher-contrast image.")

    hierarchy = hierarchy[0]
    img_area = binary.shape[0] * binary.shape[1]
    min_area = img_area * 0.0005
    max_area = img_area * 0.80  # Reject contours spanning > 80% (frames, whole backgrounds)

    # Step 3: Convert contours to Shapely polygons with proper holes
    polygons = []
    
    # First pass: map holes to their parents
    # Key: parent_index, Value: list of valid hole contours
    holes_map = {}
    for i, h in enumerate(hierarchy):
        parent_idx = h[3]
        if parent_idx != -1:  # It's a hole
            cnt = contours[i]
            if cv2.contourArea(cnt) > min_area:
                if parent_idx not in holes_map:
                    holes_map[parent_idx] = []
                holes_map[parent_idx].append(cnt)

    # Second pass: build polygons for outer boundaries
    for i, h in enumerate(hierarchy):
        parent_idx = h[3]
        if parent_idx == -1:  # It's an outer boundary
            cnt = contours[i]
            area = cv2.contourArea(cnt)
            
            # Skip noise and giant background borders
            if area < min_area or area > max_area:
                continue
                
            # Process shell
            shell_points = cnt.reshape(-1, 2).astype(float)
            shell_points[:, 1] = binary.shape[0] - shell_points[:, 1]  # flip Y
            shell_coords = list(map(tuple, shell_points))
            if shell_coords[0] != shell_coords[-1]:
                shell_coords.append(shell_coords[0])
                
            if len(shell_coords) < 4:
                continue

            # Process holes
            hole_polys = []
            if i in holes_map:
                for hole_cnt in holes_map[i]:
                    hole_points = hole_cnt.reshape(-1, 2).astype(float)
                    hole_points[:, 1] = binary.shape[0] - hole_points[:, 1]
                    hole_coords = list(map(tuple, hole_points))
                    if hole_coords[0] != hole_coords[-1]:
                        hole_coords.append(hole_coords[0])
                    if len(hole_coords) >= 4:
                        hole_polys.append(hole_coords)

            # Create Shapely Polygon
            try:
                poly = Polygon(shell_coords, hole_polys)
                if not poly.is_valid:
                    poly = make_valid(poly)
                if poly.is_valid and not poly.is_empty and poly.area > 0:
                    polygons.append(poly.simplify(tolerance=0.5, preserve_topology=True))
            except Exception:
                continue

    if not polygons:
        raise ValueError("Could not extract any valid shapes from the image.")

    # Step 4: Extrude each polygon independently into 3D meshes using trimesh
    meshes = []
    
    # Flatten GeometryCollection / MultiPolygons back to simple Polygons for trimesh
    def process_geom(geom):
        if isinstance(geom, MultiPolygon):
            for p in geom.geoms:
                process_geom(p)
        elif hasattr(geom, "geoms"): # GeometryCollection
            for p in geom.geoms:
                process_geom(p)
        elif isinstance(geom, Polygon):
            if geom.is_valid and not geom.is_empty and geom.area > 0:
                try:
                    # Provide an explicit engine requirement to catch missing dependencies early
                    mesh = trimesh.creation.extrude_polygon(geom, height=extrusion_height, engine='mapbox-earcut')
                    if mesh is not None and len(mesh.vertices) > 0:
                        meshes.append(mesh)
                except Exception:
                    # Retry without explicitly naming engine
                    try:
                        mesh = trimesh.creation.extrude_polygon(geom, height=extrusion_height)
                        if mesh is not None and len(mesh.vertices) > 0:
                            meshes.append(mesh)
                    except Exception:
                        pass
                        
    for p in polygons:
        process_geom(p)

    if not meshes:
        # Absolute last resort box
        box = trimesh.creation.box(extents=[10, 10, extrusion_height])
        meshes.append(box)

    # Combine all meshes
    if len(meshes) == 1:
        combined = meshes[0]
    else:
        combined = trimesh.util.concatenate(meshes)

    # Center the mesh at origin
    combined.vertices -= combined.centroid

    # Step 5: Export as .stl
    os.makedirs(output_dir, exist_ok=True)
    filename = f"mesh_{uuid.uuid4().hex[:8]}.stl"
    output_path = os.path.join(output_dir, filename)
    combined.export(output_path)

    return output_path
