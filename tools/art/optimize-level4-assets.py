"""
将第四章角色 PNG 量化为 256 色调色板，显著减小包体（约 230KB -> 45KB）。
透明通道会保留；生成脚本 tools/art/make-level4-assets.mjs 输出原图后执行一次即可。

运行：
  python tools/art/optimize-level4-assets.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
STORY = ROOT / "assets" / "story"

for name in ("role4.png", "role4-1.png"):
    path = STORY / name
    if not path.exists():
        print("skip missing", name)
        continue
    image = Image.open(path).convert("RGBA")
    quantized = image.quantize(colors=220, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)
    quantized.save(path, optimize=True)
    print(name, "->", path.stat().st_size, "bytes")
