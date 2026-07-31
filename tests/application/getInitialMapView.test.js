import { describe, expect, it, vi } from 'vitest';
import { getInitialMapView } from '../../js/application/getInitialMapView.js';

describe('getInitialMapView', () => {
    it('保存値がない場合は既定の中心座標とズームを返す', () => {
        const settingsRepository = { get: vi.fn().mockReturnValue(null) };

        expect(getInitialMapView(settingsRepository)).toEqual([[136.2923, 35.3622], 5]);
        expect(settingsRepository.get).toHaveBeenCalledWith('mapCenter');
        expect(settingsRepository.get).toHaveBeenCalledWith('mapZoom');
    });

    it('保存された中心座標とズームを復元する', () => {
        const settingsRepository = {
            get: vi.fn((key) => ({
                mapCenter: '[139.7,35.6]',
                mapZoom: '8.5',
            })[key]),
        };

        expect(getInitialMapView(settingsRepository)).toEqual([[139.7, 35.6], 8.5]);
    });
});