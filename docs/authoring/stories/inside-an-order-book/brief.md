# Brief as supplied — 2026-10-29

**Title:** Inside an Order Book  
**Duration:** 35 seconds  
**Style and tone:** Clear trading dashboard graphics on a dark navy background. Teal buy orders, coral sell orders, amber executions, and neutral white labels. Display prices to two decimal places and quantities in units.  
**Setting and initial layout:** Two price ladders sit side by side: **BUY / BIDS** on the left, highest price first; **SELL / ASKS** on the right, lowest price first. Each row displays price and total quantity. An order-detail strip below reveals individual orders when needed. A trade tape sits at the far right.  
**Characters or subjects:** Limit orders with persistent IDs, a market buy order, quantity counters, and execution markers. Use continuous trading with **price-time priority**; trades execute at the resting order’s price.

**[0–5s] — Build the book**

- **Camera:** Straight-on view of the complete dashboard; hold steady.
- **Action and poses:** Four limit-order cards arrive sequentially and settle into their price rows:
  - **B1:** Buy 100 at **99.00**
  - **B2:** Buy 80 at **98.00**
  - **S1:** Sell 70 at **101.00**
  - **S2:** Sell 120 at **102.00**

  Highlight the best bid, **99.00**, and best ask, **101.00**. A bracket between them reads **“Spread: 2.00.”** Caption: “Limit orders wait for a compatible price.”
- **Timing:** Allow one second per arrival, followed by a one-second hold.
- **Sound and effects:** Soft placement clicks.
- **Transition:** Keep the populated book visible as another buy order approaches.

**[5–9s] — Join the queue**

- **Camera:** Push slightly toward the best bid and its order-detail strip.
- **Action and poses:** **B3: Buy 60 at 99.00** arrives. The 99.00 row’s total increases from **100 to 160**. Expand its detail strip to show **B1: 100 → B3: 60**, labelled **“Earlier orders first at the same price.”** B3 slides behind B1. No trade occurs.
- **Timing:** Arrival takes one second; queue expansion takes one second; hold for two seconds.
- **Sound and effects:** One placement click.
- **Transition:** Pull back enough to reveal an incoming sell order above the dashboard.

**[9–15s] — Match and partially fill**

- **Camera:** Frame the incoming order, best bid, and trade tape together.
- **Action and poses:** **S3: Sell 130, limit 99.00** arrives. Highlight **“Sell limit ≤ best bid: match.”**
  1. S3 matches B1 for **100 at 99.00**. Remove B1; show S3’s remaining quantity falling to **30**. Append the execution to the tape.
  2. S3 then matches **30** against B3 at **99.00**. S3 reaches zero and disappears as **“Filled.”**
  3. B3 remains with **30 of 60**, labelled **“Partially filled.”** The best-bid row now shows **99.00 | 30**.

  Keep both trades separate on the tape.
- **Timing:** First execution takes two seconds; second takes two seconds; hold the remaining order for two seconds.
- **Sound and effects:** Two distinct execution ticks; brief amber flashes at each match.
- **Transition:** Fade the explanatory label while preserving B3’s remaining quantity.

**[15–22s] — A market order crosses price levels**

- **Camera:** Shift emphasis to the ask ladder and trade tape.
- **Action and poses:** **M1: Market buy 100** enters with the caption **“Take the lowest available sell price first.”**
  1. Match **70 at 101.00** against S1. Remove S1; M1 shows **30 remaining**.
  2. Move the execution highlight down to S2. Match **30 at 102.00**.
  3. Mark M1 **“Filled.”** S2 remains at **102.00 | 90**.

  Append both executions to the tape. Update the best ask to **102.00** and the spread to **3.00**.
- **Timing:** Order arrival takes one second; each execution takes two seconds; hold the resulting book for two seconds.
- **Sound and effects:** Two execution ticks with separate amber pulses.
- **Transition:** A cancellation request appears beside B3.

**[22–27s] — Cancel an unfilled remainder**

- **Camera:** Emphasise the bid ladder, keeping the trade tape visible.
- **Action and poses:** Display **“Cancel B3: remaining 30.”** Outline B3, strike through its remaining quantity, and remove it. The **99.00** bid row disappears. **B2: 80 at 98.00** becomes the best bid. Update the spread to **4.00**. Caption: **“Cancellation removes the unfilled remainder.”** The trade tape receives no new entry.
- **Timing:** Request appears for one second; removal takes one second; updated book holds for three seconds.
- **Sound and effects:** Muted removal click, distinct from the execution sound.
- **Transition:** A fresh buy limit order approaches the gap between the best prices.

**[27–31s] — Improve the bid**

- **Camera:** Return to the full dashboard.
- **Action and poses:** **B4: Buy 50 at 100.00** arrives and rests above B2. Highlight the updated best prices: **Bid 100.00 / Ask 102.00**. The spread contracts to **2.00**. Caption: **“A better bid can narrow the spread without a trade.”**
- **Timing:** Arrival and row insertion take two seconds; hold for two seconds.
- **Sound and effects:** Soft placement click.
- **Transition:** Dim the incoming-order area and emphasise the final book.

**[31–35s] — Read the final state**

- **Camera:** Hold a clear, stable overview.
- **Action and poses:** Keep the remaining orders visible:

  | Buy quantity | Bid price | Ask price | Sell quantity |
  |---:|---:|---:|---:|
  | 50 | 100.00 | 102.00 | 90 |
  | 80 | 98.00 | — | — |

  Sequentially reveal three compact captions: **“Rest: wait in the book”**, **“Match: execute compatible orders”**, and **“Cancel: withdraw the remainder.”** Keep the four completed executions visible on the trade tape.
- **Timing:** Reveal captions during the first three seconds; hold everything for the final second.
- **Sound and effects:** None.
- **Transition:** End on the dashboard.

**Final composition:** Best bid **100.00**, best ask **102.00**, spread **2.00**. The tape shows **100 at 99.00**, **30 at 99.00**, **70 at 101.00**, and **30 at 102.00**. Filled and cancelled quantities no longer appear in the resting book.
