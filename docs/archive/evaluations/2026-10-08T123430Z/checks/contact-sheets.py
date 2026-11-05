from PIL import Image,ImageDraw
from pathlib import Path
import math
root=Path('docs/evaluations/2026-10-08T123430Z');stage=Path(__import__('sys').argv[1]);out=root/'review'/stage.parent.name;out.mkdir(parents=True,exist_ok=True)
for route in ['LOT-07-imported','LOT-07-compiled']:
 files=sorted((stage/'captures'/route).glob('frame_*-strip.png'))
 for batch in range(math.ceil(len(files)/30)):
  images=files[batch*30:(batch+1)*30];page=Image.new('RGB',(1200,10*150),(16,16,20));draw=ImageDraw.Draw(page)
  for i,p in enumerate(images):
   im=Image.open(p).convert('RGB');im.thumbnail((400,133));x=(i%3)*400;y=(i//3)*150
   # Ten rows; each strip retains reference/native/diff order.
   page.paste(im,(x,y));draw.text((x+3,y+134),p.stem,fill='white')
  page.save(out/f'{route}-{batch:02}.jpg')
print(out)
