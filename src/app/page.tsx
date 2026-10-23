import ContactProvider from "@/components/contact/ContactProvider";
import Effects from "@/components/ui/Effects";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Services, { Marquee } from "@/components/landing/Services";
import Story from "@/components/landing/Story";
import Cases from "@/components/landing/Cases";
import { IdeaBanner, SplitBanner } from "@/components/landing/Banners";
import Process from "@/components/landing/Process";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import Footer, { FinalCTA, WhatsAppFloat } from "@/components/landing/Footer";
import MobileTabBar from "@/components/landing/MobileTabBar";
import { getSiteContent } from "@/lib/content";
import { getLegalInfo } from "@/lib/legal";
import { nav } from "@/data/site";

// A página é estática; o portal regenera ao salvar conteúdo. O intervalo é só uma garantia extra.
export const revalidate = 300;

export default async function Page() {
  const [content, legal] = await Promise.all([getSiteContent(), getLegalInfo()]);
  // Sem depoimentos reais a seção não aparece, e o link do menu some junto.
  const navItems = content.testimonials.items.length ? nav : nav.filter((item) => item.href !== "#avaliacoes");
  const { whatsapp } = content.site;
  return (
    <ContactProvider services={content.services.items.map((s) => s.contact).filter(Boolean)} whatsapp={whatsapp}>
      <Effects />
      <Header items={navItems} whatsapp={whatsapp} />
      <main id="conteudo">
        <Hero content={content.hero} />
        <Marquee items={content.marquee.items} />
        <Services content={content.services} />
        <Story story={content.story} />
        <Cases content={content.cases} />
        <IdeaBanner content={content.banners} />
        <Process content={content.process} />
        <SplitBanner content={content.banners} whatsapp={whatsapp} />
        <Testimonials content={content.testimonials} />
        <FAQ content={content.faq} />
        <FinalCTA content={content.finalCta} />
      </main>
      <Footer navItems={navItems} legal={legal} settings={content.site} services={content.services.items} content={content.footer} />
      <aside aria-label="Contato rápido">
        <WhatsAppFloat whatsapp={whatsapp} />
      </aside>
      <MobileTabBar />
    </ContactProvider>
  );
}
