import { applySegmentEasing, SPATIAL_CURVE_SEGMENTS, type Keyframe, type Vec2 } from '@gvr/schema';
import { clipKeyframes } from '../packages/format-lottie/src/clip-keyframes';

/** Preserve the source's 150-point arc-length polyline when a spatial track is cut.
 * Each chord becomes an ordinary vec2 segment with the original restricted easing.
 * This uses existing keyframes rather than refitting a shorter spatial curve.
 */
export function clipSpatialKeyframes(start: number, duration: number, keys: Keyframe[], window: number) {
  const expanded: Keyframe[]=[];
  for(let index=0; index<keys.length-1;index++) {
    const from=keys[index]!,to=keys[index+1]!;
    if(!from.spatial || typeof from.value==='number'||Array.isArray(from.value)||typeof to.value==='number'||Array.isArray(to.value)) {
      expanded.push(from);continue;
    }
    const easing=from.easing;
    if(typeof easing==='object' && easing.type==='hold') { expanded.push({...from,spatial:undefined});continue; }
    // Do not silently linearise a non-monotonic temporal curve. Such a curve
    // needs separate extrema intervals before inverse progress is single-valued.
    if(typeof easing==='object' && (easing.y1<0 || easing.y1>1 || easing.y2<0 || easing.y2>1)) return undefined;
    const p0=from.value as Vec2,p3=to.value as Vec2;
    const out=from.spatial.out,inn=from.spatial.in;
    const points: (Vec2 & {z:number})[]=[]; const lengths=[0];let total=0;
    for(let i=0;i<SPATIAL_CURVE_SEGMENTS;i++) {
      const t=i/(SPATIAL_CURVE_SEGMENTS-1),m=1-t,a=m*m*m,b=3*m*m*t,c=3*m*t*t,d=t*t*t;
      const point={x:a*p0.x+b*(p0.x+out.x)+c*(p3.x+inn.x)+d*p3.x,y:a*p0.y+b*(p0.y+out.y)+c*(p3.y+inn.y)+d*p3.y,z:b*(out.z??0)+c*(inn.z??0)};
      if(i){const prev=points[i-1]!;total+=Math.hypot(point.x-prev.x,point.y-prev.y,point.z-prev.z);lengths.push(total);}
      points.push(point);
    }
    if(total===0){expanded.push({...from,spatial:undefined});continue;}
    const inverse=(progress:number)=>{if(progress<=0)return 0;if(progress>=1)return 1;let lo=0,hi=1;for(let i=0;i<50;i++){const mid=(lo+hi)/2;if(applySegmentEasing(easing,mid)<progress)lo=mid;else hi=mid;}return(lo+hi)/2;};
    const times=lengths.map(l=>inverse(l/total));
    for(let i=0;i<SPATIAL_CURVE_SEGMENTS-1;i++) {
      if(times[i+1]!-times[i]!<1e-12)continue;
      // clipKeyframes restricts the original easing to each chord's time span.
      // Original whole-segment values 0..1 preserve arc-length progression.
      const chord=clipKeyframes(-times[i]!,1,[{offset:0,value:0,easing},{offset:1,value:1}],times[i+1]!-times[i]!)!;
      for(const key of chord.keyframes.slice(0,-1)) {
        const alpha=((key.value as number)-lengths[i]!/total)/((lengths[i+1]!-lengths[i]!)/total);
        const p=points[i]!,q=points[i+1]!;
        const time=times[i]!+key.offset*(times[i+1]!-times[i]!);
        expanded.push({offset:from.offset+(to.offset-from.offset)*time,value:{x:p.x+(q.x-p.x)*alpha,y:p.y+(q.y-p.y)*alpha},easing:key.easing});
      }
    }
  }
  const last=keys.at(-1);if(last)expanded.push(last);
  return clipKeyframes(start,duration,expanded,window);
}
