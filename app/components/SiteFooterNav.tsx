import Link from 'next/link';
import { ASSET_PAGES, assetPath } from '../../lib/asset-pages';

/**
 * Shared internal-linking block used on content and asset pages.
 * Establishes the link graph: every page -> dashboard, overview, methodology,
 * market breadth, and the asset pages.
 */
export function SiteFooterNav() {
  return (
    <footer className="border-t border-gray-800 pt-6 mt-8 text-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-gray-300">
        <div>
          <div className="text-gray-500 uppercase text-xs mb-2">Dashboard</div>
          <Link href="/" className="block hover:text-white">Live BMSB Dashboard</Link>
        </div>
        <div>
          <div className="text-gray-500 uppercase text-xs mb-2">Learn</div>
          <Link href="/what-is-the-bull-market-support-band" className="block hover:text-white">What is the BMSB?</Link>
          <Link href="/methodology" className="block hover:text-white">Methodology</Link>
          <Link href="/market-breadth" className="block hover:text-white">Market Breadth</Link>
        </div>
        <div className="col-span-2">
          <div className="text-gray-500 uppercase text-xs mb-2">Assets</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {ASSET_PAGES.map((a) => (
              <Link key={a.slug} href={assetPath(a)} className="hover:text-white">
                {a.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
