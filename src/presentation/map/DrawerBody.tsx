/**
 * 詳細ドロワー本文（航路・港湾・座標）
 * application の DrawerBody 表示モデルを JSX に変換する
 */
import type { ReactNode } from 'react';
import type { ShipImage } from '../../application/ports';
import { executeDrawerAction } from '../../application/viewModels/drawerViewModel';
import type { DrawerBody as DrawerBodyModel } from '../../application/viewModels/drawerViewModel';
import { summarizeCarriage } from '../../domain/seaRoute';
import type { PortProperties, RouteDetails, RouteProperties } from '../../domain/seaRoute';

/** URL からホスト名を取得 */
export function getLinkHostname(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

/** カンマ区切り文字列をブロック行に変換 */
function BlockLines({ value, prefix = '' }: { value: string; prefix?: string }) {
    return (
        <>
            {value.split(', ').map((item, index) => (
                <span className="block" key={index}>{prefix}{item.trim()}</span>
            ))}
        </>
    );
}

function AccentBar({ color }: { color: string }) {
    return (
        <div className="mb-3">
            <div style={{ height: '4px', width: '100%', background: color, borderRadius: '6px' }}></div>
        </div>
    );
}

interface DrawerSectionProps {
    iconClass: string;
    title: string;
    titleColorClass: string;
    iconColorClass: string;
    children?: ReactNode;
}

function DrawerSection({ iconClass, title, titleColorClass, iconColorClass, children }: DrawerSectionProps) {
    if (!children) {
        return null;
    }

    return (
        <div className="mb-3 pb-2 border-b border-slate-200 flex items-center">
            <h3 className={`flex items-center justify-between text-xs font-semibold ${titleColorClass} w-24 min-w-24 text-center mr-2`}>
                <i className={`${iconClass} fa-fw mr-1 ${iconColorClass}`}></i><span className="mx-auto">{title}</span>
            </h3>
            {children}
        </div>
    );
}

const ROUTE_ACTION_CLASS = 'min-w-0 flex-1 text-left text-gray-800 text-xs cursor-pointer hover:text-blue-600 underline hover:underline transition-colors';
const LINK_CLASS = 'text-gray-800 underline text-xs hover:text-blue-600 transition-all duration-200 rounded';

function ShipImageView({ image }: { image: ShipImage }) {
    const pageUrl = `https://ja.wikipedia.org/wiki/${encodeURIComponent(image.title)}`;
    return (
        <>
            <img src={image.src} alt={image.title} className="rounded w-full object-cover max-h-36" width="400" height="400" />
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 mt-0.5 truncate block text-right underline hover:text-blue-500 transition-colors">{image.title} - Wikipedia</a>
        </>
    );
}

export function SeaRouteDrawerBody({ properties, details = {}, sourceId, shipImage = null }: {
    properties: RouteProperties;
    details?: RouteDetails;
    sourceId?: string;
    shipImage?: ShipImage | null;
}) {
    const routeId = String(properties.routeId || '');
    const lineId = String(properties.lineId || '');
    const source = sourceId || '';
    const routeName = properties.routeName || 'N/A';
    const sectionName = `${properties.portName1 || 'N/A'}～${properties.portName2 || 'N/A'}`;
    const url = details.url || properties.url || '';

    const freqInfo = details.freqInfo || properties.freqInfo;
    const info = details.info || properties.info;
    const shipName = details.shipName || properties.shipName;

    const { available: availableCarriages, allUnavailable } = summarizeCarriage(properties);
    let carriageBody: ReactNode = null;
    if (availableCarriages.length > 0) {
        carriageBody = (
            <div className="text-gray-800 text-xs">
                {availableCarriages.map((label, index) => [index > 0 ? '・' : null, <span key={label}>{label}</span>])}
            </div>
        );
    } else if (allUnavailable) {
        carriageBody = <div className="text-gray-800 text-xs">不可</div>;
    }

    return (
        <>
            <AccentBar color={properties.color || '#e5e7eb'} />
            <DrawerSection iconClass="fas fa-route" title="航路" titleColorClass="text-blue-600" iconColorClass="text-blue-500">
                <button
                    type="button"
                    className={ROUTE_ACTION_CLASS}
                    data-drawer-action="zoom-route"
                    data-route-id={routeId}
                    data-source-id={source}
                    onClick={() => executeDrawerAction('zoom-route', { routeId, sourceId: source })}
                >{routeName}</button>
            </DrawerSection>
            <DrawerSection iconClass="fas fa-map-pin" title="選択部分" titleColorClass="text-green-600" iconColorClass="text-green-500">
                <button
                    type="button"
                    className={ROUTE_ACTION_CLASS}
                    data-drawer-action="zoom-route-section"
                    data-route-id={routeId}
                    data-line-id={lineId}
                    data-source-id={source}
                    onClick={() => executeDrawerAction('zoom-route-section', { routeId, lineId, sourceId: source })}
                >{sectionName}</button>
            </DrawerSection>
            <DrawerSection iconClass="fas fa-rotate" title="運行頻度" titleColorClass="text-red-600" iconColorClass="text-red-500">
                {freqInfo ? <div className="text-gray-800 text-xs"><BlockLines value={freqInfo} /></div> : null}
            </DrawerSection>
            <DrawerSection iconClass="fas fa-car" title="航送" titleColorClass="text-orange-600" iconColorClass="text-orange-500">
                {carriageBody}
            </DrawerSection>
            <DrawerSection iconClass="fas fa-info-circle" title="情報" titleColorClass="text-yellow-600" iconColorClass="text-yellow-500">
                {info ? <div className="text-gray-800 text-xs"><BlockLines value={info} /></div> : null}
            </DrawerSection>
            <DrawerSection iconClass="fas fa-ship" title="船舶" titleColorClass="text-purple-600" iconColorClass="text-purple-500">
                {shipName ? <ul className="text-gray-800 text-xs"><BlockLines value={shipName} prefix="・" /></ul> : null}
            </DrawerSection>
            <DrawerSection iconClass="fas fa-link" title="リンク" titleColorClass="text-indigo-600" iconColorClass="text-indigo-500">
                {url ? <a href={url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>運行スケジュール - {getLinkHostname(url)}</a> : null}
            </DrawerSection>
            <div id="drawer-ship-image" className="mt-2">
                {shipImage ? <ShipImageView image={shipImage} /> : null}
            </div>
        </>
    );
}

export function PortDrawerBody({ properties, googleMapsUrl }: { properties: PortProperties; googleMapsUrl: string }) {
    return (
        <>
            <AccentBar color="#505050" />
            <DrawerSection iconClass="fas fa-map-marked-alt" title="地図" titleColorClass="text-green-600" iconColorClass="text-green-500">
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>Googleマップで開く</a>
            </DrawerSection>
            <DrawerSection iconClass="fas fa-info-circle" title="情報" titleColorClass="text-yellow-600" iconColorClass="text-yellow-500">
                {properties.info ? <div className="text-gray-800 text-xs"><BlockLines value={properties.info} /></div> : null}
            </DrawerSection>
        </>
    );
}

export function CoordinateDrawerBody({ lat, lng, address = '取得中...' }: { lat: string; lng: string; address?: string }) {
    return (
        <>
            <div className="mb-3">
                <div style={{ height: '4px', width: '100%', background: '#60a5fa', borderRadius: '6px' }}></div>
            </div>
            <div className="mb-3 pb-2 border-b border-slate-200 flex items-center">
                <h3 className="flex items-center justify-between text-xs font-semibold text-blue-600 w-24 min-w-24 text-center mr-2">
                    <i className="fas fa-location-dot fa-fw mr-1 text-blue-500"></i><span className="mx-auto">住所</span>
                </h3>
                <span id="reverse-geocode-address" className="block text-xs text-gray-800 mt-1">{address}</span>
            </div>
            <div className="mb-3 pb-2 border-b border-slate-200 flex items-center">
                <h3 className="flex items-center justify-between text-xs font-semibold text-green-600 w-24 min-w-24 text-center mr-2">
                    <i className="fas fa-map-location-dot fa-fw mr-1 text-green-500"></i><span className="mx-auto">リンク</span>
                </h3>
                <a href={`https://maps.google.com/?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="text-gray-800 underline text-xs hover:text-gray-900 transition-all">ここをGoogleマップで開く</a>
            </div>
        </>
    );
}

export function DrawerBodyView({ body }: { body: DrawerBodyModel }) {
    if (body.kind === 'route') {
        return <SeaRouteDrawerBody properties={body.properties} details={body.details} sourceId={body.sourceId} shipImage={body.shipImage} />;
    }
    if (body.kind === 'port') {
        return <PortDrawerBody properties={body.properties} googleMapsUrl={body.googleMapsUrl} />;
    }
    return <CoordinateDrawerBody lat={body.lat} lng={body.lng} address={body.address} />;
}
