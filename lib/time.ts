/* Die Uhr des Servers für Server Components. Eine eigene Funktion, weil die
   Regel react-hooks/purity Date.now() im Rumpf einer Komponente zu Recht
   ablehnt — für Client Components. Eine async Server Component wird je
   Anfrage genau einmal ausgeführt; dort ist "jetzt" eine Eingabe wie die
   Datenbankabfrage daneben. */
export const serverNow = (): number => Date.now();
