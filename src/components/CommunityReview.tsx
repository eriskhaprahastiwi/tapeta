import { useEffect, useState } from "react";
import { requireBackend, supabase } from "../lib/supabase";
interface ReviewItem {
  id: string;
  title?: string;
  body: string;
  screening_reasons?: string[];
  documentation?: string[];
}
export function CommunityReview() {
  const [items, setItems] = useState<ReviewItem[]>([]),
    [comments, setComments] = useState<ReviewItem[]>([]),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [limit, setLimit] = useState(30),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    void Promise.all([
      supabase
        .from("community_posts")
        .select("id,title,body,screening_reasons,documentation")
        .eq("status", "review")
        .order("created_at")
        .limit(limit),
      supabase
        .from("community_comments")
        .select("id,body")
        .eq("status", "review")
        .order("created_at")
        .limit(limit),
    ])
      .then(([posts, comments]) => {
        if (!active) return;
        if (posts.error || comments.error) {
          setError((posts.error ?? comments.error)!.message);
          return;
        }
        setItems(posts.data ?? []);
        setComments(comments.data ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload, limit]);
  return (
    <details className="t-forum__rules">
      <summary>
        Verifikasi konten komunitas{" "}
        {items.length + comments.length > 0
          ? `(${items.length + comments.length})`
          : ""}
      </summary>
      {loading ? (
        <p role="status">Memuat konten yang ditandai…</p>
      ) : !items.length && !comments.length && !error ? (
        <p>Tidak ada konten yang memerlukan pemeriksaan.</p>
      ) : null}
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setReload((n) => n + 1)}>Coba lagi</button>
        </p>
      )}
      {items.map((item) => (
        <ReviewCard
          key={item.id}
          item={item}
          kind="post"
          onSaved={() => setReload((n) => n + 1)}
        />
      ))}
      {comments.map((item) => (
        <ReviewCard
          key={item.id}
          item={item}
          kind="comment"
          onSaved={() => setReload((n) => n + 1)}
        />
      ))}
      {(items.length === limit || comments.length === limit) && (
        <button onClick={() => setLimit((n) => n + 30)}>
          Muat konten berikutnya
        </button>
      )}
    </details>
  );
}
function ReviewCard({
  item,
  kind,
  onSaved,
}: {
  item: ReviewItem;
  kind: string;
  onSaved: () => void;
}) {
  const [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [images, setImages] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    if (!item.documentation?.length) return;
    void requireBackend()
      .storage.from("community-documentation")
      .createSignedUrls(item.documentation, 3600)
      .then(({ data, error }) => {
        if (active) {
          if (error) setError(error.message);
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
  }, [item.documentation]);
  async function decide(action: string) {
    setBusy(true);
    setError("");
    try {
      const { error } = await requireBackend().rpc("review_community_content", {
        p_id: item.id,
        p_kind: kind,
        p_action: action,
        p_note: note,
      });
      if (error) throw error;
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Keputusan belum tersimpan.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="t-forum__post">
      <h3>{item.title ?? "Komentar"}</h3>
      <p>{item.screening_reasons?.join(" · ")}</p>
      <p className="t-forum__body">{item.body}</p>
      <div className="t-forum__photos">
        {images.map((src) => (
          <a key={src} href={src} target="_blank" rel="noreferrer">
            <img src={src} alt="Dokumentasi untuk diperiksa" />
          </a>
        ))}
      </div>
      <label>
        Alasan keputusan
        <textarea
          minLength={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="t-forum__actions">
        <button
          disabled={busy || note.trim().length < 4}
          onClick={() => void decide("published")}
        >
          Setujui
        </button>
        <button
          disabled={busy || note.trim().length < 4}
          onClick={() => void decide("rejected")}
        >
          Tolak
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
