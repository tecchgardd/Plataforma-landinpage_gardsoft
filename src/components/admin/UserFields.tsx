import { Input } from "./Fields";
import AvatarInput from "./AvatarInput";

type UserData = {
  name: string;
  username: string | null;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  image: string | null;
};

/** Campos de perfil do colaborador (perfil próprio e módulo de usuários). */
export default function UserFields({ user, withPassword = false }: { user?: UserData; withPassword?: boolean }) {
  return (
    <>
      <AvatarInput name={user?.name ?? "?"} initial={user?.image} />
      <Input label="Nome completo" name="name" defaultValue={user?.name} required />
      <Input label="Cargo / função" name="jobTitle" defaultValue={user?.jobTitle} placeholder="Ex.: Atendimento, Desenvolvedor" />
      <Input label="Usuário (login)" name="username" defaultValue={user?.username} required placeholder="ex.: gabriel" />
      <Input label="E-mail" name="email" type="email" defaultValue={user?.email} required />
      <Input label="Telefone / WhatsApp" name="phone" type="tel" inputMode="tel" defaultValue={user?.phone} />
      {withPassword && (
        <>
          <Input label="Senha inicial" name="password" type="password" required hint="Mínimo de 8 caracteres." />
          <Input label="Confirme a senha" name="confirm" type="password" required />
        </>
      )}
    </>
  );
}
