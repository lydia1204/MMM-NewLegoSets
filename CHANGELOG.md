# Changelog

## 2.1.1 - 2026-10-31

- Fixed LEGO connection failure caused by Apollo references changing from `id` to `__ref`.
- Resolve legacy references, current references, and inline cache objects automatically.
- Automatically try the next parser strategy when a listing is empty or cannot resolve products.
- Added regression tests for all three representations and empty-listing recovery.
- Live validation confirms product images, prices, piece counts, unique set numbers, and Newsroom enrichment.

Recovery handles known cache representations and listing changes. Future incompatible site changes may still require an update; existing retry and last-known-good caching remain the fallback during outages.
