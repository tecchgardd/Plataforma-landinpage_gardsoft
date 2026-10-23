/** Foto do colaborador ou, sem foto, a inicial do nome. */
export default function Avatar({ name, image, size = 28 }: { name?: string | null; image?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (image) return <img src={image} alt="" className="adm-avatar-img" style={style} />;
  return (
    <span className="adm-avatar" style={style} aria-hidden="true">
      {(name ?? "?").charAt(0).toUpperCase()}
    </span>
  );
}

/** Responsável com foto + nome; "Sem responsável" quando vazio. */
export function Owner({ user }: { user?: { name: string; image: string | null } | null }) {
  if (!user) return <span className="adm-owner none">Sem responsável</span>;
  return (
    <span className="adm-owner">
      <Avatar name={user.name} image={user.image} size={22} />
      {user.name.split(" ")[0]}
    </span>
  );
}
