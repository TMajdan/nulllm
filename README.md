# NullLM — Local PII & Sensitive Data Anonymizer for LLMs

MVP aplikacji do lokalnej anonimizacji danych wrażliwych, zanim trafią do modelu językowego
(ChatGPT, Claude, Copilot…). Zanonimizowany prompt można wysłać do modelu, a tokeny z odpowiedzi
przywrócić z powrotem do oryginalnych wartości.

> **Zasada nr 1:** ani jeden bajt tekstu użytkownika nie opuszcza przeglądarki.
> Brak backendu, brak telemetrii, brak zewnętrznych API — także parsowanie plików i eksport
> odbywają się lokalnie.

---

## Szybki start

### Windows — jeden klik

Dwuklik na **`start.cmd`**. Skrypt znajduje Node.js (PATH lub instalacja przenośna w
`%LOCALAPPDATA%\Programs\nodejs`), przy pierwszym uruchomieniu robi `npm install`, odpala
`npm run dev` i otwiera `http://localhost:5173`.

### Ręcznie

```bash
node --version   # wymagane >= 20 (testowane na 22.23.4)
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc --noEmit && vite build
npm run preview  # podgląd builda z dist/
```

Stack: **Vite 6 + React 18 + TypeScript 5.6 + Tailwind CSS v4 + shadcn-style UI + Zustand +
Lucide + fflate + pdf.js (odczyt i podgląd PDF) + docx-preview (podgląd Word) + pdf-lib (eksport PDF)**.

### Status weryfikacji

| Krok | Wynik |
| --- | --- |
| `npm install` | ✅ 124 pakietów |
| `tsc --noEmit` | ✅ 0 błędów |
| `vite build` | ✅ ~410 kB JS + CSS; pdf.js ładowany lazy (osobny chunk) |
| Silnik (PL/DE/EN) | ✅ 21/21 identyfikatorów zamaskowanych, 0 wycieków |
| DOCX round-trip | ✅ eksport → odczyt, pełna zgodność z polskimi znakami |
| PDF | ✅ ekstrakcja tekstu przez pdf.js |
| PDF eksport | ✅ pdf-lib + Roboto subset → 2 strony, tekst odczytany z powrotem (PL/DE znaki, tokeny) |
| Podgląd PDF | ✅ renderowanie stron na canvas (zrzut zweryfikowany) |
| Podgląd DOCX | ✅ docx-preview renderuje dokument (zrzut zweryfikowany) |
| .doc (best-effort) | ✅ heurystyka UTF-16LE / cp1252 |
| i18n | ✅ 275 kluczy × 3 języki, 25/25 reguł przetłumaczonych |

---

## Funkcje

### 1. Wielojęzyczność (PL / EN / DE)

- Cały interfejs w trzech językach, przełącznik w nagłówku; język startowy wykrywany z przeglądarki,
  wybór zapamiętywany w `localStorage`.
- **Odmiana nazwisk**:
  - **PL** — słownik imion z końcówkami fleksyjnymi (`Jan` → `Jana`, `Janowi`, `Janem`;
    `Anna` → `Anny`, `Annie`, `Anną`) plus konteksty typu „reprezentowany przez”, „Pana”.
  - **DE** — `Herr`, `Herrn`, `Frau`, „vertreten durch”, „Geschäftsführer” + słownik imion;
    nazwiska niemieckie są nieodmienne, więc wzorzec nie schodzi do kolejnej linii i odcina
    końcową interpunkcję.
  - **EN** — `Mr`, `Mrs`, `Ms`, `Dr`, „represented by”, „Attn” + słownik imion.
- **Filtry per język**: panel „Filtry detekcji” pokazuje tylko reguły właściwe dla wybranego
  języka — **PL** (PESEL, NIP, dowód, imiona PL), **DE** (USt-IdNr, Steuer-ID, imiona DE),
  **EN** (SSN, NINO, imiona EN) — plus reguły uniwersalne (e-mail, IP, klucze API, IBAN, kwoty…).
  Zmiana języka natychmiast przestawia listę filtrów i liczniki kategorii.
- **Bezpiecznik cross-language**: reguły ukryte przez filtr języka nie maskują tekstu, ale silnik
  nadal je wykrywa i pokazuje w panelu 2 ostrzeżenie „N fragmentów poza filtrem języka” z listą
  typów i przyciskiem **„Pokaż wszystkie regiony”**. Przełącznik w panelu filtrów zdejmuje
  ograniczenie na stałe (przydatne, gdy dokument jest w innym języku niż interfejs).

### 2. Pliki: podgląd i eksport

**Odczyt (100% lokalnie):**

| Format | Metoda | Jakość |
| --- | --- | --- |
| `.txt`, `.log`, `.md`, `.csv`, `.json` | `TextDecoder` (UTF-8 → fallback cp1252) | pełna |
| `.docx` | `fflate` + `word/document.xml` (usuwa zmiany śledzone i kody pól) | pełna |
| `.pdf` | `pdf.js` (tekst + liczba stron) | pełna dla PDF tekstowych |
| `.doc` | heurystyka UTF-16LE / cp1252 | best-effort (ostrzeżenie w UI) |

Po wczytaniu pliku otwiera się **podgląd dokumentu** — nie tylko tekst:

- **PDF** — prawdziwe strony renderowane na `<canvas>` (pdf.js), z nawigacją stron i zoomem,
- **DOCX** — dokument renderowany do HTML przez `docx-preview` (akapity, style, tabele, obrazy),
- **TXT/MD/CSV/JSON/DOC** — podgląd tekstowy,
- zakładka **„Tekst”** pokazuje dokładnie to, co trafi do anonimizacji,
- nagłówek podglądu: format, rozmiar, liczba słów, stron i akapitów + ostrzeżenia.

**Eksport** — z panelu 2 (anonimizowany prompt) i panelu 3 (przywrócony tekst):

- **jeden klik = ten sam format co źródło** (przycisk pobierania obok kopiowania),
- strzałka obok otwiera wybór formatu: `.txt`, `.md`, `.docx`, `.pdf`,
- `.docx` — generowany w przeglądarce (poprawny pakiet OOXML),
- `.pdf` — generowany lokalnie przez **pdf-lib** z osadzonym **subsetem fontu Roboto**; polskie
  i niemieckie znaki są w pełni obsługiwane, a tekst w PDF pozostaje zaznaczalny,
- **podgląd WYSIWYG** (ikona oka w panelu 2) pokazuje, jak będzie wyglądał eksportowany dokument.

> Eksport PDF odtwarza treść w nowym układzie A4 (nie zachowuje oryginalnego layoutu dokumentu
> źródłowego). Dla DOCX zachowywana jest kolejność akapitów i podział na linie.

### 3. Anonimizacja i przywracanie

- Trzy panele: tekst źródłowy → prompt z tokenami → przywrócenie odpowiedzi modelu.
- Tokeny deterministyczne w sesji (`[EMAIL_1]` zawsze dla tej samej wartości), tokeny alfabetyczne
  dla kwot (`[KWOTA_A]`).
- Deanonymizer tolerancyjny: `[PESEL_1]`, `[PESEL 1]`, `【PESEL-1】`, `(pesel_1)` oraz token bez
  nawiasów. Nierozpoznane tokeny i brak dopasowań generują ostrzeżenia.
- Tabela mapowań: edycja tokenu, usuwanie, filtr, ukrywanie oryginałów, eksport JSON (Pro).

### 4. Bezpieczeństwo UX

- Plan Free maskuje tylko e-mail, IP i telefon. Po anonimizacji uruchamiany jest **audyt reguł
  zablokowanych**: silnik liczy, ile fragmentów zostałoby zamaskowanych w Pro, i pokazuje czerwone
  ostrzeżenie z listą typów. Kopiowanie promptu z niezamaskowanymi danymi wymaga potwierdzenia.

---

## Architektura

```
src/
├─ i18n/                        # słowniki PL/EN/DE + resolver z interpolacją
│  ├─ index.ts                  # translate(), detectLocale(), typy kluczy
│  └─ messages/{pl,en,de}.ts
├─ anonymizer/                  # czysta logika, zero zależności od React
│  ├─ checksums.ts              # PESEL, NIP, IBAN (mod-97), Luhn
│  ├─ anonymize.ts              # detekcja → nakładki → tokeny → segmenty → audyt Pro
│  ├─ restore.ts                # re-hydratacja + raport dopasowań
│  └─ rules/                    # 25 modularnych reguł
│     ├─ pesel.ts, nip.ts, idCard.ts, bankAccount.ts, paymentCard.ts
│     ├─ germanIds.ts           # USt-IdNr, Steuer-ID
│     ├─ englishIds.ts          # SSN, NINO
│     ├─ personNames.ts         # jeden builder, trzy pakiety językowe
│     ├─ ip.ts, secrets.ts, paths.ts, email.ts, phone.ts, money.ts
│     └─ index.ts
├─ lib/files/                   # parsowanie i eksport dokumentów
│  ├─ docx.ts (read) · doc.ts (heuristic) · pdf.ts (pdf.js)
│  ├─ parse.ts                  # dispatch + metadane + ostrzeżenia
│  └─ export.ts                 # txt / md / docx (OOXML) / pdf (print)
├─ store/                       # zustand: session, license, locale, theme, ui
├─ components/                  # ui, workflow, settings, mapping, files, license, app
└─ hooks/                       # useI18n, useTheme
```

### Interfejs reguły

```ts
export const peselRule: DetectionRule = {
  id: 'pesel',
  label: 'PESEL',
  tokenLabel: 'PESEL',
  description: 'Numer PESEL z walidacją sumy kontrolnej.',
  category: 'identity',
  tier: 'pro',
  priority: 84,
  defaultEnabled: true,
  detect: (text) => collect(text, /(?<!\d)\d{11}(?!\d)/gd, { accept: isValidPesel }),
}
```

Etykiety i opisy w UI pochodzą ze słownika pod kluczem `catalog.<ruleId>.*` (z fallbackiem do
`label`/`description`), więc dodanie języka to dopisanie jednego obiektu.

---

## Reguły detekcji

| Reguła | Token | Walidacja | Plan |
| --- | --- | --- | --- |
| PESEL (PL) | `[PESEL_1]` | suma kontrolna + data urodzenia | Pro |
| NIP (PL) | `[NIP_1]` | suma kontrolna (mod 11), opcja `PL` | Pro |
| Dowód osobisty (PL) | `[DOWOD_1]` | 3 litery + 6 cyfr | Pro |
| Konto / IBAN | `[KONTO_1]` | 26 cyfr + IBAN mod-97 (PL/DE/…) | Pro |
| USt-IdNr (DE) | `[UST_ID_1]` | ISO 7064 MOD 11,10 | Pro |
| Steuer-ID (DE) | `[STEUER_ID_1]` | ISO 7064 MOD 11,10 | Pro |
| SSN (US) | `[SSN_1]` | area/group/serial | Pro |
| NINO (UK) | `[NINO_1]` | prefiks + sufiks | Pro |
| Karta płatnicza | `[KARTA_1]` | Luhn + prefiks IIN | Pro |
| IPv4 / IPv6 | `[IP_ADDRESS_1]` / `[IPV6_1]` | walidacja oktetów / formatów | Free |
| E-mail | `[EMAIL_1]` | — | Free |
| Telefon | `[TELEFON_1]` | 9–15 cyfr, PL/DE/UK/międzynarodowe | Free |
| JWT | `[JWT_1]` | struktura `eyJ…` | Pro |
| Klucze API | `[API_KEY_1]` | OpenAI, Stripe, AWS, GitHub, Slack, Google, `Bearer`, `password=` | Pro |
| Loginy | `[LOGIN_1]` | `user=`, `username=`, `login:`, `uid=` | Pro |
| Klucze PEM | `[PRIVATE_KEY_1]` | `BEGIN … PRIVATE KEY` | Pro |
| Hashe | `[HASH_1]` | hex 32/40/64 | Pro |
| UUID | `[UUID_1]` | 8-4-4-4-12 | Pro (domyślnie off) |
| Ścieżki Unix/Windows | `[SCIEZKA_1]` | `/home/...`, `C:\Users\...` | Pro |
| Kwoty | `[KWOTA_A]` | `15 000 PLN`, `1.500,00 €`, `$500.00` | Pro |
| Osoby (PL/DE/EN) | `[OSOBA_1]` | kontekst + słownik imion + odmiana | Pro |
| Słownik własny | np. `[KLIENT_1]` | fraza użytkownika (case-insensitive) | Pro |

### Rozstrzyganie nakładek

Kandydaci są sortowani po pozycji startowej, priorytecie reguły i długości dopasowania. Dzięki temu
pełny IBAN wygrywa z fragmentem numeru karty, JWT z ogólnym wzorcem klucza, a PESEL z telefonem.

---

## Plany (mock monetyzacji)

| | Free | Pro (Lifetime 29 USD) |
| --- | --- | --- |
| Limit długości | 500 słów / run | brak |
| Reguły | e-mail, IP, telefon | wszystkie + własny słownik |
| Eksport mapowań JSON | — | ✓ |
| Pliki i eksport dokumentów | ✓ | ✓ |

### Co się dzieje na planie Free, gdy w tekście jest PESEL?

Reguła PESEL jest częścią Pro, więc **nie maskuje** wartości. Aby nie dawać fałszywego poczucia
bezpieczeństwa, po anonimizacji uruchamiany jest audyt reguł zablokowanych: silnik liczy, ile
fragmentów zostałoby zamaskowanych w Pro, i pokazuje w panelu 2 czerwone ostrzeżenie z listą typów,
a kopiowanie wymaga wtedy dodatkowego potwierdzenia.

- Aktywacja: modal **„Activate Pro License”**.
- Weryfikacja klucza: **lokalny mock** w `src/lib/license.ts` (UUID v4 lub `NULLLM-XXXX-XXXX-XXXX`).
- Klucz demo: `NULLLM-PRO1-2025-DEMO` (przycisk „Klucz demo”).
- Link do zakupu: `CHECKOUT_URL` w `src/lib/constants.ts`.

---

## Bezpieczeństwo i prywatność

- **Zero requestów zewnętrznych** — brak `fetch`/XHR/WebSocket do obcych hostów; pdf.js i jego
  worker oraz font PDF są serwowane z tej samej aplikacji i bundlowane lokalnie.
- **Pamięć przeglądarki** — teksty i mapowania: `sessionStorage` (giną po zamknięciu karty),
  licencja, motyw i język: `localStorage`.
- **Pliki** — odczyt przez `File.arrayBuffer()` i parser w przeglądarce; limit 10 MB.
- **PDF** — generowany w całości w przeglądarce (pdf-lib); font Roboto jest osadzany jako subset
  tylko w wygenerowanym pliku (patrz `THIRD-PARTY-NOTICES.md`).
- **Schowek** — wyłącznie `navigator.clipboard` z fallbackiem.

### Rekomendacje przy wdrożeniu

1. Dodaj CSP (`default-src 'self'`, `connect-src 'self'`) na hostingu produkcyjnym.
2. Utrzymuj `npm audit` i pinuj wersje zależności.
3. Pamiętaj, że heurystyki nazwisk, kwot i `.doc` mogą dawać false positives/negatives — to
   wsparcie procesu, nie gwarancja compliance.

---

## Licencje zewnętrzne

Font **Roboto** (Apache 2.0) jest dołączony jako `src/assets/fonts/Roboto-Regular.ttf` i osadzany
jako subset w generowanych PDF-ach. Pełny tekst licencji: `THIRD-PARTY-NOTICES.md`.

---

## Testowanie flow (dane demo)

1. **„Przykład”** wczytuje dokument trójjęzyczny: umowę PL (PESEL, NIP, IBAN PL, nazwisko),
   aneks DE (USt-IdNr, Steuer-ID, IBAN DE, `Thomas Müller`), pismo EN (SSN, NINO, `John Smith`)
   oraz log z JWT, IPv4/IPv6, ścieżką i kluczem `sk-proj-…`.
2. Aktywuj Pro kluczem demo, aby zobaczyć pełny silnik reguł.
3. **„Anonimizuj tekst”** → tokeny w panelu 2 i tabela mapowań.
4. Odpowiedź modelu (z tokenami) wklej w panelu 3 → **„Restore Original Data”**.
5. **Eksport** (ikona obok przycisku kopiowania) → `.docx`, `.txt`, `.md` lub PDF.

---

## Ograniczenia MVP

- Detekcja nazwisk, kwot i części kluczy jest heurystyczna (brak modelu NER).
- `.doc` (Word 97-2003) jest odczytywany heurystycznie — sprawdź podgląd przed użyciem.
- Eksport PDF/DOCX odtwarza treść w nowym, czystym układzie — nie zachowuje oryginalnej
  typografii dokumentu źródłowego.
- Weryfikacja licencji jest mockiem; brak backendu i rozliczeń.
