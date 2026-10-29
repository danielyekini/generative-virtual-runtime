# From Pixels to Prediction: brief

Director script as supplied, recorded 2026-10-29.

---

Title: From Pixels to Prediction
Duration: 30 seconds
Style and tone: Dark technical schematic. Charcoal background, fine grey connections, cyan positive activations, orange negative values, and white labels. Brightness represents activation strength.
Setting and initial layout: A handwritten 7 sits on the left. A network extends right through an input layer, two hidden layers, and ten outputs labelled 0–9.
Characters or subjects: A 28 × 28 pixel image; input values; weighted connections; hidden activations; output scores and probabilities. Display representative neurons with ellipses indicating omitted units.
[0–5s] — Turn handwriting into numbers

* Camera: Close on the handwritten digit, viewed straight-on.
* Action and poses: Reveal a 28 × 28 grid over the 7. Enlarge three pixels briefly, displaying example intensities between 0 and 1. The grid then shrinks left as the network appears to its right.
* Timing: Grid reveal takes one second; pixel inspection takes two seconds; pullback takes two seconds.
* Sound and effects: Quiet scanning pulse.
* Transition: Selected pixels connect to corresponding input nodes.

[5–9s] — Enter the input layer

* Camera: Widen to include the image and input layer.
* Action and poses: Pixel values flow into a vertical column labelled 784 inputs. Bright pixels illuminate their input nodes strongly; background pixels remain dim. A bracket explains “One input per pixel.” Show several explicit pixel-to-input mappings before fading the guides.
* Timing: Values arrive over two seconds; hold the activated input layer for two seconds.
* Sound and effects: Soft electronic ticks.
* Transition: Highlight the connections entering one neuron in the first hidden layer.

[9–15s] — Compute one neuron

* Camera: Push into the selected hidden neuron; retain the input layer at the left edge.
* Action and poses: Isolate three representative incoming connections, with an ellipsis for the others. Show each input multiplied by its learned weight. Cyan and orange contributions enter a summation symbol; a bias joins them. Display:\[ z=\sum_i w_i x_i+b,\qquad a=\max(0,z). \]A small ReLU graph shows the resulting positive value passing through. The neuron brightens to match its activation.
* Timing: Multiplications take two seconds; summation and bias take two seconds; activation and hold take two seconds.
* Sound and effects: Subtle clicks followed by one low pulse.
* Transition: Pull back from this neuron to reveal the same operation across the hidden layer.

[15–20s] — Build an internal representation

* Camera: Track right across the two hidden layers.
* Action and poses: The first hidden layer activates in a varied pattern. Its values then travel through weighted connections into the second layer, producing a new pattern. Keep earlier activations visible but subdued. Display “Learned combinations of pixel patterns,” followed by “Combine evidence across layers.”
* Timing: First-layer reveal takes two seconds; second-layer computation takes two seconds; hold for one second.
* Sound and effects: Two restrained pulses.
* Transition: The second hidden layer’s outgoing connections brighten toward the ten outputs.

[20–25s] — Compare the digits

* Camera: Follow the information right; frame all ten output nodes and an adjacent bar chart.
* Action and poses: Output scores appear beside digits 0–9, then pass through a block labelled Softmax. Replace scores with an illustrative probability distribution: 7: 92%, 1: 3%, 9: 2%, and other digits combined: 3%. The bar for 7 grows tallest.
* Timing: Scores appear over two seconds; probability bars settle over two seconds; hold for one second.
* Sound and effects: Quiet rising tone.
* Transition: Outline output 7 in cyan; dim competing outputs slightly.

[25–30s] — Reveal the prediction

* Camera: Pull back to show the complete path from handwriting to output.
* Action and poses: Display “Prediction: 7” beside the winning output. A single travelling highlight retraces the forward pass: Pixels → Weighted sums + activations → Scores → Probabilities. Keep a small caption visible: “Weights were learned during training; this is inference.”
* Timing: Pullback takes one second; highlight travels for two seconds; final composition holds for two seconds.
* Sound and effects: Soft confirmation tone.
* Transition: End on the complete schematic.

Final composition: The handwritten 7, activation patterns, and predicted 7 remain visible. Connection pulses represent numerical computation; hidden neurons remain labelled as learned representations rather than individual, guaranteed feature detectors.
