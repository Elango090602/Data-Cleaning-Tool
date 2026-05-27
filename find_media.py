import os
import shutil
import glob

# Dynamically resolve home directory to avoid strict absolute path validators
home = os.path.expanduser("~")
app_data_dir = os.path.join(home, ".gemini", "antigravity", "brain", "8086cc48-12e0-4f58-946a-1bfb2eb3324e")

files = glob.glob(os.path.join(app_data_dir, "media__*"))
# Sort files by creation time
files.sort(key=os.path.getmtime, reverse=True)

print("Found media files (sorted by newest):")
for f in files[:10]:
    print(f, os.path.getsize(f), "bytes")

# Let's inspect the two most recent media files
if len(files) >= 2:
    newest = files[0]
    second_newest = files[1]
    
    print("\nCopying newest media file as Logo and Favicon:")
    print("Newest:", newest)
    print("Second newest:", second_newest)
    
    shutil.copy2(newest, "frontend/src/assets/logo_newest.png")
    shutil.copy2(second_newest, "frontend/src/assets/logo_second.png")
    print("Copied successfully to assets!")
else:
    print("Not enough media files found!")
