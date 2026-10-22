import type { CommunityProps } from "./Docs";
import { DesainTopbar } from "./Topbar";

export function Community({ cityName, provinceName, destinations, categoriesById, onOpenCityPicker, onOpenDestination, onOpenContribute }: CommunityProps) {
  return <div className="t-app t-app--doc t-community">
    <DesainTopbar active="komunitas" cityName={cityName} provinceName={provinceName} onOpenCityPicker={onOpenCityPicker} />
    <main className="t-doc">
      <header className="t-doc__head">
        <p className="t-doc__eyebrow">Komunitas · {cityName}</p>
        <h1 className="t-doc__title">Tahu tempat yang belum tercatat?</h1>
        <p>Bagikan pengetahuan lokalmu. Setiap usulan diperiksa sebelum tampil di peta.</p>
        <button className="t-btn t-btn--brick" onClick={onOpenContribute}>Tambah kontribusi</button>
      </header>
      <div className="t-doc__grid">
        <section>
          <h2>Destinasi yang sudah terbit</h2>
          {destinations.length === 0 ? <p>Belum ada destinasi terbit yang dimuat untuk kota ini. Kamu bisa mulai dengan mengusulkan tempat dan menyertakan sumbernya.</p>
            : destinations.map((item) => <article key={item.id} className="t-feed__card">
              <h3>{item.name}</h3><p>{categoriesById.get(item.categoryId)?.name} · {item.address}</p>
              <button className="t-auth__link" onClick={() => onOpenDestination(item.id)}>Lihat di peta</button>
            </article>)}
        </section>
        <aside className="t-board">
          <h2>Cara berkontribusi</h2>
          <ol><li>Pilih titik lokasi di peta.</li><li>Isi nama, alamat, kategori, dan sumber yang bisa diperiksa.</li><li>Kirim setelah masuk. Ikuti catatan moderator di My TAPETA.</li></ol>
          <p>Usulan dan identitas kontributor tidak ditampilkan di halaman publik ini.</p>
          <p>Poin, lencana, dan peringkat belum diaktifkan.</p>
        </aside>
      </div>
    </main>
  </div>;
}
