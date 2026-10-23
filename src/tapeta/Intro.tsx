import { useEffect, useRef } from "react";
import { TapetaLogo } from "../components/TapetaLogo";
import "./landing.css";

function Sailboat() {
  return (
    <g fill="none">
      <path d="M57 12v46M82 8v50" stroke="#776653" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M54 19C43 27 35 41 33 56l21 1V19Z" fill="#fff9e9" fillOpacity=".84" stroke="#91836b" strokeOpacity=".76" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M79 15C66 26 60 40 59 57h20V15Z" fill="#f4e9cd" fillOpacity=".88" stroke="#91836b" strokeOpacity=".76" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M87 21c9 10 14 22 15 35H82l5-35Z" fill="#fff8e7" fillOpacity=".78" stroke="#91836b" strokeOpacity=".68" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M57 17 39 50m43-39L65 50" stroke="#c1a77e" strokeOpacity=".7" strokeWidth=".8" />
      <path d="M20 59c20 5 55 5 84-1l-12 12c-23 5-48 4-63-1L20 59Z" fill="#ad7956" fillOpacity=".9" stroke="#745c48" strokeOpacity=".8" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="m35 62 9 8m8-7 9 9m8-9 9 8m8-10 8 7" stroke="#dfbd90" strokeOpacity=".72" strokeWidth="1" strokeLinecap="round" />
      <path d="M11 72c9 4 17 4 25 2m48 2c10 1 18-1 26-5M20 78c7 2 13 2 19 1" stroke="#fffdf5" strokeOpacity=".76" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

function Compass() {
  return (
    <svg className="t-landing__compass" viewBox="0 0 58 58" fill="none" aria-hidden="true">
      <circle cx="29" cy="29" r="19" stroke="#758078" strokeOpacity=".55" strokeWidth="1" />
      <circle cx="29" cy="29" r="3" fill="#b63a2e" fillOpacity=".65" />
      <path d="M29 7v15M29 36v15M7 29h15M36 29h15" stroke="#758078" strokeOpacity=".55" strokeWidth="1" />
      <path d="m29 12 3 13-3 4-3-4 3-13Z" fill="#b63a2e" fillOpacity=".72" />
      <path d="m29 46-3-13 3-4 3 4-3 13Z" fill="#758078" fillOpacity=".5" />
      <text x="29" y="5" textAnchor="middle">U</text>
      <text x="53" y="32" textAnchor="middle">T</text>
      <text x="29" y="58" textAnchor="middle">S</text>
      <text x="5" y="32" textAnchor="middle">B</text>
    </svg>
  );
}

function Landing({ onEnter }: { onEnter: () => void }) {
  const northMotion = useRef<SVGAnimateMotionElement | null>(null);
  const southMotion = useRef<SVGAnimateMotionElement | null>(null);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motions = [northMotion.current, southMotion.current].filter(
      (motion): motion is SVGAnimateMotionElement => motion !== null,
    );
    let running = false;
    const syncMotion = () => {
      if (motionPreference.matches) {
        if (running) motions.forEach((motion) => motion.endElement());
        running = false;
      } else if (!running) {
        motions.forEach((motion) => motion.beginElement());
        running = true;
      }
    };

    syncMotion();
    motionPreference.addEventListener("change", syncMotion);
    return () => {
      motionPreference.removeEventListener("change", syncMotion);
      if (running) {
        motions.forEach((motion) => motion.endElement());
      }
    };
  }, []);

  return (
    <main className="t-landing">
      <section className="t-landing__hero" aria-label="Intro TAPETA">
        <div className="t-landing__mapstage" aria-hidden="true">
          <img
            className="t-landing__map"
            src="/assets/map/nusantara-watercolor-v2.png"
            alt=""
            fetchPriority="high"
          />
          <svg className="t-landing__boats" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <path id="t-landing-route-north" className="t-landing__boat-route" d="M300 390C240 330 260 285 350 270 460 252 610 270 720 315S920 375 1010 335 1200 295 1320 350 1500 425 1510 520 1430 660 1300 730 1050 805 870 800 560 825 420 760 220 650 250 520 280 435 300 390Z" />
              <path id="t-landing-route-south" className="t-landing__boat-route" d="M380 790C480 740 620 720 760 745S1020 790 1140 755 1380 715 1460 665 1530 590 1490 540 1380 680 1240 760 980 865 790 865 500 850 380 790Z" />
            </defs>
            <g className="t-landing__boat">
              <g className="t-landing__boat-motion">
                <animateMotion ref={northMotion} begin="indefinite" className="t-landing__boat-animation" dur="10s" rotate="0" repeatCount="indefinite">
                  <mpath href="#t-landing-route-north" />
                </animateMotion>
                <g className="t-landing__boat-art" transform="translate(-60 -41) scale(.78)"><Sailboat /></g>
              </g>
              <g className="t-landing__boat-static" transform="translate(300 390)"><g transform="translate(-60 -41) scale(.78)"><Sailboat /></g></g>
            </g>
            <g className="t-landing__boat">
              <g className="t-landing__boat-motion">
                <animateMotion ref={southMotion} begin="indefinite" className="t-landing__boat-animation" dur="12s" rotate="0" repeatCount="indefinite">
                  <mpath href="#t-landing-route-south" />
                </animateMotion>
                <g className="t-landing__boat-art" transform="translate(-60 -41) scale(.66)"><Sailboat /></g>
              </g>
              <g className="t-landing__boat-static" transform="translate(380 790)"><g transform="translate(-60 -41) scale(.66)"><Sailboat /></g></g>
            </g>
          </svg>
          <div className="t-landing__maplabels">
            <span className="t-landing__label t-landing__label--sumatra">SUMATRA</span>
            <span className="t-landing__label t-landing__label--kalimantan">KALIMANTAN</span>
            <span className="t-landing__label t-landing__label--jawa">JAWA</span>
            <span className="t-landing__label t-landing__label--sulawesi">SULAWESI</span>
            <span className="t-landing__label t-landing__label--maluku">MALUKU</span>
            <span className="t-landing__label t-landing__label--papua">PAPUA</span>
            <span className="t-landing__label t-landing__label--nusa">NUSA TENGGARA</span>
            <span className="t-landing__label t-landing__label--sea-south">LAUT CINA SELATAN</span>
            <span className="t-landing__label t-landing__label--sea-pacific">SAMUDRA PASIFIK</span>
            <span className="t-landing__label t-landing__label--sea-banda">LAUT BANDA</span>
          </div>
        </div>

        <header className="t-landing__header">
          <div className="t-landing__brand">
            <TapetaLogo size={48} showWordmark={false} />
            <span className="t-landing__brandcopy">
              <strong>TAPETA</strong>
              <small>PETA EKSPLORASI INDONESIA</small>
            </span>
          </div>
          <div className="t-landing__entry">
            <span>Kunjungan pertama? Biar dapat cerita.</span>
            <button type="button" className="t-landing__skip" onClick={onEnter}>
              Lewati intro <span aria-hidden="true">→</span>
            </button>
          </div>
        </header>

        <div className="t-landing__copy">
          <h1>Ayo Jelajah!</h1>
          <p className="t-kicker">NUSANTARA</p>
          <p>Temukan tempat, bagikan cerita.</p>
          <button type="button" className="t-btn t-btn--brick" onClick={onEnter}>
            Ayo Jelajah! <span aria-hidden="true">→</span>
          </button>
        </div>

        <footer className="t-landing__footer">
          <div className="t-landing__footer-note">
            <Compass />
            <small>Peta ilustrasi · Bukan skala sebenarnya</small>
          </div>
          <button type="button" className="t-landing__map-cta" onClick={onEnter}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span>Ketuk peta untuk menjelajahi Indonesia</span>
          </button>
        </footer>
      </section>
    </main>
  );
}

export const IntroDesktop = Landing;
export const IntroMobile = Landing;
