#!/usr/bin/env python3
"""Find a node in a uiautomator dump and print its centre as "x y".

Usage: ui_find.py dump.xml <value> [--prefix] [--desc|--text|--class] [--clickable]
  --desc / --text / --class  match only content-desc / text / class (default: text or content-desc)
  --prefix                   match the start of the value
  --clickable                return the nearest clickable ancestor (the real tap target)
Exit code 1 when nothing matches. Used by android-screenshots.sh (CI only).
"""
import re
import sys
import xml.etree.ElementTree as ET

path, wanted = sys.argv[1], sys.argv[2]
flags = set(sys.argv[3:])
if '--desc' in flags:
    attrs = ['content-desc']
elif '--text' in flags:
    attrs = ['text']
elif '--class' in flags:
    attrs = ['class']
else:
    attrs = ['text', 'content-desc']

root = ET.parse(path).getroot()
parents = {child: parent for parent in root.iter() for child in parent}


def matches(value):
    value = (value or '').strip()
    return value.startswith(wanted) if '--prefix' in flags else value == wanted


for node in root.iter('node'):
    if not any(matches(node.get(a)) for a in attrs):
        continue
    target = node
    if '--clickable' in flags:
        while target is not None and target.get('clickable') != 'true':
            target = parents.get(target)
        if target is None:
            target = node
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', target.get('bounds')))
    print((x1 + x2) // 2, (y1 + y2) // 2)
    sys.exit(0)
sys.exit(1)
