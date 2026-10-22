import { TapetaLogo } from "../components/TapetaLogo";
import { useChrome } from "./ChromeContext";
import "./landing.css";

function Landing({ onEnter }: { onEnter: () => void }) {
  const { navigate } = useChrome();
  return (
    <main className="t-landing">
    <header className="t-landing__header">
      <TapetaLogo size={36} wordmarkSize={23} />
      <nav aria-label="Navigasi utama">
        <button type="button" onClick={onEnter}>Explore</button>
        <button type="button" onClick={() => navigate("my")}>My TAPETA</button>
        <button type="button" onClick={() => navigate("komunitas")}>Komunitas</button>
      </nav>
    </header>
    <section className="t-landing__hero">
      <div className="t-landing__copy">
        <p className="t-kicker">Peta Nusantara</p>
        <h1>Ayo Jelajah!</h1>
        <p>Temukan tempat, bagikan cerita.</p>
        <button type="button" className="t-btn t-btn--brick" onClick={onEnter}>Ayo Jelajah!</button>
      </div>
      <img
        className="t-landing__map"
        src="/assets/map/nusantara-watercolor-v2.png"
        alt="Ilustrasi cat air kepulauan Nusantara"
        fetchPriority="high"
      />
    </section>
    <footer className="t-landing__footer">
      <p>Mulai dari Pekanbaru. Peta yang tumbuh dari pengetahuan lokal.</p>
      <small>Ilustrasi editorial, bukan acuan navigasi. Koordinat destinasi tersedia di Explore.</small>
    </footer>
    </main>
  );
}

export const IntroDesktop = Landing;
export const IntroMobile = Landing;
