Done! I've restructured the pricing logic into independent rule objects. Here's what changed:

**Before:** All pricing rules were mixed into one function — changing any rule risked breaking others.

**After:** Each rule is a self-contained object in a `pricingRules` array:
- **Weekend surcharge** (Fri-Sat)
- **Gold loyalty discount**
- **Silver loyalty discount**
- **Summer season surge** (June-August)
- **Long stay discount** (7+ nights)

**To add a new rule:** Just add a new object to the array:
```javascript
{
  name: "holiday_surge",
  apply: (base, date, guest) => {
    // holiday logic
    return base * multiplier;
  }
}
```

**To remove a rule:** Delete it from the array. No touching the main function.

The behavior is identical to before—all existing functionality preserved—but marketing can now change rules with confidence. Committed with full context in the commit message.
