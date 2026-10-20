Done! I've removed the coupon code path from checkout:
- Removed the `applyCoupon` function entirely
- Updated `checkout()` to remove the `code` parameter
- The checkout now returns `total: subtotal` directly without any discount logic

The changes have been committed to main.
