"""The hours PDF, drawn with the app's own tokens: warm paper, ink text,
brick rule, Fraunces heading + Inter body when the TTFs are present
(api/assets/fonts/), Helvetica/Times otherwise. QR links to /verify/<code>."""

from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# the design tokens, mirrored (keep in sync with web/styles/tokens.css)
BG = HexColor("#F7F5F0")
SURFACE = HexColor("#FFFFFF")
INK = HexColor("#1C2321")
INK_MUTED = HexColor("#5B625F")
LINE = HexColor("#D9D5CC")
PRIMARY = HexColor("#1F4E5F")
ACCENT = HexColor("#B5542A")

_FONT_DIR = Path(__file__).resolve().parents[1] / "assets" / "fonts"
_registered: dict[str, str] = {}


def _font(kind: str) -> str:
    """kind: body | bold | display — registered TTF name or a builtin."""
    if not _registered:
        # variable TTFs render at their default instance (regular weight);
        # emphasis uses Helvetica-Bold so "bold" is genuinely bold
        candidates = {
            "body": ("Inter-var.ttf", "Helvetica"),
            "bold": ("__builtin__", "Helvetica-Bold"),
            "display": ("Fraunces-var.ttf", "Times-Bold"),
        }
        for key, (fname, fallback) in candidates.items():
            path = _FONT_DIR / fname
            name = fname.removesuffix(".ttf")
            try:
                pdfmetrics.registerFont(TTFont(name, str(path)))
                _registered[key] = name
            except Exception:  # noqa: BLE001 — missing font file → builtin
                _registered[key] = fallback
    return _registered[kind]


def build_hours_pdf(
    *,
    student_name: str,
    school: str,
    entries: list[dict],
    total: float,
    code: str,
    verify_url: str,
    generated: str,
) -> bytes:
    import io

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter
    margin = 0.9 * inch

    # warm paper ground
    c.setFillColor(BG)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    y = height - margin

    # heading + brick rule (the app's signature accent)
    c.setFillColor(INK)
    c.setFont(_font("display"), 22)
    c.drawString(margin, y, "Verified service hours")
    y -= 10
    c.setStrokeColor(ACCENT)
    c.setLineWidth(2)
    c.line(margin, y, margin + 2.2 * inch, y)
    y -= 26

    c.setFont(_font("body"), 10.5)
    c.setFillColor(INK_MUTED)
    tagline = "VetServe Katy — veterans and student volunteers in Fort Bend County, Texas"
    c.drawString(margin, y, tagline)
    y -= 30

    # student block
    c.setFillColor(INK)
    c.setFont(_font("bold"), 12)
    c.drawString(margin, y, student_name)
    c.setFont(_font("body"), 11)
    c.setFillColor(INK_MUTED)
    c.drawString(margin + 3.2 * inch, y, f"School: {school}")
    y -= 16
    c.drawString(margin, y, f"Generated {generated}")
    y -= 28

    # table header
    col_task = margin
    col_date = width - margin - 2.6 * inch
    col_hours = width - margin - 0.7 * inch
    c.setFont(_font("bold"), 10)
    c.setFillColor(INK_MUTED)
    c.drawString(col_task, y, "TASK")
    c.drawString(col_date, y, "DATE CONFIRMED")
    c.drawRightString(col_hours + 0.7 * inch, y, "HOURS")
    y -= 6
    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.line(margin, y, width - margin, y)
    y -= 16

    c.setFont(_font("body"), 11)
    for e in entries:
        if y < 2.4 * inch:  # new page
            c.showPage()
            c.setFillColor(BG)
            c.rect(0, 0, width, height, stroke=0, fill=1)
            y = height - margin
            c.setFont(_font("body"), 11)
        c.setFillColor(INK)
        task = e["task"] if len(e["task"]) <= 58 else e["task"][:55] + "…"
        c.drawString(col_task, y, task)
        c.drawString(col_date, y, e["date"])
        c.drawRightString(col_hours + 0.7 * inch, y, f"{e['hours']:.1f}")
        y -= 15
        c.setStrokeColor(LINE)
        c.setLineWidth(0.5)
        c.line(margin, y + 4, width - margin, y + 4)

    y -= 14
    c.setFont(_font("display"), 16)
    c.setFillColor(INK)
    c.drawRightString(col_hours + 0.7 * inch, y, f"{total:.1f}")
    c.setFont(_font("bold"), 11)
    c.drawString(col_task, y, "Total confirmed hours")
    y -= 40

    # verification block: code + QR on a white card
    card_h = 1.35 * inch
    c.setFillColor(SURFACE)
    c.setStrokeColor(LINE)
    c.roundRect(margin, y - card_h, width - 2 * margin, card_h, 8, stroke=1, fill=1)

    qr = QrCodeWidget(verify_url)
    qr.barWidth = qr.barHeight = 1.05 * inch
    d = Drawing(qr.barWidth, qr.barHeight)
    d.add(qr)
    renderPDF.draw(d, c, width - margin - 1.25 * inch, y - card_h + 0.15 * inch)

    tx = margin + 0.25 * inch
    ty = y - 0.42 * inch
    c.setFillColor(INK_MUTED)
    c.setFont(_font("body"), 10)
    c.drawString(tx, ty, "Verification code — check it at")
    c.setFillColor(PRIMARY)
    c.drawString(tx, ty - 14, verify_url)
    c.setFillColor(ACCENT)
    c.setFont(_font("bold"), 15)
    c.drawString(tx, ty - 38, code)

    # footer (wrapped by hand; drawString does not wrap)
    c.setFillColor(INK_MUTED)
    c.setFont(_font("body"), 8.5)
    c.drawString(
        margin,
        0.68 * inch,
        "Every line above was confirmed by the veteran who received the help.",
    )
    c.drawString(
        margin,
        0.53 * inch,
        "VetServe Katy is a student-built community project, not a government service.",
    )

    c.save()
    return buf.getvalue()
