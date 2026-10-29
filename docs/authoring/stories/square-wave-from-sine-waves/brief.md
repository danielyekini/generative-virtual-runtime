# Building a Square Wave from Sine Waves: brief

Direction script as supplied, recorded 2026-10-29.

---

Title: Building a Square Wave from Sine Waves
Duration: 30 seconds
Style and tone: Clean mathematical diagrams on a white background. Dark axes, blue partial sum, orange incoming sine wave, and a light grey dashed square-wave target.
Setting and initial layout: A large graph spans two periods, from \(x=-2\pi\) to \(2\pi\). Mark \(y=-1,0,1\). A smaller component graph sits below it; the equation stays above.
Characters or subjects: Odd sine harmonics enter sequentially. Each component retains its frequency and amplitude as it joins the blue partial sum.
[0–4s] — Establish the target

* Camera: Fixed, straight-on view of the graph.
* Action and poses: Draw the dashed square wave at levels \(+1\) and \(-1\), with jumps at integer multiples of \(\pi\). Reveal the title “Build a square wave with sine waves.” Below, draw one orange sine wave.
* Timing: Axes appear in 0.5 seconds; target draws over 1.5 seconds; hold for two seconds.
* Sound and effects: None.
* Transition: The orange sine wave becomes the first term of the equation.

[4–8s] — Start with the fundamental

* Camera: Hold the full graph and equation.
* Action and poses: Display\[ S_1(x)=\frac{4}{\pi}\sin x. \]Trace the corresponding blue curve across the main graph. Keep the dashed target visible. Label the curve “1 term.”
* Timing: Trace over two seconds; hold for two seconds.
* Sound and effects: Optional soft tone.
* Transition: Keep the blue curve in place as the next component appears below.

[8–12s] — Add the third harmonic

* Camera: Hold still.
* Action and poses: In the lower graph, draw the orange component \(\frac{4}{3\pi}\sin 3x\). Label it “3× frequency · ⅓ amplitude.” At three sample positions, show signed vertical arrows illustrating its addition to the existing curve. Then smoothly update the blue graph to\[ S_2(x)=\frac{4}{\pi}\left(\sin x+\frac{\sin 3x}{3}\right). \]Update the counter to “2 terms.”
* Timing: Reveal the component for one second, demonstrate addition for one second, and blend its contribution from zero to full strength over two seconds.
* Sound and effects: Optional higher soft tone.
* Transition: Fade the sample arrows; replace the lower component with the fifth harmonic.

[12–16s] — Add the fifth harmonic

* Camera: Maintain identical framing and axis scales.
* Action and poses: Draw \(\frac{4}{5\pi}\sin 5x\) in orange. Label it “5× frequency · ⅕ amplitude.” Append the term to the equation, then add its contribution to the blue curve. The plateaus become flatter and the transitions steeper. Update the counter to “3 terms.”
* Timing: Component reveal takes one second; addition takes two seconds; hold for one second.
* Sound and effects: Optional soft tone.
* Transition: The equation contracts slightly to leave room for additional terms.

[16–22s] — Add more odd harmonics

* Camera: Hold the main graph steady.
* Action and poses: Add harmonics \(7,9,11,13,15\), one at a time. For each addition, briefly show the orange component below, append its equation term, and update the blue sum. Advance the counter from four to eight terms. End with:\[ S_N(x)=\frac{4}{\pi} \sum_{k=0}^{N-1}\frac{\sin((2k+1)x)}{2k+1}, \qquad N=8. \]
* Timing: Allow one second per addition, followed by a one-second hold. Each update explicitly increases the new term’s contribution from zero to full amplitude.
* Sound and effects: Optional ascending sequence of quiet tones.
* Transition: Highlight a small region around the jump at \(x=0\).

[22–27s] — Reveal what happens at the edges

* Camera: Keep the main graph visible; open a magnified inset around \(x=0\).
* Action and poses: Add the remaining odd harmonics through \(31\), advancing the counter to “16 terms.” Show the ripples crowding closer to the jump. Point to the overshoot with the label “Gibbs phenomenon: overshoot persists as the region narrows.” Mark the sum’s value at the jump with a blue dot at \(y=0\), labelled “Midpoint at the jump.”
* Timing: Add eight terms over three seconds; hold the inset and annotations for two seconds.
* Sound and effects: None.
* Transition: Close the inset and return attention to the complete waveform.

[27–30s] — Hold the result

* Camera: Fixed wide composition with the graph, equation, and term counter readable.
* Action and poses: Keep the sixteen-term approximation solid blue against the dashed target. Show the closing caption: “Odd harmonics. Decreasing amplitudes. An increasingly square wave.”
* Timing: Hold for the full three seconds.
* Sound and effects: Optional gentle resolving tone.
* Transition: End without fading the mathematical result.

Final composition: The sixteen-term partial sum, dashed square-wave target, and general Fourier-series formula remain visible. Preserve the overshoot and midpoint crossings accurately.
