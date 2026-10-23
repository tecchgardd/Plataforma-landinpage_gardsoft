"use client";

import { useState, useTransition } from "react";
import { uploadImage } from "@/app/admin/_actions/media";
import Avatar from "./Avatar";

/** Foto do colaborador: envia a imagem e guarda a URL num campo oculto "image". */
export default function AvatarInput({ name, initial }: { name: string; initial?: string | null }) {
  const [image, setImage] = useState(initial ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    const data = new FormData();
    data.set("file", file);
    startTransition(async () => {
      const result = await uploadImage(data);
      if (result.error) setError(result.error);
      else if (result.url) setImage(result.url);
    });
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
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={pending} onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          {image && (
            <button type="button" className="adm-btn ghost small" onClick={() => setImage("")}>
              Remover
            </button>
          )}
        </div>
        {error ? <span className="adm-msg error">{error}</span> : <small className="adm-hint">JPG, PNG ou WEBP, até 5 MB. Quadrada fica melhor.</small>}
      </div>
    </div>
  );
}
