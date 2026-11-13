"""
首页背景合成（开发用）：
1. 以 assets/ui/generated-image.png 为底；
2. 用发光舞台遮住中央的哭泣表情角色；
3. 把 assets/story/role1-hp3.png 放到舞台中央，作为玩家角色；
4. 输出 assets/ui/home-bg.jpg（900×1600，供首页使用）。

运行：
  python tools/art/make-home-background.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "assets" / "ui" / "generated-image.png"
HERO = ROOT / "assets" / "story" / "role1-hp3.png"
OUT = ROOT / "assets" / "ui" / "home-bg.jpg"
PREVIEW = ROOT / "tools" / "preview" / "home-composite.png"


def load_hero(height=480):
    hero = Image.open(HERO).convert("RGBA")
    bbox = hero.getbbox()
    hero = hero.crop(bbox)
    width = round(height * hero.width / hero.height)
    return hero.resize((width, height), Image.LANCZOS)


def ellipse_mask(size, box, blur=0):
    layer = Image.new("L", size, 0)
    ImageDraw.Draw(layer).ellipse(box, fill=255)
    if blur:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    return layer


def compose_stage(base):
    W, H = base.size
    cx = 768

    # ---- 中央玩家舞台屏幕（遮住原角色，并让主角站在屏幕前） ----
    box = (458, 636, 1078, 1002)
    left, top, right, bottom = box

    # 屏幕外发光
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.rounded_rectangle(
        [left - 18, top - 18, right + 18, bottom + 18],
        radius=38,
        outline=(90, 220, 255, 90),
        width=14,
    )
    base = Image.alpha_composite(base, glow.filter(ImageFilter.GaussianBlur(22)))

    # 外框
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    shd = ImageDraw.Draw(shadow)
    shd.rounded_rectangle(
        [left - 16, top - 16, right + 16, bottom + 16],
        radius=34,
        fill=(4, 8, 18, 220),
    )
    base = Image.alpha_composite(base, shadow.filter(ImageFilter.GaussianBlur(14)))

    bezel = Image.new("RGBA", base.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(bezel)
    bd.rounded_rectangle(
        [left - 16, top - 16, right + 16, bottom + 16],
        radius=34,
        fill=(12, 20, 38, 255),
    )
    bd.rounded_rectangle(
        [left - 8, top - 8, right + 8, bottom + 8],
        radius=28,
        fill=(20, 32, 54, 255),
    )
    base = Image.alpha_composite(base, bezel)

    # 屏幕内容：深蓝渐变 + 扫描线
    screen = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(screen)
    sdraw.rounded_rectangle(box, radius=22, fill=(5, 13, 28, 252))
    for y in range(top, bottom, 4):
        sdraw.line([(left, y), (right, y)], fill=(80, 200, 255, 10), width=1)
    # 中央主角光
    halo = Image.new("RGBA", base.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hd.ellipse([cx - 230, 720, cx + 230, 1000], fill=(80, 190, 255, 34))
    screen = Image.alpha_composite(screen, halo.filter(ImageFilter.GaussianBlur(60)))
    # 屏幕裁切
    smask = Image.new("L", base.size, 0)
    ImageDraw.Draw(smask).rounded_rectangle(box, radius=22, fill=255)
    screen.putalpha(ImageChops.multiply(screen.getchannel("A"), smask))
    base = Image.alpha_composite(base, screen)

    # 霓虹边框
    border = Image.new("RGBA", base.size, (0, 0, 0, 0))
    brd = ImageDraw.Draw(border)
    brd.rounded_rectangle(box, radius=22, outline=(120, 235, 255, 230), width=4)
    brd.rounded_rectangle(
        [left + 10, top + 10, right - 10, bottom - 10],
        radius=16,
        outline=(60, 160, 230, 60),
        width=1,
    )
    base = Image.alpha_composite(base, border.filter(ImageFilter.GaussianBlur(1)))

    # 屏幕顶部装饰
    deco = Image.new("RGBA", base.size, (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    # 淡网格
    for gx in range(left + 30, right - 20, 78):
        dd.line([(gx, top + 16), (gx, bottom - 16)], fill=(100, 200, 255, 10), width=1)
    for gy in range(top + 30, bottom - 20, 62):
        dd.line([(left + 16, gy), (right - 16, gy)], fill=(100, 200, 255, 8), width=1)
    # 中央圆环
    dd.ellipse([cx - 190, 690, cx + 190, 1010], outline=(120, 230, 255, 26), width=2)
    dd.ellipse([cx - 150, 730, cx + 150, 970], outline=(120, 230, 255, 14), width=1)
    # 左右角标
    for x in (left + 26, right - 26):
        dd.line([(x - 14, top + 20), (x + 14, top + 20)], fill=(255, 90, 90, 220), width=3)
    # 直播红点
    dd.ellipse([left + 26, top + 34, left + 38, top + 46], fill=(255, 70, 70, 235))
    try:
        live_font = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 20)
        big_font = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 74)
        mid_font = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 24)
        small_font = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 16)
    except OSError:
        live_font = big_font = mid_font = small_font = None
    dd.text((left + 46, top + 27), "LIVE", fill=(255, 110, 110, 235), font=live_font)
    # 1P 水印
    dd.text((left + 34, top + 64), "1P", fill=(130, 230, 255, 60), font=big_font)
    # 右侧挑战者
    challenger = "挑战者"
    if mid_font:
        cw = dd.textlength(challenger, font=mid_font)
        dd.text((right - 34 - cw, top + 62), challenger, fill=(210, 248, 255, 165), font=mid_font)
    else:
        dd.text((right - 100, top + 62), challenger, fill=(210, 248, 255, 165))
    # 底部状态条
    for i, w in enumerate((54, 38, 26)):
        dd.rounded_rectangle(
            [left + 34, bottom - 58 + i * 9, left + 34 + w, bottom - 54 + i * 9],
            radius=2,
            fill=(120, 220, 255, 120 - i * 24),
        )
    if small_font:
        rw = dd.textlength("READY", font=small_font)
        dd.text((right - 34 - rw, bottom - 52), "READY", fill=(170, 240, 255, 170), font=small_font)
    base = Image.alpha_composite(base, deco)

    # 舞台底座
    stage = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(stage)
    sd.ellipse([cx - 330, 966, cx + 330, 1060], fill=(6, 13, 28, 245))
    sd.ellipse([cx - 330, 966, cx + 330, 1060], outline=(120, 230, 255, 220), width=4)
    sd.ellipse([cx - 250, 986, cx + 250, 1042], outline=(80, 180, 240, 90), width=2)
    base = Image.alpha_composite(base, stage.filter(ImageFilter.GaussianBlur(2)))

    # ---- 主角 ----
    hero = load_hero(480)
    hx = cx - hero.width // 2
    hy = 992 - hero.height

    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse(
        [cx - 84, 966, cx + 84, 1008], fill=(0, 0, 0, 150)
    )
    base = Image.alpha_composite(base, shadow.filter(ImageFilter.GaussianBlur(12)))
    base.alpha_composite(hero, (hx, hy))

    # ---- 粒子 ----
    spark = Image.new("RGBA", base.size, (0, 0, 0, 0))
    spd = ImageDraw.Draw(spark)
    for px, py, r, a in [
        (520, 700, 3, 160),
        (1010, 720, 2, 140),
        (600, 960, 2, 120),
        (960, 980, 3, 110),
        (700, 580, 2, 120),
        (860, 600, 2, 100),
    ]:
        spd.ellipse([px - r, py - r, px + r, py + r], fill=(170, 245, 255, a))
    return Image.alpha_composite(base, spark)



def main():
    base = Image.open(BASE).convert("RGBA")
    base = compose_stage(base)
    base.convert("RGB").save(PREVIEW)
    print("wrote preview", PREVIEW, base.size)

    # 首页主视觉：保留标题与舞台的中央区域
    crop = base.crop((260, 0, 1280, 1024))
    target_w = 900
    target_h = round(crop.height * target_w / crop.width)
    crop = crop.resize((target_w, target_h), Image.LANCZOS)

    # 900×1600 画布：上方主视觉 + 下方深色舞台延伸
    canvas = Image.new("RGB", (900, 1600), (6, 10, 22))
    canvas.paste(crop.convert("RGB"), (0, 0))

    # 下方渐变：把被裁切的舞台底座柔和压暗，再过渡到更深的竞技场地面
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(876, 1010):
        if y < 900:
            a = int(235 * ((y - 876) / 24))
        else:
            a = 235
        od.line([(0, y), (900, y)], fill=(5, 9, 20, a))
    for y in range(1010, 1600):
        shade = int(26 - 16 * min(1, (y - 1010) / 500))
        od.line([(0, y), (900, y)], fill=(6, 11, shade, 255))
    # 舞台余光
    glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([80, 820, 820, 1280], fill=(40, 120, 180, 22))
    overlay = Image.alpha_composite(overlay, glow.filter(ImageFilter.GaussianBlur(90)))
    # 细网格与红色霓虹线，与竞技场呼应
    od = ImageDraw.Draw(overlay)
    for gy in range(1040, 1600, 28):
        od.line([(0, gy), (900, gy)], fill=(100, 190, 255, 6), width=1)
    od.line([(0, 1040), (900, 1040)], fill=(255, 60, 60, 24), width=3)
    od.line([(0, 1380), (900, 1380)], fill=(255, 60, 60, 14), width=2)
    canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")

    canvas.save(OUT, quality=84, optimize=True)
    print("wrote", OUT, canvas.size, OUT.stat().st_size)


if __name__ == "__main__":
    main()
