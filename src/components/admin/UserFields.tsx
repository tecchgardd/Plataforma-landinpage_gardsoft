import { Input, Select } from "./Fields";
import AvatarInput from "./AvatarInput";

type UserData = {
  name: string;
  username: string | null;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  image: string | null;
  roleId?: string | null;
};

type RoleOption = { id: string; name: string };

/**
 * Campos de perfil do colaborador (perfil próprio e módulo de usuários).
 * Com `roles`, mostra o perfil de acesso; `lockRole` exibe o atual sem permitir trocar (o próprio usuário).
 */
export default function UserFields({
  user,
  withPassword = false,
  roles,
  lockRole = false,
}: {
  user?: UserData;
  withPassword?: boolean;
  roles?: RoleOption[];
  lockRole?: boolean;
}) {
  return (
    <>
      <AvatarInput name={user?.name ?? "?"} initial={user?.image} />
      <Input label="Nome completo" name="name" defaultValue={user?.name} required />
      <Input label="Cargo / função" name="jobTitle" defaultValue={user?.jobTitle} placeholder="Ex.: Atendimento, Desenvolvedor" />
      <Input label="Usuário (login)" name="username" defaultValue={user?.username} required placeholder="ex.: gabriel" />
      <Input label="E-mail" name="email" type="email" defaultValue={user?.email} required />
      <Input label="Telefone / WhatsApp" name="phone" type="tel" inputMode="tel" defaultValue={user?.phone} />
      {roles &&
        (lockRole ? (
          <label className="adm-field">
            <span className="adm-label">Perfil de acesso</span>
            <input value={roles.find((r) => r.id === user?.roleId)?.name ?? "Sem perfil"} disabled readOnly />
            <small className="adm-hint">Você não pode mudar o seu próprio perfil.</small>
          </label>
        ) : (
          <Select
            label="Perfil de acesso"
            name="roleId"
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
            defaultValue={user?.roleId ?? roles.find((r) => r.name === "Atendente")?.id}
            hint="Define os módulos que a pessoa vê e o que pode alterar."
          />
        ))}
      {withPassword && (
        <>
          <Input label="Senha inicial" name="password" type="password" required hint="Mínimo de 8 caracteres." />
          <Input label="Confirme a senha" name="confirm" type="password" required />
        </>
      )}
    </>
  );
}
