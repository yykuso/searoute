import { afterEach, describe, expect, it } from 'vitest';
import { map, setMap } from '../../../js/adapters/map/mapRegistry.js';

describe('mapRegistry', () => {
    afterEach(() => setMap(null));

    it('登録したMapインスタンスをライブバインディングで共有する', () => {
        const mapInstance = { id: 'map' };

        setMap(mapInstance);

        expect(map).toBe(mapInstance);
    });
});