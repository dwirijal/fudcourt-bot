import { Image, loadImage } from '@napi-rs/canvas';

const cache = new Map<string, Promise<Image>>();
const MAX_CACHE_SIZE = 100;

/**
 * Retrieves an avatar image from cache or loads it from the URL.
 * Uses a simple LRU-like eviction policy (JavaScript Map iteration order).
 */
export function getCachedAvatar(url: string): Promise<Image> {
    if (cache.has(url)) {
        return cache.get(url)!;
    }

    // Load the image and handle errors by removing from cache so we retry next time
    const imagePromise = loadImage(url).catch((err) => {
        cache.delete(url);
        throw err;
    });

    cache.set(url, imagePromise);

    // Evict oldest entry if cache exceeds size
    if (cache.size > MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        if (firstKey) {
             cache.delete(firstKey);
        }
    }

    return imagePromise;
}
