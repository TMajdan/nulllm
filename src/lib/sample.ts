/**
 * Demo payload for the "Sample" button - Polish, German and English in one
 * document. All identifiers are synthetic but pass their real checksums
 * (PESEL, NIP, PL/DE IBAN, USt-IdNr, Steuer-ID).
 */
export const SAMPLE_TEXT = `UMOWA O ŚWIADCZENIE USŁUG NR 41/2025

Zamawiający: ACME Logistyka Sp. z o.o., NIP 1234563218,
rachunek: PL61 1090 1014 0000 0712 1981 2874.
Reprezentowany przez: Jan Kowalski, PESEL 85010112345, dowód osobisty ABC123456.
Kontakt: jan.kowalski@acme-logistics.pl, tel. +48 512 345 678.
Wynagrodzenie: 15 000 PLN netto miesięcznie, zaliczka 2 500,00 zł.

--- Anhang (DE) ---
Lieferant: Beispiel Handel GmbH, USt-IdNr DE123456788, Steuer-ID 65929970489,
Konto DE89 3704 0044 0532 0130 00, vertreten durch Thomas Müller.
Kontakt: t.mueller@beispiel-handel.de, Tel. +49 30 12345678, Betrag: 1.500,00 €.

--- Appendix (EN) ---
Represented by John Smith (SSN 123-45-6789, NINO AB 12 34 56 C),
contact john.smith@example.com, phone +44 20 7946 0958.
Invoice total: $1,500.00 plus £1,200.

--- log serwera (app.internal) ---
2025-01-12T09:14:22Z INFO  login ok user=jan.kowalski ip=192.168.10.42
2025-01-12T09:15:03Z WARN  api call failed Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U
2025-01-12T09:15:04Z DEBUG config path=/home/app/config/secrets.yml host=fe80::1 key=sk-proj-9f8a7b6c5d4e3f2a1b0c
`
