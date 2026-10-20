Done. I've removed the coupon code functionality from checkout:
- Deleted the `applyCoupon` function
- Removed the `code` parameter from `checkout()`
- The checkout now simply calculates subtotal without any discount logic

Committed as `24164cc`.
