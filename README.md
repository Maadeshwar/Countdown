# The Moment

A minimal, responsive countdown page for October 30, 2026 at 12:00 AM India Standard Time. The deployable site is in `dist/`. It has no package dependencies or external image and font requests. The quiet clock beat is synthesized in the browser once per second and starts automatically when the browser permits audio; browser autoplay restrictions may defer it until the first click or key press.

## Preview

```powershell
python -m http.server 8788 --directory D:\Countdown\dist
```

Open `http://127.0.0.1:8788/`. Publish the contents of `dist/` as the root of a static site. The target date is defined near the top of `dist/script.js`.
