import { getCachedAvatar } from '../utils/avatarCache';
import { loadImage } from '@napi-rs/canvas';

// Mock loadImage
jest.mock('@napi-rs/canvas', () => ({
    loadImage: jest.fn(),
}));

describe('avatarCache', () => {
    beforeEach(() => {
        // Clear cache by reloading module? No, module state persists.
        // We can just use different URLs for each test.
        jest.clearAllMocks();
    });

    it('should return a promise that resolves to an image', async () => {
        const mockImage = { width: 100, height: 100 };
        (loadImage as jest.Mock).mockResolvedValue(mockImage);

        const url = 'http://example.com/avatar1.png';
        const image = await getCachedAvatar(url);

        expect(image).toBe(mockImage);
        expect(loadImage).toHaveBeenCalledWith(url);
    });

    it('should cache the image promise', async () => {
        const mockImage = { width: 100, height: 100 };
        (loadImage as jest.Mock).mockResolvedValue(mockImage);

        const url = 'http://example.com/avatar2.png';
        const image1 = await getCachedAvatar(url);

        // Ensure the first promise has resolved
        await new Promise(process.nextTick);

        const image2 = await getCachedAvatar(url);

        expect(image1).toBe(mockImage);
        expect(image2).toBe(mockImage);
        expect(loadImage).toHaveBeenCalledTimes(1);
    });

    it('should handle load errors and remove from cache', async () => {
        (loadImage as jest.Mock).mockRejectedValue(new Error('Load failed'));

        const url = 'http://example.com/error.png';

        await expect(getCachedAvatar(url)).rejects.toThrow('Load failed');

        // Subsequent call should retry (call loadImage again)
        (loadImage as jest.Mock).mockResolvedValue({ width: 100 });
        await getCachedAvatar(url);

        expect(loadImage).toHaveBeenCalledTimes(2);
    });
});
