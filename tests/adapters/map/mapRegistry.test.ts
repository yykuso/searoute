import { afterEach, describe, expect, it } from 'vitest';
import { map, setMap } from '../../../src/adapters/map/mapRegistry';

describe('mapRegistry', () => {
    afterEach(() => setMap(null));

    it('登録したMapインスタンスをライブバインディングで共有する', () => {
        const mapInstance = { id: 'map' };

        setMap(mapInstance);

        expect(map).toBe(mapInstance);
    });
});