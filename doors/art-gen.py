#!/usr/bin/env python3
"""Card art for /doors, generated from geometry rather than drawn by hand.

Follows the idiom of islandlab-platform/design/figure-gen.py: stdlib only, each
figure is a plain function with keyword defaults, each returns an SVG fragment,
and a module-level registry maps name to function. Same house rule applies, a
figure is computed from the thing it illustrates, and carries no text.

  python3 art-gen.py          write art.js next to this file
  python3 art-gen.py --sheet  also write contact-sheet.html to eyeball all of them

The output is spliced into index.html as EMBLEM[] and suitGlyph().
"""
import math, os, sys

OUT = os.path.dirname(os.path.abspath(__file__))
R = lambda v: round(v, 1)


# ---------- primitives ----------

def wave(y, amp, period, x0=10, x1=90, phase=0.0, step=2.0):
    """A sine run. Used wherever the card is about water doing something."""
    pts = []
    x = x0
    while x <= x1 + 1e-9:
        pts.append((x, y + amp * math.sin(phase + 2 * math.pi * (x - x0) / period)))
        x += step
    return "M" + " L".join(f"{R(px)} {R(py)}" for px, py in pts)


def poly(pts, close=False):
    d = "M" + " L".join(f"{R(x)} {R(y)}" for x, y in pts)
    return d + ("Z" if close else "")


def arrow(x0, y0, x1, y1, head=7):
    """A line with a head, pointing x0y0 -> x1y1."""
    a = math.atan2(y1 - y0, x1 - x0)
    p1 = (x1 - head * math.cos(a - 0.4), y1 - head * math.sin(a - 0.4))
    p2 = (x1 - head * math.cos(a + 0.4), y1 - head * math.sin(a + 0.4))
    return (f"M{R(x0)} {R(y0)} L{R(x1)} {R(y1)}"
            f"M{R(p1[0])} {R(p1[1])} L{R(x1)} {R(y1)} L{R(p2[0])} {R(p2[1])}")


def p(d, extra=""):
    return f'<path d="{d}"{extra}/>'


# ---------- the twenty-two Conditions ----------

def water_you_are_in(amp=3.2):
    """Three runs of water at different amplitude, and the boat sitting in them."""
    body = "".join(p(wave(38 + i * 16, amp - i * 0.7, 34 + i * 8, phase=i * 1.3)) for i in range(3))
    return body + p("M44 26 L56 26 L53 34 L47 34 Z") + p("M50 26 L50 14")


def cost_of_staying(n=7):
    """An anchor down, and a gauge falling by a fixed amount every tick."""
    ticks = "".join(p(f"M74 {R(24 + i * 8)} h{R(14 - i * 1.7)}") for i in range(n))
    return (p("M40 18 v56") + p("M28 30 h24") + p("M22 58 a18 18 0 0 0 36 0")
            + f'<circle cx="40" cy="14" r="5"/>' + ticks)


def tide(period=56, amp=19, gate=10):
    """The curve, and the bracketed window where the height clears the sill.

    The gate is computed from the curve, so the window really is the interval
    during which the tide is high enough. Move the sill and the bracket moves.
    """
    sill = 52 - gate
    body = p(wave(52, amp, period, x0=8, x1=92))
    body += p(f"M8 {R(sill)} h84", ' stroke-dasharray="3 3" opacity=".5"')
    xs = [x for x in range(8, 93)
          if 52 + amp * math.sin(2 * math.pi * (x - 8) / period) < sill]
    if xs:
        a, b = min(xs), max(xs)
        body += p(f"M{R(a)} {R(sill)} V88 M{R(b)} {R(sill)} V88")
        body += p(f"M{R(a)} 84 H{R(b)}", ' stroke-width="3.2"')
    return body


def chart_that_is_wrong(offset=9):
    """One coastline, surveyed twice, and the surveys disagree."""
    base = [(12 + i * 5.2, 62 - 16 * math.sin(i * 0.55) - 0.5 * i) for i in range(16)]
    old = [(x, y + offset) for x, y in base]
    return p(poly(base)) + p(poly(old), ' stroke-dasharray="4 4" opacity=".6"')


def channel(taper=22):
    """Banks squeezing, then opening onto more water rather than onto a harbour."""
    top = [(8, 16), (34, 16), (50, 50 - taper / 2), (66, 16), (92, 16)]
    bot = [(8, 84), (34, 84), (50, 50 + taper / 2), (66, 84), (92, 84)]
    return p(poly(top)) + p(poly(bot)) + p(wave(50, 2.2, 20, x0=40, x1=92))


def one_way_passage():
    """Through the bar, and the bar breaking behind you."""
    return (p(arrow(24, 50, 78, 50, head=9))
            + p(wave(66, 4.5, 16, x0=10, x1=44), ' opacity=".8"')
            + p("M30 30 v40 M22 34 v32", ' opacity=".45"'))


def circle(n=64, r=27):
    """A closed track. Sixty miles on the log, no change in position."""
    pts = [(50 + r * math.cos(2 * math.pi * i / n) * 1.15,
            50 + r * math.sin(2 * math.pi * i / n) * 0.8) for i in range(n + 1)]
    return p(poly(pts)) + f'<circle cx="{R(50 + r * 1.15)}" cy="50" r="3.4"/>'


def lee_shore(n=5):
    """Wind vectors, all one way, and the rocks they are setting you onto."""
    gusts = "".join(p(arrow(12, 22 + i * 13, 40, 22 + i * 13, head=5), ' opacity=".55"')
                    for i in range(n))
    rocks = poly([(72, 84), (76, 62), (80, 72), (84, 50), (88, 66), (92, 58)])
    return gusts + p(rocks) + f'<circle cx="52" cy="50" r="5"/>'


def threshold(gap=16):
    """One foot on the dock, one on the boat, and the gap between them."""
    return (p(f"M10 62 h{R(40 - gap / 2 - 10)}") + p(f"M{R(50 + gap / 2)} 62 h{R(40 - gap / 2)}")
            + f'<circle cx="50" cy="28" r="6"/>'
            + p("M50 34 v20 M50 54 L38 62 M50 54 L62 62 M38 44 h24"))


def permission_already_given():
    """An empty berth that is yours, and the cleat nobody has used."""
    return (p("M22 24 v56 M78 24 v56") + p("M22 80 h56", ' stroke-dasharray="5 5"')
            + p("M40 42 h20 M44 38 v8 M56 38 v8")
            + p("M34 60 h32", ' opacity=".4"'))


def comfortable_harbour(amp=6):
    """Chop outside the wall, flat water inside it."""
    return (p(wave(24, amp, 20, x0=6, x1=94))
            + p("M18 40 h64 v34 M18 40 v34", ' opacity=".9"')
            + p(wave(58, 0.8, 26, x0=24, x1=76))
            + p(wave(68, 0.8, 26, x0=24, x1=76)))


def ledger(n=9):
    """A column of what it cost, and the rule you draw under it."""
    rows = "".join(p(f"M26 {R(18 + i * 6.4)} h{R(10 + (i * 37) % 29)}") for i in range(n))
    return rows + p("M26 78 h46") + p("M26 84 h46")


def passage_already_made():
    """The track astern. Dashed, because it is finished, and it still put you here."""
    pts = [(10 + i * 4.2, 74 - 26 * (i / 19) ** 1.4 - 4 * math.sin(i * 0.7)) for i in range(20)]
    return (p(poly(pts), ' stroke-dasharray="4 4" opacity=".7"')
            + f'<circle cx="{R(pts[-1][0])}" cy="{R(pts[-1][1])}" r="4.5"/>')


def passage_that_is_not_there(n=22):
    """A channel on the chart, and the shoal actually on the ground."""
    dots = "".join(f'<circle cx="{R(16 + (i * 13) % 68)}" cy="{R(44 + (i * 29) % 30)}" r="1.5"/>'
                   for i in range(n))
    return (p("M14 40 h72 M14 78 h72", ' stroke-dasharray="5 4" opacity=".55"') + dots)


def swell_from_somewhere(period=150, amp=9):
    """Long period, no wind on it. The arrow says the weather making it is off-frame."""
    return (p("M6 30 h88", ' opacity=".4"')
            + p(arrow(8, 20, 40, 20, head=6), ' opacity=".7"')
            + p(wave(58, amp, period, x0=2, x1=98))
            + p(wave(78, amp, period, x0=2, x1=98, phase=0.35), ' opacity=".65"'))


def mooring_you_would_keep():
    """A buoy, a taut line, and the cleat it is made fast to. Chosen, and holding."""
    return (f'<circle cx="50" cy="30" r="11"/>' + p("M50 41 L50 66")
            + p("M36 70 h28", ' stroke-width="3.2"')
            + p("M36 70 a5 5 0 0 0 -6 6 M64 70 a5 5 0 0 1 6 6")
            + p("M50 66 a7 7 0 0 0 -12 4 M50 66 a7 7 0 0 1 12 4")
            + p("M50 19 v-6"))


def squall(n=9):
    """It arrives over the ridge, and it lays you down."""
    rain = "".join(p(f"M{R(20 + i * 7)} 46 L{R(13 + i * 7)} 66", ' opacity=".6"') for i in range(n))
    return (p("M18 38 a13 13 0 0 1 12 -18 a17 17 0 0 1 32 4 a12 12 0 0 1 20 14 Z")
            + rain + p("M28 82 L60 70", ' stroke-width="3.2"'))


def light_on_the_water(n=4):
    """A loom on the horizon. Arcs, because that is all you get at this range."""
    arcs = "".join(f'<path d="M{R(50 - 12 - i * 11)} 62 a{R(12 + i * 11)} {R(12 + i * 11)} 0 0 1 {R(24 + i * 22)} 0"'
                   f' opacity="{round(0.85 - i * 0.18, 2)}"/>' for i in range(n))
    return p("M8 62 h84") + arcs + f'<circle cx="50" cy="62" r="2.6"/>'


def fog(n=6):
    """Bands, and a headland you can nearly resolve behind them."""
    land = poly([(24, 62), (36, 44), (48, 54), (62, 36), (76, 58)])
    bands = "".join(p(f"M6 {R(30 + i * 9)} h88",
                      f' stroke-width="3.4" opacity="{round(0.75 - abs(i - 2.5) * 0.09, 2)}"')
                    for i in range(n))
    return p(land, ' opacity=".3"') + bands


def open_water():
    """Sea room. The card is mostly the space, which is the point."""
    return (p("M6 44 h88") + p(wave(66, 1.4, 40, x0=10, x1=90), ' opacity=".5"')
            + p("M48 44 L52 44 L51 38 L49 38 Z") + p("M50 38 v-8"))


def roll_call(n=6, filled=3):
    """Berths on a list. Some answered, some still open, and the list closes."""
    out = []
    for i in range(n):
        y = 20 + i * 11
        out.append(p(f"M30 {R(y)} h34", ' opacity=".45"'))
        if i < filled:
            out.append(f'<circle cx="22" cy="{R(y)}" r="3.6"/>')
        else:
            out.append(f'<circle cx="22" cy="{R(y)}" r="3.6" stroke-dasharray="2.4 2.4"/>')
    return "".join(out)


def new_water():
    """Different tides, different holding. The pattern does not match the old one."""
    return (p(wave(64, 3.6, 21, x0=8, x1=92)) + p(wave(76, 3.6, 21, x0=8, x1=92, phase=1.6))
            + p(poly([(10, 40), (28, 26), (44, 36), (60, 20), (78, 34), (90, 26)]))
            + f'<circle cx="50" cy="52" r="3"/>')


EMBLEMS = [
    water_you_are_in, cost_of_staying, tide, chart_that_is_wrong, channel,
    one_way_passage, circle, lee_shore, threshold, permission_already_given,
    comfortable_harbour, ledger, passage_already_made, passage_that_is_not_there,
    swell_from_somewhere, mooring_you_would_keep, squall, light_on_the_water,
    fog, open_water, roll_call, new_water,
]


# ---------- the four suit glyphs, drawn at 24x24 because they tile as pips ----------

def glyph_perception():
    """A lens: two arcs meeting at points, with the one thing that registered inside."""
    return ('<path d="M1.5 12 Q12 3.5 22.5 12 Q12 20.5 1.5 12 Z"/>'
            '<circle cx="12" cy="12" r="3.2"/>')


def glyph_navigation():
    """A bearing taken. Cross plus a heading line off the true axis."""
    return ('<path d="M12 1.5 v21 M1.5 12 h21"/>'
            '<path d="M12 12 L19.5 5.5"/><circle cx="12" cy="12" r="7.4"/>')


def glyph_paths():
    """A track that forks. Routes are things that branch."""
    return '<path d="M12 22 V13 M12 13 L5 4 M12 13 L19 4"/>'


def glyph_doors():
    """A hatch, and the sill you step over."""
    return ('<path d="M5.5 21 V6 a6.5 6.5 0 0 1 13 0 v15"/>'
            '<path d="M3 21 h18"/><circle cx="15.4" cy="13" r="1.4"/>')


GLYPHS = [("perception", glyph_perception), ("navigation", glyph_navigation),
          ("paths", glyph_paths), ("doors", glyph_doors)]


def build_js():
    emb = ",\n".join(" " + json_str(f()) for f in EMBLEMS)
    lines = "".join(f'  if (suit==="{n}") return {json_str(f())};\n' for n, f in GLYPHS[:-1])
    lines += f"  return {json_str(GLYPHS[-1][1]())};\n"
    return (f"const EMBLEM = [\n{emb}\n];\n"
            f"function suitGlyph(suit){{\n{lines}}}\n")


def json_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def sheet():
    """A contact sheet, so the art can be judged rather than assumed."""
    cells = []
    for f in EMBLEMS:
        cells.append(f'<figure><svg viewBox="0 0 100 100">{f()}</svg>'
                     f'<figcaption>{f.__name__.replace("_", " ")}</figcaption></figure>')
    for n, f in GLYPHS:
        cells.append(f'<figure><svg viewBox="0 0 24 24">{f()}</svg>'
                     f'<figcaption>glyph {n}</figcaption></figure>')
    return ("<!DOCTYPE html><meta charset=utf-8><title>doors art</title><style>"
            "body{background:#1B242B;color:#EFE4CE;font:12px ui-monospace,monospace;"
            "display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:14px;padding:20px}"
            "figure{margin:0;text-align:center}"
            "svg{width:100%;height:auto;fill:none;stroke:#EFE4CE;stroke-width:1.9;"
            "stroke-linecap:round;stroke-linejoin:round;background:rgba(0,0,0,.22);border-radius:3px}"
            "figcaption{opacity:.6;margin-top:5px;font-size:10px}</style>" + "".join(cells))


def main(argv):
    with open(os.path.join(OUT, "art.js"), "w", encoding="utf-8") as fh:
        fh.write(build_js())
    print("wrote art.js:", len(EMBLEMS), "emblems,", len(GLYPHS), "glyphs")
    if "--sheet" in argv:
        with open(os.path.join(OUT, "contact-sheet.html"), "w", encoding="utf-8") as fh:
            fh.write(sheet())
        print("wrote contact-sheet.html")


if __name__ == "__main__":
    main(sys.argv)
