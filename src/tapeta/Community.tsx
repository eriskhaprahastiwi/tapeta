import { useEffect, useRef, useState } from "react";
import type { Category, Destination } from "../types";
import type { PersonalPlace } from "../lib/personal";
import { supabase, requireBackend } from "../lib/supabase";
import {
  COMMUNITY_RULES,
  createForumPost,
  forumAction,
  loadComments,
  loadForum,
  loadPolls,
  type ForumPost,
  type PostKind,
  type ForumComment,
  type ProposalPoll,
} from "../lib/forum";
import { DesainTopbar } from "./Topbar";
import { useChrome } from "./ChromeContext";
import { loadCommunityVisitLeaderboard, type CommunityVisitLeaderboardEntry } from "../lib/community";
export interface CommunityProps {
  cityId: string;
  cityName: string;
  provinceName: string;
  destinations: Destination[];
  categoriesById: Map<string, Category>;
  onBack: () => void;
  onOpenCityPicker: () => void;
  onOpenDestination: (id: string) => void;
  onOpenAuth: () => void;
  onOpenContribute: () => void;
  onOpenPersonalPlace: (place: PersonalPlace) => Promise<void>;
}
const TABS: { kind: PostKind; label: string; description: string }[] = [
  {
    kind: "story",
    label: "Cerita kunjungan",
    description: "Pengalaman dan dokumentasi warga saat mengunjungi tempat.",
  },
  {
    kind: "issue",
    label: "Issue",
    description:
      "Laporkan masalah akses, fasilitas, atau informasi lokasi yang berubah.",
  },
  {
    kind: "qna",
    label: "Q&A",
    description: "Tanya warga dan bagikan jawaban yang membantu.",
  },
];
const message = (e: unknown) =>
  e instanceof Error ? e.message : "Permintaan belum berhasil. Coba lagi.";
export function Community(props: CommunityProps) {
  const { account } = useChrome();
  const [kind, setKind] = useState<PostKind>("story");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [posts, setPosts] = useState<ForumPost[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [compose, setCompose] = useState(false),
    [more, setMore] = useState(false),
    [hasMore, setHasMore] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    let active = true;
    generation.current++;
    setPosts([]);
    setLoading(true);
    setError("");
    setCompose(false);
    if (!supabase) {
      setLoading(false);
      setError(
        "Komunitas belum terhubung ke server. Posting akan tersedia setelah layanan komunitas diaktifkan.",
      );
      return;
    }
    void loadForum(props.cityId, kind)
      .then((rows) => {
        if (active) {
          setPosts(rows);
          setHasMore(rows.length === 20);
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [props.cityId, kind, reload, account.signedIn]);
  async function nextPage() {
    if (more) return;
    setMore(true);
    setError("");
    const request = generation.current;
    try {
      const rows = await loadForum(
        props.cityId,
        kind,
        posts.at(-1)?.created_at,
      );
      if (request === generation.current) {
        setPosts((current) => [
          ...current,
          ...rows.filter((r) => !current.some((p) => p.id === r.id)),
        ]);
        setHasMore(rows.length === 20);
      }
    } catch (e) {
      if (request === generation.current) setError(message(e));
    } finally {
      setMore(false);
    }
  }
  return (
    <div className="t-app t-app--account">
      <DesainTopbar
        active="komunitas"
        cityName={props.cityName}
        provinceName={props.provinceName}
        onOpenCityPicker={props.onOpenCityPicker}
      />
      <main className="t-forum">
        <header className="t-forum__header">
          <div>
            <p className="t-community__eyebrow">KOMUNITAS · {props.cityName}</p>
            <h1>Cerita dan obrolan warga</h1>
            <p>Berbagi pengalaman, membahas masalah, dan saling menjawab.</p>
          </div>
          <button
            className="t-btn t-btn--brick"
            onClick={() =>
              account.signedIn ? setCompose(!compose) : props.onOpenAuth()
            }
          >
            {compose ? "Tutup formulir" : "Buat posting"}
          </button>
        </header>
        <div className="t-forum__layout">
          <section>
            <div
              className="t-forum__tabs"
              role="group"
              aria-label="Kategori posting"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.kind}
                  aria-pressed={kind === tab.kind}
                  onClick={() => setKind(tab.kind)}
                >
                  {tab.label}
                </button>
              ))}
              <button
                aria-pressed={showLeaderboard}
                onClick={() => setShowLeaderboard(true)}
              >
                Leaderboard kontribusi
              </button>
            </div>
            {showLeaderboard && (
              <LeaderboardPanel
                cityId={props.cityId}
                cityName={props.cityName}
                onClose={() => setShowLeaderboard(false)}
              />
            )}
            {!showLeaderboard && <>
            <p>{TABS.find((t) => t.kind === kind)?.description}</p>
            {compose && (
              <PostForm
                key={`${props.cityId}:${kind}`}
                city={props.cityId}
                kind={kind}
                destinations={props.destinations}
                onSaved={() => {
                  setCompose(false);
                  setReload((n) => n + 1);
                }}
              />
            )}
            {error && (
              <p className="t-forum__error" role="alert">
                {error}{" "}
                {supabase && (
                  <button onClick={() => setReload((n) => n + 1)}>
                    Coba lagi
                  </button>
                )}
              </p>
            )}
            {loading ? (
              <p role="status">Memuat obrolan…</p>
            ) : !error && posts.length === 0 ? (
              <div className="t-forum__empty">
                <h2>
                  Belum ada{" "}
                  {TABS.find((t) => t.kind === kind)?.label.toLowerCase()}
                </h2>
                <p>Mulai obrolan pertama di {props.cityName}.</p>
              </div>
            ) : null}
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                signedIn={account.signedIn}
                onAuth={props.onOpenAuth}
                onChanged={() => setReload((n) => n + 1)}
                onOpenDestination={props.onOpenDestination}
              />
            ))}
            {hasMore && (
              <button
                className="t-btn t-btn--ghost"
                disabled={more}
                onClick={() => void nextPage()}
              >
                {more ? "Memuat…" : "Muat posting berikutnya"}
              </button>
            )}
            </>}
          </section>
          <aside>
            <details className="t-forum__rules">
              <summary>Aturan komunitas</summary>
              <div className="t-forum__rules-body">
              <ul>
                {COMMUNITY_RULES.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
              <p>
                Teks diperiksa otomatis. Konten meragukan, gambar, dan laporan
                masuk antrean verifikasi. Kamu akan mendapat alasan jika
                pengiriman ditolak.
              </p>
              </div>
            </details>
            <details className="t-forum__rules">
              <summary>Validasi usulan lokasi</summary>
              <p>
                Bantu memeriksa apakah tempat yang diusulkan benar. Satu akun
                memiliki satu suara, dan pengusul tidak dapat memilih usulannya
                sendiri.
              </p>
              <p>
                Polling berlangsung 72 jam. Minimal 3 suara dan dukungan dua
                pertiga menjadi bahan verifikasi; hasilnya tidak otomatis
                menerbitkan lokasi.
              </p>
              <ProposalPolls
                key={props.cityId}
                city={props.cityId}
                signedIn={account.signedIn}
                onAuth={props.onOpenAuth}
              />
            </details>
          </aside>
        </div>
      </main>
    </div>
  );
}
function LeaderboardPanel({ cityId, cityName, onClose }: { cityId: string; cityName: string; onClose: () => void }) {
  const [scope, setScope] = useState<"local" | "national">("local");
  const [rows, setRows] = useState<CommunityVisitLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    if (!supabase) { setLoading(false); setError("Leaderboard belum terhubung ke server."); return; }
    void loadCommunityVisitLeaderboard(supabase, scope === "local" ? cityId : null)
      .then((data) => { if (active) setRows(data); })
      .catch((cause) => { if (active) setError(message(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cityId, scope]);
  return <section className="t-forum__leaderboard" aria-labelledby="community-leaderboard-title">
    <div className="t-forum__leaderboard-head"><div><h2 id="community-leaderboard-title">Leaderboard kontribusi</h2><p>Kontributor dengan kunjungan terverifikasi terbanyak.</p></div><button className="t-btn t-btn--ghost" onClick={onClose}>Kembali ke komunitas</button></div>
    <div className="t-forum__scope"><button aria-pressed={scope === "local"} onClick={() => setScope("local")}>Lokal: {cityName}</button><button aria-pressed={scope === "national"} onClick={() => setScope("national")}>Nasional: seluruh Indonesia</button></div>
    {loading ? <p role="status">Memuat leaderboard…</p> : error ? <p role="alert" className="t-forum__error">{error}</p> : rows.length === 0 ? <p>Belum ada kontribusi terverifikasi.</p> : <ol className="t-forum__leaders">{rows.map((row, index) => <li key={row.profileKey ?? `${row.displayLabel}-${index}`}><span>{index + 1}</span><strong>{row.displayLabel}</strong><em>{row.visitedCount} kunjungan</em></li>)}</ol>}
  </section>;
}
function PostForm({
  city,
  kind,
  destinations,
  onSaved,
}: {
  city: string;
  kind: PostKind;
  destinations: Destination[];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [destination, setDestination] = useState(""),
    [files, setFiles] = useState<File[]>([]),
    [agreed, setAgreed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="t-forum__compose"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          await createForumPost(city, kind, destination, title, body, files);
          onSaved();
        } catch (e) {
          setError(message(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Buat {TABS.find((t) => t.kind === kind)?.label.toLowerCase()}</h2>
      <label>
        Lokasi {kind !== "qna" ? "*" : "(opsional)"}
        <select
          required={kind !== "qna"}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        >
          <option value="">Pilih lokasi</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      {kind !== "qna" && destinations.length === 0 && (
        <p>
          Belum ada lokasi terbit di kota ini. Cerita dan issue memerlukan
          lokasi yang sudah tersedia.
        </p>
      )}
      <label>
        Judul
        <input
          required
          minLength={5}
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        {kind === "qna" ? "Pertanyaan" : "Cerita atau penjelasan"}
        <textarea
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <label>
        Dokumentasi (opsional)
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        <small>
          Maksimal 4 foto, masing-masing 5 MB. Foto diperiksa sebelum
          dipublikasikan.
        </small>
      </label>
      <label className="t-forum__check">
        <input
          type="checkbox"
          required
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        Saya mengikuti aturan komunitas dan memiliki izin atas dokumentasi.
      </label>
      {error && (
        <p role="alert" className="t-forum__error">
          {error}
        </p>
      )}
      <button
        className="t-btn t-btn--brick"
        disabled={busy || !agreed || (!destination && kind !== "qna")}
      >
        {busy ? "Mengirim…" : "Kirim posting"}
      </button>
    </form>
  );
}
function PostCard({
  post,
  signedIn,
  onAuth,
  onChanged,
  onOpenDestination,
}: {
  post: ForumPost;
  signedIn: boolean;
  onAuth: () => void;
  onChanged: () => void;
  onOpenDestination: (id: string) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false),
    [comments, setComments] = useState<ForumComment[]>([]),
    [text, setText] = useState(""),
    [report, setReport] = useState(false),
    [reason, setReason] = useState(""),
    [images, setImages] = useState<string[]>([]),
    [commentsLoading, setCommentsLoading] = useState(false);
  useEffect(() => {
    let active = true;
    if (!post.documentation.length) return;
    void requireBackend()
      .storage.from("community-documentation")
      .createSignedUrls(post.documentation, 3600)
      .then(({ data, error }) => {
        if (active) {
          if (error) setError("Dokumentasi belum dapat dimuat.");
          else
            setImages(
              (data ?? [])
                .map((i) => i.signedUrl)
                .filter((url): url is string => Boolean(url)),
            );
        }
      });
    return () => {
      active = false;
    };
  }, [post.documentation]);
  async function act(action: string, value = 1, content = "") {
    if (!signedIn) {
      onAuth();
      return;
    }
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await forumAction(post.id, action, content, value);
      if (action === "comment") {
        setText("");
        setComments(await loadComments(post.id));
      } else if (action === "report") {
        setReport(false);
        setReason("");
        setError("Laporan diterima untuk diperiksa.");
      } else onChanged();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="t-forum__post">
      <p className="t-forum__meta">
        {post.author} · {new Date(post.created_at).toLocaleDateString("id-ID")}
        {post.status === "review"
          ? " · Menunggu pemeriksaan"
          : post.status === "rejected"
            ? " · Ditolak"
            : ""}
      </p>
      <h2>{post.title}</h2>
      {post.moderator_note && (
        <p role="status">Catatan verifikasi: {post.moderator_note}</p>
      )}
      {post.place && post.destination_id && (
        <button
          className="t-forum__place"
          onClick={() => onOpenDestination(post.destination_id!)}
        >
          {post.place} ↗
        </button>
      )}
      <p className="t-forum__body">{post.body}</p>
      {images.length > 0 && (
        <div className="t-forum__photos">
          {images.map((src, i) => (
            <a href={src} key={src} target="_blank" rel="noreferrer">
              <img
                loading="lazy"
                src={src}
                alt={`Dokumentasi kunjungan ${i + 1}: ${post.title}`}
              />
            </a>
          ))}
        </div>
      )}
      {post.status === "published" && (
        <div className="t-forum__actions">
          <button
            aria-label="Dukung posting"
            aria-pressed={post.my_vote === 1}
            disabled={busy}
            onClick={() => void act("vote", post.my_vote === 1 ? 0 : 1)}
          >
            ↑
          </button>
          <span>{post.score}</span>
          <button
            aria-label="Kurangi dukungan"
            aria-pressed={post.my_vote === -1}
            disabled={busy}
            onClick={() => void act("vote", post.my_vote === -1 ? 0 : -1)}
          >
            ↓
          </button>
          <button
            disabled={commentsLoading}
            aria-expanded={open}
            onClick={async () => {
              if (open) {
                setOpen(false);
                return;
              }
              setCommentsLoading(true);
              setError("");
              try {
                setComments(await loadComments(post.id));
                setOpen(true);
              } catch (e) {
                setError(message(e));
              } finally {
                setCommentsLoading(false);
              }
            }}
          >
            {commentsLoading ? "Memuat…" : `${post.comment_count} komentar`}
          </button>
          <button onClick={() => (signedIn ? setReport(!report) : onAuth())}>
            Laporkan
          </button>
        </div>
      )}
      {error && (
        <p role="status" className="t-forum__error">
          {error}
        </p>
      )}
      {report && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act("report", 1, reason);
          }}
        >
          <label>
            Alasan laporan
            <textarea
              required
              minLength={10}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button disabled={busy}>Kirim laporan</button>
        </form>
      )}
      {open && (
        <section aria-label="Komentar">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act("comment", 1, text);
            }}
          >
            <label>
              Tulis jawaban atau komentar
              <textarea
                required
                minLength={2}
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button disabled={busy}>
              {busy ? "Mengirim…" : "Kirim komentar"}
            </button>
          </form>
          {comments.map((c) => (
            <div className="t-forum__comment" key={c.id}>
              <strong>{c.author}</strong>
              {c.status === "review" && <small> · Menunggu pemeriksaan</small>}
              <p>{c.body}</p>
              {c.moderator_note && (
                <small>Catatan verifikasi: {c.moderator_note}</small>
              )}
            </div>
          ))}
        </section>
      )}
    </article>
  );
}
function ProposalPolls({
  city,
  signedIn,
  onAuth,
}: {
  city: string;
  signedIn: boolean;
  onAuth: () => void;
}) {
  const [polls, setPolls] = useState<ProposalPoll[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    setLoading(true);
    if (!supabase || !signedIn) {
      setLoading(false);
      return;
    }
    void loadPolls(city)
      .then((rows) => {
        if (active) setPolls(rows);
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [city, signedIn, retry]);
  if (!signedIn)
    return (
      <button className="t-btn t-btn--ghost" onClick={onAuth}>
        Masuk untuk memvalidasi
      </button>
    );
  return (
    <>
      {loading ? (
        <p role="status">Memuat usulan…</p>
      ) : !polls.length && !error ? (
        <p>Belum ada usulan yang lolos pemeriksaan awal.</p>
      ) : null}
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setRetry((n) => n + 1)}>Coba lagi</button>
        </p>
      )}
      {polls.map((p) => (
        <PollCard key={p.id} poll={p} onSaved={() => setRetry((n) => n + 1)} />
      ))}
    </>
  );
}
function PollCard({
  poll,
  onSaved,
}: {
  poll: ProposalPoll;
  onSaved: () => void;
}) {
  const [choice, setChoice] = useState(poll.my_choice ?? "valid"),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const closed = new Date(poll.ends_at).getTime() < Date.now();
  return (
    <form
      className="t-forum__poll"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const { error } = await requireBackend().rpc("vote_submission", {
            p_id: poll.id,
            p_choice: choice,
            p_reason: reason,
          });
          if (error) throw error;
          onSaved();
        } catch (e) {
          setError(message(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>{poll.name}</h3>
      <p>{poll.address}</p>
      <p>Sumber: {poll.source}</p>
      <a
        target="_blank"
        rel="noreferrer"
        href={`https://www.openstreetmap.org/?mlat=${poll.lat}&mlon=${poll.lon}#map=17/${poll.lat}/${poll.lon}`}
      >
        Periksa titik lokasi ↗
      </a>
      <p>
        Valid {poll.valid} · Perbaikan {poll.fix} · Diragukan {poll.doubt}
      </p>
      <small>
        {closed
          ? "Polling ditutup"
          : "Berakhir " + new Date(poll.ends_at).toLocaleString("id-ID")}
      </small>
      {!poll.own && !closed ? (
        <>
          <label>
            Penilaian
            <select value={choice} onChange={(e) => setChoice(e.target.value)}>
              <option value="valid">Lokasi valid</option>
              <option value="fix">Perlu perbaikan</option>
              <option value="doubt">Diragukan</option>
            </select>
          </label>
          <label>
            Alasan atau bukti
            <textarea
              maxLength={1000}
              required={choice !== "valid"}
              minLength={choice !== "valid" ? 10 : undefined}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button disabled={busy}>
            {busy
              ? "Menyimpan…"
              : poll.my_choice
                ? "Perbarui suara"
                : "Kirim suara"}
          </button>
        </>
      ) : poll.own ? (
        <p>Kamu tidak dapat memilih usulan sendiri.</p>
      ) : null}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
