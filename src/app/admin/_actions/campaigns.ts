"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, toDbDate } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { slugify } from "@/lib/admin/format";
import { campaignChannels, campaignStatuses, costTypes, values } from "@/lib/admin/options";
import { firstError, formObject, optionalDate, optionalText, type FormState } from "@/lib/admin/form";

const campaignSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da campanha.").max(100),
  status: z.enum(values(campaignStatuses)),
  startDate: optionalDate,
  endDate: optionalDate,
  notes: optionalText(4000),
});

const channelsSchema = z.array(z.enum(values(campaignChannels))).min(1, "Escolha pelo menos um canal.");

const costsSchema = z
  .array(
    z.object({
      type: z.enum(values(costTypes)),
      description: z.string().trim().max(200),
      amountCents: z.number().int().min(0).max(1_000_000_000),
    }),
  )
  .max(50);

/** Gera um identificador de link único a partir do nome. */
async function uniqueSlug(name: string) {
  const base = slugify(name) || "campanha";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (!(await prisma.campaign.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
}

export async function saveCampaign(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = campaignSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const channels = channelsSchema.safeParse(formData.getAll("channels").map(String));
  if (!channels.success) return { error: firstError(channels.error) };
  let rawCosts: unknown = [];
  try {
    rawCosts = JSON.parse(String(formData.get("costs") ?? "[]"));
  } catch {
    return { error: "Investimentos inválidos." };
  }
  const costs = costsSchema.safeParse(rawCosts);
  if (!costs.success) return { error: "Confira os investimentos: tipo e valor são obrigatórios." };

  const { startDate, endDate, ...rest } = parsed.data;
  if (startDate && endDate && endDate < startDate) return { error: "A data de término deve ser depois do início." };
  const items = costs.data.filter((c) => c.amountCents > 0);
  const data = {
    ...rest,
    channels: [...new Set(channels.data)],
    startDate: toDbDate(startDate),
    endDate: toDbDate(endDate),
    budgetCents: items.reduce((s, c) => s + c.amountCents, 0),
  };
  const costRows = items.map((c) => ({ type: c.type, description: c.description || null, amountCents: c.amountCents }));

  if (id) {
    // O identificador não muda na edição: os links já divulgados continuam funcionando.
    await prisma.$transaction([
      prisma.campaign.update({ where: { id }, data }),
      prisma.campaignCost.deleteMany({ where: { campaignId: id } }),
      prisma.campaignCost.createMany({ data: costRows.map((c) => ({ ...c, campaignId: id })) }),
    ]);
    await logActivity(user, "editou", "campanha", `Editou a campanha ${data.name}`, id);
    revalidatePath("/admin", "layout");
    return { success: "Campanha atualizada." };
  }

  const created = await prisma.campaign.create({
    data: { ...data, slug: await uniqueSlug(data.name), costs: { create: costRows } },
    select: { id: true },
  });
  await logActivity(user, "criou", "campanha", `Criou a campanha ${data.name}`, created.id);
  revalidatePath("/admin", "layout");
  redirect(`/admin/campanhas/${created.id}`);
}

export async function deleteCampaign(id: string) {
  const user = await requireUser();
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } });
  await prisma.campaign.deleteMany({ where: { id } });
  if (campaign) await logActivity(user, "excluiu", "campanha", `Excluiu a campanha ${campaign.name}`, id);
  revalidatePath("/admin", "layout");
  redirect("/admin/campanhas");
}
