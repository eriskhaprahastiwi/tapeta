import { requireBackend } from "./supabase";
import { readSession } from "./session";
export type PostKind = "story" | "issue" | "qna";
export interface ForumPost {
  id: string;
  kind: PostKind;
  title: string;
  body: string;
  status: string;
  documentation: string[];
  created_at: string;
  author: string;
  place: string | null;
  destination_id: string | null;
  score: number;
  my_vote: number | null;
  comment_count: number;
  moderator_note?: string;
}
export interface ForumComment {
  moderator_note?: string;
  id: string;
  body: string;
  author: string;
  status: string;
  created_at: string;
}
export interface ProposalPoll {
  id: string;
  name: string;
  address: string;
  source: string;
  lat: number;
  lon: number;
  ends_at: string;
  own: boolean;
  valid: number;
  fix: number;
  doubt: number;
  my_choice: string | null;
}
export async function loadForum(city: string, kind: PostKind, before?: string) {
  const { data, error } = await requireBackend().rpc("list_community_feed", {
    p_city_id: city,
    p_kind: kind,
    p_before: before ?? null,
  });
  if (error) throw error;
  return (data ?? []) as ForumPost[];
}
export async function createForumPost(
  city: string,
  kind: PostKind,
  destination: string,
  title: string,
  body: string,
  files: File[],
) {
  const client = requireBackend(),
    user = readSession();
  if (!user) throw new Error("Masuk untuk membuat posting.");
  if (
    files.length > 4 ||
    files.some(
      (f) =>
        f.size > 5242880 ||
        !["image/jpeg", "image/png", "image/webp"].includes(f.type),
    )
  )
    throw new Error(
      "Maksimal 4 gambar JPG, PNG atau WebP, masing-masing 5 MB.",
    );
  const paths: string[] = [];
  try {
    for (const file of files) {
      const path = `${user.id}/${crypto.randomUUID()}.${file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp"}`;
      const { error } = await client.storage
        .from("community-documentation")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      paths.push(path);
    }
    const { data, error } = await client.rpc("create_community_post", {
      p_city_id: city,
      p_kind: kind,
      p_destination_id: destination || null,
      p_title: title,
      p_body: body,
      p_documentation: paths,
    });
    if (error) throw error;
    return data as ForumPost;
  } catch (error) {
    if (paths.length)
      await client.storage.from("community-documentation").remove(paths);
    throw error;
  }
}
export async function forumAction(
  id: string,
  action: string,
  text = "",
  value = 1,
) {
  const { error } = await requireBackend().rpc("community_action", {
    p_post_id: id,
    p_action: action,
    p_text: text,
    p_value: value,
  });
  if (error) throw error;
}
export async function loadComments(id: string) {
  const { data, error } = await requireBackend().rpc(
    "list_community_comments",
    { p_post_id: id },
  );
  if (error) throw error;
  return (data ?? []) as ForumComment[];
}
export async function loadPolls(city: string) {
  const { data, error } = await requireBackend().rpc("list_submission_polls", {
    p_city_id: city,
  });
  if (error) throw error;
  return (data ?? []) as ProposalPoll[];
}
export const COMMUNITY_RULES = [
  "Tidak boleh ada ujaran kebencian SARA, rasisme, pelecehan, atau ancaman.",
  "Tidak boleh ada pornografi, eksploitasi, atau dokumentasi kekerasan eksplisit.",
  "Jaga data pribadi. Jangan kirim identitas, kontak, atau foto orang tanpa izin.",
  "Dilarang spam, penipuan, lokasi palsu, dan informasi yang sengaja menyesatkan.",
  "Ceritakan pengalaman dengan jujur dan gunakan dokumentasi yang kamu miliki izinnya.",
];
