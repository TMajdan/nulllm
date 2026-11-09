/**
 * Minimal AES (128/192/256) with CBC helpers.
 *
 * The Web Crypto API only exposes AES-CBC with PKCS#7 padding, while PDF
 * encryption needs raw block decryption (the file key is wrapped in `/UE`
 * without padding). Everything here runs locally in the browser.
 */

const SBOX = new Uint8Array(256)
const INV_SBOX = new Uint8Array(256)

function gfMultiply(a: number, b: number): number {
  let product = 0
  let left = a
  let right = b

  for (let index = 0; index < 8; index += 1) {
    if (right & 1) product ^= left
    const high = left & 0x80
    left = (left << 1) & 0xff
    if (high) left ^= 0x1b
    right >>= 1
  }

  return product
}

function buildTables(): void {
  const exp = new Uint8Array(512)
  const log = new Uint8Array(256)

  let value = 1
  for (let index = 0; index < 255; index += 1) {
    exp[index] = value
    log[value] = index
    value = gfMultiply(value, 3)
  }
  for (let index = 255; index < 512; index += 1) exp[index] = exp[index - 255]

  const rotate = (byte: number, shift: number) =>
    ((byte << shift) | (byte >>> (8 - shift))) & 0xff

  for (let index = 0; index < 256; index += 1) {
    const inverse = index === 0 ? 0 : exp[255 - log[index]]
    const transformed =
      inverse ^
      rotate(inverse, 1) ^
      rotate(inverse, 2) ^
      rotate(inverse, 3) ^
      rotate(inverse, 4) ^
      0x63
    SBOX[index] = transformed
    INV_SBOX[transformed] = index
  }
}

buildTables()

export interface AesSchedule {
  roundKeys: Uint8Array
  rounds: number
}

function expandKey(key: Uint8Array): AesSchedule {
  const nk = key.length / 4
  if (nk !== 4 && nk !== 6 && nk !== 8) throw new Error('Invalid AES key length')

  const rounds = nk + 6
  const words = 4 * (rounds + 1)
  const roundKeys = new Uint8Array(words * 4)
  roundKeys.set(key)

  const temp = new Uint8Array(4)
  const rcon = new Uint8Array([0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36])

  for (let word = nk; word < words; word += 1) {
    let offset = word * 4
    temp[0] = roundKeys[offset - 4]
    temp[1] = roundKeys[offset - 3]
    temp[2] = roundKeys[offset - 2]
    temp[3] = roundKeys[offset - 1]

    if (word % nk === 0) {
      const first = temp[0]
      temp[0] = SBOX[temp[1]] ^ rcon[word / nk - 1]
      temp[1] = SBOX[temp[2]]
      temp[2] = SBOX[temp[3]]
      temp[3] = SBOX[first]
    } else if (nk > 6 && word % nk === 4) {
      for (let index = 0; index < 4; index += 1) temp[index] = SBOX[temp[index]]
    }

    offset = word * 4
    for (let index = 0; index < 4; index += 1) {
      roundKeys[offset + index] = roundKeys[offset - nk * 4 + index] ^ temp[index]
    }
  }

  return { roundKeys, rounds }
}

function addRoundKey(state: Uint8Array, keys: Uint8Array, round: number): void {
  const base = round * 16
  for (let index = 0; index < 16; index += 1) state[index] ^= keys[base + index]
}

function subBytes(state: Uint8Array, table: Uint8Array): void {
  for (let index = 0; index < 16; index += 1) state[index] = table[state[index]]
}

function shiftRows(state: Uint8Array): void {
  const copy = state.slice()

  for (let row = 1; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      state[row + 4 * column] = copy[row + 4 * ((column + row) % 4)]
    }
  }
}

function inverseShiftRows(state: Uint8Array): void {
  const copy = state.slice()

  for (let row = 1; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      state[row + 4 * column] = copy[row + 4 * ((column - row + 4) % 4)]
    }
  }
}

function mixColumns(state: Uint8Array): void {
  for (let column = 0; column < 4; column += 1) {
    const offset = column * 4
    const a0 = state[offset]
    const a1 = state[offset + 1]
    const a2 = state[offset + 2]
    const a3 = state[offset + 3]

    state[offset] = gfMultiply(a0, 2) ^ gfMultiply(a1, 3) ^ a2 ^ a3
    state[offset + 1] = a0 ^ gfMultiply(a1, 2) ^ gfMultiply(a2, 3) ^ a3
    state[offset + 2] = a0 ^ a1 ^ gfMultiply(a2, 2) ^ gfMultiply(a3, 3)
    state[offset + 3] = gfMultiply(a0, 3) ^ a1 ^ a2 ^ gfMultiply(a3, 2)
  }
}

function inverseMixColumns(state: Uint8Array): void {
  for (let column = 0; column < 4; column += 1) {
    const offset = column * 4
    const a0 = state[offset]
    const a1 = state[offset + 1]
    const a2 = state[offset + 2]
    const a3 = state[offset + 3]

    state[offset] =
      gfMultiply(a0, 14) ^ gfMultiply(a1, 11) ^ gfMultiply(a2, 13) ^ gfMultiply(a3, 9)
    state[offset + 1] =
      gfMultiply(a0, 9) ^ gfMultiply(a1, 14) ^ gfMultiply(a2, 11) ^ gfMultiply(a3, 13)
    state[offset + 2] =
      gfMultiply(a0, 13) ^ gfMultiply(a1, 9) ^ gfMultiply(a2, 14) ^ gfMultiply(a3, 11)
    state[offset + 3] =
      gfMultiply(a0, 11) ^ gfMultiply(a1, 13) ^ gfMultiply(a2, 9) ^ gfMultiply(a3, 14)
  }
}

export function encryptBlock(input: Uint8Array, schedule: AesSchedule): Uint8Array {
  const state = input.slice()
  addRoundKey(state, schedule.roundKeys, 0)

  for (let round = 1; round < schedule.rounds; round += 1) {
    subBytes(state, SBOX)
    shiftRows(state)
    mixColumns(state)
    addRoundKey(state, schedule.roundKeys, round)
  }

  subBytes(state, SBOX)
  shiftRows(state)
  addRoundKey(state, schedule.roundKeys, schedule.rounds)

  return state
}

export function decryptBlock(input: Uint8Array, schedule: AesSchedule): Uint8Array {
  const state = input.slice()
  addRoundKey(state, schedule.roundKeys, schedule.rounds)

  for (let round = schedule.rounds - 1; round > 0; round -= 1) {
    inverseShiftRows(state)
    subBytes(state, INV_SBOX)
    addRoundKey(state, schedule.roundKeys, round)
    inverseMixColumns(state)
  }

  inverseShiftRows(state)
  subBytes(state, INV_SBOX)
  addRoundKey(state, schedule.roundKeys, 0)

  return state
}

export function createSchedule(key: Uint8Array): AesSchedule {
  return expandKey(key)
}

/** CBC encryption without padding. `data` must be a multiple of 16 bytes. */
export function cbcEncrypt(
  key: Uint8Array,
  iv: Uint8Array,
  data: Uint8Array,
  schedule = expandKey(key),
): Uint8Array {
  if (data.length % 16 !== 0) throw new Error('CBC input must be block aligned')

  const output = new Uint8Array(data.length)
  let previous = iv.slice()

  for (let offset = 0; offset < data.length; offset += 16) {
    const block = new Uint8Array(16)
    for (let index = 0; index < 16; index += 1) block[index] = data[offset + index] ^ previous[index]
    const encrypted = encryptBlock(block, schedule)
    output.set(encrypted, offset)
    previous = encrypted
  }

  return output
}

/** CBC decryption. Returns the raw plaintext; padding handling is up to the caller. */
export function cbcDecryptBlocks(
  key: Uint8Array,
  iv: Uint8Array,
  data: Uint8Array,
  schedule = expandKey(key),
): Uint8Array {
  if (data.length % 16 !== 0) throw new Error('CBC input must be block aligned')

  const output = new Uint8Array(data.length)
  let previous = iv.slice()

  for (let offset = 0; offset < data.length; offset += 16) {
    const block = data.slice(offset, offset + 16)
    const decrypted = decryptBlock(block, schedule)
    for (let index = 0; index < 16; index += 1) {
      output[offset + index] = decrypted[index] ^ previous[index]
    }
    previous = block
  }

  return output
}

/** Removes PKCS#7 padding when it is present and valid. */
export function stripPkcs7(data: Uint8Array): Uint8Array {
  if (data.length === 0) return data
  const padding = data[data.length - 1]
  if (padding < 1 || padding > 16 || padding > data.length) return data

  for (let index = data.length - padding; index < data.length; index += 1) {
    if (data[index] !== padding) return data
  }

  return data.slice(0, data.length - padding)
}
