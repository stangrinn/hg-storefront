# Video Optimization Guide

## Current Issues Fixed

### 1. ✅ Video Element Always in DOM
- Changed from `*ngIf` to conditional visibility using CSS classes
- **Benefit**: Browser can cache the video element and reuse it
- **Result**: No re-downloading on subsequent hovers

### 2. ✅ Intelligent Preloading Strategy
- Uses `preload="metadata"` initially (fast, lightweight)
- Full video loads when:
  - Component becomes visible (IntersectionObserver)
  - User first hovers over the image
- **Benefit**: Faster initial page load, video ready when needed

### 3. ✅ Cache Headers on Backend
- Added `cacheHeader: 'public, max-age=31536000, immutable'` to AssetServerPlugin
- **Benefit**: Browser caches video files for 1 year

### 4. ✅ Performance Improvements
- Using `requestAnimationFrame` instead of `setTimeout` for smoother playback
- Track `videoLoadedOnce` to avoid redundant loading
- Proper z-index management to keep hidden video from interfering

## Additional Recommendations

### Video File Optimization

Current videos are **too large** (16-25 MB). Recommended optimizations:

#### 1. **Compress Videos**
```bash
# Install ffmpeg if not already installed
brew install ffmpeg

# Compress video with H.264 codec (good quality, small size)
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset slow \
  -c:a aac -b:a 128k -movflags +faststart output.mp4
```

**Parameters explained:**
- `-crf 28`: Quality (18-28 recommended, lower = better quality but larger file)
- `-preset slow`: Compression efficiency (slower = better compression)
- `-movflags +faststart`: Enables progressive download (video plays while downloading)

#### 2. **Create Multiple Quality Versions**
```bash
# Low quality for mobile (1-2 MB)
ffmpeg -i input.mp4 -c:v libx264 -crf 32 -vf scale=720:-2 \
  -c:a aac -b:a 96k -movflags +faststart output-mobile.mp4

# Medium quality for desktop (3-5 MB)
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -vf scale=1080:-2 \
  -c:a aac -b:a 128k -movflags +faststart output-desktop.mp4
```

#### 3. **Use Modern Codecs (Optional)**
```bash
# WebM format with VP9 codec (better compression than H.264)
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 \
  -c:a libopus -movflags +faststart output.webm
```

### Target File Sizes

| Screen Size | Recommended Size | Current Size | Improvement |
|-------------|-----------------|--------------|-------------|
| Mobile      | 1-2 MB          | 16-25 MB     | ~90% reduction |
| Desktop     | 3-5 MB          | 16-25 MB     | ~75% reduction |

### Implementation: Responsive Video Loading

You can implement device-based video loading:

```typescript
// In asset-gallery.component.ts
private getOptimizedVideoSource(): string | null {
    if (!this.videoSource) return null;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const basePath = this.videoSource.replace('.mp4', '');
    
    return isMobile 
        ? `${basePath}-mobile.mp4`
        : `${basePath}-desktop.mp4`;
}
```

### Server-Side Optimization

If using Nginx as reverse proxy, add these cache headers:

```nginx
location ~* \.(mp4|webm|ogg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Accept-Ranges bytes;
}
```

### Content Delivery Network (CDN)

For production, consider using a CDN:
- **Cloudflare**: Free tier includes video caching
- **AWS CloudFront**: Good for large files
- **Bunny CDN**: Affordable option with good performance

## Testing

### Check Cache Headers
```bash
curl -I http://localhost:3000/assets/source/your-video.mp4
```

Should see:
```
Cache-Control: public, max-age=31536000, immutable
Accept-Ranges: bytes
```

### Measure Load Time
1. Open Chrome DevTools → Network tab
2. Filter by "Media"
3. Reload page
4. Check:
   - First load: Should see full download
   - Second load: Should see "(from disk cache)" or status 304

## Mobile Considerations

For mobile devices, consider:
1. **Long press** gesture instead of hover
2. **Autoplay with sound muted** on first tap
3. **Reduce video quality** for slower connections

## Summary

✅ **What was fixed:**
- Video caching now works properly
- Intelligent preloading reduces initial load time
- Backend cache headers improve browser caching
- Video element stays in DOM for reuse

⚠️ **What you should do next:**
1. **Compress video files** to 3-5 MB (desktop) or 1-2 MB (mobile)
2. Use `-movflags +faststart` for progressive download
3. Consider creating multiple quality versions
4. Test on slow 3G connection to verify performance

🎯 **Expected results:**
- Initial page load: 2-3 seconds faster
- Hover response: Instant (video already loaded)
- Bandwidth savings: ~80% reduction
- Better user experience on mobile devices
