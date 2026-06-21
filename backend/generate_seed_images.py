#!/usr/bin/env python3
"""
generate_seed_images.py
Generates simple SVG placeholder images for each issue type.
These are 100% original generated graphics - no copyright issues.
Saved to backend/uploads/ so they match the real upload path convention (/uploads/<filename>).
"""
import os

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

IMAGES = {
    # BEFORE images (one per issue type)
    "seed_pothole_before.jpg": {
        "bg": "#4a3728", "icon_color": "#c9a87c", "label": "POTHOLE",
        "sublabel": "Road Damage Reported", "icon_path": """
            <ellipse cx="200" cy="230" rx="110" ry="40" fill="#2a1f18" opacity="0.9"/>
            <ellipse cx="200" cy="225" rx="85" ry="28" fill="#1a1208"/>
            <path d="M120 200 Q160 170 200 185 Q240 170 280 200 Q270 230 200 238 Q130 230 120 200Z" fill="#382820"/>
            <circle cx="155" cy="195" r="8" fill="#1a1208"/>
            <circle cx="245" cy="193" r="6" fill="#1a1208"/>
            <path d="M90 260 Q150 250 200 255 Q250 250 310 260" stroke="#5a4535" stroke-width="3" fill="none" stroke-dasharray="8,4"/>
        """,
    },
    "seed_garbage_before.jpg": {
        "bg": "#2d3b2a", "icon_color": "#8bc34a", "label": "GARBAGE",
        "sublabel": "Waste Overflow Reported", "icon_path": """
            <rect x="150" y="210" width="100" height="70" rx="5" fill="#5d4037"/>
            <rect x="145" y="205" width="110" height="15" rx="3" fill="#4e342e"/>
            <path d="M155 210 Q175 190 200 195 Q225 190 245 210" fill="#6d4c41" stroke="#4e342e" stroke-width="2"/>
            <ellipse cx="200" cy="200" rx="50" ry="15" fill="#558b2f" opacity="0.8"/>
            <rect x="170" y="175" width="12" height="30" rx="2" fill="#795548"/>
            <path d="M140 280 Q160 265 200 270 Q240 265 260 280" fill="#4caf50" opacity="0.6"/>
            <circle cx="175" cy="260" r="10" fill="#33691e" opacity="0.7"/>
            <circle cx="225" cy="255" r="8" fill="#33691e" opacity="0.7"/>
        """,
    },
    "seed_waterlogging_before.jpg": {
        "bg": "#1a2a3a", "icon_color": "#4fc3f7", "label": "WATERLOGGING",
        "sublabel": "Flooding Reported", "icon_path": """
            <rect x="80" y="240" width="240" height="60" rx="2" fill="#0d47a1" opacity="0.7"/>
            <path d="M80 240 Q120 230 160 240 Q200 250 240 238 Q270 228 320 240" fill="#1565c0" opacity="0.8"/>
            <path d="M80 255 Q130 248 180 256 Q220 262 280 252 Q300 248 320 255" fill="#1976d2" opacity="0.5"/>
            <rect x="90" y="215" width="20" height="30" fill="#37474f"/>
            <rect x="290" y="210" width="20" height="35" fill="#37474f"/>
            <path d="M100 215 L100 180 L140 180" stroke="#546e7a" stroke-width="3" fill="none"/>
            <path d="M160 210 L165 190 L170 210 L175 190 L180 210" stroke="#4fc3f7" stroke-width="2" fill="none" opacity="0.8"/>
        """,
    },
    "seed_streetlight_before.jpg": {
        "bg": "#1c1c2e", "icon_color": "#ffd54f", "label": "STREETLIGHT",
        "sublabel": "Electrical Fault Reported", "icon_path": """
            <rect x="196" y="130" width="8" height="160" fill="#546e7a"/>
            <path d="M196 130 Q180 110 165 115 L165 125 Q180 120 196 140Z" fill="#546e7a"/>
            <circle cx="163" cy="120" r="18" fill="#37474f" stroke="#ffd54f" stroke-width="2"/>
            <circle cx="163" cy="120" r="12" fill="#ffa000" opacity="0.3"/>
            <line x1="163" y1="100" x2="163" y2="95" stroke="#ffd54f" stroke-width="2"/>
            <line x1="145" y1="108" x2="141" y2="104" stroke="#ffd54f" stroke-width="2"/>
            <line x1="181" y1="108" x2="185" y2="104" stroke="#ffd54f" stroke-width="2"/>
            <text x="135" y="175" font-family="monospace" font-size="14" fill="#ef5350">⚡ FAULT</text>
            <path d="M185 155 L215 155 L210 175 L215 175 L185 195 L190 175 L185 175Z" fill="#ffd54f" opacity="0.4"/>
        """,
    },
    "seed_drainage_before.jpg": {
        "bg": "#2c2416", "icon_color": "#a5d6a7", "label": "DRAINAGE",
        "sublabel": "Blocked Drain Reported", "icon_path": """
            <rect x="80" y="220" width="240" height="80" rx="3" fill="#3e2723"/>
            <rect x="140" y="210" width="120" height="20" rx="3" fill="#5d4037"/>
            <rect x="155" y="205" width="15" height="30" rx="1" fill="#4e342e"/>
            <rect x="175" y="205" width="15" height="30" rx="1" fill="#4e342e"/>
            <rect x="195" y="205" width="15" height="30" rx="1" fill="#4e342e"/>
            <rect x="215" y="205" width="15" height="30" rx="1" fill="#4e342e"/>
            <ellipse cx="200" cy="240" rx="30" ry="8" fill="#1b5e20" opacity="0.8"/>
            <path d="M170 248 Q185 238 200 242 Q215 238 230 248" stroke="#4caf50" stroke-width="3" fill="none"/>
            <text x="140" y="285" font-family="monospace" font-size="12" fill="#ef5350">CLOGGED</text>
        """,
    },
    "seed_other_before.jpg": {
        "bg": "#263238", "icon_color": "#e0e0e0", "label": "INFRASTRUCTURE",
        "sublabel": "Issue Reported", "icon_path": """
            <rect x="120" y="160" width="160" height="140" rx="5" fill="#37474f" opacity="0.6"/>
            <rect x="130" y="170" width="60" height="50" rx="3" fill="#455a64"/>
            <rect x="210" y="170" width="60" height="50" rx="3" fill="#455a64"/>
            <rect x="130" y="235" width="140" height="55" rx="3" fill="#455a64"/>
            <path d="M200 160 L200 140 Q200 120 210 110 L230 100" stroke="#e0e0e0" stroke-width="3" fill="none"/>
            <circle cx="232" cy="98" r="10" fill="#fdd835" opacity="0.7"/>
            <text x="155" y="280" font-family="monospace" font-size="11" fill="#ef5350">⚠ DAMAGE</text>
        """,
    },
    # AFTER images (resolved/in-progress)
    "seed_pothole_after.jpg": {
        "bg": "#1a3a2a", "icon_color": "#66bb6a", "label": "POTHOLE",
        "sublabel": "Road Repaired ✓", "icon_path": """
            <rect x="90" y="200" width="220" height="50" rx="3" fill="#2e7d32" opacity="0.5"/>
            <rect x="90" y="200" width="220" height="50" rx="3" fill="#388e3c" opacity="0.3"/>
            <path d="M100 225 Q160 215 200 220 Q240 215 300 225" stroke="#4caf50" stroke-width="4" fill="none"/>
            <text x="145" y="260" font-family="monospace" font-size="13" fill="#81c784">REPAIRED</text>
            <circle cx="200" cy="195" r="18" fill="#2e7d32"/>
            <path d="M190 195 L197 202 L212 188" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
        """,
    },
    "seed_garbage_after.jpg": {
        "bg": "#1a3a2a", "icon_color": "#66bb6a", "label": "GARBAGE",
        "sublabel": "Area Cleaned ✓", "icon_path": """
            <rect x="90" y="220" width="220" height="60" rx="3" fill="#1b5e20" opacity="0.3"/>
            <path d="M100 250 Q200 240 300 250" stroke="#4caf50" stroke-width="3" fill="none"/>
            <circle cx="200" cy="195" r="18" fill="#2e7d32"/>
            <path d="M190 195 L197 202 L212 188" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
            <text x="148" y="260" font-family="monospace" font-size="13" fill="#81c784">CLEARED</text>
        """,
    },
    "seed_waterlogging_after.jpg": {
        "bg": "#1a3a2a", "icon_color": "#66bb6a", "label": "WATERLOGGING",
        "sublabel": "Drain Cleared ✓", "icon_path": """
            <rect x="90" y="230" width="220" height="40" rx="3" fill="#0d47a1" opacity="0.2"/>
            <path d="M100 250 Q200 245 300 250" stroke="#42a5f5" stroke-width="2" fill="none" opacity="0.5"/>
            <circle cx="200" cy="195" r="18" fill="#2e7d32"/>
            <path d="M190 195 L197 202 L212 188" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
            <text x="148" y="270" font-family="monospace" font-size="13" fill="#81c784">DRAINED</text>
        """,
    },
    "seed_streetlight_after.jpg": {
        "bg": "#1a2a1a", "icon_color": "#ffd54f", "label": "STREETLIGHT",
        "sublabel": "Light Restored ✓", "icon_path": """
            <rect x="196" y="130" width="8" height="160" fill="#546e7a"/>
            <path d="M196 130 Q180 110 165 115 L165 125 Q180 120 196 140Z" fill="#546e7a"/>
            <circle cx="163" cy="120" r="18" fill="#f57f17"/>
            <circle cx="163" cy="120" r="10" fill="#ffd54f"/>
            <path d="M163 96 L163 90" stroke="#ffd54f" stroke-width="2.5"/>
            <path d="M146 104 L141 100" stroke="#ffd54f" stroke-width="2.5"/>
            <path d="M180 104 L185 100" stroke="#ffd54f" stroke-width="2.5"/>
            <circle cx="200" cy="175" r="14" fill="#2e7d32"/>
            <path d="M193 175 L199 181 L210 169" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        """,
    },
    "seed_drainage_after.jpg": {
        "bg": "#1a3a2a", "icon_color": "#66bb6a", "label": "DRAINAGE",
        "sublabel": "Drain Unblocked ✓", "icon_path": """
            <rect x="80" y="220" width="240" height="80" rx="3" fill="#1b5e20" opacity="0.3"/>
            <rect x="140" y="210" width="120" height="20" rx="3" fill="#33691e"/>
            <rect x="155" y="205" width="15" height="30" rx="1" fill="#2e7d32"/>
            <rect x="175" y="205" width="15" height="30" rx="1" fill="#2e7d32"/>
            <rect x="195" y="205" width="15" height="30" rx="1" fill="#2e7d32"/>
            <rect x="215" y="205" width="15" height="30" rx="1" fill="#2e7d32"/>
            <circle cx="200" cy="185" r="16" fill="#2e7d32"/>
            <path d="M192 185 L198 191 L210 179" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <text x="142" y="285" font-family="monospace" font-size="12" fill="#81c784">CLEARED</text>
        """,
    },
    "seed_other_after.jpg": {
        "bg": "#1a3a2a", "icon_color": "#66bb6a", "label": "INFRASTRUCTURE",
        "sublabel": "Issue Resolved ✓", "icon_path": """
            <rect x="120" y="180" width="160" height="100" rx="5" fill="#1b5e20" opacity="0.3"/>
            <circle cx="200" cy="195" r="22" fill="#2e7d32"/>
            <path d="M188 195 L196 203 L214 185" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
            <text x="145" y="270" font-family="monospace" font-size="12" fill="#81c784">RESOLVED</text>
        """,
    },
}

SVG_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{bg_light}"/>
      <stop offset="100%" stop-color="{bg}"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="400" height="300" fill="url(#bg)"/>
  <!-- Grid lines -->
  <g opacity="0.1" stroke="#ffffff" stroke-width="0.5">
    <line x1="0" y1="75" x2="400" y2="75"/>
    <line x1="0" y1="150" x2="400" y2="150"/>
    <line x1="0" y1="225" x2="400" y2="225"/>
    <line x1="100" y1="0" x2="100" y2="300"/>
    <line x1="200" y1="0" x2="200" y2="300"/>
    <line x1="300" y1="0" x2="300" y2="300"/>
  </g>
  <!-- Icon area -->
  {icon_path}
  <!-- Header bar -->
  <rect x="0" y="0" width="400" height="45" fill="#000000" opacity="0.5"/>
  <circle cx="22" cy="22" r="8" fill="{icon_color}"/>
  <text x="38" y="27" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="white">{label}</text>
  <!-- Footer bar -->
  <rect x="0" y="268" width="400" height="32" fill="#000000" opacity="0.6"/>
  <text x="12" y="288" font-family="Arial,sans-serif" font-size="11" fill="{icon_color}">{sublabel}</text>
  <text x="350" y="288" font-family="monospace" font-size="10" fill="#9e9e9e">BIS AI</text>
</svg>"""


def lighten(hex_color, amount=30):
    """Simple hex color lightener."""
    hex_color = hex_color.lstrip('#')
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    r = min(255, r + amount)
    g = min(255, g + amount)
    b = min(255, b + amount)
    return f"#{r:02x}{g:02x}{b:02x}"


def generate_images():
    print(f"Generating seed images into: {UPLOAD_DIR}")
    for filename, data in IMAGES.items():
        svg_content = SVG_TEMPLATE.format(
            bg=data["bg"],
            bg_light=lighten(data["bg"], 25),
            icon_color=data["icon_color"],
            label=data["label"],
            sublabel=data["sublabel"],
            icon_path=data["icon_path"],
        )
        # Save as .svg but name it .jpg so it matches convention
        # Browsers and the frontend img tag will still render SVG content
        # regardless of extension when served with correct content-type.
        # We name them .jpg so the image_path field looks identical to real uploads.
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(svg_content)
        print(f"  ✓ {filename}")
    print(f"\nAll {len(IMAGES)} seed images generated.")
    print("Source: 100% original programmatically-generated SVG graphics.")
    print("License: No copyright — generated from scratch, freely bundleable.")


if __name__ == "__main__":
    generate_images()
