Done! I've restructured the pricing function into a modular rule-based system. 

**What changed:**
- Each pricing rule (weekend multiplier, loyalty discounts, seasonal pricing, extended stay) is now a separate object in a `pricingRules` array
- The main `price()` function applies each rule in sequence
- Marketing can now add or remove a rule by editing the array without touching other rules

**Adding a new rule is now simple:**
```javascript
{
  name: 'newRule',
  apply: (price, context) => {
    // your logic here
    return price;
  }
}
```

The commit is ready on main.
