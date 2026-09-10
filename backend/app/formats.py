"""Format detection combining file extension with content-sniffing, per
design.md's decision to reject a mislabeled file (matching extension only)
just as readily as an outright unsupported one."""

import io
import zipfile

SUPPORTED_FORMATS = {"pdf", "docx", "pptx", "txt"}

_PDF_MAGIC = b"%PDF-"
_ZIP_MAGIC = b"PK\x03\x04"


def _sniff_zip_subtype(content: bytes) -> str | None:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            names = zf.namelist()
    except zipfile.BadZipFile:
        return None
    if any(name.startswith("word/") for name in names):
        return "docx"
    if any(name.startswith("ppt/") for name in names):
        return "pptx"
    return None


def _looks_like_text(content: bytes) -> bool:
    if b"\x00" in content:
        return False
    try:
        content.decode("utf-8")
    except UnicodeDecodeError:
        return False
    return True


def sniff_format(content: bytes) -> str | None:
    """Detect a supported format from content alone, independent of filename."""
    if content.startswith(_PDF_MAGIC):
        return "pdf"
    if content.startswith(_ZIP_MAGIC):
        return _sniff_zip_subtype(content)
    if _looks_like_text(content):
        return "txt"
    return None


def detect_format(filename: str, content: bytes) -> tuple[str | None, str | None]:
    """Returns (format, rejection_reason). format is None iff rejected."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in SUPPORTED_FORMATS:
        return None, (
            f"Unsupported file format: '.{ext or 'unknown'}'. "
            "Supported formats are PDF, DOCX, PPTX, TXT."
        )

    sniffed = sniff_format(content)
    if sniffed != ext:
        return None, (
            f"File content does not match its '.{ext}' extension "
            f"(detected as {sniffed or 'an unrecognized format'})."
        )
    return ext, None
