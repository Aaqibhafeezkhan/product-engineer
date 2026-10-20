Done! I've restructured the pricing code from a single monolithic function into a composable rules array. Now each rule is isolated:

- **weekend**: Friday/Saturday 1.2x surcharge
- **loyalty**: Gold/silver member discounts
- **summer**: May–July 1.3x surcharge  
- **long-stay**: 7+ nights 0.85x discount

Any of these can be added, removed, or modified independently without affecting the others. Marketing can now request changes with much lower risk of breaking existing logic.
