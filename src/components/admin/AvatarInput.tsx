"use client";

import { useState } from "react";
import { mediaRules, uploadMedia } from "@/lib/media";
import Avatar from "./Avatar";

/** Foto do colaborador: envia a imagem e guarda a URL num campo oculto "image". */
export default function AvatarInput({ name, initial }: { name: string; initial?: string | null }) {
  const [image, setImage] = useState(initial ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    setPending(true);
    const result = await uploadMedia(file, "image");
    setPending(false);
    if (result.error) setError(result.error);
    else if (result.url) setImage(result.url);
  }

  return (
    <div className="adm-avatar-input wide">
      <input type="hidden" name="image" value={image} />
      <Avatar name={name} image={image || null} size={72} />
      <div>
        <span className="adm-label">Foto</span>
        <div className="adm-image-actions">
          <label className="adm-btn ghost small">
            {pending ? "Enviando..." : image ? "Trocar foto" : "Enviar foto"}
            <input type="file" accept={mediaRules.image.accept} hidden disabled={pending} onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          {image && (
            <button type="button" className="adm-btn ghost small" onClick={() => setImage("")}>
              Remover
            </button>
          )}
        </div>
        {error ? <span className="adm-msg error">{error}</span> : <small className="adm-hint">{mediaRules.image.label}. Quadrada fica melhor.</small>}
      </div>
    </div>
  );
}
