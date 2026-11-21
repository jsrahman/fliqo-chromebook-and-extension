import os
from PIL import Image, ImageDraw, ImageFont

public_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
os.makedirs(public_dir, exist_ok=True)

# 1. Generate Favicon / App Icons (192, 512, 180)
def generate_icon(size, output_path):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Outer squircle
    radius = int(size * 0.22)
    draw.rounded_rectangle([0, 0, size, size], radius=radius, fill='#141416')
    
    # Border
    draw.rounded_rectangle([1, 1, size - 2, size - 2], radius=radius, outline='#2a2a2e', width=max(1, size // 64))
    
    # Flap cards (top & bottom)
    margin_x = int(size * 0.12)
    margin_y = int(size * 0.14)
    card_w = size - 2 * margin_x
    card_h = size - 2 * margin_y
    mid_y = size // 2
    
    card_radius = int(size * 0.08)
    
    # Top flap
    draw.rounded_rectangle([margin_x, margin_y, margin_x + card_w, mid_y - int(size * 0.015)], radius=card_radius, fill='#202024')
    # Bottom flap
    draw.rounded_rectangle([margin_x, mid_y + int(size * 0.015), margin_x + card_w, margin_y + card_h], radius=card_radius, fill='#1b1b1e')
    
    # Center split divider line
    div_h = max(2, int(size * 0.025))
    draw.rectangle([margin_x - 2, mid_y - div_h // 2, margin_x + card_w + 2, mid_y + div_h // 2], fill='#0d0d0f')
    
    # Hinge side notches
    hinge_r = max(2, int(size * 0.04))
    draw.ellipse([margin_x - hinge_r, mid_y - hinge_r, margin_x + hinge_r, mid_y + hinge_r], fill='#0d0d0f')
    draw.ellipse([margin_x + card_w - hinge_r, mid_y - hinge_r, margin_x + card_w + hinge_r, mid_y + hinge_r], fill='#0d0d0f')
    
    # Draw clock digits '12'
    # Try system font or draw high-contrast numeral
    font_size = int(size * 0.46)
    font = None
    font_candidates = [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/Library/Fonts/Arial.ttf"
    ]
    for fc in font_candidates:
        if os.path.exists(fc):
            try:
                font = ImageFont.truetype(fc, font_size)
                break
            except Exception:
                continue
    if not font:
        font = ImageFont.load_default()
    
    text = "12"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    tx = (size - text_w) // 2 - bbox[0]
    ty = (size - text_h) // 2 - bbox[1] - int(size * 0.02)
    
    # White digit
    draw.text((tx, ty), text, font=font, fill='#f4f4f4')
    
    # Redraw center seam through digit for authentic split flap look
    draw.rectangle([margin_x, mid_y - div_h // 2, margin_x + card_w, mid_y + div_h // 2], fill='#0d0d0f')

    img.save(output_path, 'PNG')
    print(f"✓ Generated {output_path}")

generate_icon(192, os.path.join(public_dir, 'icon-192.png'))
generate_icon(512, os.path.join(public_dir, 'icon-512.png'))
generate_icon(180, os.path.join(public_dir, 'apple-touch-icon.png'))

# 2. Generate 1200x630 Open Graph Banner (og-image.png)
def generate_og_image(output_path):
    W, H = 1200, 630
    img = Image.new('RGB', (W, H), '#0b0b0d')
    draw = ImageDraw.Draw(img)
    
    # Subtle ambient gradient / grid backdrop
    for y in range(H):
        factor = (y / H) * 0.08
        r = int(11 + 6 * factor)
        g = int(11 + 6 * factor)
        b = int(13 + 12 * factor)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
        
    # Fonts
    font_bold = None
    font_med = None
    font_small = None
    font_large_digit = None
    font_candidates = [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf"
    ]
    for fc in font_candidates:
        if os.path.exists(fc):
            try:
                font_large_digit = ImageFont.truetype(fc, 160)
                font_bold = ImageFont.truetype(fc, 44)
                font_med = ImageFont.truetype(fc, 24)
                font_small = ImageFont.truetype(fc, 16)
                break
            except Exception:
                continue
    if not font_large_digit:
        font_large_digit = ImageFont.load_default()
        font_bold = ImageFont.load_default()
        font_med = ImageFont.load_default()
        font_small = ImageFont.load_default()
        
    # Top Tagline Badge
    badge_bg = '#1f242d'
    badge_border = '#354052'
    draw.rounded_rectangle([60, 48, 380, 84], radius=18, fill=badge_bg, outline=badge_border, width=1)
    draw.text((80, 56), "CHROME OS & WEB SCREENSAVER", font=font_small, fill='#38bdf8')
    
    # Main Title
    draw.text((60, 102), "FLIQLO WEB", font=font_bold, fill='#ffffff')
    
    # Subtitle / Value Proposition
    draw.text((60, 160), "The Iconic Split-Flap Flip Clock in Your Web Browser", font=font_med, fill='#a3a3a8')
    draw.text((60, 194), "Solves the Chrome OS screensaver problem • 100% Free & Offline", font=font_small, fill='#71717a')
    
    # Flip cards visualization (Hours '10' : Minutes '42')
    card_w, card_h = 240, 270
    card_y = 250
    card_radius = 20
    
    cards = [
        (60, "10", "HOURS", True),
        (320, "42", "MINUTES", False),
        (580, "58", "SECONDS", False)
    ]
    
    for cx, digit, label, is_hour in cards:
        # Card shadow
        draw.rounded_rectangle([cx + 6, card_y + 8, cx + card_w + 6, card_y + card_h + 8], radius=card_radius, fill='#050506')
        
        # Outer flap container
        draw.rounded_rectangle([cx, card_y, cx + card_w, card_y + card_h], radius=card_radius, fill='#1b1b1e', outline='#2a2a30', width=1)
        
        mid_card_y = card_y + card_h // 2
        
        # Upper flap
        draw.rounded_rectangle([cx, card_y, cx + card_w, mid_card_y - 2], radius=card_radius, fill='#222227')
        
        # Digits
        dbbox = draw.textbbox((0, 0), digit, font=font_large_digit)
        dw = dbbox[2] - dbbox[0]
        dh = dbbox[3] - dbbox[1]
        dtx = cx + (card_w - dw) // 2 - dbbox[0]
        dty = card_y + (card_h - dh) // 2 - dbbox[1] - 8
        
        digit_color = '#ffffff' if digit != "58" else '#fbbf24'
        draw.text((dtx, dty), digit, font=font_large_digit, fill=digit_color)
        
        # Center split seam
        draw.rectangle([cx - 2, mid_card_y - 3, cx + card_w + 2, mid_card_y + 3], fill='#0d0d10')
        
        # Side hinges
        draw.ellipse([cx - 6, mid_card_y - 6, cx + 6, mid_card_y + 6], fill='#0a0a0c')
        draw.ellipse([cx + card_w - 6, mid_card_y - 6, cx + card_w + 6, mid_card_y + 6], fill='#0a0a0c')
        
        # AM badge on hour card
        if is_hour:
            draw.rounded_rectangle([cx + 18, card_y + 20, cx + 64, card_y + 44], radius=6, fill='#121215')
            draw.text((cx + 26, card_y + 24), "AM", font=font_small, fill='#d4d4d8')
            
        # Flap hinge reflection line
        draw.line([(cx + 12, mid_card_y + 4), (cx + card_w - 12, mid_card_y + 4)], fill='#2b2b32', width=1)

    # Right side feature badges
    fx = 860
    features = [
        ("✓ Chrome OS screensaver solved", "#10b981"),
        ("✓ 12h / 24h & flip seconds toggle", "#f4f4f5"),
        ("✓ OLED black & amber retro themes", "#f4f4f5"),
        ("✓ Authentic Solari mechanical click audio", "#f4f4f5"),
        ("✓ Fullscreen mode (F key shortcut)", "#f4f4f5"),
        ("✓ Chrome Screensaver Extension included", "#38bdf8"),
        ("✓ Works offline • Zero ads & trackers", "#10b981")
    ]
    
    fy = 248
    draw.text((fx, fy - 36), "KEY HIGHLIGHTS", font=font_small, fill='#71717a')
    for text, color in features:
        draw.rounded_rectangle([fx, fy, fx + 280, fy + 38], radius=8, fill='#141418', outline='#25252b', width=1)
        draw.text((fx + 12, fy + 10), text, font=font_small, fill=color)
        fy += 46

    # Bottom watermark bar
    draw.line([(0, 560), (W, 560)], fill='#18181c', width=1)
    draw.text((60, 582), "fliqlo.okjainfo.com  •  github.com/jsrahman/fliqo-chromebook-and-extension", font=font_small, fill='#52525b')
    draw.text((930, 582), "PRESS [F] FOR FULLSCREEN", font=font_small, fill='#38bdf8')

    img.save(output_path, 'PNG')
    print(f"✓ Generated {output_path}")

generate_og_image(os.path.join(public_dir, 'og-image.png'))
