import { progressive, cancelProgressive } from './main';
import source from '../../../samples/motionscript/a-circle-in-motion/experimental/progressive-capacity/program.ms?raw';
const manifest={firstSealBytes:17982};
const button=document.querySelector<HTMLButtonElement>('#start')!;
button.onclick=async()=>{
 button.disabled=true;
 try{
  const result=await progressive.run(source,{
   bytesPerSecond:Number(document.querySelector<HTMLSelectElement>('#rate')!.value),
   pattern:document.querySelector<HTMLSelectElement>('#pattern')!.value==='fixed'?[512]:[17,2048,127,509],
   mode:document.querySelector<HTMLSelectElement>('#mode')!.value as 'normal',
   firstSealBytes:manifest.firstSealBytes
  });
  document.querySelector('#result')!.textContent=JSON.stringify({...result,captures:result.captures.map(c=>({name:c.name}))},null,2);
 }finally{button.disabled=false;}
};
document.querySelector<HTMLButtonElement>('#cancel')!.onclick=cancelProgressive;
