import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_poster():
    width, height = 800, 1200
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Sky & Meadow Gradient Background
    for y in range(height):
        t = y / height
        if t < 0.5:
            # Blue Sky
            r = int(79 + (0 - 79) * (t / 0.5))
            g = int(172 + (242 - 172) * (t / 0.5))
            b = int(254 + (254 - 254) * (t / 0.5))
        elif t < 0.7:
            # Transition to Bright Grass
            sub_t = (t - 0.5) / 0.2
            r = int(0 + (115 - 0) * sub_t)
            g = int(242 + (209 - 242) * sub_t)
            b = int(254 + (61 - 254) * sub_t)
        else:
            # Deep Earthy Grass Green
            sub_t = (t - 0.7) / 0.3
            r = int(115 + (35 - 115) * sub_t)
            g = int(209 + (120 - 209) * sub_t)
            b = int(61 + (4 - 61) * sub_t)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # Sunburst Rays
    sun_cx, sun_cy = 400, 360
    for angle in range(0, 360, 20):
        rad1 = math.radians(angle - 6)
        rad2 = math.radians(angle + 6)
        p1 = (sun_cx, sun_cy)
        p2 = (sun_cx + int(900 * math.cos(rad1)), sun_cy + int(900 * math.sin(rad1)))
        p3 = (sun_cx + int(900 * math.cos(rad2)), sun_cy + int(900 * math.sin(rad2)))
        draw.polygon([p1, p2, p3], fill=(255, 255, 255, 30))

    # Sun Glow Circle
    for r in range(250, 0, -5):
        alpha = int(35 * (1 - r / 250))
        draw.ellipse([sun_cx - r, sun_cy - r, sun_cx + r, sun_cy + r], fill=(255, 245, 150, alpha))

    # Decorative Fluffy Clouds
    def draw_cloud(cx, cy, scale=1.0):
        draw.ellipse([cx - 100 * scale, cy - 30 * scale, cx - 20 * scale, cy + 30 * scale], fill=(255, 255, 255, 230))
        draw.ellipse([cx - 40 * scale, cy - 60 * scale, cx + 50 * scale, cy + 30 * scale], fill=(255, 255, 255, 245))
        draw.ellipse([cx + 20 * scale, cy - 35 * scale, cx + 100 * scale, cy + 30 * scale], fill=(255, 255, 255, 230))

    draw_cloud(160, 240, scale=1.1)
    draw_cloud(640, 200, scale=1.2)

    # 2. Main Playfield Base (Mound & Burrows)
    draw.ellipse([50, 720, 750, 1020], fill=(56, 158, 13, 255))
    draw.ellipse([80, 740, 720, 1000], fill=(82, 196, 27, 255))

    # Draw Burrow Holes
    def draw_hole(cx, cy, rx=110, ry=42):
        draw.ellipse([cx - rx - 10, cy - ry - 6, cx + rx + 10, cy + ry + 12], fill=(67, 43, 22, 255))
        draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(140, 83, 43, 255))
        draw.ellipse([cx - rx * 0.8, cy - ry * 0.7, cx + rx * 0.8, cy + ry * 0.7], fill=(28, 13, 5, 255))

    draw_hole(400, 940, rx=130, ry=50) # Center
    draw_hole(200, 800, rx=105, ry=38) # Left
    draw_hole(600, 800, rx=105, ry=38) # Right

    # 3. Draw Characters
    # A. Golden Bunny (Left Hole)
    bx, by = 200, 740
    # Ears
    draw.ellipse([bx - 45, by - 120, bx - 10, by - 30], fill=(255, 197, 61, 255))
    draw.ellipse([bx - 38, by - 110, bx - 18, by - 40], fill=(255, 173, 210, 255))
    draw.ellipse([bx + 10, by - 120, bx + 45, by - 30], fill=(255, 197, 61, 255))
    draw.ellipse([bx + 18, by - 110, bx + 38, by - 40], fill=(255, 173, 210, 255))
    # Head
    draw.ellipse([bx - 60, by - 65, bx + 60, by + 45], fill=(255, 197, 61, 255))
    # Cheeks & Eyes
    draw.ellipse([bx - 45, by - 10, bx - 15, by + 18], fill=(255, 120, 117, 180))
    draw.ellipse([bx + 15, by - 10, bx + 45, by + 18], fill=(255, 120, 117, 180))
    draw.ellipse([bx - 30, by - 25, bx - 10, by - 5], fill=(31, 31, 31, 255))
    draw.ellipse([bx + 10, by - 25, bx + 30, by - 5], fill=(31, 31, 31, 255))
    draw.ellipse([bx - 26, by - 23, bx - 18, by - 15], fill=(255, 255, 255, 255))
    draw.ellipse([bx + 14, by - 23, bx + 22, by - 15], fill=(255, 255, 255, 255))
    # Nose
    draw.polygon([(bx, by + 2), (bx - 7, by - 6), (bx + 7, by - 6)], fill=(255, 133, 192, 255))

    # B. Cheeky Raccoon (Right Hole)
    rx, ry = 600, 740
    # Ears
    draw.polygon([(rx - 55, ry - 30), (rx - 75, ry - 75), (rx - 20, ry - 50)], fill=(67, 67, 67, 255))
    draw.polygon([(rx - 48, ry - 35), (rx - 65, ry - 68), (rx - 25, ry - 50)], fill=(255, 173, 210, 255))
    draw.polygon([(rx + 55, ry - 30), (rx + 75, ry - 75), (rx + 20, ry - 50)], fill=(67, 67, 67, 255))
    draw.polygon([(rx + 48, ry - 35), (rx + 65, ry - 68), (rx + 25, ry - 50)], fill=(255, 173, 210, 255))
    # Head
    draw.ellipse([rx - 60, ry - 65, rx + 60, ry + 45], fill=(166, 166, 166, 255))
    # Bandit Mask
    draw.ellipse([rx - 52, ry - 25, rx + 52, ry + 15], fill=(38, 38, 38, 255))
    # Eyes
    draw.ellipse([rx - 32, ry - 18, rx - 12, ry + 2], fill=(255, 77, 79, 255))
    draw.ellipse([rx + 12, ry - 18, rx + 32, ry + 2], fill=(255, 77, 79, 255))
    draw.ellipse([rx - 25, ry - 14, rx - 18, ry - 7], fill=(255, 255, 255, 255))
    draw.ellipse([rx + 18, ry - 14, rx + 25, ry - 7], fill=(255, 255, 255, 255))
    # Nose
    draw.ellipse([rx - 9, ry + 12, rx + 9, ry + 24], fill=(0, 0, 0, 255))

    # C. Crown Golden Hamster (Center Hole)
    hx, hy = 400, 870
    # Ears
    draw.ellipse([hx - 75, hy - 80, hx - 30, hy - 35], fill=(250, 140, 22, 255))
    draw.ellipse([hx - 65, hy - 72, hx - 40, hy - 47], fill=(255, 173, 210, 255))
    draw.ellipse([hx + 30, hy - 80, hx + 75, hy - 35], fill=(250, 140, 22, 255))
    draw.ellipse([hx + 40, hy - 72, hx + 65, hy - 47], fill=(255, 173, 210, 255))
    # Head
    draw.ellipse([hx - 80, hy - 70, hx + 80, hy + 65], fill=(250, 140, 22, 255))
    # Muzzle & Cheeks
    draw.ellipse([hx - 55, hy - 5, hx + 55, hy + 50], fill=(255, 255, 255, 255))
    draw.ellipse([hx - 62, hy - 5, hx - 26, hy + 30], fill=(255, 120, 117, 180))
    draw.ellipse([hx + 26, hy - 5, hx + 62, hy + 30], fill=(255, 120, 117, 180))
    # Eyes
    draw.ellipse([hx - 38, hy - 30, hx - 14, hy - 6], fill=(31, 31, 31, 255))
    draw.ellipse([hx + 14, hy - 30, hx + 38, hy - 6], fill=(31, 31, 31, 255))
    draw.ellipse([hx - 33, hy - 26, hx - 23, hy - 16], fill=(255, 255, 255, 255))
    draw.ellipse([hx + 19, hy - 26, hx + 29, hy - 16], fill=(255, 255, 255, 255))
    # Nose & Mouth
    draw.ellipse([hx - 10, hy + 4, hx + 10, hy + 16], fill=(255, 133, 192, 255))

    # 4. Minimal Text & Header Badges
    # Top Tagline Badge
    draw.rounded_rectangle([180, 90, 620, 160], radius=35, fill=(255, 255, 255, 235), outline=(255, 255, 255, 255), width=4)

    try:
        font_large = ImageFont.truetype("arial.ttf", 86)
        font_sub = ImageFont.truetype("arial.ttf", 36)
        font_small = ImageFont.truetype("arial.ttf", 26)
    except Exception:
        font_large = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Subtitle
    draw.text((400, 122), "SUPER CUTE ARCADE", fill=(35, 120, 4), font=font_sub, anchor="mm")

    # 3D Title "WHACK IT!"
    title_text = "WHACK IT!"
    tx, ty = 400, 260
    # Shadow layer
    for offset in range(12, 0, -1):
        draw.text((tx, ty + offset), title_text, fill=(180, 40, 10), font=font_large, anchor="mm")

    # Main text
    draw.text((tx, ty), title_text, fill=(255, 220, 60), font=font_large, anchor="mm")

    # Bottom Call to Action Badge
    draw.rounded_rectangle([200, 1100, 600, 1160], radius=30, fill=(255, 255, 255, 240), outline=(115, 209, 61), width=4)
    draw.text((400, 1130), "TAP • HAVE FUN • PLAY NOW 🚀", fill=(39, 128, 3), font=font_small, anchor="mm")

    # Save PNG
    output_path = "whack_it_poster.png"
    img.save(output_path, "PNG")
    print(f"Successfully generated {output_path}!")

if __name__ == "__main__":
    create_poster()
