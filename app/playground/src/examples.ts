/// <reference types="vite/client" />
import { emitMotionScript } from "@gvr/motionscript-emitter";
import { buildRuntimeScenes } from "../../../fixtures/runtime-scenes";
import ballSource from "../../../fixtures/motionscript/ball.ms?raw";
import bunnySource from "../../../fixtures/motionscript/bunny.ms?raw";
import cameraSource from "../../../fixtures/motionscript/camera.ms?raw";
import captionSource from "../../../fixtures/motionscript/caption.ms?raw";
import diagramSource from "../../../fixtures/motionscript/diagram.ms?raw";
import cameraMappingSource from "../../../fixtures/motionscript/frames/camera-mapping.ms?raw";
import hierarchyTransformSource from "../../../fixtures/motionscript/frames/hierarchy-transform.ms?raw";
import opacitySource from "../../../fixtures/motionscript/frames/opacity.ms?raw";
import pathStressSource from "../../../fixtures/motionscript/frames/path-stress.ms?raw";
import gallerySource from "../../../fixtures/motionscript/frames/primitive-gallery.ms?raw";
import textSource from "../../../fixtures/motionscript/frames/text.ms?raw";
import zOrderSource from "../../../fixtures/motionscript/frames/z-order.ms?raw";
import nestedSource from "../../../fixtures/motionscript/nested.ms?raw";
import vectorsSource from "../../../fixtures/motionscript/stories/adding-two-vectors.ms?raw";
import eclipseSource from "../../../fixtures/motionscript/stories/into-the-moons-shadow.ms?raw";
import clockworkSource from "../../../fixtures/motionscript/stories/clockwork.ms?raw";
import copperleafSource from "../../../fixtures/motionscript/stories/copperleaf-run.ms?raw";
import counterSource from "../../../fixtures/motionscript/stories/counter.ms?raw";
import motionToMotionSource from "../../../fixtures/motionscript/stories/motionscript-to-motion.ms?raw";
import orderBookSource from "../../../fixtures/motionscript/stories/inside-an-order-book.ms?raw";
import packetJourneySource from "../../../fixtures/motionscript/stories/packet-journey.ms?raw";
import craneSource from "../../../fixtures/motionscript/stories/a-crane-then-a-square.ms?raw";
import blueSource from "../../../fixtures/motionscript/stories/through-the-blue.ms?raw";
import mountainSource from "../../../fixtures/motionscript/stories/through-the-mountain.ms?raw";
import circleSource from "../../../fixtures/motionscript/stories/a-circle-in-motion.ms?raw";
import homeSource from "../../../fixtures/motionscript/stories/from-blueprint-to-home.ms?raw";
import binaryTreeSource from "../../../fixtures/motionscript/stories/two-ways-through-a-binary-tree.ms?raw";
import smallIdeasSource from "../../../fixtures/motionscript/stories/small-ideas-enormous-change.ms?raw";
import pixelsSource from "../../../fixtures/motionscript/stories/from-pixels-to-prediction.ms?raw";
import squareWaveSource from "../../../fixtures/motionscript/stories/square-wave-from-sine-waves.ms?raw";
import degradedSource from "../../../fixtures/import/fixture/degraded.json?raw";
import exactSource from "../../../fixtures/import/fixture/exact.json?raw";
import failedSource from "../../../fixtures/import/fixture/failed.json?raw";
import partialSource from "../../../fixtures/import/fixture/partial.json?raw";
import unsupportedSource from "../../../fixtures/import/fixture/unsupported.json?raw";
import animatedOpacity from "../../../fixtures/import/lottie/animated_opacity.json?raw";
import animatedPosition from "../../../fixtures/import/lottie/animated_position.json?raw";
import animatedScale from "../../../fixtures/import/lottie/animated_scale.json?raw";
import centredRect from "../../../fixtures/import/lottie/centred_rect.json?raw";
import easingBezier from "../../../fixtures/import/lottie/easing_bezier.json?raw";
import holdKeyframe from "../../../fixtures/import/lottie/hold_keyframe.json?raw";
import inPoint from "../../../fixtures/import/lottie/in_point.json?raw";
import malformed from "../../../fixtures/import/lottie/malformed.json?raw";
import nestedShapeGroup from "../../../fixtures/import/lottie/nested_shape_group.json?raw";
import parentListedLater from "../../../fixtures/import/lottie/parent_listed_later.json?raw";
import parentedTransform from "../../../fixtures/import/lottie/parented_transform.json?raw";
import rotationAnchor from "../../../fixtures/import/lottie/rotation_anchor.json?raw";
import siblingFill from "../../../fixtures/import/lottie/sibling_fill.json?raw";
import solidLayer from "../../../fixtures/import/lottie/solid_layer.json?raw";
import staticShape from "../../../fixtures/import/lottie/static_shape.json?raw";
import unsupportedMask from "../../../fixtures/import/lottie/unsupported_mask.json?raw";
import unsupportedSkew from "../../../fixtures/import/lottie/unsupported_skew.json?raw";
import arcPath from "../../../fixtures/import/svg/arc_path.svg?raw";
import groupOpacity from "../../../fixtures/import/svg/group_opacity_overlap.svg?raw";
import nestedGroups from "../../../fixtures/import/svg/nested_groups.svg?raw";
import preserveNone from "../../../fixtures/import/svg/preserve_none.svg?raw";
import rotateAbout from "../../../fixtures/import/svg/rotate_about_point.svg?raw";
import scriptEvent from "../../../fixtures/import/svg/script_event.svg?raw";
import simpleText from "../../../fixtures/import/svg/simple_text.svg?raw";
import staticPrimitives from "../../../fixtures/import/svg/static_primitives.svg?raw";
import viewboxOffset from "../../../fixtures/import/svg/viewbox_offset.svg?raw";

export interface MotionExample {
  id: string;
  label: string;
  caption: string;
  source: string;
}

export interface SourceExample {
  id: string;
  label: string;
  file: string;
  source: string;
}

export const motionExamples: MotionExample[] = [
  { id: "from-pixels-to-prediction", label: "From Pixels to Prediction", caption: "A thirty-second network schematic. A handwritten 7 becomes 784 inputs, two hidden layers of activations, and a 92% prediction.", source: pixelsSource },
  { id: "from-blueprint-to-home", label: "From Blueprint to Home", caption: "An anchored blueprint rises into a house, then opens to reveal four furnished rooms.", source: homeSource },
  { id: "through-the-mountain", label: "Through the Mountain", caption: "A red locomotive and three cream carriages cross warm fields, pass through a mountain tunnel, and emerge into a snowy blue valley.", source: mountainSource },
  { id: "two-ways-through-a-binary-tree", label: "Two Ways Through a Binary Tree", caption: "BFS visits each level while preorder DFS explores and returns, with a live queue, call stack and separate visit orders.", source: binaryTreeSource },
  { id: "motionscript-to-motion", label: "From MotionScript to Motion", caption: "A thirty-second pipeline plate. One circle goes from description to compiled scene, evaluated state, and pixels.", source: motionToMotionSource },
  { id: "inside-an-order-book", label: "Inside an Order Book", caption: "Price–time priority turns resting orders into four executions, a cancellation, and a narrower spread.", source: orderBookSource },
  { id: "a-crane-then-a-square", label: "A Crane, Then a Square", caption: "A thirty-five-second crane fold. The sheet opens again and keeps the crease.", source: craneSource },
  { id: "into-the-moons-shadow", label: "Into the Moon’s Shadow", caption: "A forty-second eclipse plate. One moon path drives the orbit and the observer’s sky.", source: eclipseSource },
  { id: "square-wave-from-sine-waves", label: "Building a Square Wave from Sine Waves", caption: "Sixteen odd sine harmonics, added one at a time, approach a square wave and keep their Gibbs overshoot.", source: squareWaveSource },
  { id: "adding-two-vectors", label: "Adding Two Vectors", caption: "a = (3, 1) and b = (1, 2), placed head to tail. Either order reaches (4, 3).", source: vectorsSource },
  { id: "clockwork", label: "Clockwork", caption: "A thirty-second technical drawing. A brass train assembles, meshes, and runs.", source: clockworkSource },
  { id: "counter", label: "Counter", caption: "A thirty-second stick fight. Cyan dodges, then answers.", source: counterSource },
  { id: "copperleaf", label: "Copperleaf Run", caption: "Pip runs a woodland ruin, clears a beetle, and keeps going into the cavern.", source: copperleafSource },
  { id: "packet-journey", label: "Packet Journey", caption: "A message splits into five packets. One is lost, retransmitted, and the receiver rebuilds the line.", source: packetJourneySource },
  { id: "through-the-blue", label: "Through the Blue", caption: "A jellyfish crosses a moonlit reef, slips behind the rock, and hangs in the glow.", source: blueSource },
  { id: "a-circle-in-motion", label: "A Circle in Motion", caption: "One black outline falls as a drop and becomes a ripple, a clock, a bicycle wheel and a rising sun before falling again.", source: circleSource },
  { id: "small-ideas-enormous-change", label: "Small Ideas, Enormous Change", caption: "A twenty-second typographic plate. One sentence resolves word by word into three lines, with scale on enormous and vermilion on change.", source: smallIdeasSource },
  { id: "bunny", label: "Bunny", caption: "Nested rabbit, hop, then a sealed zoom.", source: bunnySource },
  { id: "ball", label: "Ball", caption: "A ball travels and bounces on an expression.", source: ballSource },
  { id: "caption", label: "Caption", caption: "A caption rises and fades in.", source: captionSource },
  { id: "nested", label: "Nested", caption: "A wheel and its spoke rotate together.", source: nestedSource },
  { id: "diagram", label: "Diagram", caption: "The sample follows the same two quadratics the curve is drawn with.", source: diagramSource },
  { id: "camera", label: "Camera", caption: "The camera pans, seals, then zooms. The caption stays on screen.", source: cameraSource },
];

export const sceneScripts: MotionExample[] = buildRuntimeScenes().map((entry) => ({
  id: entry.id,
  label: entry.label,
  caption: entry.caption,
  source: emitMotionScript(entry.scene),
}));

export const frameScripts: MotionExample[] = [
  { id: "primitive-gallery", label: "Primitive gallery", caption: "Rectangle, circle, ellipse, line, polygon, path, and text.", source: gallerySource },
  { id: "hierarchy-transform", label: "Hierarchy transform", caption: "A rectangle translated, rotated 30°, scaled, and pivoted. The yellow dot marks the pivot.", source: hierarchyTransformSource },
  { id: "camera-mapping", label: "Camera mapping", caption: "World (700, 300) through a zoom-2 camera. The ring and label stay in screen space.", source: cameraMappingSource },
  { id: "z-order", label: "Z-order", caption: "Three overlapping squares. Green has the highest zIndex, so it paints on top.", source: zOrderSource },
  { id: "opacity", label: "Opacity", caption: "The same red at opacity 1, 0.5, and 0.25.", source: opacitySource },
  { id: "text", label: "Text", caption: "Left sits on the alphabetic baseline, Middle is centered, Right ends on the bottom of the em box.", source: textSource },
  { id: "path-stress", label: "Path stress", caption: "Even-odd leaves a hole. Nonzero fills it. Below are a cubic and a quadratic.", source: pathStressSource },
];

export const testScripts: { group: string; items: MotionExample[] }[] = [
  { group: "Presets", items: motionExamples },
  { group: "Scenes", items: sceneScripts },
  { group: "Frames", items: frameScripts },
];

export const streamCaptions: Record<string, string> = {
  bunny: "The file arrives in small pieces. Playback starts at the first seal, waits at 2s, then continues when the rest is sealed.",
  ball: "The same ball program, fed one packet at a time.",
  caption: "This program seals only when it completes, then plays from the start.",
  nested: "The wheel is hidden until the whole group has arrived.",
  diagram: "The diagram is compiled from packets, then played.",
  camera: "The camera seals the pan, waits, then receives the zoom.",
};

export const fixtureExamples: SourceExample[] = [
  { id: "exact", label: "Exact", file: "fixtures/import/fixture/exact.json", source: exactSource },
  { id: "degraded", label: "Degraded", file: "fixtures/import/fixture/degraded.json", source: degradedSource },
  { id: "partial", label: "Partial", file: "fixtures/import/fixture/partial.json", source: partialSource },
  { id: "failed", label: "Failed", file: "fixtures/import/fixture/failed.json", source: failedSource },
  { id: "unsupported", label: "Unsupported", file: "fixtures/import/fixture/unsupported.json", source: unsupportedSource },
];

export const lottieExamples: SourceExample[] = [
  { id: "static_shape", label: "static shape", file: "fixtures/import/lottie/static_shape.json", source: staticShape },
  { id: "solid_layer", label: "solid layer", file: "fixtures/import/lottie/solid_layer.json", source: solidLayer },
  { id: "parented_transform", label: "parented", file: "fixtures/import/lottie/parented_transform.json", source: parentedTransform },
  { id: "nested_shape_group", label: "nested group", file: "fixtures/import/lottie/nested_shape_group.json", source: nestedShapeGroup },
  { id: "animated_position", label: "position", file: "fixtures/import/lottie/animated_position.json", source: animatedPosition },
  { id: "animated_scale", label: "scale", file: "fixtures/import/lottie/animated_scale.json", source: animatedScale },
  { id: "rotation_anchor", label: "rotation", file: "fixtures/import/lottie/rotation_anchor.json", source: rotationAnchor },
  { id: "animated_opacity", label: "opacity", file: "fixtures/import/lottie/animated_opacity.json", source: animatedOpacity },
  { id: "hold_keyframe", label: "hold", file: "fixtures/import/lottie/hold_keyframe.json", source: holdKeyframe },
  { id: "easing_bezier", label: "bezier", file: "fixtures/import/lottie/easing_bezier.json", source: easingBezier },
  { id: "in_point", label: "in-point", file: "fixtures/import/lottie/in_point.json", source: inPoint },
  { id: "sibling_fill", label: "sibling fill", file: "fixtures/import/lottie/sibling_fill.json", source: siblingFill },
  { id: "parent_listed_later", label: "parent later", file: "fixtures/import/lottie/parent_listed_later.json", source: parentListedLater },
  { id: "centred_rect", label: "centred rect", file: "fixtures/import/lottie/centred_rect.json", source: centredRect },
  { id: "unsupported_skew", label: "skew", file: "fixtures/import/lottie/unsupported_skew.json", source: unsupportedSkew },
  { id: "unsupported_mask", label: "mask", file: "fixtures/import/lottie/unsupported_mask.json", source: unsupportedMask },
  { id: "malformed", label: "malformed", file: "fixtures/import/lottie/malformed.json", source: malformed },
];

export const svgExamples: SourceExample[] = [
  { id: "static_primitives", label: "primitives", file: "fixtures/import/svg/static_primitives.svg", source: staticPrimitives },
  { id: "nested_groups", label: "nested groups", file: "fixtures/import/svg/nested_groups.svg", source: nestedGroups },
  { id: "viewbox_offset", label: "viewBox", file: "fixtures/import/svg/viewbox_offset.svg", source: viewboxOffset },
  { id: "rotate_about_point", label: "rotate", file: "fixtures/import/svg/rotate_about_point.svg", source: rotateAbout },
  { id: "simple_text", label: "text", file: "fixtures/import/svg/simple_text.svg", source: simpleText },
  { id: "group_opacity_overlap", label: "group opacity", file: "fixtures/import/svg/group_opacity_overlap.svg", source: groupOpacity },
  { id: "arc_path", label: "arc", file: "fixtures/import/svg/arc_path.svg", source: arcPath },
  { id: "preserve_none", label: "preserve none", file: "fixtures/import/svg/preserve_none.svg", source: preserveNone },
  { id: "script_event", label: "script", file: "fixtures/import/svg/script_event.svg", source: scriptEvent },
];
