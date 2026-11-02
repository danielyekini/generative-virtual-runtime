/**
 * Normative MotionScript grammar. 0.1 is the base. 0.2 adds the productions after `complete`.
 * Token rules are enforced by `lex.ts`. Expression rules are enforced by `expr.ts`.
 * Semantic constraints (ranges, identity, sealing) are not all grammatical;
 * they are stated in CONTRACT.md and enforced by `validate.ts` or later stages.
 */
export const MOTION_SCRIPT_EBNF = String.raw`
(* MotionScript 0.1
   Whitespace (space, tab, CR, LF) separates tokens and is not significant.
   A leading UTF-8 BOM is ignored.
   Comments are // through the end of the line. They may appear anywhere a token
   may appear, except inside strings. Block comments are not part of V1.
   # begins a colour literal and is never a comment.
   Identifiers match [A-Za-z_][A-Za-z0-9_]* and contain no dots.
   A dot is its own token. Hierarchical ids are a sequence of identifiers and dots.
   The compiler binds the longest registered node id, then a property path.
   Keywords are reserved and cannot be used as identifiers.
   Numeric literals are unsigned. A leading + or - is a separate operator.
   A decimal point must be followed by a digit, and a fraction must follow a digit.
   .5 is a dot token and a number, not a single numeric literal. Authors write 0.5.
   A number with no space before s or ms is one duration token, stored as milliseconds.
   A number with no space before deg or rad is one angle token, stored as radians.
   A number with no space before % is one percentage token, stored as a fraction of 1.
   A unit suffix is recognized only when the following character cannot continue an identifier.
   Colours are # and exactly 6 hex digits, or # and exactly 8 hex digits. #RGB is rejected.
   When 8 hex digits are present they form one colour. Otherwise 6 hex digits do.
   Strings use double quotes. Escapes are \\ \" \n \t \r and \u followed by four hex digits.
   A raw line break inside a string is an error. An unknown escape is an error.
   Expression text occurs only inside string literals and uses the expression grammar.
   The outer lexer does not tokenize inside strings.
   Semicolons inside strings do not end a statement.
*)

program        = sceneHeader , { unit } , complete ;
sceneHeader    = "scene" , string , "{" , { headerProperty } , "}" , ";" ;
headerProperty = "version" , string , ";"
               | "viewport" , "(" , number , "," , number , ")" , ";"
               | "background" , color , ";"
               | "duration" , duration , ";"
               | "requires" , string , ";" ;
unit           = constant | cameraDecl | nodeDecl | groupDecl | batch | track | step | seal
               | timingDecl | compositionDecl | instanceDecl | operatorsDecl | interactDecl
               | audioDecl | cueDecl | spatialLayerDecl | physicsDecl
               | entityDecl | geometryDecl | bindDecl | removeEntity | reparentDecl
               | behaviourDecl | cancelBehaviour ;
constant       = "const" , identifier , "=" , signedNumber , ";" ;
cameraDecl     = "camera" , identifier , "{" , { cameraProperty } , "}" , ";" ;
cameraProperty = "position" , vec2 , ";"
               | "zoom" , signedNumber , ";"
               | "rotation" , angle , ";" ;
groupDecl      = "group" , identifier , "{" , { commonProperty } , { nodeOrGroup } , "}" , ";" ;
nodeOrGroup    = nodeDecl | groupDecl ;
nodeDecl       = rectangleDecl | circleDecl | ellipseDecl | lineDecl
               | polygonDecl | pathDecl | textDecl ;
rectangleDecl  = "rectangle" , identifier , "{" , { rectangleItem } , "}" , ";" ;
circleDecl     = "circle" , identifier , "{" , { circleItem } , "}" , ";" ;
ellipseDecl    = "ellipse" , identifier , "{" , { ellipseItem } , "}" , ";" ;
lineDecl       = "line" , identifier , "{" , { lineItem } , "}" , ";" ;
polygonDecl    = "polygon" , identifier , "{" , { polygonItem } , "}" , ";" ;
pathDecl       = "path" , identifier , "{" , { pathItem } , "}" , ";" ;
textDecl       = "text" , identifier , "{" , { textItem } , "}" , ";" ;

commonProperty = "position" , vec2 , ";"
               | "pivot" , vec2 , ";"
               | "rotation" , angle , ";"
               | "scale" , vec2 , ";"
               | "opacity" , signedNumber , ";"
               | "visible" , boolean , ";"
               | "zIndex" , signedInteger , ";"
               | "space" , ( "world" | "screen" ) , ";" ;
styleProperty  = "fill" , paint , ";"
               | "stroke" , strokeValue , ";" ;
paint          = color | gradientPaint ;
gradientPaint  = "linear" , vec2 , vec2 , { stop }
               | "radial" , vec2 , signedNumber , { stop } ;
stop           = signedNumber , color ;
strokeValue    = paint , [ "width" , signedNumber ] , [ "cap" , cap ] ,
                 [ "join" , join ] , [ "miterLimit" , signedNumber ] ;
cap            = "butt" | "round" | "square" ;
join           = "miter" | "round" | "bevel" ;

rectangleItem  = commonProperty | styleProperty | ( "size" , vec2 , ";" ) ;
circleItem     = commonProperty | styleProperty | ( "radius" , signedNumber , ";" ) ;
ellipseItem    = commonProperty | styleProperty | ( "size" , vec2 , ";" ) ;
lineItem       = commonProperty
               | ( "from" , vec2 , ";" )
               | ( "to" , vec2 , ";" )
               | ( "stroke" , strokeValue , ";" ) ;
polygonItem    = commonProperty | styleProperty
               | ( "points" , "(" , vec2 , "," , vec2 , "," , vec2 , { "," , vec2 } , ")" , ";" ) ;
pathItem       = commonProperty | styleProperty | pathCommand
               | ( "fillRule" , ( "nonzero" | "evenodd" ) , ";" ) ;
pathCommand    = "move" , vec2 , ";"
               | "line" , vec2 , ";"
               | "quadratic" , vec2 , vec2 , ";"
               | "cubic" , vec2 , vec2 , vec2 , ";"
               | "close" , ";" ;
textItem       = commonProperty
               | ( "content" , string , ";" )
               | ( "fontFamily" , string , ";" )
               | ( "fontSize" , signedNumber , ";" )
               | ( "fontWeight" , signedNumber , ";" )
               | ( "fontStyle" , ( "normal" | "italic" ) , ";" )
               | ( "align" , ( "left" | "center" | "right" ) , ";" )
               | ( "baseline" , ( "alphabetic" | "middle" | "top" | "bottom" ) , ";" )
               | ( "fill" , color , ";" )
               | ( "stroke" , strokeValue , ";" ) ;

batch          = "batch" , "{" , { nodeDecl | groupDecl | track | step } , "}" , ";" ;
track          = animateTrack | keyframeTrack ;
animateTrack   = "animate" , target , "{" , { animateProperty } , "}" , ";" ;
keyframeTrack  = "keyframes" , target , "{" , { keyframeHeader } ,
                 keyframeValue , keyframeValue , { keyframeValue } , "}" , ";" ;
animateProperty= ( "from" , animValue , ";" )
               | ( "to" , animValue , ";" )
               | ( "start" , duration , ";" )
               | ( "duration" , duration , ";" )
               | ( "ease" , easing , ";" )
               | ( "expression" , string , ";" )
               | ( "fill" , fillMode , ";" )
               | ( "timing" , identifier , ";" )
               | ( "order" , signedInteger , ";" ) ;
keyframeHeader = ( "start" , duration , ";" )
               | ( "duration" , duration , ";" )
               | ( "ease" , easing , ";" )
               | ( "fill" , fillMode , ";" )
               | ( "timing" , identifier , ";" )
               | ( "order" , signedInteger , ";" ) ;
keyframeValue  = percentage , animValue , [ "ease" , easing ] , ";" ;
percentage     = number , "%" ;
fillMode       = "none" | "forwards" ;
easing         = segmentEase ;
animValue      = signedNumber | vec2 | pathLiteral ;
pathLiteral    = "path" , "{" , { pathCommand } , "}" ;
step           = "step" , target , "{" , "at" , duration , ";" , "value" , boolean , ";" , "}" , ";" ;
seal           = "seal" , duration , ";" ;
complete       = "complete" , ";" ;

(* MotionScript 0.2. A 0.1 program rejects these units.
   requires names a capability the consumer must enable before playback.
   timing maps parent time with local = (parent - offset) / stretch.
   stretch must be finite and non-zero. A negative stretch reverses local time.
   composition stores a node list. instance names one definition and is not expanded.
   operators names trim and round and does not change the draw list.
   ease cubic(x1, y1, x2, y2) uses x controls in [0, 1]. y may leave [0, 1].
   ease hold stays on the segment start until the next key.
*)
timingDecl     = "timing" , identifier , "{" , { timingProperty } , "}" , ";" ;
timingProperty = "parent" , identifier , ";"
               | "offset" , duration , ";"
               | "stretch" , signedNumber , ";" ;
compositionDecl = "composition" , identifier , "{" , { nodeOrGroup } , "}" , ";" ;
instanceDecl   = "instance" , identifier , "of" , identifier , "{" , { instanceProperty } , "}" , ";" ;
instanceProperty = "start" , duration , ";"
               | "end" , duration , ";"
               | "timing" , identifier , ";"
               | "parent" , identifier , ";"
               | "transformParent" , identifier , ";"
               | "position" , vec2 , ";" ;
operatorsDecl  = "operators" , dottedId , "{" , { operatorDecl } , "}" , ";" ;
operatorDecl   = "trim" , signedNumber , "," , signedNumber , "," , signedNumber , ";"
               | "round" , signedNumber , ";" ;

(* MotionScript 0.10 interaction targets (input.bindings). Only "interact" is
   reserved; body words match by spelling. dragTranslate only follows on drag. *)
interactDecl   = "interact" , dottedId , "{" , { interactItem } , "}" , ";" ;
interactItem   = ( "focusable" , boolean , ";" )
               | ( "tabIndex" , signedNumber , ";" )
               | ( "pointer" , ( "auto" | "none" ) , ";" )
               | ( "on" , trigger , interactAction , ";" ) ;
trigger        = "click" | "activate" | "wheel" | "drag" | ( "key" , string ) ;
interactAction = ( "set" , interactAddr , signedNumber )
               | ( "toggle" , interactAddr , signedNumber , signedNumber )
               | ( "step" , interactAddr , signedNumber , signedNumber , signedNumber )
               | ( "dragTranslate" , vec2 , vec2 ) ;
interactAddr   = [ dottedId , "." ] , interactChannel ;
interactChannel= "position.x" | "position.y" | "rotation" | "scale.x" | "scale.y" | "opacity" ;

(* MotionScript 0.11 audio resources and cues (audio.cues). Only "audio" and
   "cue" are reserved; bus and body words match by spelling. Cues use root
   scene time; a cue may follow the first seal when it starts at or after it. *)
audioDecl      = "audio" , identifier , string , duration , ";" ;
cueDecl        = "cue" , identifier , bus , identifier , "at" , duration ,
                 [ "{" , { cueItem } , "}" ] , ";" ;
bus            = "narration" | "effects" | "music" ;
cueItem        = ( ( "offset" | "duration" | "fadeIn" | "fadeOut" ) , duration , ";" )
               | ( ( "loops" | "gain" ) , signedNumber , ";" )
               | ( "required" , boolean , ";" ) ;

(* MotionScript 0.12 planar 2.5D layers (space.planar25d). Only "spatialLayer" is
   reserved; "camera", "surface" and every body word match by spelling, as audio
   buses do. Surfaces name root-scene nodes and wait for forward references; a
   layer is a base definition, frozen after the first seal. Angles are radians
   as a bare number or an angle token. A hinge is a line in the parent surface's
   plane and a rotation about it.
*)
spatialLayerDecl = "spatialLayer" , identifier , "{" , { spatialItem } , "}" , ";" ;
spatialItem    = spatialCamera | spatialSurface | spatialSeams ;
spatialCamera  = "camera" , "{" , { cameraItem3 } , "}" , ";" ;
cameraItem3    = ( "projection" , ( "perspective" | "orthographic" ) , ";" )
               | ( "position" , vec3 , ";" )
               | ( ( "yaw" | "pitch" | "roll" ) , angleOrNumber , ";" )
               | ( ( "focalLength" | "zoom" | "near" ) , signedNumber , ";" ) ;
spatialSurface = "surface" , dottedId , "{" , { surfaceItem } , "}" , ";" ;
surfaceItem    = ( "parent" , dottedId , ";" )
               | ( ( "position" | "pivot" | "rotation" | "scale" ) , vec3 , ";" )
               | ( "hinge" , vec2 , vec2 , angleOrNumber , ";" )
               | ( "backface" , ( "visible" | "hidden" ) , ";" )
               | ( "backFill" , color , ";" ) ;
vec3           = "(" , signedNumber , "," , signedNumber , "," , signedNumber , ")" ;
angleOrNumber  = angle | signedNumber ;

(* MotionScript 0.14 seam/split compositing (space.planarSeams). "seams" and its
   body words match by spelling inside a spatialLayer only; no new reserved word.
   At most one seams block per layer. Edges name two surfaces of the same layer.
*)
spatialSeams   = "seams" , "{" , { seamItem } , "}" , ";" ;
seamItem       = ( "split" , boolean , ";" )
               | ( ( "epsilon" | "maxFragments" ) , signedNumber , ";" )
               | ( "edge" , dottedId , dottedId , ";" ) ;

(* MotionScript 0.13 planar 2D physics (physics.planar2d). Only "physics" is
   reserved; mode/body/joint/constraint and every body word match by spelling.
   One world per scene; it is a base definition, frozen after the first seal.
   Dynamic mode uses rigid bodies and distance joints; authored mode uses
   position-based constraints without velocity. Physics exclusively owns
   transform.position.x/y and transform.rotation for each body entity.
*)
physicsDecl    = "physics" , identifier , "{" , { physicsItem } , "}" , ";" ;
physicsItem    = ( "mode" , ( "dynamic" | "authored" ) , ";" )
               | ( "gravity" , vec2 , ";" )
               | ( ( "fixedDtMs" | "seed" | "maxBodies" | "maxJoints"
                   | "maxContactsPerStep" | "maxSolverIterations" | "maxStepsPerAdvance" )
                   , signedNumber , ";" )
               | physicsBody | physicsJoint | physicsConstraint ;
physicsBody    = "body" , identifier , "{" , { bodyItem } , "}" , ";" ;
bodyItem       = ( "entity" , dottedId , ";" )
               | ( "kind" , ( "static" | "kinematic" | "dynamic" ) , ";" )
               | ( "position" , vec2 , ";" )
               | ( "angle" , angleOrNumber , ";" )
               | ( "velocity" , vec2 , ";" )
               | ( "omega" , signedNumber , ";" )
               | ( ( "mass" | "restitution" | "friction" ) , signedNumber , ";" )
               | ( "collider" , colliderSpec , ";" )
               | ( "surface" , dottedId , ";" ) ;
colliderSpec   = ( "circle" , signedNumber )
               | ( "aabb" , signedNumber , signedNumber ) ;
physicsJoint   = "joint" , identifier , "{" , { jointItem } , "}" , ";" ;
jointItem      = ( ( "a" | "b" ) , identifier , ";" )
               | ( "restLength" , signedNumber , ";" )
               | ( ( "anchorA" | "anchorB" ) , vec2 , ";" )
               | ( "compliance" , signedNumber , ";" ) ;
physicsConstraint = "constraint" , identifier , "{" , { constraintItem } , "}" , ";" ;
constraintItem = ( ( "a" | "b" ) , dottedId , ";" )
               | ( "restLength" , signedNumber , ";" )
               | ( "stiffness" , signedNumber , ";" ) ;

(* MotionScript 0.9 declarative entity statements. Lower 1:1 onto released
   APPLY_ENTITY_PATCH ops (entities.durableRevisions / entities.drawableBindings).
   Activation times must be >= the sealed left-limit. Geometry space is world|local.
*)
entityDecl     = "entity" , dottedId , "{" , { entityItem } , "}" , ";" ;
entityItem     = "kind" , ( "drawable" | "group" ) , ";"
               | "parent" , ( "root" | dottedId ) , ";"
               | "label" , string , ";"
               | "at" , duration , ";"
               | nodeDecl ;
geometryDecl   = "geometry" , identifier , "{" , "space" , ( "world" | "local" ) , ";" ,
                 "at" , duration , ";" , nodeDecl , "}" , ";" ;
bindDecl       = "bind" , dottedId , "to" , identifier , "at" , duration , ";" ;
removeEntity   = "remove" , "entity" , dottedId , "at" , duration , ";" ;
reparentDecl   = "reparent" , dottedId , "under" , ( "root" | dottedId ) , "at" , duration , ";" ;
behaviourDecl  = "behaviour" , identifier , "on" , dottedId , "{" ,
                 "activate" , "at" , duration , ";" , "}" , ";" ;
cancelBehaviour = "cancel" , "behaviour" , identifier , ";" ;

dottedId       = identifier , { "." , identifier } ;
segmentEase    = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold"
               | "cubic" , "(" , signedNumber , "," , signedNumber , "," , signedNumber , "," , signedNumber , ")" ;

target         = nodeAddress | cameraAddress ;
nodeAddress    = identifier , { "." , identifier } ;
cameraAddress  = "camera" , "(" , identifier , ")" , "." , identifier , { "." , identifier } ;

vec2           = "(" , signedNumber , "," , signedNumber , ")" ;
signedNumber   = [ "+" | "-" ] , number ;
signedInteger  = [ "+" | "-" ] , integer ;
boolean        = "true" | "false" ;
integer        = digit , { digit } ;
number         = integer , [ "." , integer ] , [ ( "e" | "E" ) , [ "+" | "-" ] , integer ] ;
duration       = number , ( "ms" | "s" ) ;
angle          = number , ( "deg" | "rad" ) ;
color          = "#" , hexDigit , hexDigit , hexDigit , hexDigit , hexDigit , hexDigit ,
                 [ hexDigit , hexDigit ] ;
string         = '"' , { stringChar } , '"' ;
identifier     = ( letter | "_" ) , { letter | digit | "_" } ;

(* Expression grammar. Parsed from the contents of an expression string.
   There are no comments. % is the toward-zero remainder.
   +, - , *, / and % are left associative. Unary + and - bind tighter than * / %.
   * / % bind tighter than + -.
   Builtin refs are PI, t, local_t and progress.
   sin, cos, abs and sqrt take one argument.
   min, max and pow take two. clamp and lerp take three.
   lerp(a, b, u) = a + (b - a) * u and does not clamp u.
   clamp(x, lo, hi) requires lo <= hi when sampled.
*)
expression     = expTerm , { ( "+" | "-" ) , expTerm } ;
expTerm        = expUnary , { ( "*" | "/" | "%" ) , expUnary } ;
expUnary       = ( "+" | "-" ) , expUnary | expPrimary ;
expPrimary     = number | expRef | expCall | "(" , expression , ")" ;
expCall        = expIdent , "(" , [ expression , { "," , expression } ] , ")" ;
expRef         = "PI" | "t" | "local_t" | "progress" ;
expIdent       = identifier ;
`.trim();

export const KEYWORDS = [
  "scene",
  "version",
  "viewport",
  "background",
  "duration",
  "const",
  "camera",
  "group",
  "rectangle",
  "circle",
  "ellipse",
  "line",
  "polygon",
  "path",
  "text",
  "batch",
  "animate",
  "keyframes",
  "step",
  "seal",
  "complete",
  "position",
  "pivot",
  "rotation",
  "scale",
  "opacity",
  "visible",
  "zIndex",
  "space",
  "world",
  "screen",
  "size",
  "radius",
  "from",
  "to",
  "points",
  "move",
  "quadratic",
  "cubic",
  "close",
  "content",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "align",
  "baseline",
  "fill",
  "stroke",
  "width",
  "cap",
  "join",
  "miterLimit",
  "butt",
  "round",
  "square",
  "miter",
  "bevel",
  "start",
  "ease",
  "expression",
  "value",
  "at",
  "true",
  "false",
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
  "normal",
  "italic",
  "left",
  "center",
  "right",
  "alphabetic",
  "middle",
  "top",
  "bottom",
  "none",
  "forwards",
  "fillRule",
  "nonzero",
  "evenodd",
  "hold",
  "composition",
  "instance",
  "timing",
  "requires",
  "stretch",
  "of",
  "parent",
  "transformParent",
  "end",
  "operators",
  "trim",
  "order",
  "offset",
  "inheritOpacity",
  "cornerRadius",
  "spatial",
  "image",
  "href",
  "isolated",
  "blend",
  "blur",
  "multiply",
  "screen",
  "overlay",
  "sourceOver",
  "radial",
  "entity",
  "behaviour",
  "geometry",
  "bind",
  "remove",
  "reparent",
  "cancel",
  "activate",
  "interact",
  "audio",
  "cue",
  "spatialLayer",
  "physics",
] as const;

export const KEYWORD_SET = new Set<string>(KEYWORDS);

/** Lexer modes a streaming decoder must preserve across transport fragments. */
export const LEXER_STATES = [
  "default",
  "lineComment",
  "string",
  "stringEscape",
  "unicodeEscape",
  "number",
  "color",
] as const;

export type LexerStateName = (typeof LEXER_STATES)[number];
