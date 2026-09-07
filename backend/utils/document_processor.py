import os
import io
import re
import zlib
import base64
from typing import Dict, Any, Optional, Tuple
from backend.utils.logger import logger

try:
    from PIL import Image, ExifTags
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

class DocumentProcessor:
    """
    Multimodal Document & Image Ingestion Engine for ORCA.
    Extracts text, metadata, coordinates, and prepares multimodal payloads for:
    - Images: PNG, JPEG, WEBP, BMP (extracts dimensions, GPS EXIF tags, color metrics)
    - PDFs: Nautical charts, INCOIS bulletins, notices to mariners, shipping manifests
    - Word Docs: .docx vessel logs and inspection reports
    - Text/Data: .txt, .csv, .json
    """

    def process_attachment(
        self,
        base64_data: str,
        filename: str,
        mime_type: Optional[str] = None,
        content_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Parses a base64-encoded attachment and returns structured analysis.
        """
        # Strip potential data URL prefix (e.g. data:image/png;base64,...)
        clean_b64 = base64_data
        detected_mime = mime_type or content_type or "application/octet-stream"
        if "," in base64_data:
            header, clean_b64 = base64_data.split(",", 1)
            if "data:" in header and ";base64" in header:
                detected_mime = header.replace("data:", "").replace(";base64", "").strip()

        try:
            raw_bytes = base64.b64decode(clean_b64)
        except Exception as e:
            logger.error(f"Error decoding base64 attachment '{filename}': {e}")
            return {
                "success": False,
                "error": f"Invalid base64 payload: {str(e)}",
                "filename": filename
            }

        size_kb = round(len(raw_bytes) / 1024, 2)
        ext = os.path.splitext(filename)[1].lower()

        # 1. Image Processing
        if detected_mime.startswith("image/") or ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp"]:
            return self._process_image(raw_bytes, clean_b64, filename, detected_mime, size_kb)

        # 2. PDF Processing
        if detected_mime == "application/pdf" or ext == ".pdf":
            return self._process_pdf(raw_bytes, filename, size_kb)

        # 3. Word Document Processing
        if ext in [".docx", ".doc"] or "word" in detected_mime:
            return self._process_docx(raw_bytes, filename, size_kb)

        # 4. Plaintext / CSV / JSON
        if detected_mime.startswith("text/") or ext in [".txt", ".csv", ".json", ".log", ".md"]:
            return self._process_text(raw_bytes, filename, size_kb)

        # Generic fallback
        return {
            "success": True,
            "category": "document",
            "file_type": ext.replace(".", "").upper() or "BINARY",
            "filename": filename,
            "size_kb": size_kb,
            "extracted_text": f"Uploaded marine file: {filename} ({size_kb} KB).",
            "gemini_part": None
        }

    def _process_image(
        self,
        raw_bytes: bytes,
        b64_str: str,
        filename: str,
        mime_type: str,
        size_kb: float
    ) -> Dict[str, Any]:
        width = None
        height = None
        gps_coords = None
        img_format = "JPEG"

        if HAS_PIL:
            try:
                img = Image.open(io.BytesIO(raw_bytes))
                width, height = img.size
                img_format = img.format or "JPEG"

                # Extract EXIF GPS coordinates if present
                exif = img._getexif() if hasattr(img, "_getexif") else None
                if exif:
                    gps_info = {}
                    for tag_id, value in exif.items():
                        tag_name = ExifTags.TAGS.get(tag_id, tag_id)
                        if tag_name == "GPSInfo":
                            for gps_tag_id in value:
                                sub_name = ExifTags.GPSTAGS.get(gps_tag_id, gps_tag_id)
                                gps_info[sub_name] = value[gps_tag_id]
                    if gps_info and "GPSLatitude" in gps_info and "GPSLongitude" in gps_info:
                        gps_coords = self._convert_exif_gps_to_decimal(gps_info)
            except Exception as e:
                logger.warning(f"PIL could not parse image details for '{filename}': {e}")

        # Clean MIME type for Gemini
        gemini_mime = mime_type
        if gemini_mime == "application/octet-stream" or not gemini_mime.startswith("image/"):
            gemini_mime = f"image/{img_format.lower()}"
            if gemini_mime == "image/jpg":
                gemini_mime = "image/jpeg"

        desc = f"Uploaded marine visual asset: {filename} ({width}x{height}px, {size_kb} KB)."
        if gps_coords:
            desc += f" Embedded GPS location detected: {gps_coords['lat']:.4f}°N, {gps_coords['lon']:.4f}°E."

        return {
            "success": True,
            "category": "image",
            "file_type": img_format,
            "filename": filename,
            "size_kb": size_kb,
            "dimensions": {"width": width, "height": height} if width else None,
            "gps_coordinates": gps_coords,
            "extracted_text": desc,
            "gemini_part": {
                "inline_data": {
                    "mime_type": gemini_mime,
                    "data": b64_str
                }
            }
        }

    def _convert_exif_gps_to_decimal(self, gps_info: Dict[str, Any]) -> Optional[Dict[str, float]]:
        try:
            def dms_to_dec(dms, ref):
                d = float(dms[0])
                m = float(dms[1]) / 60.0
                s = float(dms[2]) / 3600.0
                dec = d + m + s
                if ref in ["S", "W"]:
                    dec = -dec
                return dec

            lat = dms_to_dec(gps_info["GPSLatitude"], gps_info.get("GPSLatitudeRef", "N"))
            lon = dms_to_dec(gps_info["GPSLongitude"], gps_info.get("GPSLongitudeRef", "E"))
            return {"lat": round(lat, 5), "lon": round(lon, 5)}
        except Exception:
            return None

    def _process_pdf(self, raw_bytes: bytes, filename: str, size_kb: float) -> Dict[str, Any]:
        """Pure-Python high-resilience PDF text and stream extractor."""
        text_chunks = []
        try:
            stream_pattern = re.compile(b'stream[\r\n]+(.*?)[\r\n]+endstream', re.DOTALL)
            for match in stream_pattern.finditer(raw_bytes):
                raw_stream = match.group(1)
                decompressed = None
                try:
                    decompressed = zlib.decompress(raw_stream)
                except Exception:
                    try:
                        decompressed = zlib.decompress(raw_stream, -15)
                    except Exception:
                        decompressed = raw_stream

                # Operators: (Text) Tj
                tj_matches = re.findall(rb'\((.*?)\)\s*Tj', decompressed)
                for tj in tj_matches:
                    try:
                        clean = tj.decode("utf-8", errors="ignore").strip()
                        if clean and len(clean) > 1:
                            text_chunks.append(clean)
                    except Exception:
                        pass

                # Operators: [(Text) 120 (More)] TJ
                array_matches = re.findall(rb'\[(.*?)\]\s*TJ', decompressed)
                for arr in array_matches:
                    sub_matches = re.findall(rb'\((.*?)\)', arr)
                    for sm in sub_matches:
                        try:
                            clean = sm.decode("utf-8", errors="ignore").strip()
                            if clean and len(clean) > 1:
                                text_chunks.append(clean)
                        except Exception:
                            pass
        except Exception as e:
            logger.warning(f"Error parsing PDF text streams in '{filename}': {e}")

        extracted = " ".join(text_chunks).strip()
        if not extracted or len(extracted) < 20:
            extracted = f"[PDF Document: {filename} ({size_kb} KB). Contains vector/raster nautical bulletin content.]"
        else:
            extracted = f"--- Document Content: {filename} ---\n" + extracted[:3000]

        return {
            "success": True,
            "category": "pdf",
            "file_type": "PDF",
            "filename": filename,
            "size_kb": size_kb,
            "extracted_text": extracted,
            "gemini_part": None
        }

    def _process_docx(self, raw_bytes: bytes, filename: str, size_kb: float) -> Dict[str, Any]:
        extracted_text = ""
        if HAS_DOCX:
            try:
                doc = docx.Document(io.BytesIO(raw_bytes))
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                tables_text = []
                for table in doc.tables:
                    for row in table.rows:
                        row_vals = [c.text.strip() for c in row.cells if c.text.strip()]
                        if row_vals:
                            tables_text.append(" | ".join(row_vals))
                all_content = paragraphs + tables_text
                extracted_text = "\n".join(all_content).strip()
            except Exception as e:
                logger.warning(f"python-docx error parsing '{filename}': {e}")

        if not extracted_text:
            extracted_text = f"[Word Document: {filename} ({size_kb} KB). Inspection/vessel record.]"
        else:
            extracted_text = f"--- Document Content: {filename} ---\n" + extracted_text[:3000]

        return {
            "success": True,
            "category": "docx",
            "file_type": "DOCX",
            "filename": filename,
            "size_kb": size_kb,
            "extracted_text": extracted_text,
            "gemini_part": None
        }

    def _process_text(self, raw_bytes: bytes, filename: str, size_kb: float) -> Dict[str, Any]:
        try:
            text = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = raw_bytes.decode("latin-1", errors="ignore")

        return {
            "success": True,
            "category": "text",
            "file_type": "TEXT",
            "filename": filename,
            "size_kb": size_kb,
            "extracted_text": f"--- File Content: {filename} ---\n" + text[:3000],
            "gemini_part": None
        }

document_processor = DocumentProcessor()
