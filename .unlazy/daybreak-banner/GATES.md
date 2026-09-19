# Gates: Daybreak texture banner

OWNS: exports/daybreak-texture-banner-1500x500.png, .unlazy/daybreak-banner/GATES.md

Scope: Deliver a visually reviewed 1500 by 500 PNG using the supplied artwork and centered off-white Daybreak symbol only.

- [x] G1: Exported PNG is exactly 1500 by 500 pixels.
  CHECK: sips -g pixelWidth -g pixelHeight exports/daybreak-texture-banner-1500x500.png
  EXPECT: pixelWidth: 1500
  CWD: /Users/gadgetplug/Documents/vibecoding/dayworld
  EVIDENCE: automatic-evidence=v1; definition-sha256=152ad11fb2d6a18f56a809131871c4d2f1afac6dfab0534fabf540ed9e30f064; exit=0; EXPECT=matched; output-sha256=160444d090286d43c7cf813f8063edb15f07e4c53a5d40ba1b6c6fc6dcbfeb9d; output-bytes=131; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: The supplied texture and existing Daybreak symbol are recognizable, centered, and legible, with no wordmark text.
  EVIDENCE: Visually inspected the corrected export at original resolution: the teal/lavender/olive texture remains, only the off-white pair-mark is centered, and there are no letters or other text.
