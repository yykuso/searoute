import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

/** PNG の IHDR から幅・高さ・カラータイプを読む（カラータイプ 2 = RGB、6 = RGBA） */
function readPngHeader(path: string) {
    const png = readFileSync(`${projectRoot}${path}`);
    expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
    return { width: png.readUInt32BE(16), height: png.readUInt32BE(20), colorType: png[25] };
}

describe('apple-touch-icon', () => {
    // iOS Safari のお気に入りは、透過のある touch icon を拡大せず余白付きで表示する（Issue #77）
    it.each(['public/apple-touch-icon.png', 'public/img/apple-touch-icon.png'])('%s は透過なし（RGB）の 180×180 正方形', (path) => {
        expect(readPngHeader(path)).toEqual({ width: 180, height: 180, colorType: 2 });
    });

    it('ルート直下と img/ は同じ画像', () => {
        expect(readFileSync(`${projectRoot}public/apple-touch-icon.png`).equals(readFileSync(`${projectRoot}public/img/apple-touch-icon.png`))).toBe(true);
    });
});
