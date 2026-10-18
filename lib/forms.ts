/* Zustand der Formulare hinter useActionState: was die Server Action
   zurückgibt und beim nächsten Absenden als vorheriger Zustand wieder
   hereinbekommt. Ohne diesen Typ leitete TypeScript für den Zustand
   `unknown` ab, und jedes state?.error im Formular war ein Typfehler. */
export type FormState = {
  error?: string | null;
  success?: boolean;
  // Login mit unbestätigter Adresse: an diese geht der neue Bestätigungslink
  needsConfirmation?: string;
} | null;
