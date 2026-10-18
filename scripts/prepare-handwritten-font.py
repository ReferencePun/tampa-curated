"""Build the bundled 3D Caveat outlines. Requires fonttools (authoring only).
The original variable TTF and its OFL license remain beside the derived JSON.
"""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen
root = Path(__file__).resolve().parents[1] / 'src/creative-lab/experiments/handwritten-manuscript/assets'
font = instantiateVariableFont(TTFont(root / 'Caveat.ttf'), {'wght': 540}, inplace=False)
glyphset = font.getGlyphSet()
scale = 1000 / font['head'].unitsPerEm
class Outline(BasePen):
    def __init__(self):
        super().__init__(glyphset)
        self.commands = []
        self.start = None
    def emit(self, command, *points):
        self.commands.append(command)
        for p in points:
            self.commands.extend(str(round(v * scale, 3)) for v in p)
    def _moveTo(self, p):
        self.start = p
        self.emit('m', p)
    def _lineTo(self, p): self.emit('l', p)
    def _qCurveToOne(self, control, end): self.emit('q', end, control)
    def _curveToOne(self, c1, c2, end): self.emit('b', end, c1, c2)
    def _closePath(self): self.emit('l', self.start)
glyphs = {}
for code, name in font.getBestCmap().items():
    if code > 127: continue
    pen = Outline()
    glyphset[name].draw(pen)
    bounds = BoundsPen(glyphset)
    glyphset[name].draw(bounds)
    box = bounds.bounds or (0,0,0,0)
    glyphs[chr(code)] = {'ha': font['hmtx'][name][0]*scale, 'x_min': box[0]*scale,
                        'x_max':box[2]*scale, 'o':' '.join(pen.commands)}
result = {'glyphs':glyphs,'familyName':'Caveat — manuscript outlines','resolution':1000,
          'boundingBox':{'yMin':font['head'].yMin*scale,'yMax':font['head'].yMax*scale},
          'ascender':font['hhea'].ascent*scale,'underlineThickness':50,
          'original_font_information':{'copyright':'Copyright 2014 The Caveat Project Authors',
          'license':'SIL Open Font License 1.1; see CAVEAT-OFL.txt',
          'source':'https://github.com/google/fonts/tree/main/ofl/caveat',
          'conversion':'FontTools 4.60.1, wght=540, Latin 3D subset; original TTF retained'}}
(root/'caveat-outlines.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
print('Converted',len(glyphs),'real handwriting outlines.')
