// Short, authored explanations of common conversational expressions. Exact
// sentence matches only: never substitute a phrase for a longer line's meaning.
const meanings = new Map([
  ["that's gonna sound crazy", 'Сонсвол итгэмээргүй санагдах байх.'],
  ["that's going to sound crazy", 'Сонсвол итгэмээргүй санагдах байх.'],
  ['that sounds crazy', 'Итгэмээргүй сонсогдож байна.'],
  ["you've got to be kidding me", 'Чи тоглож байгаа байлгүй дээ!'],
  ['give me a second', 'Жаахан хүлээгээрэй.'],
  ['take your time', 'Яарах хэрэггүй.'],
  ["it's up to you", 'Чи өөрөө шийд.'],
  ["i'll be right back", 'Би одоохон буцаад ирнэ.'],
]);

export function sentenceGuide(text: string): string {
  const key = text
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[.!…]+$/, '')
    .trim();
  return meanings.get(key) ?? '';
}
