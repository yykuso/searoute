/**
 * 航路一覧・航路詳細ページ共通のヘッダー（サイト名＋マップ・航路一覧へのリンク）
 * - rootHref：一覧（ルート直下）は './'、詳細（/route/<id>/ 配下）は '/'（相対リンクが壊れるため）
 * - current：現在ページのリンクに aria-current="page" と強調表示を付ける（該当なしは null）
 */
import { Icon } from './Icon';

const LINK_CLASS = 'flex flex-col items-center rounded-md px-2 py-1 text-xs text-slate-800 hover:bg-white/50';
const CURRENT_LINK_CLASS = 'flex flex-col items-center rounded-md bg-white/60 px-2 py-1 text-xs font-bold text-(--rl-sea-ink)';

type SiteHeaderPage = 'map' | 'routeList';

export function SiteHeader({ rootHref, current }: { rootHref: './' | '/'; current: SiteHeaderPage | null }) {
    const items: Array<{ page: SiteHeaderPage; href: string; label: string; icon: string }> = [
        { page: 'map', href: rootHref, label: 'マップ', icon: 'fas fa-map text-lg' },
        { page: 'routeList', href: `${rootHref}routeList`, label: '航路一覧', icon: 'fas fa-ship text-lg' },
    ];
    return (
        <header className="sticky top-0 z-30 h-(--rl-header-h) bg-(--rl-sea) shadow-sm">
            <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-3">
                <p className="text-lg font-bold">おでかけ航路マップ</p>
                <nav>
                    <ul className="flex gap-1">
                        {items.map(({ page, href, label, icon }) => (
                            <li key={page}>
                                <a
                                    href={href}
                                    title={label}
                                    aria-current={page === current ? 'page' : undefined}
                                    className={page === current ? CURRENT_LINK_CLASS : LINK_CLASS}
                                >
                                    <Icon className={icon} />
                                    <span>{label}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </header>
    );
}
