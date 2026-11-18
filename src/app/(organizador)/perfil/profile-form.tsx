"use client";

import { AtSign, Building2, GraduationCap, Phone, User } from "lucide-react";
import { useActionState } from "react";
import { Field, FormMessage, IconInput, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Role } from "@/lib/aula/types";
import { updateProfile } from "./actions";

export function ProfileForm({
  role,
  fullName,
  institution,
  phone,
  contactEmail,
  program,
  about,
}: {
  role: Role;
  fullName: string;
  institution: string;
  phone: string;
  contactEmail: string;
  program: string;
  about: string;
}) {
  const [state, action] = useActionState(updateProfile, null);
  const teacher = role === "teacher";
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" htmlFor="full_name" required className="sm:col-span-2">
          <IconInput icon={<User className="size-5" />} id="full_name" name="full_name" required maxLength={120} defaultValue={fullName} autoComplete="name" />
        </Field>
        {teacher && (
          <Field label="Institución" htmlFor="institution">
            <IconInput icon={<Building2 className="size-5" />} id="institution" name="institution" maxLength={150} defaultValue={institution} />
          </Field>
        )}
        <Field label={teacher ? "Departamento o academia" : "Carrera o programa"} htmlFor="program" className={teacher ? undefined : "sm:col-span-2"}>
          <IconInput
            icon={<GraduationCap className="size-5" />}
            id="program"
            name="program"
            maxLength={150}
            defaultValue={program}
            placeholder={teacher ? "Diseño Gráfico" : "Lic. en Diseño Gráfico"}
          />
        </Field>
        <Field label="Teléfono / WhatsApp" htmlFor="phone">
          <IconInput icon={<Phone className="size-5" />} id="phone" name="phone" type="tel" maxLength={40} defaultValue={phone} autoComplete="tel" placeholder="622 123 4567" />
        </Field>
        <Field label="Correo de contacto" htmlFor="contact_email" hint="Si prefieres que te escriban a otro correo.">
          <IconInput icon={<AtSign className="size-5" />} id="contact_email" name="contact_email" type="email" maxLength={200} defaultValue={contactEmail} />
        </Field>
        <Field label={teacher ? "Sobre mí / horario de asesoría" : "Sobre mí"} htmlFor="about" className="sm:col-span-2" hint="Máximo 500 caracteres.">
          <Textarea
            id="about"
            name="about"
            maxLength={500}
            defaultValue={about}
            placeholder={teacher ? "Asesorías martes y jueves de 12:00 a 13:00, cubículo 5." : "Algo que tu docente deba saber (opcional)."}
          />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton size="lg" className="rounded-xl">
        Guardar cambios
      </SubmitButton>
    </form>
  );
}
