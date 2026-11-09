import type { DetectionRule, RawMatch, RuleRegion } from '../types'
import { collect, escapeRegExp } from './helpers'

/**
 * Language-aware person-name detection.
 *
 * Each language pack combines two heuristics:
 *  1. honorific / role context ("Pan", "Herr", "Mr", "reprezentowany przez", …)
 *  2. a first-name dictionary followed by a capitalised surname
 *
 * Polish is inflected (Jana Kowalskiego, Annie Nowak), German keeps the
 * surname invariant but uses cases in the article (Herrn Müller), English uses
 * possessives (John's) which the run pattern already stops at.
 */

const PL_FIRST_NAMES = [
  'Adam', 'Adrian', 'Adrianna', 'Agata', 'Agnieszka', 'Aleksander', 'Aleksandra', 'Alina',
  'Alicja', 'Amelia', 'Andrzej', 'Aneta', 'Anna', 'Antoni', 'Arkadiusz', 'Artur',
  'Barbara', 'Bartosz', 'Beata', 'Błażej', 'Bożena', 'Cezary', 'Damian', 'Dariusz',
  'Dawid', 'Dominik', 'Dominika', 'Dorota', 'Edyta', 'Eliza', 'Elżbieta', 'Emil',
  'Emilia', 'Eryk', 'Ewa', 'Ewelina', 'Filip', 'Franciszek', 'Gabriela', 'Grzegorz',
  'Halina', 'Hanna', 'Hubert', 'Ignacy', 'Igor', 'Ilona', 'Irena', 'Iwona',
  'Izabela', 'Jacek', 'Jagoda', 'Jakub', 'Jan', 'Janina', 'Janusz', 'Jarosław',
  'Jerzy', 'Joanna', 'Jolanta', 'Józef', 'Julia', 'Justyna', 'Kacper', 'Kamil',
  'Kamila', 'Karol', 'Karolina', 'Katarzyna', 'Kazimierz', 'Kinga', 'Klaudia',
  'Konrad', 'Kornelia', 'Krystian', 'Krystyna', 'Krzysztof', 'Lena', 'Leszek',
  'Lidia', 'Liliana', 'Lucyna', 'Łucja', 'Łukasz', 'Maciej', 'Magdalena', 'Maja',
  'Maksymilian', 'Malwina', 'Marcin', 'Marek', 'Marian', 'Mariola', 'Mariusz',
  'Marta', 'Martyna', 'Mateusz', 'Małgorzata', 'Michał', 'Mieczysław', 'Mikołaj',
  'Milena', 'Monika', 'Natalia', 'Nikodem', 'Nikola', 'Norbert', 'Olga', 'Oliwia',
  'Oskar', 'Patrycja', 'Patryk', 'Paulina', 'Paweł', 'Piotr', 'Pola', 'Przemysław',
  'Radosław', 'Rafał', 'Renata', 'Robert', 'Roman', 'Róża', 'Ryszard', 'Sabina',
  'Sandra', 'Sebastian', 'Sławomir', 'Sonia', 'Stanisław', 'Stefan', 'Sylwia',
  'Szymon', 'Tadeusz', 'Tomasz', 'Tymoteusz', 'Urszula', 'Waldemar', 'Wanda',
  'Weronika', 'Wiesław', 'Wiktor', 'Wiktoria', 'Wioletta', 'Witold', 'Władysław',
  'Wojciech', 'Zbigniew', 'Zdzisław', 'Zofia', 'Zuzanna', 'Żaneta',
]

const DE_FIRST_NAMES = [
  'Alexander', 'Andreas', 'Angela', 'Anja', 'Anke', 'Anna', 'Annegret', 'Antje',
  'Barbara', 'Bernd', 'Birgit', 'Björn', 'Britta', 'Christian', 'Christina', 'Claudia',
  'Daniel', 'Daniela', 'David', 'Dieter', 'Dirk', 'Doris', 'Elisabeth', 'Emma',
  'Erich', 'Ernst', 'Felix', 'Franz', 'Franziska', 'Gabriele', 'Gerhard', 'Gisela',
  'Günter', 'Hanna', 'Hans', 'Harald', 'Heike', 'Heinrich', 'Heinz', 'Helga',
  'Helmut', 'Henning', 'Herbert', 'Holger', 'Ines', 'Ingo', 'Irene', 'Jan',
  'Jana', 'Jens', 'Joachim', 'Jörg', 'Jürgen', 'Jutta', 'Kai', 'Karin', 'Karl',
  'Katharina', 'Katrin', 'Kerstin', 'Klaus', 'Kristin', 'Lars', 'Laura', 'Lena',
  'Lisa', 'Lothar', 'Lukas', 'Manfred', 'Marcel', 'Marco', 'Maria', 'Marion',
  'Markus', 'Martin', 'Martina', 'Matthias', 'Max', 'Melanie', 'Michael', 'Monika',
  'Nadine', 'Nicole', 'Norbert', 'Oliver', 'Patrick', 'Paul', 'Petra', 'Philipp',
  'Rainer', 'Ralf', 'Regina', 'Renate', 'Rolf', 'Rüdiger', 'Sabine', 'Sandra',
  'Sarah', 'Sebastian', 'Siegfried', 'Silke', 'Simone', 'Stefan', 'Stefanie',
  'Susanne', 'Sven', 'Tanja', 'Thomas', 'Tim', 'Tobias', 'Udo', 'Ulf', 'Ulrike',
  'Uwe', 'Vanessa', 'Vera', 'Volker', 'Walter', 'Werner', 'Wilhelm', 'Wolfgang',
]

const EN_FIRST_NAMES = [
  'Adam', 'Alan', 'Albert', 'Alexander', 'Alexis', 'Alice', 'Amanda', 'Amber',
  'Amy', 'Andrea', 'Andrew', 'Angela', 'Ann', 'Anna', 'Anthony', 'Arthur', 'Ashley',
  'Austin', 'Barbara', 'Benjamin', 'Betty', 'Beverly', 'Billy', 'Bobby', 'Brandon',
  'Brenda', 'Brian', 'Brittany', 'Bruce', 'Bryan', 'Carl', 'Carol', 'Carolyn',
  'Catherine', 'Charles', 'Charlotte', 'Cheryl', 'Christian', 'Christina',
  'Christine', 'Christopher', 'Cynthia', 'Daniel', 'Danielle', 'David', 'Deborah',
  'Debra', 'Denise', 'Dennis', 'Diana', 'Diane', 'Donald', 'Donna', 'Doris',
  'Dorothy', 'Douglas', 'Dylan', 'Edward', 'Elijah', 'Elizabeth', 'Emily', 'Emma',
  'Eric', 'Ethan', 'Eugene', 'Evelyn', 'Frances', 'Frank', 'Gabriel', 'Gary',
  'George', 'Gerald', 'Gloria', 'Grace', 'Gregory', 'Hannah', 'Harold', 'Heather',
  'Helen', 'Henry', 'Isabella', 'Jack', 'Jacob', 'Jacqueline', 'James', 'Janet',
  'Janice', 'Jason', 'Jean', 'Jeffrey', 'Jennifer', 'Jeremy', 'Jerry', 'Jesse',
  'Jessica', 'Joan', 'Joe', 'John', 'Johnny', 'Jonathan', 'Jordan', 'Jose',
  'Joseph', 'Joshua', 'Joyce', 'Juan', 'Judith', 'Judy', 'Julia', 'Julie', 'Justin',
  'Karen', 'Katherine', 'Kathleen', 'Kathryn', 'Kayla', 'Keith', 'Kelly', 'Kenneth',
  'Kevin', 'Kimberly', 'Kyle', 'Larry', 'Laura', 'Lauren', 'Lawrence', 'Linda',
  'Lisa', 'Logan', 'Lori', 'Louis', 'Madison', 'Margaret', 'Maria', 'Marie',
  'Marilyn', 'Mark', 'Martha', 'Mary', 'Matthew', 'Megan', 'Melissa', 'Michael',
  'Michelle', 'Nancy', 'Natalie', 'Nathan', 'Nicholas', 'Nicole', 'Noah', 'Olivia',
  'Pamela', 'Patricia', 'Patrick', 'Paul', 'Peter', 'Philip', 'Ralph', 'Rachel',
  'Randy', 'Raymond', 'Rebecca', 'Richard', 'Robert', 'Roger', 'Ronald', 'Roy',
  'Russell', 'Ruth', 'Samantha', 'Samuel', 'Sandra', 'Sara', 'Sarah', 'Scott',
  'Sean', 'Sharon', 'Shirley', 'Sophia', 'Stephanie', 'Stephen', 'Steven', 'Susan',
  'Teresa', 'Terry', 'Theresa', 'Thomas', 'Timothy', 'Tyler', 'Vanessa', 'Victoria',
  'Vincent', 'Virginia', 'Walter', 'Wayne', 'William', 'Willie', 'Zachary',
]

interface PersonConfig {
  id: string
  label: string
  description: string
  priority: number
  region: RuleRegion
  keywords: string[]
  names: string[]
  /** Maximum number of capitalised words in a name run. */
  maxRun: number
  /** Polish first names take genitive/dative/vocative endings. */
  inflect: boolean
  stopwords: Set<string>
}

const PL_STOPWORDS = new Set([
  'Sp', 'Spółka', 'Spółki', 'SA', 'S', 'A', 'Z', 'Do', 'Ul', 'Al', 'Pl', 'Nr',
  'NIP', 'PESEL', 'REGON', 'KRS', 'Bank', 'Ltd', 'GmbH', 'Inc', 'w', 'we', 'i',
  'oraz', 'na', 'dla', 'nie', 'tak',
])

const DE_STOPWORDS = new Set([
  'GmbH', 'AG', 'KG', 'OHG', 'UG', 'SE', 'mbH', 'Co', 'Dr', 'Prof', 'Dipl', 'Ing',
  'Herr', 'Frau', 'Herrn', 'Rechnung', 'Vertrag', 'Betrag', 'Datum', 'Anlage',
  'Seite', 'Adresse', 'Telefon', 'Konto', 'Bank', 'Steuer', 'Nummer', 'Kunde',
  'Firma', 'Ansprechpartner', 'Geschäftsführer', 'Abteilung', 'Straße', 'Weg',
])

const EN_STOPWORDS = new Set([
  'Inc', 'LLC', 'Ltd', 'Corp', 'Co', 'Plc', 'LP', 'LLP', 'Company', 'Group',
  'Street', 'Road', 'Avenue', 'Ave', 'Lane', 'Drive', 'Suite', 'Dear', 'Sir',
  'Madam', 'Please', 'Regards', 'Best', 'Kind', 'Team', 'Department',
])

function inflectPolishName(name: string): string {
  const stem = escapeRegExp(name.slice(0, -1))
  const last = name.slice(-1).toLowerCase()

  if (last === 'a') {
    return `${stem}(?:a|y|ie|ę|ą|o|u|i)`
  }

  return `${escapeRegExp(name)}(?:|a|owi|em|ie|u|y|iem)`
}

function keywordVariants(keyword: string): string {
  const upper = `${keyword.charAt(0).toUpperCase()}${keyword.slice(1)}`
  const lower = `${keyword.charAt(0).toLowerCase()}${keyword.slice(1)}`
  return upper === lower ? upper : `${upper}|${lower}`
}

function buildRunPattern(maxRun: number): string {
  // Only intra-line whitespace: a name never spans a line break.
  return String.raw`\p{Lu}[\p{L}'’.-]*(?:[ \t]+\p{Lu}[\p{L}'’.-]*){0,${Math.max(0, maxRun - 1)}}`
}

function trimStopwords(text: string, match: RawMatch, stopwords: Set<string>): RawMatch | null {
  let { start, value } = match
  let end = match.end

  for (let guard = 0; guard < 4; guard += 1) {
    const parts = value.split(/\s+/)
    if (parts.length <= 1) break

    const last = parts[parts.length - 1].replace(/[.,;:]+$/, '')
    if (!last || !stopwords.has(last)) break

    const cutIndex = value.lastIndexOf(parts[parts.length - 1])
    if (cutIndex <= 0) break

    value = value.slice(0, cutIndex).trimEnd()
    end = start + value.length
  }

  if (!value.trim() || value !== text.slice(start, end)) return null
  return { start, end, value }
}

function stripTrailingPunctuation(match: RawMatch): RawMatch {
  const value = match.value.replace(/[.,;:]+$/, '')
  return value === match.value ? match : { ...match, end: match.start + value.length, value }
}

function dedupe(matches: RawMatch[]): RawMatch[] {
  const sorted = [...matches].sort((a, b) => a.start - b.start || b.end - a.end)
  const result: RawMatch[] = []
  let lastEnd = -1

  for (const match of sorted) {
    if (match.start < lastEnd) continue
    result.push(match)
    lastEnd = match.end
  }

  return result
}

function buildPersonRule(config: PersonConfig): DetectionRule {
  const nameAlternation = config.names
    .map((name) => (config.inflect ? inflectPolishName(name) : escapeRegExp(name)))
    .join('|')

  const keywordAlternation = [...config.keywords]
    .sort((a, b) => b.length - a.length)
    .map(keywordVariants)
    .join('|')

  const run = buildRunPattern(config.maxRun)

  const contextPattern = new RegExp(
    String.raw`(?<![\p{L}])(?:${keywordAlternation})\.?(?![\p{L}])[ \t]*:?[ \t]+(${run})`,
    'gdu',
  )

  const dictionaryPattern = new RegExp(
    String.raw`(?<![\p{L}\p{N}])(?:${nameAlternation})[ \t]+(${run})(?![\p{L}\p{N}])`,
    'gdu',
  )

  return {
    id: config.id,
    label: config.label,
    tokenLabel: 'OSOBA',
    description: config.description,
    category: 'contact',
    tier: 'pro',
    region: config.region,
    priority: config.priority,
    defaultEnabled: true,
    detect: (text) => {
      const context = collect(text, contextPattern, { group: 1 })
      const dictionary = collect(text, dictionaryPattern)

      const merged = dedupe([...context, ...dictionary])
      return merged
        .map((match) => trimStopwords(text, match, config.stopwords))
        .filter((match): match is RawMatch => match !== null)
        .map(stripTrailingPunctuation)
    },
  }
}

export const personPlRule = buildPersonRule({
  id: 'person-pl',
  label: 'Imiona i nazwiska (PL)',
  description: 'Polskie imiona i nazwiska, także w odmianie (Jana Kowalskiego).',
  priority: 47,
  region: 'pl',
  inflect: true,
  maxRun: 3,
  names: PL_FIRST_NAMES,
  stopwords: PL_STOPWORDS,
  keywords: [
    'Pan',
    'Pani',
    'Pana',
    'Panią',
    'Panem',
    'Państwo',
    'Państwu',
    'reprezentowany przez',
    'reprezentowana przez',
    'reprezentowani przez',
    'reprezentowane przez',
    'reprezentowaną przez',
    'reprezentowanego przez',
    'reprezentujący',
    'reprezentująca',
    'w imieniu',
    'podpisano przez',
    'podpisana przez',
    'Klient',
    'Klientka',
    'Klienta',
    'pracownik',
    'pracownica',
    'pracownika',
    'prezes',
    'prezesa',
    'dyrektor',
    'dyrektora',
    'kierownik',
    'kierownika',
    'menadżer',
    'menedżer',
    'najemca',
    'najemcy',
    'wynajmujący',
    'zleceniodawca',
    'zleceniobiorca',
    'wykonawca',
    'świadek',
    'notariusz',
    'pacjent',
    'pacjentka',
  ],
})

export const personDeRule = buildPersonRule({
  id: 'person-de',
  label: 'Imiona i nazwiska (DE)',
  description: 'Niemieckie nazwiska po zwrotach Herr/Frau i słowniku imion.',
  priority: 46,
  region: 'de',
  inflect: false,
  maxRun: 2,
  names: DE_FIRST_NAMES,
  stopwords: DE_STOPWORDS,
  keywords: [
    'Herr',
    'Herrn',
    'Frau',
    'vertreten durch',
    'unterzeichnet von',
    'Geschäftsführer',
    'Geschäftsführerin',
    'Ansprechpartner',
    'Ansprechpartnerin',
    'Mitarbeiter',
    'Mitarbeiterin',
    'Zeuge',
    'Zeugin',
    'Notar',
    'Notarin',
    'Kunde',
    'Kundin',
    'Mieter',
    'Mieterin',
    'Vermieter',
    'Auftragnehmer',
    'Auftraggeber',
    'Gesellschafter',
    'Prokurist',
  ],
})

export const personEnRule = buildPersonRule({
  id: 'person-en',
  label: 'Imiona i nazwiska (EN)',
  description: 'Angielskie nazwiska po Mr/Mrs/Dr i słowniku imion.',
  priority: 45,
  region: 'en',
  inflect: false,
  maxRun: 3,
  names: EN_FIRST_NAMES,
  stopwords: EN_STOPWORDS,
  keywords: [
    'Mr',
    'Mrs',
    'Ms',
    'Miss',
    'Dr',
    'Prof',
    'represented by',
    'signed by',
    'prepared by',
    'attn',
    'attention',
    'CEO',
    'CFO',
    'CTO',
    'Director',
    'Manager',
    'employee',
    'witness',
    'notary',
    'tenant',
    'landlord',
    'client',
    'contact',
  ],
})
