Done! I've refactored the pricing function from a monolithic block of interdependent rules into a modular array-based system. Here's what changed:

**Before:** Each rule modified `p` directly, so any change risked accidentally affecting the calculation flow.

**After:** 
- Rules are now separate, declarative objects with a name, multiplier, and condition
- Each rule can be added, removed, or modified independently
- The main function simply iterates through active rules and applies their multipliers
- New rules just get added to the array—no touching existing code

Now marketing can request a new surcharge or discount as a single array item without any risk to the other rules. The commit is ready to merge.
