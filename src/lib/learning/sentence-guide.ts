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
  ['standing by', 'Би хүлээе.'],
  ['checking target calibration', 'Бай онох тохиргоог шалгаарай.'],
  ['hey, e.v., take five', 'И.В., жаахан амар.'],
  ["but it's the truth", 'Гэхдээ энэ үнэн.'],
  ['we used to know each other', 'Бид бие биеэ мэддэг байсан.'],
  ['we were together', 'Бид хамт байсан.'],
  ["i'm spider-man", 'Би бол Хүн-аалз.'],
]);

export function sentenceGuide(text: string): string {
  const key = text
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[.!…]+$/, '')
    .replace(/^[^:]{1,24}:\s*/, '')
    .trim();
  return meanings.get(key) ?? '';
}
