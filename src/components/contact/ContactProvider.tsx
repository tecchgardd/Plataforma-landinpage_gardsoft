"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import ContactDialog from "./ContactDialog";

const ContactContext = createContext<(service?: string) => void>(() => {});

export function useContact() {
  return useContext(ContactContext);
}

export default function ContactProvider({
  children,
  services,
  whatsapp,
}: {
  children: ReactNode;
  services: string[];
  whatsapp: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [service, setService] = useState(services[0] ?? "Ainda quero entender as opções");

  function openContact(selected?: string) {
    if (selected) setService(selected);
    dialogRef.current?.showModal();
  }

  return (
    <ContactContext.Provider value={openContact}>
      {children}
      <ContactDialog
        dialogRef={dialogRef}
        service={service}
        setService={setService}
        services={services}
        whatsapp={whatsapp}
      />
    </ContactContext.Provider>
  );
}

export function ContactButton({
  service,
  className = "btn",
  children,
}: {
  service?: string;
  className?: string;
  children: ReactNode;
}) {
  const openContact = useContact();
  return (
    <button type="button" className={className} onClick={() => openContact(service)}>
      {children}
    </button>
  );
}
