"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileEditor() {
  const { user, accessToken } = useAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState((user?.user_metadata?.display_name as string) ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = user?.user_metadata?.display_name as string | undefined;

  async function saveName() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
    setSaving(false);
    if (error) {
      showToast("Could not save your name.", "err");
      return;
    }
    showToast("Name updated.");
    setEditing(false);
  }

  async function uploadAvatar(file: File) {
    if (!accessToken) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/profile/upload-avatar", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData
    });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Upload failed.", "err");
      return;
    }
    // Refresh the local session so the new avatar_url shows immediately.
    await supabase.auth.refreshSession();
    showToast("Photo updated.");
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => fileInput.current?.click()}
        disabled={uploading}
        className="relative w-14 h-14 rounded-full bg-red text-[#FBF6EE] flex items-center justify-center font-serif font-bold text-xl flex-shrink-0 overflow-hidden group"
        aria-label="Change profile photo"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : user?.phone ? (
          user.phone.slice(-2)
        ) : (
          user?.email?.[0].toUpperCase() ?? "DB"
        )}
        <span className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <i className="ti ti-camera text-cream" style={{ fontSize: 16 }} aria-hidden="true" />
        </span>
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadAvatar(file);
          e.target.value = "";
        }}
      />

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex gap-2 items-center">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              placeholder="Your name"
              className="flex-1 border border-line rounded-lg px-2.5 py-1.5 text-sm bg-cream focus:outline-none focus:border-gold"
              autoFocus
            />
            <button
              onClick={saveName}
              disabled={saving}
              className="text-[12px] font-semibold text-red-dark"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="font-semibold text-[15px] text-ink truncate">
              {displayName || user?.phone || user?.email}
            </div>
            <button onClick={() => setEditing(true)} className="text-ink-soft hover:text-ink">
              <i className="ti ti-pencil" style={{ fontSize: 13 }} aria-hidden="true" />
            </button>
          </div>
        )}
        {displayName && (
          <div className="text-[12px] text-ink-soft mt-0.5">{user?.phone || user?.email}</div>
        )}
      </div>
    </div>
  );
}
