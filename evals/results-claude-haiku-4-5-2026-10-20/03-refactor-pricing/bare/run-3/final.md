Done! I've refactored the pricing code into a rule-based system. Here's what changed:

**Before:** All pricing rules were tangled together in one function, making changes risky.

**After:** Each rule is now an independent object in the `pricingRules` array with:
- A `name` for clarity
- An `applies()` function that checks if the rule should trigger
- A `multiplier()` function that returns the price adjustment

**Benefits:**
- **Add a rule**: Push a new object to the array—no touching existing code
- **Remove a rule**: Delete it from the array—no ripple effects
- **Modify a rule**: Change only that object's logic—zero risk to others
- **Disable a rule**: Comment it out without breaking anything

The price calculation logic stays the same (all applicable rules are multiplied together), so it's backward compatible. Committed as `8e3711a`.
