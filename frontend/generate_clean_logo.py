import os
from PIL import Image, ImageDraw, ImageFont

def generate_logo():
    # Dimensions for a high-resolution wide logo
    width, height = 1200, 360
    
    # Create transparent image
    image = Image.new("RGBA", (width, height), (255, 255, 255, 0))
    draw = ImageDraw.Draw(image)
    
    # Try loading Arial Bold from Windows Fonts directory
    font_paths = [
        "C:\\Windows\\Fonts\\arialbd.ttf",
        "C:\\Windows\\Fonts\\segoeuib.ttf",
        "C:\\Windows\\Fonts\\tahomabd.ttf",
        "arialbd.ttf"
    ]
    
    font = None
    for path in font_paths:
        try:
            # We want it big and crisp
            font = ImageFont.truetype(path, 195)
            print(f"Loaded font from {path}")
            break
        except Exception:
            continue
            
    if not font:
        font = ImageFont.load_default()
        print("Using default font")
        
    # Draw text: "Lead" in dark gray/black, "Sanity" in vibrant corporate blue
    # Let's measure size
    text_lead = "Lead"
    text_space = " "
    text_sanity = "Sanity"
    
    # Get bounding boxes for sizing
    bbox_lead = draw.textbbox((0, 0), text_lead, font=font)
    w_lead = bbox_lead[2] - bbox_lead[0]
    
    bbox_space = draw.textbbox((0, 0), text_space, font=font)
    w_space = bbox_space[2] - bbox_space[0]
    
    bbox_sanity = draw.textbbox((0, 0), text_sanity, font=font)
    w_sanity = bbox_sanity[2] - bbox_sanity[0]
    
    total_width = w_lead + w_space + w_sanity
    # Vertically center
    h_text = bbox_lead[3] - bbox_lead[1]
    
    x_start = (width - total_width) // 2
    y_start = (height - h_text) // 2 - 20 # minor offset for optical centering
    
    # Colors
    color_lead = (9, 9, 11, 255) # Deep slate-black
    color_sanity = (13, 110, 253, 255) # Vibrant royal corporate blue (#0d6efd)
    
    # Draw "Lead"
    draw.text((x_start, y_start), text_lead, font=font, fill=color_lead)
    
    # Draw "Sanity"
    draw.text((x_start + w_lead + w_space, y_start), text_sanity, font=font, fill=color_sanity)
    
    # Crop to content to remove excessive padding
    bbox = image.getbbox()
    if bbox:
        # Add a tiny padding margin around text for safety
        pad = 20
        bbox_padded = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(width, bbox[2] + pad),
            min(height, bbox[3] + pad)
        )
        cropped_image = image.crop(bbox_padded)
        print("Cropped logo to text bounding box.")
    else:
        cropped_image = image
        
    # Save as high-res PNG to frontend/public
    output_dir = r"d:\Projects\Deepan- Data Cleaning pipeline\zoominfo-lead-cleaner\frontend\public"
    os.makedirs(output_dir, exist_ok=True)
    
    logo_path = os.path.join(output_dir, "logo.png")
    cropped_image.save(logo_path, "PNG")
    print(f"Saved pristine transparent logo to {logo_path}")
    
    # Also save as favicon (cropped square)
    fav_size = 512
    favicon = Image.new("RGBA", (fav_size, fav_size), (255, 255, 255, 0))
    fav_draw = ImageDraw.Draw(favicon)
    
    # Draw an emblem for the favicon, e.g. "LS" or a clean circle with "LS"
    # Let's load the font for "LS"
    ls_font = None
    for path in font_paths:
        try:
            ls_font = ImageFont.truetype(path, 260)
            break
        except Exception:
            continue
            
    if not ls_font:
        ls_font = ImageFont.load_default()
        
    # Let's draw "L" in dark, "S" in blue
    w_l = fav_draw.textbbox((0, 0), "L", font=ls_font)[2]
    w_s = fav_draw.textbbox((0, 0), "S", font=ls_font)[2]
    total_w_ls = w_l + w_s
    h_ls = fav_draw.textbbox((0, 0), "L", font=ls_font)[3]
    
    x_ls = (fav_size - total_w_ls) // 2
    y_ls = (fav_size - h_ls) // 2 - 20
    
    # Background circular soft emblem for high-end look
    fav_draw.arc((10, 10, fav_size - 10, fav_size - 10), start=0, end=360, fill=(13, 110, 253, 60), width=18)
    
    fav_draw.text((x_ls, y_ls), "L", font=ls_font, fill=color_lead)
    fav_draw.text((x_ls + w_l - 10, y_ls), "S", font=ls_font, fill=color_sanity)
    
    favicon_path = os.path.join(output_dir, "favicon.png")
    favicon.save(favicon_path, "PNG")
    print(f"Saved pristine transparent favicon emblem to {favicon_path}")

if __name__ == "__main__":
    generate_logo()
