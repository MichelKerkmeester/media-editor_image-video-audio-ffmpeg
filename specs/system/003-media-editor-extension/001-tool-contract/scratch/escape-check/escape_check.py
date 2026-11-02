#!/usr/bin/env python3
"""Runs the two-level filter escape rule of contract section 8.5 against a real ffmpeg.

Usage: escape_check.py <ffmpeg> <font file>
Oracle: `-v debug` prints the value each option received as `Setting 'text' to value '...'`.
A value that reached the filter unchanged is proof the rule round-trips it. A trailing
`,scale=64:48` in the same chain proves the caller text did not leak into graph syntax.
"""
import random
import re
import subprocess
import sys

FF, FONT = sys.argv[1], sys.argv[2]


def l2(v):
    v = v.replace("\\", "\\\\").replace("'", "\\'").replace(":", "\\:")
    lead, mid, trail = re.match(r"^([ \t\n]*)(.*?)([ \t\n]*)$", v, flags=re.S).groups()
    return "".join("\\" + c for c in lead) + mid + "".join("\\" + c for c in trail)


def esc(v):
    return l2(v).replace("'", "'\\''")


def run(vf):
    cmd = [FF, "-hide_banner", "-nostdin", "-n", "-v", "debug", "-f", "lavfi", "-i",
           "color=c=black:s=320x240:d=0.1", "-vf", vf, "-frames:v", "1", "-f", "null", "-"]
    r = subprocess.run(cmd, capture_output=True)
    return r.returncode, r.stderr.decode("utf-8", "replace")


def probe(text):
    vf = (f"drawtext=text='{esc(text)}':expansion=none:fontfile='{FONT}':x=0:y=0:fontsize=12,"
          "scale=64:48")
    rc, err = run(vf)
    m = re.search(r"Setting 'text' to value '(.*?)'\n\[AVFilterGraph @ [0-9a-fx]+\] "
                  r"Setting '(?:expansion|fontfile|x)'", err, flags=re.S)
    return rc, (m.group(1) if m else None), (" 64x48" in err or "scale=64:48" in err)


BATTERY = ["plain text", "it's a test", "a:b", "100% sure", "a,b", "a;b", "[in]x[out]", "k=v",
           "back\\slash", "C:\\clips\\a.srt", "x',scale=1:1,drawtext=text='y", "line1\nline2",
           "tab\there", "%{localtime}", "'; rm -rf /", "a\\nb", "trailing\\", " lead", "trail ",
           " both ", "  ", "\nx", "x\n", "é ü 日本語 😀", "\"q\" $x `y`", "\\ ", "x\\"]

bad = 0
for c in BATTERY:
    rc, got, chain = probe(c)
    if not (rc == 0 and got == c and chain):
        bad += 1
        print("FAIL", repr(c), rc, repr(got), chain)
print(f"battery: {len(BATTERY)} strings, {bad} failures")

random.seed(11)
alphabet = list("\\':,;[]=% \t\n\"$`ab日") + ["\\'", "',", "'\\", ";[", "=,"]
fuzz = 0
for _ in range(400):
    s = "".join(random.choice(alphabet) for _ in range(random.randint(1, 14)))
    rc, got, chain = probe(s)
    if not (rc == 0 and got == s and chain):
        fuzz += 1
        print("FUZZ FAIL", repr(s), rc, repr(got), chain)
print(f"fuzz: 400 strings, {fuzz} failures")
sys.exit(1 if bad or fuzz else 0)
