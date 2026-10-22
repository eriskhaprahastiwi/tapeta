import { ChevronDownIcon } from "../components/Icons";
import { TapetaLogo } from "../components/TapetaLogo";
import { useChrome, type NavKey } from "./ChromeContext";

export type { NavKey };

const LABELS: Record<NavKey, string> = {
  explore: "Explore",
  my: "My TAPETA",
  komunitas: "Komunitas",
};

export interface DesainTopbarProps {
  active: NavKey;
  cityName: string;
  provinceName: string;
  onOpenCityPicker: () => void;
  /** Override opsional; default memakai ChromeContext. */
  onOpenHome?: () => void;
}

export function DesainTopbar({ active, cityName, provinceName, onOpenCityPicker, onOpenHome }: DesainTopbarProps) {
  const { navigate, account, openHome } = useChrome();
  const goHome = onOpenHome ?? openHome;
  return (
    <header className="t-topbar">
      <div className="t-topbar__brand">
        <TapetaLogo size={30} wordmarkSize={19} onClick={goHome} />
      </div>
      <button type="button" className="t-citypill" onClick={onOpenCityPicker}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M7 1c-2.3 0-4 1.7-4 4 0 3 4 8 4 8s4-5 4-8c0-2.3-1.7-4-4-4Zm0 2.5c.9 0 1.6.7 1.6 1.5S7.9 6.6 7 6.6 5.4 5.9 5.4 5 6.1 3.5 7 3.5Z"
            fill="#A95038"
          />
        </svg>
        <span className="t-citypill__name">{cityName}</span>
        <span className="t-citypill__prov">{provinceName}</span>
        <ChevronDownIcon size={14} className="t-citypill__chev" />
      </button>
      <nav className="t-topnav" aria-label="Navigasi utama">
        {(["explore", "my", "komunitas"] as NavKey[]).map((key) =>
          key === active ? (
            <span key={key} className="t-topnav__item t-topnav__item--active" aria-current="page">
              {LABELS[key]} <span className="t-topnav__dot" aria-hidden="true" />
            </span>
          ) : (
            <button
              key={key}
              type="button"
              className="t-topnav__link t-topnav__link--btn"
              onClick={() => navigate(key)}
            >
              {LABELS[key]}
            </button>
          ),
        )}
        <span className="t-topnav__sep" aria-hidden="true" />
        <span className="t-topnav__account">
          <button
            type="button"
            className="t-topnav__notif"
            onClick={account.onOpenNotifications}
            aria-label={
              account.unreadCount > 0
                ? `Notifikasi, ${account.unreadCount} belum dibaca`
                : "Notifikasi"
            }
            aria-expanded={account.notificationOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
            {account.unreadCount > 0 && <i className="t-topnav__badge" aria-hidden="true" />}
          </button>
          {active === "my" && account.signedIn && <button type="button" className="t-topnav__notif" onClick={account.onSignOut} aria-label="Keluar dari akun" title="Keluar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg></button>}
          {account.signedIn ? (
            <button
              type="button"
              className="t-topnav__avatar"
              onClick={account.onOpenAccount}
              aria-label="Buka menu akun"
              aria-expanded={account.accountMenuOpen}
            >
              {account.initials}
            </button>
          ) : (
            <button type="button" className="t-btn t-btn--brick t-btn--brick-sm" onClick={account.onOpenAuth}>
              Masuk
            </button>
          )}
        </span>
      </nav>
    </header>
  );
}
