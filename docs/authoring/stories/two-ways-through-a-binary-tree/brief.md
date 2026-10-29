# Brief as supplied — 2026-10-29

**Title:** Two Ways Through a Binary Tree  
**Duration:** 30 seconds  
**Style and tone:** Clean computer science diagrams on white. Dark outlines, blue for the current node, pale blue for visited nodes, and amber for pending nodes.  
**Setting and initial layout:** Begin with one centred root node, **A**. The completed tree has **B, C** beneath A; **D, E** beneath B; and **F, G** beneath C.  
**Characters or subjects:** Two identical trees, a BFS queue, a DFS call stack, and separate visit-order strips. DFS uses **preorder: node, left, right**.

**[0–5s] — Grow the tree**

- **Camera:** Fixed, straight-on view.
- **Action and poses:** A scales into view. Branches extend down-left and down-right before B and C appear at their endpoints. B then sprouts D and E while C simultaneously sprouts F and G. Keep sibling spacing symmetrical and labels upright.
- **Timing:** Root appears during 0–1s; second level grows during 1–3s; third level grows during 3–5s. Nodes settle with gentle easing.
- **Sound and effects:** Soft clicks as nodes appear.
- **Transition:** The completed tree scales down and duplicates into two panels.

**[5–8s] — Establish the two methods**

- **Camera:** Widen to show both panels equally.
- **Action and poses:** Label the left panel **“Breadth-first: level by level”** and the right **“Depth-first: preorder”**. Beneath BFS, show a horizontal queue with its front clearly marked. Beneath DFS, show a vertical call stack with its top marked. Place A in both structures. Add an empty **Visit order** strip beneath each panel.
- **Timing:** Layout settles over one second; labels and structures hold for two seconds.
- **Sound and effects:** None.
- **Transition:** Both A nodes turn blue simultaneously.

**[8–12s] — Start at the root**

- **Camera:** Hold both panels; keep all labels readable.
- **Action and poses:**  
  **Left, BFS:** Remove A from the queue, append A to the visit strip, then enqueue B followed by C. Queue becomes **[B, C]**.  
  **Right, DFS:** Append A to the visit strip. Keep A’s stack frame visible and push B above it, highlighting the left branch.
- **Timing:** Visit A during the first second; animate the queue and stack changes over two seconds; hold for one second.
- **Sound and effects:** One click per visit.
- **Transition:** Both traversals move to B.

**[12–17s] — Their paths diverge**

- **Camera:** Maintain the side-by-side view.
- **Action and poses:**  
  **12–14.5s, BFS:** Visit B; enqueue D then E. Queue becomes **[C, D, E]**.  
  **12–14.5s, DFS:** Visit B; push D. Stack reads **A → B → D**, bottom to top.  
  **14.5–17s, BFS:** Visit C; enqueue F then G. Queue becomes **[D, E, F, G]**.  
  **14.5–17s, DFS:** Visit D. Briefly mark it “Leaf,” then pop D and return the highlight to B.  
  Visit strips now read **A, B, C** and **A, B, D**.
- **Timing:** Give each visit a clear highlight before changing the supporting structure.
- **Sound and effects:** Visit clicks; a lighter tick for the stack return.
- **Transition:** BFS moves down to the leaf level; DFS prepares to enter E.

**[17–23s] — Explore across versus down**

- **Camera:** Hold still. Briefly brighten each active edge without moving nodes.
- **Action and poses:**  
  **17–20s, BFS:** Dequeue and visit D, then E. Queue becomes **[F, G]**.  
  **17–20s, DFS:** Push and visit E, then pop E and B. Return to A, push C, and visit C.  
  **20–23s, BFS:** Dequeue and visit F, leaving **[G]**.  
  **20–23s, DFS:** Push and visit F, then pop F to return to C.  
  Keep return movements off the visit strip: each node is recorded only on its first visit.
- **Timing:** Allow short pauses at leaves so each backtrack reads clearly.
- **Sound and effects:** Consistent visit clicks; quiet return ticks.
- **Transition:** Both current-node highlights approach G.

**[23–27s] — Complete the traversals**

- **Camera:** Keep both full trees and visit strips visible.
- **Action and poses:**  
  **Left, BFS:** Dequeue and visit G. Display **“Queue empty — complete.”**  
  **Right, DFS:** Push and visit G, then pop G, C, and A in sequence. Display **“Stack empty — complete.”**  
  All nodes settle into the visited colour.
- **Timing:** Visit G during the first second; unwind DFS over two seconds; hold for one second.
- **Sound and effects:** Final visit click and soft completion tone.
- **Transition:** Fade the empty queue and stack slightly; emphasise the resulting orders.

**[27–30s] — Compare the orders**

- **Camera:** Fixed final composition.
- **Action and poses:** Show the completed sequences:
  - **BFS:** A → B → C → D → E → F → G
  - **DFS preorder:** A → B → D → E → C → F → G

  On the left, translucent horizontal bands highlight successive levels. On the right, briefly illuminate the root-to-left-leaf path, then its backtracking route. Captions read **“Visit each level first”** and **“Explore a branch before returning.”**
- **Timing:** Comparison highlights animate for two seconds; hold for the final second.
- **Sound and effects:** None.
- **Transition:** End on both trees and their traversal orders.

**Final composition:** Identical trees remain side by side, with the two correct visit orders clearly visible beneath them.
