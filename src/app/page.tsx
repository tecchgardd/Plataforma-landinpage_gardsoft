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
import { getSiteContent } from "@/lib/content";

// A página é estática; o portal regenera ao salvar conteúdo. O intervalo é só uma garantia extra.
export const revalidate = 300;

export default async function Page() {
  const content = await getSiteContent();
  const { whatsapp } = content.site;
  return (
    <ContactProvider services={content.services.items.map((s) => s.contact).filter(Boolean)} whatsapp={whatsapp}>
      <Effects />
      <Header />
      <main>
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
      <Footer settings={content.site} services={content.services.items} content={content.footer} />
      <WhatsAppFloat whatsapp={whatsapp} />
    </ContactProvider>
  );
}
